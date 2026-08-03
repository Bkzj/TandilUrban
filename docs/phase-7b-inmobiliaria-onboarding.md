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
