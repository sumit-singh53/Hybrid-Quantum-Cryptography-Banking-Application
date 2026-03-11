from app.config.database import db


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    hierarchy_level = db.Column(db.Integer, default=1)

    # Relationships
    users = db.relationship("User", back_populates="role")
    permissions = db.relationship(
        "Permission",
        secondary="role_permissions",
        back_populates="roles"
    )

    def __repr__(self):
        return f"<Role {self.name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "hierarchy_level": self.hierarchy_level,
        }

    def has_permission(self, permission_name):
        """Check if role has a specific permission."""
        return any(p.name == permission_name for p in self.permissions)
