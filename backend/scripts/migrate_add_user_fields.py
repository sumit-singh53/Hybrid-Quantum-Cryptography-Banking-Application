"""
Migration script to add new fields to User model:
- mobile (required)
- address (optional)
- aadhar (optional)
- pan (optional)
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config.database import db
from app.main import create_app
from sqlalchemy import text


def migrate_add_user_fields():
    """Add new fields to users table"""
    app = create_app()
    with app.app_context():
        try:
            print("🔄 Starting migration: Add user fields...")
            
            # Check if columns already exist
            inspector = db.inspect(db.engine)
            existing_columns = [col['name'] for col in inspector.get_columns('users')]
            
            migrations = []
            
            # Add mobile column (required, default empty string for existing users)
            if 'mobile' not in existing_columns:
                migrations.append(
                    "ALTER TABLE users ADD COLUMN mobile VARCHAR(15) DEFAULT '' NOT NULL"
                )
                print("  ✓ Will add 'mobile' column")
            else:
                print("  ℹ 'mobile' column already exists")
            
            # Add address column (optional)
            if 'address' not in existing_columns:
                migrations.append(
                    "ALTER TABLE users ADD COLUMN address TEXT"
                )
                print("  ✓ Will add 'address' column")
            else:
                print("  ℹ 'address' column already exists")
            
            # Add aadhar column (optional)
            if 'aadhar' not in existing_columns:
                migrations.append(
                    "ALTER TABLE users ADD COLUMN aadhar VARCHAR(12)"
                )
                print("  ✓ Will add 'aadhar' column")
            else:
                print("  ℹ 'aadhar' column already exists")
            
            # Add pan column (optional)
            if 'pan' not in existing_columns:
                migrations.append(
                    "ALTER TABLE users ADD COLUMN pan VARCHAR(10)"
                )
                print("  ✓ Will add 'pan' column")
            else:
                print("  ℹ 'pan' column already exists")
            
            # Execute migrations
            if migrations:
                for migration_sql in migrations:
                    db.session.execute(text(migration_sql))
                
                db.session.commit()
                print(f"\n✅ Successfully added {len(migrations)} new column(s) to users table")
            else:
                print("\n✅ All columns already exist, no migration needed")
            
            # Make email optional (nullable)
            if 'email' in existing_columns:
                try:
                    # SQLite doesn't support ALTER COLUMN, so we need to check the database type
                    if db.engine.dialect.name == 'sqlite':
                        print("\n  ℹ SQLite detected - email column modification requires table recreation")
                        print("  ℹ Email will remain as-is for SQLite")
                    else:
                        db.session.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL"))
                        db.session.commit()
                        print("\n  ✓ Made email column optional (nullable)")
                except Exception as e:
                    print(f"\n  ⚠ Could not modify email column: {e}")
                    db.session.rollback()
            
            print("\n🎉 Migration completed successfully!")
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            db.session.rollback()
            raise


if __name__ == "__main__":
    migrate_add_user_fields()
