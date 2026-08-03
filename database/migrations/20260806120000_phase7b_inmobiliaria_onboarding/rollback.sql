DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "SecurityEvent"
    WHERE "type"::text IN ('ACCOUNT_INVITATION_CREATED','ACCOUNT_INVITATION_SENT','ACCOUNT_INVITATION_RESENT','ACCOUNT_INVITATION_SEND_FAILED')
  ) THEN
    RAISE EXCEPTION 'Phase 7B rollback refused: restore a pre-migration backup to preserve invitation delivery history';
  END IF;
END $$;

ALTER TABLE "AccountInvitation" DROP CONSTRAINT IF EXISTS "AccountInvitation_delivery_check";
ALTER TABLE "AccountInvitation"
  DROP COLUMN IF EXISTS "deliveryStatus",
  DROP COLUMN IF EXISTS "lastDeliveryAttemptAt",
  DROP COLUMN IF EXISTS "sentAt";
DROP TYPE IF EXISTS "AccountInvitationDeliveryStatus";

-- PostgreSQL cannot remove enum labels in place. A database backup is authoritative
-- for restoring the pre-7B SecurityEventType definition without losing audit data.
