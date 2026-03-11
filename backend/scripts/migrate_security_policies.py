"""
Security Policies Migration Script
----------------------------------
Creates security_policies table and initializes default policies.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config.database import db
from app.main import create_app
from app.models.security_policy_model import SecurityPolicy
from app.services.security_policy_service import SecurityPolicyService


def migrate_security_policies():
    """Create security_policies table and initialize default policies."""
    app = create_app()
    
    with app.app_context():
        print("Creating security_policies table...")
        
        # Create table
        db.create_all()
        print("✓ Table created successfully")
        
        # Initialize default policies
        print("\nInitializing default security policies...")
        try:
            SecurityPolicyService.initialize_default_policies()
            
            # Count policies
            total = SecurityPolicy.query.count()
            print(f"✓ Initialized {total} default security policies")
            
            # Show policies by category
            categories = db.session.query(
                SecurityPolicy.policy_category,
                db.func.count(SecurityPolicy.id)
            ).group_by(SecurityPolicy.policy_category).all()
            
            print("\nPolicies by category:")
            for category, count in categories:
                print(f"  - {category}: {count} policies")
            
            print("\n✓ Migration completed successfully!")
            
        except Exception as e:
            print(f"✗ Error initializing policies: {e}")
            return False
    
    return True


if __name__ == "__main__":
    success = migrate_security_policies()
    sys.exit(0 if success else 1)
