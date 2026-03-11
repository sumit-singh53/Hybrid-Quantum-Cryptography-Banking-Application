"""
RBAC System Tests
Tests for role-based access control functionality.
"""
import pytest
from app.models.user_model import User
from app.models.role_model import Role
from app.models.permission_model import Permission
from app.services.rbac_service import RBACService
from app.security.rbac_middleware import (
    check_permission,
    check_role_hierarchy,
    get_user_permissions,
)
from app.security.rbac_permissions import (
    get_role_permissions,
    get_role_hierarchy_level,
    has_higher_privilege,
)


class TestRBACPermissions:
    """Test permission definitions and role mappings."""

    def test_customer_permissions(self):
        """Test customer role has correct permissions."""
        permissions = get_role_permissions("customer")
        assert "view_own_account" in permissions
        assert "view_own_transactions" in permissions
        assert "create_transaction" in permissions
        assert "approve_transaction" not in permissions
        assert "manage_users" not in permissions

    def test_manager_permissions(self):
        """Test manager role has correct permissions."""
        permissions = get_role_permissions("manager")
        assert "view_all_customers" in permissions
        assert "approve_transaction" in permissions
        assert "reject_transaction" in permissions
        assert "revoke_certificate" in permissions
        assert "manage_users" not in permissions

    def test_auditor_permissions(self):
        """Test auditor_clerk role has correct permissions."""
        permissions = get_role_permissions("auditor_clerk")
        assert "view_all_audit_logs" in permissions
        assert "view_all_transactions" in permissions
        assert "verify_transaction_integrity" in permissions
        assert "export_audit_reports" in permissions
        assert "approve_transaction" not in permissions
        assert "manage_users" not in permissions

    def test_system_admin_permissions(self):
        """Test system_admin role has correct permissions."""
        permissions = get_role_permissions("system_admin")
        assert "manage_users" in permissions
        assert "manage_roles" in permissions
        assert "issue_certificate" in permissions
        assert "manage_crl" in permissions
        assert "kill_sessions" in permissions
        assert len(permissions) >= 15


class TestRoleHierarchy:
    """Test role hierarchy levels."""

    def test_hierarchy_levels(self):
        """Test role hierarchy levels are correct."""
        assert get_role_hierarchy_level("customer") == 1
        assert get_role_hierarchy_level("manager") == 2
        assert get_role_hierarchy_level("auditor_clerk") == 3
        assert get_role_hierarchy_level("system_admin") == 4

    def test_privilege_comparison(self):
        """Test privilege comparison between roles."""
        assert has_higher_privilege("system_admin", "customer")
        assert has_higher_privilege("manager", "customer")
        assert has_higher_privilege("auditor_clerk", "manager")
        assert not has_higher_privilege("customer", "manager")
        assert not has_higher_privilege("manager", "system_admin")


class TestRBACMiddleware:
    """Test RBAC middleware functions."""

    def test_check_permission(self):
        """Test permission checking utility."""
        assert check_permission("customer", "view_own_account")
        assert check_permission("manager", "approve_transaction")
        assert check_permission("auditor_clerk", "view_all_audit_logs")
        assert check_permission("system_admin", "manage_users")
        
        assert not check_permission("customer", "approve_transaction")
        assert not check_permission("manager", "manage_users")
        assert not check_permission("auditor_clerk", "approve_transaction")

    def test_check_role_hierarchy(self):
        """Test role hierarchy checking."""
        assert check_role_hierarchy("system_admin", "customer")
        assert check_role_hierarchy("manager", "customer")
        assert not check_role_hierarchy("customer", "manager")

    def test_get_user_permissions(self):
        """Test getting all permissions for a role."""
        customer_perms = get_user_permissions("customer")
        assert len(customer_perms) == 5
        
        admin_perms = get_user_permissions("system_admin")
        assert len(admin_perms) >= 15


class TestRBACService:
    """Test RBAC service operations."""

    def test_get_role_with_permissions(self, app):
        """Test retrieving role with permissions."""
        with app.app_context():
            role_data = RBACService.get_role_with_permissions("customer")
            assert role_data is not None
            assert role_data["name"] == "customer"
            assert role_data["hierarchy_level"] == 1
            assert len(role_data["permissions"]) == 5

    def test_get_all_roles_with_permissions(self, app):
        """Test retrieving all roles."""
        with app.app_context():
            roles = RBACService.get_all_roles_with_permissions()
            assert len(roles) == 4
            
            # Verify roles are ordered by hierarchy
            assert roles[0]["hierarchy_level"] >= roles[-1]["hierarchy_level"]

    def test_get_all_permissions(self, app):
        """Test retrieving all permissions."""
        with app.app_context():
            permissions = RBACService.get_all_permissions()
            assert len(permissions) >= 27
            
            # Verify permission structure
            for perm in permissions:
                assert "name" in perm
                assert "resource" in perm
                assert "action" in perm


class TestPermissionEnforcement:
    """Test permission enforcement in routes."""

    def test_customer_cannot_access_manager_endpoint(self, client):
        """Test customer cannot access manager-only endpoints."""
        response = client.get(
            "/api/manager/dashboard",
            headers={
                "X-Test-Role": "customer",
                "X-Test-User-Id": "test-customer",
            },
        )
        assert response.status_code == 403

    def test_customer_cannot_access_admin_endpoint(self, client):
        """Test customer cannot access admin-only endpoints."""
        response = client.get(
            "/api/system-admin/dashboard",
            headers={
                "X-Test-Role": "customer",
                "X-Test-User-Id": "test-customer",
            },
        )
        assert response.status_code == 403

    def test_manager_can_access_manager_endpoint(self, client):
        """Test manager can access manager endpoints."""
        response = client.get(
            "/api/manager/dashboard",
            headers={
                "X-Test-Role": "manager",
                "X-Test-User-Id": "test-manager",
                "X-Test-Actions": "APPROVE_TRANSACTION",
            },
        )
        assert response.status_code == 200

    def test_auditor_cannot_approve_transactions(self, client):
        """Test auditor cannot approve transactions."""
        response = client.post(
            "/api/manager/transactions/test-tx/decision",
            headers={
                "X-Test-Role": "auditor_clerk",
                "X-Test-User-Id": "test-auditor",
            },
            json={"action": "approve"},
        )
        assert response.status_code == 403


class TestSeparationOfDuties:
    """Test separation of duties principle."""

    def test_customer_cannot_approve_own_transactions(self):
        """Test customers cannot approve their own transactions."""
        customer_perms = get_role_permissions("customer")
        assert "approve_transaction" not in customer_perms

    def test_auditor_cannot_modify_data(self):
        """Test auditors have read-only access."""
        auditor_perms = get_role_permissions("auditor_clerk")
        
        # Auditors can view
        assert "view_all_audit_logs" in auditor_perms
        assert "view_all_transactions" in auditor_perms
        
        # But cannot modify
        assert "approve_transaction" not in auditor_perms
        assert "create_transaction" not in auditor_perms
        assert "manage_users" not in auditor_perms

    def test_manager_cannot_access_system_admin_functions(self):
        """Test managers cannot access system admin functions."""
        manager_perms = get_role_permissions("manager")
        assert "manage_users" not in manager_perms
        assert "manage_roles" not in manager_perms
        assert "rotate_ca_keys" not in manager_perms


class TestLeastPrivilege:
    """Test least privilege principle."""

    def test_customer_has_minimal_permissions(self):
        """Test customer has only necessary permissions."""
        customer_perms = get_role_permissions("customer")
        assert len(customer_perms) == 5
        
        # Only own-resource access
        for perm in customer_perms:
            assert "own" in perm or perm == "create_transaction"

    def test_no_role_has_unnecessary_permissions(self):
        """Test each role has appropriate permission count."""
        customer_perms = get_role_permissions("customer")
        manager_perms = get_role_permissions("manager")
        auditor_perms = get_role_permissions("auditor_clerk")
        admin_perms = get_role_permissions("system_admin")
        
        # Customer has least
        assert len(customer_perms) < len(manager_perms)
        assert len(customer_perms) < len(auditor_perms)
        assert len(customer_perms) < len(admin_perms)
        
        # Admin has most
        assert len(admin_perms) > len(manager_perms)
        assert len(admin_perms) > len(auditor_perms)


class TestFailSafeDefaults:
    """Test fail-safe defaults principle."""

    def test_unknown_role_has_no_permissions(self):
        """Test unknown roles have no permissions."""
        unknown_perms = get_role_permissions("unknown_role")
        assert len(unknown_perms) == 0

    def test_empty_role_has_no_permissions(self):
        """Test empty role string has no permissions."""
        empty_perms = get_role_permissions("")
        assert len(empty_perms) == 0

    def test_none_role_has_no_permissions(self):
        """Test None role has no permissions."""
        none_perms = get_role_permissions("none")
        assert len(none_perms) == 0


# Pytest fixtures
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
