# Phase 7B inmobiliaria onboarding

Adds explicit delivery state to hash-only account invitations and the audit events
required for creation, delivery, resend and provider failure. Existing invitations
start as `PENDING` because historical provider delivery cannot be inferred safely.

Run `preflight.sql` before `migration.sql`. The structural rollback removes delivery
columns only when no Phase 7B events exist; restoring the database backup is the
authoritative rollback after real onboarding activity.
