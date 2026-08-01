-- Read-only Phase 6 preflight. Never print token or secret values.
SELECT
  count(*) AS users,
  count(*) FILTER (WHERE "emailVerifiedAt" IS NOT NULL) AS verified_users,
  count(*) FILTER (WHERE "emailVerifiedAt" IS NULL) AS unverified_users,
  count(*) FILTER (WHERE activo) AS active_users,
  count(*) FILTER (WHERE NOT activo) AS inactive_users,
  count(*) FILTER (WHERE "twoFactorEnabled" OR "twoFactorSecret" IS NOT NULL) AS legacy_two_factor_users,
  count(*) FILTER (WHERE "passwordHash" IS NULL OR "passwordHash" !~ E'^\\$2[aby]\\$') AS malformed_password_hashes
FROM "User";

SELECT lower(trim(email)) AS normalized_email, count(*)
FROM "User" GROUP BY lower(trim(email)) HAVING count(*) > 1;

SELECT count(*) AS orphan_verification_tokens
FROM "VerificationToken" t LEFT JOIN "User" u ON u.id = t."userId"
WHERE t."userId" IS NOT NULL AND u.id IS NULL;

SELECT count(*) AS legacy_two_factor_secrets_present FROM "User" WHERE "twoFactorSecret" IS NOT NULL;

DO $$
DECLARE affected bigint;
BEGIN
  SELECT count(*) INTO affected FROM "User" WHERE "twoFactorSecret" IS NOT NULL;
  IF affected > 0 THEN
    RAISE EXCEPTION 'PHASE6_PREFLIGHT: % user(s) contain legacy two-factor secrets', affected;
  END IF;
END $$;
