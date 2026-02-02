import json
import threading
import uuid
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class TransferAuditStore:
    """Append-only, hash-chained log for money transfer attempts."""

    STORE_PATH = (
        Path(__file__).resolve().parents[2] / "instance" / "transfer_audit_log.json"
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
        with cls.STORE_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, list):
            raise RuntimeError("Transfer audit log store corrupted")
        return data

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
    def record_transfer(
        cls,
        *,
        transaction_id: str,
        customer_id: str,
        cert_hash: Optional[str],
        device_id: Optional[str],
        action: str,
        amount: Optional[Any],
        status: Optional[str],
    ) -> Dict[str, Any]:
        """Persist an immutable record for a transfer-related action."""

        timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        body = {
            "event_id": str(uuid.uuid4()),
            "timestamp": timestamp,
            "transaction_id": transaction_id,
            "customer_id": customer_id,
            "cert_hash": cert_hash,
            "device_id": device_id,
            "action": action,
            "status": status,
            "amount": str(amount) if amount is not None else None,
        }

        with cls._LOCK:
            data = cls._load()
            prev_hash = data[-1]["entry_hash"] if data else cls._GENESIS
            entry_hash = cls._compute_hash(body, prev_hash)
            entry = {
                **body,
                "prev_hash": prev_hash,
                "entry_hash": entry_hash,
            }
            data.append(entry)
            cls._save(data)
        return entry

    @classmethod
    def query_all(cls) -> List[Dict[str, Any]]:
        return cls._load()
