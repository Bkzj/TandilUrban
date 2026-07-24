import assert from 'node:assert/strict';
import test from 'node:test';

import { registeredAssetBelongsToProperty } from '../../src/lib/panel-property-assets';

const asset = {
  id: 'asset-a',
  publicId: 'propea/tenants/tenant-a/properties/property-a/00000000-0000-4000-8000-000000000000',
  secureUrl: 'https://res.cloudinary.com/demo/image/upload/example.jpg',
  inmobiliariaId: 'tenant-a',
  propertyId: 'property-a',
  status: 'BOUND' as const,
  expiresAt: null,
};

test('tenant A registry row cannot be reused by tenant B or another property', () => {
  assert.equal(registeredAssetBelongsToProperty(asset, 'tenant-a', 'property-a'), true);
  assert.equal(registeredAssetBelongsToProperty(asset, 'tenant-b', 'property-a'), false);
  assert.equal(registeredAssetBelongsToProperty(asset, 'tenant-a', 'property-b'), false);
});
