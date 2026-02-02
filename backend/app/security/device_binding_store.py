import json
import threading
from pathlib import Path
from typing import Optional


class DeviceBindingStore:
    """Simple JSON-backed persistence for device secrets."""

    STORE_PATH = (
        Path(__file__).resolve().parents[2] / "instance" / "device_bindings.json"
    )
    _LOCK = threading.Lock()

    @classmethod
    def _ensure_store(cls) -> None:
        cls.STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not cls.STORE_PATH.exists():
            cls.STORE_PATH.write_text("{}", encoding="utf-8")

    @classmethod
    def _load(cls) -> dict:
        cls._ensure_store()
        with cls.STORE_PATH.open("r", encoding="utf-8") as handle:
            raw = handle.read()

        normalized = (raw or "").strip()
        if not normalized:
            cls._save({})
            return {}

        try:
            return json.loads(normalized)
        except json.JSONDecodeError:
            # Reset the store if it becomes unreadable to avoid blocking enrollment
            cls._save({})
            return {}

    @classmethod
    def _save(cls, data: dict) -> None:
        with cls.STORE_PATH.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)

    @classmethod
    def store_binding(
        cls,
        user_id: str,
        *,
        device_secret: Optional[str] = None,
    ) -> None:
        if not user_id:
            raise ValueError("user_id is required")
        if not device_secret:
            raise ValueError("device_secret is required")

        with cls._LOCK:
            data = cls._load()
            entry = data.setdefault(user_id, {})
            entry["device_secret"] = device_secret
            data[user_id] = entry
            cls._save(data)

    @classmethod
    def store_secret(cls, user_id: str, device_secret: str) -> None:
        cls.store_binding(user_id, device_secret=device_secret)

    @classmethod
    def get_binding(cls, user_id: str) -> Optional[dict]:
        if not user_id:
            return None
        data = cls._load()
        return data.get(user_id)

    @classmethod
    def get_legacy_secret(cls, user_id: str) -> Optional[str]:
        entry = cls.get_binding(user_id)
        if not entry:
            return None
        return entry.get("device_secret")

    @classmethod
    def get_secret(cls, user_id: str) -> Optional[str]:
        return cls.get_legacy_secret(user_id)

    @classmethod
    def delete_secret(cls, user_id: str) -> None:
        if not user_id:
            return
        with cls._LOCK:
            data = cls._load()
            if user_id in data:
                data.pop(user_id)
                cls._save(data)
