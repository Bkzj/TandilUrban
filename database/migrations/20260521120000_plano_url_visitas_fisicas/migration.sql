-- Plano en propiedad + contador de visitas presenciales en leads (CRM)

ALTER TABLE "Propiedad" ADD COLUMN IF NOT EXISTS "planoUrl" TEXT;

ALTER TABLE "Contacto" ADD COLUMN IF NOT EXISTS "visitasFisicas" INTEGER NOT NULL DEFAULT 0;
