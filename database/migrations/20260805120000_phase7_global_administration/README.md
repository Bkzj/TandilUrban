# Phase 7 — global administration

Adds the hash-only account invitation registry and privacy-safe actor/target identifiers for administrative security events. `ADMIN` remains the existing global role; no email-based permission rule is introduced.

Run `preflight.sql` before `migration.sql`. It reports counts only and aborts for plaintext legacy 2FA secrets, duplicate normalized emails, or orphan agents. It never prints secrets.

The rollback is structural and is allowed only before invitations or Phase 7 events exist. Once used, a pre-migration database backup is the authoritative rollback because dropping the invitation registry or audit events is data loss.
