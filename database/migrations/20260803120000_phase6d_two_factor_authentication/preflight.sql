SELECT count(*) AS challenges,
       count(*) FILTER (WHERE "consumedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP) AS pending_challenges
FROM "TwoFactorChallenge";

SELECT count(*) AS active_totp_configurations
FROM "TwoFactorConfiguration"
WHERE "enabledAt" IS NOT NULL AND "verifiedAt" IS NOT NULL;

SELECT count(*) AS plaintext_legacy_secrets
FROM "User"
WHERE "twoFactorSecret" IS NOT NULL;

DO $$
DECLARE legacy_count bigint;
BEGIN
  SELECT count(*) INTO legacy_count FROM "User" WHERE "twoFactorSecret" IS NOT NULL;
  IF legacy_count > 0 THEN
    RAISE EXCEPTION 'PHASE6D_PREFLIGHT: legacy two-factor secrets: % row(s)', legacy_count;
  END IF;
END $$;
