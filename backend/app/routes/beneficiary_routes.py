"""
Beneficiary Routes
API endpoints for customer beneficiary management.
"""
from flask import Blueprint, jsonify, request

from app.security.access_control import require_certificate
from app.services.beneficiary_service import BeneficiaryService


beneficiary_bp = Blueprint("beneficiary", __name__, url_prefix="/api/beneficiary")


@beneficiary_bp.route("/list", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def list_beneficiaries():
    """
    List all beneficiaries for the authenticated customer.
    GET /api/beneficiary/list
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    # Strict role check
    if user_role != "customer":
        return jsonify({"message": "Access denied. Customers only."}), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        include_inactive = request.args.get("include_inactive", "false").lower() == "true"
        beneficiaries = BeneficiaryService.list_beneficiaries(user_id, include_inactive)
        statistics = BeneficiaryService.get_statistics(user_id)
        
        return jsonify({
            "beneficiaries": beneficiaries,
            "statistics": statistics,
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to fetch beneficiaries", "error": str(e)}), 500


@beneficiary_bp.route("/<beneficiary_id>", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def get_beneficiary(beneficiary_id):
    """
    Get a single beneficiary by ID.
    GET /api/beneficiary/<id>
    Query params:
    - unmask: true to get full account number (for transactions)
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    if user_role != "customer":
        return jsonify({"message": "Access denied. Customers only."}), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        unmask = request.args.get("unmask", "false").lower() == "true"
        beneficiary = BeneficiaryService.get_beneficiary(beneficiary_id, user_id, unmask=unmask)
        
        if not beneficiary:
            return jsonify({"message": "Beneficiary not found"}), 404
        
        return jsonify(beneficiary), 200
    except Exception as e:
        return jsonify({"message": "Failed to fetch beneficiary", "error": str(e)}), 500


@beneficiary_bp.route("/add", methods=["POST"])
@require_certificate("customer", allowed_actions=["CREATE_TRANSACTION"])
def add_beneficiary():
    """
    Add a new beneficiary.
    POST /api/beneficiary/add
    
    Body:
    {
        "beneficiary_name": "John Doe",
        "account_number": "1234567890",
        "bank_name": "PQ Bank",
        "branch_code": "MUM-HQ",
        "ifsc_code": "PQBK0001234",
        "nickname": "John",
        "description": "Friend"
    }
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    if user_role != "customer":
        return jsonify({"message": "Access denied. Customers only."}), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    data = request.get_json() or {}
    
    # Validate required fields
    beneficiary_name = data.get("beneficiary_name", "").strip()
    account_number = data.get("account_number", "").strip()
    
    if not beneficiary_name:
        return jsonify({"message": "Beneficiary name is required"}), 400
    
    if not account_number:
        return jsonify({"message": "Account number is required"}), 400
    
    try:
        beneficiary = BeneficiaryService.add_beneficiary(
            customer_id=user_id,
            beneficiary_name=beneficiary_name,
            account_number=account_number,
            bank_name=data.get("bank_name"),
            branch_code=data.get("branch_code"),
            ifsc_code=data.get("ifsc_code"),
            nickname=data.get("nickname"),
            description=data.get("description"),
        )
        
        return jsonify({
            "message": "Beneficiary added successfully",
            "beneficiary": beneficiary,
        }), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": "Failed to add beneficiary", "error": str(e)}), 500


@beneficiary_bp.route("/<beneficiary_id>", methods=["PUT"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def update_beneficiary(beneficiary_id):
    """
    Update beneficiary details (nickname and description only).
    PUT /api/beneficiary/<id>
    
    Body:
    {
        "nickname": "Johnny",
        "description": "Best friend"
    }
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    if user_role != "customer":
        return jsonify({"message": "Access denied. Customers only."}), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    data = request.get_json() or {}
    
    try:
        beneficiary = BeneficiaryService.update_beneficiary(
            beneficiary_id=beneficiary_id,
            customer_id=user_id,
            nickname=data.get("nickname"),
            description=data.get("description"),
        )
        
        return jsonify({
            "message": "Beneficiary updated successfully",
            "beneficiary": beneficiary,
        }), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404
    except Exception as e:
        return jsonify({"message": "Failed to update beneficiary", "error": str(e)}), 500


@beneficiary_bp.route("/<beneficiary_id>", methods=["DELETE"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def delete_beneficiary(beneficiary_id):
    """
    Delete a beneficiary.
    DELETE /api/beneficiary/<id>
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    if user_role != "customer":
        return jsonify({"message": "Access denied. Customers only."}), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        deleted = BeneficiaryService.delete_beneficiary(beneficiary_id, user_id)
        
        if not deleted:
            return jsonify({"message": "Beneficiary not found"}), 404
        
        return jsonify({"message": "Beneficiary deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Failed to delete beneficiary", "error": str(e)}), 500


@beneficiary_bp.route("/<beneficiary_id>/toggle-status", methods=["PATCH"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def toggle_beneficiary_status(beneficiary_id):
    """
    Toggle beneficiary status (activate/deactivate).
    PATCH /api/beneficiary/<id>/toggle-status
    
    Body:
    {
        "status": "ACTIVE" | "INACTIVE"
    }
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    if user_role != "customer":
        return jsonify({"message": "Access denied. Customers only."}), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    data = request.get_json() or {}
    new_status = data.get("status", "").strip().upper()
    
    if not new_status:
        return jsonify({"message": "Status is required"}), 400
    
    try:
        beneficiary = BeneficiaryService.toggle_status(beneficiary_id, user_id, new_status)
        
        return jsonify({
            "message": "Beneficiary status updated successfully",
            "beneficiary": beneficiary,
        }), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": "Failed to update status", "error": str(e)}), 500


@beneficiary_bp.route("/statistics", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def get_statistics():
    """
    Get beneficiary statistics.
    GET /api/beneficiary/statistics
    """
    user = request.user or {}
    user_id = user.get("id")
    user_role = (user.get("role") or "").lower()
    
    if user_role != "customer":
        return jsonify({"message": "Access denied. Customers only."}), 403
    
    if not user_id:
        return jsonify({"message": "User identification missing"}), 400
    
    try:
        statistics = BeneficiaryService.get_statistics(user_id)
        return jsonify(statistics), 200
    except Exception as e:
        return jsonify({"message": "Failed to fetch statistics", "error": str(e)}), 500
