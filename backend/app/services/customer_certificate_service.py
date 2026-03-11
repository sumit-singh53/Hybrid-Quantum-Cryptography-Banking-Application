"""
Customer Certificate Service
Handles certificate requests and viewing for customer role only.
"""
from typing import Dict, List, Optional
from datetime import datetime
from app.models.certificate_request_model import CertificateRequest, RequestType, RequestStatus
from app.models.customer_model import Customer
from app.services.certificate_service import CertificateService
from app.config.database import db


class CustomerCertificateService:
    """Service for customer certificate management."""

    @staticmethod
    def create_certificate_request(
        user_id: str,
        full_name: str,
        request_type: str,
        reason: str
    ) -> Dict:
        """
        Create a new certificate request.
        Customer can request NEW or RENEWAL certificates.
        """
        # Validate request type
        if request_type not in ["NEW", "RENEWAL"]:
            raise ValueError("Invalid request type. Must be NEW or RENEWAL")
        
        if not reason or len(reason.strip()) < 10:
            raise ValueError("Reason must be at least 10 characters")
        
        # Check if there's already a pending request
        existing_pending = CertificateRequest.query.filter_by(
            user_id=user_id,
            status=RequestStatus.PENDING
        ).first()
        
        if existing_pending:
            raise ValueError("You already have a pending certificate request")
        
        # Create new request
        cert_request = CertificateRequest(
            user_id=user_id,
            full_name=full_name,
            role="customer",
            request_type=RequestType[request_type],
            reason=reason.strip(),
            status=RequestStatus.PENDING
        )
        
        try:
            db.session.add(cert_request)
            db.session.commit()
            return cert_request.to_dict()
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to create certificate request: {str(e)}")

    @staticmethod
    def get_my_requests(user_id: str, limit: int = 20) -> List[Dict]:
        """
        Get all certificate requests for a user.
        Returns most recent first.
        """
        requests = CertificateRequest.query.filter_by(
            user_id=user_id
        ).order_by(
            CertificateRequest.created_at.desc()
        ).limit(limit).all()
        
        return [req.to_dict() for req in requests]

    @staticmethod
    def get_my_certificate_info(user_id: str) -> Optional[Dict]:
        """
        Get current certificate information for a user.
        Returns certificate metadata (read-only).
        """
        try:
            # Try to load certificate
            cert_payload, cert_path = CertificateService.load_certificate_payload(
                user_id, preferred_role="customer"
            )
            
            # Check if revoked
            is_revoked = CertificateService.is_revoked(user_id)
            
            # Parse dates
            valid_from = cert_payload.get("valid_from", "")
            valid_to = cert_payload.get("valid_to", "")
            
            # Determine status
            if is_revoked:
                status = "REVOKED"
            else:
                try:
                    expiry = datetime.fromisoformat(valid_to.replace("Z", ""))
                    if datetime.utcnow() > expiry:
                        status = "EXPIRED"
                    else:
                        status = "ACTIVE"
                except:
                    status = "UNKNOWN"
            
            return {
                "certificate_id": cert_payload.get("certificate_id"),
                "owner": cert_payload.get("owner"),
                "role": cert_payload.get("role"),
                "issued_at": cert_payload.get("issued_at"),
                "valid_from": valid_from,
                "valid_to": valid_to,
                "status": status,
                "lineage_id": cert_payload.get("lineage_id"),
                "cert_generation": cert_payload.get("cert_generation"),
                "allowed_actions": cert_payload.get("allowed_actions", "").split(",") if cert_payload.get("allowed_actions") else [],
                "crl_url": cert_payload.get("crl_url"),
            }
        except FileNotFoundError:
            return None
        except Exception:
            return None

    @staticmethod
    def can_download_certificate(user_id: str) -> bool:
        """
        Check if user can download their certificate.
        Only active certificates can be downloaded.
        """
        cert_info = CustomerCertificateService.get_my_certificate_info(user_id)
        if not cert_info:
            return False
        return cert_info.get("status") == "ACTIVE"
