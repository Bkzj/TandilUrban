CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionHash" CHAR(64) NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "browser" VARCHAR(32) NOT NULL,
  "operatingSystem" VARCHAR(32) NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedReason" VARCHAR(32),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthSession_session_version_check" CHECK ("sessionVersion" >= 0),
  CONSTRAINT "AuthSession_expiry_check" CHECK ("expiresAt" > "issuedAt"),
  CONSTRAINT "AuthSession_seen_check" CHECK ("lastSeenAt" >= "issuedAt"),
  CONSTRAINT "AuthSession_revocation_check" CHECK (
    ("revokedAt" IS NULL AND "revokedReason" IS NULL) OR
    ("revokedAt" IS NOT NULL AND "revokedReason" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "AuthSession_sessionHash_key" ON "AuthSession"("sessionHash");
CREATE INDEX "AuthSession_userId_revokedAt_expiresAt_lastSeenAt_idx"
  ON "AuthSession"("userId", "revokedAt", "expiresAt", "lastSeenAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'SESSION_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'SESSION_REVOKED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'OTHER_SESSIONS_REVOKED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'ALL_SESSIONS_REVOKED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'SESSION_EXPIRED';
