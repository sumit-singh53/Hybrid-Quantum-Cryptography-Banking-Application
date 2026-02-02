"""
CA Initialization Script
------------------------
Creates:
1. Classical X.509 CA certificate (RSA)
2. Post-Quantum Dilithium CA keypair

Run ONCE during system setup.
"""

import os
import subprocess
from pathlib import Path

from app.services.pq_crypto_service import PQCryptoService


BASE_DIR = Path(__file__).resolve().parents[2]
BASE_CA_PATH = BASE_DIR / "certificates" / "ca"
RSA_KEY_PATH = BASE_CA_PATH / "ca_rsa_private.key"
CA_CERT_PATH = BASE_CA_PATH / "ca_certificate.pem"

PQ_CA_PRIVATE = BASE_CA_PATH / "pq_ca_private.key"
PQ_CA_PUBLIC = BASE_CA_PATH / "pq_ca_public.key"


def ensure_dirs():
    BASE_CA_PATH.mkdir(parents=True, exist_ok=True)


def generate_classical_ca():
    """
    Generate classical RSA CA key + self-signed certificate
    """
    if CA_CERT_PATH.exists():
        print("[✔] Classical CA already exists")
        return

    print("[*] Generating RSA CA private key...")
    subprocess.run(["openssl", "genrsa", "-out", str(RSA_KEY_PATH), "4096"], check=True)

    print("[*] Generating self-signed CA certificate...")
    subprocess.run(
        [
            "openssl",
            "req",
            "-new",
            "-x509",
            "-key",
            str(RSA_KEY_PATH),
            "-out",
            str(CA_CERT_PATH),
            "-days",
            "3650",
            "-subj",
            "/C=IN/ST=MH/O=HybridBank/CN=HybridBank-Root-CA",
        ],
        check=True,
    )

    print("[✔] Classical CA certificate created")


def generate_pq_ca():
    """
    Generate Dilithium CA keypair
    """
    if PQ_CA_PRIVATE.exists():
        print("[✔] PQ CA keys already exist")
        return

    print("[*] Generating Dilithium CA keypair...")
    pq_keys = PQCryptoService.generate_keypair()
    public_key = pq_keys["public_key"]
    private_key = pq_keys["private_key"]

    with open(PQ_CA_PUBLIC, "wb") as f:
        f.write(public_key)

    with open(PQ_CA_PRIVATE, "wb") as f:
        f.write(private_key)

    print("[✔] PQ (Dilithium) CA keys created")


if __name__ == "__main__":
    ensure_dirs()
    generate_classical_ca()
    generate_pq_ca()

    print("\n🎉 Hybrid CA initialization completed successfully")
