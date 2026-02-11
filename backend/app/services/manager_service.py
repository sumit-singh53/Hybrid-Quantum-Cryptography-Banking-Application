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
    
    # ========================================================================
    # APPROVAL HISTORY (READ-ONLY)
    # ========================================================================
    
    @classmethod
    def get_approval_history(
        cls,
        *,
        decision_filter: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get approval/rejection history (read-only)."""
        query = Transaction.query.filter(
            Transaction.status.in_([TransactionStatus.APPROVED, TransactionStatus.REJECTED])
        )
        
        # Apply filters
        if decision_filter and decision_filter.upper() in ["APPROVED", "REJECTED"]:
            query = query.filter(Transaction.status == TransactionStatus[decision_filter.upper()])
        
        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
                query = query.filter(Transaction.approved_at >= from_date)
            except (ValueError, AttributeError):
                pass
        
        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
                query = query.filter(Transaction.approved_at <= to_date)
            except (ValueError, AttributeError):
                pass
        
        if min_amount is not None:
            query = query.filter(Transaction.amount >= min_amount)
        
        if max_amount is not None:
            query = query.filter(Transaction.amount <= max_amount)
        
        # Order by most recent first
        query = query.order_by(Transaction.approved_at.desc()).limit(limit)
        
        transactions = query.all()
        
        # Enrich with masked data
        history = []
        for tx in transactions:
            record = tx.to_dict()
            
            # Mask customer ID (only show first 8 chars)
            if tx.created_by:
                record["customer_id_masked"] = f"{tx.created_by[:8]}****"
            else:
                record["customer_id_masked"] = "Unknown"
            
            # Add decision timestamp
            record["decision_timestamp"] = tx.approved_at.isoformat() if tx.approved_at else None
            
            # Add approval reference (transaction ID prefix)
            record["approval_reference"] = f"APR-{tx.id[:12]}"
            
            # Add decision type
            record["decision"] = tx.status.value
            
            # Mask accounts
            record["from_account_masked"] = cls._mask_account(tx.from_account)
            record["to_account_masked"] = cls._mask_account(tx.to_account)
            
            history.append(record)
        
        return history
    
    @staticmethod
    def _mask_account(account: str) -> str:
        """Mask account number for security."""
        if not account or len(account) < 8:
            return account
        return f"{account[:4]}****{account[-4:]}"
    
    @classmethod
    def get_approval_detail(cls, transaction_id: str) -> Dict[str, Any]:
        """Get detailed approval record (read-only)."""
        tx = Transaction.query.get(transaction_id)
        if not tx:
            raise ValueError("Approval record not found")
        
        if tx.status not in [TransactionStatus.APPROVED, TransactionStatus.REJECTED]:
            raise ValueError("Transaction is not in approved/rejected state")
        
        detail = tx.to_dict()
        
        # Mask sensitive data
        detail["customer_id_masked"] = f"{tx.created_by[:8]}****" if tx.created_by else "Unknown"
        detail["from_account_masked"] = cls._mask_account(tx.from_account)
        detail["to_account_masked"] = cls._mask_account(tx.to_account)
        detail["approval_reference"] = f"APR-{tx.id[:12]}"
        detail["decision"] = tx.status.value
        detail["decision_timestamp"] = tx.approved_at.isoformat() if tx.approved_at else None
        
        # Add transaction summary
        detail["transaction_summary"] = {
            "amount": float(tx.amount),
            "purpose": tx.purpose,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "processing_time_minutes": cls._calculate_processing_time(tx),
        }
        
        return detail
    
    @staticmethod
    def _calculate_processing_time(tx: Transaction) -> Optional[float]:
        """Calculate time taken to process transaction."""
        if tx.approved_at and tx.created_at:
            delta = tx.approved_at - tx.created_at
            return round(delta.total_seconds() / 60, 1)
        return None
    
    @classmethod
    def get_approval_statistics(cls) -> Dict[str, Any]:
        """Get approval history statistics."""
        total_approved = Transaction.query.filter_by(status=TransactionStatus.APPROVED).count()
        total_rejected = Transaction.query.filter_by(status=TransactionStatus.REJECTED).count()
        total_processed = total_approved + total_rejected
        
        # Get recent approvals (last 7 days)
        week_ago = cls._now() - timedelta(days=7)
        recent_approved = Transaction.query.filter(
            Transaction.status == TransactionStatus.APPROVED,
            Transaction.approved_at >= week_ago
        ).count()
        recent_rejected = Transaction.query.filter(
            Transaction.status == TransactionStatus.REJECTED,
            Transaction.approved_at >= week_ago
        ).count()
        
        # Calculate approval rate
        approval_rate = round((total_approved / total_processed * 100), 1) if total_processed > 0 else 0
        
        return {
            "total_processed": total_processed,
            "total_approved": total_approved,
            "total_rejected": total_rejected,
            "approval_rate": approval_rate,
            "recent_approved_7d": recent_approved,
            "recent_rejected_7d": recent_rejected,
        }
    
    # ========================================================================
    # TRANSACTION RISK ASSESSMENT (READ-ONLY)
    # ========================================================================
    
    @classmethod
    def get_risk_assessment(
        cls,
        *,
        risk_level_filter: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get high-risk and flagged transactions (read-only)."""
        # Get all transactions (pending, approved, rejected)
        query = Transaction.query
        
        # Apply date filters
        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
                query = query.filter(Transaction.created_at >= from_date)
            except (ValueError, AttributeError):
                pass
        
        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
                query = query.filter(Transaction.created_at <= to_date)
            except (ValueError, AttributeError):
                pass
        
        # Apply amount filters
        if min_amount is not None:
            query = query.filter(Transaction.amount >= min_amount)
        
        if max_amount is not None:
            query = query.filter(Transaction.amount <= max_amount)
        
        query = query.order_by(Transaction.created_at.desc()).limit(limit * 2)  # Get more for filtering
        
        transactions = query.all()
        
        # Calculate risk for each transaction
        risk_transactions = []
        for tx in transactions:
            risk_metrics = cls._risk_score(tx)
            
            # Apply risk level filter
            if risk_level_filter:
                if risk_level_filter.lower() != risk_metrics["level"]:
                    continue
            
            # Build risk indicators
            risk_indicators = []
            if risk_metrics["is_high_value"]:
                risk_indicators.append("High Amount")
            if risk_metrics["stale"]:
                risk_indicators.append("Unusual Delay")
            
            # Check velocity risk
            velocity_risk = cls._check_velocity_risk(tx)
            if velocity_risk["is_suspicious"]:
                risk_indicators.append("High Transaction Velocity")
            
            # Check time of day risk
            time_risk = cls._time_of_day_risk(tx.created_at)
            if time_risk == "high":
                risk_indicators.append("Unusual Time")
            
            # Only include if there are risk indicators or elevated/critical risk
            if risk_metrics["level"] in ["elevated", "critical"] or len(risk_indicators) > 0:
                record = {
                    "transaction_id": tx.id,
                    "transaction_reference": f"TXN-{tx.id[:12]}",
                    "amount": float(tx.amount),
                    "risk_level": risk_metrics["level"],
                    "risk_score": risk_metrics["score"],
                    "risk_indicators": risk_indicators,
                    "status": tx.status.value,
                    "created_at": tx.created_at.isoformat() if tx.created_at else None,
                    "from_account_masked": cls._mask_account(tx.from_account),
                    "to_account_masked": cls._mask_account(tx.to_account),
                    "customer_id_masked": f"{tx.created_by[:8]}****" if tx.created_by else "Unknown",
                    "velocity_metrics": velocity_risk,
                    "time_risk": time_risk,
                }
                risk_transactions.append(record)
        
        # Sort by risk score descending
        risk_transactions.sort(key=lambda x: x["risk_score"], reverse=True)
        
        return risk_transactions[:limit]
    
    @classmethod
    def get_risk_detail(cls, transaction_id: str) -> Dict[str, Any]:
        """Get detailed risk assessment for a transaction (read-only)."""
        tx = Transaction.query.get(transaction_id)
        if not tx:
            raise ValueError("Transaction not found")
        
        risk_metrics = cls._risk_score(tx)
        velocity_risk = cls._check_velocity_risk(tx)
        time_risk = cls._time_of_day_risk(tx.created_at)
        
        # Build risk indicators
        risk_indicators = []
        if risk_metrics["is_high_value"]:
            risk_indicators.append({
                "type": "High Amount",
                "description": f"Transaction amount (₹{float(tx.amount):,.0f}) exceeds high-value threshold",
                "severity": "high"
            })
        
        if risk_metrics["stale"]:
            risk_indicators.append({
                "type": "Unusual Delay",
                "description": f"Transaction pending for over {cls.STALE_PENDING_HOURS} hours",
                "severity": "medium"
            })
        
        if velocity_risk["is_suspicious"]:
            risk_indicators.append({
                "type": "High Transaction Velocity",
                "description": f"{velocity_risk['count_24h']} transactions in 24h, total ₹{velocity_risk['volume_24h']:,.0f}",
                "severity": "high"
            })
        
        if time_risk == "high":
            risk_indicators.append({
                "type": "Unusual Time",
                "description": "Transaction initiated during high-risk hours (11pm - 5am)",
                "severity": "medium"
            })
        elif time_risk == "medium":
            risk_indicators.append({
                "type": "Off-Hours Transaction",
                "description": "Transaction initiated outside normal business hours",
                "severity": "low"
            })
        
        detail = {
            "transaction_id": tx.id,
            "transaction_reference": f"TXN-{tx.id[:12]}",
            "amount": float(tx.amount),
            "status": tx.status.value,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "risk_assessment": {
                "risk_level": risk_metrics["level"],
                "risk_score": risk_metrics["score"],
                "risk_indicators": risk_indicators,
                "velocity_metrics": velocity_risk,
                "time_risk": time_risk,
            },
            "sender_masked": cls._mask_account(tx.from_account),
            "receiver_masked": cls._mask_account(tx.to_account),
            "customer_id_masked": f"{tx.created_by[:8]}****" if tx.created_by else "Unknown",
            "purpose": tx.purpose,
            "branch": cls._branch_for_user(tx.created_by),
        }
        
        return detail
    
    @classmethod
    def get_risk_summary(cls) -> Dict[str, Any]:
        """Get risk assessment summary statistics."""
        # Get all pending transactions
        pending = cls.pending_transactions()
        
        # Count by risk level
        high_risk_count = len([p for p in pending if p.get("risk", {}).get("level") == "critical"])
        medium_risk_count = len([p for p in pending if p.get("risk", {}).get("level") == "elevated"])
        low_risk_count = len([p for p in pending if p.get("risk", {}).get("level") == "normal"])
        
        # Count high-value transactions
        high_value_count = len([p for p in pending if p.get("risk", {}).get("is_high_value")])
        
        # Get all transactions for broader analysis
        all_txs = Transaction.query.filter(
            Transaction.created_at >= cls._now() - timedelta(days=7)
        ).all()
        
        # Count suspicious patterns
        suspicious_count = 0
        for tx in all_txs:
            velocity = cls._check_velocity_risk(tx)
            if velocity["is_suspicious"]:
                suspicious_count += 1
        
        return {
            "total_high_risk": high_risk_count,
            "total_medium_risk": medium_risk_count,
            "total_low_risk": low_risk_count,
            "pending_high_risk": high_risk_count,
            "high_value_transactions": high_value_count,
            "suspicious_patterns_7d": suspicious_count,
            "total_pending": len(pending),
        }
    
    # ========================================================================
    # MANAGER AUDIT LOGS (MANAGER SCOPE - READ-ONLY)
    # ========================================================================
    
    @classmethod
    def get_manager_audit_logs(
        cls,
        *,
        action_type_filter: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get audit logs limited to managerial scope (read-only)."""
        # Get request audit logs
        all_logs = RequestAuditStore.query_all()
        
        # Filter for manager-relevant actions
        manager_actions = [
            "approve_transaction",
            "reject_transaction",
            "verify_kyc",
            "reject_kyc",
            "update_account_status",
            "revoke_certificate",
            "reset_device_binding",
            "forward_for_review",
        ]
        
        filtered_logs = []
        for log in all_logs:
            action = log.get("action_name", "").lower()
            
            # Filter by action type if specified
            if action_type_filter:
                if action_type_filter.lower() not in action:
                    continue
            
            # Only include manager-relevant actions
            if not any(ma in action for ma in manager_actions):
                continue
            
            # Apply date filters
            timestamp = log.get("timestamp", "")
            if date_from:
                try:
                    log_date = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                    from_date = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
                    if log_date < from_date:
                        continue
                except (ValueError, AttributeError):
                    pass
            
            if date_to:
                try:
                    log_date = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                    to_date = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
                    if log_date > to_date:
                        continue
                except (ValueError, AttributeError):
                    pass
            
            # Mask sensitive data
            masked_log = {
                "event_id": log.get("event_id"),
                "timestamp": timestamp,
                "action": log.get("action_name"),
                "role_masked": log.get("role", "Unknown"),
                "status": "Completed",
                "path": log.get("path", ""),
                "method": log.get("method", ""),
            }
            
            filtered_logs.append(masked_log)
        
        # Sort by timestamp descending
        filtered_logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return filtered_logs[:limit]
    
    @classmethod
    def get_audit_log_statistics(cls) -> Dict[str, Any]:
        """Get audit log statistics for manager scope."""
        all_logs = RequestAuditStore.query_all()
        
        # Count manager-relevant actions
        manager_actions = [
            "approve_transaction",
            "reject_transaction",
            "verify_kyc",
            "reject_kyc",
            "update_account_status",
            "revoke_certificate",
        ]
        
        action_counts = defaultdict(int)
        total_manager_actions = 0
        
        # Get last 7 days
        week_ago = cls._now() - timedelta(days=7)
        recent_count = 0
        
        for log in all_logs:
            action = log.get("action_name", "").lower()
            
            # Count manager-relevant actions
            for ma in manager_actions:
                if ma in action:
                    action_counts[ma] += 1
                    total_manager_actions += 1
                    
                    # Count recent actions
                    timestamp = log.get("timestamp", "")
                    try:
                        log_date = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                        if log_date >= week_ago:
                            recent_count += 1
                    except (ValueError, AttributeError):
                        pass
                    break
        
        return {
            "total_manager_actions": total_manager_actions,
            "recent_actions_7d": recent_count,
            "action_breakdown": dict(action_counts),
            "approval_actions": action_counts.get("approve_transaction", 0) + action_counts.get("reject_transaction", 0),
            "kyc_actions": action_counts.get("verify_kyc", 0) + action_counts.get("reject_kyc", 0),
        }
    
    # ========================================================================
    # BRANCH AUDIT (MANAGER - READ-ONLY)
    # ========================================================================
    
    @classmethod
    def get_branch_audit_overview(cls) -> List[Dict[str, Any]]:
        """Get branch-level audit overview (read-only)."""
        branch_data = []
        
        for branch in cls.BRANCHES:
            # Get all transactions for this branch
            all_txs = Transaction.query.all()
            branch_txs = [tx for tx in all_txs if cls._branch_for_user(tx.created_by).get("code") == branch["code"]]
            
            # Count accounts (customers) in this branch
            customers = cls.managed_customers()
            branch_customers = [c for c in customers if c.get("branch", {}).get("code") == branch["code"]]
            
            # Count pending approvals
            pending_txs = [tx for tx in branch_txs if tx.status == TransactionStatus.PENDING]
            
            # Calculate transaction volume
            total_volume = sum(float(tx.amount) for tx in branch_txs)
            
            # Compliance status (simplified)
            compliance_status = "Compliant"
            if len(pending_txs) > 10:
                compliance_status = "Review Required"
            elif len(pending_txs) > 5:
                compliance_status = "Monitor"
            
            branch_data.append({
                "branch_id": branch["code"],
                "branch_name": branch["label"],
                "total_accounts": len(branch_customers),
                "total_transactions": len(branch_txs),
                "pending_approvals": len(pending_txs),
                "transaction_volume": round(total_volume, 2),
                "compliance_status": compliance_status,
            })
        
        return branch_data
    
    @classmethod
    def get_branch_activity_report(cls, branch_code: str) -> Dict[str, Any]:
        """Get detailed activity report for a specific branch (read-only)."""
        # Validate branch code
        branch = next((b for b in cls.BRANCHES if b["code"] == branch_code), None)
        if not branch:
            raise ValueError("Invalid branch code")
        
        # Get all transactions for this branch
        all_txs = Transaction.query.all()
        branch_txs = [tx for tx in all_txs if cls._branch_for_user(tx.created_by).get("code") == branch_code]
        
        # Transaction statistics
        total_txs = len(branch_txs)
        approved_txs = len([tx for tx in branch_txs if tx.status == TransactionStatus.APPROVED])
        rejected_txs = len([tx for tx in branch_txs if tx.status == TransactionStatus.REJECTED])
        pending_txs = len([tx for tx in branch_txs if tx.status == TransactionStatus.PENDING])
        
        # Volume statistics
        total_volume = sum(float(tx.amount) for tx in branch_txs)
        avg_transaction = round(total_volume / total_txs, 2) if total_txs > 0 else 0
        
        # Approval statistics
        approval_rate = round((approved_txs / (approved_txs + rejected_txs) * 100), 1) if (approved_txs + rejected_txs) > 0 else 0
        
        # Get recent transactions (last 10)
        recent_txs = sorted(branch_txs, key=lambda tx: tx.created_at, reverse=True)[:10]
        recent_summary = []
        for tx in recent_txs:
            recent_summary.append({
                "transaction_id": tx.id[:12],
                "amount": float(tx.amount),
                "status": tx.status.value,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
                "from_account_masked": cls._mask_account(tx.from_account),
                "to_account_masked": cls._mask_account(tx.to_account),
            })
        
        return {
            "branch_id": branch_code,
            "branch_name": branch["label"],
            "transaction_summary": {
                "total": total_txs,
                "approved": approved_txs,
                "rejected": rejected_txs,
                "pending": pending_txs,
                "approval_rate": approval_rate,
            },
            "volume_summary": {
                "total_volume": round(total_volume, 2),
                "average_transaction": avg_transaction,
            },
            "recent_transactions": recent_summary,
        }
    
    # ========================================================================
    # SECURITY ALERTS (READ-ONLY FOR MANAGER)
    # ========================================================================
    
    @classmethod
    def get_security_alerts(
        cls,
        *,
        severity_filter: Optional[str] = None,
        alert_type_filter: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get security alerts (read-only for manager)."""
        from app.security.security_event_store import SecurityEventStore
        
        # Get all security events
        events = SecurityEventStore.query_all()
        
        # Apply date filters
        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
                events = [e for e in events if datetime.fromisoformat(e.get("timestamp", "").replace("Z", "+00:00")) >= from_date]
            except (ValueError, AttributeError):
                pass
        
        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
                events = [e for e in events if datetime.fromisoformat(e.get("timestamp", "").replace("Z", "+00:00")) <= to_date]
            except (ValueError, AttributeError):
                pass
        
        # Convert security events to alerts with severity classification
        alerts = []
        for event in events:
            event_type = event.get("event_type", "")
            
            # Classify severity based on event type
            severity = "Low"
            if "failed" in event_type.lower() or "mismatch" in event_type.lower():
                severity = "Medium"
            if "revoked" in event_type.lower() or "unauthorized" in event_type.lower():
                severity = "High"
            
            # Apply severity filter
            if severity_filter and severity.lower() != severity_filter.lower():
                continue
            
            # Apply alert type filter
            if alert_type_filter and alert_type_filter.lower() not in event_type.lower():
                continue
            
            # Mask sensitive identifiers
            cert_id_masked = "****"
            if event.get("certificate_id"):
                cert_id = event.get("certificate_id")
                cert_id_masked = f"{cert_id[:8]}****" if len(cert_id) > 8 else "****"
            
            user_id_masked = "****"
            if event.get("user_id"):
                user_id = event.get("user_id")
                user_id_masked = f"{user_id[:8]}****" if len(user_id) > 8 else "****"
            
            alert = {
                "alert_id": event.get("event_id"),
                "alert_type": event_type,
                "severity": severity,
                "affected_account": cert_id_masked or user_id_masked,
                "timestamp": event.get("timestamp"),
                "status": "Logged",
                "role": event.get("role", "Unknown"),
                "metadata": event.get("metadata", {}),
            }
            alerts.append(alert)
        
        # Sort by timestamp descending
        alerts.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
        
        return alerts[:limit]
    
    @classmethod
    def get_security_alert_detail(cls, alert_id: str) -> Dict[str, Any]:
        """Get detailed security alert information (read-only)."""
        from app.security.security_event_store import SecurityEventStore
        
        events = SecurityEventStore.query_all()
        event = next((e for e in events if e.get("event_id") == alert_id), None)
        
        if not event:
            raise ValueError("Security alert not found")
        
        event_type = event.get("event_type", "")
        
        # Classify severity
        severity = "Low"
        if "failed" in event_type.lower() or "mismatch" in event_type.lower():
            severity = "Medium"
        if "revoked" in event_type.lower() or "unauthorized" in event_type.lower():
            severity = "High"
        
        # Mask sensitive data
        cert_id_masked = "****"
        if event.get("certificate_id"):
            cert_id = event.get("certificate_id")
            cert_id_masked = f"{cert_id[:8]}****" if len(cert_id) > 8 else "****"
        
        user_id_masked = "****"
        if event.get("user_id"):
            user_id = event.get("user_id")
            user_id_masked = f"{user_id[:8]}****" if len(user_id) > 8 else "****"
        
        # Build description
        description = f"Security event of type '{event_type}' was detected."
        if event.get("metadata"):
            description += f" Additional context: {event.get('metadata')}"
        
        detail = {
            "alert_id": event.get("event_id"),
            "alert_type": event_type,
            "severity": severity,
            "affected_account": cert_id_masked or user_id_masked,
            "timestamp": event.get("timestamp"),
            "status": "Logged",
            "role": event.get("role", "Unknown"),
            "description": description,
            "action_taken": "Event logged for audit review",
            "metadata": event.get("metadata", {}),
        }
        
        return detail
    
    @classmethod
    def get_security_alert_statistics(cls) -> Dict[str, Any]:
        """Get security alert statistics."""
        from app.security.security_event_store import SecurityEventStore
        
        events = SecurityEventStore.query_all()
        
        # Count by severity
        high_count = 0
        medium_count = 0
        low_count = 0
        
        for event in events:
            event_type = event.get("event_type", "")
            if "revoked" in event_type.lower() or "unauthorized" in event_type.lower():
                high_count += 1
            elif "failed" in event_type.lower() or "mismatch" in event_type.lower():
                medium_count += 1
            else:
                low_count += 1
        
        # Get recent alerts (last 24 hours)
        cutoff = cls._now() - timedelta(hours=24)
        recent_count = 0
        for event in events:
            try:
                event_time = datetime.fromisoformat(event.get("timestamp", "").replace("Z", "+00:00"))
                if event_time >= cutoff:
                    recent_count += 1
            except (ValueError, AttributeError):
                pass
        
        return {
            "total_alerts": len(events),
            "high_severity": high_count,
            "medium_severity": medium_count,
            "low_severity": low_count,
            "recent_24h": recent_count,
        }
    
    # ========================================================================
    # ENCRYPTION STATUS (READ-ONLY FOR MANAGER)
    # ========================================================================
    
    @classmethod
    def get_encryption_status(cls) -> Dict[str, Any]:
        """Get high-level encryption status overview (read-only)."""
        from app.services.crypto_management_service import CryptoManagementService
        
        # Get encryption module status
        try:
            crypto_status = CryptoManagementService.get_crypto_status()
            encryption_active = crypto_status.get("classical_crypto", {}).get("status") == "active"
            pqc_active = crypto_status.get("pq_crypto", {}).get("status") == "active"
        except Exception:  # pylint: disable=broad-except
            encryption_active = True  # Assume active if service unavailable
            pqc_active = True
        
        # Determine overall health
        if encryption_active and pqc_active:
            health_status = "Active"
        elif encryption_active or pqc_active:
            health_status = "Warning"
        else:
            health_status = "Critical"
        
        status = {
            "data_at_rest_encryption": "Enabled" if encryption_active else "Disabled",
            "data_in_transit_encryption": "Enabled",  # Always enabled for HTTPS
            "classical_crypto_active": encryption_active,
            "pqc_active": pqc_active,
            "encryption_module_status": health_status,
            "last_verification": cls._now().isoformat() + "Z",
            "encryption_algorithms": {
                "classical": "AES-256-GCM, RSA-3072" if encryption_active else "N/A",
                "post_quantum": "ML-KEM-768, ML-DSA-65" if pqc_active else "N/A",
            },
        }
        
        return status
    
    # ========================================================================
    # CERTIFICATE OVERVIEW (READ-ONLY FOR MANAGER)
    # ========================================================================
    
    @classmethod
    def get_certificate_overview(
        cls,
        *,
        status_filter: Optional[str] = None,
        role_filter: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get certificate overview (read-only for manager)."""
        payloads = cls._certificate_payloads()
        
        certificates = []
        for payload in payloads:
            cert_id = payload.get("certificate_id")
            if not cert_id:
                continue
            
            # Determine status
            is_revoked = False
            try:
                is_revoked = CertificateService.is_revoked(cert_id)
            except Exception:  # pylint: disable=broad-except
                pass
            
            # Check expiry
            status = "Active"
            if is_revoked:
                status = "Revoked"
            else:
                expiry_str = payload.get("expires_at") or payload.get("valid_to")
                if expiry_str:
                    try:
                        expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
                        if expiry < cls._now():
                            status = "Expired"
                    except (ValueError, AttributeError):
                        pass
            
            # Apply status filter
            if status_filter and status.lower() != status_filter.lower():
                continue
            
            # Apply role filter
            cert_role = payload.get("role", "")
            if role_filter and cert_role.lower() != role_filter.lower():
                continue
            
            # Mask certificate ID
            cert_id_masked = f"{cert_id[:8]}****" if len(cert_id) > 8 else cert_id
            
            cert_info = {
                "certificate_id_masked": cert_id_masked,
                "certificate_id": cert_id,  # Keep for detail lookup
                "role": cert_role,
                "status": status,
                "issue_date": payload.get("issued_at") or payload.get("valid_from"),
                "expiry_date": payload.get("expires_at") or payload.get("valid_to"),
                "owner": payload.get("owner", "Unknown"),
            }
            certificates.append(cert_info)
        
        # Sort by issue date descending
        certificates.sort(key=lambda c: c.get("issue_date", ""), reverse=True)
        
        return certificates[:limit]
    
    @classmethod
    def get_certificate_detail(cls, certificate_id: str) -> Dict[str, Any]:
        """Get detailed certificate information (read-only metadata only)."""
        payloads = cls._certificate_payloads()
        payload = next((p for p in payloads if p.get("certificate_id") == certificate_id), None)
        
        if not payload:
            raise ValueError("Certificate not found")
        
        # Determine status
        is_revoked = False
        try:
            is_revoked = CertificateService.is_revoked(certificate_id)
        except Exception:  # pylint: disable=broad-except
            pass
        
        status = "Active"
        if is_revoked:
            status = "Revoked"
        else:
            expiry_str = payload.get("expires_at") or payload.get("valid_to")
            if expiry_str:
                try:
                    expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
                    if expiry < cls._now():
                        status = "Expired"
                except (ValueError, AttributeError):
                    pass
        
        # Mask certificate ID
        cert_id_masked = f"{certificate_id[:8]}****" if len(certificate_id) > 8 else certificate_id
        
        detail = {
            "certificate_id_masked": cert_id_masked,
            "role": payload.get("role", "Unknown"),
            "status": status,
            "owner": payload.get("owner", "Unknown"),
            "issue_date": payload.get("issued_at") or payload.get("valid_from"),
            "expiry_date": payload.get("expires_at") or payload.get("valid_to"),
            "issuer": "PQ Banking CA",
            "signature_algorithm": payload.get("classical_signature_alg", "RSA-3072/SHA3-256"),
            "pq_signature_algorithm": payload.get("pq_signature_alg", "Dilithium-3"),
            "purpose": payload.get("purpose_scope", "role-restricted-banking"),
            "lineage": payload.get("lineage_id", "N/A"),
        }
        
        return detail
    
    @classmethod
    def get_certificate_request_summary(cls) -> Dict[str, Any]:
        """Get certificate request status summary."""
        from app.models.certificate_request_model import CertificateRequest
        
        try:
            pending_count = CertificateRequest.query.filter_by(status="pending").count()
            approved_count = CertificateRequest.query.filter_by(status="approved").count()
            rejected_count = CertificateRequest.query.filter_by(status="rejected").count()
        except Exception:  # pylint: disable=broad-except
            # If certificate request table doesn't exist, return zeros
            pending_count = 0
            approved_count = 0
            rejected_count = 0
        
        return {
            "pending_requests": pending_count,
            "approved_requests": approved_count,
            "rejected_requests": rejected_count,
            "total_requests": pending_count + approved_count + rejected_count,
        }
    
    @classmethod
    def get_certificate_statistics(cls) -> Dict[str, Any]:
        """Get certificate statistics."""
        payloads = cls._certificate_payloads()
        
        total_count = len(payloads)
        active_count = 0
        expired_count = 0
        revoked_count = 0
        expiring_soon_count = 0
        
        cutoff = cls._now() + timedelta(days=30)
        
        for payload in payloads:
            cert_id = payload.get("certificate_id")
            if not cert_id:
                continue
            
            # Check if revoked
            is_revoked = False
            try:
                is_revoked = CertificateService.is_revoked(cert_id)
            except Exception:  # pylint: disable=broad-except
                pass
            
            if is_revoked:
                revoked_count += 1
                continue
            
            # Check expiry
            expiry_str = payload.get("expires_at") or payload.get("valid_to")
            if expiry_str:
                try:
                    expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
                    if expiry < cls._now():
                        expired_count += 1
                    elif expiry <= cutoff:
                        expiring_soon_count += 1
                        active_count += 1
                    else:
                        active_count += 1
                except (ValueError, AttributeError):
                    active_count += 1
            else:
                active_count += 1
        
        return {
            "total_certificates": total_count,
            "active_certificates": active_count,
            "expired_certificates": expired_count,
            "revoked_certificates": revoked_count,
            "expiring_soon_30d": expiring_soon_count,
        }
