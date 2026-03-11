import secrets
import time
from typing import Dict, Optional


class ChallengeManager:
    """Transient store for certificate login challenges."""

    _challenges: Dict[str, dict] = {}

    @classmethod
    def create_challenge(
        cls,
        certificate: dict,
        legacy_device_secret: Optional[str] = None,
        *,
        ttl_seconds: int = 180,
        purpose: str = "login",
        metadata: Optional[dict] = None,
        binding_context: Optional[dict] = None,
        nonce: Optional[bytes] = None,
    ) -> dict:
        cls._cleanup()
        token = secrets.token_urlsafe(32)
        challenge_nonce = nonce or secrets.token_bytes(32)
        binding_payload = dict(binding_context or {})
        if legacy_device_secret and "legacy_secret" not in binding_payload:
            binding_payload.setdefault("mode", "legacy")
            binding_payload.setdefault("legacy_secret", legacy_device_secret)
        cls._challenges[token] = {
            "nonce": challenge_nonce,
            "certificate": certificate,
            "expires_at": time.time() + ttl_seconds,
            "purpose": purpose,
            "metadata": metadata or {},
            "binding": binding_payload,
        }
        return {"token": token, "nonce": challenge_nonce}

    @classmethod
    def consume(cls, token: str) -> Optional[dict]:
        cls._cleanup()
        entry = cls._challenges.pop(token, None)
        if not entry:
            return None
        if entry["expires_at"] < time.time():
            return None
        return entry

    @classmethod
    def _cleanup(cls) -> None:
        now = time.time()
        expired = [t for t, info in cls._challenges.items() if info["expires_at"] < now]
        for token in expired:
            cls._challenges.pop(token, None)
