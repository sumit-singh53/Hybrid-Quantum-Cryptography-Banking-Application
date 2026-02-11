#!/usr/bin/env python3
"""Wrapper to run bootstrap scripts with Flask app context."""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.main import create_app

app = create_app()

with app.app_context():
    if len(sys.argv) > 1 and sys.argv[1] == "admin":
        print("Bootstrapping System Admin...")
        from scripts.bootstrap_system_admin import main as admin_main
        sys.argv = sys.argv[:1] + sys.argv[2:]  # Remove 'admin' argument
        admin_main()
    elif len(sys.argv) > 1 and sys.argv[1] == "manager":
        print("Bootstrapping Manager...")
        from scripts.bootstrap_manager import main as manager_main
        sys.argv = sys.argv[:1] + sys.argv[2:]  # Remove 'manager' argument
        manager_main()
    elif len(sys.argv) > 1 and sys.argv[1] == "auditor":
        print("Bootstrapping Auditor Clerk...")
        from scripts.bootstrap_auditor_clerk import main as auditor_main
        sys.argv = sys.argv[:1] + sys.argv[2:]  # Remove 'auditor' argument
        auditor_main()
    else:
        print("Usage: python scripts/run_bootstrap.py [admin|manager|auditor] [options]")
        sys.exit(1)
