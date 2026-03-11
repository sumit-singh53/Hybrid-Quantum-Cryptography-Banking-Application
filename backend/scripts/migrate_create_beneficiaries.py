"""
Migration: Create beneficiaries table
Creates table for customer beneficiary management.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config.database import db
from app.models.beneficiary_model import Beneficiary
from app.main import create_app
from sqlalchemy import text


def migrate_create_beneficiaries():
    """Create beneficiaries table."""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔄 Starting migration: Create beneficiaries table...")
            
            # Check if table already exists
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            if 'beneficiaries' in tables:
                print("  ℹ beneficiaries table already exists")
                print("✅ No migration needed")
                return
            
            # Create table
            db.create_all()
            print("  ✓ Created beneficiaries table")
            
            # Verify table was created
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            if 'beneficiaries' in tables:
                columns = [col['name'] for col in inspector.get_columns('beneficiaries')]
                print(f"  ✓ Table verified with {len(columns)} columns:")
                for col in columns:
                    print(f"    - {col}")
                print("\n✅ Migration completed successfully!")
            else:
                print("❌ Table creation failed")
                
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            db.session.rollback()
            raise


if __name__ == "__main__":
    migrate_create_beneficiaries()
