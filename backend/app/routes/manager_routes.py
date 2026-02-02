from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
from app.services.manager_service import ManagerService
from app.utils.logger import AuditLogger


def manager_guard(*, allowed_actions=None):
    actions = allowed_actions or ["APPROVE_TRANSACTION"]
    return require_certificate({"manager"}, allowed_actions=actions, action_match="any")


manager_bp = Blueprint("manager", __name__, url_prefix="/api/manager")


@manager_bp.route("/dashboard", methods=["GET"])
@manager_guard()
def manager_dashboard():
    payload = ManagerService.dashboard_snapshot()
    return jsonify(payload)


@manager_bp.route("/transactions/pending", methods=["GET"])
@manager_guard()
def pending_transactions():
    queue = ManagerService.pending_transactions()
    return jsonify(queue)


@manager_bp.route("/transactions/<tx_id>/decision", methods=["POST"])
@manager_guard()
def decide_transaction(tx_id):
    user = request.user
    payload = request.get_json(silent=True) or {}
    action = payload.get("action", "approve")
    reason = payload.get("reason")
    result = ManagerService.decide_transaction(
        tx_id,
        approver=user,
        action=action,
        reason=reason,
    )
    AuditLogger.log_action(
        user=user,
        action=f"{action.capitalize()} transaction via manager console",
        transaction_id=tx_id,
    )
    return jsonify(result)


@manager_bp.route("/customers", methods=["GET"])
@manager_guard()
def managed_customers():
    roster = ManagerService.managed_customers()
    return jsonify(roster)


@manager_bp.route("/customers/reset-device", methods=["POST"])
@manager_guard(allowed_actions=["REVOKE_CERT"])
def reset_device_binding():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id") or payload.get("certificate_id")
    if not user_id:
        return jsonify({"message": "user_id or certificate_id required"}), 400
    result = ManagerService.reset_device_binding(user_id)
    AuditLogger.log_action(
        user=request.user,
        action=f"Reset device binding for {user_id}",
    )
    return jsonify(result)


@manager_bp.route("/certificates/revoke", methods=["POST"])
@manager_guard(allowed_actions=["REVOKE_CERT"])
def revoke_certificate():
    payload = request.get_json(silent=True) or {}
    certificate_id = payload.get("certificate_id")
    reason = payload.get("reason", "Violation of policy")
    if not certificate_id:
        return jsonify({"message": "certificate_id is required"}), 400
    metadata = ManagerService.revoke_certificate(
        certificate_id,
        reason,
        requester=request.user,
    )
    AuditLogger.log_action(
        user=request.user,
        action=f"Revoked certificate {certificate_id}",
    )
    return jsonify(metadata)


@manager_bp.route("/reports", methods=["GET"])
@manager_guard()
def manager_reports():
    payload = ManagerService.manager_reports()
    return jsonify(payload)


@manager_bp.route("/branch-audit", methods=["GET"])
@manager_guard(allowed_actions=["APPROVE_TRANSACTION", "REVOKE_CERT"])
def branch_audit():
    feed = ManagerService.branch_audit_view()
    return jsonify(feed)


@manager_bp.route("/escalations", methods=["GET"])
@manager_guard()
def list_escalations():
    entries = ManagerService.list_escalations()
    return jsonify(entries)


@manager_bp.route("/escalations", methods=["POST"])
@manager_guard()
def create_escalation():
    payload = request.get_json(silent=True) or {}
    subject = payload.get("subject")
    description = payload.get("description")
    severity = payload.get("severity", "medium")
    metadata = payload.get("metadata") or {}
    if not subject or not description:
        return jsonify({"message": "subject and description are required"}), 400
    entry = ManagerService.record_escalation(
        raised_by=request.user,
        subject=subject,
        description=description,
        severity=severity,
        metadata=metadata,
    )
    AuditLogger.log_action(user=request.user, action=f"Raised escalation: {subject}")
    return jsonify(entry), 201
