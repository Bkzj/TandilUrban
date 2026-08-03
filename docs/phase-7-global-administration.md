# Fase 7: administración global y gestión de tenants

> Estado: Fase 7 completa. La [Fase 7B](./phase-7b-inmobiliaria-onboarding.md) completa el onboarding de inmobiliarias con invitaciones de marca, reenvío y asistencia editorial opcional de Gemini sin exponer secretos.

## Jerarquía y autoridad

La fase reutiliza el enum existente; no crea un segundo rol global.

- `ADMIN`: administra la plataforma completa. Puede consultar usuarios, inmobiliarias, agentes y publicaciones de cualquier tenant.
- `INMOBILIARIA`: administra únicamente la `Inmobiliaria` vinculada por `inmobiliariaPerfil`; crea y activa/desactiva solamente agentes de ese tenant.
- `AGENTE`: pertenece a `agenciaId`, opera únicamente sobre propiedades asignadas dentro de ese tenant y no crea cuentas ni modifica roles.
- `USUARIO_NORMAL`: cuenta pública sin privilegios administrativos.

Los privilegios globales derivan exclusivamente de `User.rol = ADMIN`. Ningún correo está codificado en guards, middleware, rutas o UI. La promoción global es una operación local explícita, no una opción del panel.

## Sesión y autorización

`requireGlobalAdmin`, `requireTenantAdministrator`, `requirePanelTenant` y `requirePropertyAccess` centralizan la política. Cada llamada parte de la sesión Phase 6: usuario activo, `AuthSessionVersion` vigente, fila `AuthSession` específica no revocada/no vencida y rol/tenant recargados de PostgreSQL. `ADMIN` recibe un override explícito sólo en acceso global y administración de una propiedad existente; los demás roles conservan el filtro tenant/agente.

Las mutaciones no aceptan `userId`, `rol` ni `agenciaId` del cliente como autoridad. El servidor deriva actor y tenant de la sesión. Las rutas usan validación estricta, límite de body, origen same-site/CSRF y el rate limiter existente.

## Panel global

Rutas protegidas server-side:

- `/admin`: cantidades derivables de usuarios, inmobiliarias, agentes y publicaciones; estado de cuentas y últimas inmobiliarias.
- `/admin/inmobiliarias`: listado con administrador, estado, agentes, propiedades y fecha; alta atómica e invitación de administradores/agentes.
- `/admin/usuarios`: búsqueda por nombre/email, filtros por rol, estado y tenant, paginación y activación/desactivación conservadora.
- `/admin/publicaciones`: inventario global paginado con inmobiliaria, agente, estado, operación, precio/moneda y acceso a la edición existente.

El menú autenticado muestra “Panel de administración” sólo para `ADMIN`; ocultarlo no sustituye los guards del servidor. El panel conserva paleta verde/naranja, tipografía, radios, sombras, tablas y controles del backoffice actual.

## Alta de inmobiliarias e invitaciones

`createInmobiliariaWithAdministrator` ejecuta en una transacción serializable:

1. confirma actor `ADMIN` activo;
2. valida unicidad de CUIT y email normalizado;
3. crea usuario inactivo con rol forzado `INMOBILIARIA`, hash bcrypt de un valor aleatorio inaccesible y `AuthSessionVersion=0`;
4. crea `Inmobiliaria` y su relación 1:1;
5. crea `AccountInvitation` con SHA-256 del token, rol objetivo y tenant;
6. registra eventos con actor/objetivo.

El token raw existe sólo en memoria y se entrega al adaptador de correo fuera de la transacción. Nunca se envía una contraseña. `/activar-cuenta` permite elegirla: el consumo atómico marca la invitación, activa/verifica la cuenta, invalida otras invitaciones y challenges, incrementa la versión y revoca sesiones. Un replay devuelve un resultado inválido.

`inviteAgent` usa el mismo mecanismo. `ADMIN` elige tenant; `INMOBILIARIA` sólo puede usar su tenant. El rol se fuerza a `AGENTE`, aunque el cliente intente incluir otro rol.

## Activación, desactivación y transiciones

Desactivar establece `activo=false`, incrementa `AuthSessionVersion`, revoca `AuthSession`, consume challenges pendientes y registra `ACCOUNT_DEACTIVATED`. Es inmediato. La configuración TOTP y recovery codes no se modifican. Reactivar exige una cuenta ya verificada y no cambia password ni 2FA.

El panel no expone un dropdown libre de roles. La política interna sólo contempla `USUARIO_NORMAL → INMOBILIARIA`, `USUARIO_NORMAL → AGENTE` con tenant, y `AGENTE → USUARIO_NORMAL`; no se publica todavía una UI de transición. `ADMIN` global sólo se promueve con el script operacional.

## Promoción operacional

Comando:

```bash
npm run admin:promote -- <email-normalizado>
```

El script exige exactamente un argumento, base con host local, una sola cuenta coincidente y que no sea propietaria de un tenant. Cambia el rol a `ADMIN`, quita una eventual asignación de agente, incrementa versión, revoca sesiones, invalida challenges y registra `ROLE_CHANGED` y `GLOBAL_ADMIN_PROMOTED`. Es idempotente si la cuenta ya es `ADMIN`. El operador debe iniciar sesión nuevamente.

## Migración

`20260805120000_phase7_global_administration` es la migración 23. Agrega `AccountInvitation`, nueve eventos administrativos y columnas/indexes actor/objetivo. `preflight.sql` informa sólo cantidades y aborta por secretos 2FA legacy, emails normalizados duplicados o agentes huérfanos. Las 22 migraciones previas permanecen intactas.

`rollback.sql` sólo revierte estructura antes de que existan invitaciones o eventos Phase 7. Después del uso, exige restaurar el backup; eliminar tablas o eventos no es recuperación de datos.

## Seguridad, límites y auditoría

Las mutaciones administrativas usan ventanas temporales de 10 operaciones por actor cada 15 minutos. No hay lockout permanente. Los eventos incluyen IDs de actor, cuenta objetivo y tenant cuando corresponden; la sanitización recursiva sigue eliminando passwords, tokens, hashes, cookies, autorización y secretos.

Eventos nuevos: `GLOBAL_ADMIN_PROMOTED`, `INMOBILIARIA_CREATED`, `INMOBILIARIA_ADMIN_CREATED`, `AGENT_CREATED`, `ACCOUNT_ACTIVATED`, `ACCOUNT_DEACTIVATED`, `ROLE_CHANGED`, `TENANT_ASSIGNMENT_CHANGED` y `ACCOUNT_INVITATION_ACCEPTED`.

## Pruebas y rehearsals

- Unitarias: jerarquía, ownership, transiciones y payloads de escalación.
- PostgreSQL 17: alta global, token hash-only, consumo/replay, aislamiento A/B, desactivación con revocación y preservación 2FA, promoción e idempotencia.
- E2E con Chrome y PostgreSQL descartable: panel global, listado multi-tenant, alta de inmobiliaria, alta de agente en tenant A, rechazo de mutación sobre B y payloads `rol=ADMIN` desde roles sin autoridad.
- Rehearsal vacío: 23 migraciones, constraints/indexes y drift cero.
- Upgrade: preserva IDs, bcrypt, roles, tenants, propiedades, contactos y versiones.
- Rollback: estructural antes de uso; backup obligatorio después.

Scripts:

```bash
npm run test:phase7
npm run test:phase7:postgres
npm run rehearsal:phase7
npm run test:phase7:browser
```

## Checklist de staging pendiente

- backup y preflight antes de migrar;
- aplicar migración 23 en PostgreSQL aislado;
- HTTPS, cookies `Secure`/`HttpOnly`/`SameSite` y URLs confiables;
- `RATE_LIMIT_BACKEND=postgresql` o backend durable aprobado y proxy confiable correcto;
- sink/proveedor de invitaciones con direcciones de prueba;
- login nuevo después de promoción o cambio de rol;
- probar ADMIN, tenant A/B, agente A/B y cuenta normal;
- comprobar revocación inmediata y logs sin secretos;
- revisar métricas/alertas, backup y rollback operativo.

Producción continúa **NO-GO** hasta completar este checklist y la aprobación operativa. Esta implementación no despliega, no migra producción y no crea tag RC.
