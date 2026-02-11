from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, send_file
import io

from app.security.access_control import require_certificate
from app.services.certificate_service import CertificateService
from app.services.customer_portal_service import CustomerPortalService
from app.services.statement_service import StatementService
from app.services.customer_security_service import CustomerSecurityService
from app.services.customer_profile_service import CustomerProfileService
from app.services.customer_certificate_service import CustomerCertificateService

customer_bp = Blueprint("customer", __name__, url_prefix="/api/customer")


@customer_bp.route("/overview", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_overview():
    session = getattr(request, "session", {}) or {}
    certificate = getattr(request, "certificate", {}) or {}
    binding = session.get("binding")
    user = request.user or {}
    payload = CustomerPortalService.build_overview(
        user_id=user.get("id"), certificate=certificate, session_binding=binding
    )
    return jsonify(payload)


@customer_bp.route("/accounts", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_accounts():
    user = request.user or {}
    payload = CustomerPortalService.accounts_payload(user.get("id"))
    return jsonify(payload)


@customer_bp.route("/transactions", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_transactions():
    user = request.user or {}
    return jsonify(CustomerPortalService.recent_transactions(user.get("id"), limit=20))


@customer_bp.route("/audit-trail", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_audit_trail():
    certificate = getattr(request, "certificate", {}) or {}
    certificate_id = certificate.get("certificate_id")
    entries = CustomerPortalService.audit_trail(certificate_id)
    return jsonify(entries)


@customer_bp.route("/certificate", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_certificate():
    certificate = getattr(request, "certificate", {}) or {}
    certificate_id = certificate.get("certificate_id")
    role = certificate.get("role")
    if not certificate_id:
        return jsonify({"message": "Certificate identifier missing"}), 400
    try:
        plaintext, resolved_role, _ = CertificateService.fetch_certificate_text(
            certificate_id, role
        )
    except FileNotFoundError:
        return jsonify({"message": "Certificate not found"}), 404
    return (
        jsonify(
            {
                "certificate_id": certificate_id,
                "role": resolved_role,
                "certificate_pem": plaintext,
            }
        ),
        200,
    )


@customer_bp.route("/account-summary", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def customer_account_summary():
    """
    Secure Account Summary endpoint - Customer role only.
    Returns masked account details, balance, and recent activity.
    Enforces strict RBAC: only customers can access their own data.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    # Strict role check - only customer role allowed
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        summary = CustomerPortalService.account_summary(user_id)
        
        # Check if account was found
        if "error" in summary:
            return jsonify(summary), 404
        
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({
            "message": "Failed to retrieve account summary",
            "error": str(e)
        }), 500


@customer_bp.route("/statement/download", methods=["POST"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def download_statement():
    """
    Download Account Statement endpoint - Customer role only.
    Generates PDF or CSV statement for specified date range.
    Enforces strict RBAC: only customers can download their own statements.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    # Strict role check - only customer role allowed
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    # Parse request data
    data = request.get_json() or {}
    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")
    export_format = data.get("format", "pdf").lower()
    
    # Validate inputs
    if not start_date_str or not end_date_str:
        return jsonify({"message": "Start date and end date are required"}), 400
    
    if export_format not in ["pdf", "csv"]:
        return jsonify({"message": "Invalid format. Use 'pdf' or 'csv'"}), 400
    
    try:
        # Parse dates
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
        
        # Set end date to end of day
        end_date = end_date.replace(hour=23, minute=59, second=59)
        
        # Validate date range
        if start_date > end_date:
            return jsonify({"message": "Start date must be before end date"}), 400
        
        # Limit to 1 year maximum
        max_range = timedelta(days=365)
        if (end_date - start_date) > max_range:
            return jsonify({"message": "Date range cannot exceed 1 year"}), 400
        
        # Generate statement data
        statement_data = StatementService.generate_statement_data(
            user_id, start_date, end_date
        )
        
        # Export in requested format
        if export_format == "csv":
            file_bytes, mime_type, filename = StatementService.export_csv(statement_data)
        else:
            file_bytes, mime_type, filename = StatementService.export_pdf(statement_data)
        
        # Send file
        return send_file(
            io.BytesIO(file_bytes),
            mimetype=mime_type,
            as_attachment=True,
            download_name=filename
        )
        
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({
            "message": "Failed to generate statement",
            "error": str(e)
        }), 500


@customer_bp.route("/statement/preview", methods=["POST"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def preview_statement():
    """
    Preview Statement Data endpoint - Customer role only.
    Returns statement data as JSON for preview before download.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    # Strict role check
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    # Parse request data
    data = request.get_json() or {}
    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")
    
    # Validate inputs
    if not start_date_str or not end_date_str:
        return jsonify({"message": "Start date and end date are required"}), 400
    
    try:
        # Parse dates
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
        
        # Set end date to end of day
        end_date = end_date.replace(hour=23, minute=59, second=59)
        
        # Validate date range
        if start_date > end_date:
            return jsonify({"message": "Start date must be before end date"}), 400
        
        # Limit to 1 year maximum
        max_range = timedelta(days=365)
        if (end_date - start_date) > max_range:
            return jsonify({"message": "Date range cannot exceed 1 year"}), 400
        
        # Generate statement data
        statement_data = StatementService.generate_statement_data(
            user_id, start_date, end_date
        )
        
        return jsonify(statement_data), 200
        
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({
            "message": "Failed to generate statement preview",
            "error": str(e)
        }), 500



# ============================================================================
# SECURITY CENTER ENDPOINTS - Customer Role Only
# ============================================================================

@customer_bp.route("/security/dashboard", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def security_dashboard():
    """
    Security Center Dashboard - Customer role only.
    Returns comprehensive security information including:
    - Last login details
    - Active sessions
    - Security status indicators
    - Security alerts history
    
    Enforces strict RBAC: only customers can access their own security data.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    certificate = getattr(request, "certificate", {}) or {}
    
    print(f"DEBUG: user_id={user_id}, user_role={user_role}")
    print(f"DEBUG: certificate keys={list(certificate.keys())}")
    print(f"DEBUG: certificate_id={certificate.get('certificate_id')}")
    print(f"DEBUG: ml_kem_public_key exists={bool(certificate.get('ml_kem_public_key'))}")
    print(f"DEBUG: rsa_public_key exists={bool(certificate.get('rsa_public_key'))}")
    print(f"DEBUG: device_id exists={bool(certificate.get('device_id'))}")
    
    # Strict role check - only customer role allowed
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. Security Center is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        dashboard_data = CustomerSecurityService.get_security_dashboard(user_id, certificate)
        print(f"DEBUG: dashboard_data keys={list(dashboard_data.keys())}")
        print(f"DEBUG: security_status={dashboard_data.get('security_status')}")
        return jsonify(dashboard_data), 200
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "message": "Failed to retrieve security dashboard",
            "error": str(e)
        }), 500


@customer_bp.route("/security/last-login", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def security_last_login():
    """
    Get last login details - Customer role only.
    Returns date, time, location, and device information.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        last_login = CustomerSecurityService.get_last_login_details(user_id)
        return jsonify(last_login), 200
    except Exception as e:
        return jsonify({
            "message": "Failed to retrieve last login details",
            "error": str(e)
        }), 500


@customer_bp.route("/security/sessions", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def security_sessions():
    """
    Get active sessions - Customer role only.
    Returns list of currently active sessions with device and location info.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    certificate = getattr(request, "certificate", {}) or {}
    certificate_id = certificate.get("certificate_id", "")
    
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        sessions = CustomerSecurityService.get_active_sessions(user_id, certificate_id)
        return jsonify({"sessions": sessions}), 200
    except Exception as e:
        return jsonify({
            "message": "Failed to retrieve active sessions",
            "error": str(e)
        }), 500


@customer_bp.route("/security/status", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def security_status():
    """
    Get security status indicators - Customer role only.
    Returns password strength, encryption status, certificate health, etc.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    certificate = getattr(request, "certificate", {}) or {}
    
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        status = CustomerSecurityService.get_security_status(user_id, certificate)
        return jsonify(status), 200
    except Exception as e:
        return jsonify({
            "message": "Failed to retrieve security status",
            "error": str(e)
        }), 500


@customer_bp.route("/security/alerts", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def security_alerts():
    """
    Get security alerts history - Customer role only (read-only).
    Returns failed login attempts, suspicious access notifications, etc.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    certificate = getattr(request, "certificate", {}) or {}
    certificate_id = certificate.get("certificate_id", "")
    
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    # Get limit from query params (default 20, max 100)
    limit = min(int(request.args.get("limit", 20)), 100)
    
    try:
        alerts = CustomerSecurityService.get_security_alerts(user_id, certificate_id, limit)
        return jsonify({"alerts": alerts, "total": len(alerts)}), 200
    except Exception as e:
        return jsonify({
            "message": "Failed to retrieve security alerts",
            "error": str(e)
        }), 500


@customer_bp.route("/security/logout-session", methods=["POST"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def security_logout_session():
    """
    Logout from a specific session - Customer role only (safe action).
    Allows customer to logout from other devices.
    Cannot logout from current session.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    # Get session_id from request
    data = request.get_json() or {}
    session_id = data.get("session_id")
    
    if not session_id:
        return jsonify({"message": "Session ID is required"}), 400
    
    try:
        result = CustomerSecurityService.logout_session(user_id, session_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "message": "Failed to logout session",
            "error": str(e)
        }), 500



# ============================================================================
# PROFILE SETTINGS ENDPOINTS - Customer Role Only
# ============================================================================

@customer_bp.route("/profile", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def get_profile():
    """
    Get Customer Profile - Customer role only.
    Returns user profile information including personal details and account info.
    Enforces strict RBAC: only customers can access their own profile.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    # Strict role check - only customer role allowed
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. Profile access is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        profile_data = CustomerProfileService.get_profile(user_id)
        return jsonify(profile_data), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404
    except Exception as e:
        return jsonify({
            "message": "Failed to retrieve profile",
            "error": str(e)
        }), 500


@customer_bp.route("/profile", methods=["PUT"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def update_profile():
    """
    Update Customer Profile - Customer role only.
    Allows updating email, mobile, and address only.
    Other fields are read-only for security.
    Enforces strict RBAC: only customers can update their own profile.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    # Strict role check - only customer role allowed
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. Profile update is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400

    # Parse request body
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    mobile = data.get("mobile")
    address = data.get("address")

    # Validate incoming fields
    try:
        errors = CustomerProfileService.validate_profile_data(email=email, mobile=mobile)
    except Exception as e:
        return jsonify({"message": "Invalid input", "error": str(e)}), 400

    if errors:
        return jsonify({"message": "Validation failed", "errors": errors}), 400

    try:
        updated_profile = CustomerProfileService.update_profile(
            user_id=str(user_id),
            email=email,
            mobile=mobile,
            address=address,
        )
        return jsonify({"message": "Profile updated successfully", "profile": updated_profile}), 200
    except ValueError as ve:
        # Known validation/service errors
        return jsonify({"message": str(ve)}), 400
    except Exception as e:
        current_app.logger.error("Profile update failed: %s", e)
        return jsonify({"message": "Failed to update profile", "error": str(e)}), 500
 



# ============================================================================
# CERTIFICATE REQUEST ENDPOINTS - Customer Role Only
# ============================================================================

@customer_bp.route("/certificate-requests", methods=["POST"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def create_certificate_request():
    """
    Create Certificate Request - Customer role only.
    Allows customer to request new or renewal certificates.
    Requires admin approval.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    user_name = user.get("name", "Customer")
    
    # Strict role check
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. Certificate requests are for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    # Parse request data
    data = request.get_json() or {}
    request_type = data.get("request_type", "").upper()
    reason = data.get("reason", "")
    
    # Validate inputs
    if not request_type or request_type not in ["NEW", "RENEWAL"]:
        return jsonify({"message": "Invalid request type. Must be NEW or RENEWAL"}), 400
    
    if not reason or len(reason.strip()) < 10:
        return jsonify({"message": "Reason must be at least 10 characters"}), 400
    
    try:
        cert_request = CustomerCertificateService.create_certificate_request(
            user_id=str(user_id),
            full_name=user_name,
            request_type=request_type,
            reason=reason
        )
        return jsonify({
            "message": "Certificate request submitted successfully",
            "request": cert_request
        }), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({
            "message": "Failed to create certificate request",
            "error": str(e)
        }), 500


@customer_bp.route("/certificate-requests", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def get_my_certificate_requests():
    """
    Get My Certificate Requests - Customer role only.
    Returns all certificate requests for the logged-in customer.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    # Strict role check
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        requests = CustomerCertificateService.get_my_requests(str(user_id))
        return jsonify({"requests": requests}), 200
    except Exception as e:
        return jsonify({
            "message": "Failed to retrieve certificate requests",
            "error": str(e)
        }), 500


@customer_bp.route("/my-certificate", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def get_my_certificate_info():
    """
    Get My Certificate Info - Customer role only.
    Returns current certificate metadata (read-only).
    Does NOT expose private keys.
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    # Strict role check
    if user_role != "customer":
        return jsonify({
            "message": "Access denied. This endpoint is for customers only."
        }), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        cert_info = CustomerCertificateService.get_my_certificate_info(str(user_id))
        
        if not cert_info:
            return jsonify({
                "message": "No certificate found",
                "has_certificate": False
            }), 404
        
        return jsonify({
            "has_certificate": True,
            "certificate": cert_info
        }), 200
    except Exception as e:
        return jsonify({
            "message": "Failed to retrieve certificate information",
            "error": str(e)
        }), 500
