#!/usr/bin/env python3
"""
Migration script to create User records for existing customers.
This ensures all customers appear in the admin panel.
"""
import sqlite3
import sys

def migrate_customers():
    conn = sqlite3.connect('instance/pq_banking.db')
    cursor = conn.cursor()

    try:
        # Get all customers
        cursor.execute("SELECT id, name FROM customers")
        customers = cursor.fetchall()
        
        if not customers:
            print("No customers found in database")
            return 0

        # Get customer role ID
        cursor.execute("SELECT id FROM roles WHERE LOWER(name) = 'customer'")
        role_result = cursor.fetchone()
        if not role_result:
            print("Error: Customer role not found in database")
            sys.exit(1)
        role_id = role_result[0]

        fixed = 0
        for customer_id, customer_name in customers:
            # Check if User record exists
            cursor.execute("SELECT id FROM users WHERE username = ?", (customer_id,))
            if cursor.fetchone():
                continue  # User record already exists
            
            # Create User record
            email = f"{customer_id}@temp.local"
            cursor.execute(
                "INSERT INTO users (username, full_name, email, role_id, is_active, created_at) "
                "VALUES (?, ?, ?, ?, 1, datetime('now'))",
                (customer_id, customer_name, email, role_id)
            )
            fixed += 1
            print(f"✓ Created User record for: {customer_name} ({customer_id})")

        conn.commit()
        print(f"\n{'='*60}")
        print(f"Migration complete! Fixed {fixed} customer(s)")
        print(f"{'='*60}")
        return fixed
        
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_customers()
