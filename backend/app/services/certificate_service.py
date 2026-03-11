import base64
import json
import hashlib
import secrets
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature

from app.services.ca_init_service import CAInitService
from app.services.pq_crypto_service import PQCryptoService
from app.services.role_service import RoleService
from app.security.device_binding_store import DeviceBindingStore
from app.security.kyber_crystal import KyberCrystal
from app.security.certificate_vault import CertificateVault, CertificateVaultError


class CertificateService:
    SIGN_ALGO = "RSA"
    PQ_SIGNATURE_ALGO = PQCryptoService.SIGN_ALGO
    HASH_ALGO = "SHA3-256"
    DEVICE_BINDING_ALG = "DeviceSecret SHA3-256"
    CHALLENGE_ALG = "DeviceSecret SHA3-256 + nonce"
    CLIENT_SIGNATURE_SUITE = "RSA-3072/SHA-256 + ML-DSA-65"
    DEFENSE_VERSION = "golden-rule-v1"
    PURPOSE_SCOPE = "role-restricted-banking"
    SECURITY_LAYERS = [
        "HybridSignatures",
        "ImmutableCertHash",
        "DeviceBinding",
        "PurposeLock",
        "CRLTracking",
        "Lineage",
        "ChallengeResponse",
    ]

    BASE_DIR = Path(__file__).resolve().parents[2]
    CERT_BASE = BASE_DIR / "certificates" / "users"
    CA_PRIVATE_KEY = BASE_DIR / "certificates" / "ca" / "ca_rsa_private.key"
    CA_PUBLIC_KEY = BASE_DIR / "certificates" / "ca" / "ca_rsa_public.key"
    PQ_CA_PRIVATE_KEY = BASE_DIR / "certificates" / "ca" / "pq_ca_private.key"
    PQ_CA_PUBLIC_KEY = BASE_DIR / "certificates" / "ca" / "pq_ca_public.key"
    CRL_PATH = BASE_DIR / "certificates" / "revoked" / "crl.json"
    CRL_URL = "/certificates/revoked/crl.json"
    CRL_CACHE_TTL_SECONDS = 300
    _CRL_CACHE = {"data": None, "loaded_at": 0.0}
    _CRL_LOCK = threading.Lock()

    @staticmethod
    def _ensure_classical_ca_material():
        if (
            CertificateService.CA_PRIVATE_KEY.exists()
            and CertificateService.CA_PUBLIC_KEY.exists()
        ):
            return
        CAInitService.initialize_ca()

    @staticmethod
    def _ensure_pq_ca_material():
        if (
            CertificateService.PQ_CA_PRIVATE_KEY.exists()
            and CertificateService.PQ_CA_PUBLIC_KEY.exists()
        ):
            return

        CertificateService.PQ_CA_PRIVATE_KEY.parent.mkdir(parents=True, exist_ok=True)
        pq_keys = PQCryptoService.generate_keypair()

        with open(CertificateService.PQ_CA_PRIVATE_KEY, "wb") as f:
            f.write(pq_keys["private_key"])

        with open(CertificateService.PQ_CA_PUBLIC_KEY, "wb") as f:
            f.write(pq_keys["public_key"])

    @classmethod
    def rotate_pq_ca_keys(cls) -> dict:
        """Regenerate the PQ CA key material."""

        cls.PQ_CA_PRIVATE_KEY.parent.mkdir(parents=True, exist_ok=True)
        pq_keys = PQCryptoService.generate_keypair()
        with open(cls.PQ_CA_PRIVATE_KEY, "wb") as handle:
            handle.write(pq_keys["private_key"])

        with open(cls.PQ_CA_PUBLIC_KEY, "wb") as handle:
            handle.write(pq_keys["public_key"])

        return {
            "message": "Post-quantum CA keys rotated",
            "private_key_path": str(cls.PQ_CA_PRIVATE_KEY),
            "public_key_path": str(cls.PQ_CA_PUBLIC_KEY),
        }

    @staticmethod
    def _security_layers_label() -> str:
        return "|".join(CertificateService.SECURITY_LAYERS)

    @staticmethod
    def _ensure_user_dir(role: str) -> Path:
        target = CertificateService.CERT_BASE / role
        target.mkdir(parents=True, exist_ok=True)
        return target

    @staticmethod
    def _certificate_path(role: str, certificate_id: str) -> Path:
        return CertificateService.CERT_BASE / role / f"{certificate_id}.pem"

    @staticmethod
    def _load_certificate_text(role: str, certificate_id: str) -> Optional[str]:
        cert_path = CertificateService._certificate_path(role, certificate_id)
        try:
            return CertificateVault.load(cert_path)
        except FileNotFoundError:
            return None

    @staticmethod
    def _role_search_order(preferred_role: Optional[str] = None) -> List[str]:
        roles = list(RoleService.ROLE_PERMISSIONS.keys())
        if preferred_role and preferred_role in roles:
            return [preferred_role] + [r for r in roles if r != preferred_role]
        return roles

    @staticmethod
    def _load_bytes(path: Path) -> bytes:
        if not Path(path).exists():
            raise FileNotFoundError(f"Required cryptographic asset missing: {path}")
        with open(path, "rb") as file_obj:
            return file_obj.read()

    @staticmethod
    def _ensure_crl() -> None:
        CertificateService.CRL_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not CertificateService.CRL_PATH.exists():
            raise FileNotFoundError(
                "Certificate Revocation List unavailable; CRL endpoint not reachable"
            )

    @staticmethod
    def _read_crl_from_disk() -> Dict[str, List[str]]:
        CertificateService._ensure_crl()
        try:
            with CertificateService.CRL_PATH.open("r", encoding="utf-8") as handle:
                crl_data = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError("Unable to load CRL data from authority store") from exc

        if not isinstance(crl_data, dict):
            raise RuntimeError("CRL data malformed")
        return crl_data

    @staticmethod
    def _write_crl(data: Dict[str, List[str]]) -> None:
        CertificateService.CRL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with CertificateService.CRL_PATH.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
        CertificateService._CRL_CACHE["data"] = data
        CertificateService._CRL_CACHE["loaded_at"] = time.time()

    @staticmethod
    def _load_crl() -> Dict[str, List[str]]:
        cache = CertificateService._CRL_CACHE
        now = time.time()
        cached_data = cache.get("data")
        loaded_at = cache.get("loaded_at") or 0.0
        if (
            cached_data is not None
            and loaded_at
            and now - loaded_at < CertificateService.CRL_CACHE_TTL_SECONDS
        ):
            return cached_data

        crl_data = CertificateService._read_crl_from_disk()

        cache["data"] = crl_data
        cache["loaded_at"] = now
        return crl_data

    @staticmethod
    def is_revoked(certificate_id: str) -> bool:
        crl = CertificateService._load_crl()
        return certificate_id in set(crl.get("revoked", []))

    @classmethod
    def revoke_certificate(
        cls,
        certificate_id: str,
        *,
        reason: str,
        requested_by: Optional[Dict[str, str]] = None,
    ) -> Dict[str, str]:
        if not certificate_id:
            raise ValueError("certificate_id is required")
        normalized_reason = (reason or "Violation of policy").strip()
        metadata = {
            "certificate_id": certificate_id,
            "reason": normalized_reason,
            "revoked_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
            "requested_by": (requested_by or {}).get("name") or "manager",
        }

        with cls._CRL_LOCK:
            crl_data = cls._read_crl_from_disk()
            revoked_set = set(crl_data.get("revoked", []))
            if certificate_id in revoked_set:
                existing_meta = (crl_data.get("metadata") or {}).get(certificate_id)
                return existing_meta or metadata
            revoked_set.add(certificate_id)
            crl_data["revoked"] = sorted(revoked_set)
            meta_bucket = crl_data.setdefault("metadata", {})
            meta_bucket[certificate_id] = metadata
            cls._write_crl(crl_data)
        return metadata

    @staticmethod
    def derive_device_id_from_mlkem(ml_kem_public_key_b64: str) -> str:
        if not ml_kem_public_key_b64:
            raise ValueError("ML-KEM public key is required for device binding")
        digest = hashlib.sha256()
        digest.update(base64.b64decode(ml_kem_public_key_b64))
        return digest.hexdigest()

    @staticmethod
    def derive_device_id(device_secret: str) -> str:
        """Backward-compatible helper for legacy device secrets."""
        return CertificateService.derive_device_id_legacy(device_secret)

    @staticmethod
    def derive_device_id_legacy(device_secret: str) -> str:
        digest = hashlib.sha256()
        digest.update(device_secret.encode("utf-8"))
        return digest.hexdigest()

    @staticmethod
    def _canonical_json(payload: dict) -> str:
        return json.dumps(payload, sort_keys=True, separators=(",", ":"))

    @staticmethod
    def compute_cert_hash(payload: dict) -> str:
        digest = hashlib.sha3_256()
        digest.update(CertificateService._canonical_json(payload).encode("utf-8"))
        return digest.hexdigest()

    @staticmethod
    def compute_mlkem_challenge_proof(shared_secret: bytes, nonce: bytes) -> str:
        if not isinstance(shared_secret, (bytes, bytearray)):
            raise TypeError("Shared secret must be bytes")
        digest = hashlib.sha3_256()
        digest.update(bytes(shared_secret))
        digest.update(nonce)
        return digest.hexdigest()

    @staticmethod
    def compute_device_proof(device_secret: str, nonce: bytes) -> str:
        return CertificateService.compute_device_proof_legacy(device_secret, nonce)

    @staticmethod
    def compute_device_proof_legacy(device_secret: str, nonce: bytes) -> str:
        digest = hashlib.sha3_256()
        digest.update(device_secret.encode("utf-8"))
        digest.update(nonce)
        return digest.hexdigest()

    @staticmethod
    def _parse_certificate_text(text: str) -> dict:
        payload = {}
        for line in text.splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                payload[key.strip()] = value.strip()
        return payload

    @staticmethod
    def load_certificate_payload(
        certificate_id: str, preferred_role: Optional[str] = None
    ) -> Tuple[dict, str]:
        """Return the decrypted certificate payload and backing path."""

        for role in CertificateService._role_search_order(preferred_role):
            cert_path = CertificateService._certificate_path(role, certificate_id)
            try:
                plaintext = CertificateVault.load(cert_path)
            except FileNotFoundError:
                continue
            payload = CertificateService._parse_certificate_text(plaintext)
            return payload, str(cert_path)
        raise FileNotFoundError("Certificate not found for accountability request")

    @staticmethod
    def fetch_certificate_text(
        certificate_id: str, preferred_role: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """Return plaintext certificate, resolved role, and storage path."""

        for role in CertificateService._role_search_order(preferred_role):
            cert_path = CertificateService._certificate_path(role, certificate_id)
            try:
                plaintext = CertificateVault.load(cert_path)
            except FileNotFoundError:
                continue
            return plaintext, role, str(cert_path)
        raise FileNotFoundError("Certificate not found for download")

    @staticmethod
    def _next_generation(user_id: str, role: str) -> int:
        cert_path = CertificateService._certificate_path(role, user_id)
        existing_text = CertificateVault.load_if_exists(cert_path)
        if not existing_text:
            return 1
        existing = CertificateService._parse_certificate_text(existing_text)
        existing_generation = int(existing.get("cert_generation", "0") or 0)
        return existing_generation + 1

    @staticmethod
    def _parent_ca_fingerprint() -> str:
        public_bytes = CertificateService._load_bytes(CertificateService.CA_PUBLIC_KEY)
        digest = hashlib.sha256()
        digest.update(public_bytes)
        return digest.hexdigest()

    # =====================================================
    # ISSUE CUSTOMER CERTIFICATE
    # =====================================================
    @staticmethod
    def issue_customer_certificate(
        user_id,
        full_name,
        role,
        ml_kem_public_key_b64: str,
        *,
        rsa_public_key_spki: str,
        pq_public_key_b64: Optional[str] = None,
        validity_days: int = 30,
        device_secret: Optional[str] = None,
    ):
        if role not in RoleService.ROLE_PERMISSIONS:
            raise ValueError("Invalid role supplied for certificate issuance")
        if not ml_kem_public_key_b64:
            raise ValueError("ML-KEM public key is required for issuance")
        if not rsa_public_key_spki:
            raise ValueError("Client RSA public key is required for issuance")

        CertificateService._ensure_classical_ca_material()
        CertificateService._ensure_pq_ca_material()
        CertificateService._ensure_user_dir(role)

        try:
            rsa_public_bytes = base64.b64decode(rsa_public_key_spki)
        except Exception as exc:  # pylint: disable=broad-except
            raise ValueError("Client RSA public key must be base64 encoded") from exc

        try:
            rsa_public = serialization.load_der_public_key(rsa_public_bytes)
        except ValueError:
            # Support legacy PEM uploads (still base64 encoded)
            rsa_public = serialization.load_pem_public_key(rsa_public_bytes)
            rsa_public_bytes = rsa_public.public_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )

        normalized_rsa_public_b64 = base64.b64encode(rsa_public_bytes).decode()
        normalized_pq_public_b64 = (pq_public_key_b64 or "").strip()

        allowed_actions = RoleService.ROLE_PERMISSIONS.get(role, [])
        allowed_actions_str = ",".join(sorted(allowed_actions))
        valid_from = datetime.utcnow().replace(microsecond=0)
        valid_to = valid_from + timedelta(days=validity_days)
        resolved_device_secret = (device_secret or secrets.token_urlsafe(32)).strip()
        if not resolved_device_secret:
            raise ValueError("Device secret cannot be empty")
        device_id = CertificateService.derive_device_id(resolved_device_secret)
        DeviceBindingStore.store_binding(
            user_id,
            device_secret=resolved_device_secret,
        )
        parent_fp = CertificateService._parent_ca_fingerprint()
        cert_generation = CertificateService._next_generation(user_id, role)
        lineage_id = f"{parent_fp}:{cert_generation}"

        issued_at = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

        crypto_suite = {
            "classical_signature": "RSA-3072/SHA3-256",
            "pq_signature": "Dilithium-3",
            "client_signature": CertificateService.CLIENT_SIGNATURE_SUITE,
            "kem": KyberCrystal.ALG_NAME,
        }

        # -----------------------------
        # Certificate Payload
        # -----------------------------
        signable_payload = {
            "certificate_id": user_id,
            "user_id": user_id,
            "owner": full_name,
            "role": role,
            "allowed_actions": allowed_actions_str,
            "lineage_id": lineage_id,
            "cert_generation": str(cert_generation),
            "rsa_public_key": normalized_rsa_public_b64,
            "pq_public_key": normalized_pq_public_b64,
            "ml_kem_public_key": ml_kem_public_key_b64,
            "classical_signature_alg": crypto_suite["classical_signature"],
            "pq_signature_alg": crypto_suite["pq_signature"],
            "client_signature_suite": crypto_suite["client_signature"],
            "issued_at": issued_at,
            "valid_from": valid_from.isoformat() + "Z",
            "valid_to": valid_to.isoformat() + "Z",
            "hash_alg": CertificateService.HASH_ALGO,
            "device_binding_alg": CertificateService.DEVICE_BINDING_ALG,
            "challenge_alg": CertificateService.CHALLENGE_ALG,
            "device_id": device_id,
            "crl_url": CertificateService.CRL_URL,
            "parent_ca_fp": parent_fp,
            "purpose_scope": CertificateService.PURPOSE_SCOPE,
            "defense_version": CertificateService.DEFENSE_VERSION,
            "security_layers": CertificateService._security_layers_label(),
        }

        cert_hash = CertificateService.compute_cert_hash(signable_payload)
        payload_with_hash = {**signable_payload, "cert_hash": cert_hash}
        signable_bytes = CertificateService._canonical_json(payload_with_hash).encode(
            "utf-8"
        )

        # -----------------------------
        # CA Signatures (RSA + Dilithium)
        # -----------------------------
        ca_private_bytes = CertificateService._load_bytes(
            CertificateService.CA_PRIVATE_KEY
        )
        ca_private = serialization.load_pem_private_key(ca_private_bytes, password=None)

        signature = ca_private.sign(
            signable_bytes,
            padding.PKCS1v15(),
            hashes.SHA3_256(),
        )

        pq_ca_private = CertificateService._load_bytes(
            CertificateService.PQ_CA_PRIVATE_KEY
        )
        dilithium_signature = PQCryptoService.sign(signable_bytes, pq_ca_private)

        cert_data = {
            **payload_with_hash,
            "rsa_signature": base64.b64encode(signature).decode(),
            "dilithium_signature": base64.b64encode(dilithium_signature).decode(),
        }

        # -----------------------------
        # Write Certificate (.pem)
        # -----------------------------
        cert_path = CertificateService._certificate_path(role, user_id)
        stored_cert_lines = [f"{k}={v}" for k, v in cert_data.items()]
        stored_cert_text = "\n".join(stored_cert_lines) + "\n"

        try:
            CertificateVault.store(cert_path, stored_cert_text)
        except CertificateVaultError as exc:
            raise RuntimeError("Certificate vault not configured") from exc

        return {
            "certificate_path": str(cert_path),
            "certificate_pem": stored_cert_text,
            "crypto_suite": crypto_suite,
            "valid_to": cert_data["valid_to"],
            "lineage": cert_data["lineage_id"],
            "device_secret": resolved_device_secret,
            "cert_hash": cert_data["cert_hash"],
            "ml_kem_public_key": cert_data["ml_kem_public_key"],
        }

    # =====================================================
    # VERIFY CERTIFICATE
    # =====================================================
    @staticmethod
    def verify_certificate(certificate: dict) -> dict:
        required_signatures = {"rsa_signature", "dilithium_signature", "cert_hash"}
        if not required_signatures.issubset(set(certificate.keys())):
            raise Exception("Certificate missing mandatory security fields")

        expected_allowed_actions = ",".join(
            sorted(RoleService.ROLE_PERMISSIONS.get(certificate.get("role", ""), []))
        )

        unsigned_data = certificate.copy()
        rsa_signature_b64 = unsigned_data.pop("rsa_signature")
        dilithium_signature_b64 = unsigned_data.pop("dilithium_signature")

        provided_hash = unsigned_data.get("cert_hash")
        recomputed_hash = CertificateService.compute_cert_hash(
            {k: v for k, v in unsigned_data.items() if k != "cert_hash"}
        )
        if provided_hash != recomputed_hash:
            raise Exception("Certificate hash mismatch detected")

        if unsigned_data.get("hash_alg") != CertificateService.HASH_ALGO:
            raise Exception("Unsupported hash algorithm")

        if (
            unsigned_data.get("device_binding_alg")
            != CertificateService.DEVICE_BINDING_ALG
        ):
            raise Exception("Unsupported device binding algorithm")

        if unsigned_data.get("challenge_alg") != CertificateService.CHALLENGE_ALG:
            raise Exception("Unsupported challenge algorithm")

        if unsigned_data.get("defense_version") != CertificateService.DEFENSE_VERSION:
            raise Exception("Defense profile mismatch")

        if unsigned_data.get("purpose_scope") != CertificateService.PURPOSE_SCOPE:
            raise Exception("Certificate purpose mismatch")

        if (
            unsigned_data.get("security_layers")
            != CertificateService._security_layers_label()
        ):
            raise Exception("Security layer enumeration mismatch")

        if unsigned_data.get("allowed_actions", "") != expected_allowed_actions:
            raise Exception("Role permissions mismatch")

        signable_bytes = CertificateService._canonical_json(unsigned_data).encode(
            "utf-8"
        )

        ca_public_bytes = CertificateService._load_bytes(
            CertificateService.CA_PUBLIC_KEY
        )
        ca_public = serialization.load_pem_public_key(ca_public_bytes)
        try:
            ca_public.verify(
                base64.b64decode(rsa_signature_b64),
                signable_bytes,
                padding.PKCS1v15(),
                hashes.SHA3_256(),
            )
        except InvalidSignature as exc:
            raise Exception("Invalid CA signature") from exc

        pq_public = CertificateService._load_bytes(CertificateService.PQ_CA_PUBLIC_KEY)
        if not PQCryptoService.verify(
            signable_bytes, base64.b64decode(dilithium_signature_b64), pq_public
        ):
            raise Exception("Invalid Dilithium signature")

        valid_from = datetime.fromisoformat(
            unsigned_data["valid_from"].replace("Z", "")
        )
        valid_to = datetime.fromisoformat(unsigned_data["valid_to"].replace("Z", ""))
        now = datetime.utcnow()
        if now < valid_from or now > valid_to:
            raise Exception("Certificate expired or not yet valid")

        if CertificateService.is_revoked(unsigned_data["certificate_id"]):
            raise Exception("Certificate revoked")

        unsigned_data["allowed_actions"] = (
            expected_allowed_actions.split(",") if expected_allowed_actions else []
        )
        return unsigned_data

    # =====================================================
    # CLIENT SIGNATURE HELPERS
    # =====================================================
    @staticmethod
    def build_client_challenge_message(nonce: bytes, device_id: str) -> bytes:
        if not isinstance(nonce, bytes):
            raise TypeError("Challenge nonce must be bytes")
        if not device_id:
            raise ValueError("Device identifier is required")
        return nonce + device_id.encode("utf-8")

    @staticmethod
    def verify_client_rsa_signature(
        certificate: dict, message: bytes, signature_b64: str
    ) -> None:
        if not signature_b64:
            raise Exception("RSA signature missing")

        public_key_b64 = certificate.get("rsa_public_key")
        if not public_key_b64:
            raise Exception("Certificate missing RSA public key")

        public_key_bytes = base64.b64decode(public_key_b64)
        try:
            rsa_public = serialization.load_der_public_key(public_key_bytes)
        except ValueError:
            rsa_public = serialization.load_pem_public_key(public_key_bytes)

        try:
            rsa_public.verify(
                base64.b64decode(signature_b64),
                message,
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
        except InvalidSignature as exc:
            raise Exception("Invalid RSA login signature") from exc

    @staticmethod
    def verify_client_pq_signature(
        certificate: dict, message: bytes, signature_b64: Optional[str]
    ) -> None:
        pq_public_b64 = certificate.get("pq_public_key")
        if not pq_public_b64 or not signature_b64:
            # Legacy certificates (or clients without PQ support) skip this check
            return

        pq_public = base64.b64decode(pq_public_b64)
        pq_signature = base64.b64decode(signature_b64)

        if not PQCryptoService.verify(message, pq_signature, pq_public):
            raise Exception("Invalid PQ login signature")
