import json
import threading
import uuid
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class RequestAuditStore:
    """Append-only, hash-chained request audit log for traceability."""

    STORE_PATH = (
        Path(__file__).resolve().parents[2] / "instance" / "request_audit_log.json"
    )
    _LOCK = threading.Lock()
    _GENESIS = "GENESIS"

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
                raise RuntimeError("Request audit log store corrupted")
            return data
        except (json.JSONDecodeError, RuntimeError) as e:
            # If JSON is corrupted, backup the bad file and start fresh
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Corrupted audit log detected: {e}. Creating backup and starting fresh.")
            
            # Backup corrupted file
            backup_path = cls.STORE_PATH.with_suffix('.json.corrupted')
            if cls.STORE_PATH.exists():
                cls.STORE_PATH.rename(backup_path)
            
            # Create fresh empty log
            cls.STORE_PATH.write_text("[]", encoding="utf-8")
            return []

    @classmethod
    def _save(cls, data: List[Dict[str, Any]]) -> None:
        with cls.STORE_PATH.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)

    @staticmethod
    def _canonical(payload: Dict[str, Any]) -> str:
        return json.dumps(payload, sort_keys=True, separators=(",", ":"))

    @classmethod
    def _compute_hash(cls, payload: Dict[str, Any], prev_hash: Optional[str]) -> str:
        digest = hashlib.sha3_256()
        digest.update((prev_hash or cls._GENESIS).encode("utf-8"))
        digest.update(cls._canonical(payload).encode("utf-8"))
        return digest.hexdigest()

    @classmethod
    def record_request(
        cls,
        *,
        certificate: Dict[str, Any],
        device_id: Optional[str],
        action_name: str,
        method: str,
        path: str,
    ) -> Dict[str, Any]:
        timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        entry_body = {
            "event_id": str(uuid.uuid4()),
            "timestamp": timestamp,
            "action_name": action_name,
            "method": method,
            "path": path,
            "certificate_id": certificate.get("certificate_id"),
            "lineage_id": certificate.get("lineage_id"),
            "cert_hash": certificate.get("cert_hash"),
            "user_id": certificate.get("user_id"),
            "role": certificate.get("role"),
            "device_id": device_id,
        }

        with cls._LOCK:
            data = cls._load()
            prev_hash = data[-1]["entry_hash"] if data else cls._GENESIS
            entry_hash = cls._compute_hash(entry_body, prev_hash)
            entry = {
                **entry_body,
                "prev_hash": prev_hash,
                "entry_hash": entry_hash,
            }
            data.append(entry)
            cls._save(data)
        return entry

    @classmethod
    def query_by_lineage(cls, lineage_id: Optional[str]) -> List[Dict[str, Any]]:
        if not lineage_id:
            return []
        data = cls._load()
        return [entry for entry in data if entry.get("lineage_id") == lineage_id]

    @classmethod
    def query_by_certificate(
        cls, certificate_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        if not certificate_id:
            return []
        data = cls._load()
        return [
            entry for entry in data if entry.get("certificate_id") == certificate_id
        ]

    @classmethod
    def query_all(cls) -> List[Dict[str, Any]]:
        return cls._load()
