import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryRateLimitStore, requestIp } from '../../src/lib/rate-limit';

test('rate limiter enforces limits, expiration and separate identities', async () => {
  const store = createMemoryRateLimitStore();
  assert.equal((await store.consume('user:a', { limit: 1, windowMs: 1_000 }, 0)).allowed, true);
  assert.equal((await store.consume('user:a', { limit: 1, windowMs: 1_000 }, 1)).allowed, false);
  assert.equal((await store.consume('user:b', { limit: 1, windowMs: 1_000 }, 1)).allowed, true);
  assert.equal((await store.consume('user:a', { limit: 1, windowMs: 1_000 }, 1_001)).allowed, true);
});

test('spoofed forwarding headers are ignored unless an approved proxy header is configured', () => {
  const request = new Request('https://app.example.test', {
    headers: { 'x-forwarded-for': '203.0.113.9', 'x-vercel-forwarded-for': '198.51.100.7' },
  });
  assert.equal(requestIp(request, {}), 'unknown');
  assert.equal(requestIp(request, { RATE_LIMIT_TRUSTED_IP_HEADER: 'x-forwarded-for' }), 'unknown');
  assert.equal(requestIp(request, { RATE_LIMIT_TRUSTED_IP_HEADER: 'x-vercel-forwarded-for' }), '198.51.100.7');
});
