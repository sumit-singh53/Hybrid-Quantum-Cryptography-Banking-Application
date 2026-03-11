# Post-Quantum PKI Banking System – Frontend

This is the **React frontend** for the **Post-Quantum PKI based Hybrid Banking Security System**.

The frontend is responsible for:

- Certificate-based authentication
- Role-based dashboards
- Secure transaction workflows
- UI-level access control

This project is **implementation-first** (not theoretical).

---

## 🧱 Tech Stack

- React 18
- React Router v6
- Context API (Auth & Role)
- Axios (API communication)
- Plain CSS / Bootstrap-ready

---

## 🔐 Authentication Model

- **No username/password login**
- Users authenticate using **digital certificates (.pem / .crt)**
- Certificate is uploaded → verified by backend
- Backend returns:
  - JWT/session token
  - User identity
  - Assigned role

Roles supported:

- `customer`
- `manager`
- `auditor_clerk`

---

## 📁 Folder Structure (Important)

```text
src/
├── assets/              # Images & global styles
├── components/
│   ├── auth/            # Certificate login
│   ├── dashboard/       # Role-based dashboards
│   ├── transactions/   # Transaction flows
│   ├── certificates/   # Certificate status & view
│   └── common/          # Navbar, Sidebar, Footer
├── context/             # Auth & Role Context
├── routes/              # Protected routing
├── utils/               # Helpers & validators
├── App.jsx
└── index.js
```
