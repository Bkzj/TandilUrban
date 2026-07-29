# Fase 4 — código muerto y simplificación del repositorio

Fecha de revisión: 2026-07-28. Commit de partida:
`4f09eac56fe48c77e1f00fd40ee7f5b01137edd3`.

## Alcance y método de alcanzabilidad

Se inventariaron 312 archivos first-party de `src`, `scripts`, `prisma`, `tests`,
`database`, `docs`, `public` y configuración. El grafo inicial incluyó 261
módulos TypeScript/JavaScript y quedó en 251 módulos alcanzables después de la
limpieza y de agregar el checker y su prueba de regresión.

Se consideraron raíces, no sólo imports estáticos:

- pages, layouts, route handlers, metadata y demás convenciones de filesystem
  de Next.js;
- server actions, imports dinámicos y reexports;
- scripts de `package.json`, Prisma seed/config, workers, reconciliación,
  archivo fuente y CI;
- tests, documentación, referencias literales de assets y CSS;
- historia Git cuando el propósito de un candidato no era evidente.

La ausencia de un import aislado nunca fue prueba suficiente. El verificador
`scripts/check-dead-code.mjs` reconstruye ese grafo sobre los archivos actuales.

## Archivos eliminados

### Código y rutas

1. `src/app/(web)/perfil/seguridad/page.tsx`
2. `src/components/Button.tsx`
3. `src/components/HeroColumn.tsx`
4. `src/components/PropertyCard.tsx`
5. `src/components/SearchBox.tsx`
6. `src/components/panel/MetricCard.tsx`
7. `src/components/panel/PropiedadSeguimientoSection.tsx`
8. `src/components/panel/useChartMounted.ts`
9. `src/components/public/OportunidadesIntro.tsx`
10. `src/components/public/destacados/DestacadoPropertyCard.tsx`
11. `src/constants/mapData.ts`
12. `src/lib/panel-propiedad-payload.ts`
13. `src/types/api.ts`
14. `src/types/index.ts`

La página de seguridad era una pantalla deshabilitada que anunciaba cambio de
contraseña y 2FA sin flujos de producción. Los demás archivos no eran roots de
framework, no tenían consumidor estático, dinámico, documental, de script ni de
test. El contrato de contacto que vivía en `types/api.ts` se reemplazó en su
único consumidor por el tipo de dominio `PublicContactInput`.

### Assets

15. `public/file.svg`
16. `public/globe.svg`
17. `public/next.svg`
18. `public/vercel.svg`
19. `public/window.svg`
20. `public/data/geo/educacion.geojson`
21. `public/data/geo/export.geojson`
22. `public/data/geo/export-2.geojson`
23. `public/data/geo/gobierno-abierto-tandil-establecimientos-educativos-2.kml`
24. `resourses/favicon.ico`

Los SVG eran defaults de Next sin referencia. Los cuatro archivos geográficos
habían sido sustituidos por fuentes procesadas que sí usan los scripts. El
favicon estaba fuera de `public`, en una carpeta mal escrita, y no tenía
consumidor.

## Resultado de los candidatos originales

| Candidato | Decisión | Evidencia |
| --- | --- | --- |
| `components/Button.tsx` | eliminado | sin consumidor; los botones activos son implementaciones locales |
| `components/HeroColumn.tsx` | eliminado | sin import, route, referencia dinámica ni documental |
| `components/PropertyCard.tsx` | eliminado | variante obsoleta; las tarjetas públicas activas son otras |
| `components/SearchBox.tsx` | eliminado | sin consumidor; búsqueda activa usa componentes públicos actuales |
| `components/panel/MetricCard.tsx` | eliminado | sin consumidor; no se tocó el `MetricCard` local de `PropertyQuickView` |
| `components/panel/PropiedadSeguimientoSection.tsx` | eliminado | aun revalidado tras Fase 0, quedó reemplazado y sin consumidor |
| `components/panel/useChartMounted.ts` | eliminado | sin consumidor tras revalidar los gráficos actuales |
| `components/public/OportunidadesIntro.tsx` | eliminado | sin consumidor |
| `components/public/destacados/DestacadoPropertyCard.tsx` | eliminado | variante abandonada sin consumidor |
| `constants/mapData.ts` | eliminado | datos sin consumidor; el mapa usa fuentes vigentes |
| `types/index.ts` | eliminado | barrel sin consumidores y con reexports obsoletos |

Ningún candidato original fue retenido.

## Exports y helpers eliminados

Se eliminaron:

- `registrarVisitaFisica` (alias deprecado) y
  `getSeguimientoPropiedad` con su tipo de resultado;
- `requireInmobiliariaMain`, reemplazado hace fases por autorización central;
- `buildAuthPasswordResetLink` y `sendPasswordResetEmail`;
- `toMoneyDto` y `MoneyDto`;
- `PublicPropertyNotFoundError` y el guard público sin consumidores;
- tipos inferidos exportados sin consumidores en validación de auth, contacto y
  propiedad;
- `optionalIdentifierSchema`, `parseFormData`,
  `requirePropertyStateTransition` y schemas URL no usados;
- alias `RecentProperty`, reexports de tipos del mapa y defaults duplicados de
  `ExplorerMap`/`LocationMap`;
- helpers de cercanías sin consumidores y constantes visuales de panel
  inalcanzables.

`triggerMatchEngine` se retuvo: sí es llamado desde la acción de propiedades
mediante import dinámico. No se eliminó ningún wrapper con contrato externo
documentado.

## Rutas y acciones

Se inventariaron los 17 route handlers API actuales. Todos tienen consumidor
de UI/servidor, propósito operativo o contrato probado y se retuvieron. No se
reintrodujeron `/api/propiedades`, `/api/propiedades/[id]` ni `/api/seed`.

Sólo se quitó la route page `/perfil/seguridad`, porque era UI incompleta sin
backend. No se eliminó ningún archivo completo de server actions; únicamente
los dos exports muertos de contacto indicados arriba.

## Prisma y funciones de autenticación incompletas

No se creó migración de Fase 4.

- `PuntoInteres` y `CategoriaPuntoInteres` se retienen. El runtime público usa
  `public/data/tandil-pois.json`, pero los seeds todavía crean estos registros y
  no hay evidencia de que producción tenga cero filas.
- `User.twoFactorEnabled` y `User.twoFactorSecret` se retienen como campos
  reservados. No existe configuración, segundo desafío, recovery codes ni
  desactivación 2FA, y ninguna UI afirma que la función esté disponible.
- El correo incompleto de recuperación de contraseña se eliminó. No existen
  solicitud, token de reset, expiración específica, cambio de contraseña ni
  invalidación de sesiones que formen un flujo completo.

`database/preflight/phase4-legacy-candidates.sql` informa, sin mutar datos,
conteos de `PuntoInteres`, categorías, uso efectivo de ambos campos 2FA y
foreign keys. Debe ejecutarse sobre la base explícitamente seleccionada antes
de considerar una futura migración. No se ejecutó contra una base externa.

## Assets retenidos

Se retuvieron los diez assets públicos referenciados. En particular,
`public/videos/hero-sunset.mp4` (43.020.793 bytes) sigue usado por el hero y no
fue recomprimido. También se conservaron `tandil-pois.json` y las fuentes
geográficas consumidas por `geo:geocode`/`geo:process`, aunque algunas no se
carguen directamente desde una página.

## Dependencias

Cada dependencia directa se contrastó con imports, configuración, scripts y
peer requirements. Se removió únicamente `@types/xmldom`: el paquete
`@xmldom/xmldom` se usa en un script JavaScript operacional y no necesita ese
paquete de tipos separado.

Las dependencias runtime, Prisma, Tailwind/PostCSS, test/build, procesamiento
geográfico y peers React se retuvieron. No se cambiaron versiones ni se usó
`npm audit fix --force`. El audit permanece en 12 hallazgos aceptados: 1 low,
10 high y 1 critical.

## Artefactos, ciclos y control de regresión

Git y el ZIP excluyen `src/generated/prisma`, `node_modules`, `.next`, `dist`,
coverage, `tsconfig.tsbuildinfo`, `.env`, dumps, logs y archivos comprimidos.
Prisma se regenera con `postinstall`/`prisma generate`.

`npm run check:dead-code`:

- reconoce roots de Next, scripts, Prisma y tests;
- sigue imports estáticos, dinámicos y reexports;
- falla por módulos `src` inalcanzables;
- bloquea la reintroducción de rutas, archivos y exports obsoletos confirmados;
- revisa scripts de paquete, artefactos prohibidos y assets públicos;
- detecta ciclos first-party.

Resultado actual: 251 módulos alcanzables, 10 assets y cero ciclos. La
limitación deliberada es que los exports no se eliminan automáticamente ni se
consideran muertos sólo por análisis estático: los contratos externos son
ambiguos. La lista de exports obsoletos confirmados funciona como denylist
revisada. Los assets resueltos en runtime deben estar referenciados por ruta o
nombre; una excepción futura exige evidencia y cambio revisado del checker.

El control corre en CI y dentro de la validación del ZIP extraído.

## Duplicación diferida a Fase 5

Se documentan, sin consolidar:

- heroes públicos;
- variantes activas de tarjetas de propiedad y emprendimiento;
- wrappers Leaflet;
- componentes de pasos/elección;
- helpers de errores de autenticación;
- formatos de precio;
- placeholders de imagen;
- límites entre guards de tenant;
- dos helpers de escape HTML.

Antes de consolidarlos deben preservarse contratos, hidratación, accesibilidad,
DTOs públicos, exactitud Decimal y pruebas visuales/funcionales. Ninguna
duplicación activa fue refactorizada en esta fase.

## Pruebas y riesgos restantes

Las pruebas de repositorio ejecutan el checker real, verifican ausencia de
rutas/módulos retirados, el preflight sólo lectura, la retención explícita de
schema y la integración del checker en paquete/ZIP. Las pruebas de archivo
exigen el checker y el preflight, además de seguir excluyendo artefactos.

Riesgos restantes:

- sólo una consulta read-only en el ambiente autorizado puede determinar uso
  productivo real de los campos 2FA y `PuntoInteres`;
- imports construidos por convenciones no observables estáticamente requieren
  agregar una referencia o ajustar el checker con evidencia;
- el video grande sigue siendo una decisión de rendimiento pendiente;
- la consolidación de código duplicado queda expresamente fuera de alcance.

Fase 5 no fue iniciada.

## Resolución posterior en Fase 5

La Fase 5 consolidó los heroes editoriales, primitivas acotadas de tarjetas,
tiles/pin Leaflet, pasos de selección, formato monetario, feedback de
autenticación y escape HTML. Las tarjetas con interacción de dominio distinta,
los overlays de mapas y los flujos Cloudinary permanecieron separados a
propósito. Véase `docs/phase-5-component-reuse-and-maintainability.md`.
