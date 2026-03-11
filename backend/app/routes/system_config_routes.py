"""
System Configuration Routes
----------------------------
Admin-only endpoints for managing system operational configurations.
All endpoints require system_admin role and are fully audited.
"""

from flask import Blueprint, jsonify, request
from app.services.system_config_service import SystemConfigService
from app.security.access_control import require_certificate
from app.security.security_event_store import SecurityEventStore


system_config_bp = Blueprint("system_config", __name__, url_prefix="/api/admin")


def system_admin_guard(*, allowed_actions=None, action_match="all"):
    """Decorator for system admin endpoints."""
    actions = allowed_actions or ["GLOBAL_AUDIT"]
    return require_certificate(
        required_role="system_admin",
        allowed_actions=actions,
        action_match=action_match,
    )


@system_config_bp.route("/system-config", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_all_configs():
    """Get all system configurations grouped by category."""
    try:
        configs = SystemConfigService.get_all_configs()
        return jsonify(configs), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@system_config_bp.route("/system-config/summary", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_config_summary():
    """Get system configuration summary statistics."""
    try:
        summary = SystemConfigService.get_config_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@system_config_bp.route("/system-config/category/<category>", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_configs_by_category(category):
    """Get all configurations in a specific category."""
    try:
        configs = SystemConfigService.get_configs_by_category(category)
        return jsonify({"configs": configs, "category": category}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@system_config_bp.route("/system-config/<config_key>", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_config(config_key):
    """Get a specific configuration by key."""
    try:
        config = SystemConfigService.get_config_by_key(config_key)
        if not config:
            return jsonify({"message": f"Configuration '{config_key}' not found"}), 404
        return jsonify(config), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@system_config_bp.route("/system-config/<config_key>", methods=["PUT"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def update_config(config_key):
    """Update a specific system configuration."""
    try:
        data = request.get_json()
        
        if not data or "config_value" not in data:
            return jsonify({"message": "config_value is required"}), 400
        
        # Get admin username from request context (set by middleware)
        admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
        
        new_value = str(data["config_value"])
        
        updated_config = SystemConfigService.update_config(
            config_key=config_key,
            new_value=new_value,
            admin_username=admin_username
        )
        
        return jsonify({
            "message": f"Configuration '{config_key}' updated successfully",
            "config": updated_config
        }), 200
        
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@system_config_bp.route("/system-config/bulk-update", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def bulk_update_configs():
    """Update multiple system configurations at once."""
    try:
        data = request.get_json()
        
        if not data or "updates" not in data:
            return jsonify({"message": "updates array is required"}), 400
        
        updates = data["updates"]
        
        if not isinstance(updates, list) or len(updates) == 0:
            return jsonify({"message": "updates must be a non-empty array"}), 400
        
        # Get admin username from request context
        admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
        
        result = SystemConfigService.update_multiple_configs(
            updates=updates,
            admin_username=admin_username
        )
        
        return jsonify({
            "message": f"Successfully updated {result['updated_count']} configurations",
            **result
        }), 200
        
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@system_config_bp.route("/system-config/initialize", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def initialize_configs():
    """Initialize default system configurations (idempotent)."""
    try:
        SystemConfigService.initialize_default_configs()
        
        # Log initialization
        admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
        SecurityEventStore.record(
            event_type="SYSTEM_CONFIG_INITIALIZE",
            user_id=admin_username,
            metadata={"action": "initialize_default_configs"},
        )
        
        return jsonify({
            "message": "Default system configurations initialized successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"message": str(e)}), 500
