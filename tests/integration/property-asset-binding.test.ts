import assert from 'node:assert/strict';
import test from 'node:test';

import { bindDraftAssets } from '../../src/lib/panel-property-assets';

test('property creation binds every draft asset with tenant, property, user and expiry guards', async () => {
  let captured: { where: Record<string, unknown>; data: Record<string, unknown> } | undefined;
  await bindDraftAssets({
    async updateMany(input) { captured = input; return { count: 2 }; },
  }, {
    assetIds: ['asset-a', 'asset-b'], tenantId: 'tenant-a', propertyId: 'property-a', userId: 'user-a',
    now: new Date('2026-07-22T00:00:00Z'),
  });
  assert.equal(captured?.where.inmobiliariaId, 'tenant-a');
  assert.equal(captured?.where.propertyId, 'property-a');
  assert.equal(captured?.where.createdById, 'user-a');
  assert.equal(captured?.where.status, 'DRAFT');
  assert.equal(captured?.data.status, 'BOUND');
  assert.equal(captured?.data.expiresAt, null);
});

test('property creation fails atomically when not every draft asset can be bound', async () => {
  await assert.rejects(bindDraftAssets({ async updateMany() { return { count: 1 }; } }, {
    assetIds: ['asset-a', 'asset-b'], tenantId: 'tenant-a', propertyId: 'property-a', userId: 'user-a',
  }), /todos los archivos/);
});
