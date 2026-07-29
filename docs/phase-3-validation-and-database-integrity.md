# Fase 3: validación e integridad de datos

## Alcance

Esta fase centraliza los contratos de entrada, agrega invariantes en PostgreSQL y
refuerza transacciones e idempotencia. Conserva el modelo Cloudinary de Fase 0,
la autorización/DTO públicos de Fase 1 y Decimal/analytics de Fase 2. No incluye
limpieza de código muerto, rediseño de componentes ni trabajo de Fase 4.

Se inventariaron los handlers de `src/app/api/**`, las tres familias de Server
Actions, registro/credenciales/verificación, contacto, propiedades, equipo,
Cloudinary, Gemini, PDF, favoritos, recientes, visualizaciones, búsquedas,
analytics, scripts/worker y todas las lecturas de `process.env`.

## Arquitectura de validación

Zod 4.3.6 ya formaba parte del árbol transitivo y ahora es una dependencia
directa de runtime. Así los contratos no dependen accidentalmente de Puppeteer.
Los tipos de entrada se infieren de los schemas.

Módulos:

- `validation/common.ts`: IDs, nombres, emails, teléfonos, texto y números finitos.
- `validation/auth.ts`: registro, credenciales, agentes, tokens y callbacks.
- `validation/property.ts`: alta/edición integral de propiedades.
- `validation/property-state.ts`: estados y transiciones.
- `validation/contact.ts`: consultas y visitas presenciales.
- `validation/upload.ts`: data URLs, magic bytes, uploads y recientes.
- `validation/ai.ts`: entrada y salida no confiable de Gemini.
- `validation/pagination.ts`: búsqueda, filtros, orden y paginación.
- `validation/analytics.ts`: variantes de informe.
- `validation/url.ts`: URLs HTTPS, hosts privados y assets.
- `validation/environment.ts`: configuración por ambiente.
- `validation/request.ts`: lectura limitada de JSON, query y params.

`parseJsonBody` controla `Content-Length`, lee el stream con un contador, cancela
al exceder el máximo, y recién entonces decodifica UTF-8 y parsea JSON. Los
servicios reciben el resultado tipado; no vuelven a interpretar el body.

## Límites

| Entrada | Límite |
|---|---:|
| JSON general | 256 KiB |
| Registro, equipo y cambios de estado | 8 KiB |
| Contacto público / recientes | 16 KiB |
| Alta o edición de propiedad | 1 MiB |
| Gemini: textos | 5 MiB |
| Gemini: clasificación de fotos | 17 MiB |
| Upload Cloudinary | 17 MiB por request |
| Imagen Cloudinary decodificada | 12 MiB |
| Imagen Gemini decodificada | 2 MiB |
| Portada Gemini decodificada | 3 MiB |
| Título | 160 caracteres |
| Descripción | 10.000 caracteres |
| Mensaje de contacto | 2.000 caracteres |
| Nombre | 120 caracteres |
| Email | 254 caracteres |
| Teléfono | 32 caracteres / 6–15 dígitos |
| Dirección | 240 caracteres |
| Barrio/localidad | 120 caracteres |
| URL | 2.048 caracteres |
| Búsqueda | 120 caracteres |
| Notas para IA | 4.000 caracteres |
| Características | 40, de 80 caracteres cada una |
| Imágenes por propiedad | 80 |
| Imágenes por lote Gemini | 15 |
| Tamaño de página | 50 |
| IDs de vistos recientemente | 6 |
| Batch de favoritos reservado | 50 |
| Clave de idempotencia recibida | 16–128 caracteres |
| Contraseña | 8–128 caracteres |
| Server Actions (envoltorio HTTP completo) | 256 KiB |

El upload y Gemini verifican tamaño base64 aproximado antes de `Buffer.from`,
tamaño real después de decodificar, MIME permitido y firma JPEG/PNG/WebP. Gemini
recibe como máximo 15 JPEG y tiene timeout de 20 segundos y cuota por usuario.

## Normalización

- Texto de una línea: Unicode NFKC, trim, espacios consecutivos colapsados y
  rechazo de controles.
- Descripciones/mensajes: NFKC, finales de línea `\n`, trim; no se colapsa el
  espaciado interno que puede tener significado.
- Emails: trim y minúsculas; no se modifica la contraseña.
- Teléfonos: se conserva la representación legible permitiendo dígitos,
  espacios, `+`, paréntesis, guiones, punto y barra. Se exige una cantidad
  razonable de dígitos, pero no se afirma que el número exista.
- Dinero: conserva la validación Decimal de Fase 2; no admite números JS,
  notación científica, negativos ni más de dos decimales.
- IDs, enums y claves se validan contra dominios cerrados. Tenant, usuario,
  rol, contadores, propietario, `public_id`, origen panel y exclusividad nunca
  son autoridad del cliente.
- Query params desconocidos en la búsqueda pública se ignoran deliberadamente;
  cuerpos de mutación, sorting y queries de API son estrictos.

La edición de propiedad es un `PUT` completo: omitir un campo requerido invalida
la solicitud. El único `PATCH` de propiedad es el cambio de estado, por lo que
`undefined`, `null` o cadena vacía no pueden borrar campos indirectamente.

## Invariantes de propiedad

Latitud debe estar entre -90 y 90 y longitud entre -180 y 180; ambas deben ser
finitas. Superficies son no negativas, `m2Total` es positiva y, salvo lotes,
`m2Cubiertos <= m2Total`. Cantidades son enteros de 0 a 100. Tipos admitidos:
Casa, Departamento, Lote, Local y Oficina. Operaciones: VENTA y ALQUILER.
Monedas: ARS y USD.

Los archivos no pueden repetirse. Una URL HTTPS legacy sólo se conserva si ya
estaba asociada exactamente a la propiedad; archivos nuevos deben resolver
contra el registro Cloudinary del tenant/propiedad. El `public_id` del cliente
se descarta y se reconstruye desde ese registro.

### Transiciones de estado

La misma transición es idempotente.

| Desde | Hacia permitido |
|---|---|
| DISPONIBLE | RESERVADA, PAUSADA, VENDIDA |
| RESERVADA | DISPONIBLE, PAUSADA, VENDIDA |
| PAUSADA | DISPONIBLE |
| VENDIDA | ninguna transición a otro estado |

Reabrir una venta requiere una futura decisión explícita; no se habilita por
enviar un objeto completo. La política pública sigue admitiendo sólo DISPONIBLE
y RESERVADA.

## Contrato de errores

Las rutas migradas responden un status HTTP real y:

```json
{
  "error": "Mensaje seguro en español",
  "code": "VALIDATION_ERROR",
  "requestId": "correlation-id",
  "fields": {
    "titulo": ["Detalle seguro opcional"]
  }
}
```

Códigos estables: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `EXTERNAL_UNAVAILABLE` e
`INTERNAL_ERROR`. El header `x-request-id` replica un identificador entrante
válido o genera un UUID. `Retry-After` se conserva para rate limits.

No se devuelven stacks, errores SQL, rutas locales ni textos de Cloudinary,
Resend o Gemini. IDs cross-tenant mantienen el not-found genérico.

## URLs y recursos externos

En producción se admite HTTPS, sin credenciales embebidas, controles, destinos
loopback, link-local ni IP privada literal. HTTP se limita a localhost en
desarrollo. Cloudinary administrado usa `res.cloudinary.com`; el registro
server-side y el prefijo de ownership siguen siendo la autoridad.

Las imágenes HTTPS legacy pueden mostrarse por compatibilidad, pero no otorgan
derecho de borrado. PDF conserva resolución DNS, allowlist de orígenes,
redirecciones del mismo origen y `APP_INTERNAL_URL`; las URLs del request nunca
deciden el destino de Puppeteer. `javascript:`, `data:` (salvo data URL de
upload validado), `file:` y `ftp:` se rechazan.

## Entorno

`serverEnvironmentSchema` clasifica y valida:

- Siempre: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `APP_URL`,
  `NEXT_PUBLIC_APP_URL`, `APP_INTERNAL_URL`, `VIEW_TRACKING_SECRET`.
- Producción: además Cloudinary, Resend y backend PostgreSQL de rate limit.
- Opcionales: Gemini/modelo, destinatarios internos, ejecutable/sandbox de
  Puppeteer, orígenes PDF y header de proxy confiable.
- Multinstancia opcional: `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, Base64 de
  16/24/32 bytes.
- Única variable intencionalmente pública:
  `NEXT_PUBLIC_APP_URL`. Ningún módulo cliente importa el schema de secretos.

Producción exige HTTPS, secretos de al menos 32 caracteres y rechaza
placeholders. `npm run build` usa un wrapper multiplataforma que entrega al
proceso hijo valores efímeros de build y una URL PostgreSQL local no alcanzable;
no necesita ni contacta una base externa. Conserva las URLs públicas configuradas
para que el artefacto de producción tenga su origen real. Esos valores no se
exportan al runtime de `next start`, que aplica las exigencias completas.
Prisma CLI usa una URL local no alcanzable únicamente para `generate`/`validate`
sin `.env`; todo comando que realmente acceda a datos falla cerrado si no se le
entrega una base local explícita. Desarrollo/test usa sólo defaults locales no
secretos si no existe `.env`; producción no.

## PostgreSQL e integridad tenant

La migración
`20260728180000_phase3_validation_data_integrity/migration.sql` ejecuta primero
preflight que aborta ante filas incompatibles. Luego agrega:

- checks de coordenadas finitas/rango, superficies, cantidades, tipo/operación,
  longitudes de textos y pares de idempotencia;
- checks de coordenadas de POI, bytes/status/fechas Cloudinary, intentos de
  cleanup, buckets positivos, y expiración posterior a emisión;
- uniques compuestos `Propiedad(id,inmobiliariaId)` y
  `Contacto(id,propiedadId)`;
- FK compuesta vista→propiedad/tenant y evento físico→contacto/propiedad;
- trigger diferible propiedad/agente/tenant y bloqueo del cambio de membresía
  de un agente todavía asignado;
- trigger Cloudinary que exige propiedad/tenant para assets no draft, o un job
  de borrado durable coincidente cuando la propiedad ya fue eliminada;
- índices únicos para creación idempotente y claves compuestas.

Los jobs de borrado conservan `propertyId` sin FK porque deben sobrevivir al
borrado de la propiedad. Los drafts pueden existir antes de la propiedad; esa
excepción continúa protegida por capacidad expirable, tenant, usuario y prefijo.

`rollback.sql` restaura las FK simples y elimina triggers, checks, columnas e
índices de Fase 3. Es destructivo respecto de fingerprints. Las claves legacy
se hashean al subir de versión y no pueden reconstruirse; `pgcrypto` no se
elimina por si es compartido.

## Transacciones e idempotencia

- Alta de propiedad y binding de drafts: una transacción.
- Edición, creación de jobs para assets removidos y actualización: una
  transacción; ninguna llamada Cloudinary ocurre con locks abiertos.
- Borrado: propiedad, registry y job durable conservan el modelo Fase 0.
- Contacto y contador de consultas: una transacción.
- Evento físico y contador: una transacción con advisory lock por clave.
- Registro y token: una escritura atómica. El email se envía después; un fallo
  conserva cuenta/token y permite resend, en vez de borrar datos confirmados.
- Gemini, Resend y Cloudinary quedan fuera de transacciones. El upload mantiene
  compensación remota si falla el registro de ownership.

Las claves recibidas usan `[A-Za-z0-9_-]`, 16–128 caracteres. Se guarda SHA-256
con scope de operación/usuario/tenant y una huella SHA-256 del input normalizado.
Misma clave/mismo input devuelve el resultado existente; misma clave/datos
distintos produce conflicto. Las claves históricas se preservan como hashes
marcados legacy. Contactos y eventos conservan sus registros mientras viva el
dominio, por lo que su idempotencia tiene igual retención; los jobs se limpian
según su lifecycle. La creación de propiedad usa una clave generada en cliente
que se conserva ante pérdida de respuesta.

## Logging

El logger produce una línea JSON con timestamp, nivel (`debug`, `info`, `warn`,
`error`), evento y contexto acotado. Redacta recursivamente authorization,
cookies, contraseñas, secretos, tokens, API keys, email, teléfono, mensaje y
body. Trunca strings y arrays grandes y tolera ciclos. Los errores externos se
registran por nombre/código seguro, `requestId`, IDs operativos mínimos y estado
de retry; nunca por payload completo.

## Validación de migraciones

En Docker local `postgres:17-alpine`, sin conexión externa:

1. las 17 migraciones aplicaron desde base vacía;
2. `prisma migrate diff` no detectó diferencias contra el schema;
3. datos válidos representativos preservaron `99999999999999.99` y `1234.56`;
4. checks rechazaron negativo, agente cross-tenant, vista cross-tenant, evento
   cruzado y expiración inválida;
5. el upgrade Fase 2→3 convirtió claves legacy a hashes/huellas de 64 caracteres;
6. rollback restauró FK anteriores y eliminó columnas/índices de Fase 3.

El contenedor y sus dos bases descartables fueron eliminados al terminar.

## Pruebas

Se agregaron pruebas unitarias de límites, normalización, dinero, coordenadas,
superficies, enums, colecciones, duplicados, transiciones, auth, contacto, URLs,
sorting, callbacks, base64/magic bytes, errores, logging, entorno e idempotencia.
Pruebas de repositorio verifican preflight, checks, FK, triggers y rollback.
Pruebas de handlers ejercitan 400 estructurado, 413 antes de consulta/escritura
y ocultamiento de excepciones internas. Continúan las pruebas reales previas de
atomicidad Cloudinary, contacto/counter, borrado durable y tenant authorization.

## Riesgos y acciones operativas

- Ejecutar el SQL de preflight en staging contra backup y remediar manualmente
  cualquier fila reportada; la migración no corrige datos silenciosamente.
- Configurar jobs de cleanup/idempotencia según retención aprobada.
- Configurar una clave estable de Server Actions si se despliegan varias
  instancias.
- Gemini SDK no expone cancelación completa por desconexión en este flujo; sí
  existe timeout y cuota.
- La validación de teléfono es sintáctica, no una verificación de titularidad.
- Los hosts DNS de imágenes legacy se validan nuevamente por las defensas SSRF
  de PDF si el servidor intenta navegarlos.

Fase 4 no fue iniciada.
