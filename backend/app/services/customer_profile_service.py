"""
Customer Profile Service
Handles profile viewing and updating for customer role only.
"""
import json
from typing import Dict, Optional
from flask import current_app
from sqlalchemy import func
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
        
        # Try to find user by customer_id first (for customers)
        user = User.query.filter_by(customer_id=customer_id).first()
        
        # If not found, try by integer ID
        if not user:
            try:
                if customer_id.isdigit():
                    user = User.query.get(int(customer_id))
            except (ValueError, AttributeError):
                pass
        
        # If no user found by numeric id, try finding by username matching the customer_id
        if not user:
            user = User.query.filter_by(username=str(customer_id)).first()
        
        # If user record exists, return full profile
        if user:
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
        
        # If no user record but customer exists, return minimal profile
        if customer:
            return {
                "user_id": customer.id,
                "username": customer.name.lower().replace(" ", "_")[:100],
                "full_name": customer.name,
                "email": "",  # No email - user needs to set it
                "mobile": "",  # No mobile - user needs to set it
                "address": "",  # No address - user needs to set it
                "role": "customer",
                "is_active": customer.status.value == "ACTIVE",
                "created_at": customer.created_at.isoformat() if customer.created_at else None,
                "account_number": customer.account_number,
                "account_type": customer.account_type.value if customer.account_type else "SAVINGS",
                "account_status": customer.status.value if customer.status else "ACTIVE",
                "branch_code": customer.branch_code or "MUM-HQ",
            }
        
        # Neither user nor customer found
        raise ValueError("User not found")

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
        
        # Try to find user by customer_id first (for customers)
        user = User.query.filter_by(customer_id=customer_id).first()
        
        # If not found, try by integer ID
        if not user:
            try:
                if customer_id.isdigit():
                    user = User.query.get(int(customer_id))
            except (ValueError, AttributeError):
                pass

        # If no User found by numeric id, try finding by username matching the customer_id
        if not user:
            user = User.query.filter_by(username=str(customer_id)).first()

        # If still not found, create user record from customer data
        if not user:
            customer = Customer.query.get(customer_id)
            if not customer:
                raise ValueError("User profile not found. Cannot update profile without customer record.")

            # Create username from customer name
            base_username = (customer.name or "customer").lower().replace(" ", "_")[:100]
            candidate = base_username
            suffix = 1
            while User.query.filter_by(username=candidate).first():
                candidate = f"{base_username[:90]}_{suffix}"
                suffix += 1

            # Get customer role
            role = Role.query.filter(func.lower(Role.name) == "customer").first()
            if not role:
                role = Role(name="customer")
                db.session.add(role)
                db.session.flush()

            # Create user with empty email (user will set it)
            user = User(
                username=candidate,
                full_name=customer.name,
                email=None,  # User will set email via update
                mobile="",  # User will set mobile via update
                address=None,
                aadhar=None,
                pan=None,
                customer_id=customer_id,  # Link to Customer record
                role_id=role.id,
                is_active=True,
            )
            db.session.add(user)
            db.session.commit()
        
        # Track what was updated
        updated_fields = []
        
        # Update email if provided
        if email is not None:
            # Convert empty string to None for database NULL
            email_value = email.strip() if email else None
            # Normalize current email for comparison (None if empty)
            current_email = user.email if user.email else None
            
            # Only update if the value actually changed
            if email_value != current_email:
                # Check if email is already taken by another user (only if not empty/None)
                if email_value:
                    existing_user = User.query.filter(
                        User.email == email_value,
                        User.id != user.id
                    ).first()
                    
                    if existing_user:
                        raise ValueError("Email address is already in use")
                
                user.email = email_value
                updated_fields.append("email")
        
        # Update mobile if provided
        if mobile is not None:
            # Normalize mobile for comparison
            mobile_value = mobile.strip() if mobile else ""
            current_mobile = user.mobile if user.mobile else ""
            
            if mobile_value != current_mobile:
                # Validate mobile format (basic validation)
                if mobile_value and not mobile_value.replace("+", "").replace("-", "").replace(" ", "").isdigit():
                    raise ValueError("Invalid mobile number format")
                user.mobile = mobile_value
                updated_fields.append("mobile")
        
        # Update address if provided
        if address is not None:
            # Normalize address for comparison
            address_value = address.strip() if address else None
            current_address = user.address if user.address else None
            
            if address_value != current_address:
                user.address = address_value
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
