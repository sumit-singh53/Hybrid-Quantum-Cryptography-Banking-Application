# Golden Rule Security Matrix

The hybrid PKI stack now embeds seven explicit protection layers into every issued certificate. The metadata fields `security_layers`, `defense_version`, and `purpose_scope` act as attestation claims that are re-validated during certificate verification and during the runtime challenge-response flow.

| #   | Attack Vector                                               | Defense Layer                                                                    | How It Is Enforced                                                                                                                                       |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Copying a certificate to a rogue machine                    | Device binding (`device_id`) + challenge proof (`SHA3-256(device_secret+nonce)`) | Device secret is stored server-side, derived into `device_id`, and must satisfy a fresh nonce challenge before a session token is minted.                |
| 2   | Editing certificate fields (role, validity, keys)           | Immutable SHA3-256 hash (`cert_hash`)                                            | The backend recomputes the canonical hash over every field, making tampering immediately obvious before signature verification begins.                   |
| 3   | Forging CA signatures or relying solely on classical crypto | Hybrid RSA-3072 + Dilithium-3 signatures                                         | Both signatures must verify. Failure to satisfy either signature invalidates the certificate, blocking single-stack attacks.                             |
| 4   | Using revoked or superseded certificates                    | CRL tracking (`crl_url`) + lineage IDs                                           | Each certificate stores the CRL pointer and lineage, and the verifier checks the JSON revocation set plus generation numbers to reject stale material.   |
| 5   | Escalating privileges by modifying intended use             | Purpose locking (`purpose_scope`) + `allowed_actions` diffing                    | The verifier recomputes the action set for the declared role and aborts on any mismatch, preventing privilege inflation even if other fields are intact. |
| 6   | Replaying old certificates after expiry                     | Tight validity windows (`valid_from`/`valid_to`)                                 | Verification enforces UTC windows trimmed to the second, so out-of-window material cannot pass even with valid signatures.                               |
| 7   | Quenching incident response visibility                      | Lineage fingerprint (`parent_ca_fp:cert_generation`)                             | Every issuance increments the generation counter and fingerprints the issuing CA, exposing cloning attempts and enabling forensic traceability.          |

## Challenge-Response Login Flow

1. **Certificate + device secret upload** → `/api/auth/certificate-challenge`
   - Backend verifies the certificate, replays device binding checks, and returns a nonce plus a short-lived `challenge_token`.
2. **Device proof computation** → client derives `sha3_256(secret || nonce)`.
3. **Finalize login** → `/api/auth/certificate-login` receives `{ challenge_token, device_proof }` and issues the role session only if the proof matches the stored secret.

This flow guarantees that even if an adversary steals the `.pem`, they cannot satisfy the challenge without the paired device secret and hardware-bound secret state.

## Feature 7 – Cryptographic Accountability

- **Signed Intents:** Every successful certificate login produces a SHA3-256 commitment over `(cert_hash || intent || timestamp)`. The event captures the device lineage, declared role, and the caller's origin IP / geo headers so that the “original timestamp and location” stay immutable.
- **Audit Chain:** The signed intent entries are persisted to `instance/accountability_log.json` and stitched together with the relational `audit_logs` table. This allows responders to overlay the cryptographic proof with business-level audit events.
- **Certificate Lineage:** Reconstruction reports embed the certificate's `lineage_id`, `defense_version`, and `security_layers`, proving which CA generation signed the key that participated in the misuse.

Auditor clerks call `POST /api/audit/accountability-report` with either a `certificate_id` or `user_id` to retrieve a full reconstruction bundle containing the certificate metadata, original intent timestamp/location, the signed intent chain, and all associated audit-log entries.
