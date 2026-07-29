# Monitoreo y alertas de release

No se configuró ningún proveedor externo automáticamente. Crear métricas/alertas en la plataforma elegida con los siguientes umbrales iniciales, revisables tras siete días de staging.

| Señal | Alerta / respuesta |
| --- | --- |
| Fallos de autenticación y verificación | pico sostenido 5 min; correlacionar con rate limit, sin guardar token ni email. |
| Fallos Resend / verificación | cualquier fallo persistente o cola creciente; bloquear campañas. |
| Backend rate-limit | error o fallback no esperado; revisar conexión PostgreSQL y proxy. |
| Pool PostgreSQL | saturación, timeouts o conexiones >80%; escalar/revisar fugas. |
| Migraciones | cualquier fallo; detener promoción y restaurar backup si ya hubo cambio destructivo. |
| Cloudinary cleanup | backlog pendiente/retry >15 min; `REJECTED` o fallo permanente inmediato. |
| Gemini | fallo proveedor o cuota agotada; degradar a error seguro, no reintentar en bucle. |
| PDF | errores de Chrome, navegación bloqueada o timeout; revisar imagen y allowlist. |
| Analytics | deriva en `analytics:reconcile` o totales físicos negativos; no aplicar automáticamente. |
| Autorización/validación | picos de 403 cross-tenant o 4xx de validación; investigar abuso/regresión. |
| HTTP | 5xx >1% por 5 min; rollback de aplicación según runbook. |
| Vistas y retención | crecimiento anómalo de `PropiedadVista`; comprobar deduplicación y retención. |
| `RateLimitBucket` | crecimiento sostenido; medir autovacuum, índice `expiresAt` y bloat. |
| Infraestructura | disco >80%, memoria >85%, reinicios y heartbeat de worker ausente >10 min. |

Registrar sólo request-id, código estable y tenant anonimizado/hasheado. No enviar secretos, URLs internas completas, tokens, emails de clientes ni payloads AI a la telemetría.
