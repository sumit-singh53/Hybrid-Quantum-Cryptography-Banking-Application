"""
Account Monitoring Service for Managers
Provides read-only access to customer account information for supervisory purposes.
"""

import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config.database import db
from app.models.customer_model import Customer, CustomerStatus, AccountType
from app.models.user_model import User
from app.utils.logger import AuditLogger


class AccountMonitoringService:
    """Service for manager account monitoring operations."""

    _lock = threading.Lock()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def get_all_customer_accounts(
        cls,
        status_filter: Optional[str] = None,
        account_type_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get all customer accounts with read-only information.
        Managers can view but not modify account data.
        """
        query = Customer.query
        
        # Apply status filter
        if status_filter and status_filter.upper() in [s.value for s in CustomerStatus]:
            query = query.filter_by(status=CustomerStatus[status_filter.upper()])
        
        # Apply account type filter
        if account_type_filter and account_type_filter.upper() in [t.value for t in AccountType]:
            query = query.filter_by(account_type=AccountType[account_type_filter.upper()])
        
        customers = query.order_by(Customer.created_at.desc()).all()
        
        accounts = []
        for customer in customers:
            # Get KYC status from User model if exists
            kyc_status = "pending"
            user = User.query.filter_by(username=customer.name.lower().replace(" ", "_")).first()
            if user:
                kyc_status = getattr(user, "kyc_status", "pending")
            
            # Mask account number for security (show last 4 digits)
            masked_account = f"****{customer.account_number[-4:]}" if len(customer.account_number) >= 4 else "****"
            
            accounts.append({
                "customer_id": customer.id,
                "name": customer.name,
                "account_number": customer.account_number,
                "masked_account_number": masked_account,
                "account_type": customer.account_type.value if customer.account_type else "SAVINGS",
                "account_status": customer.status.value if customer.status else "ACTIVE",
                "balance": float(customer.balance) if customer.balance else 0.0,
                "branch_code": customer.branch_code or "MUM-HQ",
                "kyc_status": kyc_status,
                "created_at": customer.created_at.isoformat() if customer.created_at else None,
                "updated_at": customer.updated_at.isoformat() if customer.updated_at else None,
            })
        
        return accounts

    @classmethod
    def get_customer_account_details(cls, customer_id: str) -> Dict[str, Any]:
        """
        Get detailed account information for a specific customer (read-only).
        """
        customer = Customer.query.get(customer_id)
        
        if not customer:
            raise ValueError(f"Customer account {customer_id} not found")
        
        # Get KYC status and user details
        kyc_status = "pending"
        kyc_verified_at = None
        kyc_verified_by = None
        email = None
        mobile = None
        
        user = User.query.filter_by(username=customer.name.lower().replace(" ", "_")).first()
        if user:
            kyc_status = getattr(user, "kyc_status", "pending")
            kyc_verified_at = getattr(user, "kyc_verified_at", None)
            kyc_verified_by = getattr(user, "kyc_verified_by", None)
            email = user.email
            mobile = user.mobile
        
        # Mask account number
        masked_account = f"****{customer.account_number[-4:]}" if len(customer.account_number) >= 4 else "****"
        
        return {
            "customer_id": customer.id,
            "name": customer.name,
            "account_number": customer.account_number,
            "masked_account_number": masked_account,
            "account_type": customer.account_type.value if customer.account_type else "SAVINGS",
            "account_status": customer.status.value if customer.status else "ACTIVE",
            "balance": float(customer.balance) if customer.balance else 0.0,
            "branch_code": customer.branch_code or "MUM-HQ",
            "kyc_status": kyc_status,
            "kyc_verified_at": kyc_verified_at,
            "kyc_verified_by": kyc_verified_by,
            "email": email,
            "mobile": mobile,
            "created_at": customer.created_at.isoformat() if customer.created_at else None,
            "updated_at": customer.updated_at.isoformat() if customer.updated_at else None,
        }

    @classmethod
    def update_account_status(
        cls,
        customer_id: str,
        new_status: str,
        *,
        updated_by: Dict[str, Any],
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update customer account status (LIMITED or ACTIVE only).
        Managers can mark accounts as LIMITED or restore to ACTIVE.
        FROZEN status requires admin intervention.
        """
        # Validate new status
        allowed_statuses = ["ACTIVE", "LIMITED"]
        if new_status.upper() not in allowed_statuses:
            raise ValueError(f"Managers can only set status to: {', '.join(allowed_statuses)}")
        
        with cls._lock:
            customer = Customer.query.get(customer_id)
            
            if not customer:
                raise ValueError(f"Customer account {customer_id} not found")
            
            old_status = customer.status.value if customer.status else "ACTIVE"
            
            # Prevent changing from FROZEN (requires admin)
            if old_status == "FROZEN":
                raise ValueError("Cannot modify FROZEN accounts. Contact system administrator.")
            
            # Update status
            customer.status = CustomerStatus[new_status.upper()]
            customer.updated_at = cls._now()
            
            try:
                db.session.commit()
                
                # Log the action
                AuditLogger.log_action(
                    user=updated_by,
                    action=f"Updated account status: {old_status} → {new_status}",
                    metadata={
                        "customer_id": customer_id,
                        "customer_name": customer.name,
                        "old_status": old_status,
                        "new_status": new_status,
                        "reason": reason or "No reason provided",
                    },
                )
                
                return {
                    "customer_id": customer_id,
                    "name": customer.name,
                    "old_status": old_status,
                    "new_status": new_status,
                    "updated_at": customer.updated_at.isoformat(),
                    "updated_by": updated_by.get("username"),
                    "message": f"Account status updated to {new_status}",
                }
            except Exception as e:
                db.session.rollback()
                raise ValueError(f"Failed to update account status: {str(e)}")

    @classmethod
    def forward_for_review(
        cls,
        customer_id: str,
        *,
        forwarded_by: Dict[str, Any],
        reason: str,
        priority: str = "normal",
    ) -> Dict[str, Any]:
        """
        Forward customer account for further review.
        Creates an escalation for admin/compliance team.
        """
        if not reason:
            raise ValueError("Reason is required when forwarding for review")
        
        customer = Customer.query.get(customer_id)
        
        if not customer:
            raise ValueError(f"Customer account {customer_id} not found")
        
        # Log the escalation
        AuditLogger.log_action(
            user=forwarded_by,
            action=f"Forwarded account for review: {customer.name}",
            metadata={
                "customer_id": customer_id,
                "customer_name": customer.name,
                "account_number": customer.account_number,
                "reason": reason,
                "priority": priority,
                "current_status": customer.status.value if customer.status else "ACTIVE",
            },
        )
        
        return {
            "customer_id": customer_id,
            "name": customer.name,
            "forwarded_by": forwarded_by.get("username"),
            "reason": reason,
            "priority": priority,
            "timestamp": cls._now().isoformat(),
            "message": "Account forwarded for review",
        }

    @classmethod
    def get_account_statistics(cls) -> Dict[str, Any]:
        """Get account statistics for dashboard."""
        total = Customer.query.count()
        active = Customer.query.filter_by(status=CustomerStatus.ACTIVE).count()
        limited = Customer.query.filter_by(status=CustomerStatus.LIMITED).count()
        frozen = Customer.query.filter_by(status=CustomerStatus.FROZEN).count()
        
        # Calculate total balance across all accounts
        total_balance = db.session.query(db.func.sum(Customer.balance)).scalar() or 0
        
        return {
            "total_accounts": total,
            "active": active,
            "limited": limited,
            "frozen": frozen,
            "total_balance": float(total_balance),
        }
