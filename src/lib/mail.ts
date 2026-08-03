import { Resend } from 'resend';

import { escapePlainTextForHtml } from '@/lib/escape-html';
import { renderInvitationEmail } from '@/lib/invitation-email';
import { getServerEnvironment } from '@/lib/validation/environment';
import type { InvitationCopy } from '@/server/admin/invitation-copy';

export type AuthEmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type AuthEmailProvider = 'sink' | 'resend' | 'injected';
export type AuthEmailFailureCategory =
  | 'sink_not_configured'
  | 'sink_unavailable'
  | 'configuration_missing'
  | 'test_network_blocked'
  | 'invalid_api_key'
  | 'unauthorized_sender'
  | 'invalid_recipient'
  | 'rate_limited'
  | 'provider_rejected'
  | 'provider_unavailable';

export type AuthEmailDeliveryResult =
  | { ok: true; delivered: boolean; provider?: AuthEmailProvider; category?: 'accepted' | 'sink_not_configured' }
  | { ok: false; error: Error; provider?: AuthEmailProvider; category?: AuthEmailFailureCategory };

export type AuthEmailAdapter = {
  send(message: AuthEmailMessage): Promise<AuthEmailDeliveryResult>;
};

type AuthEmailAdapterConfiguration = {
  nodeEnv: 'development' | 'test' | 'production';
  provider: 'sink' | 'resend';
  sinkUrl?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
};

type ResendEmailInput = { from: string; to: string; subject: string; html: string; text?: string };
export type AuthResendClient = {
  emails: { send(message: ResendEmailInput): Promise<{ data?: { id?: string } | null; error?: unknown }> };
};
type AuthEmailAdapterDependencies = { resendClientFactory?: (apiKey: string) => AuthResendClient };

function localTestSinkAdapter(url: string, nodeEnv: AuthEmailAdapterConfiguration['nodeEnv']): AuthEmailAdapter | null {
  if (nodeEnv === 'production') return null;
  try {
    const sink = new URL(url);
    if (sink.protocol !== 'http:' || !['127.0.0.1', 'localhost', '::1'].includes(sink.hostname)) {
      return null;
    }
    return {
      async send(message) {
        try {
          const response = await fetch(sink, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(message),
          });
          return response.ok
            ? { ok: true, delivered: true, provider: 'sink', category: 'accepted' }
            : { ok: false, error: new Error('El sink local rechazó el correo.'), provider: 'sink', category: 'sink_unavailable' };
        } catch {
          return { ok: false, error: new Error('El sink local no está disponible.'), provider: 'sink', category: 'sink_unavailable' };
        }
      },
    };
  } catch {
    return null;
  }
}

function failedAdapter(provider: 'sink' | 'resend', category: AuthEmailFailureCategory, message: string): AuthEmailAdapter {
  return { async send() { return { ok: false, error: new Error(message), provider, category }; } };
}

function resendFailureCategory(error: unknown): AuthEmailFailureCategory {
  if (!error || typeof error !== 'object') return 'provider_rejected';
  const record = error as Record<string, unknown>;
  const status = typeof record.statusCode === 'number' ? record.statusCode : undefined;
  const name = typeof record.name === 'string' ? record.name.toLowerCase() : '';
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : '';
  if (status === 401 || name.includes('validation_error') && message.includes('api key')) return 'invalid_api_key';
  if (status === 403 || message.includes('domain') || message.includes('sender')) return 'unauthorized_sender';
  if (status === 422 && (message.includes('recipient') || message.includes('email'))) return 'invalid_recipient';
  if (status === 429) return 'rate_limited';
  if (status !== undefined && status >= 500) return 'provider_unavailable';
  return 'provider_rejected';
}

function validResendSender(value: string): boolean {
  const address = value.match(/<([^<>]+)>$/u)?.[1] ?? value;
  const domain = address.split('@')[1]?.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(address)
    && Boolean(domain)
    && !['example.com', 'example.invalid', 'resend.dev'].some((item) => domain === item || domain?.endsWith(`.${item}`));
}

export function createConfiguredAuthEmailAdapter(
  configuration: AuthEmailAdapterConfiguration,
  dependencies: AuthEmailAdapterDependencies = {},
): AuthEmailAdapter {
  if (configuration.provider === 'sink') {
    const adapter = configuration.sinkUrl ? localTestSinkAdapter(configuration.sinkUrl, configuration.nodeEnv) : null;
    return adapter ?? {
      async send() {
        return { ok: true, delivered: false, provider: 'sink', category: 'sink_not_configured' };
      },
    };
  }

  if (!configuration.resendApiKey?.trim()
    || !/^re_[A-Za-z0-9_-]{8,}$/u.test(configuration.resendApiKey.trim())
    || !configuration.resendFromEmail?.trim()
    || !validResendSender(configuration.resendFromEmail.trim())) {
    return failedAdapter('resend', 'configuration_missing', 'Resend requiere una clave y un remitente autorizado.');
  }
  if (configuration.nodeEnv === 'test' && !dependencies.resendClientFactory) {
    return failedAdapter('resend', 'test_network_blocked', 'Los tests no pueden usar el proveedor de correo real.');
  }

  const createClient = dependencies.resendClientFactory ?? ((apiKey: string): AuthResendClient => {
    const client = new Resend(apiKey);
    return { emails: { send: (message) => client.emails.send(message) } };
  });
  const apiKey = configuration.resendApiKey.trim();
  const from = configuration.resendFromEmail.trim();
  return {
    async send(message) {
      try {
        const result = await createClient(apiKey).emails.send({ from, to: message.to, subject: message.subject, html: message.html, ...(message.text ? { text: message.text } : {}) });
        if (result.error) {
          return { ok: false, error: new Error('El proveedor rechazó el correo.'), provider: 'resend', category: resendFailureCategory(result.error) };
        }
        if (!result.data?.id) {
          return { ok: false, error: new Error('El proveedor no confirmó la aceptación.'), provider: 'resend', category: 'provider_rejected' };
        }
        return { ok: true, delivered: true, provider: 'resend', category: 'accepted' };
      } catch {
        return { ok: false, error: new Error('El proveedor de correo no está disponible.'), provider: 'resend', category: 'provider_unavailable' };
      }
    },
  };
}

export function buildAuthVerificationLink(token: string): string {
  const url = new URL('/api/auth/verify', getServerEnvironment().APP_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

function configuredAuthEmailAdapter(): AuthEmailAdapter {
  const environment = getServerEnvironment();
  return createConfiguredAuthEmailAdapter({
    nodeEnv: environment.NODE_ENV,
    provider: environment.EMAIL_PROVIDER,
    sinkUrl: environment.AUTH_EMAIL_TEST_SINK_URL,
    resendApiKey: environment.RESEND_API_KEY,
    resendFromEmail: environment.RESEND_FROM_EMAIL,
  });
}

export function buildPasswordResetLink(token: string): string {
  const url = new URL('/restablecer-contrasena', getServerEnvironment().APP_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

export function buildAccountInvitationLink(token: string): string {
  const url = new URL('/activar-cuenta', getServerEnvironment().APP_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function sendAccountInvitationEmail(
  input: {
    email: string;
    rawToken: string;
    inmobiliariaName: string;
    role: 'INMOBILIARIA' | 'AGENTE';
    expirationHours: number;
    copy: InvitationCopy;
  },
  adapter: AuthEmailAdapter = configuredAuthEmailAdapter(),
) {
  const rendered = renderInvitationEmail({
    copy: input.copy,
    inmobiliariaName: input.inmobiliariaName,
    role: input.role,
    ctaUrl: buildAccountInvitationLink(input.rawToken),
    expirationHours: input.expirationHours,
  });
  return adapter.send({
    to: input.email,
    ...rendered,
  });
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

export async function sendAccountPasswordResetEmail(
  email: string,
  rawToken: string,
  expirationMinutes: number,
  adapter: AuthEmailAdapter = configuredAuthEmailAdapter(),
) {
  const safeLink = escapePlainTextForHtml(buildPasswordResetLink(rawToken));
  return adapter.send({
    to: email,
    subject: 'Restablecé tu contraseña de Propea Group',
    html: `
      <main style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6">
        <h1 style="font-size:24px">Restablecé tu contraseña</h1>
        <p>Recibimos una solicitud para elegir una nueva contraseña de Propea Group.</p>
        <p><a href="${safeLink}" style="display:inline-block;border-radius:12px;background:#1c5e3c;color:#fff;padding:12px 18px;text-decoration:none">Elegir nueva contraseña</a></p>
        <p>El enlace vence en ${expirationMinutes} minutos y sólo puede usarse una vez.</p>
        <p>Si no solicitaste este cambio, ignorá el mensaje y contactá a soporte si necesitás ayuda.</p>
      </main>
    `,
  });
}

export async function sendPasswordChangedEmail(
  email: string,
  adapter: AuthEmailAdapter = configuredAuthEmailAdapter(),
) {
  return adapter.send({
    to: email,
    subject: 'Tu contraseña fue modificada',
    html: `
      <main style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6">
        <h1 style="font-size:24px">Tu contraseña fue modificada</h1>
        <p>La contraseña de tu cuenta de Propea Group se actualizó correctamente.</p>
        <p>Si no realizaste este cambio, contactá a soporte cuanto antes.</p>
      </main>
    `,
  });
}

async function sendTwoFactorNotification(
  email: string,
  subject: string,
  heading: string,
  detail: string,
  adapter: AuthEmailAdapter = configuredAuthEmailAdapter(),
) {
  return adapter.send({
    to: email,
    subject,
    html: `
      <main style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6">
        <h1 style="font-size:24px">${heading}</h1>
        <p>${detail}</p>
        <p>Si no realizaste esta acción, contactá a soporte cuanto antes.</p>
      </main>
    `,
  });
}

export function sendTwoFactorEnabledEmail(email: string, adapter?: AuthEmailAdapter) {
  return sendTwoFactorNotification(email, 'Verificación en dos pasos activada', 'Verificación en dos pasos activada', 'Tu cuenta ahora solicitará un segundo factor al iniciar sesión.', adapter);
}

export function sendTwoFactorDisabledEmail(email: string, adapter?: AuthEmailAdapter) {
  return sendTwoFactorNotification(email, 'Verificación en dos pasos desactivada', 'Verificación en dos pasos desactivada', 'Tu cuenta dejó de solicitar el segundo factor.', adapter);
}

export function sendRecoveryCodesRegeneratedEmail(email: string, adapter?: AuthEmailAdapter) {
  return sendTwoFactorNotification(email, 'Códigos de recuperación regenerados', 'Códigos de recuperación regenerados', 'Los códigos anteriores dejaron de ser válidos.', adapter);
}
