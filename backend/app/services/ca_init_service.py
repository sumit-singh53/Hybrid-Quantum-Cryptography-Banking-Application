import os
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization


class CAInitService:
    """Bank CA initialization utilities for classical RSA material."""

    CA_DIR = "certificates/ca"
    CA_PRIVATE_KEY = os.path.join(CA_DIR, "ca_rsa_private.key")
    CA_PUBLIC_KEY = os.path.join(CA_DIR, "ca_rsa_public.key")

    @staticmethod
    def _generate_rsa_keypair():
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=3072,
        )
        return private_key, private_key.public_key()

    @staticmethod
    def _write_keys(private_key, public_key):
        os.makedirs(CAInitService.CA_DIR, exist_ok=True)
        with open(CAInitService.CA_PRIVATE_KEY, "wb") as handle:
            handle.write(
                private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption(),
                )
            )

        with open(CAInitService.CA_PUBLIC_KEY, "wb") as handle:
            handle.write(
                public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo,
                )
            )

    @staticmethod
    def initialize_ca():
        if os.path.exists(CAInitService.CA_PRIVATE_KEY):
            print("[CA] RSA CA already initialized")
            return

        print("[CA] Initializing Classical RSA CA (Hybrid Mode)")
        private_key, public_key = CAInitService._generate_rsa_keypair()
        CAInitService._write_keys(private_key, public_key)
        print("[CA] RSA CA keys generated successfully")

    @staticmethod
    def rotate_ca_keys() -> dict:
        """Regenerate classical RSA CA keys (invalidates existing cert trust)."""

        private_key, public_key = CAInitService._generate_rsa_keypair()
        CAInitService._write_keys(private_key, public_key)
        return {
            "message": "Classical RSA CA keys rotated",
            "private_key_path": CAInitService.CA_PRIVATE_KEY,
            "public_key_path": CAInitService.CA_PUBLIC_KEY,
        }
