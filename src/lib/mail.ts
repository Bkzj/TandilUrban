import { Resend } from 'resend';

/** Remite todos los mails de Auth (aligned con RESEND_FROM_EMAIL del proyecto). */
export const AUTH_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'Propea Group <onboarding@resend.dev>';

function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function getAppBase(): string {
  const base =
    process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

/** URL absoluta para completar verificación tras registro (útil también en logs de desarrollo). */
export function buildAuthVerificationLink(token: string): string {
  return `${getAppBase()}/api/auth/verify?token=${encodeURIComponent(token)}`;
}

function logDevFallback(kind: string, extra?: unknown): void {
  console.warn('\n⚠️ [DEV FALLBACK] Correo de auth no enviado por Resend (sandbox / error).');
  console.warn(`⚠️ [DEV FALLBACK] ${kind}.`);
  if (extra !== undefined) console.warn('⚠️ [DEV FALLBACK] Detalle:', extra);
}

type SendAuthEmailResult =
  | { ok: true; delivered: true }
  | { ok: true; delivered: false; reason: 'dev_fallback' | 'missing_api_key' }
  | { ok: false; error: Error };

async function sendWithResendOrDevFallback(opts: {
  to: string;
  subject: string;
  html: string;
  devLinkLabel: string;
  fallbackUrlForLog: string;
}): Promise<SendAuthEmailResult> {
  const from = AUTH_FROM_EMAIL;
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    if (isDev()) {
      logDevFallback(opts.devLinkLabel, 'RESEND_API_KEY no definida');
      return { ok: true, delivered: false, reason: 'missing_api_key' };
    }
    return { ok: false, error: new Error('RESEND_API_KEY no está definida.') };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    if (error) {
      if (isDev()) {
        logDevFallback(opts.devLinkLabel, error);
        return { ok: true, delivered: false, reason: 'dev_fallback' };
      }
      return {
        ok: false,
        error: new Error(
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: string }).message)
            : 'No se pudo enviar el correo.'
        ),
      };
    }

    return { ok: true, delivered: true };
  } catch (e) {
    if (isDev()) {
      logDevFallback(opts.devLinkLabel, e);
      return { ok: true, delivered: false, reason: 'dev_fallback' };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: new Error(msg) };
  }
}

/** Envío del mail de verificación de cuenta tras el registro. En desarrollo no lanza ante fallos de Resend. */
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<SendAuthEmailResult> {
  const link = buildAuthVerificationLink(token);
  return sendWithResendOrDevFallback({
    to: email,
    subject: 'Verifica tu cuenta en Propea Group',
    html: `
      <p>Hola,</p>
      <p>Para verificar tu cuenta en Propea Group, usá este enlace:</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></p>
      <p>Si no solicitaste este registro, podés ignorar este correo.</p>
    `,
    devLinkLabel: 'Link de verificación',
    fallbackUrlForLog: link,
  });
}
