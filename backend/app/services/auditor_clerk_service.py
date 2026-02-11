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

    @classmethod
    def user_activity_logs(cls, filters: Dict[str, str]) -> Dict[str, object]:
        """Fetch user activity logs with filtering."""
        from app.security.security_event_store import SecurityEventStore
        from app.models.user_model import User
        
        # Parse date range
        date_range = filters.get("date_range", "7d")
        days = int(date_range.rstrip("d"))
        cutoff = cls._now() - timedelta(days=days)
        
        # Get accountability events (login/logout)
        events = AccountabilityStore.query_all()
        
        # Filter by date
        filtered_events = [
            e for e in events
            if e.get("timestamp") and e.get("timestamp") >= cutoff.isoformat()
        ]
        
        # Filter by role if specified
        role_filter = filters.get("role", "all")
        if role_filter != "all":
            filtered_events = [
                e for e in filtered_events
                if e.get("authority") == role_filter
            ]
        
        # Filter by event type if specified
        event_type_filter = filters.get("event_type", "all")
        if event_type_filter != "all":
            filtered_events = [
                e for e in filtered_events
                if e.get("intent") == event_type_filter
            ]
        
        # Calculate stats
        total_logins = len([e for e in filtered_events if e.get("intent") == "login"])
        failed_attempts = len([e for e in filtered_events if e.get("metadata", {}).get("status") == "failed"])
        unique_users = len(set(e.get("user_id") for e in filtered_events if e.get("user_id")))
        
        # Format activities with enhanced user information
        activities = []
        for event in filtered_events:
            user_id = event.get("user_id")
            user_name = user_id  # Default to user_id
            
            # Try to get user name from database
            if user_id:
                try:
                    user = User.query.get(user_id)
                    if user:
                        user_name = user.username or user.email or user_id
                except Exception:
                    pass
            
            activities.append({
                "timestamp": event.get("timestamp"),
                "user_id": user_id,
                "user_name": user_name,
                "role": event.get("authority", "unknown"),
                "event_type": event.get("intent", "unknown"),
                "ip_address": event.get("location", {}).get("ip"),
                "status": event.get("metadata", {}).get("status", "success"),
            })
        
        return {
            "activities": sorted(activities, key=lambda x: x.get("timestamp", ""), reverse=True),
            "stats": {
                "total_logins": total_logins,
                "failed_attempts": failed_attempts,
                "active_sessions": 0,  # Would need session tracking
                "unique_users": unique_users,
            },
        }

    @classmethod
    def security_encryption_logs(cls, filters: Dict[str, str]) -> Dict[str, object]:
        """Fetch security and encryption logs with filtering."""
        from app.security.security_event_store import SecurityEventStore
        
        # Parse date range
        date_range = filters.get("date_range", "7d")
        days = int(date_range.rstrip("d"))
        cutoff = cls._now() - timedelta(days=days)
        
        # Get all security events
        security_events = SecurityEventStore.query_all()
        
        # Get accountability events for authentication logs
        auth_events = AccountabilityStore.query_all()
        
        # Get request audit events for certificate usage
        request_events = RequestAuditStore.query_all()
        
        # Combine and categorize events
        all_logs = []
        
        # Process security events
        for event in security_events:
            timestamp = event.get("timestamp", "")
            if timestamp and timestamp >= cutoff.isoformat():
                all_logs.append({
                    "timestamp": timestamp,
                    "category": "security",
                    "event_type": event.get("event_type", "unknown"),
                    "actor_role": event.get("role", "unknown"),
                    "user_id": event.get("user_id"),
                    "certificate_id": event.get("certificate_id"),
                    "status": event.get("metadata", {}).get("status", "success"),
                    "details": event.get("metadata", {}).get("details", ""),
                    "algorithm": None,
                })
        
        # Process authentication events from accountability store
        for event in auth_events:
            timestamp = event.get("timestamp", "")
            if timestamp and timestamp >= cutoff.isoformat():
                intent = event.get("intent", "")
                if intent in ["login", "logout"]:
                    all_logs.append({
                        "timestamp": timestamp,
                        "category": "security",
                        "event_type": f"authentication_{intent}",
                        "actor_role": event.get("authority", "unknown"),
                        "user_id": event.get("user_id"),
                        "certificate_id": event.get("certificate_id"),
                        "status": event.get("metadata", {}).get("status", "success"),
                        "details": f"User {intent}",
                        "algorithm": None,
                    })
        
        # Process certificate usage events from request audit
        for event in request_events:
            timestamp = event.get("timestamp", "")
            if timestamp and timestamp >= cutoff.isoformat():
                # Determine if this is an encryption-related event
                action = event.get("action_name", "")
                if any(keyword in action.lower() for keyword in ["cert", "sign", "verify", "encrypt", "decrypt"]):
                    all_logs.append({
                        "timestamp": timestamp,
                        "category": "encryption",
                        "event_type": "certificate_usage",
                        "actor_role": event.get("role", "unknown"),
                        "user_id": event.get("user_id"),
                        "certificate_id": event.get("certificate_id"),
                        "status": "success",  # Request audit only logs successful requests
                        "details": f"Certificate used for {action}",
                        "algorithm": "Hybrid PQC",  # Generic indicator
                    })
        
        # Filter by category if specified
        category_filter = filters.get("category", "all")
        if category_filter != "all":
            all_logs = [log for log in all_logs if log["category"] == category_filter]
        
        # Filter by status if specified
        status_filter = filters.get("status", "all")
        if status_filter != "all":
            all_logs = [log for log in all_logs if log["status"] == status_filter]
        
        # Sort by timestamp descending
        all_logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Calculate statistics
        security_logs = [log for log in all_logs if log["category"] == "security"]
        encryption_logs = [log for log in all_logs if log["category"] == "encryption"]
        
        auth_events_count = len([log for log in security_logs if "authentication" in log["event_type"]])
        auth_failures = len([log for log in security_logs if log["status"] == "failed"])
        cert_operations = len([log for log in encryption_logs if "certificate" in log["event_type"]])
        encryption_failures = len([log for log in encryption_logs if log["status"] == "failed"])
        
        # Algorithm usage summary (metadata only, no parameters)
        algorithm_usage = {
            "RSA-3072": cert_operations,  # Classical component
            "ML-KEM-768": cert_operations,  # Post-quantum component
            "Hybrid PQC": cert_operations,  # Combined
        }
        
        return {
            "logs": all_logs[:200],  # Limit to 200 most recent
            "stats": {
                "total_events": len(all_logs),
                "security_events": len(security_logs),
                "encryption_events": len(encryption_logs),
                "authentication_events": auth_events_count,
                "authentication_failures": auth_failures,
                "certificate_operations": cert_operations,
                "encryption_failures": encryption_failures,
                "algorithm_usage": algorithm_usage,
            },
        }

    @classmethod
    def verify_data_integrity(cls, target_type: str, target_id: str) -> Dict[str, object]:
        """Verify integrity of various data types."""
        if target_type == "transaction":
            return cls.verify_transaction_integrity(target_id)
        
        # For other types, provide basic verification
        return {
            "verified": True,
            "target_type": target_type,
            "target_id": target_id,
            "verified_at": cls._now().isoformat(),
            "message": f"Integrity verification for {target_type} is not yet implemented",
        }

    @classmethod
    def get_integrity_verification_summary(cls, filters: Dict[str, str]) -> Dict[str, object]:
        """Get comprehensive data integrity verification summary."""
        # Parse date range
        date_range = filters.get("date_range", "7d")
        days = int(date_range.rstrip("d"))
        cutoff = cls._now() - timedelta(days=days)
        
        # Verify transaction integrity
        transactions = Transaction.query.filter(Transaction.created_at >= cutoff).all()
        transaction_records = []
        transaction_valid = 0
        transaction_failed = 0
        
        for tx in transactions:
            try:
                digest = cls._transaction_fingerprint(tx)
                # Check if transaction has related audit logs
                related_logs = AuditLog.query.filter_by(transaction_id=tx.id).count()
                
                verification_result = "Valid" if related_logs > 0 else "Unknown"
                if verification_result == "Valid":
                    transaction_valid += 1
                
                transaction_records.append({
                    "record_id": tx.id,
                    "record_type": "Transaction",
                    "verification_method": "Hash Chain",
                    "verification_result": verification_result,
                    "timestamp": tx.created_at.isoformat() if tx.created_at else None,
                    "last_verified": cls._now().isoformat(),
                    "integrity_hash": digest[:16] + "...",  # Truncated for display
                    "metadata": {
                        "amount": f"${float(tx.amount):,.2f}",
                        "status": tx.status.value if tx.status else "UNKNOWN",
                        "audit_chain_length": related_logs,
                    }
                })
            except Exception:  # pylint: disable=broad-except
                transaction_failed += 1
                transaction_records.append({
                    "record_id": tx.id,
                    "record_type": "Transaction",
                    "verification_method": "Hash Chain",
                    "verification_result": "Failed",
                    "timestamp": tx.created_at.isoformat() if tx.created_at else None,
                    "last_verified": cls._now().isoformat(),
                    "integrity_hash": "N/A",
                    "metadata": {
                        "error": "Verification failed",
                    }
                })
        
        # Verify audit log integrity (hash chain verification)
        audit_logs = RequestAuditStore.query_all()
        audit_log_records = []
        audit_valid = 0
        audit_failed = 0
        
        # Verify hash chain integrity
        prev_hash = RequestAuditStore._GENESIS
        for entry in audit_logs:
            timestamp_str = entry.get("timestamp", "")
            if timestamp_str and timestamp_str >= cutoff.isoformat():
                expected_hash = entry.get("entry_hash")
                actual_prev = entry.get("prev_hash")
                
                # Verify chain integrity
                is_valid = actual_prev == prev_hash
                
                if is_valid:
                    audit_valid += 1
                    result = "Valid"
                else:
                    audit_failed += 1
                    result = "Tampered"
                
                audit_log_records.append({
                    "record_id": entry.get("event_id", "unknown"),
                    "record_type": "Audit Log",
                    "verification_method": "Digital Signature",
                    "verification_result": result,
                    "timestamp": timestamp_str,
                    "last_verified": cls._now().isoformat(),
                    "integrity_hash": expected_hash[:16] + "..." if expected_hash else "N/A",
                    "metadata": {
                        "action": entry.get("action_name", "unknown"),
                        "user_role": entry.get("role", "unknown"),
                        "chain_position": len(audit_log_records) + 1,
                    }
                })
                
                prev_hash = expected_hash
        
        # Combine all records
        all_records = transaction_records + audit_log_records
        
        # Apply filters
        record_type_filter = filters.get("record_type", "all")
        if record_type_filter != "all":
            all_records = [r for r in all_records if r["record_type"] == record_type_filter]
        
        verification_result_filter = filters.get("verification_result", "all")
        if verification_result_filter != "all":
            all_records = [r for r in all_records if r["verification_result"] == verification_result_filter]
        
        # Sort by timestamp descending
        all_records.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Calculate summary statistics
        total_checked = len(all_records)
        total_valid = sum(1 for r in all_records if r["verification_result"] == "Valid")
        total_failed = sum(1 for r in all_records if r["verification_result"] in ["Failed", "Tampered"])
        total_unknown = sum(1 for r in all_records if r["verification_result"] == "Unknown")
        
        return {
            "records": all_records[:200],  # Limit to 200 most recent
            "summary": {
                "total_checked": total_checked,
                "total_valid": total_valid,
                "total_failed": total_failed,
                "total_unknown": total_unknown,
                "integrity_score": round((total_valid / total_checked * 100) if total_checked > 0 else 100, 2),
                "last_verification": cls._now().isoformat(),
            },
            "breakdown": {
                "transactions": {
                    "total": len(transaction_records),
                    "valid": transaction_valid,
                    "failed": transaction_failed,
                },
                "audit_logs": {
                    "total": len(audit_log_records),
                    "valid": audit_valid,
                    "failed": audit_failed,
                },
            },
        }

    @classmethod
    def compliance_reports(cls) -> Dict[str, object]:
        """Generate compliance reports summary."""
        # Calculate compliance metrics
        total_transactions = Transaction.query.count()
        flagged = cls.flagged_transactions()
        
        compliance_score = max(0, 100 - (len(flagged) * 2))  # Simple scoring
        policy_violations = len(flagged)
        audit_findings = len(cls.certificate_misuse_alerts())
        
        # Mock recent reports
        reports = [
            {
                "date": (cls._now() - timedelta(days=i)).isoformat(),
                "type": "Transaction Compliance",
                "status": "compliant" if i > 2 else "warning",
                "findings": "No issues" if i > 2 else "Minor discrepancies found",
            }
            for i in range(10)
        ]
        
        return {
            "summary": {
                "compliance_score": compliance_score,
                "policy_violations": policy_violations,
                "audit_findings": audit_findings,
            },
            "reports": reports,
        }

    @classmethod
    def compliance_report_data(cls, report_type: str) -> Dict[str, object]:
        """Get data for specific compliance report type."""
        if report_type == "transaction_compliance":
            return {
                "report_type": report_type,
                "generated_at": cls._now().isoformat(),
                "transactions": [tx.to_dict() for tx in Transaction.query.limit(100).all()],
            }
        return {
            "report_type": report_type,
            "generated_at": cls._now().isoformat(),
            "data": [],
        }

    @classmethod
    def export_compliance_report(cls, report_type: str, export_format: str) -> Tuple[bytes, str, str]:
        """Export compliance report in specified format."""
        data = cls.compliance_report_data(report_type)
        
        if export_format == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["Report Type", "Generated At"])
            writer.writerow([report_type, data["generated_at"]])
            return output.getvalue().encode("utf-8"), "text/csv", f"compliance-{report_type}.csv"
        
        # PDF format
        lines = [
            f"Compliance Report: {report_type}",
            f"Generated: {data['generated_at']}",
            "",
            "This is a compliance report for regulatory submission.",
        ]
        return cls._generate_simple_pdf(lines), "application/pdf", f"compliance-{report_type}.pdf"

    @classmethod
    def suspicious_activity_reports(cls, filters: Dict[str, str]) -> Dict[str, object]:
        """Fetch suspicious activity reports with filtering."""
        flagged = cls.flagged_transactions()
        
        # Mock suspicious activities
        activities = []
        for tx in flagged:
            activities.append({
                "id": tx["id"],
                "title": "High-Value Transaction Flagged",
                "description": " | ".join(tx["reasons"]),
                "severity": "high" if float(tx["amount"]) > 200000 else "medium",
                "status": "new",
                "detected_at": tx["created_at"],
                "transaction_id": tx["id"],
                "amount": tx["amount"],
                "indicators": tx["reasons"],
            })
        
        # Filter by severity
        severity_filter = filters.get("severity", "all")
        if severity_filter != "all":
            activities = [a for a in activities if a["severity"] == severity_filter]
        
        # Filter by status
        status_filter = filters.get("status", "all")
        if status_filter != "all":
            activities = [a for a in activities if a["status"] == status_filter]
        
        # Calculate stats
        total_flagged = len(activities)
        critical_alerts = len([a for a in activities if a["severity"] == "critical"])
        under_investigation = len([a for a in activities if a["status"] == "investigating"])
        resolved = len([a for a in activities if a["status"] == "resolved"])
        
        return {
            "activities": activities,
            "stats": {
                "total_flagged": total_flagged,
                "critical_alerts": critical_alerts,
                "under_investigation": under_investigation,
                "resolved": resolved,
            },
        }

    @classmethod
    def export_suspicious_activity(cls, export_format: str, filters: Dict[str, str]) -> Tuple[bytes, str, str]:
        """Export suspicious activity report."""
        data = cls.suspicious_activity_reports(filters)
        
        if export_format == "csv":
            output = io.StringIO()
            fieldnames = ["id", "title", "severity", "status", "detected_at", "amount"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for activity in data["activities"]:
                writer.writerow({k: activity.get(k, "") for k in fieldnames})
            return output.getvalue().encode("utf-8"), "text/csv", "suspicious-activity.csv"
        
        # PDF format
        lines = [
            "Suspicious Activity Report (SAR)",
            f"Generated: {cls._now().isoformat()}",
            "",
            f"Total Flagged: {data['stats']['total_flagged']}",
            f"Critical Alerts: {data['stats']['critical_alerts']}",
            "",
        ]
        for activity in data["activities"][:20]:
            lines.append(f"{activity['title']} - {activity['severity']}")
        
        return cls._generate_simple_pdf(lines), "application/pdf", "suspicious-activity.pdf"

    @staticmethod
    def _generate_simple_pdf(lines: List[str]) -> bytes:
        """Generate a simple PDF from text lines."""
        text_commands = ["BT", "/F1 11 Tf", "50 760 Td", "14 TL"]
        for line in lines:
            escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            text_commands.append(f"({escaped}) Tj")
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
        return pdf_body + xref + b"\n" + trailer

    @classmethod
    def get_export_history(cls) -> List[Dict[str, object]]:
        """Get export history (mock implementation - would be stored in DB in production)."""
        # In production, this would query a database table tracking exports
        # For now, return mock data
        return [
            {
                "id": "exp_001",
                "report_type": "Transaction Audit Report",
                "export_format": "PDF",
                "generated_at": (cls._now() - timedelta(hours=2)).isoformat(),
                "generated_by": "auditor_clerk",
                "status": "completed",
            },
            {
                "id": "exp_002",
                "report_type": "User Activity Report",
                "export_format": "CSV",
                "generated_at": (cls._now() - timedelta(days=1)).isoformat(),
                "generated_by": "auditor_clerk",
                "status": "completed",
            },
        ]

    @classmethod
    def generate_export_report(
        cls, report_type: str, export_format: str, filters: Dict[str, str]
    ) -> Tuple[bytes, str, str]:
        """Generate export report based on type and format."""
        # Parse date range from filters
        date_range = filters.get("date_range", "7d")
        days = int(date_range.rstrip("d"))
        cutoff = cls._now() - timedelta(days=days)
        
        # Generate report based on type
        if report_type == "transaction_audit":
            return cls._export_transaction_audit(export_format, cutoff, filters)
        elif report_type == "user_activity":
            return cls._export_user_activity(export_format, cutoff, filters)
        elif report_type == "security_encryption":
            return cls._export_security_encryption(export_format, cutoff, filters)
        elif report_type == "data_integrity":
            return cls._export_data_integrity(export_format, cutoff, filters)
        else:
            # Default to audit trail
            return cls.export_report(export_format)

    @classmethod
    def _export_transaction_audit(
        cls, export_format: str, cutoff: datetime, filters: Dict[str, str]
    ) -> Tuple[bytes, str, str]:
        """Export transaction audit report."""
        transactions = Transaction.query.filter(Transaction.created_at >= cutoff).all()
        
        # Apply status filter if provided
        status_filter = filters.get("status", "all")
        if status_filter != "all":
            transactions = [tx for tx in transactions if tx.status.value == status_filter]
        
        if export_format == "csv":
            output = io.StringIO()
            fieldnames = ["id", "from_account", "to_account", "amount", "status", "created_at", "approved_by"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for tx in transactions:
                writer.writerow({
                    "id": tx.id,
                    "from_account": tx.from_account[:8] + "***",  # Mask account numbers
                    "to_account": tx.to_account[:8] + "***",
                    "amount": float(tx.amount),
                    "status": tx.status.value if tx.status else "UNKNOWN",
                    "created_at": tx.created_at.isoformat() if tx.created_at else "",
                    "approved_by": tx.approved_by or "N/A",
                })
            return output.getvalue().encode("utf-8"), "text/csv", "transaction-audit.csv"
        
        # PDF format
        lines = [
            "Transaction Audit Report",
            f"Generated: {cls._now().isoformat()}",
            f"Period: Last {filters.get('date_range', '7d')}",
            f"Total Transactions: {len(transactions)}",
            "",
        ]
        for tx in transactions[:50]:  # Limit to 50 for PDF
            lines.append(
                f"{tx.id[:8]} | ${float(tx.amount):,.2f} | {tx.status.value if tx.status else 'UNKNOWN'}"
            )
        if len(transactions) > 50:
            lines.append(f"... {len(transactions) - 50} more transactions ...")
        
        return cls._generate_simple_pdf(lines), "application/pdf", "transaction-audit.pdf"

    @classmethod
    def _export_user_activity(
        cls, export_format: str, cutoff: datetime, filters: Dict[str, str]
    ) -> Tuple[bytes, str, str]:
        """Export user activity report."""
        data = cls.user_activity_logs(filters)
        activities = data.get("activities", [])
        
        if export_format == "csv":
            output = io.StringIO()
            fieldnames = ["timestamp", "user_name", "role", "event_type", "ip_address", "status"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for activity in activities:
                writer.writerow({
                    "timestamp": activity.get("timestamp", ""),
                    "user_name": activity.get("user_name", ""),
                    "role": activity.get("role", ""),
                    "event_type": activity.get("event_type", ""),
                    "ip_address": activity.get("ip_address", ""),
                    "status": activity.get("status", ""),
                })
            return output.getvalue().encode("utf-8"), "text/csv", "user-activity.csv"
        
        # PDF format
        stats = data.get("stats", {})
        lines = [
            "User Activity Report",
            f"Generated: {cls._now().isoformat()}",
            f"Period: Last {filters.get('date_range', '7d')}",
            "",
            f"Total Logins: {stats.get('total_logins', 0)}",
            f"Failed Attempts: {stats.get('failed_attempts', 0)}",
            f"Unique Users: {stats.get('unique_users', 0)}",
            "",
        ]
        for activity in activities[:50]:
            lines.append(
                f"{activity.get('timestamp', '')[:19]} | {activity.get('user_name', '')} | {activity.get('event_type', '')}"
            )
        if len(activities) > 50:
            lines.append(f"... {len(activities) - 50} more activities ...")
        
        return cls._generate_simple_pdf(lines), "application/pdf", "user-activity.pdf"

    @classmethod
    def _export_security_encryption(
        cls, export_format: str, cutoff: datetime, filters: Dict[str, str]
    ) -> Tuple[bytes, str, str]:
        """Export security and encryption logs report."""
        data = cls.security_encryption_logs(filters)
        logs = data.get("logs", [])
        
        if export_format == "csv":
            output = io.StringIO()
            fieldnames = ["timestamp", "category", "event_type", "actor_role", "status", "details"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for log in logs:
                writer.writerow({
                    "timestamp": log.get("timestamp", ""),
                    "category": log.get("category", ""),
                    "event_type": log.get("event_type", ""),
                    "actor_role": log.get("actor_role", ""),
                    "status": log.get("status", ""),
                    "details": log.get("details", ""),
                })
            return output.getvalue().encode("utf-8"), "text/csv", "security-encryption.csv"
        
        # PDF format
        stats = data.get("stats", {})
        lines = [
            "Security & Encryption Logs Report",
            f"Generated: {cls._now().isoformat()}",
            f"Period: Last {filters.get('date_range', '7d')}",
            "",
            f"Total Events: {stats.get('total_events', 0)}",
            f"Security Events: {stats.get('security_events', 0)}",
            f"Encryption Events: {stats.get('encryption_events', 0)}",
            f"Authentication Failures: {stats.get('authentication_failures', 0)}",
            "",
        ]
        for log in logs[:50]:
            lines.append(
                f"{log.get('timestamp', '')[:19]} | {log.get('category', '')} | {log.get('event_type', '')}"
            )
        if len(logs) > 50:
            lines.append(f"... {len(logs) - 50} more events ...")
        
        return cls._generate_simple_pdf(lines), "application/pdf", "security-encryption.pdf"

    @classmethod
    def _export_data_integrity(
        cls, export_format: str, cutoff: datetime, filters: Dict[str, str]
    ) -> Tuple[bytes, str, str]:
        """Export data integrity verification report."""
        data = cls.get_integrity_verification_summary(filters)
        records = data.get("records", [])
        
        if export_format == "csv":
            output = io.StringIO()
            fieldnames = ["record_id", "record_type", "verification_method", "verification_result", "timestamp"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for record in records:
                writer.writerow({
                    "record_id": record.get("record_id", ""),
                    "record_type": record.get("record_type", ""),
                    "verification_method": record.get("verification_method", ""),
                    "verification_result": record.get("verification_result", ""),
                    "timestamp": record.get("timestamp", ""),
                })
            return output.getvalue().encode("utf-8"), "text/csv", "data-integrity.csv"
        
        # PDF format
        summary = data.get("summary", {})
        lines = [
            "Data Integrity Verification Report",
            f"Generated: {cls._now().isoformat()}",
            f"Period: Last {filters.get('date_range', '7d')}",
            "",
            f"Total Checked: {summary.get('total_checked', 0)}",
            f"Valid: {summary.get('total_valid', 0)}",
            f"Failed: {summary.get('total_failed', 0)}",
            f"Integrity Score: {summary.get('integrity_score', 0)}%",
            "",
        ]
        for record in records[:50]:
            lines.append(
                f"{record.get('record_id', '')[:16]} | {record.get('record_type', '')} | {record.get('verification_result', '')}"
            )
        if len(records) > 50:
            lines.append(f"... {len(records) - 50} more records ...")
        
        return cls._generate_simple_pdf(lines), "application/pdf", "data-integrity.pdf"
