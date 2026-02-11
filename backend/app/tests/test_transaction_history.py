"""
Test Transaction History with Counterparty Names
"""
import pytest
from decimal import Decimal
from app.models.customer_model import Customer, CustomerStatus
from app.models.transaction_model import Transaction, TransactionStatus
from app.services.transaction_service import TransactionService


@pytest.fixture
def setup_customers(app_with_db):
    """Create test customers"""
    with app_with_db.app_context():
        from app.config.database import db
        
        # Create sender
        sender = Customer(
            id="sender-001",
            name="Alice Sender",
            account_number="ACC-SENDER-001",
            balance=Decimal("100000.00"),
            status=CustomerStatus.ACTIVE,
        )
        
        # Create receiver
        receiver = Customer(
            id="receiver-001",
            name="Bob Receiver",
            account_number="ACC-RECEIVER-001",
            balance=Decimal("50000.00"),
            status=CustomerStatus.ACTIVE,
        )
        
        db.session.add(sender)
        db.session.add(receiver)
        db.session.commit()
        
        yield {
            "sender": sender,
            "receiver": receiver,
        }
        
        db.session.rollback()


def test_transaction_history_includes_counterparty_name(app_with_db, setup_customers):
    """Test that transaction history includes counterparty names"""
    with app_with_db.app_context():
        from app.config.database import db
        
        sender = setup_customers["sender"]
        receiver = setup_customers["receiver"]
        
        # Create a transaction
        tx = Transaction(
            from_account=sender.account_number,
            to_account=receiver.account_number,
            amount=Decimal("5000.00"),
            purpose="Test payment",
            status=TransactionStatus.COMPLETED,
            created_by=sender.id,
        )
        db.session.add(tx)
        db.session.commit()
        
        # Get sender's transaction history
        sender_history = TransactionService.get_user_transactions(sender.id)
        
        assert len(sender_history) == 1
        assert sender_history[0]["direction"] == "SENT"
        assert sender_history[0]["counterparty_account"] == receiver.account_number
        assert sender_history[0]["counterparty_name"] == "Bob Receiver"
        
        # Get receiver's transaction history
        receiver_history = TransactionService.get_user_transactions(receiver.id)
        
        assert len(receiver_history) == 1
        assert receiver_history[0]["direction"] == "RECEIVED"
        assert receiver_history[0]["counterparty_account"] == sender.account_number
        assert receiver_history[0]["counterparty_name"] == "Alice Sender"


def test_transaction_detail_includes_counterparty_name(app_with_db, setup_customers):
    """Test that transaction detail includes counterparty name"""
    with app_with_db.app_context():
        from app.config.database import db
        
        sender = setup_customers["sender"]
        receiver = setup_customers["receiver"]
        
        # Create a transaction
        tx = Transaction(
            from_account=sender.account_number,
            to_account=receiver.account_number,
            amount=Decimal("3000.00"),
            purpose="Test payment detail",
            status=TransactionStatus.COMPLETED,
            created_by=sender.id,
        )
        db.session.add(tx)
        db.session.commit()
        
        # Get transaction detail as sender
        sender_user = {"id": sender.id, "role": "customer"}
        sender_detail = TransactionService.get_transaction_detail(tx.id, sender_user)
        
        assert sender_detail["direction"] == "SENT"
        assert sender_detail["counterparty_name"] == "Bob Receiver"
        assert sender_detail["counterparty_account"] == receiver.account_number
        
        # Get transaction detail as receiver
        receiver_user = {"id": receiver.id, "role": "customer"}
        receiver_detail = TransactionService.get_transaction_detail(tx.id, receiver_user)
        
        assert receiver_detail["direction"] == "RECEIVED"
        assert receiver_detail["counterparty_name"] == "Alice Sender"
        assert receiver_detail["counterparty_account"] == sender.account_number


def test_transaction_history_unknown_counterparty(app_with_db, setup_customers):
    """Test that unknown counterparty shows as 'Unknown'"""
    with app_with_db.app_context():
        from app.config.database import db
        
        sender = setup_customers["sender"]
        
        # Create a transaction with non-existent counterparty
        tx = Transaction(
            from_account=sender.account_number,
            to_account="ACC-NONEXISTENT",
            amount=Decimal("1000.00"),
            purpose="Test unknown counterparty",
            status=TransactionStatus.COMPLETED,
            created_by=sender.id,
        )
        db.session.add(tx)
        db.session.commit()
        
        # Get sender's transaction history
        sender_history = TransactionService.get_user_transactions(sender.id)
        
        assert len(sender_history) == 1
        assert sender_history[0]["counterparty_name"] == "Unknown"
        assert sender_history[0]["counterparty_account"] == "ACC-NONEXISTENT"
