from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
from app.services.manager_service import ManagerService
from app.services.kyc_service import KYCService
from app.services.account_monitoring_service import AccountMonitoringService
from app.utils.logger import AuditLogger


def manager_guard(*, allowed_actions=None):
    # Manager role check is sufficient, actions are optional
    if allowed_actions:
        return require_certificate({"manager"}, allowed_actions=allowed_actions, action_match="any")
    else:
        return require_certificate({"manager"})


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


# ========================================================================
# KYC VERIFICATION ENDPOINTS
# ========================================================================

@manager_bp.route("/kyc/pending", methods=["GET"])
@manager_guard()
def get_pending_kyc():
    """Get all customers with pending KYC verification."""
    customers = KYCService.get_pending_kyc_customers()
    return jsonify(customers)


@manager_bp.route("/kyc/all", methods=["GET"])
@manager_guard()
def get_all_kyc():
    """Get all customers with their KYC status."""
    status_filter = request.args.get("status")
    customers = KYCService.get_all_kyc_customers(status_filter=status_filter)
    return jsonify(customers)


@manager_bp.route("/kyc/<customer_id>", methods=["GET"])
@manager_guard()
def get_kyc_details(customer_id):
    """Get detailed KYC information for a specific customer."""
    try:
        details = KYCService.get_customer_kyc_details(customer_id)
        return jsonify(details)
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@manager_bp.route("/kyc/<customer_id>/verify", methods=["POST"])
@manager_guard()
def verify_kyc(customer_id):
    """Verify a customer's KYC."""
    payload = request.get_json(silent=True) or {}
    remarks = payload.get("remarks")
    
    try:
        result = KYCService.verify_kyc(
            customer_id,
            verified_by=request.user,
            remarks=remarks,
        )
        return jsonify(result)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400


@manager_bp.route("/kyc/<customer_id>/reject", methods=["POST"])
@manager_guard()
def reject_kyc(customer_id):
    """Reject a customer's KYC."""
    payload = request.get_json(silent=True) or {}
    reason = payload.get("reason")
    
    if not reason:
        return jsonify({"message": "Rejection reason is required"}), 400
    
    try:
        result = KYCService.reject_kyc(
            customer_id,
            rejected_by=request.user,
            reason=reason,
        )
        return jsonify(result)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400


@manager_bp.route("/kyc/statistics", methods=["GET"])
@manager_guard()
def get_kyc_statistics():
    """Get KYC verification statistics."""
    stats = KYCService.get_kyc_statistics()
    return jsonify(stats)


# ========================================================================
# ACCOUNT MONITORING ENDPOINTS (READ-ONLY + LIMITED ACTIONS)
# ========================================================================

@manager_bp.route("/accounts", methods=["GET"])
@manager_guard()
def get_customer_accounts():
    """Get all customer accounts (read-only view)."""
    status_filter = request.args.get("status")
    account_type_filter = request.args.get("account_type")
    
    accounts = AccountMonitoringService.get_all_customer_accounts(
        status_filter=status_filter,
        account_type_filter=account_type_filter,
    )
    return jsonify(accounts)


@manager_bp.route("/accounts/<customer_id>", methods=["GET"])
@manager_guard()
def get_account_details(customer_id):
    """Get detailed account information for a specific customer (read-only)."""
    try:
        details = AccountMonitoringService.get_customer_account_details(customer_id)
        return jsonify(details)
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@manager_bp.route("/accounts/<customer_id>/status", methods=["PUT"])
@manager_guard()
def update_account_status(customer_id):
    """Update customer account status (LIMITED or ACTIVE only)."""
    payload = request.get_json(silent=True) or {}
    new_status = payload.get("status")
    reason = payload.get("reason")
    
    if not new_status:
        return jsonify({"message": "Status is required"}), 400
    
    try:
        result = AccountMonitoringService.update_account_status(
            customer_id,
            new_status,
            updated_by=request.user,
            reason=reason,
        )
        return jsonify(result)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400


@manager_bp.route("/accounts/<customer_id>/forward", methods=["POST"])
@manager_guard()
def forward_account_for_review(customer_id):
    """Forward customer account for further review."""
    payload = request.get_json(silent=True) or {}
    reason = payload.get("reason")
    priority = payload.get("priority", "normal")
    
    if not reason:
        return jsonify({"message": "Reason is required"}), 400
    
    try:
        result = AccountMonitoringService.forward_for_review(
            customer_id,
            forwarded_by=request.user,
            reason=reason,
            priority=priority,
        )
        return jsonify(result)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400


@manager_bp.route("/accounts/statistics", methods=["GET"])
@manager_guard()
def get_account_statistics():
    """Get account statistics."""
    stats = AccountMonitoringService.get_account_statistics()
    return jsonify(stats)


# ========================================================================
# APPROVAL HISTORY ENDPOINTS (READ-ONLY)
# ========================================================================

@manager_bp.route("/approvals/history", methods=["GET"])
@manager_guard()
def get_approval_history():
    """Get approval/rejection history (read-only)."""
    decision_filter = request.args.get("decision")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    min_amount = request.args.get("min_amount", type=float)
    max_amount = request.args.get("max_amount", type=float)
    limit = request.args.get("limit", default=100, type=int)
    
    history = ManagerService.get_approval_history(
        decision_filter=decision_filter,
        date_from=date_from,
        date_to=date_to,
        min_amount=min_amount,
        max_amount=max_amount,
        limit=limit,
    )
    
    AuditLogger.log_action(
        user=request.user,
        action="Viewed approval history",
    )
    
    return jsonify(history)


@manager_bp.route("/approvals/history/<transaction_id>", methods=["GET"])
@manager_guard()
def get_approval_detail(transaction_id):
    """Get detailed approval record (read-only)."""
    try:
        detail = ManagerService.get_approval_detail(transaction_id)
        
        AuditLogger.log_action(
            user=request.user,
            action=f"Viewed approval detail for transaction {transaction_id}",
            transaction_id=transaction_id,
        )
        
        return jsonify(detail)
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@manager_bp.route("/approvals/statistics", methods=["GET"])
@manager_guard()
def get_approval_statistics():
    """Get approval history statistics."""
    stats = ManagerService.get_approval_statistics()
    return jsonify(stats)


# ========================================================================
# TRANSACTION RISK ASSESSMENT ENDPOINTS (READ-ONLY)
# ========================================================================

@manager_bp.route("/risk-assessment", methods=["GET"])
@manager_guard()
def get_risk_assessment():
    """Get high-risk and flagged transactions (read-only)."""
    risk_level_filter = request.args.get("risk_level")
    min_amount = request.args.get("min_amount", type=float)
    max_amount = request.args.get("max_amount", type=float)
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    limit = request.args.get("limit", default=100, type=int)
    
    risk_data = ManagerService.get_risk_assessment(
        risk_level_filter=risk_level_filter,
        min_amount=min_amount,
        max_amount=max_amount,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    
    AuditLogger.log_action(
        user=request.user,
        action="Viewed risk assessment data",
    )
    
    return jsonify(risk_data)


@manager_bp.route("/risk-assessment/<transaction_id>", methods=["GET"])
@manager_guard()
def get_risk_detail(transaction_id):
    """Get detailed risk assessment for a transaction (read-only)."""
    try:
        detail = ManagerService.get_risk_detail(transaction_id)
        
        AuditLogger.log_action(
            user=request.user,
            action=f"Viewed risk detail for transaction {transaction_id}",
            transaction_id=transaction_id,
        )
        
        return jsonify(detail)
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@manager_bp.route("/risk-assessment/summary", methods=["GET"])
@manager_guard()
def get_risk_summary():
    """Get risk assessment summary statistics."""
    summary = ManagerService.get_risk_summary()
    return jsonify(summary)


# ========================================================================
# MANAGER AUDIT LOGS ENDPOINTS (READ-ONLY)
# ========================================================================

@manager_bp.route("/audit-logs", methods=["GET"])
@manager_guard()
def get_manager_audit_logs():
    """Get audit logs limited to managerial scope (read-only)."""
    action_type_filter = request.args.get("action_type")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    limit = request.args.get("limit", default=100, type=int)
    
    logs = ManagerService.get_manager_audit_logs(
        action_type_filter=action_type_filter,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    
    AuditLogger.log_action(
        user=request.user,
        action="Viewed manager audit logs",
    )
    
    return jsonify(logs)


@manager_bp.route("/audit-logs/statistics", methods=["GET"])
@manager_guard()
def get_audit_log_statistics():
    """Get audit log statistics for manager scope."""
    stats = ManagerService.get_audit_log_statistics()
    return jsonify(stats)


# ========================================================================
# BRANCH AUDIT ENDPOINTS (READ-ONLY)
# ========================================================================

@manager_bp.route("/branch-audit/overview", methods=["GET"])
@manager_guard()
def get_branch_audit_overview():
    """Get branch-level audit overview (read-only)."""
    overview = ManagerService.get_branch_audit_overview()
    
    AuditLogger.log_action(
        user=request.user,
        action="Viewed branch audit overview",
    )
    
    return jsonify(overview)


@manager_bp.route("/branch-audit/<branch_code>", methods=["GET"])
@manager_guard()
def get_branch_activity_report(branch_code):
    """Get detailed activity report for a specific branch (read-only)."""
    try:
        report = ManagerService.get_branch_activity_report(branch_code)
        
        AuditLogger.log_action(
            user=request.user,
            action=f"Viewed branch activity report for {branch_code}",
        )
        
        return jsonify(report)
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


# ========================================================================
# SECURITY ALERTS ENDPOINTS (READ-ONLY FOR MANAGER)
# ========================================================================

@manager_bp.route("/security-alerts", methods=["GET"])
@manager_guard()
def get_security_alerts():
    """Get security alerts (read-only)."""
    severity_filter = request.args.get("severity")
    alert_type_filter = request.args.get("alert_type")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    limit = request.args.get("limit", default=100, type=int)
    
    alerts = ManagerService.get_security_alerts(
        severity_filter=severity_filter,
        alert_type_filter=alert_type_filter,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    
    AuditLogger.log_action(
        user=request.user,
        action="Viewed security alerts",
    )
    
    return jsonify(alerts)


@manager_bp.route("/security-alerts/<alert_id>", methods=["GET"])
@manager_guard()
def get_security_alert_detail(alert_id):
    """Get detailed security alert information (read-only)."""
    try:
        detail = ManagerService.get_security_alert_detail(alert_id)
        
        AuditLogger.log_action(
            user=request.user,
            action=f"Viewed security alert detail for {alert_id}",
        )
        
        return jsonify(detail)
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@manager_bp.route("/security-alerts/statistics", methods=["GET"])
@manager_guard()
def get_security_alert_statistics():
    """Get security alert statistics."""
    stats = ManagerService.get_security_alert_statistics()
    return jsonify(stats)


# ========================================================================
# ENCRYPTION STATUS ENDPOINTS (READ-ONLY FOR MANAGER)
# ========================================================================

@manager_bp.route("/encryption/status", methods=["GET"])
@manager_guard()
def get_encryption_status():
    """Get high-level encryption status overview (read-only)."""
    status = ManagerService.get_encryption_status()
    
    AuditLogger.log_action(
        user=request.user,
        action="Viewed encryption status",
    )
    
    return jsonify(status)


# ========================================================================
# CERTIFICATE OVERVIEW ENDPOINTS (READ-ONLY FOR MANAGER)
# ========================================================================

@manager_bp.route("/certificates/overview", methods=["GET"])
@manager_guard()
def get_certificate_overview():
    """Get certificate overview (read-only)."""
    status_filter = request.args.get("status")
    role_filter = request.args.get("role")
    limit = request.args.get("limit", default=100, type=int)
    
    certificates = ManagerService.get_certificate_overview(
        status_filter=status_filter,
        role_filter=role_filter,
        limit=limit,
    )
    
    AuditLogger.log_action(
        user=request.user,
        action="Viewed certificate overview",
    )
    
    return jsonify(certificates)


@manager_bp.route("/certificates/overview/<certificate_id>", methods=["GET"])
@manager_guard()
def get_certificate_detail(certificate_id):
    """Get detailed certificate information (read-only metadata only)."""
    try:
        detail = ManagerService.get_certificate_detail(certificate_id)
        
        AuditLogger.log_action(
            user=request.user,
            action=f"Viewed certificate detail for {certificate_id}",
        )
        
        return jsonify(detail)
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@manager_bp.route("/certificates/requests/summary", methods=["GET"])
@manager_guard()
def get_certificate_request_summary():
    """Get certificate request status summary."""
    summary = ManagerService.get_certificate_request_summary()
    return jsonify(summary)


@manager_bp.route("/certificates/statistics", methods=["GET"])
@manager_guard()
def get_certificate_statistics():
    """Get certificate statistics."""
    stats = ManagerService.get_certificate_statistics()
    return jsonify(stats)
