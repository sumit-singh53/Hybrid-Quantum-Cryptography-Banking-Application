"""
Security Policy Service
-----------------------
Admin-only service for managing system-wide security policies.
All changes are logged and validated.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from app.config.database import db
from app.models.security_policy_model import SecurityPolicy, DEFAULT_POLICIES
from app.security.security_event_store import SecurityEventStore


class SecurityPolicyService:
    """Service for managing security policies."""
    
    @staticmethod
    def initialize_default_policies():
        """Initialize default security policies if they don't exist."""
        for policy_data in DEFAULT_POLICIES:
            existing = SecurityPolicy.query.filter_by(
                policy_key=policy_data["policy_key"]
            ).first()
            
            if not existing:
                policy = SecurityPolicy(
                    policy_key=policy_data["policy_key"],
                    policy_value=policy_data["policy_value"],
                    policy_category=policy_data["policy_category"],
                    description=policy_data.get("description"),
                    is_active=True,
                    updated_by="system",
                )
                db.session.add(policy)
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to initialize default policies: {str(e)}")
    
    @staticmethod
    def get_all_policies() -> Dict[str, Any]:
        """Get all security policies grouped by category."""
        policies = SecurityPolicy.query.order_by(
            SecurityPolicy.policy_category,
            SecurityPolicy.policy_key
        ).all()
        
        # Group by category
        grouped = {}
        for policy in policies:
            category = policy.policy_category
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(policy.to_dict())
        
        return {
            "policies": grouped,
            "total_count": len(policies),
            "categories": list(grouped.keys()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def get_policy_by_key(policy_key: str) -> Optional[Dict[str, Any]]:
        """Get a specific policy by key."""
        policy = SecurityPolicy.query.filter_by(policy_key=policy_key).first()
        return policy.to_dict() if policy else None
    
    @staticmethod
    def get_policies_by_category(category: str) -> List[Dict[str, Any]]:
        """Get all policies in a specific category."""
        policies = SecurityPolicy.query.filter_by(
            policy_category=category
        ).order_by(SecurityPolicy.policy_key).all()
        
        return [p.to_dict() for p in policies]
    
    @staticmethod
    def update_policy(
        policy_key: str,
        new_value: str,
        admin_username: str
    ) -> Dict[str, Any]:
        """
        Update a security policy value.
        Validates the new value and logs the change.
        """
        policy = SecurityPolicy.query.filter_by(policy_key=policy_key).first()
        
        if not policy:
            raise ValueError(f"Policy '{policy_key}' not found")
        
        # Validate the new value
        SecurityPolicyService._validate_policy_value(policy_key, new_value)
        
        # Store old value for audit
        old_value = policy.policy_value
        
        # Update policy
        policy.policy_value = new_value
        policy.updated_at = datetime.utcnow()
        policy.updated_by = admin_username
        
        try:
            db.session.commit()
            
            # Log the change
            SecurityEventStore.record(
                event_type="SECURITY_POLICY_UPDATE",
                user_id=admin_username,
                metadata={
                    "policy_key": policy_key,
                    "old_value": old_value,
                    "new_value": new_value,
                    "category": policy.policy_category,
                },
            )
            
            return policy.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to update policy: {str(e)}")
    
    @staticmethod
    def update_multiple_policies(
        updates: List[Dict[str, str]],
        admin_username: str
    ) -> Dict[str, Any]:
        """
        Update multiple policies at once.
        All updates are atomic - either all succeed or all fail.
        """
        updated_policies = []
        
        try:
            for update in updates:
                policy_key = update.get("policy_key")
                new_value = update.get("policy_value")
                
                if not policy_key or new_value is None:
                    raise ValueError("Each update must have policy_key and policy_value")
                
                policy = SecurityPolicy.query.filter_by(policy_key=policy_key).first()
                
                if not policy:
                    raise ValueError(f"Policy '{policy_key}' not found")
                
                # Validate the new value
                SecurityPolicyService._validate_policy_value(policy_key, new_value)
                
                # Store old value for audit
                old_value = policy.policy_value
                
                # Update policy
                policy.policy_value = new_value
                policy.updated_at = datetime.utcnow()
                policy.updated_by = admin_username
                
                updated_policies.append({
                    "policy_key": policy_key,
                    "old_value": old_value,
                    "new_value": new_value,
                })
            
            db.session.commit()
            
            # Log all changes
            SecurityEventStore.record(
                event_type="SECURITY_POLICY_BULK_UPDATE",
                user_id=admin_username,
                metadata={
                    "updated_count": len(updated_policies),
                    "updates": updated_policies,
                },
            )
            
            return {
                "success": True,
                "updated_count": len(updated_policies),
                "updated_policies": updated_policies,
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to update policies: {str(e)}")
    
    @staticmethod
    def _validate_policy_value(policy_key: str, value: str):
        """Validate policy value based on policy type."""
        
        # Boolean policies
        boolean_policies = [
            "password_require_uppercase",
            "password_require_lowercase",
            "password_require_number",
            "password_require_special",
            "session_require_reauth_sensitive",
            "rbac_enforcement_enabled",
            "ip_whitelist_enabled",
            "geo_restriction_enabled",
            "require_manager_approval",
            "audit_immutability_enabled",
            "log_sensitive_operations",
        ]
        
        if policy_key in boolean_policies:
            if value.lower() not in ["true", "false"]:
                raise ValueError(f"{policy_key} must be 'true' or 'false'")
            return
        
        # Integer policies with minimum values
        integer_policies = {
            "password_min_length": (8, 128),
            "password_expiry_days": (30, 365),
            "account_lockout_threshold": (3, 10),
            "account_lockout_duration": (5, 120),
            "session_timeout_minutes": (5, 480),
            "session_max_concurrent": (1, 10),
            "high_value_threshold": (1000, 1000000),
            "transaction_daily_limit": (10000, 10000000),
            "audit_log_retention_days": (90, 3650),
        }
        
        if policy_key in integer_policies:
            try:
                int_value = int(value)
                min_val, max_val = integer_policies[policy_key]
                if not (min_val <= int_value <= max_val):
                    raise ValueError(
                        f"{policy_key} must be between {min_val} and {max_val}"
                    )
            except ValueError as e:
                if "invalid literal" in str(e):
                    raise ValueError(f"{policy_key} must be a valid integer")
                raise
            return
        
        # If we get here, it's a valid policy but no specific validation
        if not value or len(value) > 1000:
            raise ValueError("Policy value must be between 1 and 1000 characters")
    
    @staticmethod
    def get_policy_summary() -> Dict[str, Any]:
        """Get a summary of security policy status."""
        total = SecurityPolicy.query.count()
        active = SecurityPolicy.query.filter_by(is_active=True).count()
        
        categories = db.session.query(
            SecurityPolicy.policy_category,
            db.func.count(SecurityPolicy.id)
        ).group_by(SecurityPolicy.policy_category).all()
        
        category_counts = {cat: count for cat, count in categories}
        
        # Get recently updated policies
        recent_updates = SecurityPolicy.query.order_by(
            SecurityPolicy.updated_at.desc()
        ).limit(5).all()
        
        return {
            "total_policies": total,
            "active_policies": active,
            "category_counts": category_counts,
            "recent_updates": [p.to_dict() for p in recent_updates],
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
