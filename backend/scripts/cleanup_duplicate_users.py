#!/usr/bin/env python3
"""
Script to cleanup duplicate user records.
Keeps only users that are linked to customers (have customer_id).
Deletes orphan users that don't have customer_id.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import create_app
from app.config.database import db
from app.models.user_model import User

def cleanup_duplicate_users():
    app = create_app()
    
    with app.app_context():
        print("Finding duplicate/orphan user records...")
        
        # Find users without customer_id (orphan users)
        orphan_users = User.query.filter(User.customer_id.is_(None)).all()
        
        if not orphan_users:
            print("✓ No orphan users found")
            return
        
        print(f"\nFound {len(orphan_users)} orphan users (without customer_id):")
        for user in orphan_users:
            print(f"  ID={user.id}, username={user.username}, email={user.email}")
        
        # Ask for confirmation
        response = input("\nDo you want to delete these orphan users? (yes/no): ")
        
        if response.lower() != 'yes':
            print("✗ Cleanup cancelled")
            return
        
        # Delete orphan users
        deleted_count = 0
        for user in orphan_users:
            print(f"  Deleting user ID={user.id}, username={user.username}, email={user.email}")
            db.session.delete(user)
            deleted_count += 1
        
        db.session.commit()
        print(f"\n✓ Successfully deleted {deleted_count} orphan users")
        
        # Show remaining users
        print("\nRemaining users:")
        remaining_users = User.query.all()
        for user in remaining_users:
            print(f"  ID={user.id}, username={user.username}, email={user.email}, customer_id={user.customer_id}")

if __name__ == "__main__":
    cleanup_duplicate_users()
