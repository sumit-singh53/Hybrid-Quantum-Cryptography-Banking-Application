"""
Certificate Request Model
Stores customer certificate requests for admin approval
"""
from datetime import datetime
import enum
from app.config.database import db


class RequestType(enum.Enum):
    NEW = "NEW"
    RENEWAL = "RENEWAL"


class RequestStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class CertificateRequest(db.Model):
    __tablename__ = "certificate_requests"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(64), nullable=False, index=True)
    full_name = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="customer")
    
    request_type = db.Column(
        db.Enum(RequestType), nullable=False, default=RequestType.NEW
    )
    reason = db.Column(db.Text, nullable=False)
    
    status = db.Column(
        db.Enum(RequestStatus), nullable=False, default=RequestStatus.PENDING
    )
    
    # Admin response
    reviewed_by = db.Column(db.String(150), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    admin_notes = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "full_name": self.full_name,
            "role": self.role,
            "request_type": self.request_type.value if self.request_type else None,
            "reason": self.reason,
            "status": self.status.value if self.status else None,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "admin_notes": self.admin_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<CertificateRequest {self.id} - {self.user_id} - {self.status.value}>"
