import assert from 'node:assert/strict';
import test from 'node:test';

import { issueUploadScope } from '../../src/lib/cloudinary-ownership';
import { authorizeUploadTarget, UploadAuthorizationError } from '../../src/lib/upload-authorization';

const secret = 'integration-test-secret-with-sufficient-entropy';

test('a draft capability cannot bypass authorization after the property exists', async () => {
  const scope = issueUploadScope('tenant-a', 'user-a', secret, 1_000);
  await assert.rejects(
    authorizeUploadTarget({
      tenantId: 'tenant-a', userId: 'user-a', secret, propertyId: scope.propertyId,
      uploadToken: scope.uploadToken, now: 1_001,
      findProperty: async () => ({ id: scope.propertyId, inmobiliariaId: 'tenant-a', agenteId: 'user-a' }),
      canModifyExistingProperty: () => false,
    }),
    UploadAuthorizationError,
  );
});

test('an agent who loses access cannot continue uploading with an old draft token', async () => {
  const scope = issueUploadScope('tenant-a', 'agent-a', secret, 1_000);
  await assert.rejects(
    authorizeUploadTarget({
      tenantId: 'tenant-a', userId: 'agent-a', secret, propertyId: scope.propertyId,
      uploadToken: scope.uploadToken, now: 1_001,
      findProperty: async () => ({ id: scope.propertyId, inmobiliariaId: 'tenant-a', agenteId: 'agent-a' }),
      canModifyExistingProperty: () => false,
    }),
    /permiso/,
  );
});
