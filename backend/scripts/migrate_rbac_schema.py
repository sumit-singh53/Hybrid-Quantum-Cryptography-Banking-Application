#!/usr/bin/env python3
"""
Database Migration Script for RBAC
Adds new columns and tables for RBAC system.
"""
import sys
import os
import sqlite3

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config.config import Config


def migrate_database():
    """Migrate database schema for RBAC."""
    db_path = Config.SQLALCHEMY_DATABASE_URI.replace("sqlite:///", "")
    
    print("=" * 60)
    print("RBAC Database Migration")
    print("=" * 60)
    print(f"\nDatabase: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"\n✗ Database file not found: {db_path}")
        print("Please run the application first to create the database.")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if roles table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='roles'"
        )
        if not cursor.fetchone():
            print("\n✗ Roles table not found. Please run the application first.")
            return False
        
        print("\n[1/4] Checking roles table schema...")
        
        # Check if description column exists
        cursor.execute("PRAGMA table_info(roles)")
        columns = {row[1] for row in cursor.fetchall()}
        
        if "description" not in columns:
            print("  Adding 'description' column to roles table...")
            cursor.execute("ALTER TABLE roles ADD COLUMN description VARCHAR(255)")
            print("  ✓ Added description column")
        else:
            print("  ✓ Description column already exists")
        
        if "hierarchy_level" not in columns:
            print("  Adding 'hierarchy_level' column to roles table...")
            cursor.execute("ALTER TABLE roles ADD COLUMN hierarchy_level INTEGER DEFAULT 1")
            print("  ✓ Added hierarchy_level column")
        else:
            print("  ✓ Hierarchy_level column already exists")
        
        print("\n[2/4] Creating permissions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) UNIQUE NOT NULL,
                resource VARCHAR(100) NOT NULL,
                action VARCHAR(50) NOT NULL,
                description VARCHAR(255)
            )
        """)
        print("  ✓ Permissions table created")
        
        print("\n[3/4] Creating role_permissions association table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER NOT NULL,
                permission_id INTEGER NOT NULL,
                PRIMARY KEY (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES roles(id),
                FOREIGN KEY (permission_id) REFERENCES permissions(id)
            )
        """)
        print("  ✓ Role_permissions table created")
        
        print("\n[4/4] Updating existing roles with hierarchy levels...")
        
        # Update hierarchy levels for existing roles
        role_levels = {
            "customer": (1, "Standard customer with access to own accounts and transactions"),
            "manager": (2, "Branch manager with approval and oversight capabilities"),
            "auditor_clerk": (3, "Auditor with read-only access to all system logs and transactions"),
            "system_admin": (4, "System administrator with full system access and management"),
        }
        
        for role_name, (level, description) in role_levels.items():
            cursor.execute(
                "UPDATE roles SET hierarchy_level = ?, description = ? WHERE name = ?",
                (level, description, role_name)
            )
            print(f"  ✓ Updated {role_name} (level {level})")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("Migration Completed Successfully!")
        print("=" * 60)
        print("\nNext steps:")
        print("  1. Run: python backend/scripts/initialize_rbac.py")
        print("  2. Restart the application")
        print()
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        conn.close()


if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)
