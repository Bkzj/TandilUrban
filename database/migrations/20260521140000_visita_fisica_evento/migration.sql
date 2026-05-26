-- Historial de visitas presenciales (+/-) por lead y propiedad

CREATE TABLE "VisitaFisicaEvento" (
    "id" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitaFisicaEvento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VisitaFisicaEvento_contactoId_idx" ON "VisitaFisicaEvento"("contactoId");
CREATE INDEX "VisitaFisicaEvento_propiedadId_idx" ON "VisitaFisicaEvento"("propiedadId");
CREATE INDEX "VisitaFisicaEvento_registradoPorId_idx" ON "VisitaFisicaEvento"("registradoPorId");

ALTER TABLE "VisitaFisicaEvento" ADD CONSTRAINT "VisitaFisicaEvento_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitaFisicaEvento" ADD CONSTRAINT "VisitaFisicaEvento_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitaFisicaEvento" ADD CONSTRAINT "VisitaFisicaEvento_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
