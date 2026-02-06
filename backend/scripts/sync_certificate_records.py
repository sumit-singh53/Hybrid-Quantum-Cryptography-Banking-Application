"""
Script to create Certificate database records for existing users
This links UUID certificate IDs to User records in the database
"""
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.config.database import db
from app.models.user_model import User
from app.models.certificate_model import Certificate
from app.models.customer_model import Customer
from app.models.role_model import Role

def sync_certificates():
    """Create Certificate records for all customers that don't have them"""
    app = create_app()
    
    with app.app_context():
        # Get all customers
        customers = Customer.query.all()
        print(f"Found {len(customers)} customers")
        
        # Get all users
        users = User.query.all()
        print(f"Found {len(users)} users")
        
        created_count = 0
        for customer in customers:
            certificate_id = customer.id
            
            # Check if certificate record already exists
            existing_cert = Certificate.query.filter_by(certificate_id=certificate_id).first()
            if existing_cert:
                print(f"Certificate already exists for {customer.name} (ID: {certificate_id})")
                continue
            
            # Try to find matching user by name
            matching_user = None
            for user in users:
                if user.full_name.lower() == customer.name.lower():
                    matching_user = user
                    break
            
            if matching_user:
                print(f"Creating certificate record for customer {customer.name}")
                cert = Certificate(
                    certificate_id=certificate_id,
                    user_id=matching_user.id,
                    issued_by="CA",
                    algorithm="RSA+Dilithium",
                    valid_from=datetime.utcnow(),
                    valid_to=datetime.utcnow() + timedelta(days=365),
                    is_revoked=False
                )
                db.session.add(cert)
                created_count += 1
                print(f"  -> Linked UUID {certificate_id} to User {matching_user.username} (ID: {matching_user.id})")
            else:
                print(f"WARNING: No matching user found for customer {customer.name}")
        
        db.session.commit()
        print(f"\nCreated {created_count} certificate records")
        
        # Verify
        print("\nVerification:")
        all_certs = Certificate.query.all()
        for cert in all_certs:
            print(f"Certificate {cert.certificate_id} -> User {cert.user.username} ({cert.user.email})")

if __name__ == "__main__":
    sync_certificates()
