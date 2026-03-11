"""
Migration script to add email_history column to users table.
This allows users to reclaim their previously used email addresses.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config.database import db
from app.main import create_app
from sqlalchemy import text

def migrate_add_email_history():
    """Add email_history column to users table."""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(text(
                "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='email_history'"
            ))
            column_exists = result.scalar() > 0
            
            if column_exists:
                print("✓ email_history column already exists in users table")
                return
            
            # Add email_history column
            print("Adding email_history column to users table...")
            db.session.execute(text(
                "ALTER TABLE users ADD COLUMN email_history TEXT"
            ))
            db.session.commit()
            print("✓ Successfully added email_history column")
            
            # Verify the column was added
            result = db.session.execute(text(
                "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='email_history'"
            ))
            if result.scalar() > 0:
                print("✓ Migration completed successfully!")
            else:
                print("✗ Migration failed - column not found after adding")
                
        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {e}")
            raise

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add email_history to users table")
    print("=" * 60)
    migrate_add_email_history()
    print("=" * 60)
