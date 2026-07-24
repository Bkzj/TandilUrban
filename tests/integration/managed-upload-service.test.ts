import assert from 'node:assert/strict';
import test from 'node:test';

import { uploadManagedImage } from '../../src/lib/managed-upload-service';

test('/api/upload service persists the server-returned ownership record for an authorized property', async () => {
  const records: Array<{ inmobiliariaId: string; propertyId: string; createdById: string; publicId: string }> = [];
  const result = await uploadManagedImage({
    tenantId: 'tenant-a', userId: 'agent-a', secret: 'test-secret', propertyId: 'property-a',
    mimeType: 'image/jpeg', canonicalDataUri: 'data:image/jpeg;base64,/9j/',
    findProperty: async () => ({ id: 'property-a', inmobiliariaId: 'tenant-a', agenteId: 'agent-a' }),
    canModifyExistingProperty: () => true,
    uploadRemote: async (_data, publicId) => ({ publicId, secureUrl: 'https://res.cloudinary.com/demo/image.jpg', bytes: 3 }),
    destroyRemote: async () => undefined,
    createOwnershipRecord: async (record) => { records.push(record); },
  });
  assert.equal(result.propertyId, 'property-a');
  assert.equal(records.length, 1);
  assert.deepEqual(records[0] && { tenant: records[0].inmobiliariaId, property: records[0].propertyId, user: records[0].createdById }, {
    tenant: 'tenant-a', property: 'property-a', user: 'agent-a',
  });
});

test('/api/upload service rejects tenant B and same-tenant unauthorized agents before remote upload', async () => {
  for (const property of [
    { id: 'property-a', inmobiliariaId: 'tenant-b', agenteId: 'agent-b' },
    { id: 'property-a', inmobiliariaId: 'tenant-a', agenteId: 'agent-b' },
  ]) {
    let remoteCalls = 0;
    await assert.rejects(uploadManagedImage({
      tenantId: 'tenant-a', userId: 'agent-a', secret: 'test-secret', propertyId: 'property-a',
      mimeType: 'image/jpeg', canonicalDataUri: 'data:image/jpeg;base64,/9j/',
      findProperty: async () => property,
      canModifyExistingProperty: (row) => row.inmobiliariaId === 'tenant-a' && row.agenteId === 'agent-a',
      uploadRemote: async () => { remoteCalls += 1; return { publicId: 'nope', secureUrl: 'nope', bytes: 0 }; },
      destroyRemote: async () => undefined,
      createOwnershipRecord: async () => undefined,
    }), /permiso/);
    assert.equal(remoteCalls, 0);
  }
});
