from flask import Blueprint, jsonify
from datetime import datetime

certificate_bp = Blueprint("certificate", __name__)


@certificate_bp.route("/details", methods=["GET"])
def certificate_details():
    """
    Returns certificate metadata
    """
    return (
        jsonify(
            {
                "owner_name": "Test User",
                "certificate_id": "CERT-123456",
                "issued_by": "PQ Root CA",
                "algorithm": "Hybrid (RSA + Dilithium)",
                "valid_from": "2025-01-01",
                "valid_to": "2030-01-01",
            }
        ),
        200,
    )


@certificate_bp.route("/status", methods=["GET"])
def certificate_status():
    """
    Returns certificate status
    """
    return (
        jsonify(
            {
                "state": "ACTIVE",
                "last_checked": datetime.utcnow().isoformat(),
                "reason": None,
            }
        ),
        200,
    )
