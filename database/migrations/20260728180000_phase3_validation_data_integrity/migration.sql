-- Phase 3: validation-backed database invariants and cross-tenant integrity.
-- Run this preflight against a backup first. It intentionally aborts instead
-- of rewriting invalid business data.
DO $phase3_preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Propiedad"
    WHERE "latitud" IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)
       OR "longitud" IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)
       OR "latitud" NOT BETWEEN -90 AND 90
       OR "longitud" NOT BETWEEN -180 AND 180
       OR "m2Total" <= 0
       OR "m2Cubiertos" < 0
       OR ("tipo" <> 'Lote' AND "m2Cubiertos" > "m2Total")
       OR "ambientes" < 0 OR "dormitorios" < 0 OR "banos" < 0 OR "cocheras" < 0
       OR "ambientes" > 100 OR "dormitorios" > 100 OR "banos" > 100 OR "cocheras" > 100
       OR "tipo" NOT IN ('Casa', 'Departamento', 'Lote', 'Local', 'Oficina')
       OR "operacion" NOT IN ('VENTA', 'ALQUILER')
       OR char_length("titulo") NOT BETWEEN 4 AND 160
       OR char_length("descripcion") NOT BETWEEN 10 AND 10000
       OR char_length("direccion") NOT BETWEEN 3 AND 240
       OR ("barrio" IS NOT NULL AND char_length("barrio") NOT BETWEEN 1 AND 120)
       OR cardinality("caracteristicas") > 40
  ) THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: Propiedad contiene coordenadas, superficies, cantidades o dominios inválidos';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Propiedad" p
    JOIN "User" u ON u.id = p."agenteId"
    LEFT JOIN "Inmobiliaria" i ON i.id = p."inmobiliariaId"
    WHERE p."agenteId" IS NOT NULL
      AND NOT (
        (u.rol = 'AGENTE' AND u."agenciaId" = p."inmobiliariaId")
        OR (u.rol = 'INMOBILIARIA' AND i."userId" = u.id)
      )
  ) THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: existen propiedades asignadas a usuarios de otro tenant';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "PropiedadVista" v
    JOIN "Propiedad" p ON p.id = v."propiedadId"
    WHERE p."inmobiliariaId" <> v."inmobiliariaId"
  ) THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: existen vistas con tenant inconsistente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "VisitaFisicaEvento" e
    JOIN "Contacto" c ON c.id = e."contactoId"
    WHERE c."propiedadId" <> e."propiedadId"
  ) THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: existen eventos físicos asociados a otra propiedad';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "PuntoInteres"
    WHERE "latitud" IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)
       OR "longitud" IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)
       OR "latitud" NOT BETWEEN -90 AND 90
       OR "longitud" NOT BETWEEN -180 AND 180
  ) THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: PuntoInteres contiene coordenadas inválidas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "CloudinaryAsset"
    WHERE bytes <= 0
       OR ("status" = 'DRAFT' AND ("expiresAt" IS NULL OR "boundAt" IS NOT NULL))
       OR ("status" = 'BOUND' AND ("expiresAt" IS NOT NULL OR "boundAt" IS NULL))
       OR ("status" IN ('PENDING_DELETION', 'DELETED') AND "expiresAt" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: CloudinaryAsset contiene combinaciones de estado inválidas';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CloudinaryAsset" a
    WHERE a.status <> 'DRAFT'
      AND NOT EXISTS (
        SELECT 1 FROM "Propiedad" p
        WHERE p.id = a."propertyId"
          AND p."inmobiliariaId" = a."inmobiliariaId"
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "CloudinaryDeletionResource" r
        JOIN "CloudinaryDeletionJob" j ON j.id = r."jobId"
        WHERE r."assetId" = a.id
          AND j."propertyId" = a."propertyId"
          AND j."inmobiliariaId" = a."inmobiliariaId"
      )
  ) THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: existen assets Cloudinary con propiedad o tenant inconsistente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Contacto"
    WHERE char_length("nombre") NOT BETWEEN 2 AND 120
       OR char_length("email") NOT BETWEEN 3 AND 254
       OR ("telefono" IS NOT NULL AND char_length("telefono") NOT BETWEEN 6 AND 32)
       OR char_length("mensaje") NOT BETWEEN 10 AND 2000
  ) THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: Contacto contiene longitudes inválidas';
  END IF;

  IF EXISTS (SELECT 1 FROM "CloudinaryDeletionJob" WHERE attempts < 0)
     OR EXISTS (SELECT 1 FROM "CloudinaryDeletionResource" WHERE attempts < 0)
     OR EXISTS (SELECT 1 FROM "RateLimitBucket" WHERE count <= 0) THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: existen contadores operativos inválidos';
  END IF;

  IF EXISTS (SELECT 1 FROM "VerificationToken" WHERE "expiresAt" <= "createdAt") THEN
    RAISE EXCEPTION 'PHASE3_PREFLIGHT: existen tokens que no expiran después de emitirse';
  END IF;
END
$phase3_preflight$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "Propiedad"
  ADD COLUMN "creationIdempotencyKey" TEXT,
  ADD COLUMN "creationFingerprint" TEXT;

ALTER TABLE "Contacto" ADD COLUMN "idempotencyFingerprint" TEXT;
ALTER TABLE "VisitaFisicaEvento" ADD COLUMN "idempotencyFingerprint" TEXT;

-- Existing keys are historical and cannot reconstruct their original payload.
-- Preserve them as explicitly legacy-scoped hashes; new requests use operation-
-- scoped hashes and a normalized request fingerprint.
UPDATE "Contacto"
SET
  "idempotencyFingerprint" = encode(digest('legacy-contact-fingerprint:' || "idempotencyKey", 'sha256'), 'hex'),
  "idempotencyKey" = encode(digest('legacy-contact-key:' || "idempotencyKey", 'sha256'), 'hex')
WHERE "idempotencyKey" IS NOT NULL;

UPDATE "VisitaFisicaEvento"
SET
  "idempotencyFingerprint" = encode(digest('legacy-physical-fingerprint:' || "idempotencyKey", 'sha256'), 'hex'),
  "idempotencyKey" = encode(digest('legacy-physical-key:' || "idempotencyKey", 'sha256'), 'hex')
WHERE "idempotencyKey" IS NOT NULL;

CREATE UNIQUE INDEX "Propiedad_creationIdempotencyKey_key"
  ON "Propiedad"("creationIdempotencyKey");
CREATE UNIQUE INDEX "User_id_agenciaId_key" ON "User"("id", "agenciaId");
CREATE UNIQUE INDEX "Propiedad_id_inmobiliariaId_key"
  ON "Propiedad"("id", "inmobiliariaId");
CREATE UNIQUE INDEX "Contacto_id_propiedadId_key"
  ON "Contacto"("id", "propiedadId");

ALTER TABLE "Propiedad"
  ADD CONSTRAINT "Propiedad_coordinates_check"
    CHECK (
      "latitud" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)
      AND "longitud" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)
      AND "latitud" BETWEEN -90 AND 90
      AND "longitud" BETWEEN -180 AND 180
    ),
  ADD CONSTRAINT "Propiedad_surfaces_check"
    CHECK (
      "m2Total" > 0
      AND "m2Cubiertos" >= 0
      AND ("tipo" = 'Lote' OR "m2Cubiertos" <= "m2Total")
    ),
  ADD CONSTRAINT "Propiedad_room_counts_check"
    CHECK (
      "ambientes" BETWEEN 0 AND 100
      AND "dormitorios" BETWEEN 0 AND 100
      AND "banos" BETWEEN 0 AND 100
      AND "cocheras" BETWEEN 0 AND 100
    ),
  ADD CONSTRAINT "Propiedad_type_operation_check"
    CHECK (
      "tipo" IN ('Casa', 'Departamento', 'Lote', 'Local', 'Oficina')
      AND "operacion" IN ('VENTA', 'ALQUILER')
    ),
  ADD CONSTRAINT "Propiedad_text_lengths_check"
    CHECK (
      char_length("titulo") BETWEEN 4 AND 160
      AND char_length("descripcion") BETWEEN 10 AND 10000
      AND char_length("direccion") BETWEEN 3 AND 240
      AND ("barrio" IS NULL OR char_length("barrio") BETWEEN 1 AND 120)
      AND cardinality("caracteristicas") <= 40
    ),
  ADD CONSTRAINT "Propiedad_creation_idempotency_pair_check"
    CHECK (
      ("creationIdempotencyKey" IS NULL AND "creationFingerprint" IS NULL)
      OR (
        char_length("creationIdempotencyKey") = 64
        AND char_length("creationFingerprint") = 64
      )
    );

ALTER TABLE "Contacto"
  ADD CONSTRAINT "Contacto_input_lengths_check"
    CHECK (
      char_length("nombre") BETWEEN 2 AND 120
      AND char_length("email") BETWEEN 3 AND 254
      AND ("telefono" IS NULL OR char_length("telefono") BETWEEN 6 AND 32)
      AND char_length("mensaje") BETWEEN 10 AND 2000
    ),
  ADD CONSTRAINT "Contacto_idempotency_pair_check"
    CHECK (
      ("idempotencyKey" IS NULL AND "idempotencyFingerprint" IS NULL)
      OR (
        char_length("idempotencyKey") = 64
        AND char_length("idempotencyFingerprint") = 64
      )
    );

ALTER TABLE "VisitaFisicaEvento"
  ADD CONSTRAINT "VisitaFisicaEvento_idempotency_pair_check"
    CHECK (
      ("idempotencyKey" IS NULL AND "idempotencyFingerprint" IS NULL)
      OR (
        char_length("idempotencyKey") = 64
        AND char_length("idempotencyFingerprint") = 64
      )
    );

ALTER TABLE "PuntoInteres"
  ADD CONSTRAINT "PuntoInteres_coordinates_check"
    CHECK (
      "latitud" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)
      AND "longitud" NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)
      AND "latitud" BETWEEN -90 AND 90
      AND "longitud" BETWEEN -180 AND 180
    );

ALTER TABLE "CloudinaryAsset"
  ADD CONSTRAINT "CloudinaryAsset_bytes_check" CHECK (bytes > 0),
  ADD CONSTRAINT "CloudinaryAsset_status_dates_check"
    CHECK (
      ("status" = 'DRAFT' AND "expiresAt" IS NOT NULL AND "boundAt" IS NULL)
      OR ("status" = 'BOUND' AND "expiresAt" IS NULL AND "boundAt" IS NOT NULL)
      OR ("status" IN ('PENDING_DELETION', 'DELETED') AND "expiresAt" IS NULL)
    );

ALTER TABLE "CloudinaryDeletionJob"
  ADD CONSTRAINT "CloudinaryDeletionJob_attempts_check" CHECK (attempts >= 0);
ALTER TABLE "CloudinaryDeletionResource"
  ADD CONSTRAINT "CloudinaryDeletionResource_attempts_check" CHECK (attempts >= 0);
ALTER TABLE "RateLimitBucket"
  ADD CONSTRAINT "RateLimitBucket_count_check" CHECK (count > 0);
ALTER TABLE "VerificationToken"
  ADD CONSTRAINT "VerificationToken_expiry_check" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "PropiedadVista"
  DROP CONSTRAINT "PropiedadVista_propiedadId_fkey",
  ADD CONSTRAINT "PropiedadVista_propiedadId_inmobiliariaId_fkey"
    FOREIGN KEY ("propiedadId", "inmobiliariaId")
    REFERENCES "Propiedad"("id", "inmobiliariaId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VisitaFisicaEvento"
  DROP CONSTRAINT "VisitaFisicaEvento_contactoId_fkey",
  ADD CONSTRAINT "VisitaFisicaEvento_contactoId_propiedadId_fkey"
    FOREIGN KEY ("contactoId", "propiedadId")
    REFERENCES "Contacto"("id", "propiedadId")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION phase3_validate_property_agent_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."agenteId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "User" u
    JOIN "Inmobiliaria" i ON i.id = NEW."inmobiliariaId"
    WHERE u.id = NEW."agenteId"
      AND (
        (u.rol = 'AGENTE' AND u."agenciaId" = NEW."inmobiliariaId")
        OR (u.rol = 'INMOBILIARIA' AND i."userId" = u.id)
      )
  ) THEN
    RAISE EXCEPTION 'PROPERTY_AGENT_TENANT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "Propiedad_agent_tenant_guard"
AFTER INSERT OR UPDATE OF "agenteId", "inmobiliariaId" ON "Propiedad"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION phase3_validate_property_agent_tenant();

CREATE OR REPLACE FUNCTION phase3_prevent_assigned_agent_tenant_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD."agenciaId", OLD.rol) IS DISTINCT FROM (NEW."agenciaId", NEW.rol)
     AND EXISTS (SELECT 1 FROM "Propiedad" p WHERE p."agenteId" = OLD.id) THEN
    RAISE EXCEPTION 'ASSIGNED_AGENT_TENANT_CHANGE_REQUIRES_REASSIGNMENT' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "User_assigned_agent_tenant_guard"
BEFORE UPDATE OF "agenciaId", rol ON "User"
FOR EACH ROW EXECUTE FUNCTION phase3_prevent_assigned_agent_tenant_change();

CREATE OR REPLACE FUNCTION phase3_validate_cloudinary_asset_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> 'DRAFT'
    AND NOT EXISTS (
      SELECT 1 FROM "Propiedad" p
      WHERE p.id = NEW."propertyId"
        AND p."inmobiliariaId" = NEW."inmobiliariaId"
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "CloudinaryDeletionResource" r
      JOIN "CloudinaryDeletionJob" j ON j.id = r."jobId"
      WHERE r."assetId" = NEW.id
        AND j."propertyId" = NEW."propertyId"
        AND j."inmobiliariaId" = NEW."inmobiliariaId"
    ) THEN
    RAISE EXCEPTION 'CLOUDINARY_ASSET_PROPERTY_TENANT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "CloudinaryAsset_property_tenant_guard"
AFTER INSERT OR UPDATE OF status, "propertyId", "inmobiliariaId" ON "CloudinaryAsset"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION phase3_validate_cloudinary_asset_tenant();
