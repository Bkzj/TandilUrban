-- DESTRUCTIVE ROLLBACK NOTES:
-- 1. Take a PostgreSQL backup before running this file.
-- 2. Numeric values are converted back to double precision and can lose decimal exactness.
-- 3. Measured events are removed, but their counts are folded into Propiedad.visitas
--    together with legacyVisitCount so aggregate history is not silently discarded.
-- 4. Contact and physical-visit idempotency keys are removed.

UPDATE "Propiedad"
SET "visitas" = "visitas" + "legacyVisitCount";

DROP TABLE IF EXISTS "PropiedadVista";

DROP INDEX IF EXISTS "VisitaFisicaEvento_idempotencyKey_key";
DROP INDEX IF EXISTS "Contacto_idempotencyKey_key";
DROP INDEX IF EXISTS "Contacto_propiedadId_origen_createdAt_idx";

ALTER TABLE "VisitaFisicaEvento"
  DROP CONSTRAINT IF EXISTS "VisitaFisicaEvento_delta_check",
  DROP COLUMN IF EXISTS "idempotencyKey";
ALTER TABLE "Contacto"
  DROP CONSTRAINT IF EXISTS "Contacto_visitas_fisicas_nonnegative_check",
  DROP COLUMN IF EXISTS "idempotencyKey",
  DROP COLUMN IF EXISTS "origen";
ALTER TABLE "Propiedad"
  DROP CONSTRAINT IF EXISTS "Propiedad_precio_nonnegative_check",
  DROP CONSTRAINT IF EXISTS "Propiedad_expensas_nonnegative_check",
  DROP CONSTRAINT IF EXISTS "Propiedad_visitas_nonnegative_check",
  DROP CONSTRAINT IF EXISTS "Propiedad_legacy_visitas_nonnegative_check",
  DROP CONSTRAINT IF EXISTS "Propiedad_consultas_nonnegative_check",
  DROP COLUMN IF EXISTS "legacyVisitCount";

ALTER TABLE "Propiedad"
  ALTER COLUMN "precio" TYPE DOUBLE PRECISION USING "precio"::double precision,
  ALTER COLUMN "expensas" TYPE DOUBLE PRECISION USING "expensas"::double precision,
  ALTER COLUMN "moneda" DROP DEFAULT,
  ALTER COLUMN "moneda" TYPE TEXT USING "moneda"::text,
  ALTER COLUMN "moneda" SET DEFAULT 'USD';

DROP TYPE "Moneda";
DROP TYPE "OrigenContacto";
