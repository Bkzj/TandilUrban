# Auditoría de seguridad de dependencias

Fecha de revisión: 2026-07-27

Commit de línea base: `5fc6e539a21c69a4815d66bc0712e01b80317669`

Entorno: Node.js 24.13.0, npm 11.6.2

## Resumen ejecutivo

La línea base de `npm audit` contenía 18 hallazgos por paquete: 2 bajos, 6 moderados, 8 altos y 2 críticos. Se trazó cada ruta con `npm ls`/`npm explain` y se inspeccionaron los imports y la configuración de la aplicación.

Las exposiciones alcanzables en producción estaban concentradas en Next.js (App Router, Server Actions e Image Optimization) y sus transitivos. Se actualizaron Next.js y Auth.js dentro de sus líneas compatibles, se actualizó Prisma y el tooling que arrastraba los demás avisos, y se fijaron `postcss` y `sharp` a versiones corregidas mediante overrides acotados. El árbol final mantiene 12 hallazgos numéricos: 1 bajo, 10 altos y 1 crítico. Nueve son agregaciones de tooling de lint que sólo procesa patrones y código confiables; los otros tres pertenecen al grupo Auth.js de un peer opcional instalado por npm que el runtime de NextAuth v4 no importa ni ejecuta.

No queda una vulnerabilidad demostrablemente alcanzable por entrada no confiable en el runtime de producción. Los hallazgos aceptados deben revisarse cuando NextAuth v4 publique una versión que deje de declarar el peer opcional antiguo, o cuando ESLint 10 y el ecosistema de plugins sean compatibles con la configuración de Next.js usada por el proyecto.

## Cambios aplicados

Dependencias directas:

| Paquete | Versión original | Versión final | Motivo |
|---|---:|---:|---|
| `@auth/prisma-adapter` | 2.11.2 | 2.11.3 | Lleva su `@auth/core` interno de 0.41.2 a 0.41.3. |
| `@prisma/adapter-pg` | 7.8.0 | 7.9.1 | Mantiene alineado el runtime con Prisma y elimina transitivos vulnerables del CLI. |
| `@prisma/client` | 7.8.0 | 7.9.1 | Parche compatible y alineado con el generador. |
| `prisma` | 7.8.0 | 7.9.1 | Elimina Hono vulnerable y actualiza `@prisma/dev`, `fast-uri` y `valibot`. |
| `next` | 16.2.4 | 16.2.12 | Corrige los avisos directos de App Router, Server Actions, proxy, caché e imágenes. |
| `next-auth` | 4.24.14 | 4.24.15 | Corrige los avisos propios y lleva `uuid` a 11.1.1. |
| `eslint` | 9.39.4 | 9.39.5 | Parche compatible; actualiza `js-yaml`. |
| `eslint-config-next` | 16.2.4 | 16.2.12 | Mantiene la configuración alineada con Next. |
| `tsx` | 4.21.0 | 4.23.1 | Lleva `esbuild` a 0.28.1. |

Transitivos relevantes: `@auth/core` 0.41.2 → 0.41.3 dentro del adaptador, `brace-expansion` 5.0.5 → 5.0.8 y 1.1.14 → 1.1.16, `dompurify` 3.4.8 → 3.4.12, `esbuild` 0.27.7 → 0.28.1, `fast-uri` 3.1.0 → 3.1.4, `js-yaml` 4.1.1 → 4.3.0, `@babel/core` 7.29.0 → 7.29.7, `uuid` 8.3.2 → 11.1.1 y `valibot` 1.2.0 → 1.4.2. Hono y `@hono/node-server` dejaron de formar parte del árbol.

Overrides:

| Paquete | Versión | Alcance y justificación |
|---|---:|---|
| `postcss` | 8.5.23 | Único paquete en todo el árbol. Sustituye el 8.4.31 fijado por Next 16.2.12. Es la misma línea 8.x y Next upstream ya adoptó PostCSS 8.5.x. |
| `sharp` | 0.35.3 | Único paquete en todo el árbol. Corrige las CVE heredadas de libvips; Next canary declara `sharp ^0.35.3`. La compatibilidad se valida además mediante instalación limpia, build y carga del módulo nativo. |

No se usó `npm audit fix --force`, no se cambió ninguna dependencia de aplicación a otra major y no se ejecutaron migraciones.

## Clasificación de los 18 hallazgos originales

“Bundled/runtime” indica si el paquete podía quedar disponible en el servidor o cliente de producción. “Entrada” describe si datos no confiables podían alcanzar la función vulnerable.

| # | Advisory / paquete | Severidad original | Versión original / parche | Ruta y tipo | Función vulnerable, entrada y presencia en producción | Conclusión y acción | Mitigación restante | Revisión |
|---:|---|---|---|---|---|---|---|---|
| 1 | `@auth/core` — GHSA-xmf8-cvqr-rfgj, GHSA-7rqj-j65f-68wh, GHSA-x445-f3h2-j279 | Crítica | 0.41.2 / 0.41.3 | app → `@auth/prisma-adapter` → `@auth/core`; transitiva de producción | `getToken`, normalizador de Email y cookies OAuth. La app sólo configura Credentials + JWT; no usa `getToken`, Email/magic-link ni OAuth. El core del adaptador está disponible en servidor, pero esas ramas no son invocadas. | No explotable con la configuración actual. Adaptador 2.11.3 instala core 0.41.3 corregido. | Mantener prohibidos Email/OAuth sin nueva revisión. El peer opcional 0.34.3 de NextAuth se trata aparte en riesgos aceptados. | 2026-07-27 |
| 2 | `@auth/prisma-adapter` | Alta | 2.11.2 / 2.11.3 | Directa de producción; agrega el hallazgo de su core | No contiene una primitiva adicional: hereda los avisos anteriores. La app sí usa `PrismaAdapter`, pero no las funciones vulnerables. | Corregido con 2.11.3. | Conservar la pareja adapter/core alineada. | 2026-07-27 |
| 3 | `@babel/core` — GHSA-4x5r-pxfx-6jf8 | Baja | 7.29.0 / 7.29.6+; final 7.29.7 | app → `eslint-config-next` → `eslint-plugin-react-hooks` → Babel; desarrollo/lint | Lectura de archivos mediante `sourceMappingURL` al compilar código malicioso y exponer la salida. Sólo procesa código versionado confiable; no se incluye en runtime. | No explotable en producción; corregido a 7.29.7. | No ejecutar lint sobre repositorios o fuentes no confiables. | 2026-07-27 |
| 4 | `@hono/node-server` — GHSA-92pp-h63x-v22m, GHSA-frvp-7c67-39w9 | Moderada | 1.19.11 / 1.19.13 o 2.0.5 | app → Prisma CLI → `@prisma/dev` → servidor Hono; build/dev | Bypass y traversal de `serveStatic`. La aplicación no crea un servidor Hono ni invoca `serveStatic`; no estaba en el runtime desplegable. | Build-only e inalcanzable; eliminado al actualizar Prisma. | Ninguna. | 2026-07-27 |
| 5 | `@prisma/dev` | Moderada | 0.24.3 / 0.24.17 | app → `prisma`; transitiva de CLI | Agregaba Hono y Valibot. Sólo se usa en generate/validate/CLI, no por `@prisma/client` en runtime. | Build-only; actualizado a 0.24.17. | No exponer Prisma Studio/CLI como servicio público. | 2026-07-27 |
| 6 | `brace-expansion` — GHSA-jxxr-4gwj-5jf2, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg | Alta | 5.0.5 y 1.1.14 / 5.0.8 y 1.1.16 para los avisos originales | app → ESLint/TypeScript ESLint → minimatch; desarrollo | DoS por patrones de llaves adversarios. ESLint recibe globs/configuración versionados, no solicitudes de usuario; no se empaqueta en producción. | Avisos originales corregidos. Un aviso posterior sigue marcando la rama 1.x; aceptado como tooling inalcanzable porque sustituirla por 5.x rompe la API esperada por minimatch 3. | No permitir que usuarios controlen patrones de lint; revisar con ESLint 10. | 2026-07-27 |
| 7 | `dompurify` — GHSA-c2j3-45gr-mqc4, GHSA-cmwh-pvxp-8882, GHSA-vxr8-fq34-vvx9 | Moderada | 3.4.8 / 3.4.12 | app → jsPDF → DOMPurify; transitiva opcional de cliente | Contaminación de configuración/hook y Trusted Types. La app carga jsPDF dinámicamente y sólo usa creación de PDF, imagen y guardado; no importa ni configura DOMPurify. Podía formar parte del bundle opcional, sin ruta desde HTML no confiable. | Presente pero inalcanzable; actualizado a 3.4.12. | Si se incorpora HTML en PDF, añadir sanitización y pruebas específicas. | 2026-07-27 |
| 8 | `esbuild` — GHSA-g7r4-m6w7-qqqr | Baja | 0.27.7 / 0.28.1 | app → `tsx` → esbuild; desarrollo/test/scripts | Lectura arbitraria en el dev server de esbuild sobre Windows. El proyecto usa `tsx` para tests/scripts y no inicia el dev server de esbuild; no está en producción. | Dev-only e inalcanzable; corregido mediante tsx 4.23.1/esbuild 0.28.1. | No exponer servidores de tooling. | 2026-07-27 |
| 9 | `fast-uri` — GHSA-q3j6-qgpj-74h6, GHSA-v39h-62p7-jpjc, GHSA-v2hh-gcrm-f6hx, GHSA-4c8g-83qw-93j6 | Alta | 3.1.0 / 3.1.4 | app → Prisma CLI → `@prisma/dev` → Ajv → fast-uri; build/dev | Confusión de host y traversal durante validación URI. Sólo valida metadatos/configuración del tooling; no recibe URLs de solicitudes en runtime. | Build-only; corregido a 3.1.4. | Ninguna. | 2026-07-27 |
| 10 | `hono` — múltiples GHSA de CORS, caché, JWT, JSX, body limit, adapters y static | Alta | 4.12.15 / 4.12.27+ | app → Prisma CLI → `@prisma/dev` → Hono; build/dev | Las funciones vulnerables requieren ejecutar una app Hono o adaptadores Lambda/AWS. TandilUrban usa Next, no Hono; el paquete no estaba en bundle/runtime. | Falso positivo para la aplicación; eliminado del árbol con Prisma 7.9.1. | Ninguna. | 2026-07-27 |
| 11 | `js-yaml` — GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m | Alta | 4.1.1 / 4.3.0 | app → ESLint → `@eslint/eslintrc` → js-yaml; desarrollo | DoS cuadrático con aliases/merge keys en YAML malicioso. Sólo procesa configuración versionada; no está en runtime. | Dev-only e inalcanzable; corregido a 4.3.0. | No lintar configuraciones YAML aportadas por usuarios. | 2026-07-27 |
| 12 | `next` — GHSA-8h8q-6873-q5fj y demás avisos App Router/Server Actions/proxy/caché/imagen | Alta | 16.2.4 / 16.2.12 | Directa de producción | La app usa App Router, Server Actions y `next/image`: las rutas DoS y de optimización eran alcanzables por solicitudes no confiables. No hay proxy/middleware, rewrites, servidor custom, CSP nonce, WebSocket upgrade ni Cache Components, por lo que esos subcasos no aplicaban. | Exposición de producción real; corregida a 16.2.12. Sus transitivos PostCSS/Sharp se corrigieron con overrides. | Seguir actualizando dentro de Next 16 y revisar `remotePatterns` al agregar hosts. | 2026-07-27 |
| 13 | `next-auth` — GHSA-xmf8-cvqr-rfgj, GHSA-7rqj-j65f-68wh, GHSA-x445-f3h2-j279 | Crítica | 4.24.14 / 4.24.15 | Directa de producción | Mismos casos Auth.js: Email normalizer, OAuth cookies y `getToken`. El proyecto sólo usa Credentials y JWT; no invoca esas ramas. | No explotable con la configuración actual; actualizado a 4.24.15. | No habilitar proveedores Email/OAuth sin revisión; vigilar el peer opcional descrito abajo. | 2026-07-27 |
| 14 | `postcss` — GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 | Alta | 8.5.10 raíz y 8.4.31 en Next / 8.5.23 | app → Tailwind/Next → PostCSS; build | XSS/stringify y lectura de mapas por CSS o `sourceMappingURL` controlado. La app sólo compila CSS versionado, no CSS de usuarios; no es runtime. | Build-time e inalcanzable, además corregido globalmente a 8.5.23 mediante override verificado. | No introducir compilación de CSS aportado por usuarios. | 2026-07-27 |
| 15 | `prisma` | Moderada | 7.8.0 / 7.9.1 | Directa de desarrollo/build; agrega `@prisma/dev` | El CLI agregaba Hono/Valibot; no afectaba las consultas de `@prisma/client` en runtime. | Build-only; corregido a 7.9.1 y alineado con client/adapter. | Mantener las tres versiones Prisma alineadas. | 2026-07-27 |
| 16 | `sharp` — GHSA-f88m-g3jw-g9cj | Alta | 0.34.5 / 0.35.0+; final 0.35.3 | app → Next Image Optimizer → sharp; transitiva opcional de producción | Vulnerabilidades heredadas de libvips al procesar imágenes no confiables. `next/image` y hosts remotos están activos, por lo que existía una ruta de producción potencial. | Exposición real; corregido a 0.35.3 mediante override respaldado por Next canary. | Mantener hosts/rutas de imágenes al mínimo y conservar límites de Next Image Optimizer. | 2026-07-27 |
| 17 | `uuid` — GHSA-w5hq-g745-h8pq | Moderada | 8.3.2 / 11.1.1 | app → next-auth → uuid; producción | Falta de bounds check sólo cuando el llamador entrega un buffer a v3/v5/v6. La app no llama uuid directamente ni entrega buffers controlados. | Presente pero inalcanzable; corregido por next-auth 4.24.15 a uuid 11.1.1. | Ninguna. | 2026-07-27 |
| 18 | `valibot` — GHSA-5qjj-4xww-7phc | Moderada | 1.2.0 / 1.4.2 | app → Prisma CLI → `@prisma/dev` → valibot; build/dev | `record()` podía hacer fallar `flatten()` con claves heredadas. Sólo procesa datos internos del CLI; no está en runtime. | Build-only; corregido a 1.4.2 con Prisma 7.9.1. | Ninguna. | 2026-07-27 |

## Riesgo aceptado en el árbol final

### Peer opcional de Auth.js

`next-auth@4.24.15` declara exactamente `@auth/core@0.34.3` como peer opcional y npm 11 lo materializa en la raíz junto con `cookie@0.6.0`. `npm audit` lo cuenta como 1 crítico, 1 alto agregado (`next-auth`) y 1 bajo (`cookie`). La inspección de NextAuth v4 encontró únicamente imports de tipo desde `@auth/core`; no existe un import de runtime. La configuración de la app tampoco usa Email, OAuth ni `getToken`. Forzar `@auth/core@0.41.3` violaría el peer exacto y bajar NextAuth a 4.24.7, como propone npm, reintroduciría vulnerabilidades corregidas.

Aceptación: presente en `node_modules`, pero no alcanzable ni incluido como código ejecutado por la aplicación. Revisar al publicar NextAuth v4 un peer corregido o al planificar una migración explícita de Auth.

### Cadena ESLint/minimatch

El aviso GHSA-mh99-v99m-4gvg se publicó durante la revisión y marca `brace-expansion <=5.0.7`. ESLint 9 y sus plugins usan minimatch 3, que exige la API CommonJS de `brace-expansion ^1.1.7`; la versión corregida 5.0.8 exporta una API distinta. Npm propaga el aviso a nueve paquetes (`brace-expansion`, `minimatch`, ESLint, dos paquetes internos de ESLint, tres plugins y `eslint-config-next`) y los cuenta como 9 altos.

Aceptación: cadena exclusivamente de desarrollo, ausente del runtime y alimentada sólo con globs/configuración confiables del repositorio. Actualizar a ESLint 10 sería un cambio major y varios plugins actuales todavía declaran peers hasta ESLint 9; el override directo a brace 5 rompería minimatch 3. Revisar cuando Next/los plugins publiquen una combinación compatible con ESLint 10.

## Conteo final y criterio de avance

Conteo fiable de `npm audit`: 12 totales — 1 bajo, 0 moderados, 10 altos, 1 crítico. El conteo incluye agregaciones, no doce primitivas independientes. `npm audit --omit=dev` conserva únicamente el grupo del peer opcional Auth.js; no identifica una ruta ejecutada por la aplicación.

Con la compuerta completa aprobada, el resultado es apto para comenzar Phase 1 desde el punto de vista de exposición de producción, con las dos aceptaciones anteriores registradas. Esta auditoría no inicia Phase 1.
