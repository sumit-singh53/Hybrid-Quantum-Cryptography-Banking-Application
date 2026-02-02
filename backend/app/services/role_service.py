from typing import Dict, List

from sqlalchemy import func

from app.config.database import db
from app.models.role_model import Role
from app.models.user_model import User


class RoleService:

    ROLE_PERMISSIONS: Dict[str, List[str]] = {
        "customer": ["CREATE_TRANSACTION", "VIEW_OWN"],
        "manager": [
            "APPROVE_TRANSACTION",
            "APPROVE_HIGH_VALUE",
            "REVOKE_CERT",
        ],
        "auditor_clerk": ["VIEW_AUDIT", "VERIFY_LOGS"],
        "system_admin": [
            "ISSUE_CERT",
            "MANAGE_CRL",
            "GLOBAL_AUDIT",
            "MANAGE_ROLES",
        ],
    }

    _SYSTEM_ROLE_NAMES = {name.lower() for name in ROLE_PERMISSIONS.keys()}

    @staticmethod
    def has_permission(role: str, action: str) -> bool:
        return action in RoleService.ROLE_PERMISSIONS.get(role, [])

    @staticmethod
    def _normalize_name(name: str) -> str:
        return (name or "").strip()

    @classmethod
    def _ensure_default_roles(cls) -> None:
        existing = {
            (row or "").lower()
            for (row,) in db.session.query(Role.name).all()
        }
        created = False
        for role_name in cls._SYSTEM_ROLE_NAMES:
            if role_name in existing:
                continue
            db.session.add(Role(name=role_name))
            created = True
        if created:
            db.session.commit()

    @staticmethod
    def _serialize(role: Role, *, user_count: int = 0) -> Dict[str, object]:
        normalized = (role.name or "").strip()
        lowered = normalized.lower()
        return {
            "id": role.id,
            "name": normalized,
            "user_count": user_count,
            "is_system_role": lowered in RoleService._SYSTEM_ROLE_NAMES,
        }

    @classmethod
    def list_roles(cls) -> Dict[str, object]:
        cls._ensure_default_roles()
        rows = (
            db.session.query(Role, func.count(User.id).label("user_count"))
            .outerjoin(User, User.role_id == Role.id)
            .group_by(Role.id)
            .order_by(func.lower(Role.name))
            .all()
        )
        roles = [cls._serialize(role, user_count=user_count) for role, user_count in rows]
        return {
            "roles": roles,
            "total": len(roles),
        }

    @classmethod
    def create_role(cls, *, name: str) -> Dict[str, object]:
        normalized = cls._normalize_name(name)
        if not normalized:
            raise ValueError("Role name is required")
        existing = Role.query.filter(func.lower(Role.name) == normalized.lower()).first()
        if existing:
            raise ValueError("Role already exists")
        role = Role(name=normalized)
        db.session.add(role)
        db.session.commit()
        return cls._serialize(role, user_count=0)

    @staticmethod
    def _get_role(role_id: int) -> Role:
        role = Role.query.get(role_id)
        if not role:
            raise LookupError("Role not found")
        return role

    @classmethod
    def update_role(cls, role_id: int, *, name: str) -> Dict[str, object]:
        role = cls._get_role(role_id)
        normalized = cls._normalize_name(name)
        if not normalized:
            raise ValueError("Role name is required")
        exists = (
            Role.query.filter(func.lower(Role.name) == normalized.lower())
            .filter(Role.id != role.id)
            .first()
        )
        if exists:
            raise ValueError("Role already exists")
        role.name = normalized
        db.session.commit()
        user_count = len(role.users)
        return cls._serialize(role, user_count=user_count)

    @classmethod
    def delete_role(cls, role_id: int) -> Dict[str, object]:
        role = cls._get_role(role_id)
        if role.users:
            raise ValueError("Role is assigned to users and cannot be deleted")
        payload = cls._serialize(role, user_count=0)
        db.session.delete(role)
        db.session.commit()
        return payload
