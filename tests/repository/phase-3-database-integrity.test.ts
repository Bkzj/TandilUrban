import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const migrationPath = join(
  root,
  'database/migrations/20260728180000_phase3_validation_data_integrity',
);
const migration = readFileSync(join(migrationPath, 'migration.sql'), 'utf8');
const rollback = readFileSync(join(migrationPath, 'rollback.sql'), 'utf8');
const schema = readFileSync(join(root, 'database/schema.prisma'), 'utf8');

test('Phase 3 migration preflights invalid legacy rows before adding constraints', () => {
  assert.match(migration, /PHASE3_PREFLIGHT/);
  assert.match(migration, /Propiedad_coordinates_check/);
  assert.match(migration, /Propiedad_surfaces_check/);
  assert.match(migration, /Propiedad_room_counts_check/);
  assert.match(migration, /Contacto_input_lengths_check/);
  assert.match(migration, /VerificationToken_expiry_check/);
  assert.match(migration, /RateLimitBucket_count_check/);
});

test('cross-tenant relations and assignments have database enforcement', () => {
  assert.match(migration, /PropiedadVista_propiedadId_inmobiliariaId_fkey/);
  assert.match(migration, /VisitaFisicaEvento_contactoId_propiedadId_fkey/);
  assert.match(migration, /Propiedad_agent_tenant_guard/);
  assert.match(migration, /User_assigned_agent_tenant_guard/);
  assert.match(migration, /CloudinaryAsset_property_tenant_guard/);
  assert.match(schema, /@@unique\(\[id, inmobiliariaId\]\)/);
  assert.match(schema, /@@unique\(\[id, propiedadId\]\)/);
});

test('scoped idempotency stores hashes plus fingerprints and rollback is explicit', () => {
  assert.match(migration, /creationIdempotencyKey/);
  assert.match(migration, /idempotencyFingerprint/);
  assert.match(migration, /digest\('legacy-contact-key:/);
  assert.match(rollback, /cannot be reconstructed/);
  assert.match(rollback, /DROP CONSTRAINT IF EXISTS "Propiedad_coordinates_check"/);
});
