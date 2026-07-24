import assert from 'node:assert/strict';
import test from 'node:test';

import { schedulePropertyDeletionInTransaction } from '../../src/lib/cloudinary-cleanup';

test('database failure aborts durable property deletion before any Cloudinary worker can run', async () => {
  let jobCreated = false;
  let markedPending = false;
  const remoteCalls = 0;
  await assert.rejects(schedulePropertyDeletionInTransaction({ tenantId: 'tenant-a', propertyId: 'property-a' }, {
    async findAssets() {
      return [{ id: 'asset-a', publicId: 'propea/tenants/tenant-a/properties/property-a/00000000-0000-4000-8000-000000000001' }];
    },
    async createJob() {
      jobCreated = true;
      return { id: 'job-a' };
    },
    async markPending() {
      markedPending = true;
    },
    async deleteProperty() {
      throw new Error('database failure');
    },
  }), /database failure/);
  // Remote deletion is a separate worker and cannot run from the failed transaction path.
  assert.equal(remoteCalls, 0);
  assert.equal(jobCreated, true);
  assert.equal(markedPending, true);
});
