import base64
from typing import Dict

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

try:
    from pqcrypto.kem import kyber512 as _kyber_impl
except ImportError:  # pragma: no cover - environment-specific
    from pqcrypto.kem import ml_kem_512 as _kyber_impl


class KyberCrystal:
    """Thin wrapper around ML-KEM-512 for certificate delivery and session keys."""

    ALG_NAME = "ML-KEM-512"
    SHARED_SECRET_BYTES = 32
    _HKDF_INFO_DELIVERY = b"ml-kem-512:certificate-delivery"
    _HKDF_INFO_SESSION = b"ml-kem-512:session-key"

    @staticmethod
    def generate_keypair() -> Dict[str, str]:
        """Return base64 encoded Kyber512 keypair."""
        public_key, secret_key = _kyber_impl.generate_keypair()
        return {
            "public_key": base64.b64encode(public_key).decode("ascii"),
            "private_key": base64.b64encode(secret_key).decode("ascii"),
        }

    @staticmethod
    def encapsulate(public_key_b64: str) -> Dict[str, str]:
        if not public_key_b64:
            raise ValueError("Kyber public key is required for encapsulation")
        public_key = base64.b64decode(public_key_b64)
        ciphertext, shared_secret = _kyber_impl.encrypt(public_key)
        return {
            "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
            "shared_secret": base64.b64encode(shared_secret).decode("ascii"),
        }

    @staticmethod
    def decapsulate(private_key_b64: str, ciphertext_b64: str) -> bytes:
        if not private_key_b64 or not ciphertext_b64:
            raise ValueError("Kyber private key and ciphertext are required")
        private_key = base64.b64decode(private_key_b64)
        ciphertext = base64.b64decode(ciphertext_b64)
        return _kyber_impl.decrypt(private_key, ciphertext)

    @staticmethod
    def shared_secret_to_bytes(shared_secret_b64: str) -> bytes:
        if not shared_secret_b64:
            return b""
        return base64.b64decode(shared_secret_b64)

    @staticmethod
    def _derive_aes256_key(
        shared_secret: bytes, certificate_hash: str, info: bytes
    ) -> bytes:
        if not isinstance(shared_secret, (bytes, bytearray)):
            raise TypeError("shared_secret must be bytes")
        if not certificate_hash:
            raise ValueError("certificate_hash is required for HKDF derivation")
        hkdf = HKDF(
            algorithm=hashes.SHA3_256(),
            length=32,
            salt=None,
            info=info,
        )
        ikm = bytes(shared_secret) + certificate_hash.encode("utf-8")
        return hkdf.derive(ikm)

    @classmethod
    def derive_delivery_aes_key(
        cls, shared_secret: bytes, certificate_hash: str
    ) -> bytes:
        return cls._derive_aes256_key(
            shared_secret, certificate_hash, cls._HKDF_INFO_DELIVERY
        )

    @classmethod
    def derive_session_aes_key(
        cls, shared_secret: bytes, certificate_hash: str
    ) -> bytes:
        return cls._derive_aes256_key(
            shared_secret, certificate_hash, cls._HKDF_INFO_SESSION
        )
