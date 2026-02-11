"""
Security Policy Routes
----------------------
Admin-only endpoints for managing system security policies.
All endpoints require system_admin role and are fully audited.
"""

from flask import Blueprint, jsonify, request
from app.services.security_policy_service import SecurityPolicyService
from app.security.access_control import require_certificate
from app.security.security_event_store import SecurityEventStore


security_policy_bp = Blueprint("security_policy", __name__, url_prefix="/api/admin")


def system_admin_guard(*, allowed_actions=None, action_match="all"):
    """Decorator for system admin endpoints."""
    actions = allowed_actions or ["GLOBAL_AUDIT"]
    return require_certificate(
        required_role="system_admin",
        allowed_actions=actions,
        action_match=action_match,
    )


@security_policy_bp.route("/security-policies", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_all_policies():
    """Get all security policies grouped by category."""
    try:
        policies = SecurityPolicyService.get_all_policies()
        return jsonify(policies), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@security_policy_bp.route("/security-policies/summary", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_policy_summary():
    """Get security policy summary statistics."""
    try:
        summary = SecurityPolicyService.get_policy_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@security_policy_bp.route("/security-policies/category/<category>", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_policies_by_category(category):
    """Get all policies in a specific category."""
    try:
        policies = SecurityPolicyService.get_policies_by_category(category)
        return jsonify({"policies": policies, "category": category}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@security_policy_bp.route("/security-policies/<policy_key>", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_policy(policy_key):
    """Get a specific policy by key."""
    try:
        policy = SecurityPolicyService.get_policy_by_key(policy_key)
        if not policy:
            return jsonify({"message": f"Policy '{policy_key}' not found"}), 404
        return jsonify(policy), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@security_policy_bp.route("/security-policies/<policy_key>", methods=["PUT"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def update_policy(policy_key):
    """Update a specific security policy."""
    try:
        data = request.get_json()
        
        if not data or "policy_value" not in data:
            return jsonify({"message": "policy_value is required"}), 400
        
        # Get admin username from request context (set by middleware)
        admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
        
        new_value = str(data["policy_value"])
        
        updated_policy = SecurityPolicyService.update_policy(
            policy_key=policy_key,
            new_value=new_value,
            admin_username=admin_username
        )
        
        return jsonify({
            "message": f"Policy '{policy_key}' updated successfully",
            "policy": updated_policy
        }), 200
        
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@security_policy_bp.route("/security-policies/bulk-update", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def bulk_update_policies():
    """Update multiple security policies at once."""
    try:
        data = request.get_json()
        
        if not data or "updates" not in data:
            return jsonify({"message": "updates array is required"}), 400
        
        updates = data["updates"]
        
        if not isinstance(updates, list) or len(updates) == 0:
            return jsonify({"message": "updates must be a non-empty array"}), 400
        
        # Get admin username from request context
        admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
        
        result = SecurityPolicyService.update_multiple_policies(
            updates=updates,
            admin_username=admin_username
        )
        
        return jsonify({
            "message": f"Successfully updated {result['updated_count']} policies",
            **result
        }), 200
        
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@security_policy_bp.route("/security-policies/initialize", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def initialize_policies():
    """Initialize default security policies (idempotent)."""
    try:
        SecurityPolicyService.initialize_default_policies()
        
        # Log initialization
        admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
        SecurityEventStore.record(
            event_type="SECURITY_POLICY_INITIALIZE",
            user_id=admin_username,
            metadata={"action": "initialize_default_policies"},
        )
        
        return jsonify({
            "message": "Default security policies initialized successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"message": str(e)}), 500
