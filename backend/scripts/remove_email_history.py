#!/usr/bin/env python3
"""
Migration script to remove email_history column from users table.
Email history feature is being removed - users should only have one email at a time.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import create_app
from app.config.database import db

def remove_email_history():
    """Remove email_history column from users table."""
    app = create_app()
    
    with app.app_context():
        # Check if column exists
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'email_history' not in columns:
            print("✓ email_history column does not exist in users table")
            return
        
        print("Removing email_history column from users table...")
        
        # SQLite doesn't support DROP COLUMN directly, need to recreate table
        # But since we're using SQLAlchemy, we can use raw SQL with a workaround
        try:
            # For SQLite, we need to recreate the table without the column
            with db.engine.connect() as conn:
                # Create a new table without email_history
                conn.execute(db.text("""
                    CREATE TABLE users_new (
                        id INTEGER PRIMARY KEY,
                        username VARCHAR(100) UNIQUE NOT NULL,
                        full_name VARCHAR(150) NOT NULL,
                        email VARCHAR(150) UNIQUE,
                        mobile VARCHAR(15) NOT NULL,
                        address TEXT,
                        aadhar VARCHAR(12),
                        pan VARCHAR(10),
                        customer_id VARCHAR(64),
                        role_id INTEGER NOT NULL,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME,
                        FOREIGN KEY (role_id) REFERENCES roles(id)
                    )
                """))
                
                # Copy data from old table to new table
                conn.execute(db.text("""
                    INSERT INTO users_new 
                    (id, username, full_name, email, mobile, address, aadhar, pan, customer_id, role_id, is_active, created_at)
                    SELECT id, username, full_name, email, mobile, address, aadhar, pan, customer_id, role_id, is_active, created_at
                    FROM users
                """))
                
                # Drop old table
                conn.execute(db.text("DROP TABLE users"))
                
                # Rename new table to users
                conn.execute(db.text("ALTER TABLE users_new RENAME TO users"))
                
                conn.commit()
            
            print("✓ Successfully removed email_history column")
        except Exception as e:
            print(f"✗ Error removing email_history column: {e}")
            raise

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Remove email_history from users table")
    print("=" * 60)
    remove_email_history()
    print("=" * 60)
