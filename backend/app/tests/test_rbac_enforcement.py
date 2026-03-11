"""
RBAC Enforcement Tests
Tests demonstrating strict backend permission enforcement.
"""
import pytest
from app.security.rbac_enforcer import RBACEnforcer


class TestRBACEnforcementStrict:
    """Test strict backend RBAC enforcement with zero frontend reliance."""

    def test_customer_cannot_access_manager_endpoint(self, client):
        """Customer attempting to access manager-only endpoint gets 403."""
        response = client.get(
            "/api/demo/rbac/manager-only",
            headers={
                "X-Test-Role": "customer",
                "X-Test-User-Id": "customer-123",
                "X-Test-User-Name": "Test Customer",
            },
        )
        
        assert response.status_code == 403
        data = response.get_json()
        assert "Forbidden" in data.get("error", "")
        assert "approve_transaction" in str(data.get("required_permissions", []))

    def test_manager_can_access_manager_endpoint(self, client):
        """Manager with correct permission can access endpoint."""
        response = client.get(
            "/api/demo/rbac/manager-only",
            headers={
                "X-Test-Role": "manager",
                "X-Test-User-Id": "manager-123",
                "X-Test-User-Name": "Test Manager",
                "X-Test-Actions": "APPROVE_TRANSACTION",
            },
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert "Access granted" in data.get("message", "")

    def test_auditor_cannot_approve_transactions(self, client):
        """Auditor attempting operational action gets 403."""
        response = client.get(
            "/api/demo/rbac/manager-only",
            headers={
                "X-Test-Role": "auditor_clerk",
                "X-Test-User-Id": "auditor-123",
                "X-Test-Actions": "VIEW_AUDIT",
            },
        )
        
        assert response.status_code == 403

    def test_admin_cannot_access_manager_operational_endpoint(self, client):
        """Admin without operational permission gets 403."""
        response = client.get(
            "/api/demo/rbac/manager-only",
            headers={
                "X-Test-Role": "system_admin",
                "X-Test-User-Id": "admin-123",
                "X-Test-Actions": "GLOBAL_AUDIT",
            },
        )
        
        assert response.status_code == 403

    def test_unauthenticated_access_returns_401(self, client):
        """Unauthenticated request returns 401."""
        response = client.get("/api/demo/rbac/customer-only")
        
        assert response.status_code == 401
        data = response.get_json()
        assert "Authentication required" in data.get("message", "")

    def test_multi_permission_all_requires_all(self, client):
        """Endpoint requiring ALL permissions blocks partial access."""
        # Manager has both permissions - should succeed
        response = client.post(
            "/api/demo/rbac/multi-permission-all",
            headers={
                "X-Test-Role": "manager",
                "X-Test-User-Id": "manager-123",
                "X-Test-Actions": "APPROVE_TRANSACTION",
            },
        )
        assert response.status_code == 200
        
        # Customer has neither - should fail
        response = client.post(
            "/api/demo/rbac/multi-permission-all",
            headers={
                "X-Test-Role": "customer",
                "X-Test-User-Id": "customer-123",
            },
        )
        assert response.status_code == 403

    def test_multi_permission_any_allows_partial(self, client):
        """Endpoint requiring ANY permission allows if user has one."""
        # Manager has approve_transaction
        response = client.get(
            "/api/demo/rbac/multi-permission-any",
            headers={
                "X-Test-Role": "manager",
                "X-Test-User-Id": "manager-123",
                "X-Test-Actions": "APPROVE_TRANSACTION",
            },
        )
        assert response.status_code == 200
        
        # Auditor has view_all_audit_logs
        response = client.get(
            "/api/demo/rbac/multi-permission-any",
            headers={
                "X-Test-Role": "auditor_clerk",
                "X-Test-User-Id": "auditor-123",
                "X-Test-Actions": "VIEW_AUDIT",
            },
        )
        assert response.status_code == 200
        
        # Customer has neither
        response = client.get(
            "/api/demo/rbac/multi-permission-any",
            headers={
                "X-Test-Role": "customer",
                "X-Test-User-Id": "customer-123",
            },
        )
        assert response.status_code == 403

    def test_role_enforcement_blocks_wrong_role(self, client):
        """Role-based enforcement blocks users with wrong role."""
        response = client.get(
            "/api/demo/rbac/admin-only",
            headers={
                "X-Test-Role": "manager",
                "X-Test-User-Id": "manager-123",
            },
        )
        
        assert response.status_code == 403
        data = response.get_json()
        assert "system_admin" in str(data.get("allowed_roles", []))

    def test_hierarchy_level_enforcement(self, client):
        """Hierarchy level enforcement blocks lower-level roles."""
        # Level 1 (customer) cannot access level 3 endpoint
        response = client.get(
            "/api/demo/rbac/level-3-or-higher",
            headers={
                "X-Test-Role": "customer",
                "X-Test-User-Id": "customer-123",
            },
        )
        assert response.status_code == 403
        
        # Level 2 (manager) cannot access level 3 endpoint
        response = client.get(
            "/api/demo/rbac/level-3-or-higher",
            headers={
                "X-Test-Role": "manager",
                "X-Test-User-Id": "manager-123",
            },
        )
        assert response.status_code == 403
        
        # Level 3 (auditor) can access
        response = client.get(
            "/api/demo/rbac/level-3-or-higher",
            headers={
                "X-Test-Role": "auditor_clerk",
                "X-Test-User-Id": "auditor-123",
                "X-Test-Actions": "VIEW_AUDIT",
            },
        )
        assert response.status_code == 200
        
        # Level 4 (admin) can access
        response = client.get(
            "/api/demo/rbac/level-3-or-higher",
            headers={
                "X-Test-Role": "system_admin",
                "X-Test-User-Id": "admin-123",
                "X-Test-Actions": "GLOBAL_AUDIT",
            },
        )
        assert response.status_code == 200


@pytest.fixture
def app():
    """Create application for testing."""
    from app.main import create_app
    app = create_app()
    app.config["TESTING"] = True
    app.config["TESTING_BYPASS_CERTIFICATE"] = True
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()
