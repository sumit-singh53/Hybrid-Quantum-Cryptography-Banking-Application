import base64
import os
from typing import Dict

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.security.kyber_crystal import KyberCrystal


class CertificateDelivery:
    """Creates client-facing encrypted certificate bundles via ML-KEM-512."""

    KDF_ALG = "HKDF-SHA3-256"
    CIPHER_ALG = "AES-256-GCM"
    NONCE_BYTES = 12

    @classmethod
    def encrypt_for_client(
        cls,
        certificate_text: str,
        *,
        client_mlkem_public_key_b64: str,
        certificate_hash: str,
    ) -> Dict[str, Dict[str, str]]:
        if not client_mlkem_public_key_b64:
            raise ValueError(
                "Client ML-KEM public key required for delivery encryption"
            )
        if not certificate_hash:
            raise ValueError("certificate_hash required for delivery encryption")

        kem_payload = KyberCrystal.encapsulate(client_mlkem_public_key_b64)
        shared_secret = KyberCrystal.shared_secret_to_bytes(
            kem_payload["shared_secret"]
        )
        key = KyberCrystal.derive_delivery_aes_key(shared_secret, certificate_hash)

        nonce = os.urandom(cls.NONCE_BYTES)
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, certificate_text.encode("utf-8"), None)
        return {
            "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
            "nonce": base64.b64encode(nonce).decode("ascii"),
            "cipher": cls.CIPHER_ALG,
            "encapsulation": {
                "alg": KyberCrystal.ALG_NAME,
                "ciphertext": kem_payload["ciphertext"],
            },
            "kdf": {
                "alg": cls.KDF_ALG,
                "ikm": "shared_secret||certificate_hash",
            },
        }
