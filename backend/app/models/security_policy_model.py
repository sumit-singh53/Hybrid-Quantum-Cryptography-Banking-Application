"""
Security Policy Model
---------------------
Stores system-wide security policies for authentication, sessions, access control, etc.
Admin-only management with full audit trail.
"""

from datetime import datetime
from app.config.database import db


class SecurityPolicy(db.Model):
    """Security policy configuration storage."""
    
    __tablename__ = "security_policies"
    
    id = db.Column(db.Integer, primary_key=True)
    policy_key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    policy_value = db.Column(db.Text, nullable=False)
    policy_category = db.Column(db.String(50), nullable=False, index=True)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Audit fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by = db.Column(db.String(100))  # Admin username who made the change
    
    def to_dict(self):
        """Convert policy to dictionary."""
        return {
            "id": self.id,
            "policy_key": self.policy_key,
            "policy_value": self.policy_value,
            "policy_category": self.policy_category,
            "description": self.description,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "updated_by": self.updated_by,
        }
    
    def __repr__(self):
        return f"<SecurityPolicy {self.policy_key}={self.policy_value}>"


# Default security policies
DEFAULT_POLICIES = [
    # Authentication Policies
    {
        "policy_key": "password_min_length",
        "policy_value": "12",
        "policy_category": "authentication",
        "description": "Minimum password length required",
    },
    {
        "policy_key": "password_require_uppercase",
        "policy_value": "true",
        "policy_category": "authentication",
        "description": "Require at least one uppercase letter",
    },
    {
        "policy_key": "password_require_lowercase",
        "policy_value": "true",
        "policy_category": "authentication",
        "description": "Require at least one lowercase letter",
    },
    {
        "policy_key": "password_require_number",
        "policy_value": "true",
        "policy_category": "authentication",
        "description": "Require at least one number",
    },
    {
        "policy_key": "password_require_special",
        "policy_value": "true",
        "policy_category": "authentication",
        "description": "Require at least one special character",
    },
    {
        "policy_key": "password_expiry_days",
        "policy_value": "90",
        "policy_category": "authentication",
        "description": "Password expiration period in days",
    },
    {
        "policy_key": "account_lockout_threshold",
        "policy_value": "5",
        "policy_category": "authentication",
        "description": "Failed login attempts before account lockout",
    },
    {
        "policy_key": "account_lockout_duration",
        "policy_value": "30",
        "policy_category": "authentication",
        "description": "Account lockout duration in minutes",
    },
    
    # Session Policies
    {
        "policy_key": "session_timeout_minutes",
        "policy_value": "30",
        "policy_category": "session",
        "description": "Session timeout duration in minutes",
    },
    {
        "policy_key": "session_max_concurrent",
        "policy_value": "3",
        "policy_category": "session",
        "description": "Maximum concurrent sessions per user",
    },
    {
        "policy_key": "session_require_reauth_sensitive",
        "policy_value": "true",
        "policy_category": "session",
        "description": "Require re-authentication for sensitive operations",
    },
    
    # Access Control Policies
    {
        "policy_key": "rbac_enforcement_enabled",
        "policy_value": "true",
        "policy_category": "access_control",
        "description": "Enable role-based access control enforcement",
    },
    {
        "policy_key": "ip_whitelist_enabled",
        "policy_value": "false",
        "policy_category": "access_control",
        "description": "Enable IP address whitelist",
    },
    {
        "policy_key": "geo_restriction_enabled",
        "policy_value": "false",
        "policy_category": "access_control",
        "description": "Enable geographic location restrictions",
    },
    
    # Transaction Security Policies
    {
        "policy_key": "high_value_threshold",
        "policy_value": "10000",
        "policy_category": "transaction",
        "description": "Transaction amount requiring manager approval",
    },
    {
        "policy_key": "require_manager_approval",
        "policy_value": "true",
        "policy_category": "transaction",
        "description": "Require manager approval for high-value transactions",
    },
    {
        "policy_key": "transaction_daily_limit",
        "policy_value": "50000",
        "policy_category": "transaction",
        "description": "Maximum daily transaction amount per user",
    },
    
    # Logging & Audit Policies
    {
        "policy_key": "audit_log_retention_days",
        "policy_value": "365",
        "policy_category": "audit",
        "description": "Audit log retention period in days",
    },
    {
        "policy_key": "audit_immutability_enabled",
        "policy_value": "true",
        "policy_category": "audit",
        "description": "Enable audit log immutability protection",
    },
    {
        "policy_key": "log_sensitive_operations",
        "policy_value": "true",
        "policy_category": "audit",
        "description": "Log all sensitive operations",
    },
]
