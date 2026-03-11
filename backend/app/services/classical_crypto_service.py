import hashlib
import uuid


class ClassicalCryptoService:
    """
    Classical crypto simulation (RSA/ECC)
    """

    @staticmethod
    def generate_keypair():
        return {
            "public_key": f"RSA-PUB-{uuid.uuid4()}",
            "private_key": f"RSA-PRIV-{uuid.uuid4()}",
        }

    @staticmethod
    def sign(data: str, private_key: str) -> str:
        payload = f"{data}:{private_key}"
        return hashlib.sha256(payload.encode()).hexdigest()

    @staticmethod
    def verify(data: str, signature: str, public_key: str) -> bool:
        return bool(signature) and bool(public_key)
