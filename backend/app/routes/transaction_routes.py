from flask import Blueprint, request, jsonify
from app.security.access_control import require_certificate
from app.security.transfer_audit_store import TransferAuditStore
from app.services.transaction_service import TransactionService
from app.utils.logger import AuditLogger

transaction_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")


def _log_transfer_event(action: str, tx_payload: dict) -> None:
    certificate = getattr(request, "certificate", {}) or {}
    session_ctx = getattr(request, "session", {}) or {}
    binding = session_ctx.get("binding") or {}

    try:
        TransferAuditStore.record_transfer(
            transaction_id=tx_payload.get("id"),
            customer_id=tx_payload.get("created_by") or request.user.get("id"),
            cert_hash=certificate.get("cert_hash"),
            device_id=binding.get("device_id"),
            action=action,
            amount=tx_payload.get("amount"),
            status=tx_payload.get("status"),
        )
    except Exception:
        # Audit log integrity should never block the primary request path
        try:
            AuditLogger.log_action(
                user=request.user,
                action=f"Transfer audit log failure for {action}",
                transaction_id=tx_payload.get("id"),
            )
        except Exception:
            pass


# =========================================
# CUSTOMER: Create transaction
# =========================================


@transaction_bp.route("/create", methods=["POST"])
@require_certificate("customer", allowed_actions=["CREATE_TRANSACTION"])
def create_transaction():
    user = request.user
    data = request.json

    to_account = data.get("to_account")
    amount = data.get("amount")
    purpose = data.get("purpose")

    if not to_account or not amount or not purpose:
        return jsonify({"message": "Missing transaction data"}), 400

    try:
        tx = TransactionService.create_transaction(user, to_account, amount, purpose)
    except PermissionError as exc:
        return jsonify({"message": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    AuditLogger.log_action(
        user=user, action="Created transaction", transaction_id=tx["id"]
    )
    _log_transfer_event("CREATE", tx)

    return jsonify(tx), 201


# =========================================
# MANAGER: Approve transaction
# =========================================


@transaction_bp.route("/approve/<tx_id>", methods=["POST"])
@require_certificate(
    {"manager"},
    allowed_actions=["APPROVE_TRANSACTION", "APPROVE_HIGH_VALUE"],
    action_match="any",
)
def approve_transaction(tx_id):
    user = request.user
    payload = request.get_json(silent=True) or {}
    action = (payload.get("action") or "approve").strip().upper()
    reason = (payload.get("reason") or payload.get("notes") or "").strip()

    try:
        if action == "REJECT":
            tx = TransactionService.reject_transaction(tx_id, user, reason)
            AuditLogger.log_action(
                user=user,
                action=f"Rejected transaction | reason: {reason or 'unspecified'}",
                transaction_id=tx_id,
            )
            _log_transfer_event("REJECT", tx)
        else:
            tx = TransactionService.approve_transaction(tx_id, user)
            AuditLogger.log_action(
                user=user, action="Approved transaction", transaction_id=tx_id
            )
            _log_transfer_event("APPROVE", tx)

        return jsonify(tx)

    except Exception as e:
        return jsonify({"message": str(e)}), 403


# =========================================
# CUSTOMER: View own transactions
# =========================================


@transaction_bp.route("/my", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def my_transactions():
    user = request.user
    txs = TransactionService.get_user_transactions(user["id"])

    AuditLogger.log_action(user=user, action="Viewed own transactions")

    return jsonify(txs)


@transaction_bp.route("/history", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def my_transactions_alias():
    return my_transactions()


# =========================================
# AUDITOR_CLERK: View all transactions
# =========================================


@transaction_bp.route("/all", methods=["GET"])
@require_certificate(
    {"auditor_clerk"}, allowed_actions=["VIEW_AUDIT"], action_match="any"
)
def all_transactions():
    user = request.user
    txs = TransactionService.get_all_transactions()

    AuditLogger.log_action(user=user, action="Viewed all transactions")

    return jsonify(txs)


@transaction_bp.route("/<tx_id>", methods=["GET"])
@require_certificate("customer", allowed_actions=["VIEW_OWN"])
def transaction_detail(tx_id):
    user = request.user
    try:
        tx = TransactionService.get_transaction_detail(tx_id, user)
    except PermissionError as exc:
        return jsonify({"message": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 404

    AuditLogger.log_action(user=user, action="Viewed transaction", transaction_id=tx_id)
    return jsonify(tx)
