"""
Migration: Add account_type and branch_code to customers table
Adds new fields for enhanced account summary functionality.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config.database import db
from app.models.customer_model import Customer, AccountType
from app.main import create_app
from sqlalchemy import text


def migrate_add_account_fields():
    """Add account_type and branch_code columns to customers table."""
    app = create_app()
    
    with app.app_context():
        print("🔄 Starting migration: Add account_type and branch_code to customers")
        
        # Check if columns already exist
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('customers')]
        
        needs_migration = False
        
        if 'account_type' not in columns:
            print("  ➕ Adding account_type column...")
            needs_migration = True
        else:
            print("  ✓ account_type column already exists")
        
        if 'branch_code' not in columns:
            print("  ➕ Adding branch_code column...")
            needs_migration = True
        else:
            print("  ✓ branch_code column already exists")
        
        if needs_migration:
            try:
                # Add columns using raw SQL
                if 'account_type' not in columns:
                    # SQLite doesn't support ENUM directly, uses TEXT with CHECK constraint
                    db.session.execute(text(
                        "ALTER TABLE customers ADD COLUMN account_type VARCHAR(20) DEFAULT 'SAVINGS'"
                    ))
                    db.session.commit()
                    print("  ✓ Added account_type column")
                
                if 'branch_code' not in columns:
                    db.session.execute(text(
                        "ALTER TABLE customers ADD COLUMN branch_code VARCHAR(32) DEFAULT 'MUM-HQ'"
                    ))
                    db.session.commit()
                    print("  ✓ Added branch_code column")
                
                # Update existing records with default values
                customers = Customer.query.all()
                for customer in customers:
                    if not hasattr(customer, 'account_type') or customer.account_type is None:
                        customer.account_type = AccountType.SAVINGS
                    if not hasattr(customer, 'branch_code') or customer.branch_code is None:
                        customer.branch_code = 'MUM-HQ'
                
                db.session.commit()
                print(f"  ✓ Updated {len(customers)} existing customer records")
                
                print("✅ Migration completed successfully!")
                
            except Exception as e:
                print(f"❌ Migration failed: {e}")
                db.session.rollback()
                raise
        else:
            print("✅ No migration needed - all columns exist")


if __name__ == "__main__":
    migrate_add_account_fields()
