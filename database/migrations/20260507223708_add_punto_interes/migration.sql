-- CreateEnum
CREATE TYPE "CategoriaPuntoInteres" AS ENUM ('HOSPITAL', 'UNIVERSIDAD', 'PARADA_BUS', 'PARQUE');

-- CreateTable
CREATE TABLE "PuntoInteres" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaPuntoInteres" NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PuntoInteres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PuntoInteres_categoria_idx" ON "PuntoInteres"("categoria");
