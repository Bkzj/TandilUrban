# Fase 7B: onboarding de inmobiliarias y administradores

## Alcance y flujo de ADMIN

La Fase 7B completa el alta principal desde `/admin/inmobiliarias`: **Nueva inmobiliaria** abre `/admin/inmobiliarias/nueva`, donde el ADMIN carga los datos reales soportados por el modelo (`nombre`, `CUIT` y `dirección`) y el nombre completo y correo del administrador. Teléfono y correo comercial no se inventaron porque no existen en el esquema actual.

Antes de confirmar se muestra un resumen y se aclara que el administrador recibirá un correo para configurar su propia contraseña. El servidor fuerza `rol=INMOBILIARIA`; no acepta rol, tenant, estado ni contraseña elegidos por el cliente.

La transacción serializable crea `Inmobiliaria`, `User`, relación 1:1, `AuthSessionVersion`, `AccountInvitation` y eventos de seguridad. El envío se realiza únicamente después del commit. Si PostgreSQL falla no hay tenant ni cuenta parcial y no se llama al proveedor editorial ni al correo.

## Cuentas existentes

- Una cuenta `USUARIO_NORMAL` sin tenant requiere una confirmación explícita del ADMIN. La transición, asignación, invalidación de sesiones/challenges e invitación se hacen transaccionalmente.
- Una cuenta `AGENTE` o `INMOBILIARIA`, una cuenta ya asignada, o un `ADMIN` global producen un conflicto; nunca se reasignan ni degradan silenciosamente.
- La relación actual admite un administrador principal por inmobiliaria (`Inmobiliaria.userId` único). No se habilitaron múltiples propietarios sin un cambio deliberado del producto.

## Invitación segura

Nunca se genera, persiste ni envía una contraseña en texto plano. El token de invitación es aleatorio, URL-safe y de un solo uso; PostgreSQL conserva únicamente su SHA-256. El valor raw vive transitoriamente en memoria y sólo se inserta en el `href` del CTA por el backend.

`ACCOUNT_INVITATION_TTL_HOURS` controla la vigencia (48 horas por defecto, rango 1–168). Los estados administrativos se derivan de la invitación y del envío: `Pendiente`, `Aceptada`, `Vencida`, `Invalidada` o `Error de envío`.

Reenviar invalida todas las invitaciones pendientes del mismo usuario, crea un token nuevo, aplica rate limit y registra eventos. El enlace anterior deja de funcionar. La aceptación es serializable y concurrente: exactamente una solicitud puede consumir la invitación, definir bcrypt, verificar/activar la cuenta, confirmar rol y tenant, incrementar la versión y registrar el evento.

## Correo Propea Group

El renderer determinista produce HTML conservador y alternativa de texto plano. Usa la identidad existente: verde profundo `#12422a`, acento dorado `#957327`, fondo claro, tipografía de sistema, tabla compatible con clientes y CTA táctil. No contiene JavaScript, formularios, píxeles de tracking ni CSS avanzado. Todo texto variable se escapa.

El correo explica la administración de publicaciones y agentes, la expiración y el uso único. El token no aparece en asunto, preview, logs, analítica ni texto visible; sólo en el enlace HTTPS confiable construido desde `APP_URL`.

### Selección explícita del transporte

El transporte nunca se infiere por la mera presencia de una clave:

- `EMAIL_PROVIDER=sink` es el default seguro de desarrollo y CI. Con `AUTH_EMAIL_TEST_SINK_URL` envía el mensaje a un receptor HTTP de loopback; sin URL no contacta ninguna red externa y reporta entrega pendiente. **No envía a Gmail.**
- `EMAIL_PROVIDER=resend` es el único modo que puede contactar Resend. Exige `RESEND_API_KEY` y `RESEND_FROM_EMAIL`; el remitente debe pertenecer a un dominio autorizado en la cuenta de Resend. `example.com`, `resend.dev` y otros placeholders se rechazan.
- `NODE_ENV=test` bloquea el cliente Resend real incluso si el entorno se configuró incorrectamente. Las pruebas sólo pueden usar un cliente fake inyectado.
- Producción y el smoke de staging exigen explícitamente `EMAIL_PROVIDER=resend`.

Los resultados se reducen a categorías seguras (`invalid_api_key`, `unauthorized_sender`, `invalid_recipient`, `rate_limited`, `provider_unavailable` o rechazo genérico). No se persiste la respuesta raw. El log sólo incluye provider, template, resultado, categoría segura y request ID; nunca destinatario, body, token, URL ni clave.

En desarrollo, la UI distingue **Invitación capturada por el buzón local de desarrollo** de una entrega aceptada por Resend. Esta indicación no se incluye en las respuestas de producción.

## Asistencia editorial de Gemini

`InvitationCopyProvider` desacopla negocio y proveedor. `GeminiInvitationCopyProvider` sólo está habilitado explícitamente con `INVITATION_GEMINI_ENABLED=true`; en desarrollo, pruebas y por defecto se usa la copia determinista.

Los únicos datos permitidos son:

- marca fija: Propea Group;
- nombre de pila/display del administrador;
- nombre público de la inmobiliaria;
- rol editorial (`INMOBILIARIA` o `AGENTE`);
- idioma y tono fijos en la instrucción del servidor.

No se envían correo, IDs, token, URL, password, sesiones, cookies, headers, TOTP, recovery codes ni metadata de base de datos. Gemini genera sólo JSON estructurado con `subject`, `greeting`, `intro`, `roleSummary` y `closing`. El esquema rechaza campos extra, HTML, Markdown, URLs, caracteres de control y longitudes excesivas. La aplicación escapa el resultado y agrega su propio CTA.

Gemini genera únicamente redacción; nunca recibe secretos de autenticación, tokens de invitación ni autoridad de autorización. Timeout, error o respuesta inválida se descartan y activan la copia fallback. La creación y el envío no dependen de Gemini.

## Fallos y reintentos

- **Base falla:** rollback completo; no Gemini ni correo.
- **Gemini falla:** fallback determinista y envío normal.
- **Correo falla:** tenant, administrador e invitación permanecen; `deliveryStatus=FAILED`, evento seguro y botón **Reenviar invitación**.
- **Concurrencia:** una aceptación gana y el replay se informa genéricamente como inválido.

No se registran bodies de correo, URLs completas, tokens, contraseñas ni respuestas raw de Gemini.

## Panel y permisos

`/admin/inmobiliarias` muestra estado, administrador, agentes, publicaciones y acceso al detalle. `/admin/inmobiliarias/[id]` muestra datos, vigencia/estado de invitación y acciones seguras de reenvío y desactivación.

Una vez aceptada, la cuenta `INMOBILIARIA` accede sólo a su tenant: administra propiedades y puede invitar `AGENTE`; no accede a otro tenant, a `/admin`, no crea un `ADMIN` ni otra inmobiliaria. La invitación de agentes reutiliza token hash-only, correo de marca y password elegido por el destinatario.

## Límites, eventos y operación

Crear inmobiliaria usa el límite administrativo existente; reenvío usa 5 operaciones por usuario cada 15 minutos. La aceptación conserva sus límites de identidad/origen. Si Gemini se habilitara por HTTP en el futuro deberá añadirse una cuota propia; hoy no existe endpoint de prompt ni preview con proveedor.

Eventos: `INMOBILIARIA_CREATED`, `INMOBILIARIA_ADMIN_CREATED`, `ACCOUNT_INVITATION_CREATED`, `ACCOUNT_INVITATION_SENT`, `ACCOUNT_INVITATION_RESENT`, `ACCOUNT_INVITATION_ACCEPTED` y `ACCOUNT_INVITATION_SEND_FAILED`. Sólo contienen relaciones actor/target/tenant y metadata saneada.

La migración `20260806120000_phase7b_inmobiliaria_onboarding` agrega estado/fechas de entrega y eventos. Incluye preflight, rollback estructural y README. Los rehearsals cubren base vacía, upgrade, rollback y drift cero.

## Validación y staging pendiente

Las pruebas unitarias cubren contrato editorial, fallback, escape, HTML/texto y estados. PostgreSQL 17 cubre transacción, rollback por conflicto, confirmación de cuenta existente, reenvío y aceptación concurrente. El E2E usa ADMIN y cuentas ficticias, buzón HTTP local y Gemini deshabilitado: alta, correo, invalidación del primer enlace, aceptación, login `INMOBILIARIA`, invitación de agente y aislamiento tenant.

Antes de producción resta validar manualmente en staging: HTTPS/`APP_URL`, proveedor de correo y dominio remitente, render en Gmail/Outlook/Apple Mail, backend durable de rate limit, migración/backup, observabilidad de fallos y —si se habilita— cuota y credencial Gemini aisladas. Producción continúa **NO-GO** hasta completar ese gate.

## QA manual con un buzón externo

Esta prueba es deliberadamente manual y nunca forma parte de `npm test` ni CI:

1. Crear o seleccionar una API key de Resend destinada al entorno local de QA.
2. Verificar el dominio remitente en Resend y configurar, sin commitear, `RESEND_FROM_EMAIL="Propea Group <invitaciones@dominio-verificado>"`.
3. Configurar `EMAIL_PROVIDER="resend"` y `RESEND_API_KEY` en `.env`; eliminar o ignorar `AUTH_EMAIL_TEST_SINK_URL`.
4. Mantener `INVITATION_GEMINI_ENABLED="false"` si sólo se quiere validar correo.
5. Reiniciar completamente `npm run dev` para recargar el entorno y ejecutar el predev de migraciones.
6. Crear una inmobiliaria o usar **Reenviar invitación** con el Gmail elegido manualmente.
7. Confirmar en logs sólo `provider=resend`, `template=account_invitation` y `deliveryResult=success`; revisar también el panel de Resend.
8. Revisar entrada y spam del destinatario, abrir el enlace, elegir contraseña y comprobar el login `INMOBILIARIA`.
9. Restaurar `EMAIL_PROVIDER="sink"` al terminar el QA local.

Nunca commitear `.env`, la API key, el destinatario real ni el contenido del mensaje.
