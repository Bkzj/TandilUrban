-- CreateTable
CREATE TABLE "Contacto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contacto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contacto_propiedadId_idx" ON "Contacto"("propiedadId");

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
