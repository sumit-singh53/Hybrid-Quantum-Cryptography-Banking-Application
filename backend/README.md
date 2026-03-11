# Post-Quantum PKI Banking System – Backend

This is the **Flask backend** for the Post-Quantum PKI based Hybrid Banking Security System.

The backend handles:

- Certificate-based authentication
- Role-based access control
- Hybrid cryptography (Classical + Post-Quantum)
- Secure transaction processing
- Audit logging

---

## 🧱 Tech Stack

- Python 3.9+
- Flask
- Flask-SQLAlchemy
- MySQL
- PyTest


---

## 🔐 Golden Rule Security Layers

Every certificate now carries an explicit `security_layers` claim that enumerates seven controls (hybrid signatures, immutable SHA3 hash, device binding, purpose locking, CRL pinning, lineage tracking, and nonce-bound challenge response). The full attack vs. defense mapping, along with the step-by-step login handshake, lives in [SECURITY.md](SECURITY.md).

---

## 🧬 ML-KEM Usage Policy

- The platform uses **ML-KEM-512 (Kyber)** strictly for post-quantum key exchange and encrypting sensitive payloads (certificate delivery bundles, session bootstrap secrets).
- **Authentication never depends on Kyber crystals or ciphertexts.** All protected APIs re-validate the certificate chain, CRL status, and device-secret binding on every request.
- Device secrets remain the only factor required to unlock certificates or QR code sessions, keeping ML-KEM isolated to data protection rather than identity proofing.

---
## 🔥 Feature 7 — Cryptographic Accountability
Each successful certificate login now emits a **signed intent** that captures the certificate hash, lineage, declared authority, the precise UTC timestamp, and the origin IP/location headers. These events are chained inside `instance/accountability_log.json` and can be reconstructed through the auditor-clerk-only endpoint `POST /api/audit/accountability-report`, which returns:

- The certificate metadata (lineage, defense version, allowed actions, issuance window)
- The original timestamp + location of the first observed intent
- The signed intent chain (hash commitments per action)
- Linked `AuditLog` entries to show what the holder executed under which authority

This provides the “Exactly which key, for which intent, under which authority did misuse happen?” answer trail once an incident is declared.

---

## 📁 Project Structure

```text
backend/
├── app/
│   ├── config/        # App & DB configuration
│   ├── models/        # SQLAlchemy models
│   ├── routes/        # API endpoints
│   ├── services/      # Core logic & crypto
│   ├── security/      # Access control & verification
│   ├── utils/         # Validators, logger, responses
│   └── tests/         # Unit tests
├── run.py             # App entry
├── requirements.txt
└── README.md
```

use this for linux environment
cd ~/Hybrid-Quantum-Cryptography-Banking-Application
pwd

You MUST see:
/home/rohit/Hybrid-Quantum-Cryptography-Banking-Application

python3 -m venv .venv
source .venv/bin/activate
