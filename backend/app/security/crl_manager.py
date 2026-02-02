"""
CRL Manager
-----------
Manages Certificate Revocation List (CRL)

CRL format (simple, demo-safe, research-acceptable):
- One SHA256 certificate fingerprint per line

File:
certificates/revoked/crl.pem
"""

import os
import hashlib

CRL_PATH = "certificates/revoked/crl.pem"


def ensure_crl_file():
    """
    Create CRL file if it does not exist
    """
    os.makedirs(os.path.dirname(CRL_PATH), exist_ok=True)

    if not os.path.exists(CRL_PATH):
        with open(CRL_PATH, "w") as f:
            f.write("# Certificate Revocation List\n")
        print("[✔] CRL file created")


def compute_cert_fingerprint(cert_path: str) -> str:
    """
    Compute SHA256 fingerprint of a certificate
    """
    with open(cert_path, "rb") as f:
        cert_bytes = f.read()
    return hashlib.sha256(cert_bytes).hexdigest()


def revoke_certificate(cert_path: str):
    """
    Add certificate fingerprint to CRL
    """
    fingerprint = compute_cert_fingerprint(cert_path)

    ensure_crl_file()

    with open(CRL_PATH, "r") as f:
        entries = f.read()

    if fingerprint in entries:
        print("[!] Certificate already revoked")
        return

    with open(CRL_PATH, "a") as f:
        f.write(fingerprint + "\n")

    print("[✔] Certificate revoked")
    print(f"    Fingerprint: {fingerprint}")


def is_certificate_revoked(cert_path: str) -> bool:
    """
    Check if certificate is revoked
    """
    fingerprint = compute_cert_fingerprint(cert_path)

    if not os.path.exists(CRL_PATH):
        return False

    with open(CRL_PATH, "r") as f:
        revoked = f.read().splitlines()

    return fingerprint in revoked


if __name__ == "__main__":
    ensure_crl_file()

    # Example usage (for testing only)
    # revoke_certificate("certificates/users/customer/test_customer_cert.pem")
