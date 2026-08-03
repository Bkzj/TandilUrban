SELECT count(*) AS users,
       count(*) FILTER (WHERE activo) AS active_users,
       count(*) FILTER (WHERE NOT activo) AS inactive_users
FROM "User";

SELECT count(*) AS session_versions,
       count(*) FILTER (WHERE version < 0) AS invalid_session_versions
FROM "AuthSessionVersion";

SELECT count(*) AS legacy_plaintext_two_factor_secrets
FROM "User"
WHERE "twoFactorSecret" IS NOT NULL;

DO $$
DECLARE invalid_versions bigint;
DECLARE legacy_secrets bigint;
BEGIN
  SELECT count(*) INTO invalid_versions FROM "AuthSessionVersion" WHERE version < 0;
  SELECT count(*) INTO legacy_secrets FROM "User" WHERE "twoFactorSecret" IS NOT NULL;
  IF invalid_versions > 0 THEN
    RAISE EXCEPTION 'PHASE6E_PREFLIGHT: invalid session versions: % row(s)', invalid_versions;
  END IF;
  IF legacy_secrets > 0 THEN
    RAISE EXCEPTION 'PHASE6E_PREFLIGHT: legacy two-factor secrets: % row(s)', legacy_secrets;
  END IF;
END $$;
