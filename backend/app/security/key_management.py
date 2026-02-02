"""
Key Management Layer
--------------------
Abhi keys memory me manage ho rahe hain.
Production me:
- DB encrypted storage
- HSM / KMS integration
"""

from app.services.hybrid_crypto_service import HybridCryptoService

# TEMP in-memory key store
KEY_STORE = {}


class KeyManagementService:

    @staticmethod
    def generate_and_store_keys(user_id: int):
        """
        Generate hybrid keys for a user
        """
        keys = HybridCryptoService.generate_keys()
        KEY_STORE[user_id] = keys
        return keys

    @staticmethod
    def get_keys(user_id: int):
        """
        Retrieve keys for a user
        """
        return KEY_STORE.get(user_id)

    @staticmethod
    def get_public_keys(user_id: int):
        """
        Return only public keys
        """
        keys = KEY_STORE.get(user_id)
        if not keys:
            return None

        return {
            "pq": {"public_key": keys["pq"]["public_key"]},
            "classical": {"public_key": keys["classical"]["public_key"]},
        }
