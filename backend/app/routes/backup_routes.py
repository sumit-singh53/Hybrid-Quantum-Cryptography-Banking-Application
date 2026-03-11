"""
Backup & Recovery Routes
-------------------------
Admin-only endpoints for system backup and recovery operations.
All endpoints require system_admin role and are fully audited.
"""

from flask import Blueprint, jsonify, request
from app.services.backup_service import BackupService
from app.security.access_control import require_certificate
from app.security.security_event_store import SecurityEventStore


backup_bp = Blueprint("backup", __name__, url_prefix="/api/admin")


def system_admin_guard(*, allowed_actions=None, action_match="all"):
    """Decorator for system admin endpoints."""
    actions = allowed_actions or ["GLOBAL_AUDIT"]
    return require_certificate(
        required_role="system_admin",
        allowed_actions=actions,
        action_match=action_match,
    )


@backup_bp.route("/backups", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_all_backups():
    """Get all system backups."""
    try:
        backups = BackupService.get_all_backups()
        return jsonify({"backups": backups, "total": len(backups)}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@backup_bp.route("/backups/statistics", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_backup_statistics():
    """Get backup statistics."""
    try:
        stats = BackupService.get_backup_statistics()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@backup_bp.route("/backups/<backup_id>", methods=["GET"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def get_backup(backup_id):
    """Get a specific backup by ID."""
    try:
        backup = BackupService.get_backup_by_id(backup_id)
        if not backup:
            return jsonify({"message": f"Backup '{backup_id}' not found"}), 404
        return jsonify(backup), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@backup_bp.route("/backups/create", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def create_backup():
    """Create a new system backup."""
    try:
        data = request.get_json() or {}
        
        backup_type = data.get("backup_type", "manual")
        description = data.get("description")
        
        # Get admin username from request context
        admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
        
        backup = BackupService.create_backup(
            backup_type=backup_type,
            admin_username=admin_username,
            description=description
        )
        
        return jsonify({
            "message": "Backup created successfully",
            "backup": backup
        }), 201
        
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@backup_bp.route("/backups/<backup_id>/verify", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def verify_backup(backup_id):
    """Verify backup integrity."""
    try:
        result = BackupService.verify_backup_integrity(backup_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@backup_bp.route("/backups/<backup_id>/restore", methods=["POST"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def restore_backup(backup_id):
    """Restore system from a backup."""
    try:
        data = request.get_json() or {}
        
        confirmed = data.get("confirmed", False)
        
        if not confirmed:
            return jsonify({
                "message": "Restore operation requires explicit confirmation"
            }), 400
        
        # Get admin username from request context
        admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
        
        result = BackupService.restore_backup(
            backup_id=backup_id,
            admin_username=admin_username,
            confirmed=confirmed
        )
        
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@backup_bp.route("/backups/<backup_id>", methods=["DELETE"])
@system_admin_guard(allowed_actions=["GLOBAL_AUDIT"])
def delete_backup(backup_id):
    """Delete a backup."""
    try:
        # Get admin username from request context
        admin_username = getattr(request, "user", {}).get("id", "unknown_admin")
        
        result = BackupService.delete_backup(
            backup_id=backup_id,
            admin_username=admin_username
        )
        
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({"message": str(e)}), 404
    except Exception as e:
        return jsonify({"message": str(e)}), 500
