import enum
from datetime import datetime
import uuid

from app.config.database import db


class TransactionStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    from_account = db.Column(db.String(32), nullable=False)
    to_account = db.Column(db.String(32), nullable=False)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    purpose = db.Column(db.String(256), nullable=False)

    status = db.Column(
        db.Enum(TransactionStatus), nullable=False, default=TransactionStatus.PENDING
    )

    created_by = db.Column(
        db.String(64), db.ForeignKey("customers.id"), nullable=False, index=True
    )
    approved_by = db.Column(db.String(64), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    creator = db.relationship(
        "Customer",
        back_populates="created_transactions",
        foreign_keys=[created_by],
    )

    def to_dict(self):
        return {
            "id": self.id,
            "from_account": self.from_account,
            "to_account": self.to_account,
            "amount": float(self.amount),
            "purpose": self.purpose,
            "status": self.status.value if self.status else None,
            "created_by": self.created_by,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
