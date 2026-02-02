import csv
import hashlib
import io
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.models.audit_log_model import AuditLog
from app.models.transaction_model import Transaction, TransactionStatus
from app.security.accountability_store import AccountabilityStore
from app.security.certificate_vault import CertificateVault
from app.security.request_audit_store import RequestAuditStore
from app.services.certificate_service import CertificateService


class AuditorClerkService:
    """Read-only insights for auditor clerks."""

    SUMMARY_WINDOW_DAYS = 7
    HIGH_VALUE_THRESHOLD = 100_000
    STALE_PENDING_HOURS = 24
    AUDIT_TRAIL_LIMIT = 250

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def daily_transaction_summary(cls) -> List[Dict[str, object]]:
        cutoff = cls._now() - timedelta(days=cls.SUMMARY_WINDOW_DAYS - 1)
        summary: Dict[str, Dict[str, object]] = {}
        txs = Transaction.query.filter(Transaction.created_at >= cutoff).all()
        for tx in txs:
            tx_time = tx.created_at.replace(tzinfo=timezone.utc)
            date_key = tx_time.date().isoformat()
            bucket = summary.setdefault(
                date_key,
                {
                    "date": date_key,
                    "total_amount": 0.0,
                    "count": 0,
                    "approved": 0,
                    "pending": 0,
                    "rejected": 0,
                },
            )
            bucket["total_amount"] += float(tx.amount)
            bucket["count"] += 1
            status = tx.status.value if tx.status else ""
            if status == TransactionStatus.APPROVED.value:
                bucket["approved"] += 1
            elif status == TransactionStatus.PENDING.value:
                bucket["pending"] += 1
            else:
                bucket["rejected"] += 1
        ordered = sorted(summary.values(), key=lambda row: row["date"], reverse=True)
        return ordered

    @classmethod
    def flagged_transactions(cls, limit: int = 50) -> List[Dict[str, object]]:
        now = cls._now()
        flagged: List[Dict[str, object]] = []
        txs = (
            Transaction.query.order_by(Transaction.created_at.desc()).limit(limit).all()
        )
        for tx in txs:
            reasons = []
            if float(tx.amount) >= cls.HIGH_VALUE_THRESHOLD:
                reasons.append("Amount exceeds high-value threshold")
            age_hours = (
                now - tx.created_at.replace(tzinfo=timezone.utc)
            ).total_seconds() / 3600
            if (
                tx.status == TransactionStatus.PENDING
                and age_hours >= cls.STALE_PENDING_HOURS
            ):
                reasons.append("Pending for over 24 hours")
            if reasons:
                flagged.append(
                    {
                        "id": tx.id,
                        "amount": tx.amount,
                        "to_account": tx.to_account,
                        "status": tx.status.value if tx.status else None,
                        "created_at": tx.created_at.isoformat(),
                        "reasons": reasons,
                    }
                )
        return flagged

    @classmethod
    def _certificate_payload(cls, cert_file: Path) -> Optional[Dict[str, str]]:
        plaintext = CertificateVault.load_if_exists(cert_file)
        if not plaintext:
            return None
        return CertificateService._parse_certificate_text(plaintext)

    @classmethod
    def certificate_inventory(cls) -> List[Dict[str, object]]:
        entries: List[Dict[str, object]] = []
        base = CertificateService.CERT_BASE
        if not base.exists():
            return entries
        for role_dir in base.iterdir():
            if not role_dir.is_dir():
                continue
            for cert_file in role_dir.glob("*.pem"):
                payload = cls._certificate_payload(cert_file)
                if not payload:
                    continue
                certificate_id = payload.get("certificate_id")
                revoked = False
                try:
                    revoked = CertificateService.is_revoked(certificate_id)
                except Exception:  # pylint: disable=broad-except
                    revoked = False
                valid_to = payload.get("valid_to")
                entries.append(
                    {
                        "certificate_id": certificate_id,
                        "owner": payload.get("owner"),
                        "role": payload.get("role"),
                        "lineage_id": payload.get("lineage_id"),
                        "valid_to": valid_to,
                        "revoked": revoked,
                        "crl_url": payload.get("crl_url"),
                    }
                )
        return sorted(entries, key=lambda item: item.get("owner") or "")

    @classmethod
    def certificate_misuse_alerts(cls) -> List[Dict[str, object]]:
        entries = RequestAuditStore.query_all()
        grouped: Dict[str, List[Dict[str, object]]] = {}
        for entry in entries:
            cert_id = entry.get("certificate_id")
            if not cert_id:
                continue
            grouped.setdefault(cert_id, []).append(entry)
        alerts: List[Dict[str, object]] = []
        for cert_id, cert_entries in grouped.items():
            revoked = False
            try:
                revoked = CertificateService.is_revoked(cert_id)
            except Exception:  # pylint: disable=broad-except
                revoked = False
            if revoked:
                alerts.append(
                    {
                        "certificate_id": cert_id,
                        "reason": "Revoked certificate still issuing requests",
                        "last_seen": cert_entries[-1]["timestamp"],
                    }
                )
                continue
            device_ids = {
                entry.get("device_id")
                for entry in cert_entries
                if entry.get("device_id")
            }
            if len(device_ids) > 1:
                alerts.append(
                    {
                        "certificate_id": cert_id,
                        "reason": "Multiple device fingerprints observed",
                        "distinct_devices": sorted(device_ids),
                        "last_seen": cert_entries[-1]["timestamp"],
                    }
                )
        return alerts

    @classmethod
    def build_dashboard_snapshot(cls) -> Dict[str, object]:
        return {
            "daily_summary": cls.daily_transaction_summary(),
            "flagged_transactions": cls.flagged_transactions(),
            "certificate_alerts": cls.certificate_misuse_alerts(),
        }

    @staticmethod
    def latest_audit_trail(limit: int = AUDIT_TRAIL_LIMIT) -> List[Dict[str, object]]:
        entries = RequestAuditStore.query_all()
        entries.sort(key=lambda entry: entry.get("timestamp") or "")
        return entries[-limit:]

    @staticmethod
    def audit_logs(limit: int = 200) -> List[Dict[str, object]]:
        logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
        return [log.to_dict() for log in logs]

    @staticmethod
    def _transaction_fingerprint(tx: Transaction) -> str:
        payload = {
            "id": tx.id,
            "from_account": tx.from_account,
            "created_by": tx.created_by,
            "to_account": tx.to_account,
            "amount": float(tx.amount),
            "status": tx.status.value if tx.status else None,
            "created_at": tx.created_at.isoformat(),
            "approved_by": tx.approved_by,
        }
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha3_256(canonical.encode("utf-8")).hexdigest()
        return digest

    @classmethod
    def verify_transaction_integrity(cls, tx_id: str) -> Dict[str, object]:
        tx = Transaction.query.get(tx_id)
        if not tx:
            return {
                "transaction_id": tx_id,
                "verified": False,
                "reason": "Transaction not found",
            }
        digest = cls._transaction_fingerprint(tx)
        related_logs = (
            AuditLog.query.filter_by(transaction_id=tx_id)
            .order_by(AuditLog.timestamp.desc())
            .all()
        )
        return {
            "transaction_id": tx_id,
            "verified": True,
            "integrity_hash": digest,
            "transaction": tx.to_dict(),
            "audit_chain": [log.to_dict() for log in related_logs],
        }

    @staticmethod
    def audit_report_rows() -> List[Dict[str, object]]:
        return RequestAuditStore.query_all()

    @classmethod
    def export_report(cls, export_format: str) -> Tuple[bytes, str, str]:
        rows = cls.audit_report_rows()
        if export_format == "csv":
            return cls._export_csv(rows)
        if export_format == "pdf":
            return cls._export_pdf(rows)
        payload = json.dumps({"events": rows}).encode("utf-8")
        return payload, "application/json", "audit-report.json"

    @staticmethod
    def _export_csv(rows: List[Dict[str, object]]) -> Tuple[bytes, str, str]:
        output = io.StringIO()
        fieldnames = [
            "timestamp",
            "certificate_id",
            "user_id",
            "role",
            "action_name",
            "path",
            "device_id",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})
        return output.getvalue().encode("utf-8"), "text/csv", "audit-report.csv"

    @staticmethod
    def _escape_pdf_text(value: str) -> str:
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    @classmethod
    def _export_pdf(cls, rows: List[Dict[str, object]]) -> Tuple[bytes, str, str]:
        lines = [
            "Hybrid PQ Banking — Audit Report",
            "Generated at: " + datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "",
        ]
        for entry in rows[:100]:
            summary = f"{entry.get('timestamp')} — {entry.get('action_name')} ({entry.get('path')})"
            lines.append(summary)
        if len(rows) > 100:
            lines.append(f"... truncated {len(rows) - 100} additional events ...")
        text_commands = ["BT", "/F1 11 Tf", "50 760 Td", "14 TL"]
        for line in lines:
            text_commands.append(f"({cls._escape_pdf_text(line)}) Tj")
            text_commands.append("T*")
        text_commands.append("ET")
        stream = "\n".join(text_commands).encode("utf-8")
        objects = []
        offsets = []

        def add_object(content: bytes) -> None:
            offsets.append(sum(len(obj) for obj in objects) + len(b"%PDF-1.4\n"))
            objects.append(content)

        add_object(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
        add_object(b"2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n")
        add_object(
            b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
            b"/Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        )
        add_object(
            b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        )
        content = (
            f"4 0 obj << /Length {len(stream)} >> stream\n".encode("utf-8")
            + stream
            + b"\nendstream endobj\n"
        )
        add_object(content)
        pdf_body = b"%PDF-1.4\n" + b"".join(objects)
        xref_start = len(pdf_body)
        xref_entries = [b"0000000000 65535 f \n"]
        for offset in offsets:
            xref_entries.append(f"{offset:010d} 00000 n \n".encode("ascii"))
        xref = b"xref\n0 6\n" + b"".join(xref_entries)
        trailer = (
            b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n"
            + str(xref_start).encode("ascii")
            + b"\n%%EOF"
        )
        pdf_bytes = pdf_body + xref + b"\n" + trailer
        return pdf_bytes, "application/pdf", "audit-report.pdf"

    @classmethod
    def profile_payload(
        cls, user: Dict[str, object], certificate: Dict[str, object]
    ) -> Dict[str, object]:
        last_login_events = AccountabilityStore.query_events(user_id=user.get("id"))
        last_login_events.sort(key=lambda event: event.get("timestamp", ""))
        last_session = last_login_events[-1] if last_login_events else None
        return {
            "user": user,
            "certificate": {
                "certificate_id": certificate.get("certificate_id"),
                "lineage_id": certificate.get("lineage_id"),
                "allowed_actions": certificate.get("allowed_actions"),
                "valid_to": certificate.get("valid_to"),
            },
            "last_login": last_session,
            "audit_capabilities": ["View", "Verify"],
        }
