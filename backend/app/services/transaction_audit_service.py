"""
Transaction Audit Service for Auditor Clerks
Provides comprehensive read-only access to transaction records with advanced filtering.
"""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, or_
from app.config.database import db
from app.models.transaction_model import Transaction, TransactionStatus
from app.utils.logger import AuditLogger


class TransactionAuditService:
    """Service for auditor clerk transaction audit operations."""

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _mask_account(account_number: str) -> str:
        """Mask account number for security (show last 4 digits)."""
        if not account_number or len(account_number) < 4:
            return "****"
        return f"****{account_number[-4:]}"

    @classmethod
    def get_all_transactions(
        cls,
        *,
        status_filter: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        amount_min: Optional[float] = None,
        amount_max: Optional[float] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> Dict[str, Any]:
        """
        Get all transactions with advanced filtering and pagination.
        Read-only access for auditor clerks.
        """
        query = Transaction.query

        # Apply status filter
        if status_filter and status_filter.upper() in [s.value for s in TransactionStatus]:
            query = query.filter_by(status=TransactionStatus[status_filter.upper()])

        # Apply date range filter
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
                query = query.filter(Transaction.created_at >= date_from_obj)
            except (ValueError, AttributeError):
                pass

        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
                # Add one day to include the entire end date
                date_to_obj = date_to_obj + timedelta(days=1)
                query = query.filter(Transaction.created_at < date_to_obj)
            except (ValueError, AttributeError):
                pass

        # Apply amount range filter
        if amount_min is not None:
            query = query.filter(Transaction.amount >= amount_min)

        if amount_max is not None:
            query = query.filter(Transaction.amount <= amount_max)

        # Apply search query (transaction ID or account numbers)
        if search_query:
            search_term = f"%{search_query}%"
            query = query.filter(
                or_(
                    Transaction.id.like(search_term),
                    Transaction.from_account.like(search_term),
                    Transaction.to_account.like(search_term),
                )
            )

        # Get total count before pagination
        total_count = query.count()

        # Apply pagination
        query = query.order_by(Transaction.created_at.desc())
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format transactions with masked accounts
        transactions = []
        for tx in paginated.items:
            transactions.append({
                "id": tx.id,
                "from_account": tx.from_account,
                "masked_from_account": cls._mask_account(tx.from_account),
                "to_account": tx.to_account,
                "masked_to_account": cls._mask_account(tx.to_account),
                "amount": float(tx.amount) if tx.amount else 0.0,
                "purpose": tx.purpose,
                "status": tx.status.value if tx.status else "UNKNOWN",
                "created_by": tx.created_by,
                "approved_by": tx.approved_by,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
                "approved_at": tx.approved_at.isoformat() if tx.approved_at else None,
                "updated_at": tx.updated_at.isoformat() if tx.updated_at else None,
            })

        return {
            "transactions": transactions,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total_count,
                "pages": paginated.pages,
                "has_next": paginated.has_next,
                "has_prev": paginated.has_prev,
            },
        }

    @classmethod
    def get_transaction_details(cls, transaction_id: str, *, auditor: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get detailed transaction information (read-only).
        Logs auditor access for compliance.
        """
        transaction = Transaction.query.get(transaction_id)

        if not transaction:
            raise ValueError(f"Transaction {transaction_id} not found")

        # Log auditor access
        AuditLogger.log_action(
            user=auditor,
            action=f"Viewed transaction details: {transaction_id}",
            metadata={"transaction_id": transaction_id},
        )

        return {
            "id": transaction.id,
            "from_account": transaction.from_account,
            "masked_from_account": cls._mask_account(transaction.from_account),
            "to_account": transaction.to_account,
            "masked_to_account": cls._mask_account(transaction.to_account),
            "amount": float(transaction.amount) if transaction.amount else 0.0,
            "purpose": transaction.purpose,
            "status": transaction.status.value if transaction.status else "UNKNOWN",
            "created_by": transaction.created_by,
            "approved_by": transaction.approved_by,
            "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
            "approved_at": transaction.approved_at.isoformat() if transaction.approved_at else None,
            "updated_at": transaction.updated_at.isoformat() if transaction.updated_at else None,
        }

    @classmethod
    def get_transaction_statistics(cls) -> Dict[str, Any]:
        """Get transaction statistics for dashboard."""
        total = Transaction.query.count()
        pending = Transaction.query.filter_by(status=TransactionStatus.PENDING).count()
        approved = Transaction.query.filter_by(status=TransactionStatus.APPROVED).count()
        rejected = Transaction.query.filter_by(status=TransactionStatus.REJECTED).count()
        completed = Transaction.query.filter_by(status=TransactionStatus.COMPLETED).count()

        # Calculate total transaction volume
        total_volume = db.session.query(db.func.sum(Transaction.amount)).scalar() or 0

        # Get today's transactions
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = Transaction.query.filter(Transaction.created_at >= today_start).count()

        # Get this week's transactions
        week_start = today_start - timedelta(days=today_start.weekday())
        week_count = Transaction.query.filter(Transaction.created_at >= week_start).count()

        return {
            "total_transactions": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "completed": completed,
            "total_volume": float(total_volume),
            "today_count": today_count,
            "week_count": week_count,
        }
