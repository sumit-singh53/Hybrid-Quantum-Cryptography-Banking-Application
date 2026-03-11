#!/usr/bin/env python3
"""One-time helper to mint a local system_admin certificate for development.

This script:
1. Generates a fresh RSA-3072 key pair.
2. Calls SystemAdminService to issue a certificate for role system_admin.
3. Writes the private key, certificate, and metadata to the chosen output folder.

Usage (from backend/):
    python scripts/bootstrap_system_admin.py \
        --user-id admin@example.com \
        --full-name "System Admin" \
        --device-secret "your-secret" \
        --out-dir ./instance/bootstrap_admin
"""

from __future__ import annotations

import argparse
import base64
import os
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")
os.environ.setdefault("FLASK_ENV", "development")

DEFAULT_USER_ID = os.getenv("SYSTEM_ADMIN_USER_ID", "admin")
DEFAULT_FULL_NAME = os.getenv("SYSTEM_ADMIN_FULL_NAME", "System Admin")
DEFAULT_DEVICE_SECRET = os.getenv("SYSTEM_ADMIN_DEVICE_SECRET", "911313")

from app.security.kyber_crystal import KyberCrystal  # noqa: E402
from app.services.system_admin_service import SystemAdminService  # noqa: E402


def _generate_rsa_spki() -> tuple[bytes, str]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_der = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    public_b64 = base64.b64encode(public_der).decode()
    return private_pem, public_b64


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bootstrap a local system_admin credential"
    )
    parser.add_argument(
        "--user-id",
        default=DEFAULT_USER_ID,
        help=f"Unique identifier / email for the admin (default: {DEFAULT_USER_ID})",
    )
    parser.add_argument(
        "--full-name",
        default=DEFAULT_FULL_NAME,
        help=f"Display name for the admin (default: {DEFAULT_FULL_NAME})",
    )
    parser.add_argument(
        "--device-secret",
        default=DEFAULT_DEVICE_SECRET,
        help=f"Device secret required at login (default: {DEFAULT_DEVICE_SECRET})",
    )
    parser.add_argument(
        "--out-dir",
        default=str(BASE_DIR / "instance" / "bootstrap_admin"),
        help="Directory to write outputs",
    )
    parser.add_argument(
        "--validity-days", type=int, default=60, help="Certificate validity window"
    )
    args = parser.parse_args()

    private_pem, public_b64 = _generate_rsa_spki()
    kyber_pair = KyberCrystal.generate_keypair()
    ml_kem_public_b64 = kyber_pair["public_key"]
    ml_kem_private_b64 = kyber_pair["private_key"]

    cert = SystemAdminService.issue_system_admin_certificate(
        user_id=args.user_id,
        full_name=args.full_name,
        device_secret=args.device_secret,
        ml_kem_public_key_b64=ml_kem_public_b64,
        rsa_public_key_spki=public_b64,
        pq_public_key_b64=None,
        validity_days=args.validity_days,
    )

    output_dir = Path(args.out_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    private_path = output_dir / f"{args.user_id}_system_admin_private.pem"
    cert_path = output_dir / f"{args.user_id}_system_admin_certificate.pem"
    mlkem_private_path = output_dir / f"{args.user_id}_mlkem_private.pem"
    device_secret_path = output_dir / f"{args.user_id}_device_secret.txt"
    info_path = output_dir / "metadata.txt"

    private_path.write_bytes(private_pem)
    cert_path.write_text(cert["certificate_pem"], encoding="utf-8")
    mlkem_private_path.write_text(ml_kem_private_b64, encoding="utf-8")
    device_secret_path.write_text(args.device_secret.strip(), encoding="utf-8")
    info_path.write_text(
        (
            f"user_id: {args.user_id}\n"
            f"full_name: {args.full_name}\n"
            f"role: system_admin\n"
            f"device_secret: {args.device_secret}\n"
            f"ml_kem_public_key: {ml_kem_public_b64}\n"
            f"ml_kem_private_key_path: {mlkem_private_path}\n"
            f"device_secret_path: {device_secret_path}\n"
            f"certificate_path: {cert_path}\n"
            f"valid_to: {cert['valid_to']}\n"
        ),
        encoding="utf-8",
    )

    print("System admin credential generated:")
    print(f"  Private key: {private_path}")
    print(f"  Certificate: {cert_path}")
    print(f"  ML-KEM private key: {mlkem_private_path}")
    print(f"  Device secret: {device_secret_path}")
    print(f"  Metadata:   {info_path}")
    print(
        "Use the certificate + device secret on /login to access /system-admin/dashboard."
    )


if __name__ == "__main__":
    main()
