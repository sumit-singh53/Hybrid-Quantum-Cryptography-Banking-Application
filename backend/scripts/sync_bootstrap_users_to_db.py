"""
Migration script to sync bootstrap users (admin, auditor, manager) to database
This ensures they appear in User Management and Role counts
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import create_app
from app.config.database import db
from app.models.user_model import User
from app.models.role_model import Role
from sqlalchemy import func


def sync_bootstrap_users():
    """Add bootstrap users to database if they don't exist"""
    app = create_app()
    with app.app_context():
        print("🔄 Starting bootstrap users sync to database...")
        print("=" * 60)
        
        # Define bootstrap users
        bootstrap_users = [
            {
                "username": "admin",
                "full_name": "System Administrator",
                "email": "admin@pqcbank.local",
                "mobile": "0000000001",
                "role_name": "system_admin",
                "address": "System Bootstrap User",
            },
            {
                "username": "auditor-local",
                "full_name": "Auditor Clerk",
                "email": "auditor@pqcbank.local",
                "mobile": "0000000002",
                "role_name": "auditor_clerk",
                "address": "System Bootstrap User",
            },
            {
                "username": "manager-local",
                "full_name": "Branch Manager",
                "email": "manager@pqcbank.local",
                "mobile": "0000000003",
                "role_name": "manager",
                "address": "System Bootstrap User",
            },
        ]
        
        added_count = 0
        skipped_count = 0
        
        for user_data in bootstrap_users:
            # Check if user already exists
            existing_user = (
                User.query.filter(
                    func.lower(User.username) == user_data["username"].lower()
                )
                .first()
            )
            
            if existing_user:
                print(f"  ℹ User '{user_data['username']}' already exists - skipping")
                skipped_count += 1
                continue
            
            # Get role
            role = (
                Role.query.filter(
                    func.lower(Role.name) == user_data["role_name"].lower()
                )
                .first()
            )
            
            if not role:
                print(f"  ❌ Role '{user_data['role_name']}' not found - skipping user '{user_data['username']}'")
                continue
            
            # Create user
            new_user = User(
                username=user_data["username"],
                full_name=user_data["full_name"],
                email=user_data["email"],
                mobile=user_data["mobile"],
                address=user_data["address"],
                role=role,
                is_active=True,
            )
            
            db.session.add(new_user)
            print(f"  ✓ Added user '{user_data['username']}' with role '{user_data['role_name']}'")
            added_count += 1
        
        if added_count > 0:
            db.session.commit()
            print(f"\n✅ Successfully added {added_count} bootstrap user(s) to database")
        else:
            print(f"\n✅ All bootstrap users already exist in database")
        
        if skipped_count > 0:
            print(f"  ℹ Skipped {skipped_count} existing user(s)")
        
        # Show final counts
        print("\n" + "=" * 60)
        print("FINAL USER COUNTS BY ROLE:")
        print("=" * 60)
        
        roles = db.session.query(Role).order_by(Role.id).all()
        for role in roles:
            user_count = len(role.users)
            print(f"  {role.name:20} - {user_count} user(s)")
        
        total_users = db.session.query(User).count()
        print(f"\n  Total users in database: {total_users}")
        print("=" * 60)


if __name__ == "__main__":
    sync_bootstrap_users()
