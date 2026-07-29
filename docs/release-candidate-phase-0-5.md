# Release candidate fases 0–5

## Alcance y estado

Baseline requerido: `5ec308288973ce845ffabb36a250ee7ad31b5e4c` en `main`. Esta guía no autoriza producción, migraciones de producción, rotación de credenciales, envío a clientes, IA paga ni carpetas Cloudinary productivas.

## Cadena de migraciones publicada

No modificar, combinar ni reescribir estos archivos. Para todas: tomar backup verificable, ejecutar las consultas de preflight contra una copia, y programar ventana por los `ALTER TABLE`/índices y validación de constraints.

| Orden | Migración | Propósito, impacto y preflight | Lock/rollback/compatibilidad |
| ---: | --- | --- | --- |
| 1 | `20260427013515_esquema_completo` | Crea `Propiedad` inicial (precio double, texto de moneda y métricas históricas). Preflight: tabla/filas existentes. | DDL exclusivo; sin rollback publicado; sólo restore. App de entonces antes, siguiente después. |
| 2 | `20260507200943_add_contacto_model` | `Contacto`, FK a propiedad e índice. Preflight: propiedades huérfanas. | DDL/FK; rollback estructural destruye contactos. |
| 3 | `20260507215457_fase1_modelos_base` | Crea usuarios/inmobiliarias, enums, FKs e índices y reemplaza columnas de propiedad. Filas legacy sin dirección, tenant o superficies bloquean. | Muy alto/destructivo (drops); backup es único rollback con datos. La app previa no es compatible tras los drops. |
| 4 | `20260507223708_add_punto_interes` | enum, `PuntoInteres` e índice. Preflight coordenadas y duplicados operativos. | DDL; drop estructural pierde POI. |
| 5 | `20260508145827_add_verification_token` | `emailVerifiedAt`, `VerificationToken`, índices y FK. Preflight expiraciones/tokens duplicados. | DDL; restore para tokens. Compatibilidad aditiva. |
| 6 | `20260509210000_user_agencia_id_agent_role` | enum `AGENTE`, `User.agenciaId`, índice/FK. Preflight agentes con tenant inexistente. | enum/DDL; no rollback publicado; app anterior tolera columna aditiva. |
| 7 | `20260515174500_contacto_estado_telefono` | `EstadoContacto`, teléfono, estado e índice. Preflight longitudes. | DDL; drop pierde clasificación. |
| 8 | `20260516120000_usuario_favoritos` | join `_UsuarioFavoritos`, PK/índice/FKs. Preflight pares inexistentes. | DDL; rollback pierde favoritos. |
| 9 | `20260516130000_fix_usuario_favoritos_fk` | reconstruye join por FKs correctas. Preflight/export obligatorio: el `DROP TABLE` elimina favoritos. | Destructivo; restore es único rollback de datos. |
| 10 | `20260516140000_inmobiliaria_logo_url` | `Inmobiliaria.logoUrl`. Preflight URLs legacy. | aditiva; rollback estructural. |
| 11 | `20260519120000_inmobiliaria_destacada_bio` | `bio`, `destacada`. Preflight longitudes/valores. | aditiva; rollback estructural. |
| 12 | `20260521120000_plano_url_visitas_fisicas` | `planoUrl`, contador `Contacto.visitasFisicas`. Preflight no negativos/URLs. | aditiva; rollback pierde contador. |
| 13 | `20260521140000_visita_fisica_evento` | evento físico, índices y FKs. Preflight contactos/propiedades/usuarios existentes. | DDL/FK; rollback pierde auditoría de eventos. |
| 14 | `20260722090000_cloudinary_asset_registry` | enums Cloudinary, assets, jobs/resources, `RateLimitBucket`, FKs e índices. URLs legacy permanecen sin registrar. Preflight ownership, bytes, IDs únicos. | DDL/FK; `rollback.sql` elimina auditoría, cola e idempotencia operativa: exportar y restaurar backup para datos. App anterior antes de parar workers; posterior después. |
| 15 | `20260728120000_user_active_authorization` | `User.activo default true`. Preflight usuarios y política de deshabilitación. | aditiva; rollback estructural sólo. La app anterior ignora la columna; nueva debe estar desplegada antes de deshabilitar. |
| 16 | `20260728150000_phase2_data_integrity_analytics` | `Moneda`, dinero `Decimal(18,2)`, `legacyVisitCount`, `PropiedadVista`, `OrigenContacto`, checks, idempotencia e índices. Preflight aborta no finito, negativo, fuera de rango, >2 decimales o moneda no ARS/USD. | locks de conversiones/updates/constraints; rollback publicado es destructivo: pliega vistas con legado, borra eventos medidos e idempotencia y puede perder exactitud decimal. Backup autoritativo. |
| 17 | `20260728180000_phase3_validation_data_integrity` | checks de dominios/longitud/coordenadas, FKs compuestas, hashes de idempotencia, `pgcrypto` y triggers tenant. Preflight aborta datos inválidos, relaciones cruzadas, assets/contadores/tokens inconsistentes. | locks/validación de tablas; `rollback.sql` elimina constraints, triggers y metadatos de idempotencia. App previa sólo compatible mientras no dependa de esos contratos; restore tras rollback de app si hay pérdida. |

El punto de no retorno operativo es la migración 16: una reversión SQL no restaura separación entre visitas legacy/medidas ni idempotencia. Desde 14 también se pierde auditoría/colas Cloudinary con rollback SQL. Para 3 y 9, y para cualquier caso destructivo, restaurar el backup previo; recrear schema no restaura datos.

## Preflight, backup y ensayo

1. Crear snapshot consistente y comprobar restore en una instancia aislada: `pg_dump --format=custom --no-owner --file=pre-rc.dump "$DATABASE_URL"`.
2. Crear bases PostgreSQL 17 vacía, upgrade válida y upgrade negativa; jamás usar URL productiva.
3. En la vacía: `DATABASE_URL=... npx prisma migrate deploy`, `DATABASE_URL=... npx prisma migrate diff --from-config-datasource --to-schema database/schema.prisma --exit-code`, seed sólo si `prisma/seed.ts` es aprobado para staging, y smoke de aplicación.
4. En upgrade: instalar hasta migración 15, cargar fixture ficticia de dos tenants (roles admin/inmobiliaria/agente/normal, activos/inactivos, estados de propiedad, ARS/USD, decimales, contactos/eventos, URL Cloudinary legacy y registrada, token raw, asignaciones válidas), exportar conteos anonimizados y aplicar 16–17.
5. En negativa: cargar cada incompatibilidad en una base separada (precio `1.001`, moneda no permitida, coordenada inválida, agente cruzado, vista tenant cruzado) y comprobar que el preflight aborta antes de los cambios de esa migración. Guardar sólo PK hasheada y código de preflight.
6. Post-migración: reconciliar conteos, exactitud/currency, `legacyVisitCount`, nuevas vistas, `activo`, tokens raw→hash, ownership Cloudinary, FKs/índices y ausencia de pérdida. No correr cleanup durante la carga.

### Resultados reproducibles locales (PostgreSQL 17 efímero)

- Vacía: las 17 migraciones aplicaron en orden y `prisma migrate diff --from-config-datasource --to-schema database/schema.prisma --exit-code` devolvió 0 (sin drift). No se ejecutó seed, smoke HTTP ni servicios externos.
- Upgrade válida: fixture ficticia con 7 usuarios (incluido uno inactivo), 2 tenants, 4 propiedades en los cuatro estados, USD `12345.67`/`300.00`/`400.00`, ARS `234.50`, contacto, evento físico, token raw legacy, URLs Cloudinary legacy y un asset registrado pasó fases 2–3. Conteos post: propiedades 4, usuarios 7, contactos 1, eventos físicos 1 y assets 1; no hubo pérdida en esas tablas.
- Negativa: una propiedad con precio `1.001` abortó fase 2 con `Phase 2 monetary preflight failed` antes de cualquier DDL; `precio` permaneció `double precision`.
- Rollback: se restauró un dump pre-fase 2 en una base nueva (precio `double precision`), y se ejecutaron los rollback SQL de fases 3 y 2 en otra copia. El segundo eliminó `PropiedadVista` y devolvió dinero a `double precision`, confirmando que es destructivo y que el dump es la restauración autoritativa.

Siguen pendientes la validación con servicios reales de staging, el smoke HTTP y la matriz manual/end-to-end; no afirmar éxito antes de producir sus reportes sin PII.

## Despliegue staging exacto

1. Congelar `main`, confirmar SHA, árbol limpio y backup restaurable.
2. Inyectar secretos aislados y completar [checklist de entorno](release-environment-checklist.md).
3. Ejecutar preflight en la copia, tomar conteos anonimizados y detener workers de cleanup.
4. Construir con el SHA: `npm ci && npx prisma validate && npx prisma generate && npm run build`.
5. Aplicar sólo staging: `DATABASE_URL="$STAGING_DATABASE_URL" npx prisma migrate deploy`.
6. Arrancar la versión nueva; comprobar `GET /api/health`, `GET /api/readiness`, y `npm run release:smoke` desde un runner con acceso interno.
7. Ejecutar matriz funcional abajo con datos ficticios y sink de correo. Sólo entonces habilitar workers.
8. Observar 30–60 min; si falla, parar workers, volver binario y restaurar backup cuando la reversión SQL no preserve datos.

## Jobs y propuesta de staging

| Job | Ejecución/frecuencia | Seguridad y operación |
| --- | --- | --- |
| Cloudinary cleanup | `npm run jobs:cloudinary-cleanup`, cada 5 min, proceso corto programado. | Claim condicional `PENDING/RETRY→PROCESSING` evita doble job; recurso COMPLETE se omite; retry exponencial hasta una hora, ownership inválido `REJECTED`. Alertar retry/backlog; no lanzar durante build/install; parar scheduler antes de rollback. |
| Analytics reconcile | `npm run analytics:reconcile` diario 02:15 ART; `--apply` sólo tras revisión humana. | dry-run por defecto, transacción, aborta apply ante totales físicos negativos; rerun seguro. Alertar desvíos. |
| Email/outbox/matching | no hay worker continuo separado identificado; emisión ocurre en flujos de aplicación. | usar sink, rate-limit y alertas de proveedor; no configurar producción automáticamente. |

Health de worker: métrica de última ejecución/exit code/heartbeat; si no hay heartbeat en 10 min, alertar. Validar con fixture que dos procesos no reclaman el mismo job y que fallo remoto deja `RETRY`; las pruebas unitarias actuales cubren idempotencia por recurso, fallo y ownership.

## Matriz manual staging

Ejecutar y registrar resultado por caso: registro genérico/no enumeración, email sink, verify raw y hash, login verificado/no verificado, `activo` y cambios de rol inmediatos, retry-after; visibilidad y 404 genérico de estados privados en search/map/OG/favoritos/recientes/DTO; límites de tenant/agente/admin/normal y IDs cruzados; CRUD de propiedad, assets y cleanup; ARS/USD/centavos/analytics/deduplicación 30 min/filtros bot-DNT-GPC/panel; contactos idempotentes y visitas físicas compensadas; IA inválida antes del provider y respuesta segura; PDF origin/cookie/redirect/private-network/sandbox; responsive y a11y (teclado, foco, Escape, diálogos, radios y reduced motion). No declarar cobertura pixel-perfect sin infraestructura de screenshots.

## Health, smoke y observabilidad

`/api/health` sólo confirma proceso vivo. `/api/readiness` comprueba configuración y `SELECT 1` a DB, devuelve 503 con estados estables no sensibles si falla y nunca muta. `npm run release:smoke` valida configuración, DB, status de migraciones, tablas/constraints, health, configuración de workers/Cloudinary/email/Gemini sin invocarlos, Chrome, SHA, baseline audit y drift del cliente Prisma. El modo normal no borra ni envía; provider checks requieren flag y aprobación.

Ver [monitoring and alerts](release-monitoring-and-alerts.md) y [hero video](hero-video-performance-review.md).

## Warnings aceptados con verificación operativa

El warning Tailwind se origina en `@config "../../../tailwind.config.ts"` desde CSS mientras la config es TypeScript/módulo. Cambiar el tipo de módulo/package sería transversal y no es una corrección estrecha; se acepta si staging produce el CSS esperado y la matriz visual no muestra clases ausentes.

El warning Turbopack/NFT proviene de `puppeteer-core`, cuyo Chrome no se empaqueta automáticamente. Se acepta sin cambio de empaquetado: la imagen staging debe traer Chrome explícito mediante `PUPPETEER_EXECUTABLE_PATH`; validar PDF y revisar que el binario/librerías están presentes en el target Linux. Si falta, es blocker de PDF, no suprimir el warning.

## Gate y go/no-go

Gate final: `npm ci`; Prisma validate/generate; secrets/dead-code; unit/integration; lint/typecheck/build; `npm run release:smoke`; `git diff --check`; `npm audit`; archive/test archive. La baseline aceptada es 12 (1 low, 10 high, 1 critical) sin drift. No usar `npm audit fix --force`.

Go sólo cuando ambos ensayos PostgreSQL 17, smoke con staging, matriz manual, restore, PDF/worker y alertas estén documentados como PASS. Si no, NO-GO para producción. No etiquetar/push hasta pasar todos los gates.
