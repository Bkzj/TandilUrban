# Fase 6D: autenticación TOTP y códigos de recuperación

## Fundamento y alcance

6D conecta la infraestructura publicada en 6A con login y perfil: AES-256-GCM, RFC 6238, challenges hash-only, recovery codes hash-only, versión de sesión y eventos. No agrega SMS, dispositivos confiables, passkeys, bypass por email, reset administrativo ni lista/cierre visual de sesiones; eso queda para 6E o una fase posterior.

## Activación

Desde `/perfil`, una cuenta activa y con versión vigente confirma su contraseña en cada inicio de setup. El servidor genera 20 bytes aleatorios Base32, cifra el secreto con `AUTH_ENCRYPTION_KEY` y reemplaza sólo un setup pendiente; nunca reemplaza una configuración activa. El setup vence según `AUTH_TOTP_CHALLENGE_TTL_SECONDS`.

La URI `otpauth://totp/` usa `AUTH_TOTP_ISSUER`, email normalizado, SHA-1, seis dígitos y 30 segundos. `qrcode` 1.5.4 genera el PNG Data URL localmente: no existe servicio externo. URI, QR y secreto raw no se persisten, registran ni ponen en URLs/browser storage. La clave manual sólo vive en memoria de la pantalla autenticada.

Confirmar el primer TOTP activa la configuración, persiste el step aceptado, crea un batch de `AUTH_RECOVERY_CODE_COUNT`, incrementa `AuthSessionVersion`, invalida challenges y registra eventos en una transacción. Dos confirmaciones paralelas producen una activación y un batch. Los códigos raw se devuelven una sola vez, con copiar/descargar local y reconocimiento explícito; DB guarda únicamente SHA-256 normalizado.

Al finalizar se cierra la sesión actual. Toda sesión anterior a la activación es rechazada por versión.

## Login en dos etapas

`POST /api/auth/two-factor/login/start` confirma email/password y estado actual. Sin TOTP activo, el provider Credentials de 6B continúa igual. Con TOTP activo, crea un challenge `LOGIN` con 32 bytes aleatorios, hash SHA-256, expiración, máximo cinco intentos y snapshot de `sessionVersion`.

Este endpoint no llama a NextAuth para crear sesión. El token opaco permanece sólo en estado React. El provider separado `two-factor` consume challenge y TOTP/recovery atómicamente; recién su resultado exitoso entra en callbacks JWT/session. Una prueba browser abre `/perfil` durante el challenge y confirma que no hay autorización parcial.

TOTP acepta espacios inocuos, conserva ceros iniciales y usa ventana ±1. El `lastAcceptedTimeStep` sólo avanza mediante `UPDATE` condicional: el mismo step concurrente tiene un ganador. Recovery login normaliza, hashea y consume un código junto con el challenge; una carrera produce un único login/evento.

Errores incrementan intentos. Al quinto, el challenge queda terminal y exige contraseña nuevamente. Expiración, desactivación, cambio de versión o cuenta inactiva fallan cerrados.

## Regeneración y desactivación

Regenerar exige sesión/version vigente, contraseña y TOTP fresco. Invalida códigos previos, crea un único batch, incrementa versión, invalida challenges y registra auditoría atómicamente. Dos regeneraciones paralelas no dejan dos batches vigentes. Los nuevos raw se muestran una vez y luego se cierra sesión.

Desactivar exige contraseña y TOTP fresco o recovery code sin usar. La transacción consume el factor, invalida challenges, elimina `TwoFactorConfiguration` (cascada destruye secreto cifrado y códigos), incrementa versión y registra evento. Después se cierra sesión; el próximo login vuelve a password solamente.

Si se pierde el autenticador, los códigos son el único fallback self-service. Perder ambos requiere un futuro proceso de soporte; 6D no debilita 2FA con bypass automático.

## Límites, eventos y notificaciones

- segundo factor: 10 por IP/15 minutos y 5 por challenge/15 minutos;
- setup/confirmación: 5 por usuario/15 minutos;
- regeneración/desactivación: 5 por usuario/15 minutos.

Se reutiliza el backend durable y proxy confiable. Eventos nuevos: `TWO_FACTOR_SETUP_STARTED`, `TWO_FACTOR_CHALLENGE_FAILED`, `TWO_FACTOR_CHALLENGE_COMPLETED`, `RECOVERY_CODE_LOGIN_SUCCEEDED` y `RECOVERY_CODE_LOGIN_FAILED`; se conservan los eventos 6A de enable/disable/regeneración. Metadata no almacena password, código, secret, URI, QR, hash, challenge raw, cookie o autorización.

Emails de activación, desactivación y regeneración contienen sólo la notificación. Se envían después del commit; fallo del proveedor no revierte seguridad. Tests usan adaptador local, sin proveedor pago.

## Migración, smoke y pruebas

`20260803120000_phase6d_two_factor_authentication` agrega `TwoFactorChallenge.sessionVersion`, check/índice y eventos. Preflight aborta ante `User.twoFactorSecret` legacy sin imprimirlo. Rollback reconstruye el enum y elimina la columna sólo antes de uso; un backup es autoritativo después.

`release:smoke` verifica columna, índice, eventos y secretos legacy en lectura, además del baseline audit vigente. No genera secretos/códigos ni escribe.

La dependencia nueva es `qrcode` 1.5.4 (más tipos sólo de desarrollo) para render local. `next-auth` permanece en 4.24.15. La resolución del lock eliminó un peer opcional no usado `@auth/core` 0.34.3/`cookie` 0.6.0; quedan `@auth/core` 0.41.3 y `cookie` 0.7.2. Por eso `npm audit` baja de 4 hallazgos a un high de desarrollo/transitivo (`brace-expansion`), sin `--force` ni upgrade de Auth.js.

Scripts:

- `npm run test:auth-phase6d`
- `npm run test:auth-phase6d:postgres`
- `npm run rehearsal:phase6d`
- `npm run test:auth-phase6d:browser`

PostgreSQL 17 prueba activación, TOTP, recovery y regeneración concurrentes. El E2E recorre setup/QR/manual, códigos one-time, bloqueo previo al segundo factor, login TOTP/recovery, replay y desactivación. Las pantallas reutilizan perfil/login, `PasswordField`, `AuthFeedback`, paleta, tarjetas, foco, `aria-live`, `one-time-code`, inputmode y controles táctiles existentes.

Producción permanece NO-GO hasta 6E y validación manual de staging. No hubo deploy, migración externa, proveedor pago ni tag RC.
