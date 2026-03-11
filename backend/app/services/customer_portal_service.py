import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models.customer_model import Customer, CustomerStatus
from app.models.transaction_model import Transaction, TransactionStatus
from app.security.accountability_store import AccountabilityStore
from app.security.request_audit_store import RequestAuditStore
from app.services.certificate_service import CertificateService


class CustomerPortalService:
    """Aggregates customer-facing insights for dashboards and accounts."""

    BASELINE_BALANCE = 250_000.0
    EXPIRY_SOON_DAYS = 7

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _parse_iso8601(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            if value.endswith("Z"):
                value = value[:-1] + "+00:00"
            return datetime.fromisoformat(value)
        except ValueError:
            return None

    @staticmethod
    def _format_timestamp(value: Optional[datetime]) -> Optional[str]:
        if not value:
            return None
        return (
            value.astimezone(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z")
        )

    @classmethod
    def _synthetic_accounts(cls, user_id: str, customer: Optional[Customer] = None) -> List[Dict[str, Any]]:
        if customer is None:
            customer = Customer.query.get(user_id)
        
        # If no customer record, return fallback with synthetic data
        if not customer:
            digest = hashlib.sha1(user_id.encode("utf-8")).hexdigest().upper()
            return [
                {
                    "account_number": f"91-001-{digest[:8]}",
                    "type": "Savings",
                    "currency": "INR",
                    "status": "ACTIVE",
                    "balance": 0.0,
                },
                {
                    "account_number": f"91-002-{digest[8:16]}",
                    "type": "Current",
                    "currency": "INR",
                    "status": "ACTIVE",
                    "balance": 0.0,
                },
            ]

        # Get account type if available
        account_type = "Primary"
        if hasattr(customer, 'account_type') and customer.account_type:
            account_type = customer.account_type.value if hasattr(customer.account_type, 'value') else str(customer.account_type)

        # Return actual customer account with balance
        return [
            {
                "account_number": customer.account_number,
                "type": account_type,
                "currency": "INR",
                "status": (
                    customer.status.value
                    if isinstance(customer.status, CustomerStatus)
                    else str(customer.status)
                ),
                "balance": float(customer.balance or 0.0),
                "created_at": customer.created_at.isoformat() if customer.created_at else None,
            }
        ]

    @staticmethod
    def _user_transactions(
        user_id: str, limit: Optional[int] = None
    ) -> List[Transaction]:
        query = Transaction.query.filter_by(created_by=user_id).order_by(
            Transaction.created_at.desc()
        )
        if limit:
            query = query.limit(limit)
        return query.all()

    @classmethod
    def compute_account_balance(cls, user_id: str, customer: Optional[Customer] = None) -> float:
        if customer is None:
            customer = Customer.query.get(user_id)
        if customer:
            return round(float(customer.balance or 0.0), 2)
        transactions = cls._user_transactions(user_id)
        spent = sum(
            tx.amount for tx in transactions if tx.status != TransactionStatus.REJECTED
        )
        balance = cls.BASELINE_BALANCE - spent
        return round(max(balance, 0.0), 2)

    @classmethod
    def summarize_certificate(
        cls, certificate: Dict[str, str]
    ) -> Dict[str, Optional[str]]:
        certificate_id = certificate.get("certificate_id")
        role = certificate.get("role")
        revoked = False
        try:
            revoked = CertificateService.is_revoked(certificate_id)
        except Exception:  # pylint: disable=broad-except
            revoked = False
        valid_to = cls._parse_iso8601(certificate.get("valid_to"))
        now = cls._now_utc()
        if revoked:
            status_label = "Revoked"
        elif valid_to and valid_to <= now:
            status_label = "Expired"
        elif valid_to and (valid_to - now).days <= cls.EXPIRY_SOON_DAYS:
            status_label = "Expiring Soon"
        else:
            status_label = "Valid"

        download_url = None
        if certificate_id and role:
            download_url = (
                f"/api/auth/download-certificate/{certificate_id}?role={role}"
            )

        return {
            "certificate_id": certificate_id,
            "status": status_label,
            "valid_to": cls._format_timestamp(valid_to),
            "lineage_id": certificate.get("lineage_id"),
            "crl_url": certificate.get("crl_url"),
            "allowed_actions": certificate.get("allowed_actions"),
            "download_url": download_url,
        }

    @staticmethod
    def recent_transactions(user_id: str, limit: int = 5, customer: Optional[Customer] = None) -> List[Dict[str, Any]]:
        records = CustomerPortalService._user_transactions(user_id, limit=limit)
        if customer is None:
            customer = Customer.query.get(user_id)
        customer_account = customer.account_number if customer else None
        
        return [
            {
                "id": tx.id,
                "from_account": tx.from_account,
                "to_account": tx.to_account,
                "amount": float(tx.amount),
                "purpose": tx.purpose if hasattr(tx, 'purpose') else "",
                "status": tx.status.value if tx.status else None,
                "created_at": tx.created_at.isoformat(),
                "direction": "SENT" if tx.from_account == customer_account else "RECEIVED",
            }
            for tx in records
        ]

    @staticmethod
    def last_login_snapshot(user_id: str) -> Dict[str, Optional[str]]:
        events = AccountabilityStore.query_events(user_id=user_id)
        login_events = [e for e in events if e.get("intent") == "certificate_login"]
        if not login_events:
            return {}
        login_events.sort(key=lambda event: event.get("timestamp"))
        latest = login_events[-1]
        metadata = latest.get("metadata", {}) or {}
        return {
            "timestamp": latest.get("timestamp"),
            "device_id": metadata.get("device_id"),
            "device_label": metadata.get("device_label") or metadata.get("device_name"),
            "ip": latest.get("location", {}).get("ip"),
            "city": latest.get("location", {}).get("city"),
            "country": latest.get("location", {}).get("country"),
        }

    @staticmethod
    def audit_trail(certificate_id: str, limit: int = 50) -> List[Dict[str, str]]:
        entries = RequestAuditStore.query_by_certificate(certificate_id)
        entries.sort(key=lambda entry: entry.get("timestamp"))
        return entries[-limit:]

    @classmethod
    def build_overview(
        cls,
        *,
        user_id: str,
        certificate: Dict[str, str],
        session_binding: Optional[Dict[str, str]],
    ) -> Dict[str, Any]:
        # Fetch customer once to avoid multiple DB queries
        customer = Customer.query.get(user_id)
        
        # Pass customer to methods to avoid redundant queries
        balance = cls.compute_account_balance(user_id, customer=customer)
        certificate_summary = cls.summarize_certificate(certificate)
        recent_transactions = cls.recent_transactions(user_id, customer=customer)
        accounts = cls._synthetic_accounts(user_id, customer=customer)
        last_login = cls.last_login_snapshot(user_id)
        latest_audit = cls.audit_trail(certificate.get("certificate_id"), limit=1)
        session_device = (session_binding or {}).get("device_id")
        expected_device = certificate.get("device_id")
        requires_reverify = bool(
            expected_device and session_device and session_device != expected_device
        )

        return {
            "account_balance": balance,
            "currency": "INR",
            "accounts": accounts,
            "recent_transactions": recent_transactions,
            "certificate": certificate_summary,
            "last_login": last_login,
            "latest_request": latest_audit[0] if latest_audit else None,
            "device_state": {
                "session_device_id": session_device,
                "enrolled_device_id": expected_device,
                "requires_reverify": requires_reverify,
            },
        }

    @classmethod
    def accounts_payload(cls, user_id: str) -> Dict[str, Any]:
        accounts = cls._synthetic_accounts(user_id)
        balance = cls.compute_account_balance(user_id)
        return {
            "accounts": accounts,
            "aggregate_balance": balance,
            "currency": "INR",
        }

    @classmethod
    def account_summary(cls, user_id: str) -> Dict[str, Any]:
        """
        Secure Account Summary for Customer role only.
        Returns masked account details, balance, and recent activity.
        """
        customer = Customer.query.get(user_id)
        
        if not customer:
            # Return minimal fallback for users without customer record
            return {
                "error": "Account not found",
                "message": "No customer account associated with this user"
            }
        
        # Mask account number (show last 4 digits only)
        masked_account = cls._mask_account_number(customer.account_number)
        
        # Get recent transactions (last 5)
        recent_txns = cls._user_transactions(user_id, limit=5)
        transactions_summary = [
            {
                "id": tx.id,
                "from_account": cls._mask_account_number(tx.from_account),
                "to_account": cls._mask_account_number(tx.to_account),
                "amount": float(tx.amount),
                "purpose": tx.purpose if hasattr(tx, 'purpose') else "",
                "status": tx.status.value if tx.status else "UNKNOWN",
                "created_at": cls._format_timestamp(tx.created_at),
                "direction": "SENT" if tx.from_account == customer.account_number else "RECEIVED"
            }
            for tx in recent_txns
        ]
        
        # Calculate balance
        balance = float(customer.balance or 0.0)
        
        # Get account type and status
        account_type = customer.account_type.value if hasattr(customer, 'account_type') and customer.account_type else "SAVINGS"
        account_status = customer.status.value if customer.status else "ACTIVE"
        branch_code = getattr(customer, 'branch_code', 'MUM-HQ') or 'MUM-HQ'
        
        return {
            "account_details": {
                "account_number_masked": masked_account,
                "account_number_full": customer.account_number,  # For internal use only
                "account_type": account_type,
                "account_status": account_status,
                "branch_code": branch_code,
                "opening_date": cls._format_timestamp(customer.created_at),
            },
            "balance_info": {
                "available_balance": balance,
                "currency": "INR",
                "last_updated": cls._format_timestamp(customer.updated_at),
            },
            "recent_activity": transactions_summary,
            "metadata": {
                "total_transactions": len(recent_txns),
                "account_holder": customer.name,
            }
        }
    
    @staticmethod
    def _mask_account_number(account_number: str) -> str:
        """Mask account number showing only last 4 digits."""
        if not account_number or len(account_number) < 4:
            return "****"
        return f"****{account_number[-4:]}"
