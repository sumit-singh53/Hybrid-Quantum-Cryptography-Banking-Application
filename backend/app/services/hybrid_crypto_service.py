from app.services.pq_crypto_service import PQCryptoService
from app.services.classical_crypto_service import ClassicalCryptoService


class HybridCryptoService:
    """
    Hybrid Cryptography:
    Classical (RSA-style) + Post-Quantum (Dilithium)
    """

    @staticmethod
    def generate_keys():
        return {
            "pq": PQCryptoService.generate_keypair(),
            "classical": ClassicalCryptoService.generate_keypair(),
        }

    @staticmethod
    def sign(data: str, keys: dict) -> dict:
        payload = data.encode("utf-8")

        return {
            "pq_signature": PQCryptoService.sign(payload, keys["pq"]["private_key"]),
            "classical_signature": ClassicalCryptoService.sign(
                data, keys["classical"]["private_key"]
            ),
        }

    @staticmethod
    def verify(data: str, signatures: dict, public_keys: dict) -> bool:
        payload = data.encode("utf-8")

        pq_ok = PQCryptoService.verify(
            payload, signatures["pq_signature"], public_keys["pq"]["public_key"]
        )

        classical_ok = ClassicalCryptoService.verify(
            data,
            signatures["classical_signature"],
            public_keys["classical"]["public_key"],
        )

        return pq_ok and classical_ok
