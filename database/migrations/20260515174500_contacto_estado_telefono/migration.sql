-- CreateEnum
CREATE TYPE "EstadoContacto" AS ENUM ('NUEVO', 'LEIDO', 'RESPONDIDO');

-- AlterTable
ALTER TABLE "Contacto" ADD COLUMN "telefono" TEXT;

ALTER TABLE "Contacto" ADD COLUMN "estado" "EstadoContacto" NOT NULL DEFAULT 'NUEVO';

-- CreateIndex
CREATE INDEX "Contacto_estado_idx" ON "Contacto"("estado");
