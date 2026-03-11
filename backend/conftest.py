from decimal import Decimal

import pytest

from app import create_app
from app.config.database import db
from app.models.customer_model import Customer, CustomerStatus


@pytest.fixture(scope="function")
def app_with_db(tmp_path):
    app = create_app()
    db_path = tmp_path / "test.db"
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{db_path.as_posix()}",
        TESTING_BYPASS_CERTIFICATE=False,
    )

    db.init_app(app)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope="function")
def seed_ledger(app_with_db):
    with app_with_db.app_context():
        sender = Customer(
            id="test-customer",
            name="Test Customer",
            account_number="CUST-0001",
            balance=Decimal("250000.00"),
            status=CustomerStatus.ACTIVE,
        )
        beneficiary = Customer(
            id="beneficiary-customer",
            name="Beneficiary Customer",
            account_number="ACC123",
            balance=Decimal("50000.00"),
            status=CustomerStatus.ACTIVE,
        )
        db.session.add_all([sender, beneficiary])
        db.session.commit()

        return {
            "sender_id": sender.id,
            "sender_account": sender.account_number,
            "beneficiary_account": beneficiary.account_number,
            "beneficiary_id": beneficiary.id,
        }


@pytest.fixture(scope="function")
def client(app_with_db):
    with app_with_db.test_client() as client:
        yield client
