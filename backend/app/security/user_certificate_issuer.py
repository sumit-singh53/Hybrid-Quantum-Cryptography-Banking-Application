"""Manual hybrid certificate issuer for ops tooling."""

import subprocess
import hashlib
from pathlib import Path

from app.services.pq_crypto_service import PQCryptoService

BASE_DIR = Path(__file__).resolve().parents[2]
BASE_USERS_PATH = BASE_DIR / "certificates" / "users"
CA_CERT_PATH = BASE_DIR / "certificates" / "ca" / "ca_certificate.pem"
CA_KEY_PATH = BASE_DIR / "certificates" / "ca" / "ca_rsa_private.key"


def ensure_role_dirs():
    for role in ["customer", "manager", "auditor_clerk"]:
        (BASE_USERS_PATH / role).mkdir(parents=True, exist_ok=True)


def issue_user_certificate(username: str, role: str):
    if role not in ["customer", "manager", "auditor_clerk"]:
        raise ValueError("Invalid role")

    ensure_role_dirs()
    role_path = BASE_USERS_PATH / role

    user_key = role_path / f"{username}_rsa.key"
    user_csr = role_path / f"{username}.csr"
    user_cert = role_path / f"{username}_cert.pem"
    pq_pub_path = role_path / f"{username}_pq_public.key"
    pq_priv_path = role_path / f"{username}_pq_private.key"

    print(f"[*] Generating RSA key for {username}")
    subprocess.run(["openssl", "genrsa", "-out", str(user_key), "2048"], check=True)

    print(f"[*] Creating CSR for {username}")
    subprocess.run(
        [
            "openssl",
            "req",
            "-new",
            "-key",
            str(user_key),
            "-out",
            str(user_csr),
            "-subj",
            f"/C=IN/ST=MH/O=HybridBank/CN={username}",
        ],
        check=True,
    )

    print(f"[*] Signing certificate with CA")
    subprocess.run(
        [
            "openssl",
            "x509",
            "-req",
            "-in",
            str(user_csr),
            "-CA",
            str(CA_CERT_PATH),
            "-CAkey",
            str(CA_KEY_PATH),
            "-CAcreateserial",
            "-out",
            str(user_cert),
            "-days",
            "365",
        ],
        check=True,
    )

    print(f"[*] Generating Dilithium keys for {username}")
    pq_keys = PQCryptoService.generate_keypair()
    pq_pub_path.write_bytes(pq_keys["public_key"])
    pq_priv_path.write_bytes(pq_keys["private_key"])

    fingerprint = hashlib.sha256(user_cert.read_bytes()).hexdigest()

    print(f"[✔] User {username} issued successfully")
    print(f"    Role        : {role}")
    print(f"    Cert file   : {user_cert}")
    print(f"    PQ pub key  : {pq_pub_path}")
    print(f"    Fingerprint : {fingerprint}")

    return {
        "username": username,
        "role": role,
        "certificate": str(user_cert),
        "pq_public_key": str(pq_pub_path),
        "fingerprint": fingerprint,
    }


if __name__ == "__main__":
    ensure_role_dirs()
    issue_user_certificate("test_customer", "customer")
