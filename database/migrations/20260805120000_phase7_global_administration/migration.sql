ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'GLOBAL_ADMIN_PROMOTED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'INMOBILIARIA_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'INMOBILIARIA_ADMIN_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'AGENT_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'ACCOUNT_ACTIVATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'ACCOUNT_DEACTIVATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'ROLE_CHANGED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'TENANT_ASSIGNMENT_CHANGED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'ACCOUNT_INVITATION_ACCEPTED';

ALTER TABLE "SecurityEvent"
  ADD COLUMN "actorUserId" TEXT,
  ADD COLUMN "targetUserId" TEXT,
  ADD COLUMN "targetInmobiliariaId" TEXT;

CREATE INDEX "SecurityEvent_actorUserId_createdAt_idx" ON "SecurityEvent"("actorUserId", "createdAt");
CREATE INDEX "SecurityEvent_targetUserId_createdAt_idx" ON "SecurityEvent"("targetUserId", "createdAt");
CREATE INDEX "SecurityEvent_targetInmobiliariaId_createdAt_idx" ON "SecurityEvent"("targetInmobiliariaId", "createdAt");

CREATE TABLE "AccountInvitation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "inmobiliariaId" TEXT NOT NULL,
  "intendedRole" "RolUsuario" NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountInvitation_expiry_check" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "AccountInvitation_state_check" CHECK (NOT ("consumedAt" IS NOT NULL AND "invalidatedAt" IS NOT NULL)),
  CONSTRAINT "AccountInvitation_role_check" CHECK ("intendedRole" IN ('INMOBILIARIA'::"RolUsuario", 'AGENTE'::"RolUsuario"))
);

CREATE UNIQUE INDEX "AccountInvitation_tokenHash_key" ON "AccountInvitation"("tokenHash");
CREATE INDEX "AccountInvitation_userId_consumedAt_invalidatedAt_expiresAt_idx"
  ON "AccountInvitation"("userId", "consumedAt", "invalidatedAt", "expiresAt");
CREATE INDEX "AccountInvitation_inmobiliariaId_intendedRole_createdAt_idx"
  ON "AccountInvitation"("inmobiliariaId", "intendedRole", "createdAt");

ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_inmobiliariaId_fkey"
  FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
