# Fase 6: cuentas y autenticación

## Brechas previas

La base previa tenía registro/verificación y Credentials con bcrypt, pero JWT sin versión persistente, campos 2FA legacy reservados, y no tenía reset de contraseña, challenges TOTP, recovery codes ni auditoría de seguridad normalizada.

## Diseño

La migración `20260729120000_phase6_authentication_security` añade `AuthSessionVersion`, `PasswordResetToken`, `TwoFactorConfiguration`, `TwoFactorChallenge`, `TwoFactorRecoveryCode` y `SecurityEvent`. Los tokens y códigos se guardan sólo como SHA-256. El secreto TOTP se cifra con AES-256-GCM y una clave Base64 dedicada `AUTH_ENCRYPTION_KEY`, distinta de secretos NextAuth y tracking. TOTP usa RFC 6238, SHA-1, seis dígitos y período de 30 segundos para compatibilidad amplia.

El preflight es sólo lectura y aborta si hay `twoFactorSecret` legacy no nulo: no se descarta ni transforma un secreto de formato desconocido. El rollback es sólo estructural; el backup previo sigue siendo la restauración autoritativa de auditoría, códigos y tokens.

## Ciclo público completado en 6B

Registro crea un usuario `USUARIO_NORMAL` no verificado y token hashado con respuesta genérica. Verificación consume una vez, marca `emailVerifiedAt` y conserva compatibilidad controlada con token raw legacy. Login valida bcrypt, estado activo, verificación y versión de sesión, y recarga rol/tenant actuales en cada frontera protegida. Una cuenta con 2FA habilitado falla cerrada hasta que 6D provea el challenge.

## Operación

`AUTH_ENCRYPTION_KEY` es obligatoria en producción, Base64 de 32 bytes y no puede ser placeholder. No se agregó SMS. No se desplegó producción ni se configuraron proveedores reales. Las alertas deben cubrir fallos de login/2FA/reset, challenges expirados, replay TOTP, rate-limit y cambios de seguridad.

## Estado de entregas

- **6A completa:** modelos, migración, cifrado, primitivas TOTP, repositorios internos, transacciones, eventos, PostgreSQL 17 y smoke read-only.
- **6B completa:** registro público, email de verificación, consumo/reenvío de token, login/logout normal y adopción real de sesiones versionadas.
- **6C–6E pendientes:** recuperación/cambio de contraseña, challenge/gestión TOTP, recovery codes y controles finales de sesiones.

2FA todavía no se ofrece en UI. Producción permanece NO-GO.
