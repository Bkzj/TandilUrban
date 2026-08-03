DO $$
DECLARE
  invalid_invitation_count BIGINT;
BEGIN
  SELECT count(*) INTO invalid_invitation_count
  FROM "AccountInvitation"
  WHERE "expiresAt" <= "createdAt"
     OR ("consumedAt" IS NOT NULL AND "invalidatedAt" IS NOT NULL);

  RAISE NOTICE 'Phase 7B preflight: invitations=%', (SELECT count(*) FROM "AccountInvitation");
  RAISE NOTICE 'Phase 7B preflight: pending invitations=%', (
    SELECT count(*) FROM "AccountInvitation"
    WHERE "consumedAt" IS NULL AND "invalidatedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP
  );
  RAISE NOTICE 'Phase 7B preflight: invalid invitation rows=%', invalid_invitation_count;

  IF invalid_invitation_count > 0 THEN
    RAISE EXCEPTION 'Phase 7B preflight failed: % incompatible invitation rows', invalid_invitation_count;
  END IF;
END $$;
