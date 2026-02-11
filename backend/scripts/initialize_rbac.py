#!/usr/bin/env python3
"""
RBAC Initialization Script
Initializes the Role-Based Access Control system with default roles and permissions.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import create_app
from app.services.rbac_service import RBACService


def main():
    """Initialize RBAC system."""
    print("=" * 60)
    print("RBAC System Initialization")
    print("=" * 60)
    
    app = create_app()
    
    with app.app_context():
        print("\n[1/3] Initializing permissions...")
        try:
            result = RBACService.initialize_rbac()
            
            print(f"✓ Permissions created: {result['permissions_created']}")
            print(f"✓ Roles created: {result['roles_created']}")
            print(f"✓ Role-permission assignments: {result['assignments_created']}")
            print(f"\n{result['status']}")
            
            print("\n[2/3] Verifying role configuration...")
            roles = RBACService.get_all_roles_with_permissions()
            
            for role in roles:
                print(f"\n  Role: {role['name']}")
                print(f"  Level: {role['hierarchy_level']}")
                print(f"  Permissions: {role['permission_count']}")
                print(f"  Description: {role['description']}")
            
            print("\n[3/3] Listing all permissions...")
            permissions = RBACService.get_all_permissions()
            
            # Group by resource
            by_resource = {}
            for perm in permissions:
                resource = perm['resource']
                if resource not in by_resource:
                    by_resource[resource] = []
                by_resource[resource].append(perm)
            
            for resource, perms in sorted(by_resource.items()):
                print(f"\n  Resource: {resource}")
                for perm in perms:
                    print(f"    - {perm['name']} ({perm['action']})")
            
            print("\n" + "=" * 60)
            print("RBAC System Initialized Successfully!")
            print("=" * 60)
            print("\nRole Hierarchy:")
            print("  1. customer       - Basic account access")
            print("  2. manager        - Branch management and approvals")
            print("  3. auditor_clerk  - System-wide audit access")
            print("  4. system_admin   - Full system administration")
            print("\nSecurity Principles:")
            print("  ✓ Least Privilege")
            print("  ✓ Separation of Duties")
            print("  ✓ Defense in Depth")
            print("  ✓ Fail-Safe Defaults")
            print("\n")
            
        except Exception as e:
            print(f"\n✗ Error initializing RBAC: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    main()
