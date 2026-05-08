import { Resend } from 'resend';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no está definida.');
  }
  return new Resend(apiKey);
}

function verificationUrl(token: string): string {
  const base =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000';
  const trimmed = base.replace(/\/$/, '');
  return `${trimmed}/api/auth/verify?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM ?? 'TandilUrban <onboarding@resend.dev>';
  const link = verificationUrl(token);

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: 'Verifica tu cuenta en TandilUrban',
    html: `
      <p>Hola,</p>
      <p>Para verificar tu cuenta en TandilUrban, usá este enlace:</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></p>
      <p>Si no solicitaste este registro, podés ignorar este correo.</p>
    `,
  });

  if (error) {
    console.error('[mail] Resend:', error);
    throw new Error(error.message ?? 'No se pudo enviar el correo de verificación.');
  }
}
