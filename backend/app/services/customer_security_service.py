"""
Customer Security Service
Provides security-related information for customer role only.
Enforces strict RBAC and privacy controls.
"""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import hashlib

from app.models.user_model import User
from app.models.customer_model import Customer
from app.security.accountability_store import AccountabilityStore
from app.security.security_event_store import SecurityEventStore
from app.security.request_audit_store import RequestAuditStore
from app.services.certificate_service import CertificateService


class CustomerSecurityService:
    """Security Center service for customer role with strict privacy controls."""

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _parse_iso8601(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            if value.endswith("Z"):
                value = value[:-1] + "+00:00"
            return datetime.fromisoformat(value)
        except ValueError:
            return None

    @staticmethod
    def _format_timestamp(value: Optional[datetime]) -> Optional[str]:
        if not value:
            return None
        return (
            value.astimezone(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z")
        )

    @staticmethod
    def _mask_sensitive_id(identifier: str, show_chars: int = 4) -> str:
        """Mask sensitive identifiers showing only last N characters."""
        if not identifier or len(identifier) <= show_chars:
            return "****"
        return f"****{identifier[-show_chars:]}"

    @staticmethod
    def _calculate_password_strength(user: User) -> Dict[str, Any]:
        """
        Calculate password strength indicator.
        Note: This system uses certificate-based authentication, not passwords.
        """
        # This system doesn't use passwords - it's certificate-based
        return {
            "status": "N/A (Certificate Auth)",
            "score": 100,  # Certificate auth is more secure than passwords
            "last_changed": None,
            "age_days": 0,
            "recommendations": [],
            "note": "This system uses certificate-based authentication"
        }

    @classmethod
    def get_last_login_details(cls, user_id: str) -> Dict[str, Any]:
        """
        Get last login details for customer.
        Returns date, time, location (if available).
        """
        events = AccountabilityStore.query_events(user_id=user_id)
        login_events = [e for e in events if e.get("intent") == "certificate_login"]
        
        if not login_events:
            return {
                "has_login": False,
                "message": "No login history available"
            }
        
        # Sort by timestamp and get latest
        login_events.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
        latest = login_events[0]
        
        metadata = latest.get("metadata", {}) or {}
        location = latest.get("location", {}) or {}
        
        return {
            "has_login": True,
            "timestamp": latest.get("timestamp"),
            "date": cls._parse_iso8601(latest.get("timestamp")),
            "device_id": cls._mask_sensitive_id(metadata.get("device_id", ""), 6),
            "device_label": metadata.get("device_label") or metadata.get("device_name") or "Unknown Device",
            "ip_address": location.get("ip", "Unknown"),
            "city": location.get("city"),
            "country": location.get("country"),
            "location_string": cls._format_location(location),
        }

    @staticmethod
    def _format_location(location: Dict[str, Any]) -> str:
        """Format location information for display."""
        city = location.get("city")
        country = location.get("country")
        ip = location.get("ip")
        
        if city and country:
            return f"{city}, {country}"
        if city or country:
            return city or country
        if ip:
            return f"IP: {ip}"
        return "Location unavailable"

    @classmethod
    def get_active_sessions(cls, user_id: str, certificate_id: str) -> List[Dict[str, Any]]:
        """
        Get list of active sessions for customer.
        Note: This is a simplified implementation.
        In production, you'd track actual session tokens.
        """
        # Get recent login events (last 7 days)
        events = AccountabilityStore.query_events(user_id=user_id)
        login_events = [e for e in events if e.get("intent") == "certificate_login"]
        
        # Filter recent logins (last 7 days)
        cutoff = cls._now_utc() - timedelta(days=7)
        recent_logins = []
        
        for event in login_events:
            timestamp = cls._parse_iso8601(event.get("timestamp"))
            if timestamp and timestamp > cutoff:
                recent_logins.append(event)
        
        # Group by device and get latest per device
        device_sessions = {}
        for event in recent_logins:
            metadata = event.get("metadata", {}) or {}
            device_id = metadata.get("device_id")
            if device_id:
                if device_id not in device_sessions or event.get("timestamp") > device_sessions[device_id].get("timestamp"):
                    device_sessions[device_id] = event
        
        # Format sessions
        sessions = []
        current_cert_id = certificate_id
        
        for device_id, event in device_sessions.items():
            metadata = event.get("metadata", {}) or {}
            location = event.get("location", {}) or {}
            is_current = event.get("certificate_id") == current_cert_id
            
            sessions.append({
                "session_id": cls._mask_sensitive_id(device_id, 6),
                "device_id": cls._mask_sensitive_id(device_id, 6),
                "device_label": metadata.get("device_label") or metadata.get("device_name") or "Unknown Device",
                "last_active": event.get("timestamp"),
                "location": cls._format_location(location),
                "ip_address": location.get("ip", "Unknown"),
                "is_current": is_current,
                "can_logout": not is_current  # Can't logout current session
            })
        
        # Sort by last active (most recent first)
        sessions.sort(key=lambda s: s.get("last_active", ""), reverse=True)
        
        return sessions

    @classmethod
    def get_security_status(cls, user_id: str, certificate: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get overall security status indicators for customer.
        user_id here is actually the certificate_id (UUID), not username
        """
        # Try to find user by certificate_id first, then by username
        user = None
        
        # First try: Look up by certificate relationship
        from app.models.certificate_model import Certificate as CertModel
        cert_record = CertModel.query.filter_by(certificate_id=user_id).first()
        if cert_record and cert_record.user:
            user = cert_record.user
        
        # Second try: Direct username lookup (fallback)
        if not user:
            user = User.query.filter_by(username=user_id).first()
        
        # If still no user found, return default values
        if not user:
            print(f"WARNING: User not found for user_id={user_id}")
            # But we can still return certificate-based status
            # Don't return early - continue with certificate data
        
        # Certificate status
        certificate_id = certificate.get("certificate_id", "")
        cert_status = "UNKNOWN"
        cert_valid_until = None
        cert_revoked = False
        
        try:
            if certificate_id:
                cert_revoked = CertificateService.is_revoked(certificate_id)
                valid_to = cls._parse_iso8601(certificate.get("valid_to"))
                now = cls._now_utc()
                
                if cert_revoked:
                    cert_status = "REVOKED"
                elif valid_to and valid_to <= now:
                    cert_status = "EXPIRED"
                elif valid_to and (valid_to - now).days <= 7:
                    cert_status = "EXPIRING_SOON"
                elif valid_to:
                    cert_status = "VALID"
                
                cert_valid_until = cls._format_timestamp(valid_to)
        except Exception as e:
            print(f"Error checking certificate status: {e}")
            cert_status = "UNKNOWN"
        
        # Password strength (N/A for certificate-based auth)
        password_strength = cls._calculate_password_strength(user) if user else {
            "status": "N/A (Certificate Auth)",
            "score": 100,
            "last_changed": None,
            "age_days": 0,
            "recommendations": [],
            "note": "Certificate-based authentication"
        }
        
        # Encryption status (check if certificate has encryption keys)
        encryption_active = bool(certificate.get("ml_kem_public_key") or certificate.get("rsa_public_key"))
        encryption_type = "Hybrid (RSA + ML-KEM)" if certificate.get("ml_kem_public_key") else "RSA Only"
        
        # 2FA status (certificate-based auth with device binding)
        two_factor_enabled = bool(certificate.get("device_id"))
        two_factor_type = "Certificate + Device Binding" if two_factor_enabled else "Certificate Only"
        
        # Overall security score (certificate-based system)
        score = 100
        if cert_status != "VALID":
            score -= 40  # Certificate is critical
        if not encryption_active:
            score -= 30  # Encryption is critical
        if not two_factor_enabled:
            score -= 30  # Device binding is critical
        
        print(f"DEBUG get_security_status: cert_status={cert_status}, encryption_active={encryption_active}, two_factor_enabled={two_factor_enabled}, score={score}")
        
        return {
            "overall_score": max(score, 0),
            "overall_status": "SECURE" if score >= 80 else "NEEDS_ATTENTION" if score >= 50 else "AT_RISK",
            "certificate": {
                "status": cert_status,
                "valid_until": cert_valid_until,
                "is_revoked": cert_revoked,
                "certificate_id_masked": cls._mask_sensitive_id(certificate_id or "", 8),
            },
            "password": password_strength,
            "encryption": {
                "active": encryption_active,
                "type": encryption_type,
                "status": "Active" if encryption_active else "Inactive"
            },
            "two_factor": {
                "enabled": two_factor_enabled,
                "type": two_factor_type,
                "status": "Active" if two_factor_enabled else "Inactive"
            }
        }

    @classmethod
    def get_security_alerts(cls, user_id: str, certificate_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get security alerts history for customer (read-only).
        Includes failed login attempts and suspicious access notifications.
        """
        alerts = []
        
        # Get security events for this user
        all_events = SecurityEventStore.query_events(limit=100)
        user_events = [e for e in all_events if e.get("user_id") == user_id or e.get("certificate_id") == certificate_id]
        
        for event in user_events:
            event_type = event.get("event_type", "")
            metadata = event.get("metadata", {}) or {}
            
            # Map event types to alert severity and messages
            alert = {
                "alert_id": event.get("event_id"),
                "timestamp": event.get("timestamp"),
                "type": event_type,
                "severity": cls._get_alert_severity(event_type),
                "message": cls._format_alert_message(event_type, metadata),
                "details": metadata,
                "resolved": True  # All historical alerts are considered resolved
            }
            
            alerts.append(alert)
        
        # Sort by timestamp (most recent first)
        alerts.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
        
        return alerts[:limit]

    @staticmethod
    def _get_alert_severity(event_type: str) -> str:
        """Map event type to severity level."""
        high_severity = ["device_mismatch", "certificate_revoked", "suspicious_login"]
        medium_severity = ["certificate_expiring", "unusual_activity"]
        
        if event_type in high_severity:
            return "HIGH"
        elif event_type in medium_severity:
            return "MEDIUM"
        return "LOW"

    @staticmethod
    def _format_alert_message(event_type: str, metadata: Dict[str, Any]) -> str:
        """Format alert message based on event type."""
        messages = {
            "device_mismatch": "Device binding mismatch detected",
            "certificate_revoked": "Certificate was revoked",
            "certificate_expiring": "Certificate is expiring soon",
            "suspicious_login": "Suspicious login attempt detected",
            "unusual_activity": "Unusual account activity detected",
            "failed_login": "Failed login attempt",
        }
        
        base_message = messages.get(event_type, f"Security event: {event_type}")
        
        # Add context from metadata if available
        if metadata.get("reason"):
            base_message += f" - {metadata['reason']}"
        
        return base_message

    @classmethod
    def get_security_dashboard(cls, user_id: str, certificate: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get complete security dashboard data for customer.
        This is the main endpoint that aggregates all security information.
        """
        certificate_id = certificate.get("certificate_id", "")
        
        return {
            "user_id_masked": cls._mask_sensitive_id(user_id, 6),
            "last_login": cls.get_last_login_details(user_id),
            "active_sessions": cls.get_active_sessions(user_id, certificate_id),
            "security_status": cls.get_security_status(user_id, certificate),
            "security_alerts": cls.get_security_alerts(user_id, certificate_id, limit=10),
            "generated_at": cls._format_timestamp(cls._now_utc()),
        }

    @classmethod
    def logout_session(cls, user_id: str, session_id: str) -> Dict[str, Any]:
        """
        Logout from a specific session (placeholder).
        In production, this would invalidate the session token.
        
        Note: This is a safe action that doesn't expose sensitive data.
        """
        # This is a placeholder - actual implementation would:
        # 1. Validate session belongs to user
        # 2. Invalidate session token
        # 3. Log the action
        
        # For now, just log the action
        SecurityEventStore.record(
            event_type="session_logout_requested",
            user_id=user_id,
            metadata={
                "session_id": session_id,
                "action": "manual_logout",
                "timestamp": cls._format_timestamp(cls._now_utc())
            }
        )
        
        return {
            "success": True,
            "message": "Session logout requested. Please re-authenticate on that device.",
            "session_id": session_id
        }
