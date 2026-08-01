# Fase 6A: fundamento interno de autenticación

## Alcance

Fase 6A agrega infraestructura interna. El registro y el login siguen usando el flujo anterior. No hay endpoints, emails ni pantallas nuevas, y no se afirma que TOTP o los recovery codes estén disponibles para usuarios. Los flujos públicos pertenecen a 6B–6E.

## Diseño persistente

`AuthSessionVersion` es la única fuente de versión de sesión. La migración inicializa en cero a todos los usuarios existentes; `ensureSessionVersion` inicializa usuarios creados después. Los incrementos usan una operación atómica de PostgreSQL y las comparaciones fallan para versiones inválidas o usuarios inexistentes.

`PasswordResetToken`, `TwoFactorChallenge` y `TwoFactorRecoveryCode` reciben y persisten hashes SHA-256, nunca valores raw. Los consumos usan `UPDATE ... WHERE consumedAt IS NULL` mediante Prisma: ante carreras sólo una operación cambia la fila. La invalidación de pendientes los vuelve no disponibles sin alterar los ya consumidos.

`TwoFactorConfiguration` mantiene como máximo una configuración por usuario. Una configuración pendiente no está activa hasta tener `enabledAt` y `verifiedAt`. `lastAcceptedTimeStep` sólo avanza; el mismo step no puede aceptarse dos veces, incluso con solicitudes concurrentes. Deshabilitar elimina la configuración y, por cascada, su secreto cifrado y recovery codes, e invalida challenges en la misma transacción.

Servicios internos:

- `session-version-repository`: `getSessionVersion`, `ensureSessionVersion`, `matchesSessionVersion`, `incrementSessionVersion`.
- `password-reset-token-repository`: creación hash-only, consulta vigente, consumo atómico e invalidación de pendientes.
- `totp-configuration-repository`: creación pendiente, consultas, activación, step monotónico y deshabilitación.
- `two-factor-challenge-repository`: creación hash-only, vigencia, intentos atómicos, consumo e invalidación.
- `recovery-code-repository`: batch hash-only, conteo, consumo, invalidación y regeneración transaccional.
- `security-event-repository`: taxonomía cerrada y metadata acotada/saneada.
- `authentication-state-service`: invalidación compuesta, deshabilitación TOTP y regeneración de códigos con incremento de versión y evento dentro de la misma transacción.

## Criptografía

`AUTH_ENCRYPTION_KEY` debe ser Base64 canónico que decodifique exactamente 32 bytes. En producción es obligatorio, se rechazan placeholders y la aplicación falla cerrada si falta o es inválido. No se reutilizan secretos de NextAuth ni tracking.

El secreto TOTP usa AES-256-GCM con IV aleatorio de 12 bytes y authentication tag. El formato versionado es `v1.iv.tag.ciphertext`; los tres componentes binarios usan Base64 URL-safe. Payload, clave, ciphertext o tag incorrectos fallan cerrados. No existe fallback a texto plano.

TOTP implementa RFC 6238 con HMAC-SHA-1, secreto Base32, seis dígitos, período de 30 segundos, reloj inyectable y ventana reducida. La persistencia monotónica del time step evita replay.

Los tokens opacos usan 32 bytes aleatorios y Base64 URL-safe. Los recovery codes son aleatorios, agrupados para lectura humana, normalizados explícitamente y sólo se persiste su SHA-256.

## Eventos y redacción

`SecurityEventType` es cerrado. La metadata elimina recursivamente claves sensibles sin distinguir mayúsculas/minúsculas, limita profundidad, cantidad de claves/elementos y longitud de strings. Passwords, tokens, TOTP, recovery codes, cookies, credenciales, authorization, hashes y secretos cifrados no se almacenan como metadata.

## Migración y preflight

La migración es `20260729120000_phase6_authentication_security` y no modifica las 17 anteriores. `preflight.sql` cuenta usuarios, activos/inactivos, verificados/no verificados, hashes bcrypt potencialmente malformados, duplicados normalizados, tokens huérfanos y usuarios con 2FA legacy. Si existe cualquier `twoFactorSecret` legacy no nulo, aborta informando sólo la cantidad. `migration.sql` repite el bloqueo antes del DDL.

`rollback.sql` elimina tablas, enum y columnas nuevas. Es sólo rollback estructural: destruye versiones, tokens, challenges, recovery codes, configuraciones y auditoría de 6A. Un backup previo es la única restauración de datos; el rollback no recupera secretos.

## Automatización y resultados locales

- `npm run test:auth-foundation`: primitivas y sanitización.
- `npm run test:auth-foundation:postgres`: repositorios y carreras contra PostgreSQL 17 descartable.
- `npm run rehearsal:phase6a`: cuatro bases descartables, con limpieza garantizada del contenedor.

El rehearsal de base vacía aplicó las 18 migraciones, verificó tablas, foreign keys, índices, constraints, defaults y cero drift de Prisma. El upgrade desde las primeras 17 preservó IDs, hashes bcrypt, roles, tenants, relación de agente, propiedad, contacto, monto/moneda y token de verificación; seis usuarios existentes recibieron versión cero. El fixture con secreto legacy abortó antes de crear tablas nuevas y no imprimió el secreto. El rollback estructural eliminó los seis modelos nuevos y conservó los campos legacy de `User`.

Las pruebas PostgreSQL ejecutan incrementos y consumos realmente paralelos. Confirmaron que no se pierden incrementos y que reset token, challenge, TOTP step y recovery code admiten exactamente un ganador concurrente. La regeneración invalida el batch anterior en una transacción.

## Release smoke

`npm run release:smoke` sólo lee configuración y esquema. Valida formato/placeholder de la clave, issuer, TTL, cantidad de códigos, tablas, índices/constraints esenciales, fuente de versión y ausencia de secretos legacy; luego conserva los checks de health/readiness, migraciones, código generado y audit. No crea usuarios, tokens, eventos ni códigos y no llama proveedores. Sin el entorno real de staging falla cerrada con los nombres de variables faltantes.

## Pendiente para 6B–6E

Quedan fuera de 6A: endpoints y UI de registro/verificación nuevos, challenge HTTP de 2FA, activación/desactivación visible, login con recovery codes, recuperación/cambio de contraseña, emails, rate limits específicos y rebind de sesiones en el flujo real. SMS no fue implementado. No hubo deploy ni migración externa.
