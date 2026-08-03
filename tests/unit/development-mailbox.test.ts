import assert from 'node:assert/strict';
import test from 'node:test';

import { createConfiguredAuthEmailAdapter, sendAccountInvitationEmail } from '@/lib/mail';
import { fallbackInvitationCopy } from '@/server/admin/invitation-copy';
import {
  captureDevelopmentEmail,
  clearDevelopmentMailbox,
  getDevelopmentEmail,
  isDevelopmentMailboxAvailable,
  listDevelopmentEmails,
  sanitizeDevelopmentEmailHtml,
} from '@/server/development-mailbox';
import { handleClearDevelopmentMailbox } from '@/server/development-mailbox-http';

test('development sink captures a branded invitation with its real local one-time link', async () => {
  clearDevelopmentMailbox();
  const adapter = createConfiguredAuthEmailAdapter({ nodeEnv: 'development', provider: 'sink' });
  const rawToken = 'fictitious_mailbox_token_1234567890';
  const context = {
    administratorDisplayName: 'Usuario Ficticio',
    inmobiliariaName: 'Inmobiliaria Ficticia',
    role: 'INMOBILIARIA' as const,
  };
  const result = await sendAccountInvitationEmail({
    email: 'invitado@example.invalid',
    rawToken,
    inmobiliariaName: context.inmobiliariaName,
    role: context.role,
    expirationHours: 48,
    copy: fallbackInvitationCopy(context),
    correlationId: 'request-fictitious-1',
  }, adapter);

  assert.deepEqual(result, { ok: true, delivered: true, provider: 'sink', category: 'captured' });
  const messages = listDevelopmentEmails();
  assert.equal(messages.length, 1);
  const message = messages[0];
  assert.ok(message);
  assert.equal(message.to, 'invitado@example.invalid');
  assert.equal(message.template, 'account_invitation');
  assert.equal(message.correlationId, 'request-fictitious-1');
  assert.match(message.subject, /Invitación/u);
  assert.match(message.html, /PROPEA GROUP/u);
  assert.match(message.text, /Configurar mi cuenta/u);
  assert.equal(new URL(message.actionUrl ?? '').searchParams.get('token'), rawToken);
  assert.equal(getDevelopmentEmail(message.id)?.id, message.id);
});

test('captured HTML is sanitized and the development mailbox is bounded and ephemeral', () => {
  clearDevelopmentMailbox();
  const html = '<main><script>alert(1)</script><img src="javascript:alert(2)" onerror="alert(3)"><a href="data:text/html,bad">Abrir</a><p>Seguro</p></main>';
  const sanitized = sanitizeDevelopmentEmailHtml(html);
  assert.doesNotMatch(sanitized, /script|onerror|javascript:|data:text/iu);
  assert.match(sanitized, /Seguro/u);

  const captureInput = {
    to: 'recipient@example.invalid\r\nBcc: hidden@example.invalid',
    subject: 'Asunto\ninyectado',
    html,
    text: 'Texto visible',
    actionUrl: 'https://evil.example/invitation',
    apiKey: 'not-a-real-provider-key',
  };
  const captured = captureDevelopmentEmail(captureInput);
  assert.equal(captured.to.includes('\n'), false);
  assert.equal(captured.subject.includes('\n'), false);
  assert.equal(captured.actionUrl, undefined);
  assert.equal(JSON.stringify(captured).includes('not-a-real-provider-key'), false);
  assert.equal(clearDevelopmentMailbox(), 1);
  assert.equal(listDevelopmentEmails().length, 0);
});

test('mailbox availability and clear endpoint fail closed outside development', async () => {
  assert.equal(isDevelopmentMailboxAvailable('development'), true);
  assert.equal(isDevelopmentMailboxAvailable('test'), false);
  assert.equal(isDevelopmentMailboxAvailable('production'), false);

  captureDevelopmentEmail({ to: 'recipient@example.invalid', subject: 'Ficticio', html: '<p>Ficticio</p>' });
  const request = new Request('http://localhost:3000/api/dev/mailbox', { method: 'DELETE' });
  const production = await handleClearDevelopmentMailbox(request, { nodeEnv: 'production', assertTrustedRequest() {} });
  assert.equal(production.status, 404);
  assert.equal(listDevelopmentEmails().length, 1);

  const development = await handleClearDevelopmentMailbox(request, { nodeEnv: 'development', assertTrustedRequest() {} });
  assert.equal(development.status, 200);
  assert.equal((await development.json() as { removed: number }).removed, 1);
  assert.equal(listDevelopmentEmails().length, 0);
});
