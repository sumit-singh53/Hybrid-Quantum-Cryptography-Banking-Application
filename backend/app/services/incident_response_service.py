"""
Incident Response Service
--------------------------
Handles security incident detection, tracking, and response actions.
Admin-only service with full audit logging.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import uuid

from app.config.database import db
from app.security.security_event_store import SecurityEventStore
from app.models.user_model import User


class IncidentResponseService:
    """Service for incident response management."""
    
    # Incident storage (in-memory for now, can be moved to database)
    _incidents = []
    
    @staticmethod
    def get_all_incidents(
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get all incidents with optional filtering."""
        incidents = IncidentResponseService._incidents.copy()
        
        # Apply filters
        if status:
            incidents = [i for i in incidents if i.get("status") == status]
        
        if severity:
            incidents = [i for i in incidents if i.get("severity") == severity]
        
        # Sort by timestamp (newest first)
        incidents.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return incidents[:limit]
    
    @staticmethod
    def get_incident_by_id(incident_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific incident by ID."""
        for incident in IncidentResponseService._incidents:
            if incident.get("incident_id") == incident_id:
                return incident
        return None
    
    @staticmethod
    def create_incident(
        incident_type: str,
        severity: str,
        description: str,
        affected_user: Optional[str] = None,
        affected_service: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        created_by: str = "system"
    ) -> Dict[str, Any]:
        """Create a new security incident."""
        incident = {
            "incident_id": str(uuid.uuid4()),
            "type": incident_type,
            "severity": severity,  # low, medium, high, critical
            "status": "active",  # active, investigating, resolved
            "description": description,
            "affected_user": affected_user,
            "affected_service": affected_service,
            "metadata": metadata or {},
            "created_by": created_by,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "resolved_at": None,
            "resolved_by": None,
            "actions_taken": [],
        }
        
        IncidentResponseService._incidents.append(incident)
        
        # Log to security events
        SecurityEventStore.record(
            event_type="INCIDENT_CREATED",
            user_id=created_by,
            metadata={
                "incident_id": incident["incident_id"],
                "type": incident_type,
                "severity": severity,
            }
        )
        
        return incident
    
    @staticmethod
    def update_incident_status(
        incident_id: str,
        status: str,
        admin_username: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update incident status."""
        incident = IncidentResponseService.get_incident_by_id(incident_id)
        
        if not incident:
            raise ValueError(f"Incident {incident_id} not found")
        
        old_status = incident["status"]
        incident["status"] = status
        incident["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Add action to history
        action = {
            "action_type": "status_change",
            "from_status": old_status,
            "to_status": status,
            "performed_by": admin_username,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "notes": notes,
        }
        incident["actions_taken"].append(action)
        
        # If resolved, record resolution time
        if status == "resolved":
            incident["resolved_at"] = datetime.utcnow().isoformat() + "Z"
            incident["resolved_by"] = admin_username
        
        # Log to security events
        SecurityEventStore.record(
            event_type="INCIDENT_STATUS_UPDATED",
            user_id=admin_username,
            metadata={
                "incident_id": incident_id,
                "old_status": old_status,
                "new_status": status,
            }
        )
        
        return incident
    
    @staticmethod
    def lock_user_account(
        incident_id: str,
        user_id: str,
        admin_username: str,
        reason: str
    ) -> Dict[str, Any]:
        """Lock a user account as incident response action."""
        incident = IncidentResponseService.get_incident_by_id(incident_id)
        
        if not incident:
            raise ValueError(f"Incident {incident_id} not found")
        
        # Find user
        user = User.query.filter_by(username=user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Lock account (set is_active to False)
        user.is_active = False
        db.session.commit()
        
        # Add action to incident history
        action = {
            "action_type": "lock_account",
            "target_user": user_id,
            "performed_by": admin_username,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "reason": reason,
        }
        incident["actions_taken"].append(action)
        incident["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Log to security events
        SecurityEventStore.record(
            event_type="INCIDENT_RESPONSE_LOCK_ACCOUNT",
            user_id=admin_username,
            metadata={
                "incident_id": incident_id,
                "target_user": user_id,
                "reason": reason,
            }
        )
        
        return {
            "success": True,
            "message": f"User {user_id} account locked",
            "incident": incident,
        }
    
    @staticmethod
    def unlock_user_account(
        incident_id: str,
        user_id: str,
        admin_username: str,
        reason: str
    ) -> Dict[str, Any]:
        """Unlock a user account."""
        incident = IncidentResponseService.get_incident_by_id(incident_id)
        
        if not incident:
            raise ValueError(f"Incident {incident_id} not found")
        
        # Find user
        user = User.query.filter_by(username=user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Unlock account
        user.is_active = True
        db.session.commit()
        
        # Add action to incident history
        action = {
            "action_type": "unlock_account",
            "target_user": user_id,
            "performed_by": admin_username,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "reason": reason,
        }
        incident["actions_taken"].append(action)
        incident["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Log to security events
        SecurityEventStore.record(
            event_type="INCIDENT_RESPONSE_UNLOCK_ACCOUNT",
            user_id=admin_username,
            metadata={
                "incident_id": incident_id,
                "target_user": user_id,
                "reason": reason,
            }
        )
        
        return {
            "success": True,
            "message": f"User {user_id} account unlocked",
            "incident": incident,
        }
    
    @staticmethod
    def get_incident_statistics() -> Dict[str, Any]:
        """Get incident statistics."""
        incidents = IncidentResponseService._incidents
        
        total = len(incidents)
        active = len([i for i in incidents if i["status"] == "active"])
        investigating = len([i for i in incidents if i["status"] == "investigating"])
        resolved = len([i for i in incidents if i["status"] == "resolved"])
        
        # Count by severity
        critical = len([i for i in incidents if i["severity"] == "critical"])
        high = len([i for i in incidents if i["severity"] == "high"])
        medium = len([i for i in incidents if i["severity"] == "medium"])
        low = len([i for i in incidents if i["severity"] == "low"])
        
        return {
            "total_incidents": total,
            "active_incidents": active,
            "investigating_incidents": investigating,
            "resolved_incidents": resolved,
            "by_severity": {
                "critical": critical,
                "high": high,
                "medium": medium,
                "low": low,
            },
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def detect_incidents_from_security_events() -> List[Dict[str, Any]]:
        """Auto-detect potential incidents from security events."""
        events = SecurityEventStore.query_events(limit=100)
        detected_incidents = []
        
        # Check for multiple failed logins
        failed_logins = [
            e for e in events
            if "login" in str(e.get("event_type", "")).lower() and
            "fail" in str(e.get("event_type", "")).lower()
        ]
        
        if len(failed_logins) > 5:
            detected_incidents.append({
                "type": "suspicious_login",
                "severity": "high",
                "description": f"Multiple failed login attempts detected ({len(failed_logins)})",
                "affected_service": "authentication",
            })
        
        # Check for policy violations
        policy_violations = [
            e for e in events
            if "policy" in str(e.get("event_type", "")).lower() and
            "violation" in str(e.get("event_type", "")).lower()
        ]
        
        if len(policy_violations) > 0:
            detected_incidents.append({
                "type": "policy_violation",
                "severity": "medium",
                "description": f"Security policy violations detected ({len(policy_violations)})",
                "affected_service": "security_policies",
            })
        
        return detected_incidents


# Initialize with some sample incidents for demonstration
def initialize_sample_incidents():
    """Initialize sample incidents for demonstration."""
    if len(IncidentResponseService._incidents) == 0:
        # Sample incident 1
        IncidentResponseService.create_incident(
            incident_type="suspicious_login",
            severity="high",
            description="Multiple failed login attempts from unknown IP address",
            affected_user="customer_user_123",
            affected_service="authentication",
            metadata={"ip_address": "192.168.1.100", "attempts": 10},
            created_by="system"
        )
        
        # Sample incident 2
        IncidentResponseService.create_incident(
            incident_type="policy_violation",
            severity="medium",
            description="User attempted to access restricted resource",
            affected_user="manager_user_456",
            affected_service="rbac",
            metadata={"resource": "/admin/config", "action": "unauthorized_access"},
            created_by="system"
        )

# Initialize sample incidents
initialize_sample_incidents()
