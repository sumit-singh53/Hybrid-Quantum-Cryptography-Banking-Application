"""
Beneficiary Service
Handles beneficiary management operations for customers.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy import and_

from app.config.database import db
from app.models.beneficiary_model import Beneficiary, BeneficiaryStatus
from app.models.customer_model import Customer


class BeneficiaryService:
    """Service for managing customer beneficiaries."""
    
    # Rate limiting: max beneficiaries per customer
    MAX_BENEFICIARIES_PER_CUSTOMER = 50
    
    # Rate limiting: max additions per day
    MAX_ADDITIONS_PER_DAY = 10
    
    @staticmethod
    def _mask_account_number(account_number: str) -> str:
        """Mask account number showing only last 4 digits."""
        if not account_number or len(account_number) < 4:
            return "****"
        return f"****{account_number[-4:]}"
    
    @classmethod
    def list_beneficiaries(cls, customer_id: str, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """
        List all beneficiaries for a customer.
        
        Args:
            customer_id: Customer ID
            include_inactive: Whether to include inactive beneficiaries
            
        Returns:
            List of beneficiary dictionaries with masked account numbers
        """
        query = Beneficiary.query.filter_by(customer_id=customer_id)
        
        if not include_inactive:
            query = query.filter(
                Beneficiary.status.in_([BeneficiaryStatus.ACTIVE, BeneficiaryStatus.PENDING])
            )
        
        beneficiaries = query.order_by(Beneficiary.created_at.desc()).all()
        
        return [ben.to_dict(mask_account=True) for ben in beneficiaries]
    
    @classmethod
    def get_beneficiary(cls, beneficiary_id: str, customer_id: str, unmask: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get a single beneficiary by ID.
        Validates ownership.
        
        Args:
            beneficiary_id: Beneficiary ID
            customer_id: Customer ID (for ownership validation)
            unmask: Whether to return full account number (for transactions)
            
        Returns:
            Beneficiary dictionary or None if not found
        """
        beneficiary = Beneficiary.query.filter_by(
            id=beneficiary_id,
            customer_id=customer_id
        ).first()
        
        if not beneficiary:
            return None
        
        return beneficiary.to_dict(mask_account=not unmask)
    
    @classmethod
    def add_beneficiary(
        cls,
        customer_id: str,
        beneficiary_name: str,
        account_number: str,
        bank_name: Optional[str] = None,
        branch_code: Optional[str] = None,
        ifsc_code: Optional[str] = None,
        nickname: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Add a new beneficiary.
        
        Args:
            customer_id: Customer ID
            beneficiary_name: Beneficiary full name
            account_number: Beneficiary account number
            bank_name: Bank name (optional)
            branch_code: Branch code (optional)
            ifsc_code: IFSC code (optional)
            nickname: Friendly nickname (optional)
            description: Description (optional)
            
        Returns:
            Created beneficiary dictionary
            
        Raises:
            ValueError: If validation fails or limits exceeded
        """
        # Validate customer exists
        customer = Customer.query.get(customer_id)
        if not customer:
            raise ValueError("Customer not found")
        
        # Check beneficiary limit
        existing_count = Beneficiary.query.filter_by(customer_id=customer_id).count()
        if existing_count >= cls.MAX_BENEFICIARIES_PER_CUSTOMER:
            raise ValueError(f"Maximum {cls.MAX_BENEFICIARIES_PER_CUSTOMER} beneficiaries allowed")
        
        # Check rate limit (additions in last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_additions = Beneficiary.query.filter(
            and_(
                Beneficiary.customer_id == customer_id,
                Beneficiary.created_at >= yesterday
            )
        ).count()
        
        if recent_additions >= cls.MAX_ADDITIONS_PER_DAY:
            raise ValueError(f"Maximum {cls.MAX_ADDITIONS_PER_DAY} beneficiaries can be added per day")
        
        # Validate account number format
        account_number = account_number.strip()
        if not account_number or len(account_number) < 5:
            raise ValueError("Invalid account number")
        
        # Check for duplicate
        existing = Beneficiary.query.filter_by(
            customer_id=customer_id,
            account_number=account_number
        ).first()
        
        if existing:
            raise ValueError("Beneficiary with this account number already exists")
        
        # Prevent adding own account
        if customer.account_number == account_number:
            raise ValueError("Cannot add your own account as beneficiary")
        
        # Create beneficiary
        beneficiary = Beneficiary(
            customer_id=customer_id,
            beneficiary_name=beneficiary_name.strip(),
            account_number=account_number,
            bank_name=bank_name or "PQ Bank",
            branch_code=branch_code,
            ifsc_code=ifsc_code,
            nickname=nickname.strip() if nickname else None,
            description=description.strip() if description else None,
            status=BeneficiaryStatus.ACTIVE,  # Auto-activate for now
            verified=False,  # Can be verified later
        )
        
        db.session.add(beneficiary)
        db.session.commit()
        
        return beneficiary.to_dict(mask_account=False)
    
    @classmethod
    def update_beneficiary(
        cls,
        beneficiary_id: str,
        customer_id: str,
        nickname: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update beneficiary details (limited fields).
        Only nickname and description can be updated.
        
        Args:
            beneficiary_id: Beneficiary ID
            customer_id: Customer ID (for ownership validation)
            nickname: New nickname (optional)
            description: New description (optional)
            
        Returns:
            Updated beneficiary dictionary
            
        Raises:
            ValueError: If beneficiary not found or not owned by customer
        """
        beneficiary = Beneficiary.query.filter_by(
            id=beneficiary_id,
            customer_id=customer_id
        ).first()
        
        if not beneficiary:
            raise ValueError("Beneficiary not found or access denied")
        
        # Update allowed fields only
        if nickname is not None:
            beneficiary.nickname = nickname.strip() if nickname else None
        
        if description is not None:
            beneficiary.description = description.strip() if description else None
        
        beneficiary.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return beneficiary.to_dict(mask_account=False)
    
    @classmethod
    def delete_beneficiary(cls, beneficiary_id: str, customer_id: str) -> bool:
        """
        Delete a beneficiary.
        
        Args:
            beneficiary_id: Beneficiary ID
            customer_id: Customer ID (for ownership validation)
            
        Returns:
            True if deleted, False if not found
            
        Raises:
            ValueError: If access denied
        """
        beneficiary = Beneficiary.query.filter_by(
            id=beneficiary_id,
            customer_id=customer_id
        ).first()
        
        if not beneficiary:
            return False
        
        db.session.delete(beneficiary)
        db.session.commit()
        
        return True
    
    @classmethod
    def toggle_status(
        cls,
        beneficiary_id: str,
        customer_id: str,
        new_status: str
    ) -> Dict[str, Any]:
        """
        Toggle beneficiary status (activate/deactivate).
        
        Args:
            beneficiary_id: Beneficiary ID
            customer_id: Customer ID (for ownership validation)
            new_status: New status (ACTIVE or INACTIVE)
            
        Returns:
            Updated beneficiary dictionary
            
        Raises:
            ValueError: If validation fails
        """
        beneficiary = Beneficiary.query.filter_by(
            id=beneficiary_id,
            customer_id=customer_id
        ).first()
        
        if not beneficiary:
            raise ValueError("Beneficiary not found or access denied")
        
        # Validate status
        try:
            status_enum = BeneficiaryStatus[new_status.upper()]
        except KeyError:
            raise ValueError(f"Invalid status: {new_status}")
        
        beneficiary.status = status_enum
        beneficiary.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return beneficiary.to_dict(mask_account=False)
    
    @classmethod
    def get_statistics(cls, customer_id: str) -> Dict[str, Any]:
        """
        Get beneficiary statistics for a customer.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Statistics dictionary
        """
        total = Beneficiary.query.filter_by(customer_id=customer_id).count()
        active = Beneficiary.query.filter_by(
            customer_id=customer_id,
            status=BeneficiaryStatus.ACTIVE
        ).count()
        pending = Beneficiary.query.filter_by(
            customer_id=customer_id,
            status=BeneficiaryStatus.PENDING
        ).count()
        
        return {
            "total": total,
            "active": active,
            "pending": pending,
            "limit": cls.MAX_BENEFICIARIES_PER_CUSTOMER,
            "remaining": max(0, cls.MAX_BENEFICIARIES_PER_CUSTOMER - total),
        }
