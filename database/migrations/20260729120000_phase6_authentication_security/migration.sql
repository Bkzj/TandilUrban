-- Phase 6. Run preflight.sql on a backup first. Legacy 2FA secrets cannot be
-- safely encrypted without their original format, so fail closed rather than
-- silently discarding an account's second factor.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE "twoFactorSecret" IS NOT NULL) THEN
    RAISE EXCEPTION 'PHASE6_PREFLIGHT: legacy twoFactorSecret values require a manual migration plan';
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3), ADD COLUMN "lastSuccessfulLoginAt" TIMESTAMP(3);

CREATE TABLE "AuthSessionVersion" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthSessionVersion_pkey" PRIMARY KEY ("id"), CONSTRAINT "AuthSessionVersion_version_check" CHECK ("version" >= 0)
);
CREATE UNIQUE INDEX "AuthSessionVersion_userId_key" ON "AuthSessionVersion"("userId");
ALTER TABLE "AuthSessionVersion" ADD CONSTRAINT "AuthSessionVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "AuthSessionVersion" ("id", "userId", "version", "updatedAt") SELECT gen_random_uuid()::text, id, 0, CURRENT_TIMESTAMP FROM "User";

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"), CONSTRAINT "PasswordResetToken_expiry_check" CHECK ("expiresAt" > "createdAt")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TwoFactorConfiguration" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "secretEncrypted" TEXT NOT NULL, "algorithm" TEXT NOT NULL DEFAULT 'SHA1', "digits" INTEGER NOT NULL DEFAULT 6, "periodSeconds" INTEGER NOT NULL DEFAULT 30, "enabledAt" TIMESTAMP(3), "verifiedAt" TIMESTAMP(3), "lastAcceptedTimeStep" BIGINT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TwoFactorConfiguration_pkey" PRIMARY KEY ("id"), CONSTRAINT "TwoFactorConfiguration_parameters_check" CHECK ("algorithm" = 'SHA1' AND "digits" = 6 AND "periodSeconds" = 30)
);
CREATE UNIQUE INDEX "TwoFactorConfiguration_userId_key" ON "TwoFactorConfiguration"("userId");
ALTER TABLE "TwoFactorConfiguration" ADD CONSTRAINT "TwoFactorConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TwoFactorChallenge" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0, "maxAttempts" INTEGER NOT NULL DEFAULT 5, "purpose" TEXT NOT NULL DEFAULT 'LOGIN', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwoFactorChallenge_pkey" PRIMARY KEY ("id"), CONSTRAINT "TwoFactorChallenge_attempts_check" CHECK ("attempts" >= 0 AND "maxAttempts" = 5 AND "attempts" <= "maxAttempts"), CONSTRAINT "TwoFactorChallenge_expiry_check" CHECK ("expiresAt" > "createdAt")
);
CREATE UNIQUE INDEX "TwoFactorChallenge_tokenHash_key" ON "TwoFactorChallenge"("tokenHash");
CREATE INDEX "TwoFactorChallenge_userId_expiresAt_idx" ON "TwoFactorChallenge"("userId", "expiresAt");
ALTER TABLE "TwoFactorChallenge" ADD CONSTRAINT "TwoFactorChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TwoFactorRecoveryCode" (
  "id" TEXT NOT NULL, "configurationId" TEXT NOT NULL, "codeHash" TEXT NOT NULL, "batchId" TEXT NOT NULL, "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwoFactorRecoveryCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TwoFactorRecoveryCode_codeHash_key" ON "TwoFactorRecoveryCode"("codeHash");
CREATE INDEX "TwoFactorRecoveryCode_configurationId_batchId_consumedAt_idx" ON "TwoFactorRecoveryCode"("configurationId", "batchId", "consumedAt");
ALTER TABLE "TwoFactorRecoveryCode" ADD CONSTRAINT "TwoFactorRecoveryCode_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "TwoFactorConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "SecurityEventType" AS ENUM ('REGISTRATION','VERIFICATION_REQUESTED','EMAIL_VERIFIED','LOGIN_SUCCEEDED','LOGIN_FAILED','TWO_FACTOR_CHALLENGE','TWO_FACTOR_ENABLED','RECOVERY_CODE_USED','TWO_FACTOR_DISABLED','PASSWORD_RESET_REQUESTED','PASSWORD_CHANGED','SESSIONS_INVALIDATED','ACCOUNT_DISABLED','SESSION_VERSION_INITIALIZED','SESSION_VERSION_INCREMENTED','PASSWORD_RESET_TOKEN_CREATED','PASSWORD_RESET_TOKEN_CONSUMED','PASSWORD_RESET_TOKENS_INVALIDATED','TOTP_CONFIGURATION_CREATED','TOTP_STEP_REPLAY_REJECTED','TWO_FACTOR_CHALLENGE_CREATED','TWO_FACTOR_CHALLENGE_CONSUMED','TWO_FACTOR_CHALLENGE_INVALIDATED','RECOVERY_CODE_CONSUMED','RECOVERY_CODES_REGENERATED');
CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL, "userId" TEXT, "type" "SecurityEventType" NOT NULL, "requestId" TEXT, "category" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");
CREATE INDEX "SecurityEvent_type_createdAt_idx" ON "SecurityEvent"("type", "createdAt");
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
