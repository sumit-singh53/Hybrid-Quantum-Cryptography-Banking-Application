import json
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class SecurityEventStore:
    """JSON-backed store for notable security anomalies (device mismatches, etc.)."""

    STORE_PATH = (
        Path(__file__).resolve().parents[2] / "instance" / "security_events.json"
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
                data = json.load(handle)
            if not isinstance(data, list):
                raise RuntimeError("Security event store corrupted")
            return data
        except (json.JSONDecodeError, RuntimeError) as e:
            # If JSON is corrupted, backup the bad file and start fresh
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Corrupted security event log detected: {e}. Creating backup and starting fresh.")
            
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

    @classmethod
    def record(
        cls,
        *,
        event_type: str,
        certificate_id: Optional[str] = None,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not event_type:
            raise ValueError("event_type is required")
        entry = {
            "event_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
            "event_type": event_type,
            "certificate_id": certificate_id,
            "user_id": user_id,
            "role": role,
            "metadata": metadata or {},
        }
        with cls._LOCK:
            data = cls._load()
            data.append(entry)
            cls._save(data)
        return entry

    @classmethod
    def query_events(
        cls, *, event_type: Optional[str] = None, limit: int = 100, offset: int = 0
    ) -> List[Dict[str, Any]]:
        data = cls._load()
        if event_type:
            data = [entry for entry in data if entry.get("event_type") == event_type]
        data.sort(key=lambda item: item.get("timestamp", ""), reverse=True)
        return data[offset:offset + max(limit, 0)]

    @classmethod
    def count_events(cls, event_type: Optional[str] = None) -> int:
        data = cls._load()
        if event_type:
            return sum(1 for entry in data if entry.get("event_type") == event_type)
        return len(data)

    @classmethod
    def query_all(cls) -> List[Dict[str, Any]]:
        """Query all security events."""
        return cls._load()
