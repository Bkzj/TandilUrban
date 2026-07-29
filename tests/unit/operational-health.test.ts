import assert from 'node:assert/strict';
import test from 'node:test';

import { healthReport, readinessReport } from '../../src/lib/operational-health';

test('health only proves liveness and contains no deployment details', () => {
  assert.deepEqual(healthReport(), { status: 'ok', components: { process: 'ok' } });
});

test('readiness reports stable non-sensitive states when dependencies are available', async () => {
  const report = await readinessReport({
    validateConfiguration: () => undefined,
    probeDatabase: async () => undefined,
  });
  assert.deepEqual(report, {
    status: 'ready',
    components: { configuration: 'ok', database: 'ok' },
  });
});

test('readiness fails closed without exposing configuration or database errors', async () => {
  const report = await readinessReport({
    validateConfiguration: () => { throw new Error('secret database host'); },
    probeDatabase: async () => { throw new Error('credential rejected'); },
  });
  assert.deepEqual(report, {
    status: 'not_ready',
    components: { configuration: 'not_ready', database: 'not_ready' },
  });
  assert.equal(JSON.stringify(report).includes('secret'), false);
  assert.equal(JSON.stringify(report).includes('credential'), false);
});
