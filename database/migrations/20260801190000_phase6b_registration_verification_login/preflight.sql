-- Read-only Phase 6B preflight. Never prints token or password values.
SELECT
  count(*) AS verification_tokens,
  count(*) FILTER (WHERE token ~ '^[a-f0-9]{64}$') AS hashed_tokens,
  count(*) FILTER (WHERE token !~ '^[a-f0-9]{64}$') AS legacy_tokens,
  count(*) FILTER (WHERE "expiresAt" <= CURRENT_TIMESTAMP) AS expired_tokens
FROM "VerificationToken";

SELECT count(*) AS duplicate_normalized_emails
FROM (
  SELECT lower(trim(email))
  FROM "User"
  GROUP BY lower(trim(email))
  HAVING count(*) > 1
) duplicates;

SELECT count(*) AS orphan_verification_tokens
FROM "VerificationToken" token
LEFT JOIN "User" account ON account.id = token."userId"
WHERE token."userId" IS NOT NULL AND account.id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "VerificationToken" WHERE "expiresAt" <= "createdAt") THEN
    RAISE EXCEPTION 'PHASE6B_PREFLIGHT: verification token expiration invariant is violated';
  END IF;
END $$;
