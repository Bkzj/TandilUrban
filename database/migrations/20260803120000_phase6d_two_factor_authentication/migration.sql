ALTER TABLE "TwoFactorChallenge"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TwoFactorChallenge"
  ADD CONSTRAINT "TwoFactorChallenge_session_version_check" CHECK ("sessionVersion" >= 0);

CREATE INDEX "TwoFactorChallenge_userId_sessionVersion_expiresAt_idx"
  ON "TwoFactorChallenge"("userId", "sessionVersion", "expiresAt");

ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_SETUP_STARTED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_CHALLENGE_FAILED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_CHALLENGE_COMPLETED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'RECOVERY_CODE_LOGIN_SUCCEEDED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'RECOVERY_CODE_LOGIN_FAILED';
