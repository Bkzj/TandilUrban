import 'server-only';

import { Resend } from 'resend';

const defaultFrom = 'Propea Group <onboarding@resend.dev>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function devInbox(): string | undefined {
  return process.env.MATCH_NOTIFICATION_TO_EMAIL?.trim() ||
    process.env.LEAD_NOTIFICATION_TO_EMAIL?.trim() ||
    undefined;
}

export type EnviarMatchNotificationParams = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Envía el mail de match. Sin RESEND_API_KEY hace console.log (desarrollo).
 */
export async function enviarMatchNotificationEmail(
  params: EnviarMatchNotificationParams,
): Promise<void> {
  const resend = getResend();
  const to = devInbox() ?? params.to;

  if (!resend) {
    console.log('[match-engine] Enviando mail a:', to);
    console.log('[match-engine] Asunto:', params.subject);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || defaultFrom;

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(typeof error === 'object' ? JSON.stringify(error) : String(error));
  }

  if (devInbox() && devInbox() !== params.to) {
    console.info(`[match-engine] Mail redirigido a ${devInbox()} (destino real: ${params.to})`);
  }
}
