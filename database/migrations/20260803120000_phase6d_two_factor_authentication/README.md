# Phase 6D two-factor authentication

Adds the session-version snapshot required to bind each login challenge to the account security state, plus closed audit-event values for setup and second-factor completion/failure.

Run `preflight.sql` before the migration. It reports counts only and aborts if a legacy plaintext `User.twoFactorSecret` exists; values are never printed. Existing pending challenges receive version `0` and are expected to expire naturally or be invalidated before rollout.

`rollback.sql` is structural and is safe only before Phase 6D events exist. Once 2FA is used, database backup restoration is authoritative; rollback cannot restore destroyed TOTP secrets or recovery codes.
