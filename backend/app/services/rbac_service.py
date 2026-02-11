"""
RBAC Service
Handles role and permission management operations.
"""
from app.config.database import db
from app.models.role_model import Role
from app.models.permission_model import Permission, RolePermission
from app.security.rbac_permissions import (
    PERMISSIONS,
    ROLE_PERMISSIONS,
    ROLE_HIERARCHY,
)


class RBACService:
    """Service for managing roles, permissions, and their relationships."""

    @staticmethod
    def initialize_permissions():
        """Initialize all permissions in the database."""
        created_count = 0
        
        for name, resource, action, description in PERMISSIONS:
            existing = Permission.query.filter_by(name=name).first()
            if not existing:
                permission = Permission(
                    name=name,
                    resource=resource,
                    action=action,
                    description=description,
                )
                db.session.add(permission)
                created_count += 1
        
        db.session.commit()
        return created_count

    @staticmethod
    def initialize_roles():
        """Initialize default roles with hierarchy levels."""
        created_count = 0
        
        role_descriptions = {
            "customer": "Standard customer with access to own accounts and transactions",
            "manager": "Branch manager with approval and oversight capabilities",
            "auditor_clerk": "Auditor with read-only access to all system logs and transactions",
            "system_admin": "System administrator with full system access and management",
        }
        
        for role_name, hierarchy_level in ROLE_HIERARCHY.items():
            existing = Role.query.filter_by(name=role_name).first()
            if not existing:
                role = Role(
                    name=role_name,
                    description=role_descriptions.get(role_name, ""),
                    hierarchy_level=hierarchy_level,
                )
                db.session.add(role)
                created_count += 1
            else:
                # Update hierarchy level if role exists
                existing.hierarchy_level = hierarchy_level
                existing.description = role_descriptions.get(role_name, existing.description)
        
        db.session.commit()
        return created_count

    @staticmethod
    def assign_role_permissions():
        """Assign permissions to roles based on ROLE_PERMISSIONS mapping."""
        assignments_count = 0
        
        for role_name, permission_names in ROLE_PERMISSIONS.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                continue
            
            # Clear existing permissions for this role
            RolePermission.query.filter_by(role_id=role.id).delete()
            
            # Assign new permissions
            for perm_name in permission_names:
                permission = Permission.query.filter_by(name=perm_name).first()
                if permission:
                    role_perm = RolePermission(
                        role_id=role.id,
                        permission_id=permission.id,
                    )
                    db.session.add(role_perm)
                    assignments_count += 1
        
        db.session.commit()
        return assignments_count

    @staticmethod
    def initialize_rbac():
        """Initialize complete RBAC system (roles, permissions, and mappings)."""
        permissions_created = RBACService.initialize_permissions()
        roles_created = RBACService.initialize_roles()
        assignments_created = RBACService.assign_role_permissions()
        
        return {
            "permissions_created": permissions_created,
            "roles_created": roles_created,
            "assignments_created": assignments_created,
            "status": "RBAC system initialized successfully",
        }

    @staticmethod
    def get_role_with_permissions(role_name):
        """Get role details with all assigned permissions."""
        role = Role.query.filter_by(name=role_name.lower()).first()
        if not role:
            return None
        
        return {
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "hierarchy_level": role.hierarchy_level,
            "permissions": [
                {
                    "id": p.id,
                    "name": p.name,
                    "resource": p.resource,
                    "action": p.action,
                    "description": p.description,
                }
                for p in role.permissions
            ],
        }

    @staticmethod
    def get_all_roles_with_permissions():
        """Get all roles with their permissions."""
        roles = Role.query.order_by(Role.hierarchy_level.desc()).all()
        return [
            {
                "id": role.id,
                "name": role.name,
                "description": role.description,
                "hierarchy_level": role.hierarchy_level,
                "permissions": [p.name for p in role.permissions],
                "permission_count": len(role.permissions),
            }
            for role in roles
        ]

    @staticmethod
    def get_all_permissions():
        """Get all available permissions."""
        permissions = Permission.query.order_by(Permission.resource, Permission.action).all()
        return [p.to_dict() for p in permissions]

    @staticmethod
    def add_permission_to_role(role_name, permission_name):
        """Add a permission to a role."""
        role = Role.query.filter_by(name=role_name.lower()).first()
        if not role:
            raise ValueError(f"Role '{role_name}' not found")
        
        permission = Permission.query.filter_by(name=permission_name).first()
        if not permission:
            raise ValueError(f"Permission '{permission_name}' not found")
        
        # Check if already assigned
        existing = RolePermission.query.filter_by(
            role_id=role.id,
            permission_id=permission.id,
        ).first()
        
        if existing:
            return {"message": "Permission already assigned to role"}
        
        role_perm = RolePermission(role_id=role.id, permission_id=permission.id)
        db.session.add(role_perm)
        db.session.commit()
        
        return {
            "message": "Permission added to role",
            "role": role.name,
            "permission": permission.name,
        }

    @staticmethod
    def remove_permission_from_role(role_name, permission_name):
        """Remove a permission from a role."""
        role = Role.query.filter_by(name=role_name.lower()).first()
        if not role:
            raise ValueError(f"Role '{role_name}' not found")
        
        permission = Permission.query.filter_by(name=permission_name).first()
        if not permission:
            raise ValueError(f"Permission '{permission_name}' not found")
        
        role_perm = RolePermission.query.filter_by(
            role_id=role.id,
            permission_id=permission.id,
        ).first()
        
        if not role_perm:
            return {"message": "Permission not assigned to role"}
        
        db.session.delete(role_perm)
        db.session.commit()
        
        return {
            "message": "Permission removed from role",
            "role": role.name,
            "permission": permission.name,
        }

    @staticmethod
    def get_user_permissions(user):
        """Get all permissions for a user based on their role."""
        if not user or not user.role:
            return []
        
        return [
            {
                "name": p.name,
                "resource": p.resource,
                "action": p.action,
                "description": p.description,
            }
            for p in user.role.permissions
        ]

    @staticmethod
    def user_has_permission(user, permission_name):
        """Check if a user has a specific permission."""
        if not user or not user.role:
            return False
        
        return user.role.has_permission(permission_name)
