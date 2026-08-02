# Fase 6C: recuperación y cambio de contraseña

La migración agrega únicamente `PASSWORD_RESET_COMPLETED` y `PASSWORD_CHANGE_FAILED` al enum cerrado `SecurityEventType`. La tabla `PasswordResetToken`, `passwordChangedAt`, `consumedAt`, expiración, índices y relaciones ya fueron publicados por 6A y no se duplican.

Ejecutar `preflight.sql` sobre una copia descartable antes del deploy. Informa sólo cantidades y aborta si encuentra hashes de reset que no sean SHA-256 hexadecimal; nunca imprime hashes, tokens o passwords.

PostgreSQL no permite eliminar valores individuales de un enum. `rollback.sql` reconstruye el enum anterior sólo cuando aún no existen eventos 6C; si ya existen, aborta y exige restaurar el backup previo. El rollback no es restauración de datos de seguridad.
