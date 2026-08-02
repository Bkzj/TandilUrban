# Fase 6C: recuperación y cambio de contraseña

## Alcance y brechas previas

Fase 6C completa `solicitar recuperación → recibir email → consumir enlace una vez → elegir contraseña → volver a iniciar sesión` y el cambio autenticado dentro de `/perfil`. Antes de esta fase 6A sólo aportaba la tabla y repositorios internos; no existían rutas, email, páginas ni una transacción integral que invalidara sesiones.

Quedan fuera TOTP interactivo, challenge de login, recovery-code login/gestión y cierre manual de sesiones. Esos controles pertenecen a 6D–6E.

## Política de contraseña

Se conserva la política publicada: 8–128 caracteres y bcrypt costo 12. El servidor no recorta ni normaliza Unicode; compara confirmación y conserva exactamente el texto antes del hash. Se rechaza reutilizar la contraseña actual mediante bcrypt. No se crea historial de contraseñas ni se imponen reglas arbitrarias de mayúsculas o símbolos.

## Solicitud y token

`POST /api/auth/password-reset/request` valida tamaño/JSON/esquema, normaliza el email como 6B y aplica límites de 5 solicitudes por IP/hora y 3 por identidad hashada/hora. La respuesta 202 y su texto son iguales para cuenta elegible, desconocida, inactiva o no verificada. Sólo una cuenta activa y verificada recibe token.

El token usa 32 bytes aleatorios, Base64 URL-safe y SHA-256 en persistencia. El raw vive sólo lo necesario para construir el mensaje. La transacción invalida pendientes anteriores, crea el hash con expiración `AUTH_PASSWORD_RESET_TTL_MINUTES` y registra auditoría; el envío ocurre después del commit. No se reactiva ninguna cuenta.

El email español se envía por la abstracción existente y construye `/restablecer-contrasena?token=...` exclusivamente desde `APP_URL`; no usa Host/Forwarded Host, tracking, IDs internos ni metadata. Tests usan adaptador en memoria o sink HTTP exclusivamente loopback/no-production, nunca Resend real.

## Reset transaccional e invalidación

`POST /api/auth/password-reset/consume` usa SHA-256 de costo fijo para localizar el token y un mensaje único para formato, token desconocido, vencido, consumido o invalidado. Limita 10 intentos por IP y 5 por hash de token cada 15 minutos.

La transacción hace un `UPDATE` condicional del token, actualiza el hash y `passwordChangedAt` con control optimista, invalida los demás tokens y challenges pendientes, incrementa `AuthSessionVersion` y registra los eventos. Dos operaciones paralelas obtienen exactamente un éxito; un conflicto revierte todos los cambios. No inicia sesión automáticamente.

Rol, tenant, estado activo/verificado, configuración TOTP cifrada y recovery codes no se modifican. Una cuenta con TOTP sigue fail-closed hasta 6D. La notificación “Tu contraseña fue modificada” se intenta luego del commit; su fallo no revierte el cambio.

## Cambio autenticado

`POST /api/auth/password/change` exige sesión NextAuth válida, usuario activo, versión vigente, contraseña actual correcta y confirmación exacta. Aplica 10 intentos por IP y 5 por usuario hashado cada 15 minutos. La transacción actualiza bcrypt/`passwordChangedAt`, invalida resets y challenges, incrementa la versión y registra auditoría.

La política elegida es invalidar todas las sesiones, incluida la actual. La UI llama el sign-out administrado por NextAuth y vuelve a `/login?passwordChanged=1`; no se implementó un rebind complejo del JWT.

## Eventos y privacidad

La migración `20260802120000_phase6c_password_recovery` agrega al enum cerrado `PASSWORD_RESET_COMPLETED` y `PASSWORD_CHANGE_FAILED`. También se usan eventos publicados en 6A para solicitud/creación/consumo/invalidez de tokens, cambio de contraseña, challenges invalidados y versión incrementada. Metadata no contiene email raw, passwords, confirmaciones, token/hash, cookies, autorización ni body.

El preflight informa sólo cantidades y aborta ante hashes de reset que no sean SHA-256 hex. El rollback reconstruye el enum anterior únicamente si no existen eventos 6C; con historial exige restaurar backup. No es recuperación de datos de seguridad.

## UI, seguridad de transporte y accesibilidad

Se reutilizan `PasswordField`, `AuthFeedback`, tarjetas redondeadas, tipografía, gradientes verde/naranja, espaciado, foco y breakpoints de login/registro. Se agregan `/olvide-mi-contrasena`, `/restablecer-contrasena`, el enlace desde login y una sección acotada dentro de `/perfil`. La antigua ruta incompleta `/perfil/seguridad`, eliminada en Fase 4, no fue reintroducida.

Los formularios tienen labels, autocompletes `email`, `current-password` y `new-password`, toggle accesible, feedback `aria-live`, foco en estados, controles táctiles, loading y prevención de doble submit. Las mutaciones custom exigen JSON acotado, Origin confiable cuando está presente y `Sec-Fetch-Site` same-origin/none. No se cambió CSRF/cookies de NextAuth ni se crearon cookies paralelas. Los redirects conservan el allowlist de 6B.

## Pruebas y PostgreSQL 17

Scripts:

- `npm run test:auth-phase6c`: esquemas, password exacto, tokens, emails, respuesta genérica, límites y origen.
- `npm run test:auth-phase6c:postgres`: servicios con PostgreSQL 17 real y carreras paralelas.
- `npm run rehearsal:phase6c`: 20 migraciones desde vacío, diff cero, upgrade representativo, preflight negativo y rollback.
- `npm run test:auth-phase6c:browser`: Chromium, PostgreSQL y mailbox loopback descartables.

La carrera de reset produce un cambio, un consumo, un incremento y un evento completado. La carrera de cambio autenticado produce un ganador por control optimista. El upgrade conserva hash bcrypt, rol, tenant, propiedad, contacto, moneda/monto, reset y versión. El fixture inválido aborta antes del enum sin imprimir el valor. Los contenedores se eliminan al finalizar.

## Pendiente

6D debe implementar challenge TOTP y recovery codes para login/configuración. 6E debe completar administración y cierre manual de sesiones. Staging debe validar HTTPS/cookies, backend durable de rate limit, sink aprobado, tiempos reales del proveedor y observabilidad. Producción permanece NO-GO; no hubo deploy, migración externa, proveedor pago ni tag RC.
