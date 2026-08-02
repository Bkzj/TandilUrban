-- Read-only Phase 6C preflight. It never prints hashes, passwords or tokens.
SELECT
  count(*) AS reset_tokens,
  count(*) FILTER (WHERE "consumedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP) AS pending_tokens,
  count(*) FILTER (WHERE "consumedAt" IS NOT NULL) AS terminal_tokens,
  count(*) FILTER (WHERE "expiresAt" <= CURRENT_TIMESTAMP) AS expired_tokens
FROM "PasswordResetToken";

SELECT count(*) AS users_without_session_version
FROM "User" account
LEFT JOIN "AuthSessionVersion" version ON version."userId" = account.id
WHERE version.id IS NULL;

SELECT count(*) AS orphan_reset_tokens
FROM "PasswordResetToken" reset
LEFT JOIN "User" account ON account.id = reset."userId"
WHERE account.id IS NULL;

DO $$
DECLARE
  malformed_hashes bigint;
BEGIN
  SELECT count(*) INTO malformed_hashes
  FROM "PasswordResetToken"
  WHERE "tokenHash" !~ '^[a-f0-9]{64}$';

  IF malformed_hashes > 0 THEN
    RAISE EXCEPTION 'PHASE6C_PREFLIGHT: malformed reset token hashes: % row(s)', malformed_hashes;
  END IF;
END $$;
