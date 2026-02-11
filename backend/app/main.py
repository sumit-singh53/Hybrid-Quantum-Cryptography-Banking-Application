from flask import Flask, jsonify
from flask_cors import CORS

from app.config.config import Config
from app.config.database import db

# Blueprints
from app.routes.auth_routes import auth_bp
from app.routes.transaction_routes import transaction_bp
from app.routes.audit_routes import audit_bp
from app.routes.customer_routes import customer_bp
from app.routes.auditor_clerk_routes import auditor_clerk_bp
from app.routes.manager_routes import manager_bp
from app.routes.system_admin_routes import system_admin_bp
from app.routes.rbac_routes import rbac_bp
from app.routes.dynamic_navigation_routes import dynamic_nav_bp
from app.routes.security_policy_routes import security_policy_bp
from app.routes.system_config_routes import system_config_bp
from app.routes.backup_routes import backup_bp
from app.routes.beneficiary_routes import beneficiary_bp
from app.routes.certificate_request_routes import certificate_request_bp
from app.services.ca_init_service import CAInitService
from app.services.rbac_service import RBACService


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ENABLE CORS (VERY IMPORTANT)
    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:3000"}},
        supports_credentials=True,
    )

    # Initialize database
    db.init_app(app)

    with app.app_context():
        db.create_all()
        
        # Initialize RBAC system (roles, permissions, mappings)
        try:
            RBACService.initialize_rbac()
            app.logger.info("RBAC system initialized successfully")
        except Exception as e:
            app.logger.warning(f"RBAC initialization: {e}")

    # Initialize Bank CA
    CAInitService.initialize_ca()

    # Register routes
    app.register_blueprint(auth_bp)
    app.register_blueprint(transaction_bp)
    app.register_blueprint(audit_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(auditor_clerk_bp)
    app.register_blueprint(manager_bp)
    app.register_blueprint(system_admin_bp)
    app.register_blueprint(rbac_bp)
    app.register_blueprint(dynamic_nav_bp)
    app.register_blueprint(security_policy_bp)
    app.register_blueprint(system_config_bp)
    app.register_blueprint(backup_bp)
    app.register_blueprint(beneficiary_bp)
    app.register_blueprint(certificate_request_bp)

    # Health check
    @app.route("/api/health")
    def health():
        return jsonify({"status": "OK", "security": "Hybrid PQ-PKI Active"})

    return app
