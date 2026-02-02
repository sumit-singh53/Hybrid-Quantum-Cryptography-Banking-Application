from flask import Blueprint, jsonify, make_response, request

from app.security.access_control import require_certificate
from app.services.auditor_clerk_service import AuditorClerkService

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
