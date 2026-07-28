# Fase 1: acceso público y autorización

## Política de publicación

La única fuente de verdad es `src/lib/public-property-policy.ts`.

- `DISPONIBLE`: pública.
- `RESERVADA`: pública.
- `PAUSADA`: no pública.
- `VENDIDA`: no pública.

`RESERVADA` conserva visibilidad porque el comportamiento previo de destacados y
emprendimientos la trataba expresamente como parte de la vidriera. La reserva
indica una operación en curso, no una baja del aviso. El acceso directo a una
propiedad no pública responde igual que un ID inexistente.

No existen en el enum actual estados separados de borrador, oculta o eliminada.
La eliminación física tampoco puede resolverse públicamente. Si se agregan
estados, serán privados por defecto hasta incorporarlos explícitamente a la
política.

## Inventario de exposición pública

Se revisaron todas las consultas de `Propiedad`, routes, server actions,
documentación, pruebas y scripts. Se actualizaron:

- Inicio: exclusivas, estándar y barrios.
- Búsqueda y mapa.
- Detalle por ID y su metadata.
- Open Graph y `/api/og/propiedad`.
- Destacados y su fallback.
- Propiedades similares, incluida la búsqueda geográfica SQL.
- Emprendimientos: locales, proyectos en pozo y fallback.
- Directorio de inmobiliarias: conteo de propiedades públicas.
- Perfil público de inmobiliaria y de agente.
- IDs y página de favoritos.
- Alta/baja de favoritos.
- Creación de contacto.
- Recuperación servidor de vistos recientemente mediante
  `/api/public/propiedades-recientes`.

La portada de “Oportunidades únicas” consume la consulta pública de exclusivas
del inicio. Los proyectos editoriales de emprendimientos son contenido estático,
no registros `Propiedad`.

No se encontraron sitemap, JSON-LD ni otro generador de datos estructurados con
propiedades. Tampoco se encontraron consumidores internos, móviles, externos
documentados, pruebas, scripts o contratos para `/api/propiedades`.

## DTO públicos

Las consultas públicas usan `select` validados con `satisfies
Prisma.PropiedadSelect` y payloads generados por Prisma.

### Tarjeta/listado/mapa

Campos aprobados:

`id`, `titulo`, `direccion`, `barrio`, `precio`, `moneda`, `operacion`, `tipo`,
`ambientes`, `dormitorios`, `banos`, `m2Total`, `latitud`, `longitud`,
`imagenes`, `esExclusiva` y `destacada`.

`destacada` se deriva en el servidor. `visitas` y `consultas` se usan sólo para
esa clasificación y ya no se serializan al cliente.

### Detalle

Campos aprobados:

`id`, `titulo`, `descripcion`, `operacion`, `tipo`, `precio`, `moneda`,
`direccion`, `barrio`, `latitud`, `longitud`, `m2Total`, `ambientes`,
`dormitorios`, `banos`, `cocheras`, `caracteristicas`, `imagenes`.

La inmobiliaria se reduce a `nombreAgencia`, `logoUrl` y
`publicProfileUserId`. El agente se reduce a `publicProfileUserId`, `nombre` y
`avatarUrl`. Los IDs públicos de perfil son necesarios porque
`/inmobiliarias/[id]` usa ese contrato.

### Open Graph

Campos seleccionados:

`id`, `titulo`, `descripcion`, `operacion`, `precio`, `moneda`, `dormitorios`,
`banos`, `imagenes`. El DTO agrega únicamente textos formateados y URLs de
imagen seguras para Satori.

No se exponen CUIT, IDs de tenant, hashes, estado de verificación, datos 2FA,
timestamps internos, registros Cloudinary, trabajos de limpieza ni relaciones
Prisma completas.

## API legacy

Se eliminaron:

- `GET /api/propiedades`
- `GET /api/propiedades/[id]`

Ambas devolvían modelos Prisma completos; el detalle incluía la inmobiliaria
completa. La búsqueda exhaustiva no encontró contrato ni consumidor que
justificara mantenerlas. Las pruebas de repositorio verifican que las routes no
existan.

## Favoritos, contactos y vistos recientemente

- Sólo se puede agregar o quitar un favorito si la propiedad sigue pública.
- Si una propiedad favorita deja de ser pública, la relación se conserva para
  consistencia histórica, pero los IDs y la página de favoritos la omiten.
- Contacto resuelve primero una propiedad pública. Sólo después ejecuta en una
  transacción el incremento y el alta del contacto.
- Propiedad inexistente y propiedad no pública producen el mismo error genérico.
- `localStorage` no es autoritativo. La UI envía sólo hasta seis IDs y renderiza
  únicamente los DTO devueltos por el servidor con la política reaplicada.

## Matriz de autorización

| Rol | Navegación pública | Datos propios | Panel tenant | Propiedades/contactos | Equipo | Administración global |
| --- | --- | --- | --- | --- | --- | --- |
| `USUARIO_NORMAL` | Sí | Perfil, favoritos e interacciones propias | No | No | No | No |
| `INMOBILIARIA` | Sí | Sí | Sólo su inmobiliaria 1:1 | Todas las de su tenant | Sólo su equipo | No |
| `AGENTE` | Sí | Sí | Sólo su `agenciaId` actual | Sólo propiedades asignadas al agente dentro de ese tenant y sus contactos | No | No |
| `ADMIN` | Sí | Sí | No implícito | No implícito | No | Sí, sólo mediante guard global y objetivos explícitos |

### Semántica exacta de ADMIN

`ADMIN` es administrador global de plataforma, no administrador de tenant. No
existe actualmente un área global ni operaciones globales implementadas. Por
eso:

- `ADMIN` no entra al panel de una inmobiliaria.
- Un perfil 1:1 accidental no concede acceso tenant.
- No se elige “la primera inmobiliaria”.
- `requireGlobalAdmin()` es el único punto de entrada para futuras operaciones
  globales.
- Una futura operación global deberá recibir un tenant objetivo explícito,
  validarlo y registrar la operación; no puede reutilizar un prefijo Cloudinary
  de otro tenant.

Esta decisión elimina la mezcla previa: RBAC admitía `ADMIN` al panel, mientras
la mayoría de resoluciones de tenant no podía asignarle uno y una función de
propiedad sí lo admitía si tenía perfil.

## Guards centrales

`src/lib/panel-authorization.ts` define:

- `requireAuthenticatedUser()`
- `requirePanelUser()`
- `requirePanelTenant()`
- `requirePropertyAccess()`
- `requireTenantAdministrator()`
- `requireGlobalAdmin()`
- `panelPropertyScopeForUser()`

`requireAgencyPublishingContext()` delega en esos guards para preservar el
contrato de uploads y publicación. Las rutas de propiedad, contactos, equipo,
PDF, IA y uploads reutilizan el contexto en vez de confiar en IDs del cliente.

Los scopes de propiedad incorporan tenant y, para agentes, asignación. Las
consultas usan `findFirst` dentro del scope, por lo que un ID ajeno y uno
inexistente dan la misma respuesta. Las protecciones Phase 0 de capacidades,
prefijos, `CloudinaryAsset` y trabajos durables no se modificaron.

## Frescura de sesión

El JWT sigue siendo una referencia de sesión y puede contener un rol para UI,
pero las decisiones sensibles llaman `getCurrentUser()`, que recarga de
PostgreSQL:

- existencia del usuario;
- `activo`;
- rol actual;
- perfil de inmobiliaria;
- membresía `agenciaId`;
- asignación actual de la propiedad mediante el scope.

Se añadió `User.activo` con default `true` y la migración versionada
`20260728120000_user_active_authorization`. No se ejecutó contra una base
externa. Un usuario eliminado o inactivo obtiene `null`; un cambio de rol,
membresía o asignación se aplica en la siguiente operación sin esperar al JWT.

## Pruebas agregadas

- Estados públicos exactos y exclusión de `PAUSADA`/`VENDIDA`.
- Forma exacta del DTO detalle y ausencia de campos internos.
- Matriz de modificación tenant/agente/ADMIN/usuario normal.
- Usuario deshabilitado rechazado al iniciar sesión.
- Contacto público exitoso y rechazo sin escrituras para propiedad no pública.
- Favorito público exitoso y rechazo sin escrituras para propiedad no pública.
- Presencia de política central en cada colección y loader público.
- Orden de validación antes de la transacción de contacto.
- Route legacy ausente.
- Mutaciones por ID con scope y 404 genérico.
- Se mantienen las pruebas Phase 0 de pérdida inmediata de asignación para
  uploads y aislamiento de assets/prefijos.

## Riesgos restantes

- La migración de `activo` debe aplicarse mediante el proceso normal antes de
  usar deshabilitación en producción.
- Los datos comerciales `email` y `telefono` de perfiles B2B siguen siendo
  públicos por decisión funcional existente.
- El navegador puede conservar en `localStorage` una copia histórica de una
  ficha que fue pública; la aplicación ya no la renderiza sin reverificación,
  pero no puede borrar almacenamiento de clientes que no vuelvan a conectarse.
- Permanecen los hallazgos de dependencias aceptados en
  `docs/dependency-security-audit.md`.

## Límite de alcance

Phase 2 no fue iniciada. No se modificaron lógica monetaria, analytics ni
tracking de visitas, salvo dejar de serializar contadores internos en DTOs
públicos. Tampoco se inició Phase 3, refactorización general de componentes ni
limpieza de código muerto.
