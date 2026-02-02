from pqcrypto.sign import ml_dsa_65


class PQCryptoService:
    """Post-quantum signature helper built on pqcrypto (Dilithium/ML-DSA)."""

    SIGN_ALGO = "ML-DSA-65"

    @staticmethod
    def generate_keypair():
        public_key, private_key = ml_dsa_65.generate_keypair()
        return {"public_key": public_key, "private_key": private_key}

    @staticmethod
    def sign(data: bytes, private_key: bytes) -> bytes:
        if not isinstance(data, bytes):
            raise TypeError("Data for signing must be bytes")
        if not isinstance(private_key, bytes):
            raise TypeError("Dilithium private key must be bytes")
        return ml_dsa_65.sign(private_key, data)

    @staticmethod
    def verify(data: bytes, signature: bytes, public_key: bytes) -> bool:
        if not isinstance(public_key, bytes):
            raise TypeError("Dilithium public key must be bytes")
        return ml_dsa_65.verify(public_key, data, signature)
