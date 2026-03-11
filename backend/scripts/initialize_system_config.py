"""
Initialize System Configuration
--------------------------------
Creates the system_configs table and populates it with default values.
Run this script once to set up system configuration.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config.database import db
from app.models.system_config_model import SystemConfig
from app.services.system_config_service import SystemConfigService
from app.main import create_app


def initialize_system_config():
    """Initialize system configuration with default values."""
    app = create_app()
    
    with app.app_context():
        print("🔧 Initializing System Configuration...")
        
        # Create tables if they don't exist
        db.create_all()
        print("✅ Database tables created/verified")
        
        # Initialize default configurations
        try:
            SystemConfigService.initialize_default_configs()
            print("✅ Default system configurations initialized")
            
            # Display summary
            summary = SystemConfigService.get_config_summary()
            print(f"\n📊 Configuration Summary:")
            print(f"   Total Configurations: {summary['total_configs']}")
            print(f"   Active Configurations: {summary['active_configs']}")
            print(f"   Categories: {', '.join(summary.get('category_counts', {}).keys())}")
            
            # Display configurations by category
            all_configs = SystemConfigService.get_all_configs()
            print(f"\n📋 Configurations by Category:")
            for category, configs in all_configs['configs'].items():
                print(f"\n   {category.upper()}:")
                for config in configs:
                    print(f"      • {config['config_key']}: {config['config_value']}")
            
            print("\n✅ System configuration initialization complete!")
            
        except Exception as e:
            print(f"❌ Error initializing system configuration: {e}")
            return False
    
    return True


if __name__ == "__main__":
    success = initialize_system_config()
    sys.exit(0 if success else 1)
