# Fase 6: cuentas y autenticación

## Brechas previas

La base previa tenía registro/verificación y Credentials con bcrypt, pero JWT sin versión persistente, campos 2FA legacy reservados, y no tenía reset de contraseña, challenges TOTP, recovery codes ni auditoría de seguridad normalizada.

## Diseño

La migración `20260729120000_phase6_authentication_security` añade `AuthSessionVersion`, `PasswordResetToken`, `TwoFactorConfiguration`, `TwoFactorChallenge`, `TwoFactorRecoveryCode` y `SecurityEvent`. Los tokens y códigos se guardan sólo como SHA-256. El secreto TOTP se cifra con AES-256-GCM y una clave Base64 dedicada `AUTH_ENCRYPTION_KEY`, distinta de secretos NextAuth y tracking. TOTP usa RFC 6238, SHA-1, seis dígitos y período de 30 segundos para compatibilidad amplia.

El preflight es sólo lectura y aborta si hay `twoFactorSecret` legacy no nulo: no se descarta ni transforma un secreto de formato desconocido. El rollback es sólo estructural; el backup previo sigue siendo la restauración autoritativa de auditoría, códigos y tokens.

## Flujos futuros (6B–6E)

Registro crea usuario normal no verificado y token de verificación hashado; la respuesta es genérica. Verificación consume una vez y conserva compatibilidad con token raw legacy. Login debe validar estado activo, verificación, versión de sesión, rol y tenant actuales; 2FA debe emitir un challenge corto antes de la sesión final. Reset y cambio de contraseña incrementan versión de sesión y revocan challenges/tokens. Habilitar, deshabilitar o regenerar recovery codes también invalida sesiones.

## Operación

`AUTH_ENCRYPTION_KEY` es obligatoria en producción, Base64 de 32 bytes y no puede ser placeholder. No se agregó SMS. No se desplegó producción ni se configuraron proveedores reales. Las alertas deben cubrir fallos de login/2FA/reset, challenges expirados, replay TOTP, rate-limit y cambios de seguridad.

## Estado de la entrega 6A

La migración, cifrado, primitivas TOTP, repositorios internos, transacciones compuestas, eventos, rehearsals PostgreSQL 17 y smoke read-only están implementados como fundamento interno. Esta entrega no cambia el login/registro público ni ofrece 2FA a usuarios. Activación HTTP/UI, recuperación de contraseña, emails y adopción de sesiones versionadas por el flujo real pertenecen a 6B–6E. Producción permanece NO-GO.
