"""
Customer Profile Service
Handles profile viewing and updating for customer role only.
"""
from typing import Dict, Optional
from app.models.user_model import User
from app.models.customer_model import Customer
from app.models.role_model import Role
from app.config.database import db
from app.security.request_audit_store import RequestAuditStore


class CustomerProfileService:
    """Service for customer profile management."""

    @staticmethod
    def get_profile(user_id) -> Dict:
        """
        Get customer profile information.
        Returns both User and Customer data merged.
        user_id can be either integer (User ID) or string (Customer ID)
        """
        # Convert to string for customer lookup
        customer_id = str(user_id)
        customer = Customer.query.get(customer_id)
        
        # Try to find user by ID (customers use their customer ID as user ID in the system)
        user = None
        
        # First, try to find user with matching ID
        try:
            if customer_id.isdigit():
                user = User.query.get(int(customer_id))
        except (ValueError, AttributeError):
            pass
        
        # If no user found and we have a customer, create profile from customer data
        if not user and customer:
            return {
                "user_id": customer.id,
                "username": customer.name.lower().replace(" ", "_"),
                "full_name": customer.name,
                "email": "",
                "mobile": "",
                "address": "",
                "role": "customer",
                "is_active": customer.status.value == "ACTIVE",
                "created_at": customer.created_at.isoformat() if customer.created_at else None,
                "account_number": customer.account_number,
                "account_type": customer.account_type.value if customer.account_type else "SAVINGS",
                "account_status": customer.status.value if customer.status else "ACTIVE",
                "branch_code": customer.branch_code or "MUM-HQ",
            }
        
        if not user:
            raise ValueError("User not found")
        
        # Get role information
        role_name = user.role.name if user.role else "customer"
        
        profile_data = {
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email or "",
            "mobile": user.mobile or "",
            "address": user.address or "",
            "role": role_name,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
        
        # Add customer-specific data if available
        if customer:
            profile_data.update({
                "account_number": customer.account_number,
                "account_type": customer.account_type.value if customer.account_type else "SAVINGS",
                "account_status": customer.status.value if customer.status else "ACTIVE",
                "branch_code": customer.branch_code or "MUM-HQ",
            })
        
        return profile_data

    @staticmethod
    def update_profile(
        user_id,
        email: Optional[str] = None,
        mobile: Optional[str] = None,
        address: Optional[str] = None
    ) -> Dict:
        """
        Update customer profile information.
        Only allows updating email, mobile, and address.
        Other fields are read-only for security.
        """
        # Convert to string for customer lookup
        customer_id = str(user_id)
        
        # Try to find user
        user = None
        try:
            if customer_id.isdigit():
                user = User.query.get(int(customer_id))
        except (ValueError, AttributeError):
            pass

        # If no User found by numeric id, try finding by username matching the customer_id
        if not user:
            user = User.query.filter_by(username=str(customer_id)).first()

        # If still not found, attempt to create a User record from the Customer record
        if not user:
            customer = Customer.query.get(customer_id)
            if not customer:
                raise ValueError("User profile not found. Cannot update profile without user record.")

            # derive a safe username from customer name
            base_username = (customer.name or "customer").lower().replace(" ", "_")[:100]
            candidate = base_username
            suffix = 1
            while User.query.filter_by(username=candidate).first():
                candidate = f"{base_username[:90]}_{suffix}"
                suffix += 1

            role = Role.query.filter(func.lower(Role.name) == "customer").first()
            if not role:
                role = Role(name="customer")
                db.session.add(role)
                db.session.flush()

            user = User(
                username=candidate,
                full_name=customer.name,
                email="",
                mobile="",
                address=None,
                aadhar=None,
                pan=None,
                role_id=role.id,
                is_active=True,
            )
            db.session.add(user)
            db.session.commit()
        
        # Track what was updated
        updated_fields = []
        
        # Update email if provided
        if email is not None and email != user.email:
            # Check if email is already taken by another user
            existing_user = User.query.filter(
                User.email == email,
                User.id != user.id
            ).first()
            if existing_user:
                raise ValueError("Email address is already in use")
            user.email = email
            updated_fields.append("email")
        
        # Update mobile if provided
        if mobile is not None and mobile != user.mobile:
            # Validate mobile format (basic validation)
            if mobile and not mobile.replace("+", "").replace("-", "").replace(" ", "").isdigit():
                raise ValueError("Invalid mobile number format")
            user.mobile = mobile
            updated_fields.append("mobile")
        
        # Update address if provided
        if address is not None and address != user.address:
            user.address = address
            updated_fields.append("address")
        
        # Save changes
        if updated_fields:
            try:
                db.session.commit()
                
                # Log the profile update
                try:
                    RequestAuditStore.log_event({
                        "user_id": str(user.id),
                        "action_name": "profile_update",
                        "path": "/api/customer/profile",
                        "updated_fields": updated_fields,
                    })
                except Exception:
                    pass  # Don't fail update if logging fails
                
            except Exception as e:
                db.session.rollback()
                raise ValueError(f"Failed to update profile: {str(e)}")
        
        # Return updated profile
        return CustomerProfileService.get_profile(user_id)

    @staticmethod
    def validate_profile_data(email: Optional[str] = None, mobile: Optional[str] = None) -> Dict:
        """
        Validate profile data before update.
        Returns validation errors if any.
        """
        errors = {}
        
        if email is not None:
            if email and len(email) > 150:
                errors["email"] = "Email address is too long (max 150 characters)"
            if email and "@" not in email:
                errors["email"] = "Invalid email format"
        
        if mobile is not None:
            if mobile and len(mobile) > 15:
                errors["mobile"] = "Mobile number is too long (max 15 characters)"
            if mobile and len(mobile) < 10:
                errors["mobile"] = "Mobile number is too short (min 10 digits)"
        
        return errors
