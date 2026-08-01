import { Resend } from 'resend';

import { escapePlainTextForHtml } from '@/lib/escape-html';
import { getServerEnvironment } from '@/lib/validation/environment';

export const AUTH_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'Propea Group <onboarding@resend.dev>';

export type AuthEmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export type AuthEmailAdapter = {
  send(message: AuthEmailMessage): Promise<
    | { ok: true; delivered: boolean }
    | { ok: false; error: Error }
  >;
};

export function buildAuthVerificationLink(token: string): string {
  const url = new URL('/api/auth/verify', getServerEnvironment().APP_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

function configuredAuthEmailAdapter(): AuthEmailAdapter {
  return {
    async send(message) {
      const apiKey = process.env.RESEND_API_KEY?.trim();
      if (!apiKey) {
        if (process.env.NODE_ENV !== 'production') return { ok: true, delivered: false };
        return { ok: false, error: new Error('Proveedor de correo no configurado.') };
      }
      try {
        const resend = new Resend(apiKey);
        const result = await resend.emails.send({
          from: AUTH_FROM_EMAIL,
          to: message.to,
          subject: message.subject,
          html: message.html,
        });
        return result.error
          ? { ok: false, error: new Error('El proveedor rechazó el correo.') }
          : { ok: true, delivered: true };
      } catch {
        return { ok: false, error: new Error('El proveedor de correo no está disponible.') };
      }
    },
  };
}

export async function sendVerificationEmail(
  email: string,
  rawToken: string,
  adapter: AuthEmailAdapter = configuredAuthEmailAdapter(),
  expirationHours = 24,
) {
  const link = buildAuthVerificationLink(rawToken);
  const safeLink = escapePlainTextForHtml(link);
  return adapter.send({
    to: email,
    subject: 'Verificá tu cuenta de Propea Group',
    html: `
      <main style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6">
        <h1 style="font-size:24px">Verificá tu cuenta</h1>
        <p>Usá el siguiente enlace para confirmar tu correo y completar el registro en Propea Group.</p>
        <p><a href="${safeLink}" style="display:inline-block;border-radius:12px;background:#1c5e3c;color:#fff;padding:12px 18px;text-decoration:none">Verificar mi cuenta</a></p>
        <p>El enlace vence en ${expirationHours} horas y sólo puede usarse una vez.</p>
        <p>Si no solicitaste esta cuenta, podés ignorar este mensaje.</p>
      </main>
    `,
  });
}
