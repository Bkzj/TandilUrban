# Phase 6E session management

Adds a hash-only server-side session registry. Existing JWTs do not contain a Phase 6E session identifier and therefore fail closed after rollout; users must authenticate again. No user, role, tenant, password, TOTP, recovery-code or session-version data is rewritten.

Run `preflight.sql` before applying the migration. It reports counts only and aborts for invalid session versions or legacy plaintext 2FA secrets without printing sensitive values.

`rollback.sql` is structural and deliberately refuses after any Phase 6E session/event exists. A pre-migration backup is authoritative once the feature has been used; dropping the table is not session-history restoration.
