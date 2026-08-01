-- Structural rollback only. Restore a backup to recover token lifecycle history.
DROP INDEX IF EXISTS "VerificationToken_userId_consumedAt_invalidatedAt_expiresAt_idx";
ALTER TABLE "VerificationToken"
  DROP CONSTRAINT IF EXISTS "VerificationToken_terminal_state_check",
  DROP COLUMN IF EXISTS "invalidatedAt",
  DROP COLUMN IF EXISTS "consumedAt";
