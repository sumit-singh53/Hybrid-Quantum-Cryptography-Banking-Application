from datetime import datetime
import enum

from app.config.database import db


class CustomerStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    FROZEN = "FROZEN"
    LIMITED = "LIMITED"


class AccountType(enum.Enum):
    SAVINGS = "SAVINGS"
    CURRENT = "CURRENT"
    PRIMARY = "PRIMARY"


class AccountType(enum.Enum):
    SAVINGS = "SAVINGS"
    CURRENT = "CURRENT"
    PRIMARY = "PRIMARY"


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    account_number = db.Column(db.String(32), unique=True, nullable=False)
    balance = db.Column(db.Numeric(18, 2), nullable=False, default=0)
    status = db.Column(
        db.Enum(CustomerStatus), nullable=False, default=CustomerStatus.ACTIVE
    )
    account_type = db.Column(
        db.Enum(AccountType), nullable=False, default=AccountType.SAVINGS
    )
    branch_code = db.Column(db.String(32), nullable=True, default="MUM-HQ")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    created_transactions = db.relationship(
        "Transaction",
        foreign_keys="Transaction.created_by",
        back_populates="creator",
        lazy="dynamic",
    )

    def __repr__(self):
        return f"<Customer {self.account_number}>"
