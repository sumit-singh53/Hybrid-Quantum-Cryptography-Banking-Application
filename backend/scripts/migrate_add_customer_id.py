#!/usr/bin/env python3
"""
Migration script to add customer_id field to users table.
This links User records to Customer records.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import create_app
from app.config.database import db

def migrate():
    app = create_app()
    
    with app.app_context():
        # Check if column already exists
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'customer_id' in columns:
            print("✓ customer_id column already exists in users table")
            return
        
        print("Adding customer_id column to users table...")
        
        # Add customer_id column
        with db.engine.connect() as conn:
            conn.execute(db.text("""
                ALTER TABLE users 
                ADD COLUMN customer_id VARCHAR(64) NULL
            """))
            conn.commit()
        
        print("✓ customer_id column added successfully")
        print("\nNote: You may need to manually update existing records to link users to customers.")

if __name__ == "__main__":
    migrate()
