from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import func, or_

from app.security.access_control import (
    destroy_sessions_for_role,
    destroy_sessions_for_user,
)
from app.security.request_audit_store import RequestAuditStore
from app.security.security_event_store import SecurityEventStore
from app.config.database import db
from app.services.ca_init_service import CAInitService
from app.services.certificate_service import CertificateService
from app.services.role_service import RoleService
from app.models.role_model import Role
from app.models.user_model import User


class SystemAdminService:
    """Platform-wide controls for the system administrator role."""

    _MANAGED_USER_ROLES = {"customer", "manager", "auditor_clerk", "system_admin"}

    @staticmethod
    def _certificate_counts() -> Dict[str, Any]:
        base = CertificateService.CERT_BASE
        counts: Dict[str, int] = {}
        total = 0
        if not base.exists():
            return {"total": 0, "by_role": counts}
        for role_dir in base.iterdir():
            if not role_dir.is_dir():
                continue
            count = len(list(role_dir.glob("*.pem")))
            counts[role_dir.name] = count
            total += count
        return {"total": total, "by_role": counts}

    @staticmethod
    def _crl_snapshot() -> Dict[str, Any]:
        crl_data = CertificateService._load_crl()
        revoked = crl_data.get("revoked", [])
        metadata = crl_data.get("metadata", {})
        return {
            "revoked_count": len(revoked),
            "revoked": revoked,
            "metadata": metadata,
        }

    @staticmethod
    def overview() -> Dict[str, Any]:
        certs = SystemAdminService._certificate_counts()
        crl = SystemAdminService._crl_snapshot()
        security_event_counts = {
            "device_mismatch": SecurityEventStore.count_events("device_mismatch"),
            "total": SecurityEventStore.count_events(),
        }
        recent_security_events = SecurityEventStore.query_events(limit=10)
        audit_tail = RequestAuditStore.query_all()
        audit_tail.sort(key=lambda row: row.get("timestamp") or "")
        recent_audit = list(reversed(audit_tail[-25:]))
        return {
            "certificates": certs,
            "crl": crl,
            "security": {
                "event_counts": security_event_counts,
                "recent_events": recent_security_events,
            },
            "recent_audit": recent_audit,
        }

    @staticmethod
    def certificate_inventory() -> Dict[str, Any]:
        return SystemAdminService._certificate_counts()

    @staticmethod
    def crl_details() -> Dict[str, Any]:
        return SystemAdminService._crl_snapshot()

    @staticmethod
    def issue_system_admin_certificate(
        *,
        user_id: str,
        full_name: str,
        device_secret: str,
        ml_kem_public_key_b64: str,
        rsa_public_key_spki: str,
        pq_public_key_b64: Optional[str] = None,
        validity_days: int = 30,
        role: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not user_id or not full_name:
            raise ValueError("user_id and full_name are required")
        if not device_secret:
            raise ValueError("device_secret is required")
        key_material = (ml_kem_public_key_b64 or "").strip()
        if not key_material:
            raise ValueError("ml_kem_public_key_b64 is required")
        resolved_role = SystemAdminService._resolve_certificate_role(
            user_identifier=user_id,
            requested_role=role,
        )
        result = CertificateService.issue_customer_certificate(
            user_id,
            full_name,
            resolved_role,
            key_material,
            rsa_public_key_spki=rsa_public_key_spki,
            pq_public_key_b64=pq_public_key_b64,
            validity_days=validity_days,
            device_secret=device_secret,
        )
        result["role"] = resolved_role
        return result

    @staticmethod
    def revoke_certificate(
        certificate_id: str,
        *,
        reason: str,
        requester: Dict[str, Any],
    ) -> Dict[str, Any]:
        return CertificateService.revoke_certificate(
            certificate_id,
            reason=reason,
            requested_by=requester,
        )

    @staticmethod
    def list_security_events(
        *, event_type: Optional[str] = None, limit: int = 100, offset: int = 0
    ) -> List[Dict[str, Any]]:
        return SecurityEventStore.query_events(event_type=event_type, limit=limit, offset=offset)

    @staticmethod
    def rotate_authority_keys() -> Dict[str, Any]:
        classical_meta = CAInitService.rotate_ca_keys()
        pq_meta = CertificateService.rotate_pq_ca_keys()
        return {
            "classical": classical_meta,
            "post_quantum": pq_meta,
        }

    @staticmethod
    def kill_sessions(
        *, user_id: Optional[str] = None, role: Optional[str] = None
    ) -> Dict[str, Any]:
        killed = 0
        if user_id:
            killed += destroy_sessions_for_user(user_id)
        if role:
            killed += destroy_sessions_for_role(role)
        return {"terminated_sessions": killed}

    @staticmethod
    def global_audit_feed(
        limit: int = 20,
        offset: int = 0,
        search: str = "",
        role: str = "",
        action_type: str = "",
        date_from: str = "",
        date_to: str = "",
    ) -> List[Dict[str, Any]]:
        """Get global audit feed with filtering."""
        entries = RequestAuditStore.query_all()
        
        # Apply filters
        filtered_entries = []
        for entry in entries:
            # Search filter
            if search:
                searchable = " ".join([
                    str(entry.get("user_id", "")),
                    str(entry.get("certificate_id", "")),
                    str(entry.get("action_name", "")),
                    str(entry.get("path", "")),
                ]).lower()
                if search.lower() not in searchable:
                    continue
            
            # Role filter
            if role and entry.get("role", "").lower() != role.lower():
                continue
            
            # Action type filter
            if action_type:
                action = str(entry.get("action_name", "")).lower()
                path = str(entry.get("path", "")).lower()
                
                if action_type == "login" and not ("login" in action or "auth" in path):
                    continue
                elif action_type == "transaction" and not ("transaction" in action or "transaction" in path):
                    continue
                elif action_type == "certificate" and not ("cert" in action or "cert" in path):
                    continue
                elif action_type == "role" and not ("role" in action or "role" in path):
                    continue
                elif action_type == "security" and not ("security" in action or "security" in path):
                    continue
                elif action_type == "policy" and not ("policy" in action or "policy" in path):
                    continue
            
            # Date filters
            if date_from or date_to:
                try:
                    from datetime import datetime
                    entry_date = datetime.fromisoformat(entry.get("timestamp", "").replace("Z", "+00:00"))
                    
                    if date_from:
                        from_date = datetime.fromisoformat(date_from + "T00:00:00")
                        if entry_date < from_date:
                            continue
                    
                    if date_to:
                        to_date = datetime.fromisoformat(date_to + "T23:59:59")
                        if entry_date > to_date:
                            continue
                except (ValueError, AttributeError):
                    pass
            
            filtered_entries.append(entry)
        
        # Sort by timestamp (newest first)
        filtered_entries.sort(key=lambda row: row.get("timestamp") or "", reverse=True)
        
        # Apply pagination
        return filtered_entries[offset:offset + limit]
    
    @staticmethod
    def get_audit_count(
        search: str = "",
        role: str = "",
        action_type: str = "",
        date_from: str = "",
        date_to: str = "",
    ) -> int:
        """Get total count of audit entries matching filters."""
        entries = RequestAuditStore.query_all()
        
        # Apply same filters as global_audit_feed
        filtered_count = 0
        for entry in entries:
            # Search filter
            if search:
                searchable = " ".join([
                    str(entry.get("user_id", "")),
                    str(entry.get("certificate_id", "")),
                    str(entry.get("action_name", "")),
                    str(entry.get("path", "")),
                ]).lower()
                if search.lower() not in searchable:
                    continue
            
            # Role filter
            if role and entry.get("role", "").lower() != role.lower():
                continue
            
            # Action type filter
            if action_type:
                action = str(entry.get("action_name", "")).lower()
                path = str(entry.get("path", "")).lower()
                
                if action_type == "login" and not ("login" in action or "auth" in path):
                    continue
                elif action_type == "transaction" and not ("transaction" in action or "transaction" in path):
                    continue
                elif action_type == "certificate" and not ("cert" in action or "cert" in path):
                    continue
                elif action_type == "role" and not ("role" in action or "role" in path):
                    continue
                elif action_type == "security" and not ("security" in action or "security" in path):
                    continue
                elif action_type == "policy" and not ("policy" in action or "policy" in path):
                    continue
            
            # Date filters
            if date_from or date_to:
                try:
                    from datetime import datetime
                    entry_date = datetime.fromisoformat(entry.get("timestamp", "").replace("Z", "+00:00"))
                    
                    if date_from:
                        from_date = datetime.fromisoformat(date_from + "T00:00:00")
                        if entry_date < from_date:
                            continue
                    
                    if date_to:
                        to_date = datetime.fromisoformat(date_to + "T23:59:59")
                        if entry_date > to_date:
                            continue
                except (ValueError, AttributeError):
                    pass
            
            filtered_count += 1
        
        return filtered_count

    @staticmethod
    def list_issued_certificates() -> List[Dict[str, Any]]:
        """List all certificates issued and stored in the filesystem."""
        from pathlib import Path
        from app.services.certificate_service import CertificateService
        from app.security.certificate_vault import CertificateVault
        import os
        
        certificates = []
        cert_base = CertificateService.CERT_BASE
        
        if not cert_base.exists():
            return certificates
        
        # Scan all role directories
        for role_dir in cert_base.iterdir():
            if not role_dir.is_dir():
                continue
            
            role_name = role_dir.name
            
            # Scan all .pem files in role directory
            for cert_file in role_dir.glob("*.pem"):
                try:
                    cert_content = CertificateVault.load(cert_file)
                    # Parse certificate content
                    cert_data = {}
                    for line in cert_content.strip().split("\n"):
                        if "=" in line:
                            key, value = line.split("=", 1)
                            cert_data[key] = value
                    
                    user_id = cert_data.get("user_id", cert_file.stem)
                    full_name = cert_data.get("owner", "Unknown")
                    issued_at = cert_data.get("issued_at", "")
                    valid_to = cert_data.get("valid_to", "")
                    is_revoked = cert_data.get("is_revoked", "false").lower() == "true"
                    
                    # Get file stats for fallback timestamp
                    file_stat = os.stat(cert_file)
                    issued_timestamp = issued_at or datetime.fromtimestamp(file_stat.st_ctime).isoformat() + "Z"
                    
                    certificates.append({
                        "id": f"{role_name}_{user_id}",
                        "userId": user_id,
                        "fullName": full_name,
                        "role": role_name,
                        "issuedAt": issued_timestamp,
                        "validTo": valid_to,
                        "certificatePath": str(cert_file.relative_to(cert_base.parent)),
                        "isRevoked": is_revoked,
                    })
                except Exception:
                    # Skip malformed certificates
                    continue
        
        # Sort by issued date (newest first)
        certificates.sort(key=lambda x: x.get("issuedAt", ""), reverse=True)
        return certificates

    # =========================================
    # Role administration
    # =========================================

    @staticmethod
    def list_roles() -> Dict[str, Any]:
        return RoleService.list_roles()

    @staticmethod
    def create_role(*, name: str) -> Dict[str, Any]:
        return RoleService.create_role(name=name)

    @staticmethod
    def update_role(role_id: int, *, name: str) -> Dict[str, Any]:
        return RoleService.update_role(role_id, name=name)

    @staticmethod
    def delete_role(role_id: int) -> Dict[str, Any]:
        return RoleService.delete_role(role_id)

    # =========================================
    # User administration (customer/manager/auditor_clerk)
    # =========================================

    @staticmethod
    def _normalize_value(value: Optional[str]) -> str:
        return (value or "").strip()

    @classmethod
    def _normalize_role_name(cls, role_name: Optional[str]) -> str:
        return cls._normalize_value(role_name).lower()

    @classmethod
    def _resolve_manageable_role(cls, role_name: Optional[str]) -> Role:
        normalized = cls._normalize_role_name(role_name)
        if normalized not in cls._MANAGED_USER_ROLES:
            raise ValueError(
                "Role must be one of customer, manager, or auditor_clerk",
            )
        # Ensure default roles exist before lookup
        RoleService.list_roles()
        role = Role.query.filter(func.lower(Role.name) == normalized).first()
        if not role:
            raise LookupError("Role not found")
        return role

    @classmethod
    def _lookup_user_role(cls, user_identifier: str) -> Optional[str]:
        normalized = cls._normalize_value(user_identifier)
        if not normalized:
            return None
        lowered = normalized.lower()
        RoleService.list_roles()
        user = (
            db.session.query(User)
            .join(Role, Role.id == User.role_id)
            .filter(
                or_(
                    func.lower(User.username) == lowered,
                    func.lower(User.email) == lowered,
                )
            )
            .first()
        )
        if user and user.role:
            return cls._normalize_role_name(user.role.name)
        return None

    @classmethod
    def _resolve_certificate_role(
        cls,
        *,
        user_identifier: str,
        requested_role: Optional[str] = None,
    ) -> str:
        normalized_requested = cls._normalize_role_name(requested_role)
        candidate = normalized_requested or cls._lookup_user_role(user_identifier) or "system_admin"
        normalized_candidate = cls._normalize_role_name(candidate)
        if normalized_candidate not in RoleService.ROLE_PERMISSIONS:
            raise ValueError("Unsupported role supplied for certificate issuance")
        return normalized_candidate

    @classmethod
    def _serialize_user(cls, user: User) -> Dict[str, Any]:
        return {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "address": user.address,
            "aadhar": user.aadhar,
            "pan": user.pan,
            "role": (user.role.name if user.role else None),
            "is_active": bool(user.is_active),
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }

    @classmethod
    def _get_manageable_user(cls, user_id: int) -> User:
        user = User.query.get(user_id)
        if not user:
            raise LookupError("User not found")
        role_name = cls._normalize_role_name(user.role.name if user.role else "")
        if role_name not in cls._MANAGED_USER_ROLES:
            raise ValueError("Cannot manage users outside customer/manager/auditor_clerk")
        return user

    @classmethod
    def list_users(cls, *, roles: Optional[Sequence[str]] = None) -> Dict[str, Any]:
        requested = cls._MANAGED_USER_ROLES
        if roles is not None:
            filtered = {
                cls._normalize_role_name(role)
                for role in roles
                if cls._normalize_role_name(role)
            }
            requested = filtered & cls._MANAGED_USER_ROLES
        if not requested:
            return {"users": [], "total": 0}
        RoleService.list_roles()
        query = (
            db.session.query(User)
            .join(Role, Role.id == User.role_id)
            .filter(func.lower(Role.name).in_(list(requested)))
            .order_by(func.lower(Role.name), func.lower(User.username))
        )
        users = query.all()
        return {
            "users": [cls._serialize_user(user) for user in users],
            "total": len(users),
        }

    @classmethod
    def create_user(
        cls,
        *,
        username: str,
        full_name: str,
        email: Optional[str] = None,
        mobile: str,
        address: Optional[str] = None,
        aadhar: Optional[str] = None,
        pan: Optional[str] = None,
        password: Optional[str] = None,
        role: str,
        is_active: bool = True,
    ) -> Dict[str, Any]:
        normalized_username = cls._normalize_value(username)
        normalized_full_name = cls._normalize_value(full_name)
        normalized_email = cls._normalize_value(email) if email else None
        normalized_mobile = cls._normalize_value(mobile)
        normalized_address = cls._normalize_value(address) if address else None
        normalized_aadhar = cls._normalize_value(aadhar) if aadhar else None
        normalized_pan = cls._normalize_value(pan).upper() if pan else None
        
        if not normalized_username or not normalized_full_name or not normalized_mobile:
            raise ValueError("username, full_name, and mobile are required")

        role_obj = cls._resolve_manageable_role(role)
        username_conflict = (
            User.query.filter(func.lower(User.username) == normalized_username.lower())
            .first()
        )
        if username_conflict:
            raise ValueError("Username already exists")
        
        if normalized_email:
            email_conflict = (
                User.query.filter(func.lower(User.email) == normalized_email.lower())
                .first()
            )
            if email_conflict:
                raise ValueError("Email already exists")

        user = User(
            username=normalized_username,
            full_name=normalized_full_name,
            email=normalized_email,
            mobile=normalized_mobile,
            address=normalized_address,
            aadhar=normalized_aadhar,
            pan=normalized_pan,
            role=role_obj,
            is_active=bool(is_active),
        )
        db.session.add(user)
        db.session.commit()
        return cls._serialize_user(user)

    @classmethod
    def update_user(
        cls,
        user_id: int,
        *,
        username: Optional[str] = None,
        full_name: Optional[str] = None,
        email: Optional[str] = None,
        mobile: Optional[str] = None,
        address: Optional[str] = None,
        aadhar: Optional[str] = None,
        pan: Optional[str] = None,
        password: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Dict[str, Any]:
        user = cls._get_manageable_user(user_id)

        if username is not None:
            normalized_username = cls._normalize_value(username)
            if not normalized_username:
                raise ValueError("username cannot be empty")
            conflict = (
                User.query.filter(func.lower(User.username) == normalized_username.lower())
                .filter(User.id != user.id)
                .first()
            )
            if conflict:
                raise ValueError("Username already exists")
            user.username = normalized_username

        if full_name is not None:
            normalized_full_name = cls._normalize_value(full_name)
            if not normalized_full_name:
                raise ValueError("full_name cannot be empty")
            user.full_name = normalized_full_name

        if email is not None:
            normalized_email = cls._normalize_value(email)
            if normalized_email:
                conflict = (
                    User.query.filter(func.lower(User.email) == normalized_email.lower())
                    .filter(User.id != user.id)
                    .first()
                )
                if conflict:
                    raise ValueError("Email already exists")
                user.email = normalized_email
            else:
                user.email = None

        if mobile is not None:
            normalized_mobile = cls._normalize_value(mobile)
            if not normalized_mobile:
                raise ValueError("mobile cannot be empty")
            user.mobile = normalized_mobile

        if address is not None:
            user.address = cls._normalize_value(address) or None

        if aadhar is not None:
            user.aadhar = cls._normalize_value(aadhar) or None

        if pan is not None:
            normalized_pan = cls._normalize_value(pan)
            user.pan = normalized_pan.upper() if normalized_pan else None

        if role is not None:
            new_role = cls._resolve_manageable_role(role)
            user.role = new_role

        if is_active is not None:
            user.is_active = bool(is_active)

        db.session.commit()
        return cls._serialize_user(user)

    @classmethod
    def delete_user(cls, user_id: int) -> Dict[str, Any]:
        user = cls._get_manageable_user(user_id)
        if user.certificate:
            raise ValueError("Cannot delete user with an active certificate")
        payload = cls._serialize_user(user)
        db.session.delete(user)
        db.session.commit()
        return payload
