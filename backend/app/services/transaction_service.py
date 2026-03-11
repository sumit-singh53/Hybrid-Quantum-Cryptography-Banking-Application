from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Dict, Tuple, Optional

from sqlalchemy import or_

from app.config.database import db
from app.models.customer_model import Customer, CustomerStatus
from app.models.transaction_model import Transaction, TransactionStatus


class TransactionService:
    """Business rules + persistence for retail money transfers."""

    MIN_TRANSFER_AMOUNT = Decimal("0.01")
    AUTO_APPROVAL_LIMIT = Decimal("100000.00")
    HIGH_VALUE_THRESHOLD = AUTO_APPROVAL_LIMIT
    AUTO_APPROVER = "AUTO_SYSTEM"

    # =========================================
    # INTERNAL HELPERS
    # =========================================

    @staticmethod
    def _require_customer_role(user: Dict[str, str]) -> None:
        if (user.get("role") or "").lower() != "customer":
            raise PermissionError("Only customers can initiate transfers")

    @staticmethod
    def _ensure_active(customer: Customer, *, label: str) -> None:
        if customer.status != CustomerStatus.ACTIVE:
            raise ValueError(f"{label} is not ACTIVE")

    @classmethod
    def _requires_manager_review(cls, amount: Decimal) -> bool:
        return amount > cls.AUTO_APPROVAL_LIMIT

    @classmethod
    def _normalize_amount(cls, amount) -> Decimal:
        if amount is None:
            raise ValueError("Transfer amount is required")
        try:
            value = Decimal(str(amount))
        except (InvalidOperation, TypeError):
            raise ValueError("Amount must be a valid number") from None
        if value <= 0:
            raise ValueError("Transfer amount must be greater than zero")
        return value.quantize(cls.MIN_TRANSFER_AMOUNT, rounding=ROUND_HALF_UP)

    @staticmethod
    def _ensure_sufficient_balance(customer: Customer, amount: Decimal) -> None:
        current_balance = Decimal(customer.balance or 0)
        if current_balance < amount:
            raise ValueError("Insufficient balance")

    @staticmethod
    def _lock_participants(
        *, sender_id: str, beneficiary_account: str
    ) -> Tuple[Customer, Customer]:
        participants = (
            Customer.query.filter(
                or_(
                    Customer.id == sender_id,
                    Customer.account_number == beneficiary_account,
                )
            )
            .with_for_update()
            .order_by(Customer.account_number.asc())
            .all()
        )

        sender = next((row for row in participants if row.id == sender_id), None)
        if not sender:
            raise ValueError("Customer profile not found")

        beneficiary = next(
            (row for row in participants if row.account_number == beneficiary_account),
            None,
        )
        if not beneficiary:
            raise ValueError("Beneficiary account not found")

        return sender, beneficiary

    @staticmethod
    def _get_transaction(tx_id: str, *, for_update: bool = False) -> Transaction:
        query = Transaction.query
        if for_update:
            query = query.with_for_update()
        tx = query.get(tx_id)
        if not tx:
            raise ValueError("Transaction not found")
        return tx

    @staticmethod
    def _resolve_customer_profile(customer_id: str) -> Customer:
        profile = Customer.query.get(customer_id)
        if not profile:
            raise ValueError("Customer profile not found")
        return profile

    @staticmethod
    def _direction_for_customer(
        tx: Transaction, *, customer_id: str, account_number: str
    ) -> Optional[str]:
        if tx.created_by == customer_id:
            return "SENT"
        if tx.to_account == account_number:
            return "RECEIVED"
        return None

    # =========================================
    # CUSTOMER: Create transaction
    # =========================================

    @classmethod
    def create_transaction(
        cls, customer_ctx: Dict[str, str], to_account, amount, purpose
    ):
        cls._require_customer_role(customer_ctx)

        customer_id = customer_ctx.get("id")
        if not customer_id:
            raise ValueError("Customer context missing identifier")

        normalized_to_account = (to_account or "").strip()
        if not normalized_to_account:
            raise ValueError("Destination account is required")

        normalized_purpose = (purpose or "").strip()
        if not normalized_purpose:
            raise ValueError("Transfer purpose is required")
        if len(normalized_purpose) > 240:
            raise ValueError("Purpose must be 240 characters or fewer")

        amount_decimal = cls._normalize_amount(amount)
        requires_review = cls._requires_manager_review(amount_decimal)
        sender_account_number = None
        transaction = None

        try:
            with db.session.begin():
                sender, beneficiary = cls._lock_participants(
                    sender_id=customer_id, beneficiary_account=normalized_to_account
                )

                cls._ensure_active(sender, label="Sender account")
                cls._ensure_active(beneficiary, label="Beneficiary account")

                sender_account_number = sender.account_number

                if sender_account_number == beneficiary.account_number:
                    raise ValueError("Cannot transfer to the same account")

                cls._ensure_sufficient_balance(sender, amount_decimal)

                sender_balance = Decimal(sender.balance or 0)
                beneficiary_balance = Decimal(beneficiary.balance or 0)

                if requires_review:
                    tx_status = TransactionStatus.PENDING
                else:
                    sender.balance = sender_balance - amount_decimal
                    beneficiary.balance = beneficiary_balance + amount_decimal
                    tx_status = TransactionStatus.COMPLETED

                transaction = Transaction(
                    from_account=sender_account_number,
                    to_account=beneficiary.account_number,
                    amount=amount_decimal,
                    purpose=normalized_purpose,
                    status=tx_status,
                    created_by=sender.id,
                )

                db.session.add(transaction)

                if not requires_review:
                    transaction.approved_by = cls.AUTO_APPROVER
                    transaction.approved_at = datetime.utcnow()

        except Exception:
            # Ensure transactional state is cleared before propagating error
            db.session.rollback()
            raise

        if not transaction:
            raise RuntimeError("Transaction dispatch failed")

        payload = transaction.to_dict()
        payload["requires_manager_approval"] = requires_review
        payload["auto_approved"] = not requires_review
        payload["auto_approval_limit"] = str(cls.AUTO_APPROVAL_LIMIT)
        return payload

    # =========================================
    # MANAGER: Approve transaction
    # =========================================

    @staticmethod
    def approve_transaction(tx_id, approver):
        try:
            with db.session.begin():
                tx = TransactionService._get_transaction(tx_id, for_update=True)

                if tx.status != TransactionStatus.PENDING:
                    raise ValueError("Transaction already processed")

                amount = Decimal(tx.amount or 0)

                sender, beneficiary = TransactionService._lock_participants(
                    sender_id=tx.created_by,
                    beneficiary_account=tx.to_account,
                )

                TransactionService._ensure_active(sender, label="Sender account")
                TransactionService._ensure_active(
                    beneficiary, label="Beneficiary account"
                )

                TransactionService._ensure_sufficient_balance(sender, amount)

                sender.balance = Decimal(sender.balance or 0) - amount
                beneficiary.balance = Decimal(beneficiary.balance or 0) + amount

                tx.status = TransactionStatus.APPROVED
                tx.approved_by = approver.get("id") or approver.get("name")
                tx.approved_at = datetime.utcnow()

        except Exception:
            db.session.rollback()
            raise

        return tx.to_dict()

    @staticmethod
    def reject_transaction(tx_id, approver, reason: Optional[str] = None):
        try:
            with db.session.begin():
                tx = TransactionService._get_transaction(tx_id, for_update=True)

                if tx.status != TransactionStatus.PENDING:
                    raise ValueError("Transaction already processed")

                tx.status = TransactionStatus.REJECTED
                tx.approved_by = approver.get("id") or approver.get("name")
                tx.approved_at = datetime.utcnow()

        except Exception:
            db.session.rollback()
            raise

        payload = tx.to_dict()
        if reason:
            payload["decision_reason"] = reason
        return payload

    @staticmethod
    def get_pending_transactions():
        txs = (
            Transaction.query.filter_by(status=TransactionStatus.PENDING)
            .order_by(Transaction.created_at.asc())
            .all()
        )
        return [tx.to_dict() for tx in txs]

    # =========================================
    # CUSTOMER: View own history
    # =========================================

    @staticmethod
    def get_user_transactions(user_id):
        profile = TransactionService._resolve_customer_profile(user_id)
        account_number = profile.account_number

        txs = (
            Transaction.query.filter(
                or_(
                    Transaction.created_by == user_id,
                    Transaction.to_account == account_number,
                )
            )
            .order_by(Transaction.created_at.desc())
            .all()
        )

        enriched = []
        for tx in txs:
            direction = TransactionService._direction_for_customer(
                tx,
                customer_id=user_id,
                account_number=account_number,
            )
            if not direction:
                continue

            payload = tx.to_dict()
            payload["direction"] = direction
            payload["counterparty_account"] = (
                payload["to_account"]
                if direction == "SENT"
                else payload["from_account"]
            )
            
            # Enrich with counterparty name
            counterparty_account = payload["counterparty_account"]
            counterparty = Customer.query.filter_by(account_number=counterparty_account).first()
            if counterparty:
                payload["counterparty_name"] = counterparty.name
            else:
                payload["counterparty_name"] = "Unknown"
            
            enriched.append(payload)

        return enriched

    @staticmethod
    def get_transaction_detail(tx_id: str, user: Dict[str, str]):
        role = (user.get("role") or "").lower()
        user_id = user.get("id")
        
        if not user_id:
            raise ValueError("User identifier missing")

        tx = TransactionService._get_transaction(tx_id)
        
        # Auditors, managers, and system admins can view all transactions
        if role in ["auditor_clerk", "manager", "system_admin"]:
            payload = tx.to_dict()
            
            # Enrich with sender and recipient names
            sender = Customer.query.filter_by(account_number=tx.from_account).first()
            recipient = Customer.query.filter_by(account_number=tx.to_account).first()
            
            payload["sender_name"] = sender.name if sender else "Unknown"
            payload["recipient_name"] = recipient.name if recipient else "Unknown"
            payload["from_account"] = tx.from_account
            payload["to_account"] = tx.to_account
            
            return payload
        
        # Customers can only view their own transactions
        if role == "customer":
            profile = TransactionService._resolve_customer_profile(user_id)
            
            direction = TransactionService._direction_for_customer(
                tx,
                customer_id=user_id,
                account_number=profile.account_number,
            )
            if not direction:
                raise PermissionError("You do not have access to this transaction")

            payload = tx.to_dict()
            payload["direction"] = direction
            payload["counterparty_account"] = (
                payload["to_account"] if direction == "SENT" else payload["from_account"]
            )
            
            # Enrich with counterparty name
            counterparty_account = payload["counterparty_account"]
            counterparty = Customer.query.filter_by(account_number=counterparty_account).first()
            if counterparty:
                payload["counterparty_name"] = counterparty.name
            else:
                payload["counterparty_name"] = "Unknown"
            
            return payload
        
        raise PermissionError("Invalid role for viewing transaction details")

    # =========================================
    # AUDITOR_CLERK: View all transactions
    # =========================================

    @staticmethod
    def get_all_transactions():
        txs = Transaction.query.all()
        return [t.to_dict() for t in txs]
