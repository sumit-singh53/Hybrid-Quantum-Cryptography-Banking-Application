"""
Beneficiary Model
Stores customer beneficiaries for secure fund transfers.
"""
from datetime import datetime
import enum
import uuid

from app.config.database import db


class BeneficiaryStatus(enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"


class Beneficiary(db.Model):
    __tablename__ = "beneficiaries"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Owner information
    customer_id = db.Column(db.String(64), db.ForeignKey("customers.id"), nullable=False, index=True)
    
    # Beneficiary details
    beneficiary_name = db.Column(db.String(150), nullable=False)
    account_number = db.Column(db.String(32), nullable=False)
    bank_name = db.Column(db.String(100), nullable=True, default="PQ Bank")
    branch_code = db.Column(db.String(32), nullable=True)
    ifsc_code = db.Column(db.String(11), nullable=True)
    
    # Optional fields
    nickname = db.Column(db.String(100), nullable=True)
    description = db.Column(db.String(256), nullable=True)
    
    # Status and verification
    status = db.Column(
        db.Enum(BeneficiaryStatus), 
        nullable=False, 
        default=BeneficiaryStatus.PENDING
    )
    verified = db.Column(db.Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow,
        nullable=False
    )
    last_used_at = db.Column(db.DateTime, nullable=True)
    
    # Relationship
    customer = db.relationship("Customer", backref=db.backref("beneficiaries", lazy="dynamic"))
    
    def to_dict(self, mask_account=True):
        """Convert beneficiary to dictionary with optional account masking."""
        account = self.account_number
        if mask_account and account and len(account) >= 4:
            account = f"****{account[-4:]}"
        
        return {
            "id": self.id,
            "beneficiary_name": self.beneficiary_name,
            "account_number": account,
            "bank_name": self.bank_name,
            "branch_code": self.branch_code,
            "ifsc_code": self.ifsc_code,
            "nickname": self.nickname,
            "description": self.description,
            "status": self.status.value if self.status else "PENDING",
            "verified": self.verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
        }
    
    def __repr__(self):
        return f"<Beneficiary {self.beneficiary_name} - {self.account_number}>"
