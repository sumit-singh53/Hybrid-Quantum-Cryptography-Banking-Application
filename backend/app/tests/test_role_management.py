import pytest
from flask import Flask

from app.config.database import db
from app.models.role_model import Role
from app.models.user_model import User
from app.routes.system_admin_routes import system_admin_bp


@pytest.fixture(name="admin_app")
def fixture_admin_app(tmp_path):
    app = Flask(__name__)
    db_path = tmp_path / "roles.db"
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{db_path.as_posix()}",
        TESTING_BYPASS_CERTIFICATE=True,
        SECRET_KEY="test-key",
    )
    db.init_app(app)
    app.register_blueprint(system_admin_bp)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(name="admin_client")
def fixture_admin_client(admin_app):
    with admin_app.test_client() as client:
        yield client


def _admin_headers(actions=None):
    action_scope = actions or ["MANAGE_ROLES"]
    return {
        "X-Test-Role": "system_admin",
        "X-Test-Actions": ",".join(action_scope),
        "X-Test-User-Id": "sys-admin",
        "X-Test-User-Name": "System Admin",
    }


def test_list_roles_bootstraps_defaults(admin_client):
    response = admin_client.get("/api/system-admin/roles", headers=_admin_headers())

    assert response.status_code == 200
    payload = response.get_json()
    assert isinstance(payload["roles"], list)
    assert payload["total"] == len(payload["roles"])
    assert any(role["name"] == "system_admin" for role in payload["roles"])


def test_create_role_and_prevent_duplicates(admin_client):
    body = {"name": "risk_officer"}
    create_response = admin_client.post(
        "/api/system-admin/roles",
        json=body,
        headers=_admin_headers(),
    )

    assert create_response.status_code == 201
    created = create_response.get_json()["role"]
    assert created["name"] == body["name"]

    duplicate_response = admin_client.post(
        "/api/system-admin/roles",
        json=body,
        headers=_admin_headers(),
    )
    assert duplicate_response.status_code == 400


def test_update_and_delete_role(admin_app, admin_client):
    with admin_app.app_context():
        role = Role(name="compliance")
        db.session.add(role)
        db.session.commit()
        role_id = role.id

    update_response = admin_client.put(
        f"/api/system-admin/roles/{role_id}",
        json={"name": "compliance_officer"},
        headers=_admin_headers(),
    )
    assert update_response.status_code == 200
    assert update_response.get_json()["role"]["name"] == "compliance_officer"

    delete_response = admin_client.delete(
        f"/api/system-admin/roles/{role_id}",
        headers=_admin_headers(),
    )
    assert delete_response.status_code == 200


def test_delete_role_blocked_when_assigned(admin_app, admin_client):
    with admin_app.app_context():
        role = Role(name="operations")
        db.session.add(role)
        db.session.commit()
        user = User(
            username="ops-user",
            full_name="Ops User",
            email="ops@example.com",
            role_id=role.id,
        )
        db.session.add(user)
        db.session.commit()
        role_id = role.id

    response = admin_client.delete(
        f"/api/system-admin/roles/{role_id}",
        headers=_admin_headers(),
    )

    assert response.status_code == 400
    assert "assigned" in response.get_json()["message"].lower()
