-- Phase 4 read-only evidence for retained legacy/reserved schema.
-- Run only against the explicitly selected database. This script changes no data.

SELECT
  COUNT(*) AS punto_interes_rows
FROM "PuntoInteres";

SELECT
  "categoria",
  COUNT(*) AS rows_per_category
FROM "PuntoInteres"
GROUP BY "categoria"
ORDER BY "categoria";

SELECT
  COUNT(*) FILTER (WHERE "twoFactorEnabled") AS users_with_2fa_enabled,
  COUNT(*) FILTER (WHERE "twoFactorSecret" IS NOT NULL) AS users_with_2fa_secret,
  COUNT(*) FILTER (
    WHERE "twoFactorEnabled" OR "twoFactorSecret" IS NOT NULL
  ) AS users_with_any_2fa_state
FROM "User";

SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS referenced_table_schema,
  ccu.table_name AS referenced_table_name,
  ccu.column_name AS referenced_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.constraint_schema = kcu.constraint_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON tc.constraint_name = ccu.constraint_name
 AND tc.constraint_schema = ccu.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (
    tc.table_name = 'PuntoInteres'
    OR ccu.table_name = 'PuntoInteres'
  )
ORDER BY tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position;

SELECT
  enumlabel AS categoria_punto_interes_value
FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'CategoriaPuntoInteres'
ORDER BY enumsortorder;
