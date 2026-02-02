from datetime import datetime
from app.config.database import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)

    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)

    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    role = db.relationship("Role", back_populates="users")
    certificate = db.relationship("Certificate", back_populates="user", uselist=False)

    def __repr__(self):
        return f"<User {self.username}>"


# Ensure Certificate model is registered before SQLAlchemy configures relationships
from app.models.certificate_model import Certificate  # noqa: E402,F401  pylint: disable=wrong-import-position
