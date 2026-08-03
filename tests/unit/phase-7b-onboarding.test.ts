import assert from 'node:assert/strict';
import test from 'node:test';

import { renderInvitationEmail } from '@/lib/invitation-email';
import { createInmobiliariaSchema } from '@/lib/validation/admin';
import { fallbackInvitationCopy, resolveInvitationCopy, type InvitationCopyContext, type InvitationCopyProvider } from '@/server/admin/invitation-copy';
import { accountInvitationStatus } from '@/server/admin/invitation-status';

const context: InvitationCopyContext = { administratorDisplayName: 'Juana Ejemplo', inmobiliariaName: 'Grupo Inmobiliario Ejemplo', role: 'INMOBILIARIA' };

test('Phase 7B invitation copy falls back deterministically and exposes no secret-shaped provider fields', async () => {
  let received: InvitationCopyContext | undefined;
  const provider: InvitationCopyProvider = { async generate(value) { received = value; throw new Error('provider unavailable'); } };
  const result = await resolveInvitationCopy(context, provider);
  assert.equal(result.source, 'fallback');
  assert.deepEqual(received, context);
  assert.deepEqual(Object.keys(received ?? {}).sort(), ['administratorDisplayName', 'inmobiliariaName', 'role']);
  assert.deepEqual(result.copy, fallbackInvitationCopy(context));
});

test('Phase 7B accepts strict structured copy and rejects HTML, URLs, markdown and extra fields', async () => {
  const valid = { subject: 'Invitación profesional', greeting: 'Hola, Juana.', intro: 'Te invitamos a administrar la inmobiliaria.', roleSummary: 'Podrás gestionar publicaciones y agentes.', closing: 'Configurá tu cuenta para comenzar.' };
  assert.equal((await resolveInvitationCopy(context, { async generate() { return valid; } })).source, 'provider');
  for (const invalid of [
    { ...valid, intro: '<script>alert(1)</script>' },
    { ...valid, closing: 'Abrí https://example.invalid' },
    { ...valid, greeting: '**Hola**' },
    { ...valid, intro: 'Texto\u0000oculto' },
    { ...valid, arbitrary: 'not allowed' },
  ]) assert.equal((await resolveInvitationCopy(context, { async generate() { return invalid; } })).source, 'fallback');
});

test('Phase 7B renders escaped branded HTML and a plain-text alternative', () => {
  const rendered = renderInvitationEmail({ copy: { ...fallbackInvitationCopy(context), greeting: 'Hola, <Juana>.' }, inmobiliariaName: 'Grupo <Ejemplo>', role: 'INMOBILIARIA', ctaUrl: 'https://app.example.invalid/activar-cuenta?token=opaque_test', expirationHours: 48 });
  assert.match(rendered.html, /#12422a/u);
  assert.match(rendered.html, /#957327/u);
  assert.match(rendered.html, /PROPEA GROUP/u);
  assert.match(rendered.html, /Hola, &lt;Juana&gt;\./u);
  assert.doesNotMatch(rendered.html, /Hola, <Juana>/u);
  assert.match(rendered.text, /Configurar mi cuenta: https:\/\/app\.example\.invalid/u);
  assert.doesNotMatch(rendered.html, /<script|tracking|<form/iu);
});

test('Phase 7B calculates invitation lifecycle status from persisted state', () => {
  const future = new Date('2030-01-02T00:00:00.000Z');
  const now = new Date('2030-01-01T00:00:00.000Z');
  const base = { consumedAt: null, invalidatedAt: null, expiresAt: future, deliveryStatus: 'SENT' as const };
  assert.equal(accountInvitationStatus(base, now), 'PENDING');
  assert.equal(accountInvitationStatus({ ...base, deliveryStatus: 'FAILED' }, now), 'SEND_FAILED');
  assert.equal(accountInvitationStatus({ ...base, expiresAt: now }, now), 'EXPIRED');
  assert.equal(accountInvitationStatus({ ...base, invalidatedAt: now }, now), 'INVALIDATED');
  assert.equal(accountInvitationStatus({ ...base, consumedAt: now }, now), 'ACCEPTED');
});

test('Phase 7B creation input has no role or password authority', () => {
  const base = { nombreAgencia: 'Inmobiliaria Ejemplo', cuit: '30-12345678-9', direccion: 'Calle Ejemplo 100', administrador: { nombre: 'Juana Ejemplo', email: 'juana@example.invalid' } };
  assert.equal(createInmobiliariaSchema.safeParse(base).success, true);
  assert.equal(createInmobiliariaSchema.safeParse({ ...base, rol: 'ADMIN' }).success, false);
  assert.equal(createInmobiliariaSchema.safeParse({ ...base, password: 'Should not exist' }).success, false);
});
