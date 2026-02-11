"""
Test System Configuration
--------------------------
Tests for system configuration management endpoints.
"""

import pytest
from app.models.system_config_model import SystemConfig
from app.services.system_config_service import SystemConfigService


def test_initialize_default_configs(app_with_db):
    """Test initialization of default configurations."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        # Check that configs were created
        configs = SystemConfig.query.all()
        assert len(configs) > 0
        
        # Check specific configs exist
        maintenance_mode = SystemConfig.query.filter_by(
            config_key="maintenance_mode"
        ).first()
        assert maintenance_mode is not None
        assert maintenance_mode.config_value == "false"


def test_get_all_configs(app_with_db):
    """Test retrieving all configurations."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        result = SystemConfigService.get_all_configs()
        
        assert "configs" in result
        assert "total_count" in result
        assert "categories" in result
        assert result["total_count"] > 0
        assert len(result["categories"]) > 0


def test_get_config_by_key(app_with_db):
    """Test retrieving a specific configuration."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        config = SystemConfigService.get_config_by_key("session_timeout_minutes")
        
        assert config is not None
        assert config["config_key"] == "session_timeout_minutes"
        assert config["config_value"] == "30"
        assert config["config_category"] == "session"


def test_update_config(app_with_db):
    """Test updating a configuration."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        # Update config
        updated = SystemConfigService.update_config(
            config_key="session_timeout_minutes",
            new_value="45",
            admin_username="test_admin"
        )
        
        assert updated["config_value"] == "45"
        assert updated["updated_by"] == "test_admin"
        
        # Verify update persisted
        config = SystemConfigService.get_config_by_key("session_timeout_minutes")
        assert config["config_value"] == "45"


def test_validate_boolean_config(app_with_db):
    """Test validation of boolean configurations."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        # Valid boolean
        SystemConfigService.update_config(
            config_key="maintenance_mode",
            new_value="true",
            admin_username="test_admin"
        )
        
        # Invalid boolean should raise error
        with pytest.raises(ValueError):
            SystemConfigService.update_config(
                config_key="maintenance_mode",
                new_value="invalid",
                admin_username="test_admin"
            )


def test_validate_integer_config(app_with_db):
    """Test validation of integer configurations."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        # Valid integer within range
        SystemConfigService.update_config(
            config_key="session_timeout_minutes",
            new_value="60",
            admin_username="test_admin"
        )
        
        # Invalid integer (out of range)
        with pytest.raises(ValueError):
            SystemConfigService.update_config(
                config_key="session_timeout_minutes",
                new_value="1000",
                admin_username="test_admin"
            )
        
        # Invalid integer (not a number)
        with pytest.raises(ValueError):
            SystemConfigService.update_config(
                config_key="session_timeout_minutes",
                new_value="not_a_number",
                admin_username="test_admin"
            )


def test_bulk_update_configs(app_with_db):
    """Test bulk updating multiple configurations."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        updates = [
            {"config_key": "session_timeout_minutes", "config_value": "60"},
            {"config_key": "maintenance_mode", "config_value": "true"},
        ]
        
        result = SystemConfigService.update_multiple_configs(
            updates=updates,
            admin_username="test_admin"
        )
        
        assert result["success"] is True
        assert result["updated_count"] == 2
        
        # Verify updates
        session_config = SystemConfigService.get_config_by_key("session_timeout_minutes")
        assert session_config["config_value"] == "60"
        
        maintenance_config = SystemConfigService.get_config_by_key("maintenance_mode")
        assert maintenance_config["config_value"] == "true"


def test_bulk_update_atomic(app_with_db):
    """Test that bulk updates are atomic (all or nothing)."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        # One valid, one invalid update
        updates = [
            {"config_key": "session_timeout_minutes", "config_value": "60"},
            {"config_key": "maintenance_mode", "config_value": "invalid_boolean"},
        ]
        
        # Should fail and rollback all changes
        with pytest.raises(Exception):
            SystemConfigService.update_multiple_configs(
                updates=updates,
                admin_username="test_admin"
            )
        
        # Verify first update was rolled back
        session_config = SystemConfigService.get_config_by_key("session_timeout_minutes")
        assert session_config["config_value"] == "30"  # Original value


def test_get_config_summary(app_with_db):
    """Test getting configuration summary."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        summary = SystemConfigService.get_config_summary()
        
        assert "total_configs" in summary
        assert "active_configs" in summary
        assert "category_counts" in summary
        assert "recent_updates" in summary
        assert summary["total_configs"] > 0
        assert summary["active_configs"] > 0


def test_get_configs_by_category(app_with_db):
    """Test getting configurations by category."""
    with app_with_db.app_context():
        SystemConfigService.initialize_default_configs()
        
        transaction_configs = SystemConfigService.get_configs_by_category("transaction")
        
        assert len(transaction_configs) > 0
        for config in transaction_configs:
            assert config["config_category"] == "transaction"
