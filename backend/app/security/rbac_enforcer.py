"""
RBAC Enforcer - Strict Backend Permission Enforcement
This module provides hardcore backend enforcement with zero reliance on frontend.
"""
from functools import wraps
from flask import request, jsonify, current_app

from app.models.user_model import User
from app.models.role_model import Role
from app.security.rbac_permissions import get_role_permissions
from app.utils.logger import AuditLogger


class RBACEnforcer:
    """
    Strict RBAC enforcement class.
    Extracts user from session, resolves permissions, and blocks unauthorized access.
    """

    @staticmethod
    def extract_user_from_session():
        """
        Extract user and role from the current session/request.
        Works with certificate-based authentication system.
        
        Returns:
            tuple: (user_dict, role_name) or (None, None) if not authenticated
        """
        # Get user from request context (set by require_certificate decorator)
        user = getattr(request, "user", None)
        
        if not user:
            return None, None
        
        user_role = (user.get("role") or "").lower().strip()
        
        if not user_role:
            return user, None
        
        return user, user_role

    @staticmethod
    def resolve_permissions(role_name):
        """
        Resolve all permissions for a given role.
        
        Args:
            role_name: Name of the role
            
        Returns:
            set: Set of permission names for the role
        """
        if not role_name:
            return set()
        
        permissions = get_role_permissions(role_name.lower())
        return set(permissions)

    @staticmethod
    def check_permission(user_role, required_permission):
        """
        Check if a role has a specific permission.
        
        Args:
            user_role: User's role name
            required_permission: Permission name to check
            
        Returns:
            bool: True if role has permission, False otherwise
        """
        if not user_role or not required_permission:
            return False
        
        role_permissions = RBACEnforcer.resolve_permissions(user_role)
        return required_permission in role_permissions

    @staticmethod
    def check_any_permission(user_role, required_permissions):
        """
        Check if role has ANY of the required permissions.
        
        Args:
            user_role: User's role name
            required_permissions: List of permission names
            
        Returns:
            bool: True if role has at least one permission
        """
        if not user_role or not required_permissions:
            return False
        
        role_permissions = RBACEnforcer.resolve_permissions(user_role)
        return any(perm in role_permissions for perm in required_permissions)

    @staticmethod
    def check_all_permissions(user_role, required_permissions):
        """
        Check if role has ALL of the required permissions.
        
        Args:
            user_role: User's role name
            required_permissions: List of permission names
            
        Returns:
            bool: True if role has all permissions
        """
        if not user_role or not required_permissions:
            return False
        
        role_permissions = RBACEnforcer.resolve_permissions(user_role)
        return all(perm in role_permissions for perm in required_permissions)

    @staticmethod
    def log_access_attempt(user, role, endpoint, permission, granted):
        """
        Log all access attempts for audit trail.
        
        Args:
            user: User dict
            role: User's role
            endpoint: API endpoint accessed
            permission: Permission checked
            granted: Whether access was granted
        """
        try:
            AuditLogger.log_action(
                user=user or {"id": "unknown", "name": "unknown"},
                action=f"RBAC: {'GRANTED' if granted else 'DENIED'} - {endpoint}",
                metadata={
                    "role": role,
                    "permission": permission,
                    "endpoint": endpoint,
                    "method": request.method,
                    "ip": request.remote_addr,
                }
            )
        except Exception as e:
            current_app.logger.error(f"Failed to log access attempt: {e}")

    @staticmethod
    def enforce_permission(required_permission, match_mode="all"):
        """
        Decorator to enforce permission-based access control.
        This is the main enforcement mechanism - 100% backend, zero frontend reliance.
        
        Args:
            required_permission: Permission name or list of permissions
            match_mode: 'all' (default) or 'any' for multiple permissions
            
        Returns:
            Decorator function
            
        Usage:
            @RBACEnforcer.enforce_permission("approve_transaction")
            def approve_transaction():
                pass
        """
        # Normalize to list
        if isinstance(required_permission, str):
            required_permissions = [required_permission]
        else:
            required_permissions = list(required_permission)
        
        def decorator(f):
            @wraps(f)
            def wrapper(*args, **kwargs):
                # Step 1: Extract user and role from session
                user, user_role = RBACEnforcer.extract_user_from_session()
                
                if not user:
                    RBACEnforcer.log_access_attempt(
                        None, None, request.endpoint, required_permissions, False
                    )
                    return jsonify({
                        "error": "Authentication required",
                        "message": "You must be authenticated to access this resource",
                        "status": 401
                    }), 401
                
                if not user_role:
                    RBACEnforcer.log_access_attempt(
                        user, None, request.endpoint, required_permissions, False
                    )
                    return jsonify({
                        "error": "Role not found",
                        "message": "User role could not be determined",
                        "status": 403
                    }), 403
                
                # Step 2: Resolve permissions for the role
                role_permissions = RBACEnforcer.resolve_permissions(user_role)
                
                # Step 3: Check if user has required permission(s)
                if match_mode == "any":
                    has_permission = RBACEnforcer.check_any_permission(
                        user_role, required_permissions
                    )
                else:  # all
                    has_permission = RBACEnforcer.check_all_permissions(
                        user_role, required_permissions
                    )
                
                # Step 4: Block or allow access
                if not has_permission:
                    RBACEnforcer.log_access_attempt(
                        user, user_role, request.endpoint, required_permissions, False
                    )
                    return jsonify({
                        "error": "Forbidden",
                        "message": "You do not have permission to access this resource",
                        "required_permissions": required_permissions,
                        "user_role": user_role,
                        "status": 403
                    }), 403
                
                # Step 5: Log successful access and allow
                RBACEnforcer.log_access_attempt(
                    user, user_role, request.endpoint, required_permissions, True
                )
                
                return f(*args, **kwargs)
            
            return wrapper
        return decorator

    @staticmethod
    def enforce_role(allowed_roles):
        """
        Decorator to enforce role-based access control.
        
        Args:
            allowed_roles: Role name or list of allowed roles
            
        Returns:
            Decorator function
            
        Usage:
            @RBACEnforcer.enforce_role(["manager", "system_admin"])
            def admin_function():
                pass
        """
        # Normalize to list
        if isinstance(allowed_roles, str):
            allowed_roles = [allowed_roles]
        
        # Normalize to lowercase
        allowed_roles = [role.lower() for role in allowed_roles]
        
        def decorator(f):
            @wraps(f)
            def wrapper(*args, **kwargs):
                user, user_role = RBACEnforcer.extract_user_from_session()
                
                if not user:
                    return jsonify({
                        "error": "Authentication required",
                        "message": "You must be authenticated to access this resource",
                        "status": 401
                    }), 401
                
                if not user_role or user_role not in allowed_roles:
                    RBACEnforcer.log_access_attempt(
                        user, user_role, request.endpoint, allowed_roles, False
                    )
                    return jsonify({
                        "error": "Forbidden",
                        "message": "Your role is not authorized to access this resource",
                        "allowed_roles": allowed_roles,
                        "user_role": user_role,
                        "status": 403
                    }), 403
                
                RBACEnforcer.log_access_attempt(
                    user, user_role, request.endpoint, allowed_roles, True
                )
                
                return f(*args, **kwargs)
            
            return wrapper
        return decorator

    @staticmethod
    def enforce_hierarchy_level(minimum_level):
        """
        Decorator to enforce minimum role hierarchy level.
        
        Args:
            minimum_level: Minimum hierarchy level required (1-4)
            
        Returns:
            Decorator function
            
        Usage:
            @RBACEnforcer.enforce_hierarchy_level(3)  # Auditor or higher
            def sensitive_function():
                pass
        """
        from app.security.rbac_permissions import get_role_hierarchy_level
        
        def decorator(f):
            @wraps(f)
            def wrapper(*args, **kwargs):
                user, user_role = RBACEnforcer.extract_user_from_session()
                
                if not user:
                    return jsonify({
                        "error": "Authentication required",
                        "status": 401
                    }), 401
                
                user_level = get_role_hierarchy_level(user_role)
                
                if user_level < minimum_level:
                    RBACEnforcer.log_access_attempt(
                        user, user_role, request.endpoint, 
                        f"level_{minimum_level}", False
                    )
                    return jsonify({
                        "error": "Forbidden",
                        "message": "Insufficient role level",
                        "required_level": minimum_level,
                        "user_level": user_level,
                        "status": 403
                    }), 403
                
                return f(*args, **kwargs)
            
            return wrapper
        return decorator


# Convenience functions for use in route handlers
def get_current_user():
    """Get current authenticated user from request context."""
    user, _ = RBACEnforcer.extract_user_from_session()
    return user


def get_current_role():
    """Get current user's role from request context."""
    _, role = RBACEnforcer.extract_user_from_session()
    return role


def get_current_permissions():
    """Get current user's permissions from request context."""
    _, role = RBACEnforcer.extract_user_from_session()
    if not role:
        return set()
    return RBACEnforcer.resolve_permissions(role)


def has_permission(permission_name):
    """Check if current user has a specific permission."""
    _, role = RBACEnforcer.extract_user_from_session()
    if not role:
        return False
    return RBACEnforcer.check_permission(role, permission_name)


def has_any_permission(*permission_names):
    """Check if current user has any of the specified permissions."""
    _, role = RBACEnforcer.extract_user_from_session()
    if not role:
        return False
    return RBACEnforcer.check_any_permission(role, permission_names)


def has_all_permissions(*permission_names):
    """Check if current user has all of the specified permissions."""
    _, role = RBACEnforcer.extract_user_from_session()
    if not role:
        return False
    return RBACEnforcer.check_all_permissions(role, permission_names)


def require_permission_or_403(permission_name):
    """
    Raise 403 if current user doesn't have permission.
    Use this for inline permission checks within route handlers.
    """
    if not has_permission(permission_name):
        user, role = RBACEnforcer.extract_user_from_session()
        RBACEnforcer.log_access_attempt(
            user, role, request.endpoint, permission_name, False
        )
        from flask import abort
        abort(403, description=f"Permission '{permission_name}' required")
