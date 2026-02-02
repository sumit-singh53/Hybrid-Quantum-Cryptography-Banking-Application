import base64
import json
import os
import secrets
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class CertificateVaultError(RuntimeError):
    """Raised when the vault cannot process the request."""


@dataclass(frozen=True)
class VaultBlob:
    version: int
    salt: bytes
    nonce: bytes
    ciphertext: bytes


class CertificateVault:
    """Encrypts and decrypts certificate blobs at rest using AES-GCM."""

    VERSION = 1
    SALT_BYTES = 16
    NONCE_BYTES = 12
    KEY_LEN = 32
    PBKDF2_ITERATIONS = 200_000
    PASSPHRASE_ENV = "CERT_VAULT_PASSPHRASE"
    SECRET_FILE_ENV = "CERT_VAULT_SECRET_FILE"
    DEFAULT_SECRET_FILE = (
        Path(__file__).resolve().parents[2] / "instance" / "cert_vault.key"
    )

    @classmethod
    def _secret_file_path(cls) -> Path:
        custom_path = os.environ.get(cls.SECRET_FILE_ENV)
        if custom_path:
            return Path(custom_path)
        return cls.DEFAULT_SECRET_FILE

    @classmethod
    def _load_or_create_secret(cls) -> str:
        path = cls._secret_file_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            return path.read_text(encoding="utf-8").strip()
        secret = secrets.token_hex(32)
        path.write_text(secret, encoding="utf-8")
        return secret

    @classmethod
    def _require_passphrase(cls) -> bytes:
        secret = os.environ.get(cls.PASSPHRASE_ENV)
        if secret:
            return secret.encode("utf-8")
        fallback_secret = cls._load_or_create_secret()
        return fallback_secret.encode("utf-8")

    @classmethod
    def _derive_key(cls, salt: bytes) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=cls.KEY_LEN,
            salt=salt,
            iterations=cls.PBKDF2_ITERATIONS,
        )
        return kdf.derive(cls._require_passphrase())

    @staticmethod
    def _encode_blob(blob: VaultBlob) -> str:
        payload = {
            "version": blob.version,
            "salt": base64.b64encode(blob.salt).decode("ascii"),
            "nonce": base64.b64encode(blob.nonce).decode("ascii"),
            "ciphertext": base64.b64encode(blob.ciphertext).decode("ascii"),
            "kdf": {
                "alg": "PBKDF2-SHA256",
                "iterations": CertificateVault.PBKDF2_ITERATIONS,
            },
            "cipher": "AES-256-GCM",
        }
        return json.dumps(payload, separators=(",", ":"))

    @staticmethod
    def _decode_blob(payload: str) -> Optional[VaultBlob]:
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            return None

        if not isinstance(parsed, dict):
            return None
        if "ciphertext" not in parsed or "salt" not in parsed or "nonce" not in parsed:
            return None
        version = int(parsed.get("version", 0))
        if version != CertificateVault.VERSION:
            raise CertificateVaultError("Unsupported vault version")
        return VaultBlob(
            version=version,
            salt=base64.b64decode(parsed["salt"]),
            nonce=base64.b64decode(parsed["nonce"]),
            ciphertext=base64.b64decode(parsed["ciphertext"]),
        )

    @classmethod
    def store(cls, path: Path, plaintext: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        salt = os.urandom(cls.SALT_BYTES)
        nonce = os.urandom(cls.NONCE_BYTES)
        key = cls._derive_key(salt)
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        blob = VaultBlob(
            version=cls.VERSION,
            salt=salt,
            nonce=nonce,
            ciphertext=ciphertext,
        )
        path.write_text(cls._encode_blob(blob), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> str:
        if not path.exists():
            raise FileNotFoundError(path)

        raw = path.read_text(encoding="utf-8")
        blob = cls._decode_blob(raw)
        if blob is None:
            # Legacy plaintext file, migrate in-place
            cls.store(path, raw)
            return raw

        key = cls._derive_key(blob.salt)
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(blob.nonce, blob.ciphertext, None)
        return plaintext.decode("utf-8")

    @classmethod
    def load_if_exists(cls, path: Path) -> Optional[str]:
        if not path.exists():
            return None
        return cls.load(path)
