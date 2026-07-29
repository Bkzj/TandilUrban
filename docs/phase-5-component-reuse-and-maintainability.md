# Fase 5 — reutilización de componentes y mantenibilidad

Fecha: 2026-07-29. Commit de partida:
`45206e090cdbfcd4dd76b2b42a5595f9b85ff449`.

## Metodología e inventario

Antes de modificar código se revisaron los 251 módulos TypeScript/TSX
alcanzables informados por `check:dead-code`. La comparación combinó estructura
JSX, imports, clases Tailwind, hooks, eventos, límites Server/Client Component y
responsabilidades. También se consultó la documentación de Next.js 16.2.12
instalada en `node_modules/next/dist/docs`. La reducción de líneas nunca fue el
único criterio.

| Grupo | Evidencia inicial | Decisión |
| --- | --- | --- |
| héroes de emprendimientos, inmobiliarias y destacados | misma jerarquía, parallax, collage, barra y enlace de scroll | consolidar el armazón y el collage por composición |
| tarjetas públicas | precio, imagen y fallback repetidos | compartir primitivas pequeñas; conservar layouts de dominio |
| cuatro mapas Leaflet | tile, atribución, pin y loading repetidos | compartir infraestructura; conservar overlays y edición |
| `StepOperacion` y `StepTipo` | mismo selector y avance temporizado | crear `ChoiceStep<T>` con radios nativos |
| login y registro | feedback y mensajes dispersos | centralizar presentación, sin mover autorización al cliente |
| dinero | prefijo de moneda repetido | un formatter exacto sobre `PublicMoneyDto`/`Currency` |
| imágenes | placeholder de propiedad repetido | compartir sólo el fallback de propiedad |
| emails | dos implementaciones de `escapeHtml` | compartir escape de texto plano para HTML |
| Navbar | navegación desktop/mobile y reglas visuales repetidas | modelo tipado común; conservar interacción en el componente |
| `PropertyGallery` | galería y lightbox mezclados | extraer el lightbox y su contrato tipado |
| `PropertyQuickView` | modal tenant con acciones y datos privados | mantenerlo separado; compartir sólo el foco del diálogo |
| formulario lineal, imágenes, contactos e informe | alta complejidad y límites de seguridad/transacción | no desplazar complejidad sin un límite reusable comprobado |

No se intentó crear una tarjeta, un mapa ni un fallback universales.

## Componentes y helpers creados

### Héroes

`EditorialPortalHero` y `EditorialHeroCollage` concentran el parallax, reduced
motion, layout responsive, enlace de scroll y collage. Los tres módulos de
sección conservan título, copy, métricas, acciones, decoraciones y overlays
propios. No se agregaron booleanos de sección.

Consumidores migrados:

- `EmprendimientosHero`
- `InmobiliariasHero`
- `DestacadosHero`

### Tarjetas e imágenes

`PropertyPrice` consume monto decimal exacto y moneda cerrada.
`PropertyImage`, `resolvePropertyImageSource` y
`PROPERTY_IMAGE_PLACEHOLDER` resuelven el caso de imagen pública de propiedad.
Los consumen `PropertyCardPublic`, `EmprendimientoPropiedadCard` y
`FeaturedPropertyCard`.

Los layouts permanecen separados porque difieren en badges, acción de favorito,
prioridad de carga y navegación. El favorito continúa fuera del enlace
principal; no hay controles interactivos anidados. Quick view y las tarjetas
compactas de mapa conservan su interacción específica. Logos y avatares no
usan el fallback de propiedades porque tienen semántica y alternativas
accesibles distintas.

### Leaflet

`PropeaMapTileLayer` define una sola vez URL y atribución; el pin se crea y
cachea en `propea-map-icon.ts`; `LeafletMapLoading` sirve a los wrappers
dinámicos sin importar CSS de Leaflet durante SSR.

Consumidores migrados:

- mapa principal de resultados;
- ubicación pública de propiedad;
- explorer;
- selector editable de ubicación.

Los bounds, POI/transporte, selección draggable y eventos de marcadores
permanecen en cada consumidor. Leaflet sigue siendo client-only y se carga con
`dynamic(..., { ssr: false })`.

### Formularios, autenticación y diálogos

`ChoiceStep<T extends string>` reemplaza `BigChoice`. Usa `fieldset`, `legend`
y radios nativos, conserva íconos, descripción, estado seleccionado, foco
visible y avance demorado. Los valores siguen siendo uniones cerradas; no se
convierten a strings sin validar.

`auth-error-messages.ts` y `AuthFeedback` centralizan mensajes españoles y roles
`alert`/`status`. Login y registro mantienen errores genéricos para evitar
enumeración de cuentas. La autorización y el estado actual del usuario siguen
resolviéndose exclusivamente en servidor; `Retry-After` no se altera.

`useDialogFocusTrap` unifica foco inicial, Escape, ciclo con Tab, bloqueo de
scroll y restauración del foco en el lightbox y quick view.

### Dinero y HTML

`formatMoney` acepta texto decimal exacto, `ARS | USD` y `null`. Reutiliza
formatters cacheados, no convierte a `number`, rechaza notación científica y
precisión no admitida, y devuelve `Consultar` para ausencia de precio. Se
migraron tarjetas, detalle, quick view, tablas, reportes, Open Graph, recientes
y match engine. No realiza cálculos ni conversiones entre monedas.

`escapePlainTextForHtml` está limitado al contexto texto-plano-a-HTML de emails
transaccionales. Escapa ampersand, ángulos y comillas una sola vez por entrada.
No reemplaza sanitización de rich text, DOMPurify, metadata ni las protecciones
SSRF de PDF. El HTML generado por IA sigue tratándose como no confiable según
los límites existentes.

## Autorización y límites de seguridad

La auditoría no encontró guards de servidor que debieran sustituirse por lógica
de UI. Se conservaron los guards Phase 1, la recarga de rol/estado, el aislamiento
tenant y las comprobaciones de Cloudinary. `navbar-navigation.ts` sólo decide
visibilidad: `INMOBILIARIA` y `AGENTE` ven panel; `USUARIO_NORMAL` no; `ADMIN`
global no obtiene tenant implícito. Esto no concede acceso.

No se cambiaron DTO, rutas, política pública, contratos API, límites de subida,
IDs administrados, ownership, ciclo de borrado ni transacciones. `StepImagenes`
y las galerías no generan `public_id` ni autoridad Cloudinary del lado cliente.

## Hotspots

Las cifras usan el mismo conteo de líneas no vacías antes y después:

| Módulo | Antes | Después | Límite resultante |
| --- | ---: | ---: | --- |
| `EmprendimientosHero` | 239 | 137 | contenido de la variante; shell compartido |
| `InmobiliariasHero` | 246 | 150 | contenido de la variante; shell compartido |
| `DestacadosHero` | 256 | 157 | contenido de la variante; shell compartido |
| `PropertyGallery` | 489 | 357 | galería; lightbox en módulo de 145 líneas no vacías |
| `PropertyQuickView` | 489 | 489 | modal tenant; comparte sólo foco |
| `Navbar` | 324 | 320 | interacción; modelo de rutas/roles separado |
| `StepOperacion` | 30 | 19 | opciones del dominio |
| `StepTipo` | 29 | 25 | opciones del dominio |
| `MapInner` | 131 | 113 | resultados y marcadores |
| mapa público de ubicación | 142 | 124 | POI y transporte |
| `ExplorerMap` | 97 | 84 | bounds y selección |
| `LocationMap` | 58 | 44 | edición de coordenadas |

`LinearPropertyForm` (427), `StepImagenes` (373), `actions/contacto.ts` (646) e
`informe-total` (650→651) no se dividieron: sus límites de transacción,
Cloudinary, autorización o render server no tenían otra reutilización segura.
Moverlos a hooks o archivos de un solo uso sólo habría desplazado complejidad.

## Accesibilidad

- Un único `h1` se conserva en cada héroe y reduced motion evita desplazamientos
  animados.
- `ChoiceStep` usa semántica radio, label/description asociados y foco visible.
- Tarjetas mantienen un enlace principal y acciones hermanas, sin nesting
  interactivo.
- Lightbox y quick view tienen diálogo modal, foco inicial, Tab/Shift+Tab,
  Escape, scroll bloqueado y restauración del foco.
- Fallbacks conservan dimensiones y `alt`; una imagen decorativa no recibe un
  nombre engañoso.
- Navbar conserva variantes mobile/desktop, Escape y estados autenticados.

La cobertura automatizada valida estas propiedades estructurales y de
renderizado. No sustituye una auditoría manual con lector de pantalla.

## Estrategia de regresión visual

El repositorio no contiene Playwright, navegador de pruebas ni servidor de
fixtures visuales. Agregar esa infraestructura habría incorporado dependencias
y baselines grandes sin poder garantizar tiles de mapa offline. Se adoptó una
estrategia local determinista:

- render SSR de las tres variantes de héroe con fixtures ficticios;
- contratos DOM de títulos, métricas, acciones, radios y feedback;
- contratos arquitectónicos de clases responsive para mobile/tablet/desktop;
- verificación de imports SSR-safe para wrappers dinámicos de mapas;
- build completo de Next.js.

Resultado: los contratos y el build pasan. No se afirma paridad pixel-perfect;
queda como deuda incorporar screenshots browser deterministas si se aprueba una
infraestructura sin red para Leaflet.

## Rendimiento y bundles

Antes había 211 archivos TS/TSX first-party y 68 módulos con `use client`;
después hay 225 y 74. Los seis módulos cliente adicionales aíslan
responsabilidades ya ejecutadas en árboles cliente; no convierten Server
Components existentes. El texto de `src` pasó de 760.155 a 762.058 caracteres
normalizados: +1.903 (+0,25 %) incluyendo pruebas de seguridad de límites
internos sólo cuando residen en `src`.

El build final mantiene la topología de 27 páginas y los mismos dos warnings
preexistentes (configuración de Tailwind y tracing global provocado por PDF).
La salida actual contiene 47 chunks JS y 3.153.684 bytes; Next.js 16 no informó
tamaños por ruta y no se capturó un artefacto baseline equivalente, por lo que
no se atribuye una reducción de bundle. Leaflet sigue lazy-loaded. El video hero
de aproximadamente 43 MB no se modificó y requiere una decisión de rendimiento
separada.

## Código supersedido

Se eliminaron implementaciones inline, no rutas ni archivos con contrato:

- shells/parallax/collages duplicados de los tres héroes;
- `BigChoice`;
- tile, atribución, loading y construcción repetida de pins;
- dos funciones privadas `escapeHtml`;
- composición repetida de moneda/precio;
- lightbox embebido en `PropertyGallery`.

No quedó un wrapper de compatibilidad sin consumidor. No se borró ningún módulo
completo: los archivos originales siguen siendo las variantes de dominio y
todos tienen consumidores reales.

## Pruebas

Se agregaron suites de primitives y arquitectura que cubren:

- contenido único, jerarquía y acciones de los tres héroes;
- dinero exacto ARS/USD, centavos, montos grandes, null e inputs inválidos;
- fallback de propiedad y fixtures deterministas;
- semántica radio de `ChoiceStep`;
- feedback genérico y accesible de autenticación;
- matriz visual de Navbar, incluido ADMIN global sin tenant;
- escape HTML y doble escape explícito de entrada ya escapada;
- consumo de primitivas desde cards y ausencia de Prisma;
- infraestructura Leaflet, overlays específicos e import SSR-safe;
- contratos responsive, reduced motion y foco de diálogos;
- límites client/server, ausencia de ciclos y código supersedido.

La suite completa de Phases 0–4 continúa siendo la prueba de regresión de
autorización, DTO, Decimal, analytics, validación, Cloudinary y dead code.

## Riesgos y deuda restante

- Falta regresión visual pixel a pixel y validación manual con lector de
  pantalla.
- Quick view, Navbar, formulario lineal, imágenes, contactos e informe siguen
  siendo hotspots deliberadamente no sobreabstraídos.
- Las variantes de cards y los overlays de mapas conservan duplicación de
  dominio intencional.
- No hay métrica comparable de bundle por ruta.
- El video hero grande permanece intacto.

No se agregó ni modificó schema o migración, no se contactó una base externa, no
se desplegó y no se cambió ninguna dependencia.
