import { escapePlainTextForHtml } from '@/lib/escape-html';
import type { InvitationCopy } from '@/server/admin/invitation-copy';

export type InvitationEmailInput = Readonly<{
  copy: InvitationCopy;
  inmobiliariaName: string;
  role: 'INMOBILIARIA' | 'AGENTE';
  ctaUrl: string;
  expirationHours: number;
}>;

export function renderInvitationEmail(input: InvitationEmailInput): { subject: string; html: string; text: string } {
  const safe = {
    subject: input.copy.subject,
    greeting: escapePlainTextForHtml(input.copy.greeting),
    intro: escapePlainTextForHtml(input.copy.intro),
    roleSummary: escapePlainTextForHtml(input.copy.roleSummary),
    closing: escapePlainTextForHtml(input.copy.closing),
    inmobiliaria: escapePlainTextForHtml(input.inmobiliariaName),
    ctaUrl: escapePlainTextForHtml(input.ctaUrl),
  };
  const abilities = input.role === 'INMOBILIARIA'
    ? ['Gestionar las publicaciones de tu inmobiliaria', 'Administrar e invitar agentes', 'Mantener actualizada la información de la inmobiliaria']
    : ['Trabajar con las publicaciones asignadas', 'Mantener actualizada la información autorizada'];
  const abilityRows = abilities.map((ability) => `<tr><td style="padding:5px 0;color:#1f2937;font-size:15px;line-height:1.5">• ${escapePlainTextForHtml(ability)}</td></tr>`).join('');
  const textAbilities = abilities.map((ability) => `• ${ability}`).join('\n');
  return {
    subject: input.copy.subject,
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#f5f6f4;padding:0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6f4"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden"><tr><td style="background:#12422a;padding:26px 32px;color:#ffffff"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;color:#f6eedb">PROPEA GROUP</div><h1 style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:25px;line-height:1.25">Invitación para ${input.role === 'INMOBILIARIA' ? 'administrar una inmobiliaria' : 'integrar una inmobiliaria'}</h1></td></tr><tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1f2937"><p style="margin:0 0 16px;font-size:17px;line-height:1.55">${safe.greeting}</p><p style="margin:0 0 20px;font-size:15px;line-height:1.65">${safe.intro}</p><div style="margin:20px 0;padding:18px;border-left:4px solid #957327;background:#f6eedb"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#6d531a">INMOBILIARIA</div><div style="margin-top:5px;font-size:20px;font-weight:700;color:#12422a">${safe.inmobiliaria}</div></div><p style="margin:0 0 12px;font-size:15px;line-height:1.65">${safe.roleSummary}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px">${abilityRows}</table><p style="margin:0 0 24px;font-size:15px;line-height:1.65">${safe.closing}</p><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:10px;background:#957327"><a href="${safe.ctaUrl}" style="display:inline-block;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">Configurar mi cuenta</a></td></tr></table><p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280">Este enlace es personal, vence en ${input.expirationHours} horas y puede utilizarse una sola vez.</p><p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#6b7280">Si no esperabas esta invitación, podés ignorar este correo.</p></td></tr><tr><td style="padding:20px 32px;background:#12422a;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#f6eedb">PROPEA GROUP</td></tr></table></td></tr></table></body></html>`,
    text: `PROPEA GROUP\n\n${input.copy.greeting}\n\n${input.copy.intro}\n\n${input.inmobiliariaName}\n\n${input.copy.roleSummary}\n${textAbilities}\n\n${input.copy.closing}\n\nConfigurar mi cuenta: ${input.ctaUrl}\n\nEste enlace es personal, vence en ${input.expirationHours} horas y puede utilizarse una sola vez.\nSi no esperabas esta invitación, podés ignorar este correo.\n\nPROPEA GROUP`,
  };
}
