#!/usr/bin/env python3
"""
Script to link existing User records to Customer records via customer_id.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import create_app
from app.config.database import db
from app.models.user_model import User
from app.models.customer_model import Customer

def link_users_to_customers():
    app = create_app()
    
    with app.app_context():
        print("Linking User records to Customer records...")
        
        # Get all customers
        customers = Customer.query.all()
        linked_count = 0
        
        for customer in customers:
            # Try to find user by username (derived from customer name)
            potential_username = customer.name.lower().replace(" ", "_")[:100]
            user = User.query.filter_by(username=potential_username).first()
            
            # Also try variations
            if not user:
                # Try with dots instead of underscores
                potential_username2 = customer.name.lower().replace(" ", ".")[:100]
                user = User.query.filter_by(username=potential_username2).first()
            
            if user and not user.customer_id:
                user.customer_id = customer.id
                linked_count += 1
                print(f"  ✓ Linked User '{user.username}' to Customer '{customer.name}' (ID: {customer.id})")
        
        if linked_count > 0:
            db.session.commit()
            print(f"\n✓ Successfully linked {linked_count} users to customers")
        else:
            print("\n✓ No users needed linking")

if __name__ == "__main__":
    link_users_to_customers()
