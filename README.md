# Hybrid Quantum Cryptography Banking Application

A full-stack secure banking platform that combines **classical cryptography** and **post-quantum cryptography** to defend against both present-day and future quantum threats.

This repository contains:
- A Flask backend implementing certificate-first authentication, RBAC, and secure transaction services
- A React frontend with role-based dashboards and guarded workflows
- Certificate authority and cryptographic security modules
- Audit/compliance subsystems for forensic traceability

## What makes this project special

- **Hybrid PKI**: Dual-signature certificate model using RSA + Dilithium
- **Passwordless auth**: Certificate challenge-response login with device binding
- **Post-quantum readiness**: ML-KEM (Kyber) for secure key exchange/envelope protection
- **Fine-grained RBAC**: Resource-action permission system with runtime enforcement
- **Cryptographic accountability**: Signed intent chains and tamper-evident audit trails
- **Multi-role banking workflows**: Customer, Manager, Auditor Clerk, System Admin

## Repository layout

- `backend/` — Flask API, services, models, cryptographic controls, tests
- `frontend/` — React app, role-based pages, auth context, API integrations
- `certificates/` — certificate authority artifacts and revocation materials
- `backend/instance/` — runtime local state stores (audit/event json + db)
- `FINAL_PROJECT_REPORT.md` — complete end-to-end project report

## Core architecture

- **Backend**: Flask + SQLAlchemy + cryptography + pqcrypto
- **Frontend**: React + Router + Axios + Chart.js + Tailwind
- **Data layer**: SQLite (dev), MySQL-compatible architecture (production path)
- **Security stack**:
  - Device binding + challenge-response
  - Immutable certificate hash checks (SHA3-256)
  - Dual-signature verification (RSA + Dilithium)
  - CRL + lineage validation
  - Purpose locking and action constraints
  - Validity window enforcement
  - Accountability chain logging

## Major capabilities

### Authentication and identity
- Customer registration with certificate issuance
- Certificate challenge-response login
- QR-assisted certificate login flow
- Session verification and refresh endpoints

### Banking operations
- Account dashboard and account overview
- Beneficiary management
- Secure transaction creation and lifecycle tracking
- Manager approval/rejection workflows

### Governance, risk and compliance
- Auditor activity feeds and audit log analysis
- Compliance and suspicious activity reporting
- Data integrity verification and accountability reconstruction
- Security policy and incident management

### Administration
- User/role/permission administration
- Certificate lifecycle and CRL operations
- System config and backup/restore features
- Monitoring and incident response workflows

## How to run locally

### Backend
1. Create and activate a Python virtual environment in `backend/`
2. Install dependencies from `backend/requirements.txt`
3. Run `backend/run.py`

### Frontend
1. Install dependencies in `frontend/`
2. Start the React app using the configured scripts
3. Frontend proxies API traffic to backend on `http://localhost:5001`

For detailed setup flow, env variables, migration/bootstrap order, and deployment notes, read:
- `FINAL_PROJECT_REPORT.md`
- `backend/README.md`
- `frontend/README.md`

## API surface

The platform includes routes for:
- Auth/session management
- Customer operations
- Manager approval workflows
- Auditor/compliance workflows
- System admin operations
- RBAC management
- Certificate request and certificate lifecycle

Primary route modules are located under `backend/app/routes/`.

## Security documentation

- `FINAL_PROJECT_REPORT.md` (comprehensive model, controls, and flows)
- `backend/SECURITY.md` (backend security notes)
- `backend/app/security/` (enforcement and cryptographic modules)

## Testing

- Backend tests: `backend/app/tests/` and root-level backend test files
- Frontend tests: React test setup via `react-scripts test`

## Full technical dossier

A structured GitHub-ready technical breakdown is available in:
- `docs/GITHUB_PROJECT_DETAILS.md`

## License

This project currently does not declare a license file at the repository root. Add `LICENSE` before public redistribution if required.
