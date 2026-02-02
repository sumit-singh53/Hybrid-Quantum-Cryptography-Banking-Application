"""
Signature Verification Layer
----------------------------
All cryptographic verification
passes through this module
"""

from app.services.hybrid_crypto_service import HybridCryptoService
from app.security.key_management import KeyManagementService


class SignatureVerificationService:

    @staticmethod
    def verify_transaction_signature(
        user_id: int, payload: str, signatures: dict
    ) -> bool:
        """
        Verify PQ + Classical signatures for transaction
        """
        public_keys = KeyManagementService.get_public_keys(user_id)

        if not public_keys:
            return False

        return HybridCryptoService.verify(
            payload=payload, signatures=signatures, public_keys=public_keys
        )
