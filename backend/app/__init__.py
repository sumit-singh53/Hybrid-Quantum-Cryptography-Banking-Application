from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)

    # Enable CORS (frontend -> backend)
    CORS(app, supports_credentials=True)

    # Load config
    app.config.from_object("app.config.config.Config")

    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.certificate_routes import certificate_bp
    from app.routes.transaction_routes import transaction_bp
    from app.routes.user_routes import user_bp
    from app.routes.audit_routes import audit_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(certificate_bp, url_prefix="/api/certificates")
    app.register_blueprint(transaction_bp, url_prefix="/api/transactions")
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(audit_bp, url_prefix="/api/audit")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return {"status": "OK", "message": "Backend is running"}, 200

    return app
