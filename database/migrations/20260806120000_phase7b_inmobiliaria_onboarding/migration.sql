CREATE TYPE "AccountInvitationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'ACCOUNT_INVITATION_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'ACCOUNT_INVITATION_SENT';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'ACCOUNT_INVITATION_RESENT';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'ACCOUNT_INVITATION_SEND_FAILED';

ALTER TABLE "AccountInvitation"
  ADD COLUMN "deliveryStatus" "AccountInvitationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "lastDeliveryAttemptAt" TIMESTAMP(3),
  ADD COLUMN "sentAt" TIMESTAMP(3);

ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_delivery_check" CHECK (
  ("deliveryStatus" = 'PENDING' AND "sentAt" IS NULL)
  OR ("deliveryStatus" = 'FAILED' AND "lastDeliveryAttemptAt" IS NOT NULL AND "sentAt" IS NULL)
  OR ("deliveryStatus" = 'SENT' AND "lastDeliveryAttemptAt" IS NOT NULL AND "sentAt" IS NOT NULL)
);
