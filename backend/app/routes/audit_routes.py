from flask import Blueprint, jsonify, request
from app.security.access_control import require_certificate
from app.security.accountability_store import AccountabilityStore
from app.security.request_audit_store import RequestAuditStore
from app.services.certificate_service import CertificateService
from app.models.audit_log_model import AuditLog

audit_bp = Blueprint("audit", __name__, url_prefix="/api/audit")

# =========================================
# AUDITOR_CLERK: View audit logs
# =========================================


@audit_bp.route("/logs", methods=["GET"])
@require_certificate(
    {"auditor_clerk", "system_admin"},
    allowed_actions=["VIEW_AUDIT", "GLOBAL_AUDIT"],
    action_match="any",
)
def get_audit_logs():
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).all()
    return jsonify([log.to_dict() for log in logs])


@audit_bp.route("/accountability-report", methods=["POST"])
@require_certificate(
    {"auditor_clerk", "system_admin"},
    allowed_actions=["VIEW_AUDIT", "GLOBAL_AUDIT"],
    action_match="any",
)
def accountability_report():
    payload = request.get_json(silent=True) or {}
    certificate_id = (payload.get("certificate_id") or "").strip()
    user_id = (payload.get("user_id") or "").strip()

    if not certificate_id and not user_id:
        return jsonify({"message": "certificate_id or user_id required"}), 400

    events = AccountabilityStore.query_events(
        certificate_id=certificate_id or None,
        user_id=user_id or None,
    )

    if not events:
        return jsonify({"message": "No accountability events recorded"}), 404

    events.sort(key=lambda event: event["timestamp"])
    reference_certificate_id = certificate_id or events[-1]["certificate_id"]

    certificate_payload = None
    cert_path = None
    try:
        certificate_payload, cert_path = CertificateService.load_certificate_payload(
            reference_certificate_id
        )
    except FileNotFoundError:
        pass

    audit_query_user = user_id or (certificate_payload or {}).get("user_id")
    audit_logs = (
        AuditLog.query.filter_by(user_id=audit_query_user)
        .order_by(AuditLog.timestamp.desc())
        .all()
        if audit_query_user
        else []
    )

    lineage_id = (certificate_payload or {}).get("lineage_id") or events[-1].get(
        "lineage_id"
    )
    request_trace = RequestAuditStore.query_by_lineage(lineage_id)

    report = {
        "certificate": {
            "certificate_id": reference_certificate_id,
            "user_id": (certificate_payload or {}).get("user_id"),
            "owner": (certificate_payload or {}).get("owner"),
            "role": (certificate_payload or {}).get("role"),
            "lineage_id": (certificate_payload or {}).get("lineage_id"),
            "defense_version": (certificate_payload or {}).get("defense_version"),
            "security_layers": (certificate_payload or {}).get("security_layers"),
            "issued_at": (certificate_payload or {}).get("issued_at"),
            "valid_to": (certificate_payload or {}).get("valid_to"),
            "allowed_actions": (certificate_payload or {}).get("allowed_actions"),
            "storage_path": cert_path,
        },
        "original_timestamp": events[0]["timestamp"],
        "origin_location": events[0].get("location", {}),
        "signed_intents": events,
        "audit_chain": [log.to_dict() for log in audit_logs],
        "request_trace": request_trace,
    }

    return jsonify({"cryptographic_accountability": report})
