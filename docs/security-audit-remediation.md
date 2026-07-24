# Remediación de seguridad

Estado al 22 de julio de 2026: **Phase 0 implementada y validada en el workspace y en el ZIP fuente extraído**. No se inició Phase 1. La migración sigue pendiente de despliegue y las credenciales requieren rotación manual.

## Límites de tenant y Cloudinary

La inmobiliaria y el usuario se resuelven desde la sesión y la base. El cliente no elige carpeta ni `public_id`. Los IDs nuevos siguen `propea/tenants/{tenantId}/properties/{propertyId}/{uuid}`.

Una capacidad de borrador autenticada contiene versión, tenant, propiedad, usuario emisor, emisión, vencimiento de dos horas y nonce aleatorio. Al recibir un `propertyId`, el servicio primero consulta la propiedad. Si existe, siempre exige `userCanModifyPropiedad`; un token de borrador nunca sustituye autorización actual. Si no existe, exige una capacidad vigente para ese tenant, usuario y propiedad.

`CloudinaryAsset` es la fuente de ownership e incluye estado `DRAFT`, `BOUND`, `PENDING_DELETION` o `DELETED`. La creación vincula todos sus assets dentro de la transacción de la propiedad, comprobando tenant, propiedad, creador, estado y vencimiento. Un fallo revierte la propiedad y deja borradores temporales, no assets permanentes. El job `npm run jobs:cloudinary-cleanup` programa borradores vencidos y procesa eliminaciones.

La eliminación de una propiedad crea `CloudinaryDeletionJob` y recursos por asset, marca los assets y elimina la propiedad en una sola transacción. Cloudinary se procesa después. Los fallos se reintentan con backoff; cada recurso conserva resultado, intentos y error genérico. `not found` es éxito idempotente. Una discrepancia de tenant/prefijo se rechaza sin llamar a Cloudinary. Recursos legacy no registrados nunca se eliminan automáticamente y no se borran carpetas.

Límites de carga: 12 MiB por archivo, 17 MiB por request, JPEG/PNG/WebP con MIME, base64, tamaño decodificado y firma validados; 200 archivos o 250 MiB por tenant cada 24 horas. Los límites de requests usan `RateLimitBucket` en PostgreSQL con incremento atómico, vencimiento y limpieza. Las claves de upload separan IP, usuario y tenant. `RATE_LIMIT_BACKEND=memory` solo funciona de forma explícita fuera de producción. No se confía en `x-forwarded-for`; únicamente se admite un header aprobado configurado explícitamente.

## PDF y origen confiable

`APP_INTERNAL_URL` es obligatorio, absoluto y HTTP/HTTPS. Host y headers forwarded no construyen URLs. Cookies se pasan con la API de Puppeteer y se limitan al origen confiable. La intercepción permite únicamente el origen interno y orígenes HTTPS exactos de `PDF_ALLOWED_ORIGINS`; bloquea destinos desconocidos, redirects, loopback, link-local y redes privadas salvo que el origen interno se haya configurado explícitamente así.

Chrome conserva sandbox por defecto. `PUPPETEER_DISABLE_SANDBOX=true` requiere contenedor/VM no privilegiado, usuario sin privilegios, filesystem restringido, seccomp/AppArmor equivalente, límites de recursos y sin acceso a redes internas.

## Verificación de correo

Credentials devuelve el mismo rechazo para cuenta inexistente, contraseña incorrecta y correo no verificado. Tokens nuevos se almacenan como SHA-256. Por compatibilidad, un token legacy en texto plano válido se reemplaza por su hash durante su primer uso; reenviar elimina tokens anteriores de esa cuenta. Los vencidos se eliminan. Login muestra en español el estado de verificación y un formulario de reenvío genérico que bloquea doble submit y respeta `Retry-After` en 429.

## Secretos y archivo fuente

`.env.example` contiene solo placeholders. `check:secrets` no imprime valores. `.gitignore` y el ZIP excluyen `.env`, credenciales, dumps, backups, `node_modules`, `.next`, `dist`, `assets-raw`, `src/generated/prisma`, `next-env.d.ts` y caches TypeScript.

`npm run archive:source` crea determinísticamente `dist/propea-group-source.zip` desde fuentes versionadas y fuentes nuevas no ignoradas. Falla si faltan esquema, migraciones, documentación, workflow o configuración, y si un cambio no excluido de `git status --short` no está representado. `npm run test:archive` extrae el ZIP en un directorio temporal y ejecuta instalación, Prisma, secretos, tests, lint, typecheck, build, chequeo Git del contenido y regeneración del ZIP.

## Renderizado y CI

`/inmobiliarias` consulta datos operativos y usa `await connection()` de Next.js 16 para render por request. El build ya no necesita PostgreSQL para prerenderizar ese directorio. CI ejecuta todos los scripts pedidos y también valida el ZIP extraído.

## Migración y rollback

Migración agregada: `database/migrations/20260722090000_cloudinary_asset_registry/migration.sql`. Es aditiva y crea:

- enums `CloudinaryAssetStatus` y `CloudinaryCleanupStatus`;
- `CloudinaryAsset`;
- `CloudinaryDeletionJob`;
- `CloudinaryDeletionResource`;
- `RateLimitBucket`;
- índices, unicidad y foreign keys correspondientes.

Antes del despliegue:

1. Detener publicaciones y cleanup workers.
2. Crear `pg_dump --format=custom`, cifrarlo y probar su restauración en un PostgreSQL aislado.
3. Registrar conteos de `User`, `Inmobiliaria`, `Propiedad` y `VerificationToken`.
4. Ejecutar `npx prisma migrate deploy` en ventana controlada.
5. Ejecutar smoke tests de upload/binding/delete y luego habilitar periódicamente `npm run jobs:cloudinary-cleanup`.

Rollback: volver primero a la aplicación anterior y detener workers. Como la migración es aditiva puede dejarse instalada. Si debe retirarse, exportar las cuatro tablas nuevas y ejecutar, bajo revisión, `database/migrations/20260722090000_cloudinary_asset_registry/rollback.sql`. Esto pierde auditoría y reintentos pendientes. Ninguna migración se ejecutó contra una base desde esta tarea.

## Variables requeridas — placeholders

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
NEXTAUTH_URL=https://app.example.com
NEXTAUTH_SECRET=REPLACE_WITH_AT_LEAST_32_RANDOM_BYTES
APP_URL=https://app.example.com
NEXT_PUBLIC_APP_URL=https://app.example.com
APP_INTERNAL_URL=https://app.example.com
PDF_ALLOWED_ORIGINS=https://res.cloudinary.com
PUPPETEER_DISABLE_SANDBOX=false
PUPPETEER_EXECUTABLE_PATH=/absolute/path/to/chrome
RATE_LIMIT_BACKEND=postgresql
RATE_LIMIT_TRUSTED_IP_HEADER=x-vercel-forwarded-for
GEMINI_API_KEY=REPLACE_WITH_GEMINI_API_KEY
GEMINI_MODEL=gemini-model-name
CLOUDINARY_CLOUD_NAME=REPLACE_WITH_CLOUD_NAME
CLOUDINARY_API_KEY=REPLACE_WITH_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=REPLACE_WITH_CLOUDINARY_API_SECRET
RESEND_API_KEY=REPLACE_WITH_RESEND_API_KEY
RESEND_FROM_EMAIL=Propea Group <no-reply@example.com>
LEAD_NOTIFICATION_TO_EMAIL=operaciones@example.com
MATCH_NOTIFICATION_TO_EMAIL=operaciones@example.com
```

Rotar manualmente PostgreSQL/DATABASE_URL, NEXTAUTH_SECRET, Gemini, Cloudinary key/secret y Resend. Rotar `NEXTAUTH_SECRET` invalida sesiones y capacidades de borrador existentes.

## Riesgos restantes

- El operador debe programar y monitorizar `jobs:cloudinary-cleanup`; sin scheduler los recursos remotos quedan huérfanos pero la base permanece consistente.
- PostgreSQL es un backend compartido correcto para rate limiting, con costo de escritura por request; vigilar crecimiento, latencia y autovacuum.
- Assets legacy requieren inventario y atribución manual antes de poder limpiarse.
- `npm audit` informa 15 vulnerabilidades transitivas (2 low, 7 moderate, 6 high); no se aplicó `--force` porque podría cambiar comportamiento.
- El build conserva advertencias no bloqueantes sobre tipo de módulo de Tailwind y trazado NFT de Puppeteer.
- Phase 1 a Phase 5 permanecen fuera de alcance y pendientes.
