# Phase 6A authentication foundation

Run `preflight.sql` against a disposable copy before `migration.sql`. It reports count-only identity/security compatibility metrics and aborts if any legacy `twoFactorSecret` is non-null. The migration repeats that guard before DDL and never prints or destroys legacy secret values.

The migration creates `AuthSessionVersion`, `PasswordResetToken`, `TwoFactorConfiguration`, `TwoFactorChallenge`, `TwoFactorRecoveryCode`, `SecurityEvent` and the closed `SecurityEventType`. It backfills version zero for existing users while preserving identity, roles, tenant relations, password hashes and verification tokens.

`rollback.sql` is structural only. It drops all Phase 6A tables, their security/audit data, the enum, and the two new timestamp columns on `User`; it preserves legacy 2FA fields. Restore the pre-migration database backup to recover security records. Schema reversal is not data restoration and cannot recover secrets.
