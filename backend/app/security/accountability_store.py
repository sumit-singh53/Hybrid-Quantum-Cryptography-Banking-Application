import json
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import hashlib


class AccountabilityStore:
    """Persists signed intent events for cryptographic accountability."""

    STORE_PATH = (
        Path(__file__).resolve().parents[2] / "instance" / "accountability_log.json"
    )
    _LOCK = threading.Lock()

    @classmethod
    def _ensure_store(cls) -> None:
        cls.STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not cls.STORE_PATH.exists():
            cls.STORE_PATH.write_text("[]", encoding="utf-8")

    @classmethod
    def _load(cls) -> List[Dict[str, Any]]:
        cls._ensure_store()
        try:
            with cls.STORE_PATH.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except (json.JSONDecodeError, RuntimeError) as e:
            # If JSON is corrupted, backup the bad file and start fresh
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Corrupted accountability log detected: {e}. Creating backup and starting fresh.")
            
            # Backup corrupted file with timestamp to avoid conflicts
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_path = cls.STORE_PATH.with_suffix(f'.json.corrupted.{timestamp}')
            
            if cls.STORE_PATH.exists():
                try:
                    cls.STORE_PATH.rename(backup_path)
                except (FileExistsError, OSError) as rename_err:
                    logger.warning(f"Could not rename corrupted file: {rename_err}. Deleting instead.")
                    cls.STORE_PATH.unlink(missing_ok=True)
            
            # Create fresh empty log
            cls.STORE_PATH.write_text("[]", encoding="utf-8")
            return []

    @classmethod
    def _save(cls, data: List[Dict[str, Any]]) -> None:
        with cls.STORE_PATH.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)

    @staticmethod
    def _sign_intent(cert_hash: Optional[str], intent: str, timestamp: str) -> str:
        digest = hashlib.sha3_256()
        if cert_hash:
            digest.update(cert_hash.encode("utf-8"))
        digest.update(intent.encode("utf-8"))
        digest.update(timestamp.encode("utf-8"))
        return digest.hexdigest()

    @classmethod
    def record_event(
        cls,
        *,
        certificate: Dict[str, Any],
        intent: str,
        authority: str,
        origin: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Append a signed intent entry tied to a certificate."""

        timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        signed_intent = cls._sign_intent(
            certificate.get("cert_hash"), intent, timestamp
        )

        event = {
            "event_id": str(uuid.uuid4()),
            "certificate_id": certificate.get("certificate_id"),
            "user_id": certificate.get("user_id"),
            "authority": authority,
            "intent": intent,
            "timestamp": timestamp,
            "lineage_id": certificate.get("lineage_id"),
            "defense_version": certificate.get("defense_version"),
            "security_layers": certificate.get("security_layers"),
            "signed_intent": signed_intent,
            "location": origin or {},
            "metadata": metadata or {},
        }

        with cls._LOCK:
            data = cls._load()
            data.append(event)
            cls._save(data)

        return event

    @classmethod
    def query_events(
        cls,
        *,
        certificate_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        events = cls._load()
        if certificate_id:
            events = [e for e in events if e.get("certificate_id") == certificate_id]
        if user_id:
            events = [e for e in events if e.get("user_id") == user_id]
        return events

    @classmethod
    def query_all(cls) -> List[Dict[str, Any]]:
        """Query all accountability events."""
        return cls._load()
