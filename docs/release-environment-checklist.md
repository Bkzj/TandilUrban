# Checklist de entorno de staging

No registrar valores de esta lista en tickets, logs ni documentación. Usar un gestor de secretos y nombres de variables solamente.

| Variable | Validación de staging |
| --- | --- |
| `DATABASE_URL` | PostgreSQL aislado, TLS si sale de la red privada y nunca producción. |
| `NEXTAUTH_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL` | HTTPS, mismo origen público de staging. `NEXT_PUBLIC_APP_URL` se fija durante el build. |
| `NEXTAUTH_SECRET` | mínimo 32 bytes aleatorios, no placeholder. |
| `APP_INTERNAL_URL` | HTTPS y sólo el origen interno confiable de staging; no se construye desde `Host`. |
| `VIEW_TRACKING_SECRET` | mínimo 32 bytes aleatorios y distinto de `NEXTAUTH_SECRET`. |
| `PDF_ALLOWED_ORIGINS` | lista mínima de orígenes HTTPS exactos, por ejemplo el subdominio Cloudinary de staging. |
| `PUPPETEER_DISABLE_SANDBOX` | `false`, salvo aislamiento equivalente documentado. |
| `PUPPETEER_EXECUTABLE_PATH` | ejecutable Chrome/Chromium presente en la imagen de staging. |
| `RATE_LIMIT_BACKEND` | `postgresql`; `memory` no es válido para staging multiinstancia. |
| `RATE_LIMIT_TRUSTED_IP_HEADER` | sólo `x-vercel-forwarded-for` o `cf-connecting-ip`, según el proxy realmente desplegado. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | proyecto de staging con presupuesto/cuotas mínimos; ninguna credencial productiva. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | cuenta o carpeta de staging aislada de producción. |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | `sink` es el default local/CI y no llega a Gmail. Staging/producción deben usar `resend`, clave aislada y remitente de dominio verificado. |
| `LEAD_NOTIFICATION_TO_EMAIL`, `MATCH_NOTIFICATION_TO_EMAIL` | buzones de prueba aprobados, nunca clientes. |

La validación de runtime falla cerrada en producción si faltan base de datos, URLs, secretos de autenticación/visualización, Cloudinary, Resend o el backend PostgreSQL de rate limit. Antes de promover, ejecutar `npm run release:smoke` con secretos inyectados por el gestor: no imprime valores y no envía correo ni invoca Gemini. Los flags `--check-email-provider` y `--check-gemini-provider` requieren una aprobación explícita del operador y una cuenta de staging.

Confirmar además que no se reutilizan carpetas Cloudinary de producción, que los dominios HTTPS coinciden con los certificados desplegados y que el header de IP sólo lo inserta el proxy confiable.
