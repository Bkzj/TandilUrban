import assert from 'node:assert/strict';
import test from 'node:test';

import { issueUploadScope, newCloudinaryPublicId, publicIdBelongsToProperty, verifyUploadScope } from '../../src/lib/cloudinary-ownership';

const secret = 'test-secret-with-sufficient-entropy';

test('expired, cross-user and cross-tenant draft upload tokens are rejected', () => {
  const issued = issueUploadScope('tenant-a', 'user-a', secret, 1_000);
  const base = { propertyId: issued.propertyId, uploadToken: issued.uploadToken, secret };
  assert.ok(verifyUploadScope({ ...base, tenantId: 'tenant-a', userId: 'user-a', now: 1_001 }));
  assert.equal(verifyUploadScope({ ...base, tenantId: 'tenant-a', userId: 'user-b', now: 1_001 }), null);
  assert.equal(verifyUploadScope({ ...base, tenantId: 'tenant-b', userId: 'user-a', now: 1_001 }), null);
  assert.equal(verifyUploadScope({ ...base, tenantId: 'tenant-a', userId: 'user-a', now: issued.expiresAt.getTime() }), null);
  assert.equal(verifyUploadScope({ ...base, tenantId: 'tenant-a', userId: 'user-a', uploadToken: 'malformed', now: 1_001 }), null);
});

test('asset deletion ownership requires both tenant and property prefix', () => {
  const id = newCloudinaryPublicId('tenant-a', 'property-a');
  assert.equal(publicIdBelongsToProperty(id, 'tenant-a', 'property-a'), true);
  assert.equal(publicIdBelongsToProperty(id, 'tenant-b', 'property-a'), false);
  assert.equal(publicIdBelongsToProperty(id, 'tenant-a', 'property-b'), false);
  assert.equal(publicIdBelongsToProperty('legacy/arbitrary-id', 'tenant-a', 'property-a'), false);
});
