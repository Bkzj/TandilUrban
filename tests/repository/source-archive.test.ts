import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createSourceZip, extractStoredZip } from '../../scripts/source-archive-lib.mjs';

test('source ZIP includes operational sources and excludes local/generated artifacts', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'propea-archive-test-'));
  const zip = join(temporary, 'source.zip');
  const secondZip = join(temporary, 'source-second.zip');
  const extractedRoot = join(temporary, 'extracted');
  createSourceZip(zip);
  createSourceZip(secondZip);
  assert.deepEqual(readFileSync(zip), readFileSync(secondZip), 'source ZIP must be byte-for-byte deterministic');
  const entries = new Set(extractStoredZip(zip, extractedRoot));
  for (const required of [
    '.env.example',
    'database/schema.prisma',
    'database/migrations/20260722090000_cloudinary_asset_registry/migration.sql',
    'database/migrations/20260722090000_cloudinary_asset_registry/rollback.sql',
    'docs/security-audit-remediation.md',
    '.github/workflows/ci.yml',
  ]) assert.ok(entries.has(required), `missing ${required}`);
  assert.ok([...entries].some((file) => /^database\/migrations\/[^/]+\/migration\.sql$/.test(file)));
  for (const absent of ['.env', 'src/generated/prisma/schema.prisma', 'tsconfig.tsbuildinfo']) {
    assert.equal(entries.has(absent), false, `unexpected ${absent}`);
    assert.equal(existsSync(join(extractedRoot, ...absent.split('/'))), false);
  }
  assert.equal([...entries].some((file) => file.startsWith('assets-raw/') || file.startsWith('dist/')), false);
});
