"""
System Configuration Service
-----------------------------
Admin-only service for managing system-wide operational configurations.
All changes are logged and validated.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from app.config.database import db
from app.models.system_config_model import SystemConfig, DEFAULT_CONFIGS
from app.security.security_event_store import SecurityEventStore


class SystemConfigService:
    """Service for managing system configurations."""
    
    @staticmethod
    def initialize_default_configs():
        """Initialize default system configurations if they don't exist."""
        for config_data in DEFAULT_CONFIGS:
            existing = SystemConfig.query.filter_by(
                config_key=config_data["config_key"]
            ).first()
            
            if not existing:
                config = SystemConfig(
                    config_key=config_data["config_key"],
                    config_value=config_data["config_value"],
                    config_category=config_data["config_category"],
                    description=config_data.get("description"),
                    is_active=True,
                    updated_by="system",
                )
                db.session.add(config)
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to initialize default configs: {str(e)}")
    
    @staticmethod
    def get_all_configs() -> Dict[str, Any]:
        """Get all system configurations grouped by category."""
        configs = SystemConfig.query.order_by(
            SystemConfig.config_category,
            SystemConfig.config_key
        ).all()
        
        # Group by category
        grouped = {}
        for config in configs:
            category = config.config_category
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(config.to_dict())
        
        return {
            "configs": grouped,
            "total_count": len(configs),
            "categories": list(grouped.keys()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def get_config_by_key(config_key: str) -> Optional[Dict[str, Any]]:
        """Get a specific configuration by key."""
        config = SystemConfig.query.filter_by(config_key=config_key).first()
        return config.to_dict() if config else None
    
    @staticmethod
    def get_configs_by_category(category: str) -> List[Dict[str, Any]]:
        """Get all configurations in a specific category."""
        configs = SystemConfig.query.filter_by(
            config_category=category
        ).order_by(SystemConfig.config_key).all()
        
        return [c.to_dict() for c in configs]
    
    @staticmethod
    def update_config(
        config_key: str,
        new_value: str,
        admin_username: str
    ) -> Dict[str, Any]:
        """
        Update a system configuration value.
        Validates the new value and logs the change.
        """
        config = SystemConfig.query.filter_by(config_key=config_key).first()
        
        if not config:
            raise ValueError(f"Configuration '{config_key}' not found")
        
        # Validate the new value
        SystemConfigService._validate_config_value(config_key, new_value)
        
        # Store old value for audit
        old_value = config.config_value
        
        # Update configuration
        config.config_value = new_value
        config.updated_at = datetime.utcnow()
        config.updated_by = admin_username
        
        try:
            db.session.commit()
            
            # Log the change
            SecurityEventStore.record(
                event_type="SYSTEM_CONFIG_UPDATE",
                user_id=admin_username,
                metadata={
                    "config_key": config_key,
                    "old_value": old_value,
                    "new_value": new_value,
                    "category": config.config_category,
                },
            )
            
            return config.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to update configuration: {str(e)}")
    
    @staticmethod
    def update_multiple_configs(
        updates: List[Dict[str, str]],
        admin_username: str
    ) -> Dict[str, Any]:
        """
        Update multiple configurations at once.
        All updates are atomic - either all succeed or all fail.
        """
        updated_configs = []
        
        try:
            for update in updates:
                config_key = update.get("config_key")
                new_value = update.get("config_value")
                
                if not config_key or new_value is None:
                    raise ValueError("Each update must have config_key and config_value")
                
                config = SystemConfig.query.filter_by(config_key=config_key).first()
                
                if not config:
                    raise ValueError(f"Configuration '{config_key}' not found")
                
                # Validate the new value
                SystemConfigService._validate_config_value(config_key, new_value)
                
                # Store old value for audit
                old_value = config.config_value
                
                # Update configuration
                config.config_value = new_value
                config.updated_at = datetime.utcnow()
                config.updated_by = admin_username
                
                updated_configs.append({
                    "config_key": config_key,
                    "old_value": old_value,
                    "new_value": new_value,
                })
            
            db.session.commit()
            
            # Log all changes
            SecurityEventStore.record(
                event_type="SYSTEM_CONFIG_BULK_UPDATE",
                user_id=admin_username,
                metadata={
                    "updated_count": len(updated_configs),
                    "updates": updated_configs,
                },
            )
            
            return {
                "success": True,
                "updated_count": len(updated_configs),
                "updated_configs": updated_configs,
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to update configurations: {str(e)}")
    
    @staticmethod
    def _validate_config_value(config_key: str, value: str):
        """Validate configuration value based on config type."""
        
        # Boolean configurations
        boolean_configs = [
            "maintenance_mode",
            "allow_new_registrations",
            "enable_transaction_processing",
            "enable_certificate_issuance",
            "enable_system_alerts",
            "enable_admin_notifications",
            "enable_transaction_notifications",
            "enable_security_alerts",
        ]
        
        if config_key in boolean_configs:
            if value.lower() not in ["true", "false"]:
                raise ValueError(f"{config_key} must be 'true' or 'false'")
            return
        
        # Integer configurations with minimum/maximum values
        integer_configs = {
            "default_transaction_limit": (100, 100000),
            "high_value_threshold": (1000, 1000000),
            "manager_approval_threshold": (1000, 1000000),
            "daily_transaction_limit": (1000, 10000000),
            "session_timeout_minutes": (5, 480),
            "concurrent_session_limit": (1, 10),
            "session_idle_timeout": (5, 120),
        }
        
        if config_key in integer_configs:
            try:
                int_value = int(value)
                min_val, max_val = integer_configs[config_key]
                if not (min_val <= int_value <= max_val):
                    raise ValueError(
                        f"{config_key} must be between {min_val} and {max_val}"
                    )
            except ValueError as e:
                if "invalid literal" in str(e):
                    raise ValueError(f"{config_key} must be a valid integer")
                raise
            return
        
        # If we get here, it's a valid config but no specific validation
        if not value or len(value) > 1000:
            raise ValueError("Configuration value must be between 1 and 1000 characters")
    
    @staticmethod
    def get_config_summary() -> Dict[str, Any]:
        """Get a summary of system configuration status."""
        total = SystemConfig.query.count()
        active = SystemConfig.query.filter_by(is_active=True).count()
        
        categories = db.session.query(
            SystemConfig.config_category,
            db.func.count(SystemConfig.id)
        ).group_by(SystemConfig.config_category).all()
        
        category_counts = {cat: count for cat, count in categories}
        
        # Get recently updated configurations
        recent_updates = SystemConfig.query.order_by(
            SystemConfig.updated_at.desc()
        ).limit(5).all()
        
        return {
            "total_configs": total,
            "active_configs": active,
            "category_counts": category_counts,
            "recent_updates": [c.to_dict() for c in recent_updates],
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
