import textwrap
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_PATH = BASE_DIR / "docs" / "Hybrid-PQ-Banking-Blueprint.pdf"


def build_entries():
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return [
        (
            "title",
            "Hybrid Quantum Cryptography Banking Application -- Implementation + Security Dossier",
        ),
        (
            "paragraph",
            "Generated on {}. This dossier consolidates backend, frontend, cryptographic, and operational controls so\narchitects, auditors, and responders can understand how every subsystem is implemented without scanning the repo.".format(
                timestamp
            ),
        ),
        ("blank", ""),
        ("heading", "Section 1 -- Mission & Governance Intent"),
        (
            "paragraph",
            "The platform eliminates passwords and OTPs in favor of hardware-bound certificates for customers, clerks, managers,\nauditors, and system administrators. Objectives: satisfy zero-trust banking expectations, keep artifacts printable for regulators,\nand prove that hybrid (classical + PQ) cryptography can protect day-to-day retail workflows.",
        ),
        (
            "bullet",
            "Identity enforcement starts with CertificateService and DeviceBindingStore, meaning no API, page, or transaction is served\nwithout proving possession of the binding secret recorded inside instance/device_bindings.json.",
        ),
        (
            "bullet",
            "Every privileged action (manager approvals, auditor exports, certificate revocations) is routed through services that both\nvalidate role claims and log immutable evidence inside accountability and request audit chains.",
        ),
        (
            "bullet",
            "Documentation lives next to code (backend/SECURITY.md, scripts/*, frontend/README.md) so governance reviewers can trace\nrequirements to implementation without external portals.",
        ),
        ("blank", ""),
        ("heading", "Section 2 -- Architecture Snapshot"),
        (
            "paragraph",
            "The solution is split into a Flask + SQLAlchemy backend (backend/app) and a React 18 single-page frontend (frontend/src).\nPersistent evidence (SQLite, JSON ledgers, PEM artifacts) is stored inside backend/database, backend/instance, and certificates/.",
        ),
        (
            "bullet",
            "Runtime entry: backend/app/main.py builds the Flask app, wires config from config/config.py, registers SQLAlchemy via\ndatabase.py, enables CORS, calls CAInitService.initialize_ca(), and registers the auth, certificate, transaction, manager, auditor,\naudit, and user blueprints imported from app/routes/*. run.py simply calls create_app() so python run.py boots the API.",
        ),
        (
            "bullet",
            "Data plane: SQLite lives in backend/database/app.db and is accessed through models such as Transaction, CertificateRecord,\nAuditLog, Role, and User (app/models/*). Migrations are handled by targeted scripts like migrate_add_purpose_column.py.",
        ),
        (
            "bullet",
            "Frontline presentation: frontend/src/index.js hydrates React with Context providers (AuthContext, RoleContext). AppRoutes.jsx\nuses ProtectedRoute wrappers to mirror backend scopes. Each dashboard under components/ renders only when the auth context reports\nthat the certificate session is valid.",
        ),
        (
            "bullet",
            "Cryptographic assets: certificates/ca holds CA key pairs, certificates/users/<role>/<user>.json stores issued cert payloads, and\ncertificates/revoked tracks CRLs in both JSON and PEM forms. PQ artifacts are generated alongside RSA keys to support hybrid signing.",
        ),
        (
            "bullet",
            "Automation & tooling: backend/scripts hosts bootstrapers for managers, auditor_clerks, and CA state plus this PDF generator.\nEach script uses the local virtualenv (./.venv) so dependencies remain vendor-pinned.",
        ),
        ("blank", ""),
        ("heading", "Section 3 -- Backend Implementation Walkthrough"),
        (
            "paragraph",
            "Backend responsibilities span routing, service orchestration, storage, and evidence capture. The following bullets map concrete\nfiles to behavior.",
        ),
        (
            "bullet",
            "Configuration: app/config/config.py reads environment variables, normalizes the SQLite URI, and exposes settings for certificate\npaths, audit intervals, CRL cache windows, and CORS origins. database.py instantiates SQLAlchemy and seeds the scoped session.",
        ),
        (
            "bullet",
            "Models: app/models/*.py define dataclasses on top of SQLAlchemy. TransactionModel records amount, currency, status, hashes, and\ncreated_by metadata. CertificateModel stores certificate_id, role, allowed_actions, lineage_id, and revocation flags. AuditLogModel\nlinks transaction_id, action, certificate_id, event_hash, and timestamp so investigators can replay actions.",
        ),
        (
            "bullet",
            "Routes: auth_routes.py handles login, logout, refresh, certificate validation, and device proof workflows. certificate_routes.py\nissues, lists, revokes, and validates certs. transaction_routes.py enables customer submissions plus manager approvals. audit_routes.py\nstreams accountability reports and audit chains. manager_routes.py and auditor_clerk_routes.py provide role dashboards with guard\nwrappers such as manager_guard() and auditor_guard().",
        ),
        (
            "bullet",
            "Services: certificate_service.py signs payloads with RSA + ML-DSA and stores files. ca_init_service.py ensures CA folders exist.\ntransaction_service.py handles create_transaction(), approve_transaction(), reject_transaction(), and ledger hydration. role_service.py\nresolves allowed_actions per role. hybrid_crypto_service.py and pq_crypto_service.py encapsulate signing and verification helpers.",
        ),
        (
            "bullet",
            "Security helpers: access_control.py provides require_certificate(), create_session(), session refresh timers, and revocation rechecks.\nsecurity/event stores (device_binding_store.py, accountability_store.py, request_audit_store.py, security_event_store.py, crl_manager.py,\nkey_management.py, signature_verification.py) centralize evidence and key motion.",
        ),
        (
            "bullet",
            "Utilities: utils/logger.py applies structured logging; response_handler.py standardizes payloads with success/error envelopes;\nvalidators.py enforces schema checks for sign-up and transaction inputs.",
        ),
        ("blank", ""),
        ("heading", "Section 4 -- Security & Cryptography Fabric"),
        (
            "paragraph",
            "Security controls are layered so compromise of one primitive is insufficient to act or hide activity.",
        ),
        (
            "bullet",
            "Certificate lifecycle: CertificateService.issue_* builds payloads that embed allowed_actions, lineage_id, defense_version,\nsecurity_layers, challenge_algorithm, device_id, and parent_ca_fp. compute_cert_hash() hashes the canonical JSON before signing.\nverify_certificate() enforces issuance window, CRL status, device binding, and hybrid signature verification.",
        ),
        (
            "bullet",
            "Post-quantum posture: pq_crypto_service.py wraps ML-DSA-65 (Dilithium) signing while hybrid_crypto_service.py pairs it with\nRSA-3072/SHA3-256. Signatures are stored side-by-side so either algorithm can be audited independently.",
        ),
        (
            "bullet",
            "Device binding: device_binding_store.py stores device_secret per user inside instance/device_bindings.json, hashed via SHA3-256.\nLogin flows prove possession by recomputing the stored challenge and comparing the derived device_id.",
        ),
        (
            "bullet",
            "Session hardening: access_control.py sets IDLE_TIMEOUT_SECONDS=900, ABSOLUTE_SESSION_LIMIT_SECONDS=8*3600, and CONTINUOUS_AUTH\nintervals to force re-challenges. Sessions store cert_hash, device_id, allowed_actions, and lineage_id so every API can reconfirm rights.",
        ),
        (
            "bullet",
            "Audit immutability: request_audit_store.py appends SHA3-256(event) chains for every HTTP call, capturing method, path, certificate_id,\ndevice_id, and prev_hash. accountability_store.py logs signed intents at session creation, hashing cert_hash||intent||timestamp, giving\ninvestigators proof that a user acknowledged the security policy before acting.",
        ),
        (
            "bullet",
            "Revocation & CRL: CertificateService.is_revoked() caches certificates/revoked/crl.json for 300 seconds and records reason, requester,\nand timestamp for each entry. managers and system admins call revoke_certificate() through secured routes to populate the ledger.",
        ),
        (
            "bullet",
            "Key custody: ca_init.py and user_certificate_issuer.py generate RSA + PQ keys offline. key_management.py demonstrates how payload\nkeys would be rotated, and signature_verification.py shows how to validate third-party responses with the hybrid stack.",
        ),
        ("blank", ""),
        ("heading", "Section 5 -- Frontend Implementation Map"),
        (
            "paragraph",
            "React components surface the same constraints as the backend. Context providers hydrate from the authenticated session and\ninject role-aware helpers into every view.",
        ),
        (
            "bullet",
            "Routing & guards: routes/AppRoutes.jsx defines ProtectedRoute wrappers that inspect AuthContext (certificate session) and RoleContext.\nUnauthorized roles are redirected to /login even if they try to deep link a URL.",
        ),
        (
            "bullet",
            "Auth experience: components/auth/Login.jsx handles certificate upload + device proof, CustomerSignup.jsx issues enrollment requests,\nCertificateUpload.jsx supports manager-led issuance, and Logout.jsx destroys the session context.",
        ),
        (
            "bullet",
            "Manager suite: components/dashboard/ManagerDashboard.jsx shows KPI cards, pending queues, and CRL counts; manager/ManagerCustomers.jsx\nlists customers and exposes Reset Device; ManagerCertificates.jsx drives revocation dialogs; ManagerReports.jsx aggregates reports and\nescalation submissions; BranchAudit.jsx replays audit events inline.",
        ),
        (
            "bullet",
            "Auditor suite: dashboard/AuditorClerkDashboard.jsx, certificates/AuditCertificates.jsx, transactions/AuditTransactions.jsx,\nAuditReports.jsx, AuditLogs.jsx, and AuditorProfile.jsx provide read-only telemetry plus CSV/PDF download actions driven by\nfrontend/services/certificateService.js and transactionService.js.",
        ),
        (
            "bullet",
            "Shared scaffolding: components/common/Navbar.jsx, Sidebar.jsx, and Footer.jsx present consistent navigation once authenticated.\nApp.css and assets/styles/main.css define the console aesthetic while keeping typography accessible.",
        ),
        ("blank", ""),
        ("heading", "Section 6 -- End-to-End Workflows"),
        (
            "paragraph",
            "Key flows illustrate how implementation and security layers interlock.",
        ),
        (
            "bullet",
            "Certificate onboarding: CAInitService generates CA keys; user_certificate_issuer.py or certificate_routes.issue_* mints user certs;\nDeviceBindingStore stores device_secret; cert files land under certificates/users/<role>/ with RSA + PQ signatures.",
        ),
        (
            "bullet",
            "Authentication handshake: frontend Login.jsx uploads the certificate and device proof to /api/auth/login. auth_routes.verify_login()\ncalls CertificateService.verify_certificate(), checks CRL, ensures device binding, records AccountabilityStore intent, creates a session,\nand returns short-lived tokens consumed by AuthContext.",
        ),
        (
            "bullet",
            "Transaction lifecycle: customers hit POST /api/transactions to create payloads stored via TransactionService.create_transaction().\nManagers read pending queues, call decide_transaction() to approve or reject, and AuditLogger + RequestAuditStore write immutable events.",
        ),
        (
            "bullet",
            "Certificate revocation: managers or system admins submit POST /api/manager/certificates/revoke or /api/certificates/revoke.\nRoutes call CertificateService.revoke_certificate(), update crl.json, drop device bindings if needed, and notify RequestAuditStore.",
        ),
        (
            "bullet",
            "Audit exports: auditor routes aggregate AuditLog rows, RequestAuditStore chains, and accountability entries. export_report() can\nproduce JSON, CSV, or dependency-free PDFs for regulators. Frontend download buttons call authService.fetchWithCert() to include session\nheaders.",
        ),
        (
            "bullet",
            "Incident response: security_event_store.py logs anomalies (device mismatch, expired session). Managers can reset devices to force\nauth re-checks. Auditors inspect misuse alerts via AuditorClerkService.certificate_misuse_alerts().",
        ),
        ("blank", ""),
        ("heading", "Section 7 -- Operational Safeguards & Monitoring"),
        (
            "paragraph",
            "Operational readiness is addressed through deterministic configs, local evidence, and automated checks.",
        ),
        (
            "bullet",
            "Logging: utils/logger.py standardizes structured logs. AuditLogger (services/classical_crypto_service.py dependency) records action,\nactor, reason, and prev_hash for every manager decision.",
        ),
        (
            "bullet",
            "Testing: backend/app/tests/ contains pytest cases for auth, certificates, and transactions. Tests rely on pytest fixtures in\nconftest.py to spin up an app context with in-memory SQLite, proving the services operate deterministically.",
        ),
        (
            "bullet",
            "Dependency hygiene: backend/requirements.txt pins Flask, SQLAlchemy, cryptography, and PQ libs; frontend/package.json pins React,\nreact-router, axios, and testing libs. Virtualenv (.venv) isolates backend dependencies, and npm/yarn handles frontend packages.",
        ),
        (
            "bullet",
            "Evidence retention: backend/instance holds JSON ledgers (request_audit_log, accountability_log, manager_escalations, device_bindings).\nAll files are human-readable for spot checks and can be shipped as-is during compliance reviews.",
        ),
        (
            "bullet",
            "Deployment posture: environment variables (FLASK_ENV, DATABASE_URL, CERT_BASE_PATH, FRONTEND_ORIGIN) drive behavior so cloud\noperators can supply hardened secrets without editing code.",
        ),
        ("blank", ""),
        ("heading", "Section 8 -- Differentiators & Firsts"),
        (
            "paragraph",
            "The implementation is deliberate about being explainable, enforceable, and future-proof.",
        ),
        (
            "bullet",
            "Hybrid certificate payloads embed seven declarative defenses (HybridSignatures, ImmutableCertHash, DeviceBinding, PurposeLock,\nCRLTracking, Lineage, ChallengeResponse) so auditors can inspect intent without extra documentation.",
        ),
        (
            "bullet",
            "Signed intent chains (AccountabilityStore) trigger before any dashboard call, linking certificate lineage, authority, IP metadata,\nand consent to policy. This produces a cryptographic paper trail uncommon in sample banking stacks.",
        ),
        (
            "bullet",
            "Minimalist PDF pipeline: both AuditorClerkService._export_pdf() and scripts/generate_functional_security_report.py handcraft PDF\nobjects, eliminating third-party libs and keeping exports reviewable by security teams.",
        ),
        (
            "bullet",
            "Front-to-back scope symmetry: ProtectedRoute ensures the UI never renders a screen the backend would reject, cutting off stale-role\nattacks and reducing social engineering risk against clerks.",
        ),
        (
            "bullet",
            "Manager branch derivation uses SHA-1(user_id) to deterministically map staff to branch buckets without storing extra tables, enabling\nconsistent reporting and tamper-proof routing.",
        ),
        (
            "paragraph",
            "Result: the project demonstrates how to modernize banking workflows with hybrid PQ cryptography while maintaining a printable,\naudit-friendly evidence trail from login to escalation closure.",
        ),
        ("blank", ""),
        ("heading", "Section 9 -- Quick Reference Directory"),
        (
            "bullet",
            "backend/app/config -> configuration + SQLAlchemy bootstrap",
        ),
        (
            "bullet",
            "backend/app/models -> ORM entities for transactions, certificates, roles, users, audits",
        ),
        (
            "bullet",
            "backend/app/routes -> Flask blueprints for auth, certificates, transactions, audit, manager, auditor",
        ),
        (
            "bullet",
            "backend/app/services -> business logic, crypto services, CA initialization",
        ),
        (
            "bullet",
            "backend/app/security -> device binding, accountability, request audit, key managers, CRL handling",
        ),
        (
            "bullet",
            "backend/app/utils -> logger, response handler, validators",
        ),
        (
            "bullet",
            "frontend/src/components -> role dashboards, auth flows, shared UI",
        ),
        (
            "bullet",
            "frontend/src/services -> axios wrappers for auth, certificates, transactions, manager APIs",
        ),
        (
            "bullet",
            "frontend/src/context -> AuthContext + RoleContext for ProtectedRoute decisions",
        ),
        (
            "bullet",
            "backend/instance -> evidence JSON (device bindings, accountability, audit chains, escalations)",
        ),
        (
            "bullet",
            "certificates/ -> CA material, issued certs, revocation ledgers",
        ),
    ]


def build_lines(entries):
    lines = []
    for kind, text in entries:
        if kind == "blank":
            lines.append("")
            continue
        if kind in {"title", "heading"}:
            lines.append(text)
            continue
        if kind == "paragraph":
            wrapped = textwrap.wrap(text, width=95)
            lines.extend(wrapped or [""])
            continue
        if kind == "bullet":
            wrapped = textwrap.wrap(text, width=93)
            if not wrapped:
                lines.append("- ")
                continue
            lines.append("- " + wrapped[0])
            for cont in wrapped[1:]:
                lines.append("  " + cont)
            continue
        lines.append(text)
    return lines


def chunk_lines(lines, per_page=46):
    chunk = []
    for line in lines:
        chunk.append(line)
        if len(chunk) >= per_page:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def escape_pdf_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("\r", " ")
    )


def build_text_stream(page_lines):
    commands = ["BT", "/F1 11 Tf", "50 760 Td", "14 TL"]
    for line in page_lines:
        commands.append(f"({escape_pdf_text(line)}) Tj")
        commands.append("T*")
    commands.append("ET")
    return ("\n".join(commands) + "\n").encode("utf-8")


def build_pdf(lines):
    pages = list(chunk_lines(lines, per_page=46)) or [[]]
    object_buffers = []

    def obj_bytes(index: int, body: bytes) -> bytes:
        return f"{index} 0 obj ".encode("ascii") + body + b" endobj\n"

    pdf_header = b"%PDF-1.4\n"

    page_object_numbers = []
    content_object_numbers = []
    next_obj = 4
    for _ in pages:
        page_object_numbers.append(next_obj)
        content_object_numbers.append(next_obj + 1)
        next_obj += 2

    total_objects = next_obj - 1

    pages_kids = "[" + " ".join(f"{num} 0 R" for num in page_object_numbers) + "]"

    object_buffers.append(
        obj_bytes(1, f"<< /Type /Catalog /Pages 2 0 R >>".encode("utf-8"))
    )
    object_buffers.append(
        obj_bytes(
            2,
            f"<< /Type /Pages /Count {len(pages)} /Kids {pages_kids} >>".encode(
                "utf-8"
            ),
        )
    )
    object_buffers.append(
        obj_bytes(
            3,
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        )
    )

    for idx, page_lines in enumerate(pages):
        page_num = page_object_numbers[idx]
        content_num = content_object_numbers[idx]
        stream = build_text_stream(page_lines)
        content_body = (
            f"<< /Length {len(stream)} >> stream\n".encode("utf-8")
            + stream
            + b"endstream"
        )
        page_body = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {content_num} 0 R"
            " /Resources << /Font << /F1 3 0 R >> >> >>"
        ).encode("utf-8")
        object_buffers.append(obj_bytes(page_num, page_body))
        object_buffers.append(obj_bytes(content_num, content_body))

    offsets = []
    current_offset = len(pdf_header)
    pdf_body = bytearray(pdf_header)
    for buffer in object_buffers:
        offsets.append(current_offset)
        pdf_body.extend(buffer)
        current_offset += len(buffer)

    xref_start = len(pdf_body)
    xref_entries = [b"0000000000 65535 f \n"]
    for offset in offsets:
        xref_entries.append(f"{offset:010d} 00000 n \n".encode("ascii"))

    xref = (
        b"xref\n0 "
        + str(total_objects + 1).encode("ascii")
        + b"\n"
        + b"".join(xref_entries)
    )
    trailer = (
        b"trailer << /Size "
        + str(total_objects + 1).encode("ascii")
        + b" /Root 1 0 R >>\nstartxref\n"
        + str(xref_start).encode("ascii")
        + b"\n%%EOF"
    )

    pdf_body.extend(xref)
    pdf_body.extend(trailer)
    return bytes(pdf_body)


def main():
    entries = build_entries()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = build_lines(entries)
    pdf_bytes = build_pdf(lines)
    OUTPUT_PATH.write_bytes(pdf_bytes)
    print(f"Report generated at {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
