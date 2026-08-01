-- Phase 6B adds explicit one-time state without rewriting legacy token values.
ALTER TABLE "VerificationToken"
  ADD COLUMN "consumedAt" TIMESTAMP(3),
  ADD COLUMN "invalidatedAt" TIMESTAMP(3);

ALTER TABLE "VerificationToken"
  ADD CONSTRAINT "VerificationToken_terminal_state_check"
  CHECK (NOT ("consumedAt" IS NOT NULL AND "invalidatedAt" IS NOT NULL));

CREATE INDEX "VerificationToken_userId_consumedAt_invalidatedAt_expiresAt_idx"
  ON "VerificationToken"("userId", "consumedAt", "invalidatedAt", "expiresAt");
