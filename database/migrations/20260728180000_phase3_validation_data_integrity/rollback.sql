-- Disposable-database rollback for Phase 3.
-- Destructive implications:
-- - creation idempotency metadata and request fingerprints are dropped;
-- - Phase 2 raw idempotency keys cannot be reconstructed because the forward
--   migration intentionally hashes them;
-- - constraints are removed, so invalid rows can be inserted after rollback.

DROP TRIGGER IF EXISTS "CloudinaryAsset_property_tenant_guard" ON "CloudinaryAsset";
DROP FUNCTION IF EXISTS phase3_validate_cloudinary_asset_tenant();
DROP TRIGGER IF EXISTS "Propiedad_agent_tenant_guard" ON "Propiedad";
DROP FUNCTION IF EXISTS phase3_validate_property_agent_tenant();
DROP TRIGGER IF EXISTS "User_assigned_agent_tenant_guard" ON "User";
DROP FUNCTION IF EXISTS phase3_prevent_assigned_agent_tenant_change();

ALTER TABLE "VisitaFisicaEvento"
  DROP CONSTRAINT IF EXISTS "VisitaFisicaEvento_contactoId_propiedadId_fkey",
  ADD CONSTRAINT "VisitaFisicaEvento_contactoId_fkey"
    FOREIGN KEY ("contactoId") REFERENCES "Contacto"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropiedadVista"
  DROP CONSTRAINT IF EXISTS "PropiedadVista_propiedadId_inmobiliariaId_fkey",
  ADD CONSTRAINT "PropiedadVista_propiedadId_fkey"
    FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VerificationToken" DROP CONSTRAINT IF EXISTS "VerificationToken_expiry_check";
ALTER TABLE "RateLimitBucket" DROP CONSTRAINT IF EXISTS "RateLimitBucket_count_check";
ALTER TABLE "CloudinaryDeletionResource"
  DROP CONSTRAINT IF EXISTS "CloudinaryDeletionResource_attempts_check";
ALTER TABLE "CloudinaryDeletionJob"
  DROP CONSTRAINT IF EXISTS "CloudinaryDeletionJob_attempts_check";
ALTER TABLE "CloudinaryAsset"
  DROP CONSTRAINT IF EXISTS "CloudinaryAsset_bytes_check",
  DROP CONSTRAINT IF EXISTS "CloudinaryAsset_status_dates_check";
ALTER TABLE "PuntoInteres" DROP CONSTRAINT IF EXISTS "PuntoInteres_coordinates_check";
ALTER TABLE "VisitaFisicaEvento"
  DROP CONSTRAINT IF EXISTS "VisitaFisicaEvento_idempotency_pair_check",
  DROP COLUMN IF EXISTS "idempotencyFingerprint";
ALTER TABLE "Contacto"
  DROP CONSTRAINT IF EXISTS "Contacto_input_lengths_check",
  DROP CONSTRAINT IF EXISTS "Contacto_idempotency_pair_check",
  DROP COLUMN IF EXISTS "idempotencyFingerprint";
ALTER TABLE "Propiedad"
  DROP CONSTRAINT IF EXISTS "Propiedad_coordinates_check",
  DROP CONSTRAINT IF EXISTS "Propiedad_surfaces_check",
  DROP CONSTRAINT IF EXISTS "Propiedad_room_counts_check",
  DROP CONSTRAINT IF EXISTS "Propiedad_type_operation_check",
  DROP CONSTRAINT IF EXISTS "Propiedad_text_lengths_check",
  DROP CONSTRAINT IF EXISTS "Propiedad_creation_idempotency_pair_check",
  DROP COLUMN IF EXISTS "creationIdempotencyKey",
  DROP COLUMN IF EXISTS "creationFingerprint";

DROP INDEX IF EXISTS "Contacto_id_propiedadId_key";
DROP INDEX IF EXISTS "Propiedad_id_inmobiliariaId_key";
DROP INDEX IF EXISTS "User_id_agenciaId_key";
