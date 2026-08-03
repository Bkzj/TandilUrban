DO $$
DECLARE
  legacy_secret_count BIGINT;
  duplicate_normalized_email_count BIGINT;
  orphan_agent_count BIGINT;
BEGIN
  SELECT count(*) INTO legacy_secret_count
  FROM "User"
  WHERE "twoFactorSecret" IS NOT NULL AND btrim("twoFactorSecret") <> '';

  SELECT count(*) INTO duplicate_normalized_email_count
  FROM (
    SELECT lower(btrim(email)) FROM "User" GROUP BY lower(btrim(email)) HAVING count(*) > 1
  ) duplicates;

  SELECT count(*) INTO orphan_agent_count
  FROM "User" u
  LEFT JOIN "Inmobiliaria" i ON i.id = u."agenciaId"
  WHERE u.rol = 'AGENTE' AND (u."agenciaId" IS NULL OR i.id IS NULL);

  RAISE NOTICE 'Phase 7 preflight: users=%, global_admins=%, inmobiliarias=%, agents=%, legacy_2fa_secrets=%, duplicate_normalized_emails=%, orphan_agents=%',
    (SELECT count(*) FROM "User"),
    (SELECT count(*) FROM "User" WHERE rol = 'ADMIN'),
    (SELECT count(*) FROM "Inmobiliaria"),
    (SELECT count(*) FROM "User" WHERE rol = 'AGENTE'),
    legacy_secret_count,
    duplicate_normalized_email_count,
    orphan_agent_count;

  IF legacy_secret_count > 0 THEN
    RAISE EXCEPTION 'PHASE7_PREFLIGHT: legacy two-factor secrets: % row(s); no values shown', legacy_secret_count;
  END IF;
  IF duplicate_normalized_email_count > 0 THEN
    RAISE EXCEPTION 'PHASE7_PREFLIGHT: duplicate normalized emails: % group(s)', duplicate_normalized_email_count;
  END IF;
  IF orphan_agent_count > 0 THEN
    RAISE EXCEPTION 'PHASE7_PREFLIGHT: agents without a valid tenant: % row(s)', orphan_agent_count;
  END IF;
END $$;
