# Dataset / Data for this Project (Hybrid-Quantum-Cryptography-Banking-Application)

## TL;DR (Simple)
Is project ke liye **koi external/public “dataset” mandatory nahi hai**.
Ye ek banking application hai—iska “dataset” actual **application data** hota hai (users, roles, transactions, certificates, audit logs), jo app khud generate/store karta hai.

Aapko data yahan milega:
- **SQLite database**: `backend/instance/pq_banking.db`
- **Audit + security JSON logs**: `backend/instance/*.json`
- **Certificates (PEM files)**: `backend/certificates/**` aur project-root `certificates/**`

---

## 1) Project me kaun sa data use hota hai?

### A) Relational data (Database)
Backend Flask app **SQLite** use karta hai (default). Isme mainly ye tables/models store hote hain:
- `users` (username, full_name, email, role_id, is_active)
- `roles`
- `transactions` (customer transfers / approvals etc.)
- `certificates` (issued cert metadata)
- aur baaki domain models (`customer`, `audit_log`, etc.)

**Default DB path**:
- `backend/app/config/config.py` ke according DB yahan banta hai:
  - `backend/instance/pq_banking.db`

> Agar `DATABASE_URL` env var set ho to DB location change ho sakti hai.

### B) Security & audit datasets (JSON logs)
Application ke security/audit events JSON files me store hote hain:
- `backend/instance/accountability_log.json`
- `backend/instance/device_bindings.json`
- `backend/instance/request_audit_log.json`
- `backend/instance/security_events.json`
- `backend/instance/transfer_audit_log.json`

Ye files “dataset” ki tarah behave karti hain for:
- compliance/audit reports
- security monitoring
- who-did-what tracing

### C) Certificates dataset (filesystem)
Certificates PEM format me filesystem par store hote hain:
- `backend/certificates/ca/` (CA material)
- `backend/certificates/users/` (issued user certs)
- project-root `certificates/` bhi exist karta hai (some flows may write/read here depending on configuration)

Certificates ke andar fields hoti hain (text form `key=value`), jaise:
- `certificate_id`, `user_id`, `owner`, `role`, `allowed_actions`, `issued_at`, `valid_to`, etc.

---

## 2) Ye dataset aapko “kahan se milega”?

### Option 1 (Recommended): App run karke khud generate karo
Sabse real aur correct dataset yahi hai:
1. Backend run karo
2. Users create/register karo
3. Transactions create/approve/reject karo
4. Admin se certificates issue/revoke karo

Isse:
- DB populate hota hai (`pq_banking.db`)
- audit/security logs fill hote hain (`backend/instance/*.json`)
- certificates generate hote hain (`certificates/**`)

### Option 2: Bootstrap scripts se seeded demo data
Repo me scripts hain jo local setup ke liye certificates mint karte hain:
- `backend/scripts/bootstrap_system_admin.py`
- `backend/scripts/bootstrap_manager.py`
- `backend/scripts/bootstrap_auditor_clerk.py`

Ye scripts dev/demo ke liye starting credentials/cert artifacts generate karte hain.

### Option 3 (Optional): External public datasets (sirf research/ML/demo ke liye)
Agar aap fraud detection / analytics / reporting demo banana chahte ho, to aap **public financial datasets** use kar sakte ho (optional):
- Credit card fraud datasets (Kaggle)
- Bank marketing / loan default datasets (UCI / Kaggle)

Important:
- Ye project ka core flow external dataset par depend nahi karta.
- External dataset use karoge to aapko mapping/ETL likhni padegi (CSV → DB tables).

---

## 3) Dataset ko export/import kaise karein? (Practical)

### A) SQLite DB export
- File location: `backend/instance/pq_banking.db`
- Aap isko copy karke share/backup kar sakte ho.

### B) Logs export
- Folder: `backend/instance/`
- JSON files ko directly copy karke dataset ki tarah use kar sakte ho.

### C) Certificates export
- Folder: `backend/certificates/` (and/or root `certificates/`)
- PEM files ko zip karke share kar sakte ho.

---

## 4) Recommended “dataset strategy” for your report/demo

Agar aapko report/research paper ke liye dataset chahiye:
1. **Synthetic + audit dataset** best rahega:
   - 20–50 users create karo
   - 200–500 transactions generate karo
   - approvals/rejections mix karo
   - certificates issue/revoke events add karo
2. Phir export:
   - `pq_banking.db`
   - `backend/instance/*.json`
   - relevant `certificates/**/*.pem`

Isse aapke paas end-to-end dataset aa jayega that matches your exact implementation.
