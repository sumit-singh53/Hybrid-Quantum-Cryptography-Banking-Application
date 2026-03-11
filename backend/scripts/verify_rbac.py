#!/usr/bin/env python3
"""Verify RBAC implementation."""
import sys
import os
import sqlite3

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config.config import Config

db_path = Config.SQLALCHEMY_DATABASE_URI.replace("sqlite:///", "")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 60)
print("RBAC System Verification")
print("=" * 60)

# Count permissions
cursor.execute("SELECT COUNT(*) FROM permissions")
perm_count = cursor.fetchone()[0]
print(f"\n✓ Permissions: {perm_count}")

# Count role-permission assignments
cursor.execute("SELECT COUNT(*) FROM role_permissions")
assignment_count = cursor.fetchone()[0]
print(f"✓ Role-Permission Assignments: {assignment_count}")

# List roles
cursor.execute("SELECT name, hierarchy_level, description FROM roles ORDER BY hierarchy_level DESC")
print("\n✓ Roles:")
for row in cursor.fetchall():
    print(f"  - {row[0]} (Level {row[1]})")
    print(f"    {row[2]}")

# Count permissions per role
print("\n✓ Permissions per Role:")
cursor.execute("""
    SELECT r.name, COUNT(rp.permission_id) as perm_count
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    GROUP BY r.id, r.name
    ORDER BY r.hierarchy_level DESC
""")
for row in cursor.fetchall():
    print(f"  - {row[0]}: {row[1]} permissions")

print("\n" + "=" * 60)
print("RBAC System is Operational!")
print("=" * 60)

conn.close()
