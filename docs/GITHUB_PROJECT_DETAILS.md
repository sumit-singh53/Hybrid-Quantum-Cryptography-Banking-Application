# GitHub Project Details — Hybrid Quantum Cryptography Banking Application

This document is a GitHub-facing technical dossier that explains the project in implementation terms for reviewers, collaborators, and evaluators.

## 1) Project profile

- **Domain**: FinTech security platform
- **Type**: Full-stack web application
- **Core goal**: Deliver banking workflows with quantum-resilient cryptographic protections
- **Security posture**: Hybrid model (classical + post-quantum) with certificate-first identity

## 2) Technology stack

### Backend
- Python 3.9+
- Flask
- Flask-SQLAlchemy
- Flask-CORS
- flask-jwt-extended
- cryptography
- pqcrypto
- pytest

### Frontend
- React
- react-router-dom
- Axios
- Chart.js + react-chartjs-2
- Tailwind CSS
- js-sha3
- @yudiel/react-qr-scanner

### Data and persistence
- SQLite runtime store for development
- MySQL-compatible dependency path via PyMySQL for production-oriented deployments
- JSON event/audit stores for high-frequency operational logs

## 3) Codebase organization

### Repository tree (high-level)

```text
Hybrid-Quantum-Cryptography-Banking-Application/
├── README.md
├── FINAL_PROJECT_REPORT.md
├── backend/
│   ├── app/
│   │   ├── config/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── security/
│   │   └── tests/
│   ├── scripts/
│   ├── certificates/
│   └── instance/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       ├── routes/
│       ├── services/
│       └── utils/
├── certificates/
└── docs/
```

### Backend (`backend/`)
- `app/config/` — app and DB config
- `app/models/` — SQLAlchemy models
- `app/routes/` — route blueprints
- `app/services/` — business logic and crypto orchestration
- `app/security/` — PKI, challenge, CRL, RBAC, accountability controls
- `app/tests/` — backend tests

Main app wiring is in `backend/app/main.py` where blueprints are registered and RBAC/CA initialization is triggered.

### Frontend (`frontend/`)
- `src/components/` — reusable UI components
- `src/pages/` — role-based views and dashboards
- `src/context/` — auth/toast contexts
- `src/routes/` — route definitions and guarded access
- `src/services/` — API service layer
- `src/utils/` — helpers like keystore and navigation utilities

## 4) Security model highlights

### Hybrid cryptography
- Classical primitives (RSA, SHA3 family, AES-GCM)
- Post-quantum primitives (Dilithium, ML-KEM/Kyber)
- Dual-verification approach for certificate trust decisions

### Certificate-first authentication
- Challenge-response login using certificate + device secret
- Nonce-bound proof verification on the server
- Session token issuance only after certificate and device proof validation

### Defense-in-depth controls
- Device binding
- Certificate hash immutability checks
- CRL and lineage validation
- Purpose/action locking
- Validity window checks
- Accountability logs for forensic timelines

## 5) Role and permission architecture (RBAC)

Supported roles include:
- `customer`
- `manager`
- `auditor_clerk`
- `admin` (system administrator)

Permission model follows `resource:action`, enforced in backend middleware/services and reflected in frontend navigation/route gating.

## 6) Functional areas

### Customer
- Profile and account overview
- Beneficiary management
- Transaction creation and history
- Security center and certificate requests

### Manager
- Transaction approvals and rejections
- Account monitoring and KYC flows
- Risk and branch-level operational analytics

### Auditor Clerk
- Audit trails and user activity inspection
- Compliance reporting and suspicious activity reporting
- Data integrity verification and accountability reconstruction

### System Admin
- User/role/permission management
- Certificate issuance/revocation lifecycle
- Security policy and incident response management
- Monitoring, configuration, backup/recovery

## 7) API organization

Backend route modules include auth, customer, manager, auditor, admin, RBAC, audit, beneficiary, certificate, backup, and system configuration modules under `backend/app/routes/`.

## 8) Data entities (high-level)

Core entities include:
- Users
- Customers
- Transactions
- Certificates
- Roles / Permissions / Role-Permission map
- Audit logs
- Beneficiaries
- Security policy and system config entities
- Backup metadata

## 9) Operational files and runtime stores

Examples under `backend/instance/`:
- `accountability_log.json`
- `security_events.json`
- `request_audit_log.json`
- `transfer_audit_log.json`
- `device_bindings.json`
- local DB runtime file(s)

These are operational data stores and should be handled carefully in production release workflows.

## 10) Running and deployment notes

Use module-level READMEs plus final report for exact setup and bootstrap sequencing:
- `backend/README.md`
- `frontend/README.md`
- `FINAL_PROJECT_REPORT.md`

Recommended production hardening includes:
- Strict secret management
- TLS termination best practices
- Rate limiting and monitored auth attempts
- MySQL/PostgreSQL production-grade database setup
- Structured backup and incident playbooks

## 11) Review and documentation pointers

For full deep-dive details (architecture diagrams, endpoint catalogs, security framework, schema references), use:
- `FINAL_PROJECT_REPORT.md`

This file acts as a GitHub landing companion, while the final report remains the complete technical source of truth.
