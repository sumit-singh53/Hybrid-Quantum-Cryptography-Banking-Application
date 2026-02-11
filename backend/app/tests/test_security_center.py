"""
Tests for Customer Security Center
"""
import pytest
from app.services.customer_security_service import CustomerSecurityService


class TestCustomerSecurityService:
    """Test suite for Customer Security Service"""

    def test_mask_sensitive_id(self):
        """Test ID masking functionality"""
        # Test normal case
        masked = CustomerSecurityService._mask_sensitive_id("1234567890", 4)
        assert masked == "****7890"
        
        # Test short ID
        masked = CustomerSecurityService._mask_sensitive_id("123", 4)
        assert masked == "****"
        
        # Test empty ID
        masked = CustomerSecurityService._mask_sensitive_id("", 4)
        assert masked == "****"

    def test_format_location(self):
        """Test location formatting"""
        # Test with city and country
        location = {"city": "Mumbai", "country": "India"}
        formatted = CustomerSecurityService._format_location(location)
        assert formatted == "Mumbai, India"
        
        # Test with only city
        location = {"city": "Mumbai"}
        formatted = CustomerSecurityService._format_location(location)
        assert formatted == "Mumbai"
        
        # Test with only IP
        location = {"ip": "192.168.1.1"}
        formatted = CustomerSecurityService._format_location(location)
        assert formatted == "IP: 192.168.1.1"
        
        # Test with empty location
        location = {}
        formatted = CustomerSecurityService._format_location(location)
        assert formatted == "Location unavailable"

    def test_get_alert_severity(self):
        """Test alert severity mapping"""
        assert CustomerSecurityService._get_alert_severity("device_mismatch") == "HIGH"
        assert CustomerSecurityService._get_alert_severity("certificate_expiring") == "MEDIUM"
        assert CustomerSecurityService._get_alert_severity("unknown_event") == "LOW"

    def test_format_alert_message(self):
        """Test alert message formatting"""
        # Test basic message
        message = CustomerSecurityService._format_alert_message("device_mismatch", {})
        assert "Device binding mismatch" in message
        
        # Test with metadata reason
        metadata = {"reason": "Device ID changed"}
        message = CustomerSecurityService._format_alert_message("device_mismatch", metadata)
        assert "Device ID changed" in message


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
