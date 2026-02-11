"""
System Configuration Model
--------------------------
Stores system-wide operational configuration settings.
Admin-only management with full audit trail.
Extends security policies with operational settings.
"""

from datetime import datetime
from app.config.database import db


class SystemConfig(db.Model):
    """System configuration storage for operational settings."""
    
    __tablename__ = "system_configs"
    
    id = db.Column(db.Integer, primary_key=True)
    config_key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    config_value = db.Column(db.Text, nullable=False)
    config_category = db.Column(db.String(50), nullable=False, index=True)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Audit fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by = db.Column(db.String(100))  # Admin username who made the change
    
    def to_dict(self):
        """Convert config to dictionary."""
        return {
            "id": self.id,
            "config_key": self.config_key,
            "config_value": self.config_value,
            "config_category": self.config_category,
            "description": self.description,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "updated_by": self.updated_by,
        }
    
    def __repr__(self):
        return f"<SystemConfig {self.config_key}={self.config_value}>"


# Default system configurations
DEFAULT_CONFIGS = [
    # Transaction Settings
    {
        "config_key": "default_transaction_limit",
        "config_value": "5000",
        "config_category": "transaction",
        "description": "Default transaction limit per transaction",
    },
    {
        "config_key": "high_value_threshold",
        "config_value": "10000",
        "config_category": "transaction",
        "description": "High-value transaction threshold requiring manager approval",
    },
    {
        "config_key": "manager_approval_threshold",
        "config_value": "10000",
        "config_category": "transaction",
        "description": "Transaction amount requiring manager approval",
    },
    {
        "config_key": "daily_transaction_limit",
        "config_value": "50000",
        "config_category": "transaction",
        "description": "Maximum daily transaction limit per user",
    },
    
    # Session Settings
    {
        "config_key": "session_timeout_minutes",
        "config_value": "30",
        "config_category": "session",
        "description": "Session timeout duration in minutes",
    },
    {
        "config_key": "concurrent_session_limit",
        "config_value": "3",
        "config_category": "session",
        "description": "Maximum concurrent sessions per user",
    },
    {
        "config_key": "session_idle_timeout",
        "config_value": "15",
        "config_category": "session",
        "description": "Idle timeout before session expires (minutes)",
    },
    
    # Operational Settings
    {
        "config_key": "maintenance_mode",
        "config_value": "false",
        "config_category": "operational",
        "description": "Enable/disable maintenance mode",
    },
    {
        "config_key": "allow_new_registrations",
        "config_value": "true",
        "config_category": "operational",
        "description": "Allow new customer registrations",
    },
    {
        "config_key": "enable_transaction_processing",
        "config_value": "true",
        "config_category": "operational",
        "description": "Enable transaction processing",
    },
    {
        "config_key": "enable_certificate_issuance",
        "config_value": "true",
        "config_category": "operational",
        "description": "Enable certificate issuance",
    },
    
    # Notification Settings
    {
        "config_key": "enable_system_alerts",
        "config_value": "true",
        "config_category": "notification",
        "description": "Enable system-wide alerts",
    },
    {
        "config_key": "enable_admin_notifications",
        "config_value": "true",
        "config_category": "notification",
        "description": "Enable admin notifications",
    },
    {
        "config_key": "enable_transaction_notifications",
        "config_value": "true",
        "config_category": "notification",
        "description": "Enable transaction notifications",
    },
    {
        "config_key": "enable_security_alerts",
        "config_value": "true",
        "config_category": "notification",
        "description": "Enable security alert notifications",
    },
]
