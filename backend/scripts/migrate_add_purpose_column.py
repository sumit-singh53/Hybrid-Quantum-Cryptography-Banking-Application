#!/usr/bin/env python3
"""One-off migration to add the NOT NULL `purpose` column to `transactions`.

This script is intentionally simple because the project does not yet ship with
Alembic. It inspects the active database, adds the new column when missing, and
backfills existing rows with a placeholder so the NOT NULL constraint is
satisfied.

Usage (from backend/ directory):
    python scripts/migrate_add_purpose_column.py

If you point `SQLALCHEMY_DATABASE_URI` at another datastore (e.g. MySQL), the
same script will reuse that connection string.
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.config.config import Config  # noqa: E402


MIGRATION_PLACEHOLDER = "Legacy transfer (auto-filled)"


def _ensure_base_schema() -> None:
    """Run create_all() so empty sqlite DBs have the latest schema."""
    from app.main import create_app  # noqa: WPS433 (runtime import by design)

    app = create_app()
    with app.app_context():
        pass  # create_app already calls db.create_all()


def add_purpose_column(engine) -> None:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if "transactions" not in tables:
        print("[!] transactions table missing. Bootstrapping base schema…")
        _ensure_base_schema()
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if "transactions" not in tables:
            raise RuntimeError("transactions table still missing after bootstrap")

    column_names = {col["name"] for col in inspector.get_columns("transactions")}
    if "purpose" in column_names:
        print("[ok] purpose column already exists. Nothing to do.")
        return

    ddl_sql = (
        "ALTER TABLE transactions "
        "ADD COLUMN purpose VARCHAR(256) NOT NULL "
        f"DEFAULT '{MIGRATION_PLACEHOLDER}'"
    )
    backfill = text(
        "UPDATE transactions SET purpose = :default WHERE purpose IS NULL OR TRIM(purpose) = ''"
    )

    with engine.begin() as conn:
        print("[+] Adding purpose column to transactions…")
        conn.execute(text(ddl_sql))
        print("[+] Backfilling existing rows…")
        conn.execute(backfill, {"default": MIGRATION_PLACEHOLDER})

    print("[✓] Migration completed. Future transfers must supply a purpose string.")


def main() -> None:
    uri = Config.SQLALCHEMY_DATABASE_URI
    print(f"Using database URI: {uri}")
    engine = create_engine(uri)
    try:
        add_purpose_column(engine)
    except SQLAlchemyError as exc:
        print(f"[error] Database operation failed: {exc}")
        raise


if __name__ == "__main__":
    main()
