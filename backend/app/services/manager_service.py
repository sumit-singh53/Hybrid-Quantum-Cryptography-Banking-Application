import hashlib
import json
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from collections import defaultdict

from app.models.transaction_model import Transaction, TransactionStatus
from app.security.certificate_vault import CertificateVault
from app.security.device_binding_store import DeviceBindingStore
from app.security.request_audit_store import RequestAuditStore
from app.services.certificate_service import CertificateService
from app.services.transaction_service import TransactionService


class ManagerService:
    """Operational tooling for branch managers."""

    HIGH_VALUE_THRESHOLD = 100_000.0
    STALE_PENDING_HOURS = 12
    BRANCHES = [
        {"code": "MUM-HQ", "label": "Mumbai HQ"},
        {"code": "BLR-CYB", "label": "Bengaluru Cyber"},
        {"code": "HYD-TRS", "label": "Hyderabad Treasury"},
        {"code": "CHE-RTL", "label": "Chennai Retail"},
    ]

    ESCALATION_STORE = (
        Path(__file__).resolve().parents[2] / "instance" / "manager_escalations.json"
    )
    _ESCALATION_LOCK = threading.Lock()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def _branch_for_user(cls, user_id: Optional[str]) -> Dict[str, str]:
        if not user_id:
            return {"code": "UNASSIGNED", "label": "Unassigned"}
        digest = hashlib.sha1(user_id.encode("utf-8")).hexdigest()
        index = int(digest[:2], 16) % len(cls.BRANCHES)
        return cls.BRANCHES[index]

    @staticmethod
    def _age_hours(created_at: datetime) -> float:
        now = ManagerService._now()
        return max(
            0.0,
            (now - created_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600.0,
        )

    @classmethod
    def _risk_score(cls, tx: Transaction) -> Dict[str, Any]:
        amount_factor = float(tx.amount) / cls.HIGH_VALUE_THRESHOLD
        age_factor = cls._age_hours(tx.created_at) / cls.STALE_PENDING_HOURS
        aggregate = round(max(amount_factor + age_factor, 0.1), 2)
        if aggregate >= 2:
            level = "critical"
        elif aggregate >= 1:
            level = "elevated"
        else:
            level = "normal"
        return {
            "score": aggregate,
            "level": level,
            "is_high_value": float(tx.amount) >= cls.HIGH_VALUE_THRESHOLD,
            "stale": cls._age_hours(tx.created_at) >= cls.STALE_PENDING_HOURS,
        }

    @classmethod
    def _pending_queryset(cls):
        return (
            Transaction.query.filter_by(status=TransactionStatus.PENDING)
            .order_by(Transaction.created_at.asc())
            .all()
        )

    @classmethod
    def pending_transactions(cls) -> List[Dict[str, Any]]:
        rows = []
        for tx in cls._pending_queryset():
            metrics = cls._risk_score(tx)
            branch = cls._branch_for_user(tx.created_by)
            record = tx.to_dict()
            record.update(
                {
                    "branch": branch,
                    "risk": metrics,
                    "age_minutes": round(cls._age_hours(tx.created_at) * 60, 1),
                }
            )
            rows.append(record)
        return rows

    @classmethod
    def high_value_alerts(cls, limit: int = 5) -> List[Dict[str, Any]]:
        pending = cls.pending_transactions()
        alerts = [row for row in pending if row["risk"]["is_high_value"]]
        alerts.sort(key=lambda row: row["risk"]["score"], reverse=True)
        return alerts[:limit]

    @classmethod
    def revoked_certificate_count(cls) -> int:
        crl = CertificateService._load_crl()
        return len(crl.get("revoked", []))

    @classmethod
    def _count_expiring_certs(cls, days_threshold: int = 30) -> int:
        """Count certificates expiring within threshold days."""
        payloads = cls._certificate_payloads()
        count = 0
        cutoff = cls._now() + timedelta(days=days_threshold)
        
        for payload in payloads:
            expiry_str = payload.get("expires_at")
            if expiry_str:
                try:
                    expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
                    if expiry <= cutoff:
                        count += 1
                except (ValueError, AttributeError):
                    continue
        return count
    
    @classmethod
    def _next_expiry_date(cls) -> str:
        """Find the earliest certificate expiry date."""
        payloads = cls._certificate_payloads()
        earliest = None
        
        for payload in payloads:
            expiry_str = payload.get("expires_at")
            if expiry_str:
                try:
                    expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
                    if earliest is None or expiry < earliest:
                        earliest = expiry
                except (ValueError, AttributeError):
                    continue
        
        if earliest:
            days_left = (earliest - cls._now()).days
            if days_left < 0:
                return "Expired"
            elif days_left == 0:
                return "Today"
            elif days_left == 1:
                return "Tomorrow"
            else:
                return f"{days_left} days"
        return "--"
    
    @classmethod
    def _check_velocity_risk(cls, tx: Transaction) -> Dict[str, Any]:
        """Check for suspicious transaction velocity."""
        cutoff_time = cls._now() - timedelta(hours=24)
        recent_txs = Transaction.query.filter(
            Transaction.created_by == tx.created_by,
            Transaction.created_at >= cutoff_time
        ).all()
        
        count = len(recent_txs)
        total_amount = sum(float(t.amount) for t in recent_txs)
        
        is_suspicious = count > 5 or total_amount > 500000
        
        return {
            "count_24h": count,
            "volume_24h": total_amount,
            "is_suspicious": is_suspicious
        }
    
    @classmethod
    def _time_of_day_risk(cls, created_at: datetime) -> str:
        """Assess risk based on transaction time."""
        hour = created_at.hour
        # High risk: 11pm - 5am
        if hour >= 23 or hour < 5:
            return "high"
        # Medium risk: 6am - 8am, 8pm - 11pm
        elif hour < 8 or hour >= 20:
            return "medium"
        # Normal: business hours
        return "normal"
    
    @classmethod
    def _branch_health(cls) -> List[Dict[str, Any]]:
        pending = cls.pending_transactions()
        aggregates: Dict[str, Dict[str, Any]] = {}
        for row in pending:
            code = row["branch"]["code"]
            bucket = aggregates.setdefault(
                code,
                {
                    "code": row["branch"]["code"],
                    "label": row["branch"]["label"],
                    "pending": 0,
                    "stale": 0,
                    "avg_risk": 0.0,
                },
            )
            bucket["pending"] += 1
            bucket["avg_risk"] += row["risk"]["score"]
            if row["risk"].get("stale"):
                bucket["stale"] += 1
        for bucket in aggregates.values():
            if bucket["pending"]:
                avg_score = bucket["avg_risk"] / bucket["pending"]
            else:
                avg_score = 0.0
            bucket["avg_risk"] = round(avg_score, 2)
            if avg_score >= 2:
                bucket["risk_level"] = "critical"
            elif avg_score >= 1:
                bucket["risk_level"] = "elevated"
            else:
                bucket["risk_level"] = "normal"
        return list(aggregates.values())

    @classmethod
    def dashboard_snapshot(cls) -> Dict[str, Any]:
        pending = cls.pending_transactions()
        high_value = cls.high_value_alerts()
        
        # Generate risk feed from current state
        risk_feed = []
        if len(high_value) > 0:
            risk_feed.append({
                "id": "high-value-alert",
                "title": f"{len(high_value)} High-Value Transactions Pending",
                "detail": f"Total value: ₹{sum(float(t.get('amount', 0)) for t in high_value):,.0f}"
            })
        
        stale_count = len([p for p in pending if p.get("risk", {}).get("stale", False)])
        if stale_count > 0:
            risk_feed.append({
                "id": "stale-alert",
                "title": f"{stale_count} Stale Transactions",
                "detail": "Pending for over 12 hours - require attention"
            })
        
        critical_count = len([p for p in pending if p.get("risk", {}).get("level") == "critical"])
        if critical_count > 0:
            risk_feed.append({
                "id": "critical-risk",
                "title": "Critical Risk Transactions Detected",
                "detail": f"{critical_count} transactions require immediate review"
            })
        
        # Calculate oldest pending
        oldest_pending = "Queue is fresh"
        if pending:
            oldest_age = max(p.get("age_minutes", 0) for p in pending)
            if oldest_age >= 60:
                oldest_pending = f"Oldest: {oldest_age // 60}h {oldest_age % 60}m ago"
            elif oldest_age > 0:
                oldest_pending = f"Oldest: {oldest_age:.0f}m ago"
        
        # Count high-risk transactions
        high_risk_count = len([p for p in pending if p.get("risk", {}).get("is_high_value", False)]) + critical_count
        
        # Find highest risk branch
        branch_health = cls._branch_health()
        highest_risk_branch = "No alerts"
        if branch_health:
            critical_branches = [b for b in branch_health if b.get("risk_level") == "critical"]
            if critical_branches:
                highest_risk_branch = critical_branches[0].get("label", "Unknown")
        
        return {
            "pending_approvals": pending[:10],
            "high_risk_count": high_risk_count,
            "highest_risk_branch": highest_risk_branch,
            "expiring_certificates": cls._count_expiring_certs(),
            "next_expiry": cls._next_expiry_date(),
            "oldest_pending": oldest_pending,
            "branch_health": branch_health,
            "risk_feed": risk_feed,
            "recent_actions": cls._get_recent_manager_actions(),
            "performance_metrics": cls._get_performance_metrics(),
        }

    @classmethod
    def decide_transaction(
        cls,
        tx_id: str,
        *,
        approver: Dict[str, Any],
        action: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        normalized_action = (action or "approve").strip().upper()
        if normalized_action == "REJECT":
            return TransactionService.reject_transaction(tx_id, approver, reason)
        return TransactionService.approve_transaction(tx_id, approver)

    @classmethod
    def _certificate_payloads(cls) -> List[Dict[str, str]]:
        payloads: List[Dict[str, str]] = []
        customer_dir = CertificateService.CERT_BASE / "customer"
        if not customer_dir.exists():
            return payloads
        for cert_file in customer_dir.glob("*.pem"):
            plaintext = CertificateVault.load_if_exists(cert_file)
            if not plaintext:
                continue
            payload = CertificateService._parse_certificate_text(plaintext)
            payloads.append(payload)
        return payloads

    @staticmethod
    def _last_seen_map() -> Dict[str, str]:
        entries = RequestAuditStore.query_all()
        timeline: Dict[str, str] = {}
        for entry in entries:
            certificate_id = entry.get("certificate_id")
            if certificate_id:
                timeline[certificate_id] = entry.get("timestamp")
        return timeline

    @classmethod
    def managed_customers(cls) -> List[Dict[str, Any]]:
        roster: List[Dict[str, Any]] = []
        last_seen = cls._last_seen_map()
        for payload in cls._certificate_payloads():
            cert_id = payload.get("certificate_id")
            if not cert_id:
                continue
            branch = cls._branch_for_user(payload.get("user_id"))
            revoked = False
            try:
                revoked = CertificateService.is_revoked(cert_id)
            except Exception:  # pylint: disable=broad-except
                revoked = False
            binding_present = bool(DeviceBindingStore.get_secret(cert_id))
            roster.append(
                {
                    "certificate_id": cert_id,
                    "owner": payload.get("owner"),
                    "role": payload.get("role"),
                    "branch": branch,
                    "status": "Revoked" if revoked else "Active",
                    "last_seen": last_seen.get(cert_id),
                    "binding_state": "Bound" if binding_present else "Unbound",
                }
            )
        roster.sort(key=lambda row: row.get("owner") or "")
        return roster

    @staticmethod
    def reset_device_binding(user_id: str) -> Dict[str, str]:
        if not user_id:
            raise ValueError("user_id is required for reset")
        DeviceBindingStore.delete_secret(user_id)
        return {
            "user_id": user_id,
            "message": "Device binding reset. User must re-register device.",
        }

    @classmethod
    def revoke_certificate(
        cls, certificate_id: str, reason: str, *, requester: Dict[str, Any]
    ):
        metadata = CertificateService.revoke_certificate(
            certificate_id,
            reason=reason,
            requested_by=requester,
        )
        return metadata

    @classmethod
    def _ensure_escalation_store(cls) -> None:
        cls.ESCALATION_STORE.parent.mkdir(parents=True, exist_ok=True)
        if not cls.ESCALATION_STORE.exists():
            cls.ESCALATION_STORE.write_text("[]", encoding="utf-8")

    @classmethod
    def _load_escalations(cls) -> List[Dict[str, Any]]:
        cls._ensure_escalation_store()
        with cls.ESCALATION_STORE.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    @classmethod
    def _save_escalations(cls, data: List[Dict[str, Any]]) -> None:
        with cls.ESCALATION_STORE.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)

    @classmethod
    def record_escalation(
        cls,
        *,
        raised_by: Dict[str, Any],
        subject: str,
        description: str,
        severity: str = "medium",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        entry = {
            "id": hashlib.sha1(
                f"{subject}{datetime.utcnow()}".encode("utf-8")
            ).hexdigest(),
            "subject": subject,
            "description": description,
            "severity": (severity or "medium").lower(),
            "metadata": metadata or {},
            "raised_by": raised_by.get("name"),
            "timestamp": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        }
        with cls._ESCALATION_LOCK:
            data = cls._load_escalations()
            data.append(entry)
            cls._save_escalations(data)
        return entry

    @classmethod
    def list_escalations(cls, limit: int = 20) -> List[Dict[str, Any]]:
        cls._ensure_escalation_store()
        data = cls._load_escalations()
        data.sort(key=lambda row: row.get("timestamp"), reverse=True)
        return data[:limit]

    @classmethod
    def branch_audit_view(cls, limit: int = 120) -> List[Dict[str, Any]]:
        entries = RequestAuditStore.query_all()
        entries.sort(key=lambda entry: entry.get("timestamp") or "")
        recent = entries[-limit:]
        decorated = []
        for entry in recent:
            branch = cls._branch_for_user(
                entry.get("user_id") or entry.get("certificate_id")
            )
            decorated.append({**entry, "branch": branch})
        return list(reversed(decorated))

    @classmethod
    def _get_recent_manager_actions(cls, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recent manager approval/rejection actions."""
        # Get recently processed transactions
        recent = Transaction.query.filter(
            Transaction.status.in_([TransactionStatus.APPROVED, TransactionStatus.REJECTED])
        ).order_by(Transaction.updated_at.desc()).limit(limit).all()
        
        actions = []
        for tx in recent:
            actions.append({
                "transaction_id": tx.id,
                "action": tx.status.value.lower(),
                "amount": float(tx.amount),
                "timestamp": tx.updated_at.isoformat() if tx.updated_at else tx.created_at.isoformat(),
                "from_account": tx.from_account,
                "to_account": tx.to_account
            })
        
        return actions
    
    @classmethod
    def _get_performance_metrics(cls) -> Dict[str, Any]:
        """Calculate manager performance metrics."""
        # Get last 24 hours of transactions
        cutoff = cls._now() - timedelta(hours=24)
        recent = Transaction.query.filter(Transaction.created_at >= cutoff).all()
        
        total_processed = sum(1 for tx in recent if tx.status in [TransactionStatus.APPROVED, TransactionStatus.REJECTED])
        approved_count = sum(1 for tx in recent if tx.status == TransactionStatus.APPROVED)
        rejected_count = sum(1 for tx in recent if tx.status == TransactionStatus.REJECTED)
        
        # Calculate average approval time
        approval_times = []
        for tx in recent:
            if tx.status in [TransactionStatus.APPROVED, TransactionStatus.REJECTED] and tx.updated_at:
                time_diff = (tx.updated_at - tx.created_at).total_seconds() / 60  # in minutes
                approval_times.append(time_diff)
        
        avg_approval_time = round(sum(approval_times) / len(approval_times), 1) if approval_times else 0
        
        return {
            "total_processed_24h": total_processed,
            "approved_24h": approved_count,
            "rejected_24h": rejected_count,
            "avg_approval_time_minutes": avg_approval_time,
            "approval_rate": round((approved_count / total_processed * 100), 1) if total_processed > 0 else 0
        }
    
    @classmethod
    def manager_reports(cls) -> Dict[str, Any]:
        total = Transaction.query.count()
        pending = Transaction.query.filter_by(status="PENDING").count()
        approved = Transaction.query.filter_by(status="APPROVED").count()
        rejected = Transaction.query.filter_by(status="REJECTED").count()
        branch_health = cls._branch_health()
        return {
            "volume_summary": {
                "total": total,
                "pending": pending,
                "approved": approved,
                "rejected": rejected,
            },
            "branch_health": branch_health,
            "escalations": cls.list_escalations(limit=10),
            "performance_metrics": cls._get_performance_metrics(),
        }
