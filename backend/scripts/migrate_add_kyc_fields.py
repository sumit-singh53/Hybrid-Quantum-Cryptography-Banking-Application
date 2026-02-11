"""
Migration script to add KYC-related fields to User model.
Run this script to add KYC verification fields to the users table.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.config.database import db
from app.models.user_model import User
from sqlalchemy import text


def migrate_add_kyc_fields():
    """Add KYC-related fields to users table."""
    print("🔄 Starting KYC fields migration...")
    
    try:
        # Check if columns already exist
        inspector = db.inspect(db.engine)
        existing_columns = [col['name'] for col in inspector.get_columns('users')]
        
        columns_to_add = []
        
        if 'kyc_status' not in existing_columns:
            columns_to_add.append(
                "ALTER TABLE users ADD COLUMN kyc_status VARCHAR(20) DEFAULT 'pending'"
            )
        
        if 'kyc_submitted_at' not in existing_columns:
            columns_to_add.append(
                "ALTER TABLE users ADD COLUMN kyc_submitted_at VARCHAR(50)"
            )
        
        if 'kyc_verified_at' not in existing_columns:
            columns_to_add.append(
                "ALTER TABLE users ADD COLUMN kyc_verified_at VARCHAR(50)"
            )
        
        if 'kyc_verified_by' not in existing_columns:
            columns_to_add.append(
                "ALTER TABLE users ADD COLUMN kyc_verified_by VARCHAR(100)"
            )
        
        if 'kyc_remarks' not in existing_columns:
            columns_to_add.append(
                "ALTER TABLE users ADD COLUMN kyc_remarks TEXT"
            )
        
        if 'kyc_documents' not in existing_columns:
            columns_to_add.append(
                "ALTER TABLE users ADD COLUMN kyc_documents TEXT"
            )
        
        if 'account_status' not in existing_columns:
            columns_to_add.append(
                "ALTER TABLE users ADD COLUMN account_status VARCHAR(20) DEFAULT 'active'"
            )
        
        if 'phone' not in existing_columns:
            columns_to_add.append(
                "ALTER TABLE users ADD COLUMN phone VARCHAR(20)"
            )
        
        if not columns_to_add:
            print("✅ All KYC fields already exist. No migration needed.")
            return
        
        # Execute migrations
        with db.engine.connect() as conn:
            for sql in columns_to_add:
                print(f"   Executing: {sql}")
                conn.execute(text(sql))
                conn.commit()
        
        print(f"✅ Successfully added {len(columns_to_add)} KYC field(s) to users table")
        
        # Update existing customer users to have pending KYC status
        from app.models.role_model import Role
        customer_role = Role.query.filter_by(name="customer").first()
        if customer_role:
            customers = User.query.filter_by(role_id=customer_role.id).all()
            for customer in customers:
                if not hasattr(customer, 'kyc_status') or not customer.kyc_status:
                    customer.kyc_status = 'pending'
            db.session.commit()
            print(f"✅ Updated {len(customers)} customer(s) with default KYC status")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.session.rollback()
        raise


if __name__ == "__main__":
    from app.main import app
    
    with app.app_context():
        migrate_add_kyc_fields()
        print("✅ KYC fields migration completed successfully!")
