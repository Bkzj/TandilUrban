-- Idempotente: si los objetos ya existen en la DB, no rompe.
-- Agente de inmobiliaria: nuevo rol + FK opcional User.agenciaId -> Inmobiliaria

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'RolUsuario' AND e.enumlabel = 'AGENTE'
  ) THEN
    ALTER TYPE "RolUsuario" ADD VALUE 'AGENTE';
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "agenciaId" TEXT;

CREATE INDEX IF NOT EXISTS "User_agenciaId_idx" ON "User"("agenciaId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_agenciaId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_agenciaId_fkey"
      FOREIGN KEY ("agenciaId") REFERENCES "Inmobiliaria"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
