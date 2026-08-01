-- STRUCTURAL ONLY. Restore the pre-migration backup to recover reset-token,
-- challenge, recovery-code and security-event audit data.
DROP TABLE IF EXISTS "SecurityEvent";
DROP TYPE IF EXISTS "SecurityEventType";
DROP TABLE IF EXISTS "TwoFactorRecoveryCode";
DROP TABLE IF EXISTS "TwoFactorChallenge";
DROP TABLE IF EXISTS "TwoFactorConfiguration";
DROP TABLE IF EXISTS "PasswordResetToken";
DROP TABLE IF EXISTS "AuthSessionVersion";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastSuccessfulLoginAt", DROP COLUMN IF EXISTS "passwordChangedAt";
