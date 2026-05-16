import { Resend } from 'resend';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Remitente (dominio verificado en producción). Resend trial: onboarding@resend.dev */
const defaultFrom = 'Tandil Urban <onboarding@resend.dev>';

/**
 * Si está definida, todos los correos se envían solo a esta bandeja (útil en desarrollo /
 * cuenta Resend gratuita). En producción, omitila para usar los mails reales del cliente y del equipo.
 */
function devNotificationInbox(): string | undefined {
  return process.env.LEAD_NOTIFICATION_TO_EMAIL?.trim() || undefined;
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export type EnviarMailNotificacionLeadParams = {
  agenteEmail: string | null | undefined;
  adminEmail: string;
  clienteEmail: string;
  /** Nombre del interesado (asunto interno "Nuevo Lead de …"). */
  nombreLead: string;
  telefonoLead?: string | null;
  propiedadTitulo: string;
  mensaje: string;
};

export type EnviarMailNotificacionLeadResult = {
  ok: boolean;
  skipped?: boolean;
  errors?: string[];
};

/**
 * Envía el mail de confirmación al cliente y la alerta al equipo (agente + dueño de inmobiliaria).
 * Estructura lista para producción; con `LEAD_NOTIFICATION_TO_EMAIL` redirige todo a un solo inbox.
 */
export async function enviarMailNotificacionLead(
  params: EnviarMailNotificacionLeadParams
): Promise<EnviarMailNotificacionLeadResult> {
  const resend = getResend();
  if (!resend) {
    console.warn('[resend] RESEND_API_KEY no configurada; se omite el envío de mails.');
    return { ok: true, skipped: true };
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || defaultFrom;
  const devInbox = devNotificationInbox();

  const clienteTo = devInbox ?? params.clienteEmail.trim();

  const internalRaw = [params.adminEmail, params.agenteEmail].filter(
    (e): e is string => typeof e === 'string' && e.includes('@')
  );
  const internalUnique = [...new Set(internalRaw.map((e) => e.trim().toLowerCase()))].map((low) => {
    const found = internalRaw.find((e) => e.trim().toLowerCase() === low);
    return found ?? low;
  });

  const internalTo = devInbox ? [devInbox] : internalUnique;
  if (!devInbox && internalTo.length === 0) {
    console.warn('[resend] Sin destinatarios internos; solo se intenta mail al cliente.');
  }

  const titulo = escapeHtml(params.propiedadTitulo);
  const mensaje = escapeHtml(params.mensaje);
  const nombre = escapeHtml(params.nombreLead);
  const tel =
    params.telefonoLead && params.telefonoLead.trim() !== ''
      ? escapeHtml(params.telefonoLead.trim())
      : null;

  const htmlCliente = `
    <p>Hola ${nombre},</p>
    <p>Recibimos tu consulta por la propiedad <strong>${titulo}</strong>.</p>
    <p>Nuestro equipo la revisará y se pondrá en contacto a la brevedad.</p>
    <p>Tu mensaje:</p>
    <blockquote style="border-left:4px solid #e5e7eb;padding-left:12px;margin:12px 0;">${mensaje.replace(/\n/g, '<br/>')}</blockquote>
    <p>Gracias por confiar en Tandil Urban.</p>
  `.trim();

  const htmlInterno = `
    <p><strong>Nuevo lead</strong> de <strong>${nombre}</strong> para <strong>${titulo}</strong>.</p>
    <ul>
      <li>Email: ${escapeHtml(params.clienteEmail.trim())}</li>
      ${tel ? `<li>Teléfono: ${tel}</li>` : ''}
    </ul>
    <p>Mensaje:</p>
    <blockquote style="border-left:4px solid #f97316;padding-left:12px;margin:12px 0;">${mensaje.replace(/\n/g, '<br/>')}</blockquote>
  `.trim();

  const errors: string[] = [];

  try {
    const [r1, r2] = await Promise.allSettled([
      resend.emails.send({
        from,
        to: [clienteTo],
        subject: `Recibimos tu consulta por ${params.propiedadTitulo}`,
        html: htmlCliente,
      }),
      internalTo.length > 0
        ? resend.emails.send({
            from,
            to: internalTo,
            subject: `Nuevo lead de ${params.nombreLead} — ${params.propiedadTitulo}`,
            html: htmlInterno,
          })
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (r1.status === 'rejected') {
      errors.push(`Cliente: ${r1.reason}`);
    } else if (r1.value.error) {
      errors.push(`Cliente: ${JSON.stringify(r1.value.error)}`);
    }

    if (r2.status === 'rejected') {
      errors.push(`Interno: ${r2.reason}`);
    } else if (typeof r2.value === 'object' && r2.value && 'error' in r2.value && r2.value.error) {
      errors.push(`Interno: ${JSON.stringify(r2.value.error)}`);
    }

    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[resend] enviarMailNotificacionLead:', msg);
    return { ok: false, errors: [msg] };
  }
}
