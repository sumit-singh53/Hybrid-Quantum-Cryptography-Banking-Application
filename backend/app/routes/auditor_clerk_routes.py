from flask import Blueprint, jsonify, make_response, request

from app.security.access_control import require_certificate
from app.services.auditor_clerk_service import AuditorClerkService
from app.services.transaction_audit_service import TransactionAuditService

AUDITOR_ROLES = {"auditor_clerk"}
AUDITOR_ACTIONS = ["VIEW_AUDIT", "VERIFY_LOGS"]


def auditor_guard(*, allowed_actions=None, action_match="all"):
    actions = allowed_actions or AUDITOR_ACTIONS
    return require_certificate(
        AUDITOR_ROLES,
        allowed_actions=actions,
        action_match=action_match,
    )


auditor_clerk_bp = Blueprint("auditor_clerk", __name__, url_prefix="/api/auditor-clerk")


@auditor_clerk_bp.route("/dashboard", methods=["GET"])
@auditor_guard()
def auditor_dashboard():
    payload = AuditorClerkService.build_dashboard_snapshot()
    return jsonify(payload)


@auditor_clerk_bp.route("/transactions/summary", methods=["GET"])
@auditor_guard()
def auditor_transaction_summary():
    return jsonify(
        {
            "daily_summary": AuditorClerkService.daily_transaction_summary(),
            "flagged_transactions": AuditorClerkService.flagged_transactions(),
        }
    )


@auditor_clerk_bp.route("/transactions/<tx_id>/integrity", methods=["GET"])
@auditor_guard()
def verify_transaction_integrity(tx_id):
    result = AuditorClerkService.verify_transaction_integrity(tx_id)
    status_code = 200 if result.get("verified") else 404
    return jsonify(result), status_code


@auditor_clerk_bp.route("/audit-trail", methods=["GET"])
@auditor_guard()
def immutable_audit_trail():
    trail = AuditorClerkService.latest_audit_trail()
    return jsonify(trail)


@auditor_clerk_bp.route("/logs", methods=["GET"])
@auditor_guard()
def combined_logs():
    return jsonify(
        {
            "audit_logs": AuditorClerkService.audit_logs(),
            "request_trail": AuditorClerkService.latest_audit_trail(),
        }
    )


@auditor_clerk_bp.route("/certificates", methods=["GET"])
@auditor_guard()
def certificate_health():
    inventory = AuditorClerkService.certificate_inventory()
    alerts = AuditorClerkService.certificate_misuse_alerts()
    return jsonify({"inventory": inventory, "alerts": alerts})


@auditor_clerk_bp.route("/reports/export", methods=["GET"])
@auditor_guard()
def export_reports():
    export_format = (request.args.get("format") or "json").lower()
    if export_format == "json":
        rows = AuditorClerkService.audit_report_rows()
        return jsonify({"events": rows})

    content, mimetype, filename = AuditorClerkService.export_report(export_format)
    response = make_response(content)
    response.headers["Content-Type"] = mimetype
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


@auditor_clerk_bp.route("/profile", methods=["GET"])
@auditor_guard()
def auditor_profile():
    user = getattr(request, "user", {}) or {}
    certificate = getattr(request, "certificate", {}) or {}
    payload = AuditorClerkService.profile_payload(user, certificate)
    return jsonify(payload)


@auditor_clerk_bp.route("/user-activity", methods=["GET"])
@auditor_guard()
def user_activity_logs():
    filters = {
        "role": request.args.get("role", "all"),
        "event_type": request.args.get("eventType", "all"),
        "date_range": request.args.get("dateRange", "7d"),
    }
    payload = AuditorClerkService.user_activity_logs(filters)
    return jsonify(payload)


@auditor_clerk_bp.route("/security-logs", methods=["GET"])
@auditor_guard()
def security_encryption_logs():
    filters = {
        "category": request.args.get("category", "all"),
        "status": request.args.get("status", "all"),
        "date_range": request.args.get("dateRange", "7d"),
    }
    payload = AuditorClerkService.security_encryption_logs(filters)
    return jsonify(payload)


@auditor_clerk_bp.route("/verify-integrity", methods=["GET"])
@auditor_guard()
def verify_data_integrity():
    target_type = request.args.get("type", "transaction")
    target_id = request.args.get("id", "")
    if not target_id:
        return jsonify({"error": "Target ID is required"}), 400
    result = AuditorClerkService.verify_data_integrity(target_type, target_id)
    return jsonify(result)


@auditor_clerk_bp.route("/data-integrity", methods=["GET"])
@auditor_guard()
def data_integrity_verification():
    """Get comprehensive data integrity verification summary."""
    filters = {
        "record_type": request.args.get("recordType", "all"),
        "verification_result": request.args.get("verificationResult", "all"),
        "date_range": request.args.get("dateRange", "7d"),
    }
    payload = AuditorClerkService.get_integrity_verification_summary(filters)
    return jsonify(payload)


@auditor_clerk_bp.route("/compliance-reports", methods=["GET"])
@auditor_guard()
def compliance_reports():
    payload = AuditorClerkService.compliance_reports()
    return jsonify(payload)


@auditor_clerk_bp.route("/compliance-reports/export", methods=["GET"])
@auditor_guard()
def export_compliance_report():
    report_type = request.args.get("type", "transaction_compliance")
    export_format = (request.args.get("format") or "pdf").lower()
    
    if export_format == "json":
        data = AuditorClerkService.compliance_report_data(report_type)
        return jsonify(data)
    
    content, mimetype, filename = AuditorClerkService.export_compliance_report(
        report_type, export_format
    )
    response = make_response(content)
    response.headers["Content-Type"] = mimetype
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


@auditor_clerk_bp.route("/suspicious-activity", methods=["GET"])
@auditor_guard()
def suspicious_activity_reports():
    filters = {
        "severity": request.args.get("severity", "all"),
        "status": request.args.get("status", "all"),
        "date_range": request.args.get("dateRange", "30d"),
    }
    payload = AuditorClerkService.suspicious_activity_reports(filters)
    return jsonify(payload)


@auditor_clerk_bp.route("/suspicious-activity/export", methods=["GET"])
@auditor_guard()
def export_suspicious_activity():
    export_format = (request.args.get("format") or "pdf").lower()
    filters = {
        "severity": request.args.get("severity", "all"),
        "status": request.args.get("status", "all"),
        "date_range": request.args.get("dateRange", "30d"),
    }
    
    if export_format == "json":
        data = AuditorClerkService.suspicious_activity_reports(filters)
        return jsonify(data)
    
    content, mimetype, filename = AuditorClerkService.export_suspicious_activity(
        export_format, filters
    )
    response = make_response(content)
    response.headers["Content-Type"] = mimetype
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


# ========================================================================
# TRANSACTION AUDIT ENDPOINTS (ENHANCED)
# ========================================================================

@auditor_clerk_bp.route("/transactions/audit", methods=["GET"])
@auditor_guard()
def get_transactions_audit():
    """Get all transactions with advanced filtering and pagination."""
    # Parse query parameters
    status_filter = request.args.get("status")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    amount_min = request.args.get("amount_min", type=float)
    amount_max = request.args.get("amount_max", type=float)
    search_query = request.args.get("search")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    
    result = TransactionAuditService.get_all_transactions(
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        amount_min=amount_min,
        amount_max=amount_max,
        search_query=search_query,
        page=page,
        per_page=per_page,
    )
    return jsonify(result)


@auditor_clerk_bp.route("/transactions/audit/<transaction_id>", methods=["GET"])
@auditor_guard()
def get_transaction_audit_details(transaction_id):
    """Get detailed transaction information (read-only)."""
    try:
        details = TransactionAuditService.get_transaction_details(
            transaction_id,
            auditor=request.user,
        )
        return jsonify(details)
    except ValueError as e:
        return jsonify({"message": str(e)}), 404


@auditor_clerk_bp.route("/transactions/statistics", methods=["GET"])
@auditor_guard()
def get_transaction_statistics():
    """Get transaction statistics."""
    stats = TransactionAuditService.get_transaction_statistics()
    return jsonify(stats)


# ========================================================================
# EXPORT REPORTS ENDPOINTS
# ========================================================================

@auditor_clerk_bp.route("/export-reports/history", methods=["GET"])
@auditor_guard()
def get_export_history():
    """Get export history."""
    history = AuditorClerkService.get_export_history()
    return jsonify({"history": history})


@auditor_clerk_bp.route("/export-reports/generate", methods=["POST"])
@auditor_guard()
def generate_export_report():
    """Generate and download export report."""
    data = request.get_json() or {}
    report_type = data.get("report_type", "transaction_audit")
    export_format = data.get("export_format", "pdf").lower()
    filters = {
        "date_range": data.get("date_range", "7d"),
        "status": data.get("status", "all"),
        "role": data.get("role", "all"),
        "category": data.get("category", "all"),
        "record_type": data.get("record_type", "all"),
        "verification_result": data.get("verification_result", "all"),
    }
    
    try:
        content, mimetype, filename = AuditorClerkService.generate_export_report(
            report_type, export_format, filters
        )
        response = make_response(content)
        response.headers["Content-Type"] = mimetype
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500
