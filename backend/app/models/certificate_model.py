from datetime import datetime
from app.config.database import db


class Certificate(db.Model):
    __tablename__ = "certificates"

    id = db.Column(db.Integer, primary_key=True)
    certificate_id = db.Column(db.String(200), unique=True, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    issued_by = db.Column(db.String(150), nullable=False)
    algorithm = db.Column(db.String(100), nullable=False)

    valid_from = db.Column(db.DateTime, nullable=False)
    valid_to = db.Column(db.DateTime, nullable=False)

    is_revoked = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    user = db.relationship("User", back_populates="certificate")

    def __repr__(self):
        return f"<Certificate {self.certificate_id}>"
