import assert from 'node:assert/strict';
import test from 'node:test';

import { assertCleanupOwnership, executeCleanupResources } from '../../src/lib/cloudinary-cleanup';

const prefix = 'propea/tenants/tenant-a/properties/property-a/';
const resources = [
  { id: 'r1', assetId: 'a1', publicId: `${prefix}00000000-0000-4000-8000-000000000001`, status: 'PENDING' },
  { id: 'r2', assetId: 'a2', publicId: `${prefix}00000000-0000-4000-8000-000000000002`, status: 'PENDING' },
];
const job = { id: 'job-a', inmobiliariaId: 'tenant-a', propertyId: 'property-a', resources };

test('Cloudinary failure leaves cleanup resources retryable', async () => {
  const result = await executeCleanupResources(job, async () => { throw new Error('remote down'); });
  assert.deepEqual(result.failed, ['r1', 'r2']);
  assert.deepEqual(result.completed, []);
});

test('partial Cloudinary deletion records per-resource success and failure', async () => {
  const result = await executeCleanupResources(job, async (publicId) => ({
    result: publicId.endsWith('1') ? 'ok' : 'rate_limited',
  }));
  assert.deepEqual(result.completed, ['r1']);
  assert.deepEqual(result.failed, ['r2']);
});

test('repeated cleanup execution skips already completed resources', async () => {
  let calls = 0;
  const repeated = { ...job, resources: [{ ...resources[0]!, status: 'COMPLETE' }, resources[1]!] };
  const result = await executeCleanupResources(repeated, async () => { calls += 1; return { result: 'not found' }; });
  assert.equal(calls, 1);
  assert.deepEqual(result.completed, ['r2']);
});

test('cross-tenant registry corruption is rejected before remote deletion', async () => {
  const corrupted = { ...job, resources: [{ ...resources[0]!, publicId: 'propea/tenants/tenant-b/properties/property-a/00000000-0000-4000-8000-000000000001' }] };
  let calls = 0;
  const result = await executeCleanupResources(corrupted, async () => { calls += 1; return { result: 'ok' }; });
  assert.equal(calls, 0);
  assert.deepEqual(result.rejected, ['r1']);
  assert.throws(() => assertCleanupOwnership('tenant-a', 'property-a', [{ id: 'a1', publicId: corrupted.resources[0]!.publicId }]), /OWNERSHIP/);
});
