"""
Initialize Backup System
------------------------
Creates the backups table and backup directory.
Run this script once to set up the backup system.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config.database import db
from app.models.backup_model import Backup
from app.services.backup_service import BackupService
from app.main import create_app


def initialize_backup_system():
    """Initialize backup system."""
    app = create_app()
    
    with app.app_context():
        print("💾 Initializing Backup System...")
        
        # Create tables if they don't exist
        db.create_all()
        print("✅ Database tables created/verified")
        
        # Ensure backup directory exists
        BackupService._ensure_backup_directory()
        print(f"✅ Backup directory created: {BackupService.BACKUP_DIR}")
        
        # Get statistics
        try:
            stats = BackupService.get_backup_statistics()
            print(f"\n📊 Backup System Status:")
            print(f"   Total Backups: {stats['total_backups']}")
            print(f"   Successful Backups: {stats['successful_backups']}")
            print(f"   Failed Backups: {stats['failed_backups']}")
            print(f"   Total Size: {stats['total_size_mb']} MB")
            
            if stats['latest_backup']:
                print(f"\n📦 Latest Backup:")
                print(f"   ID: {stats['latest_backup']['backup_id']}")
                print(f"   Created: {stats['latest_backup']['created_at']}")
                print(f"   Size: {stats['latest_backup']['backup_size_mb']} MB")
            
            print("\n✅ Backup system initialization complete!")
            
        except Exception as e:
            print(f"❌ Error getting backup statistics: {e}")
            return False
    
    return True


if __name__ == "__main__":
    success = initialize_backup_system()
    sys.exit(0 if success else 1)
