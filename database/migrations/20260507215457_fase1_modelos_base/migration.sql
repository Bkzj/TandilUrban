/*
  Warnings:

  - You are about to drop the column `ambientesExtra` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `antiguedadAnos` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `banos` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `cocheras` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `comodidades` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `dormitorios` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `esSustentable` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `frenteTerreno` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `largoTerreno` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `m2Cubierto` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `m2Semicubierto` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `plantas` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `servicios` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `tipoCochera` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `toilettes` on the `Propiedad` table. All the data in the column will be lost.
  - You are about to drop the column `tourVirtualUrl` on the `Propiedad` table. All the data in the column will be lost.
  - Added the required column `direccion` to the `Propiedad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inmobiliariaId` to the `Propiedad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `m2Cubiertos` to the `Propiedad` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'INMOBILIARIA', 'USUARIO_NORMAL');

-- CreateEnum
CREATE TYPE "EstadoPropiedad" AS ENUM ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'PAUSADA');

-- AlterTable
ALTER TABLE "Propiedad" DROP COLUMN "ambientesExtra",
DROP COLUMN "antiguedadAnos",
DROP COLUMN "banos",
DROP COLUMN "cocheras",
DROP COLUMN "comodidades",
DROP COLUMN "dormitorios",
DROP COLUMN "esSustentable",
DROP COLUMN "frenteTerreno",
DROP COLUMN "largoTerreno",
DROP COLUMN "m2Cubierto",
DROP COLUMN "m2Semicubierto",
DROP COLUMN "plantas",
DROP COLUMN "servicios",
DROP COLUMN "tipoCochera",
DROP COLUMN "toilettes",
DROP COLUMN "tourVirtualUrl",
ADD COLUMN     "barrio" TEXT,
ADD COLUMN     "caracteristicas" TEXT[],
ADD COLUMN     "direccion" TEXT NOT NULL,
ADD COLUMN     "estado" "EstadoPropiedad" NOT NULL DEFAULT 'DISPONIBLE',
ADD COLUMN     "expensas" DOUBLE PRECISION,
ADD COLUMN     "inmobiliariaId" TEXT NOT NULL,
ADD COLUMN     "m2Cubiertos" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'USUARIO_NORMAL',
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "telefono" TEXT,
    "avatarUrl" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inmobiliaria" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nombreAgencia" TEXT NOT NULL,
    "logoAgencia" TEXT,
    "cuit" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inmobiliaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Inmobiliaria_userId_key" ON "Inmobiliaria"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Inmobiliaria_cuit_key" ON "Inmobiliaria"("cuit");

-- CreateIndex
CREATE INDEX "Propiedad_inmobiliariaId_idx" ON "Propiedad"("inmobiliariaId");

-- CreateIndex
CREATE INDEX "Propiedad_estado_idx" ON "Propiedad"("estado");

-- CreateIndex
CREATE INDEX "Propiedad_tipo_idx" ON "Propiedad"("tipo");

-- CreateIndex
CREATE INDEX "Propiedad_operacion_idx" ON "Propiedad"("operacion");

-- CreateIndex
CREATE INDEX "Propiedad_barrio_idx" ON "Propiedad"("barrio");

-- AddForeignKey
ALTER TABLE "Inmobiliaria" ADD CONSTRAINT "Inmobiliaria_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Propiedad" ADD CONSTRAINT "Propiedad_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
