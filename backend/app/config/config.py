import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_INSTANCE_DIR = BASE_DIR / "instance"

INSTANCE_DIR = Path(os.getenv("INSTANCE_DIR", str(DEFAULT_INSTANCE_DIR))).resolve()
INSTANCE_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DB_PATH = INSTANCE_DIR / "pq_banking.db"


def _normalize_sqlite_url(db_url: str) -> str:
    prefix = "sqlite:///"
    if not db_url.startswith(prefix):
        return db_url

    path_part = db_url[len(prefix) :]
    path_obj = Path(path_part)

    if not path_obj.is_absolute():
        path_obj = (BASE_DIR / path_obj).resolve()

    path_obj.parent.mkdir(parents=True, exist_ok=True)
    return f"{prefix}{path_obj.as_posix()}"


def _build_database_uri() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return _normalize_sqlite_url(env_url)

    return f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"


class Config:
    # =========================
    # BASIC APP CONFIG
    # =========================
    SECRET_KEY = os.getenv("SECRET_KEY", "pq_banking_super_secret_key")
    DEBUG = True

    # =========================
    # DATABASE CONFIG (SQLite)
    # =========================
    SQLALCHEMY_DATABASE_URI = _build_database_uri()

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # =========================
    # JWT CONFIG
    # =========================
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "pq_jwt_secret_key")
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60
    # =========================
    # CERTIFICATE SETTINGS
    # =========================
    CERT_UPLOAD_FOLDER = os.getenv("CERT_UPLOAD_FOLDER", "certificates/users")
    ALLOWED_CERT_EXTENSIONS = {"pem", "crt"}

    # =========================
    # SECURITY
    # =========================
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024

    # =========================
    # ADMIN / CA SETTINGS
    # =========================
    ADMIN_ISSUER_SECRET = os.getenv("ADMIN_ISSUER_SECRET", "pq_ca_master_key")
