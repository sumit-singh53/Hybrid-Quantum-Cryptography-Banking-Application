"""
Database Migration: Create certificate_requests table
Creates table for storing customer certificate requests
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config.database import db
from app.main import create_app
from app.models.certificate_request_model import CertificateRequest


def migrate_create_certificate_requests():
    """Create certificate_requests table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if table already exists
            inspector = db.inspect(db.engine)
            if "certificate_requests" in inspector.get_table_names():
                print("✓ Table 'certificate_requests' already exists")
                return
            
            # Create table
            print("Creating certificate_requests table...")
            CertificateRequest.__table__.create(db.engine)
            db.session.commit()
            
            print("✓ Successfully created certificate_requests table")
            print("\nTable structure:")
            print("  - id (Primary Key)")
            print("  - user_id (String, Indexed)")
            print("  - full_name (String)")
            print("  - role (String)")
            print("  - request_type (Enum: NEW, RENEWAL)")
            print("  - reason (Text)")
            print("  - status (Enum: PENDING, APPROVED, REJECTED)")
            print("  - reviewed_by (String, Nullable)")
            print("  - reviewed_at (DateTime, Nullable)")
            print("  - admin_notes (Text, Nullable)")
            print("  - created_at (DateTime)")
            print("  - updated_at (DateTime)")
            
        except Exception as e:
            print(f"✗ Error creating certificate_requests table: {str(e)}")
            db.session.rollback()
            raise


if __name__ == "__main__":
    print("=" * 60)
    print("Certificate Requests Table Migration")
    print("=" * 60)
    migrate_create_certificate_requests()
    print("\n" + "=" * 60)
    print("Migration completed successfully!")
    print("=" * 60)
