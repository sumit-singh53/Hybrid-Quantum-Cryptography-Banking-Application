"""
KYC (Know Your Customer) Service
Handles KYC verification workflow for managers.
"""

import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config.database import db
from app.models.user_model import User
from app.models.role_model import Role
from app.utils.logger import AuditLogger


class KYCStatus:
    """KYC status constants."""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    INCOMPLETE = "incomplete"


class KYCService:
    """Service for KYC verification operations."""

    _lock = threading.Lock()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def get_pending_kyc_customers(cls) -> List[Dict[str, Any]]:
        """Get all customers with pending KYC verification."""
        # Get customer role
        customer_role = Role.query.filter_by(name="customer").first()
        if not customer_role:
            return []
        
        customers = User.query.filter_by(role_id=customer_role.id).all()
        
        pending = []
        for customer in customers:
            kyc_status = getattr(customer, "kyc_status", KYCStatus.PENDING)
            if kyc_status == KYCStatus.PENDING:
                pending.append({
                    "id": customer.id,
                    "username": customer.username,
                    "email": customer.email,
                    "full_name": customer.full_name,
                    "kyc_status": kyc_status,
                    "kyc_submitted_at": getattr(customer, "kyc_submitted_at", None),
                    "created_at": customer.created_at.isoformat() if customer.created_at else None,
                    "account_status": getattr(customer, "account_status", "active"),
                })
        
        # Sort by submission date (oldest first)
        pending.sort(key=lambda x: x.get("kyc_submitted_at") or x.get("created_at") or "")
        return pending

    @classmethod
    def get_all_kyc_customers(cls, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all customers with their KYC status."""
        # Get customer role
        customer_role = Role.query.filter_by(name="customer").first()
        if not customer_role:
            return []
        
        customers = User.query.filter_by(role_id=customer_role.id).all()
        
        result = []
        for customer in customers:
            kyc_status = getattr(customer, "kyc_status", KYCStatus.PENDING)
            
            # Apply filter if specified
            if status_filter and kyc_status != status_filter:
                continue
            
            result.append({
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "full_name": customer.full_name,
                "kyc_status": kyc_status,
                "kyc_submitted_at": getattr(customer, "kyc_submitted_at", None),
                "kyc_verified_at": getattr(customer, "kyc_verified_at", None),
                "kyc_verified_by": getattr(customer, "kyc_verified_by", None),
                "kyc_remarks": getattr(customer, "kyc_remarks", None),
                "created_at": customer.created_at.isoformat() if customer.created_at else None,
                "account_status": getattr(customer, "account_status", "active"),
            })
        
        return result

    @classmethod
    def get_customer_kyc_details(cls, customer_id: str) -> Dict[str, Any]:
        """Get detailed KYC information for a specific customer."""
        customer = User.query.get(customer_id)
        
        if not customer:
            raise ValueError(f"Customer {customer_id} not found")
        
        # Verify it's a customer
        if customer.role and customer.role.name != "customer":
            raise ValueError(f"User {customer_id} is not a customer")
        
        return {
            "id": customer.id,
            "username": customer.username,
            "email": customer.email,
            "full_name": customer.full_name,
            "kyc_status": getattr(customer, "kyc_status", KYCStatus.PENDING),
            "kyc_submitted_at": getattr(customer, "kyc_submitted_at", None),
            "kyc_verified_at": getattr(customer, "kyc_verified_at", None),
            "kyc_verified_by": getattr(customer, "kyc_verified_by", None),
            "kyc_remarks": getattr(customer, "kyc_remarks", None),
            "created_at": customer.created_at.isoformat() if customer.created_at else None,
            "account_status": getattr(customer, "account_status", "active"),
            "phone": getattr(customer, "phone", None),
            "address": getattr(customer, "address", None),
        }

    @classmethod
    def verify_kyc(
        cls,
        customer_id: str,
        *,
        verified_by: Dict[str, Any],
        remarks: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Verify a customer's KYC."""
        with cls._lock:
            customer = User.query.get(customer_id)
            
            if not customer:
                raise ValueError(f"Customer {customer_id} not found")
            
            # Verify it's a customer
            if customer.role and customer.role.name != "customer":
                raise ValueError(f"User {customer_id} is not a customer")
            
            current_status = getattr(customer, "kyc_status", KYCStatus.PENDING)
            if current_status == KYCStatus.VERIFIED:
                raise ValueError("KYC already verified")
            
            # Update KYC status
            customer.kyc_status = KYCStatus.VERIFIED
            customer.kyc_verified_at = cls._now().isoformat()
            customer.kyc_verified_by = verified_by.get("username")
            customer.kyc_remarks = remarks or "KYC verified by manager"
            
            db.session.commit()
            
            # Log the action
            AuditLogger.log_action(
                user=verified_by,
                action=f"Verified KYC for customer {customer.username}",
                metadata={"customer_id": customer_id, "remarks": remarks},
            )
            
            return {
                "customer_id": customer_id,
                "username": customer.username,
                "kyc_status": KYCStatus.VERIFIED,
                "verified_at": customer.kyc_verified_at,
                "verified_by": customer.kyc_verified_by,
                "message": "KYC verified successfully",
            }

    @classmethod
    def reject_kyc(
        cls,
        customer_id: str,
        *,
        rejected_by: Dict[str, Any],
        reason: str,
    ) -> Dict[str, Any]:
        """Reject a customer's KYC."""
        if not reason:
            raise ValueError("Rejection reason is required")
        
        with cls._lock:
            customer = User.query.get(customer_id)
            
            if not customer:
                raise ValueError(f"Customer {customer_id} not found")
            
            # Verify it's a customer
            if customer.role and customer.role.name != "customer":
                raise ValueError(f"User {customer_id} is not a customer")
            
            # Update KYC status
            customer.kyc_status = KYCStatus.REJECTED
            customer.kyc_verified_at = cls._now().isoformat()
            customer.kyc_verified_by = rejected_by.get("username")
            customer.kyc_remarks = reason
            
            db.session.commit()
            
            # Log the action
            AuditLogger.log_action(
                user=rejected_by,
                action=f"Rejected KYC for customer {customer.username}",
                metadata={"customer_id": customer_id, "reason": reason},
            )
            
            return {
                "customer_id": customer_id,
                "username": customer.username,
                "kyc_status": KYCStatus.REJECTED,
                "rejected_at": customer.kyc_verified_at,
                "rejected_by": customer.kyc_verified_by,
                "reason": reason,
                "message": "KYC rejected",
            }

    @classmethod
    def get_kyc_statistics(cls) -> Dict[str, Any]:
        """Get KYC verification statistics."""
        # Get customer role
        customer_role = Role.query.filter_by(name="customer").first()
        if not customer_role:
            return {
                "total": 0,
                "pending": 0,
                "verified": 0,
                "rejected": 0,
                "incomplete": 0,
            }
        
        customers = User.query.filter_by(role_id=customer_role.id).all()
        
        stats = {
            "total": len(customers),
            "pending": 0,
            "verified": 0,
            "rejected": 0,
            "incomplete": 0,
        }
        
        for customer in customers:
            status = getattr(customer, "kyc_status", KYCStatus.PENDING)
            if status in stats:
                stats[status] += 1
        
        return stats
