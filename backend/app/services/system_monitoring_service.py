"""
System Monitoring Service
-------------------------
Provides system health, performance, and security monitoring metrics.
Admin-only, read-only monitoring without exposing sensitive data.
"""

from typing import Dict, Any
from datetime import datetime, timedelta
import os
from pathlib import Path

from app.config.database import db
from app.security.security_event_store import SecurityEventStore
from app.security.request_audit_store import RequestAuditStore
from app.models.audit_log_model import AuditLog


class SystemMonitoringService:
    """Service for system monitoring and health checks."""
    
    @staticmethod
    def get_system_health() -> Dict[str, Any]:
        """Get overall system health status."""
        try:
            # Check database connectivity
            db_status = SystemMonitoringService._check_database()
            
            # Check cryptography modules
            crypto_status = SystemMonitoringService._check_crypto_modules()
            
            # Check file system
            fs_status = SystemMonitoringService._check_filesystem()
            
            # Determine overall health
            all_healthy = (
                db_status["status"] == "healthy" and
                crypto_status["status"] == "healthy" and
                fs_status["status"] == "healthy"
            )
            
            overall_status = "healthy" if all_healthy else "degraded"
            
            return {
                "overall_status": overall_status,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "components": {
                    "database": db_status,
                    "cryptography": crypto_status,
                    "filesystem": fs_status,
                },
            }
        except Exception as e:
            return {
                "overall_status": "critical",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "error": "Health check failed",
                "components": {},
            }
    
    @staticmethod
    def get_security_metrics() -> Dict[str, Any]:
        """Get security-related metrics."""
        try:
            # Get security events from the last 24 hours
            events = SecurityEventStore.query_all()
            
            # Count failed login attempts
            failed_logins = len([
                e for e in events
                if "login" in str(e.get("event_type", "")).lower() and
                "fail" in str(e.get("event_type", "")).lower()
            ])
            
            # Count suspicious activities
            suspicious_events = len([
                e for e in events
                if "suspicious" in str(e.get("event_type", "")).lower() or
                "unauthorized" in str(e.get("event_type", "")).lower()
            ])
            
            # Count certificate revocations
            revocations = len([
                e for e in events
                if "revoke" in str(e.get("event_type", "")).lower() or
                "revocation" in str(e.get("event_type", "")).lower()
            ])
            
            # Count policy updates
            policy_updates = len([
                e for e in events
                if "policy" in str(e.get("event_type", "")).lower()
            ])
            
            # Get active sessions count (approximate from recent requests)
            recent_requests = RequestAuditStore.query_all()
            unique_users = set()
            cutoff_time = datetime.utcnow() - timedelta(minutes=30)
            
            for req in recent_requests:
                try:
                    req_time = datetime.fromisoformat(req.get("timestamp", "").replace("Z", "+00:00"))
                    if req_time > cutoff_time:
                        user_id = req.get("user_id") or req.get("certificate_id")
                        if user_id:
                            unique_users.add(user_id)
                except (ValueError, AttributeError):
                    pass
            
            active_sessions = len(unique_users)
            
            return {
                "failed_login_attempts": failed_logins,
                "suspicious_activities": suspicious_events,
                "certificate_revocations": revocations,
                "policy_updates": policy_updates,
                "active_sessions": active_sessions,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        except Exception as e:
            return {
                "failed_login_attempts": 0,
                "suspicious_activities": 0,
                "certificate_revocations": 0,
                "policy_updates": 0,
                "active_sessions": 0,
                "error": "Failed to fetch security metrics",
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
    
    @staticmethod
    def get_performance_metrics() -> Dict[str, Any]:
        """Get high-level performance metrics."""
        try:
            # Get request audit logs
            requests = RequestAuditStore.query_all()
            
            # Calculate metrics for last hour
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            recent_requests = []
            
            for req in requests:
                try:
                    req_time = datetime.fromisoformat(req.get("timestamp", "").replace("Z", "+00:00"))
                    if req_time > cutoff_time:
                        recent_requests.append(req)
                except (ValueError, AttributeError):
                    pass
            
            total_requests = len(recent_requests)
            
            # Calculate average requests per minute
            requests_per_minute = total_requests / 60 if total_requests > 0 else 0
            
            # Get audit log count
            audit_log_count = AuditLog.query.count()
            
            # Get security events count
            security_events_count = len(SecurityEventStore.query_all())
            
            return {
                "requests_last_hour": total_requests,
                "requests_per_minute": round(requests_per_minute, 2),
                "total_audit_logs": audit_log_count,
                "total_security_events": security_events_count,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        except Exception as e:
            return {
                "requests_last_hour": 0,
                "requests_per_minute": 0,
                "total_audit_logs": 0,
                "total_security_events": 0,
                "error": "Failed to fetch performance metrics",
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
    
    @staticmethod
    def get_alerts() -> Dict[str, Any]:
        """Get system alerts and warnings."""
        alerts = []
        warnings = []
        
        try:
            # Check database connectivity
            db_status = SystemMonitoringService._check_database()
            if db_status["status"] != "healthy":
                alerts.append({
                    "severity": "critical",
                    "component": "database",
                    "message": "Database connectivity issue detected",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                })
            
            # Check crypto modules
            crypto_status = SystemMonitoringService._check_crypto_modules()
            if crypto_status["status"] != "healthy":
                alerts.append({
                    "severity": "critical",
                    "component": "cryptography",
                    "message": "Cryptography module issue detected",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                })
            
            # Check for high failed login attempts
            security_metrics = SystemMonitoringService.get_security_metrics()
            if security_metrics.get("failed_login_attempts", 0) > 10:
                warnings.append({
                    "severity": "warning",
                    "component": "security",
                    "message": f"High number of failed login attempts: {security_metrics['failed_login_attempts']}",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                })
            
            # Check for suspicious activities
            if security_metrics.get("suspicious_activities", 0) > 5:
                warnings.append({
                    "severity": "warning",
                    "component": "security",
                    "message": f"Suspicious activities detected: {security_metrics['suspicious_activities']}",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                })
            
            return {
                "alerts": alerts,
                "warnings": warnings,
                "total_alerts": len(alerts),
                "total_warnings": len(warnings),
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        except Exception as e:
            return {
                "alerts": [],
                "warnings": [],
                "total_alerts": 0,
                "total_warnings": 0,
                "error": "Failed to fetch alerts",
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
    
    @staticmethod
    def _check_database() -> Dict[str, Any]:
        """Check database connectivity."""
        try:
            # Simple query to test database
            db.session.execute(db.text("SELECT 1"))
            return {
                "status": "healthy",
                "message": "Database connection active",
                "response_time_ms": 0,  # Placeholder
            }
        except Exception as e:
            return {
                "status": "critical",
                "message": "Database connection failed",
                "error": "Connection error",
            }
    
    @staticmethod
    def _check_crypto_modules() -> Dict[str, Any]:
        """Check cryptography modules availability."""
        try:
            # Check if CA keys exist
            from pathlib import Path
            base_dir = Path(__file__).resolve().parents[2]
            ca_path = base_dir / "certificates" / "ca"
            
            rsa_private = ca_path / "ca_rsa_private.key"
            rsa_public = ca_path / "ca_rsa_public.key"
            pq_private = ca_path / "pq_ca_private.key"
            pq_public = ca_path / "pq_ca_public.key"
            
            all_exist = all([
                rsa_private.exists(),
                rsa_public.exists(),
                pq_private.exists(),
                pq_public.exists(),
            ])
            
            if all_exist:
                return {
                    "status": "healthy",
                    "message": "Cryptography modules operational",
                    "classical_ca": "available",
                    "pq_ca": "available",
                }
            else:
                return {
                    "status": "degraded",
                    "message": "Some CA keys missing",
                    "classical_ca": "available" if rsa_private.exists() else "missing",
                    "pq_ca": "available" if pq_private.exists() else "missing",
                }
        except Exception as e:
            return {
                "status": "critical",
                "message": "Cryptography check failed",
                "error": "Module error",
            }
    
    @staticmethod
    def _check_filesystem() -> Dict[str, Any]:
        """Check filesystem health."""
        try:
            # Check if instance directory is writable
            from pathlib import Path
            base_dir = Path(__file__).resolve().parents[2]
            instance_dir = base_dir / "instance"
            
            if instance_dir.exists() and os.access(instance_dir, os.W_OK):
                return {
                    "status": "healthy",
                    "message": "Filesystem accessible",
                    "instance_dir": "writable",
                }
            else:
                return {
                    "status": "degraded",
                    "message": "Filesystem access limited",
                    "instance_dir": "read-only or missing",
                }
        except Exception as e:
            return {
                "status": "critical",
                "message": "Filesystem check failed",
                "error": "Access error",
            }
