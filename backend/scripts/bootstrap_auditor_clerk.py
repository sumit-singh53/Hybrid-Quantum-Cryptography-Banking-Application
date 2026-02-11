#!/usr/bin/env python3
"""Bootstrap helper to mint a local auditor_clerk certificate for development.

The script mirrors the manager bootstrapper: it generates an RSA-3072 key
pair, calls CertificateService to issue an `auditor_clerk` role certificate,
and saves the private key, certificate, and metadata payload locally so that
you can log into the auditor dashboard without manual CA work.

Example usage (from backend/):
    python scripts/bootstrap_auditor_clerk.py \
        --user-id auditor@example.com \
        --full-name "Audit Analyst" \
        --device-secret "auditor-device-secret" \
        --out-dir ./instance/bootstrap_auditor
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
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")
os.environ.setdefault("FLASK_ENV", "development")

DEFAULT_USER_ID = os.getenv("AUDITOR_USER_ID", "auditor-local")
DEFAULT_FULL_NAME = os.getenv("AUDITOR_FULL_NAME", "Local Auditor")
DEFAULT_DEVICE_SECRET = os.getenv("AUDITOR_DEVICE_SECRET", "123456")

from app.services.certificate_service import CertificateService  # noqa: E402
from app.security.kyber_crystal import KyberCrystal  # noqa: E402

ROLE = "auditor_clerk"


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
    parser = argparse.ArgumentParser(
        description="Issue a local auditor_clerk certificate"
    )
    parser.add_argument(
        "--user-id", default=DEFAULT_USER_ID, help="Unique identifier for the auditor"
    )
    parser.add_argument(
        "--full-name", default=DEFAULT_FULL_NAME, help="Display name for the auditor"
    )
    parser.add_argument(
        "--device-secret",
        default=DEFAULT_DEVICE_SECRET,
        help="Device secret required at login",
    )
    parser.add_argument(
        "--out-dir",
        default=str(BASE_DIR / "instance" / "bootstrap_auditor"),
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
    
    # Generate ML-KEM keypair
    kyber_pair = KyberCrystal.generate_keypair()
    ml_kem_public_b64 = kyber_pair["public_key"]
    ml_kem_private_b64 = kyber_pair["private_key"]

    cert_bundle = CertificateService.issue_customer_certificate(
        user_id=args.user_id,
        full_name=args.full_name,
        role=ROLE,
        ml_kem_public_key_b64=ml_kem_public_b64,
        device_secret=args.device_secret,
        rsa_public_key_spki=rsa_public_b64,
        pq_public_key_b64=pq_key,
        validity_days=args.validity_days,
    )

    output_dir = Path(args.out_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    private_path = output_dir / f"{args.user_id}_{ROLE}_private.pem"
    cert_path = output_dir / f"{args.user_id}_{ROLE}_certificate.pem"
    mlkem_private_path = output_dir / f"{args.user_id}_mlkem_private.pem"
    device_secret_path = output_dir / f"{args.user_id}_device_secret.txt"
    info_path = output_dir / "metadata.txt"

    private_path.write_bytes(private_pem)
    cert_path.write_text(cert_bundle["certificate_pem"], encoding="utf-8")
    mlkem_private_path.write_text(ml_kem_private_b64, encoding="utf-8")
    device_secret_path.write_text(args.device_secret.strip(), encoding="utf-8")
    info_path.write_text(
        (
            f"user_id: {args.user_id}\n"
            f"full_name: {args.full_name}\n"
            f"role: {ROLE}\n"
            f"device_secret: {args.device_secret}\n"
            f"ml_kem_public_key: {ml_kem_public_b64}\n"
            f"ml_kem_private_key_path: {mlkem_private_path}\n"
            f"device_secret_path: {device_secret_path}\n"
            f"certificate_path: {cert_path}\n"
            f"valid_to: {cert_bundle['valid_to']}\n"
        ),
        encoding="utf-8",
    )

    print("Auditor/Clerk credential generated:")
    print(f"  Private key: {private_path}")
    print(f"  Certificate: {cert_path}")
    print(f"  ML-KEM private key: {mlkem_private_path}")
    print(f"  Device secret: {device_secret_path}")
    print(f"  Metadata:   {info_path}")
    print("Use this certificate + device secret to access /auditor/dashboard locally.")


if __name__ == "__main__":
    main()
