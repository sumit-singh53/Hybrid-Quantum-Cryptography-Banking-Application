from datetime import datetime
from app.config.database import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)

    # Who performed the action
    user_id = db.Column(db.String(128), nullable=False)
    user_name = db.Column(db.String(128), nullable=False)
    user_role = db.Column(db.String(50), nullable=False)

    # What was done
    action = db.Column(db.String(256), nullable=False)

    # On what
    transaction_id = db.Column(db.String(128), nullable=True)

    # When
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Cryptographic assurance
    pq_identity = db.Column(db.Text, nullable=False)
    classical_identity = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "user_role": self.user_role,
            "action": self.action,
            "transaction_id": self.transaction_id,
            "timestamp": self.timestamp.isoformat(),
            "pq_identity": self.pq_identity,
            "classical_identity": self.classical_identity,
        }
