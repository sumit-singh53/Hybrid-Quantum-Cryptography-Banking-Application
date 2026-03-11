"""
Backup Model
------------
Stores backup metadata and history.
Admin-only management with full audit trail.
"""

from datetime import datetime
from app.config.database import db


class Backup(db.Model):
    """Backup metadata storage."""
    
    __tablename__ = "backups"
    
    id = db.Column(db.Integer, primary_key=True)
    backup_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    backup_type = db.Column(db.String(50), nullable=False)  # manual, scheduled, auto
    status = db.Column(db.String(50), nullable=False)  # success, failed, in_progress
    backup_size = db.Column(db.Integer)  # Size in bytes
    integrity_verified = db.Column(db.Boolean, default=False)
    integrity_hash = db.Column(db.String(256))  # SHA-256 hash for verification
    
    # Metadata
    description = db.Column(db.Text)
    backup_location = db.Column(db.String(255))  # Secure reference, not full path
    
    # Audit fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(100))  # Admin username who triggered backup
    
    # Recovery tracking
    last_restored_at = db.Column(db.DateTime)
    last_restored_by = db.Column(db.String(100))
    restore_count = db.Column(db.Integer, default=0)
    
    def to_dict(self):
        """Convert backup to dictionary."""
        return {
            "id": self.id,
            "backup_id": self.backup_id,
            "backup_type": self.backup_type,
            "status": self.status,
            "backup_size": self.backup_size,
            "backup_size_mb": round(self.backup_size / (1024 * 1024), 2) if self.backup_size else 0,
            "integrity_verified": self.integrity_verified,
            "integrity_hash": self.integrity_hash[:16] + "..." if self.integrity_hash else None,
            "description": self.description,
            "backup_location": self.backup_location,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "created_by": self.created_by,
            "last_restored_at": self.last_restored_at.isoformat() + "Z" if self.last_restored_at else None,
            "last_restored_by": self.last_restored_by,
            "restore_count": self.restore_count,
        }
    
    def __repr__(self):
        return f"<Backup {self.backup_id} - {self.status}>"
