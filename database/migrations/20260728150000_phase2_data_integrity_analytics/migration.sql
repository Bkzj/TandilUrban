-- Phase 2 preflight: abort instead of silently rounding or normalizing unknown data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Propiedad"
    WHERE CASE
      WHEN "precio"::text IN ('NaN', 'Infinity', '-Infinity') THEN true
      ELSE "precio" < 0
        OR "precio" > 9999999999999999.99
        OR round("precio"::numeric, 2) <> "precio"::numeric
    END
       OR (
         "expensas" IS NOT NULL
         AND CASE
           WHEN "expensas"::text IN ('NaN', 'Infinity', '-Infinity') THEN true
           ELSE "expensas" < 0
             OR "expensas" > 9999999999999999.99
             OR round("expensas"::numeric, 2) <> "expensas"::numeric
         END
       )
  ) THEN
    RAISE EXCEPTION 'Phase 2 monetary preflight failed: non-finite, negative, out-of-range or >2-decimal values exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Propiedad"
    WHERE upper(trim("moneda")) NOT IN ('ARS', 'USD')
  ) THEN
    RAISE EXCEPTION 'Phase 2 currency preflight failed: unsupported currency values exist';
  END IF;
END $$;

CREATE TYPE "Moneda" AS ENUM ('ARS', 'USD');
CREATE TYPE "OrigenContacto" AS ENUM ('PUBLICO', 'PANEL_MANUAL');

-- Clean-replay repair for baseline fields that existed in the application/deployed schema
-- but were absent from the published historical SQL chain. Deployed databases are unchanged.
ALTER TABLE "Propiedad"
  ADD COLUMN IF NOT EXISTS "agenteId" TEXT,
  ADD COLUMN IF NOT EXISTS "banos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cocheras" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dormitorios" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "esExclusiva" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Propiedad'
      AND column_name = 'imagenes'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE "Propiedad"
      ALTER COLUMN "imagenes" DROP DEFAULT,
      ALTER COLUMN "imagenes" TYPE JSONB USING to_jsonb("imagenes"),
      ALTER COLUMN "imagenes" SET DEFAULT '[]'::jsonb,
      ALTER COLUMN "imagenes" SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Propiedad_agenteId_idx" ON "Propiedad"("agenteId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Propiedad_agenteId_fkey'
  ) THEN
    ALTER TABLE "Propiedad"
      ADD CONSTRAINT "Propiedad_agenteId_fkey"
      FOREIGN KEY ("agenteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Propiedad"
  ALTER COLUMN "precio" TYPE DECIMAL(18,2) USING "precio"::numeric(18,2),
  ALTER COLUMN "moneda" DROP DEFAULT,
  ALTER COLUMN "moneda" TYPE "Moneda" USING upper(trim("moneda"))::"Moneda",
  ALTER COLUMN "moneda" SET DEFAULT 'USD',
  ALTER COLUMN "expensas" TYPE DECIMAL(18,2) USING "expensas"::numeric(18,2);

-- These two baseline columns existed in the deployed application schema but were
-- missing from the historical migration chain. IF NOT EXISTS keeps deployed databases unchanged
-- and makes a clean migration replay possible before installing the Phase 2 source-of-truth model.
ALTER TABLE "Propiedad"
  ADD COLUMN IF NOT EXISTS "visitas" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "consultas" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Propiedad" ADD COLUMN "legacyVisitCount" INTEGER NOT NULL DEFAULT 0;
UPDATE "Propiedad" SET "legacyVisitCount" = "visitas", "visitas" = 0;

ALTER TABLE "Contacto" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Contacto" ADD COLUMN "origen" "OrigenContacto" NOT NULL DEFAULT 'PUBLICO';
UPDATE "Contacto"
SET "origen" = 'PANEL_MANUAL'
WHERE "mensaje" = 'Visita presencial registrada manualmente desde el panel.';
ALTER TABLE "VisitaFisicaEvento" ADD COLUMN "idempotencyKey" TEXT;

CREATE TABLE "PropiedadVista" (
  "id" TEXT NOT NULL,
  "propiedadId" TEXT NOT NULL,
  "inmobiliariaId" TEXT NOT NULL,
  "anonymousKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PropiedadVista_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Propiedad"
  ADD CONSTRAINT "Propiedad_precio_nonnegative_check" CHECK ("precio" >= 0),
  ADD CONSTRAINT "Propiedad_expensas_nonnegative_check" CHECK ("expensas" IS NULL OR "expensas" >= 0),
  ADD CONSTRAINT "Propiedad_visitas_nonnegative_check" CHECK ("visitas" >= 0),
  ADD CONSTRAINT "Propiedad_legacy_visitas_nonnegative_check" CHECK ("legacyVisitCount" >= 0),
  ADD CONSTRAINT "Propiedad_consultas_nonnegative_check" CHECK ("consultas" >= 0);

ALTER TABLE "Contacto"
  ADD CONSTRAINT "Contacto_visitas_fisicas_nonnegative_check" CHECK ("visitasFisicas" >= 0);

ALTER TABLE "VisitaFisicaEvento"
  ADD CONSTRAINT "VisitaFisicaEvento_delta_check" CHECK ("delta" IN (-1, 1));

CREATE UNIQUE INDEX "Contacto_idempotencyKey_key" ON "Contacto"("idempotencyKey");
CREATE INDEX "Contacto_propiedadId_origen_createdAt_idx"
  ON "Contacto"("propiedadId", "origen", "createdAt");
CREATE UNIQUE INDEX "VisitaFisicaEvento_idempotencyKey_key" ON "VisitaFisicaEvento"("idempotencyKey");
CREATE INDEX "PropiedadVista_propiedadId_createdAt_idx" ON "PropiedadVista"("propiedadId", "createdAt");
CREATE INDEX "PropiedadVista_inmobiliariaId_createdAt_idx" ON "PropiedadVista"("inmobiliariaId", "createdAt");
CREATE INDEX "PropiedadVista_propiedadId_anonymousKey_createdAt_idx"
  ON "PropiedadVista"("propiedadId", "anonymousKey", "createdAt");

ALTER TABLE "PropiedadVista"
  ADD CONSTRAINT "PropiedadVista_propiedadId_fkey"
  FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropiedadVista"
  ADD CONSTRAINT "PropiedadVista_inmobiliariaId_fkey"
  FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
