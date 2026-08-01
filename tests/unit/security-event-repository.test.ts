import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeSecurityEventMetadata } from '../../src/server/auth-security/security-event-repository';

test('security event metadata recursively removes sensitive aliases', () => {
  const result = sanitizeSecurityEventMetadata({ safe: 'ok', PASSWORD: 'bad', nested: { authToken: 'bad', count: 2 }, list: [{ Cookie: 'bad', value: true }] });
  assert.deepEqual(result, { safe: 'ok', nested: { count: 2 }, list: [{ value: true }] });
  assert.equal(JSON.stringify(result).includes('bad'), false);
});
