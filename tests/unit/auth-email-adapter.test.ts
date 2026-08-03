import assert from 'node:assert/strict';
import test from 'node:test';

import { createConfiguredAuthEmailAdapter, type AuthResendClient } from '@/lib/mail';
import { validateServerEnvironment } from '@/lib/validation/environment';

const message = {
  to: 'recipient@example.invalid',
  subject: 'Invitación ficticia',
  html: '<p>Contenido ficticio</p>',
  text: 'Contenido ficticio',
};

function fakeResend(result: Awaited<ReturnType<AuthResendClient['emails']['send']>>): AuthResendClient {
  return { emails: { async send() { return result; } } };
}

test('email adapter defaults to a non-network sink and tests block real Resend', async () => {
  const sink = createConfiguredAuthEmailAdapter({ nodeEnv: 'development', provider: 'sink' });
  assert.deepEqual(await sink.send(message), {
    ok: true,
    delivered: false,
    provider: 'sink',
    category: 'sink_not_configured',
  });

  const blocked = createConfiguredAuthEmailAdapter({
    nodeEnv: 'test',
    provider: 'resend',
    resendApiKey: 're_fictitious_test_key',
    resendFromEmail: 'Propea Group <invitaciones@mail.propea.group>',
  });
  const result = await blocked.send(message);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.category, 'test_network_blocked');
});

test('explicit Resend mode fails closed without complete authorized-sender configuration', async () => {
  for (const configuration of [
    { resendApiKey: undefined, resendFromEmail: 'Propea Group <invitaciones@mail.propea.group>' },
    { resendApiKey: 'not-a-resend-key', resendFromEmail: 'Propea Group <invitaciones@mail.propea.group>' },
    { resendApiKey: 're_fictitious_test_key', resendFromEmail: undefined },
    { resendApiKey: 're_fictitious_test_key', resendFromEmail: 'Propea Group <onboarding@resend.dev>' },
    { resendApiKey: 're_fictitious_test_key', resendFromEmail: 'Propea Group <no-reply@example.com>' },
  ]) {
    const adapter = createConfiguredAuthEmailAdapter({ nodeEnv: 'development', provider: 'resend', ...configuration });
    const result = await adapter.send(message);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.category, 'configuration_missing');
  }
});

test('explicit Resend mode uses only the injected client during tests and requires provider acceptance', async () => {
  let factoryCalls = 0;
  let submittedFrom = '';
  const adapter = createConfiguredAuthEmailAdapter({
    nodeEnv: 'test',
    provider: 'resend',
    resendApiKey: 're_fictitious_test_key',
    resendFromEmail: 'Propea Group <invitaciones@mail.propea.group>',
  }, {
    resendClientFactory() {
      factoryCalls += 1;
      return { emails: { async send(input) { submittedFrom = input.from; return { data: { id: 'fake-provider-id' } }; } } };
    },
  });
  const result = await adapter.send(message);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.delivered, true);
    assert.equal(result.provider, 'resend');
  }
  assert.equal(factoryCalls, 1);
  assert.equal(submittedFrom, 'Propea Group <invitaciones@mail.propea.group>');

  const unconfirmed = createConfiguredAuthEmailAdapter({
    nodeEnv: 'test', provider: 'resend', resendApiKey: 're_fictitious_test_key', resendFromEmail: 'Propea Group <invitaciones@mail.propea.group>',
  }, { resendClientFactory: () => fakeResend({ data: null }) });
  const unconfirmedResult = await unconfirmed.send(message);
  assert.equal(unconfirmedResult.ok, false);
  if (!unconfirmedResult.ok) assert.equal(unconfirmedResult.category, 'provider_rejected');
});

test('Resend errors are reduced to privacy-safe failure categories', async () => {
  const cases: Array<{ error: unknown; category: string }> = [
    { error: { statusCode: 401, message: 'invalid api key' }, category: 'invalid_api_key' },
    { error: { statusCode: 403, message: 'sender domain is not verified' }, category: 'unauthorized_sender' },
    { error: { statusCode: 422, message: 'invalid recipient email' }, category: 'invalid_recipient' },
    { error: { statusCode: 429, message: 'rate limited' }, category: 'rate_limited' },
    { error: { statusCode: 500, message: 'provider unavailable' }, category: 'provider_unavailable' },
  ];
  for (const item of cases) {
    const adapter = createConfiguredAuthEmailAdapter({
      nodeEnv: 'test', provider: 'resend', resendApiKey: 're_fictitious_test_key', resendFromEmail: 'Propea Group <invitaciones@mail.propea.group>',
    }, { resendClientFactory: () => fakeResend({ error: item.error }) });
    const result = await adapter.send(message);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.category, item.category);
  }

  const timeout = createConfiguredAuthEmailAdapter({
    nodeEnv: 'test', provider: 'resend', resendApiKey: 're_fictitious_test_key', resendFromEmail: 'Propea Group <invitaciones@mail.propea.group>',
  }, { resendClientFactory: () => ({ emails: { async send() { throw new Error('synthetic timeout'); } } }) });
  const timeoutResult = await timeout.send(message);
  assert.equal(timeoutResult.ok, false);
  if (!timeoutResult.ok) assert.equal(timeoutResult.category, 'provider_unavailable');
});

test('environment validation requires explicit Resend configuration outside safe sink mode', () => {
  const base = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/app',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: 'a'.repeat(32),
    APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    APP_INTERNAL_URL: 'http://localhost:3000',
    VIEW_TRACKING_SECRET: 'b'.repeat(32),
  } satisfies NodeJS.ProcessEnv;
  assert.equal(validateServerEnvironment(base).ok, true);
  assert.equal(validateServerEnvironment({ ...base, EMAIL_PROVIDER: 'resend' }).ok, false);
  assert.equal(validateServerEnvironment({ ...base, EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_fictitious', RESEND_FROM_EMAIL: 'Propea <no-reply@example.com>' }).ok, false);
  assert.equal(validateServerEnvironment({ ...base, EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_fictitious', RESEND_FROM_EMAIL: 'Propea <invitaciones@mail.propea.group>' }).ok, true);
});
