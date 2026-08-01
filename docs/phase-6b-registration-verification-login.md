# Fase 6B: registro, verificación y login normal

## Alcance y comportamiento anterior

Fase 6B completa el ciclo público normal `crear cuenta → verificar correo → iniciar sesión → cerrar sesión`. Antes de esta fase existían formularios y rutas básicas, pero el registro revelaba diferencias de estado, la verificación eliminaba filas sin un estado atómico explícito, el JWT conservaba rol sin una versión persistente y una cuenta con 2FA habilitado podía entrar sin challenge.

Esta fase reutiliza el fundamento de 6A y no implementa TOTP interactivo, recovery-code login, recuperación/cambio de contraseña ni pantallas de seguridad. Esos flujos permanecen en 6C–6E.

## Registro

`POST /api/auth/register` valida tamaño y un esquema estricto para `nombre`, `email`, `password` y `passwordConfirmation`. El email se normaliza con NFKC, espacios y minúsculas; la contraseña no se recorta ni normaliza. bcrypt se ejecuta con costo 12 antes de resolver duplicados para reducir diferencias temporales observables.

La transacción crea exclusivamente un `USUARIO_NORMAL`, activo según la política existente pero no verificado, sin inmobiliaria, agencia ni membresía privilegiada. En la misma transacción crea `AuthSessionVersion` en cero, un `VerificationToken` hash-only y eventos `REGISTRATION`/`VERIFICATION_REQUESTED`. La unicidad normalizada y la restricción única impiden duplicados concurrentes. La respuesta pública es siempre genérica y no devuelve el usuario.

El envío ocurre después del commit. Un fallo del proveedor deja la cuenta y el token coherentes para un reenvío posterior; nunca revierte parcialmente la transacción ni expone el estado públicamente.

## Token y verificación

Los tokens nuevos usan 32 bytes aleatorios, Base64 URL-safe y SHA-256 para persistencia. La migración `20260801190000_phase6b_registration_verification_login` agrega `consumedAt` e `invalidatedAt`, un check de estado terminal y un índice para pendientes. No modifica las migraciones anteriores ni reescribe tokens legacy.

`GET /api/auth/verify` valida el formato y consume con `UPDATE ... WHERE consumedAt IS NULL AND invalidatedAt IS NULL AND expiresAt > now`. Dos solicitudes concurrentes producen un solo éxito. El consumo y `emailVerifiedAt` ocurren en una transacción junto con `EMAIL_VERIFIED`. Una cuenta inactiva no se verifica ni se reactiva. Un token raw legacy se convierte a SHA-256 durante su primer uso compatible; no se generan nuevos tokens raw en base de datos.

La URL se construye exclusivamente desde `APP_URL`. El email español tiene propósito, botón, vencimiento e instrucción para ignorarlo cuando no fue solicitado; no incluye tracking, contraseña, IDs internos ni metadata. Los tests inyectan un adaptador en memoria y el E2E usa un mailbox sintético local; ninguna validación llama Resend.

## Reenvío

`POST /api/auth/resend-verification` normaliza el email y devuelve siempre el mismo mensaje semántico para cuenta desconocida, verificada, deshabilitada o elegible. Para una cuenta activa no verificada, la transacción invalida pendientes anteriores, crea un token hash-only nuevo y registra `VERIFICATION_REQUESTED`; luego intenta el envío. No reactiva cuentas ni reenvía a verificadas.

## Login y sesión

El provider Credentials valida únicamente los campos de credencial del transporte de NextAuth, normaliza el email, ejecuta bcrypt también para identidades desconocidas mediante un hash ficticio y aplica un único error genérico a usuario desconocido, password incorrecto, cuenta inactiva o no verificada.

Una cuenta sin 2FA activo recibe sesión JWT normal. Si `twoFactorEnabled` legacy está activo o existe una configuración TOTP verificada/habilitada, 6B falla cerrada y no emite sesión hasta que 6D agregue el challenge.

Al iniciar sesión se obtiene o inicializa `AuthSessionVersion`; el JWT conserva sólo su valor mínimo. Cada callback de sesión y cada `getCurrentUser()` vuelve a consultar la base, exige usuario existente/activo y versión vigente, y carga rol, agencia y perfil de inmobiliaria actuales. Así, desactivación, cambio de rol, cambio/remoción de tenant o incremento de versión tienen efecto sin esperar el vencimiento largo del JWT.

## Enumeración, límites y eventos

Registro, reenvío y login usan el rate limiter existente. Registro y reenvío combinan bucket de IP con identidad hashada; login combina 30 intentos por IP y 10 por identidad cada 15 minutos. Sólo se aceptan headers de proxy expresamente configurados. Staging/producción requieren backend PostgreSQL; memoria queda para desarrollo/tests. Las rutas API 6B devuelven `Retry-After` mediante el contrato estable de errores; el callback administrado por NextAuth conserva su error genérico.

Los eventos usados son `REGISTRATION`, `VERIFICATION_REQUESTED`, `EMAIL_VERIFIED`, `LOGIN_SUCCEEDED`, `LOGIN_FAILED` y, cuando corresponde, `SESSION_VERSION_INITIALIZED`. No guardan email raw, password, token, URL de verificación, cookie ni autorización.

## Redirects, CSRF y cookies

El callback admite rutas relativas o el origen exacto de `APP_URL`; rechaza URLs protocol-relative, orígenes extranjeros, credenciales embebidas, controles, backslashes y esquemas peligrosos. NextAuth recibe una URL absoluta confiable y la UI convierte el destino validado en ruta interna para el router de Next 16.

No se deshabilitó el CSRF integrado de NextAuth y no se crean cookies paralelas. Se mantienen sus defaults: cookie HttpOnly, `SameSite=Lax`, path `/`, prefijo/flag Secure bajo HTTPS de producción y sin dominio padre configurado.

## UI, estética y accesibilidad

Se conservaron los gradientes verde/naranja, colores semánticos, tipografía, tarjetas redondeadas, sombras, espaciado y breakpoints existentes. Se reutilizaron `AuthFeedback`, `motion`, links y controles Tailwind del producto; `PasswordField` concentra el toggle accesible sin crear otro sistema visual.

Login y registro agregan autocompletes correctos, confirmación de password, estados de carga, bloqueo de doble submit, foco programático en feedback y mensajes genéricos. La pantalla `/verificar-cuenta` cubre éxito, enlace inválido/expirado y reenvío. Inputs y botones conservan foco visible, labels, `aria-live` y tamaño táctil móvil.

## Migración, pruebas y rehearsal

Scripts:

- `npm run test:auth-phase6b`: pruebas unitarias dirigidas.
- `npm run test:auth-phase6b:postgres`: integración real en PostgreSQL 17 descartable.
- `npm run rehearsal:phase6b`: base vacía, upgrade 6A, cero drift y rollback estructural.
- `npm run test:auth-phase6b:browser`: recorrido Chromium local con identidad ficticia y PostgreSQL 17 descartable.

La base vacía aplica 19 migraciones y verifica columnas, constraint, índice y cero drift. El upgrade desde 6A preserva cuenta, bcrypt, rol, tenant, propiedad, contacto, monto/moneda y token legacy. El rollback elimina estructura 6B y pierde el historial de consumo/invalidez; un backup sigue siendo la recuperación autoritativa.

La integración PostgreSQL comprueba registro duplicado concurrente, password exacto, rol seguro, hash-only, consumo concurrente con un ganador, replay, expiración, deshabilitación, reenvío, cambio inmediato de rol/tenant/versión y fail-closed de 2FA. El navegador recorre registro, estado “revisá tu correo”, verificación, login, área autenticada, logout, error genérico y layout móvil.

## Limitaciones y siguiente fase

6B no hace disponible 2FA a usuarios: una cuenta que ya lo tenga habilitado queda bloqueada de forma segura hasta el challenge de 6D. 6C debe implementar recuperación y cambio de contraseña; 6D, TOTP y recovery codes; 6E, controles de sesiones y cierre operativo. Staging todavía debe validar correo con sink aprobado, proxy/rate-limit durable, HTTPS/cookies y observabilidad. No hubo deploy, migración externa ni tag RC.
