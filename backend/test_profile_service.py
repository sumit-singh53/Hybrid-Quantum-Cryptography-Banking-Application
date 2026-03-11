"""
Quick test script for customer profile service
Run with: python test_profile_service.py
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services.customer_profile_service import CustomerProfileService

def test_profile_service():
    """Test the profile service with a sample customer ID"""
    app = create_app()
    
    with app.app_context():
        try:
            # Test with a sample customer ID (adjust this to match your actual customer ID)
            # You can find customer IDs by checking the customers table
            from app.models.customer_model import Customer
            
            # Get first customer
            customer = Customer.query.first()
            
            if not customer:
                print("❌ No customers found in database")
                print("   Please create a customer first")
                return False
            
            print(f"✓ Found customer: {customer.name} (ID: {customer.id})")
            print(f"  Account: {customer.account_number}")
            
            # Test get_profile
            print("\n📋 Testing get_profile()...")
            try:
                profile = CustomerProfileService.get_profile(customer.id)
                print("✓ Profile retrieved successfully!")
                print(f"  User ID: {profile.get('user_id')}")
                print(f"  Username: {profile.get('username')}")
                print(f"  Full Name: {profile.get('full_name')}")
                print(f"  Email: {profile.get('email') or '(not set)'}")
                print(f"  Mobile: {profile.get('mobile') or '(not set)'}")
                print(f"  Role: {profile.get('role')}")
                print(f"  Account Number: {profile.get('account_number')}")
                print(f"  Account Type: {profile.get('account_type')}")
                print(f"  Account Status: {profile.get('account_status')}")
                return True
            except Exception as e:
                print(f"❌ Error getting profile: {str(e)}")
                import traceback
                traceback.print_exc()
                return False
                
        except Exception as e:
            print(f"❌ Test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    print("=" * 60)
    print("Customer Profile Service Test")
    print("=" * 60)
    
    success = test_profile_service()
    
    print("\n" + "=" * 60)
    if success:
        print("✓ All tests passed!")
    else:
        print("❌ Tests failed - check errors above")
    print("=" * 60)
