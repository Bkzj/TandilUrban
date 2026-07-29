import 'server-only';

import { escapePlainTextForHtml } from '@/lib/escape-html';

const VERDE_OSCURO = '#12422A';
const VERDE = '#1C5E3C';
const GRIS_TEXTO = '#374151';
const GRIS_SUAVE = '#6B7280';
const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop';

export type MatchNotificationProps = {
  titulo: string;
  precioFormatted: string;
  imagenUrl: string | null;
  propiedadUrl: string;
  nombreUsuario?: string;
};

export function renderMatchNotificationHtml(props: MatchNotificationProps): string {
  const saludo = props.nombreUsuario?.trim()
    ? `¡Hola ${escapePlainTextForHtml(props.nombreUsuario.trim())}!`
    : '¡Hola!';

  const titulo = escapePlainTextForHtml(props.titulo);
  const precio = escapePlainTextForHtml(props.precioFormatted);
  const propiedadUrl = escapePlainTextForHtml(props.propiedadUrl);
  const imgSrc = escapePlainTextForHtml(props.imagenUrl?.trim() || PLACEHOLDER_IMG);

  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            <tr>
              <td style="background-color:${VERDE_OSCURO};padding:28px 32px;text-align:center;">
                <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.12em;color:#ffffff;text-transform:uppercase;">PROPEA GROUP</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 24px;">
                <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:${VERDE_OSCURO};">${saludo}</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${GRIS_TEXTO};">
                  Notamos que estuviste buscando propiedades en Propea Group. Acaba de ingresar una nueva opción que coincide con lo que te gusta.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                  <tr>
                    <td>
                      <img src="${imgSrc}" alt="" width="496" style="display:block;width:100%;max-height:220px;object-fit:cover;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 20px 8px;">
                      <p style="margin:0;font-size:17px;font-weight:600;color:${VERDE_OSCURO};line-height:1.35;">${titulo}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px 20px;">
                      <p style="margin:0;font-size:20px;font-weight:700;color:${GRIS_TEXTO};">${precio}</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td align="center">
                      <a href="${propiedadUrl}" style="display:inline-block;background-color:${VERDE};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;">Ver propiedad</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;text-align:center;">
                <p style="margin:0;font-size:12px;color:${GRIS_SUAVE};line-height:1.5;">
                  Recibiste este correo porque guardaste propiedades similares en tus favoritos.<br />
                  Propea Group · Tandil y zona
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
