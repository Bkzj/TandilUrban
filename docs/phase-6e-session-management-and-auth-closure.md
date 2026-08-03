# Fase 6E: sesiones y cierre de autenticación

## Arquitectura final

Antes de 6E, NextAuth usaba JWT y `AuthSessionVersion`: la versión permitía invalidar todo, pero no un navegador individual. 6E conserva el JWT cifrado/HttpOnly y agrega `AuthSession`. El JWT lleva un identificador aleatorio de 32 bytes; PostgreSQL guarda únicamente SHA-256. El ID público de la fila es UUID y se usa sólo para listar/revocar con ownership obligatorio.

Cada autenticación completa —password normal, TOTP o recovery code— crea la fila durante el callback JWT. No se crea antes de completar el segundo factor. JWTs anteriores a 6E no tienen identificador y fallan cerrados; el rollout exige nuevo login.

Una frontera protegida exige: usuario existente/activo, `AuthSessionVersion` vigente, fila específica con hash coincidente, no revocada, no vencida y con el mismo snapshot de versión. Rol y tenant se recargan de DB. La sesión dura 30 días, igual que NextAuth. `lastSeenAt` se actualiza condicionalmente como máximo una vez cada 10 minutos.

## Metadatos y privacidad

Sólo se retienen familia gruesa de navegador y SO, ambos limitados a 32 caracteres, más timestamps. El User-Agent completo no se almacena ni muestra. No se guarda IP, ubicación, JWT, cookie, authorization header ni fingerprint. No existe geolocalización externa.

## Operaciones

- La lista devuelve únicamente sesiones vigentes de la versión actual, ordena la actual primero y luego por actividad.
- Revocar una sesión aplica `id + userId + distinto de currentSessionId` dentro de la mutación. Repetir es seguro y otro tenant/usuario no puede verse afectado.
- Cerrar las demás exige contraseña y, con 2FA activo, TOTP o recovery code. Revoca todo salvo la fila actual e invalida challenges sin incrementar la versión.
- Cerrar todas aplica la misma prueba, revoca todas, incrementa versión e invalida challenges; después NextAuth elimina la cookie.
- Logout normal ejecuta el evento `signOut`, revoca el hash actual y no toca otras sesiones.

La semántica concurrente de “cerrar las demás” es explícita: el `UPDATE` serializable revoca las filas comprometidas visibles en su snapshot; una autenticación que realmente completa después puede sobrevivir. Carreras de revocación individual o logout tienen una sola transición y resultados posteriores idempotentes.

Reset/cambio de contraseña, activar/desactivar 2FA y regenerar recovery codes marcan todas las filas sin revocar dentro de su transacción, además de incrementar la versión según 6C/6D. Cuenta inactiva, rol o tenant nuevos se aplican inmediatamente en la validación central aunque una fila histórica continúe retenida.

## Eventos, límites y limpieza

Eventos cerrados: `SESSION_CREATED`, `SESSION_REVOKED`, `OTHER_SESSIONS_REVOKED`, `ALL_SESSIONS_REVOKED`, `SESSION_EXPIRED`. Sólo admiten categoría gruesa y conteos; no identificadores de alta cardinalidad ni secretos.

Rate limits: lista 60/usuario/15 min, revocación individual 20/usuario/15 min y operaciones masivas 5/usuario/15 min, usando el backend durable existente en staging/producción.

`npm run jobs:auth-cleanup` es dry-run por defecto; `-- --apply` elimina sesiones/tokens/challenges transitorios con más de 30 días y eventos con más de 365 días. No corre durante build/install. La primera política preserva historia reciente; un cambio de retención requiere revisión operativa.

## Migración y rollback

`20260804120000_phase6e_session_management` crea tabla, FK cascade, hash único, índices de usuario/estado/expiración, checks temporales/revocación y eventos. El preflight cuenta usuarios/versiones y bloquea versiones negativas o secretos 2FA legacy sin imprimir valores. Upgrade preserva usuarios, bcrypt, roles, tenants, negocio y versiones; no fabrica sesiones.

El rollback sólo es estructural y se niega después del primer uso. Restaurar el backup previo es la única recuperación autoritativa de historia de sesiones/eventos.

## Pruebas y E2E

Scripts:

- `npm run test:auth-phase6e`
- `npm run test:auth-phase6e:postgres`
- `npm run rehearsal:phase6e`
- `npm run test:auth-phase6e:browser`
- `npm run test:auth:lifecycle`

PostgreSQL 17 cubre creación/expiración, current marker, throttle, revocación concurrente y cross-user, bulk, logout, versión, inactividad, cleanup y revocación por cambios de password/2FA. Browser usa contextos A/B/C independientes y prueba revocación inmediata, cerrar otras, cerrar todas y móvil. El lifecycle final encadena registro/verificación, recuperación/cambio, TOTP/recovery y sesiones con servicios locales y datos ficticios.

## Auditoría de dependencias

`next-auth` permanece `4.24.15`, `@auth/core` efectivo `0.41.3`. El único advisory es `brace-expansion` high transitivo de tooling ESLint/minimatch. `npm audit fix --dry-run` no ofrece cambio seguro (`0 added/removed/changed`); no se usó `--force` ni se migró la biblioteca de auth.

## Checklist manual de staging

- HTTPS en `APP_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` y `APP_INTERNAL_URL`; cookie `Secure`, HttpOnly, SameSite y path verificados.
- `AUTH_ENCRYPTION_KEY` Base64 canónica de 32 bytes, issuer TOTP y TTL/count dentro de rango.
- PostgreSQL 17: backup, preflight, migración 22, cero drift y rollback documentado.
- Rate limiter PostgreSQL/durable y header de proxy exactamente igual a la plataforma.
- Sink de email ficticio/aprobado; ningún correo real.
- Registro, verificación, login/logout, reset/cambio, TOTP, recovery y sesiones ejecutados manualmente.
- Dos navegadores reales: revocación individual y bulk inmediata.
- Health/readiness y `release:smoke` read-only pasan con configuración de staging.
- Logs inspeccionados por redacción; alertas para fallos, revocaciones y 5xx sin labels de usuario/email/sesión/IP.
- `npm audit` comparado con baseline y sin datos de producción.

## Pérdida de autenticador y códigos

No existe bypass self-service. Un futuro proceso de soporte debe verificar identidad explícitamente, auditar la acción, aplicar cooling period cuando corresponda y notificar al usuario. Soporte nunca debe ver el secreto TOTP ni recovery codes.

## Go/no-go

Las fases 6A–6E quedan implementadas en código. Producción continúa **NO-GO** hasta ejecutar este checklist en staging aislado, verificar observabilidad y aprobar el advisory aceptado. No hubo deploy, migración externa ni tag RC.
