"""
Script to check role user counts
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import create_app
from app.config.database import db
from app.models.role_model import Role
from app.models.user_model import User
from sqlalchemy import func


def check_role_users():
    """Check role user counts"""
    app = create_app()
    with app.app_context():
        print("=" * 60)
        print("ROLE USER COUNT CHECK")
        print("=" * 60)
        
        # Method 1: Using relationship
        print("\n1. Using Role.users relationship:")
        roles = db.session.query(Role).all()
        for role in roles:
            user_count = len(role.users)
            print(f"   Role: {role.name:20} (ID: {role.id}) - Users: {user_count}")
        
        # Method 2: Using join query (same as RoleService)
        print("\n2. Using JOIN query (RoleService method):")
        rows = (
            db.session.query(Role, func.count(User.id).label("user_count"))
            .outerjoin(User, User.role_id == Role.id)
            .group_by(Role.id)
            .order_by(Role.id)
            .all()
        )
        for role, user_count in rows:
            print(f"   Role: {role.name:20} (ID: {role.id}) - Users: {user_count}")
        
        # Method 3: Direct user query
        print("\n3. All users in database:")
        users = db.session.query(User).all()
        print(f"   Total users: {len(users)}")
        for user in users:
            role_name = user.role.name if user.role else "None"
            print(f"   - {user.username:20} -> Role: {role_name}")
        
        # Method 4: Count by role_id
        print("\n4. User count by role_id:")
        role_counts = (
            db.session.query(User.role_id, func.count(User.id))
            .group_by(User.role_id)
            .all()
        )
        for role_id, count in role_counts:
            role = db.session.query(Role).get(role_id)
            role_name = role.name if role else "Unknown"
            print(f"   Role ID {role_id} ({role_name}): {count} users")
        
        print("\n" + "=" * 60)


if __name__ == "__main__":
    check_role_users()
