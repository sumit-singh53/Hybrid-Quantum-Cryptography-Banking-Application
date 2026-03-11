"""
Enhanced RBAC Middleware
Provides decorators and utilities for enforcing role-based access control.
"""
from functools import wraps
from flask import request, jsonify, current_app

from app.security.access_control import require_certificate
from app.security.rbac_permissions import (
    get_role_permissions,
    get_role_hierarchy_level,
    has_higher_privilege,
)


def require_permission(*required_permissions, match_mode="all"):
    """
    Decorator to enforce permission-based access control.
    
    Args:
        required_permissions: One or more permission names required
        match_mode: 'all' (default) requires all permissions, 'any' requires at least one
    
    Usage:
        @require_permission('view_all_customers')
        @require_permission('approve_transaction', 'reject_transaction', match_mode='any')
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Get user from request (set by require_certificate)
            user = getattr(request, "user", None)
            if not user:
                return jsonify({"message": "Authentication required"}), 401
            
            user_role = (user.get("role") or "").lower()
            if not user_role:
                return jsonify({"message": "User role not found"}), 403
            
            # Get permissions for user's role
            role_permissions = get_role_permissions(user_role)
            
            # Check if user has required permissions
            if match_mode == "all":
                has_access = all(perm in role_permissions for perm in required_permissions)
            else:  # any
                has_access = any(perm in role_permissions for perm in required_permissions)
            
            if not has_access:
                return jsonify({
                    "message": "Insufficient permissions",
                    "required_permissions": list(required_permissions),
                    "user_role": user_role,
                }), 403
            
            return f(*args, **kwargs)
        
        return wrapper
    return decorator


def require_role_level(minimum_level):
    """
    Decorator to enforce minimum role hierarchy level.
    
    Args:
        minimum_level: Minimum hierarchy level required (1-4)
    
    Usage:
        @require_role_level(3)  # Requires auditor_clerk or system_admin
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(request, "user", None)
            if not user:
                return jsonify({"message": "Authentication required"}), 401
            
            user_role = (user.get("role") or "").lower()
            user_level = get_role_hierarchy_level(user_role)
            
            if user_level < minimum_level:
                return jsonify({
                    "message": "Insufficient role level",
                    "required_level": minimum_level,
                    "user_level": user_level,
                }), 403
            
            return f(*args, **kwargs)
        
        return wrapper
    return decorator


def require_self_or_permission(permission_name, user_id_param="user_id"):
    """
    Decorator that allows access if user is accessing their own resource OR has permission.
    
    Args:
        permission_name: Permission required if not accessing own resource
        user_id_param: Name of the parameter/argument containing the target user_id
    
    Usage:
        @require_self_or_permission('view_all_customers', user_id_param='customer_id')
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(request, "user", None)
            if not user:
                return jsonify({"message": "Authentication required"}), 401
            
            current_user_id = user.get("id")
            target_user_id = kwargs.get(user_id_param) or request.args.get(user_id_param)
            
            # Allow if accessing own resource
            if str(current_user_id) == str(target_user_id):
                return f(*args, **kwargs)
            
            # Otherwise check permission
            user_role = (user.get("role") or "").lower()
            role_permissions = get_role_permissions(user_role)
            
            if permission_name not in role_permissions:
                return jsonify({
                    "message": "Cannot access other user's resource without permission",
                    "required_permission": permission_name,
                }), 403
            
            return f(*args, **kwargs)
        
        return wrapper
    return decorator


def check_permission(user_role, permission_name):
    """
    Utility function to check if a role has a specific permission.
    
    Args:
        user_role: Role name (string)
        permission_name: Permission name to check
    
    Returns:
        bool: True if role has permission, False otherwise
    """
    role_permissions = get_role_permissions(user_role.lower())
    return permission_name in role_permissions


def check_role_hierarchy(user_role, target_role):
    """
    Check if user_role has higher privilege than target_role.
    
    Args:
        user_role: Current user's role
        target_role: Target role to compare against
    
    Returns:
        bool: True if user_role has higher privilege
    """
    return has_higher_privilege(user_role, target_role)


def get_user_permissions(user_role):
    """
    Get all permissions for a user's role.
    
    Args:
        user_role: Role name
    
    Returns:
        list: List of permission names
    """
    return get_role_permissions(user_role.lower())


# Combined decorator for certificate + permission check
def require_auth_and_permission(*permissions, match_mode="all", allowed_actions=None):
    """
    Combined decorator that enforces both certificate authentication and permissions.
    
    This is a convenience decorator that combines require_certificate and require_permission.
    
    Args:
        permissions: Permission names required
        match_mode: 'all' or 'any' for permission matching
        allowed_actions: Legacy certificate actions (for backward compatibility)
    
    Usage:
        @require_auth_and_permission('approve_transaction')
        @require_auth_and_permission('view_all_customers', 'manage_users', match_mode='any')
    """
    def decorator(f):
        # First apply certificate authentication
        cert_decorator = require_certificate(allowed_actions=allowed_actions)
        f_with_cert = cert_decorator(f)
        
        # Then apply permission check
        perm_decorator = require_permission(*permissions, match_mode=match_mode)
        f_with_perm = perm_decorator(f_with_cert)
        
        return f_with_perm
    
    return decorator
