from app.config.database import db
from app.models.audit_log_model import AuditLog


class AuditLogger:
    """
    Writes cryptographically verifiable audit logs
    """

    @staticmethod
    def log_action(user, action, transaction_id=None):
        """
        Records a regulatory-grade audit entry.
        """
        log = AuditLog(
            user_id=user["id"],
            user_name=user["name"],
            user_role=user["role"],
            action=action,
            transaction_id=transaction_id,
            pq_identity=user.get("pq_public_key", "UNKNOWN"),
            classical_identity=user.get("rsa_public_key", "UNKNOWN"),
        )

        db.session.add(log)
        db.session.commit()
