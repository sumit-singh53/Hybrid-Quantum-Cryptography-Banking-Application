#!/usr/bin/env python3
"""Bootstrap helper to mint a local manager certificate for development.

This script generates an RSA-3072 key pair, calls the CertificateService to
issue a `manager` role certificate, and writes the private key, certificate,
and helpful metadata to disk so that you can log into the manager dashboard
locally.

Example (from backend/):
    python scripts/bootstrap_manager.py \
        --user-id manager@example.com \
        --full-name "Branch Manager" \
        --device-secret "your-device-secret" \
        --out-dir ./instance/bootstrap_manager
"""

from __future__ import annotations

import argparse
import base64
import os
import sys
from pathlib import Path
from typing import Optional, Tuple

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("FLASK_ENV", "development")

DEFAULT_USER_ID = os.getenv("MANAGER_USER_ID", "manager-local")
DEFAULT_FULL_NAME = os.getenv("MANAGER_FULL_NAME", "Local Manager")
DEFAULT_DEVICE_SECRET = os.getenv("MANAGER_DEVICE_SECRET", "mgr-secret")

from app.services.certificate_service import CertificateService  # noqa: E402

ROLE = "manager"


def _generate_rsa_spki() -> Tuple[bytes, str]:
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


def _resolve_pq_key(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    candidate = Path(value).expanduser()
    if candidate.exists():
        return candidate.read_text(encoding="utf-8").strip()
    return value.strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Issue a local manager certificate")
    parser.add_argument(
        "--user-id", default=DEFAULT_USER_ID, help="Unique identifier for the manager"
    )
    parser.add_argument(
        "--full-name", default=DEFAULT_FULL_NAME, help="Display name for the manager"
    )
    parser.add_argument(
        "--device-secret",
        default=DEFAULT_DEVICE_SECRET,
        help="Device secret required at login",
    )
    parser.add_argument(
        "--out-dir",
        default=str(BASE_DIR / "instance" / "bootstrap_manager"),
        help="Directory where the key + certificate will be written",
    )
    parser.add_argument(
        "--pq-public-key",
        help="Optional base64 PQ public key or path to the file",
        default=None,
    )
    parser.add_argument(
        "--validity-days",
        type=int,
        default=60,
        help="Certificate validity window in days",
    )
    args = parser.parse_args()

    private_pem, rsa_public_b64 = _generate_rsa_spki()
    pq_key = _resolve_pq_key(args.pq_public_key)

    cert_bundle = CertificateService.issue_customer_certificate(
        user_id=args.user_id,
        full_name=args.full_name,
        role=ROLE,
        device_secret=args.device_secret,
        rsa_public_key_spki=rsa_public_b64,
        pq_public_key_b64=pq_key,
        validity_days=args.validity_days,
    )

    output_dir = Path(args.out_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    private_path = output_dir / f"{args.user_id}_{ROLE}.key"
    cert_path = output_dir / f"{args.user_id}_{ROLE}.pem"
    info_path = output_dir / "metadata.txt"

    private_path.write_bytes(private_pem)
    cert_path.write_text(cert_bundle["certificate_pem"], encoding="utf-8")
    info_path.write_text(
        (
            f"user_id: {args.user_id}\n"
            f"full_name: {args.full_name}\n"
            f"role: {ROLE}\n"
            f"device_secret: {args.device_secret}\n"
            f"certificate_path: {cert_path}\n"
            f"valid_to: {cert_bundle['valid_to']}\n"
        ),
        encoding="utf-8",
    )

    print("Manager credential generated:")
    print(f"  Private key: {private_path}")
    print(f"  Certificate: {cert_path}")
    print(f"  Metadata:   {info_path}")
    print(
        "Use this certificate + device secret during login to access /manager/dashboard."
    )


if __name__ == "__main__":
    main()
