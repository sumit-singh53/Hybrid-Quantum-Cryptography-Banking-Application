"""
Certificate Request Management Routes
Admin-only endpoints for managing customer certificate requests
"""
from datetime import datetime
from pathlib import Path
import shutil
from flask import Blueprint, jsonify, request

from app.config.database import db
from app.models.certificate_request_model import CertificateRequest, RequestStatus
from app.models.user_model import User
from app.security.access_control import require_certificate
from app.services.certificate_service import CertificateService
from app.services.customer_certificate_service import CustomerCertificateService
from app.security.device_binding_store import DeviceBindingStore
from app.utils.logger import AuditLogger


certificate_request_bp = Blueprint(
    "certificate_requests", __name__, url_prefix="/api/admin/certificate-requests"
)


@certificate_request_bp.route("", methods=["GET"])
@require_certificate({"system_admin"}, allowed_actions=["GLOBAL_AUDIT"])
def get_certificate_requests():
    """Get all certificate requests with optional filtering"""
    status = request.args.get("status", "").strip().upper()
    request_type = request.args.get("request_type", "").strip().upper()
    limit = int(request.args.get("limit", 50))
    page = int(request.args.get("page", 1))
    offset = (page - 1) * limit if page > 1 else 0

    query = CertificateRequest.query

    # Apply filters
    if status and status in [s.value for s in RequestStatus]:
        query = query.filter_by(status=RequestStatus[status])
    
    if request_type:
        from app.models.certificate_request_model import RequestType
        if request_type in [t.value for t in RequestType]:
            query = query.filter_by(request_type=RequestType[request_type])

    # Get total count
    total = query.count()

    # Apply pagination and ordering
    requests_list = (
        query.order_by(CertificateRequest.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return jsonify({
        "requests": [req.to_dict() for req in requests_list],
        "total": total,
        "page": page,
        "limit": limit,
    }), 200


@certificate_request_bp.route("/<int:request_id>", methods=["GET"])
@require_certificate({"system_admin"}, allowed_actions=["GLOBAL_AUDIT"])
def get_certificate_request(request_id):
    """Get a specific certificate request by ID"""
    cert_request = CertificateRequest.query.get(request_id)
    
    if not cert_request:
        return jsonify({"message": "Certificate request not found"}), 404
    
    # Get user details
    user = User.query.filter_by(username=cert_request.user_id).first()
    
    response = cert_request.to_dict()
    if user:
        response["user_details"] = {
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role,
        }
    
    return jsonify(response), 200


@certificate_request_bp.route("/<int:request_id>/approve", methods=["POST"])
@require_certificate({"system_admin"}, allowed_actions=["GLOBAL_AUDIT"])
def approve_certificate_request(request_id):
    """Approve a certificate request (does NOT issue certificate yet)"""
    cert_request = CertificateRequest.query.get(request_id)
    
    if not cert_request:
        return jsonify({"message": "Certificate request not found"}), 404
    
    if cert_request.status != RequestStatus.PENDING:
        return jsonify({
            "message": f"Cannot approve request with status: {cert_request.status.value}"
        }), 400
    
    payload = request.get_json(silent=True) or {}
    admin_notes = payload.get("admin_notes", "").strip()
    
    # Get admin info
    admin_user = request.user
    admin_username = admin_user.get("name", "system_admin")
    
    try:
        # Update request status to APPROVED
        # Certificate will be issued when user re-enrolls with new keys
        cert_request.status = RequestStatus.APPROVED
        cert_request.reviewed_by = admin_username
        cert_request.reviewed_at = datetime.utcnow()
        cert_request.admin_notes = admin_notes or "Certificate request approved. Please re-enroll to generate your new certificate."
        
        db.session.commit()
        
        # Log the action
        AuditLogger.log_action(
            user=admin_user,
            action=f"Approved certificate request #{request_id} for user {cert_request.user_id}",
        )
        
        return jsonify({
            "message": "Certificate request approved. User can now re-enroll to generate certificate.",
            "request": cert_request.to_dict(),
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": f"Failed to approve request: {str(e)}"
        }), 500


@certificate_request_bp.route("/<int:request_id>/reject", methods=["POST"])
@require_certificate({"system_admin"}, allowed_actions=["GLOBAL_AUDIT"])
def reject_certificate_request(request_id):
    """Reject a certificate request"""
    cert_request = CertificateRequest.query.get(request_id)
    
    if not cert_request:
        return jsonify({"message": "Certificate request not found"}), 404
    
    if cert_request.status != RequestStatus.PENDING:
        return jsonify({
            "message": f"Cannot reject request with status: {cert_request.status.value}"
        }), 400
    
    payload = request.get_json(silent=True) or {}
    rejection_reason = payload.get("rejection_reason", "").strip()
    
    if not rejection_reason:
        return jsonify({"message": "rejection_reason is required"}), 400
    
    # Get admin info
    admin_user = request.user
    admin_username = admin_user.get("name", "system_admin")
    
    # Update request status
    cert_request.status = RequestStatus.REJECTED
    cert_request.reviewed_by = admin_username
    cert_request.reviewed_at = datetime.utcnow()
    cert_request.admin_notes = rejection_reason
    
    db.session.commit()
    
    # Log the action
    AuditLogger.log_action(
        user=admin_user,
        action=f"Rejected certificate request #{request_id} for user {cert_request.user_id}",
    )
    
    return jsonify({
        "message": "Certificate request rejected",
        "request": cert_request.to_dict(),
    }), 200


@certificate_request_bp.route("/statistics", methods=["GET"])
@require_certificate({"system_admin"}, allowed_actions=["GLOBAL_AUDIT"])
def get_certificate_request_statistics():
    """Get statistics about certificate requests"""
    total = CertificateRequest.query.count()
    pending = CertificateRequest.query.filter_by(status=RequestStatus.PENDING).count()
    approved = CertificateRequest.query.filter_by(status=RequestStatus.APPROVED).count()
    rejected = CertificateRequest.query.filter_by(status=RequestStatus.REJECTED).count()
    
    return jsonify({
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
    }), 200


@certificate_request_bp.route("/issued-certificates", methods=["GET"])
@require_certificate({"system_admin"}, allowed_actions=["GLOBAL_AUDIT"])
def get_issued_certificates():
    """Get list of all issued certificates"""
    limit = int(request.args.get("limit", 50))
    page = int(request.args.get("page", 1))
    offset = (page - 1) * limit if page > 1 else 0
    
    # Get certificates from filesystem
    from app.services.system_admin_service import SystemAdminService
    certificates = SystemAdminService.list_issued_certificates()
    
    # Apply pagination
    total = len(certificates)
    paginated_certs = certificates[offset:offset + limit]
    
    return jsonify({
        "certificates": paginated_certs,
        "total": total,
        "page": page,
        "limit": limit,
    }), 200


@certificate_request_bp.route("/revoke-certificate", methods=["POST"])
@require_certificate({"system_admin"}, allowed_actions=["GLOBAL_AUDIT"])
def revoke_certificate():
    """Revoke a certificate"""
    payload = request.get_json(silent=True) or {}
    certificate_id = payload.get("certificate_id", "").strip()
    reason = payload.get("reason", "").strip()
    
    if not certificate_id:
        return jsonify({"message": "certificate_id is required"}), 400
    
    if not reason:
        return jsonify({"message": "reason is required"}), 400
    
    admin_user = request.user
    
    try:
        # Revoke certificate
        metadata = CertificateService.revoke_certificate(
            certificate_id,
            reason=reason,
            requested_by=admin_user,
        )
        
        # Log the action
        AuditLogger.log_action(
            user=admin_user,
            action=f"Revoked certificate {certificate_id}: {reason}",
        )
        
        return jsonify({
            "message": "Certificate revoked successfully",
            "metadata": metadata,
        }), 200
        
    except Exception as e:
        return jsonify({
            "message": f"Failed to revoke certificate: {str(e)}"
        }), 500
