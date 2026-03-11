from flask import Blueprint, jsonify

user_bp = Blueprint("user", __name__)


@user_bp.route("/", methods=["GET"])
def get_users():
    """
    Dummy users list
    """
    return (
        jsonify(
            [
                {"id": 1, "name": "Customer User", "role": "customer"},
                {"id": 2, "name": "Manager User", "role": "manager"},
                {"id": 3, "name": "Auditor Clerk", "role": "auditor_clerk"},
            ]
        ),
        200,
    )
