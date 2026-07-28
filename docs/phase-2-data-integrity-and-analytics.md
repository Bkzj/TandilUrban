# Fase 2: integridad monetaria y analítica

## Alcance y decisiones

Esta fase reemplaza semántica monetaria de punto flotante, incorpora visualizaciones públicas
medidas y hace reconciliables los contadores. Conserva sin cambios los controles Cloudinary de
Fase 0 y las políticas de publicación, DTO y autorización de Fase 1.

El inventario encontró dinero solamente en `Propiedad.precio` y `Propiedad.expensas`. Esos
campos alimentan formularios, filtros, ordenamiento, tarjetas públicas, Open Graph, informes PDF,
motor de coincidencias, exclusividad y precio por metro cuadrado. También se detectó que
`Propiedad.visitas` se leía pero nunca se incrementaba, y que el panel inventaba impresiones con
un multiplicador arbitrario. `Propiedad.consultas` y `Contacto.visitasFisicas` eran caches sin
reconciliación.

No se iniciaron cambios de Fase 3.

## Dinero y moneda

- `Propiedad.precio`: `Decimal(18,2)`, obligatorio y no negativo.
- `Propiedad.expensas`: `Decimal(18,2)`, opcional y no negativo.
- El rango máximo es `9.999.999.999.999.999,99`.
- `Moneda` es un enum cerrado con `ARS` y `USD`.
- La migración acepta `ARS`/`USD` ignorando espacios y mayúsculas solamente. Cualquier otro valor
  aborta; no existe mapeo silencioso.
- La entrada rechaza negativos, notación científica, `NaN`, infinitos, más de dos decimales y
  valores fuera de rango. No redondea entradas con precisión excesiva.
- Prisma `Decimal` no cruza la frontera JSON. Los DTO públicos y privados serializan el importe
  como texto decimal canónico con dos posiciones y la moneda como valor cerrado. El formateo de
  presentación no vuelve a calcular dinero.
- Exclusividad y precio por m² usan aritmética decimal. Los gráficos convierten el texto final
  ya redondeado a número únicamente para que Recharts determine geometría; esa conversión no
  participa de sumas, promedios ni decisiones.

ARS y USD jamás se suman, promedian o ordenan entre sí. Precio por m² se agrupa primero por
moneda y barrio en PostgreSQL, y se entrega como series independientes. Si una moneda no tiene
datos, no se fabrica un grupo cero. El bloque de emprendimientos dejó de usar un ranking de
precio mixto y ordena por fecha de alta.

## Migración y rollback

Archivos:

- `database/migrations/20260728150000_phase2_data_integrity_analytics/migration.sql`
- `database/migrations/20260728150000_phase2_data_integrity_analytics/rollback.sql`

Secuencia de despliegue: aplicar en orden todas las migraciones publicadas, incluida
`20260728120000_user_active_authorization`, y luego la migración de Fase 2. No se modificó ninguna
migración histórica.

Antes de desplegar:

1. Tomar backup verificable de PostgreSQL.
2. Ejecutar las consultas del bloque `Phase 2 preflight` de `migration.sql`.
3. Corregir cualquier importe no finito, negativo, fuera de rango o con más de dos decimales.
4. Revisar `SELECT moneda, count(*) FROM "Propiedad" GROUP BY moneda`; solo son válidos ARS/USD
   después de `trim` y `upper`.
5. Aplicar con el mecanismo normal de Prisma.
6. Ejecutar `npm run analytics:reconcile` y revisar el dry-run.

PostgreSQL convierte `double precision` a `numeric(18,2)` solo después de que el preflight
demuestra que no habrá redondeo silencioso. La migración también repara campos de la línea base
que existían en el esquema de aplicación pero faltaban en la cadena SQL histórica; usa
operaciones condicionales y deja intacta una base ya desplegada.

El rollback es deliberadamente destructivo para detalle analítico: elimina eventos medidos y
claves de idempotencia. Antes de eliminarlos suma visualizaciones medidas y legado de nuevo en
`Propiedad.visitas`. Los `Decimal` vuelven a `double precision`, por lo que se puede perder
exactitud binaria. Solo debe ejecutarse sobre una restauración o con backup aprobado.

## Definición de visualización

Una visualización es una apertura calificada de una ficha pública por el mismo visitante y
propiedad fuera de una ventana móvil de 30 minutos.

- La propiedad debe satisfacer la política pública compartida de Fase 1.
- ADMIN, INMOBILIARIA y AGENTE autenticados no cuentan.
- Bots conocidos, crawlers sociales/OG, headless, Lighthouse, prefetch y preview no cuentan.
- `DNT: 1` y `Sec-GPC: 1` se respetan y no generan evento.
- Metadata, OG, PDF y render servidor no llaman al endpoint de tracking.
- Un refresh dentro de 30 minutos no incrementa; después de la ventana puede hacerlo.
- El término de UI es “Visualizaciones”; no se afirma “personas únicas”.

`PropiedadVista` es la fuente canónica inmutable. La inserción y el incremento del cache
`Propiedad.visitas` ocurren en la misma transacción. Un advisory lock PostgreSQL por
propiedad/clave serializa solicitudes concurrentes antes de buscar la ventana móvil.

## Privacidad y protección operativa

El navegador recibe una cookie first-party aleatoria, `HttpOnly`, `SameSite=Lax`, con vida de
48 horas. El servidor guarda únicamente un HMAC SHA-256 rotado diariamente, derivado con
`VIEW_TRACKING_SECRET`; durante la ventana compara también la clave de la rotación anterior para
no duplicar una visita que cruza medianoche. No almacena cookie, IP, user-agent, tenant enviado
por cliente ni fingerprint. El tenant siempre se deriva de la propiedad.

El endpoint acepta como máximo 1 KiB, limita 30 intentos por clave y hora y devuelve un 404
genérico para una propiedad inexistente o no pública. Los errores se registran solo por clase y
responden 204 para no romper la ficha. La aplicación requiere un secreto aleatorio separado de
al menos 32 bytes.

Los índices cubren propiedad/fecha, tenant/fecha y propiedad/clave/fecha. Se recomienda conservar
eventos crudos 13 meses como máximo y, antes de borrarlos, materializar agregados mensuales
auditables. La tarea de retención queda como acción operativa: esta fase no agrega infraestructura
automática ni borra historia.

## Analítica y fórmulas

El panel usa una ventana móvil de 30 días:

- Visualizaciones: cantidad de `PropiedadVista` del alcance autorizado.
- Consultas: cantidad de `Contacto` con origen `PUBLICO` del mismo alcance y período. Los leads
  creados por una visita manual del panel se marcan `PANEL_MANUAL` y no contaminan la conversión.
- Conversión: `consultas / visualizaciones × 100`, con `Decimal`, dos decimales.
- `unavailable`: denominador cero; UI “Sin datos”.
- `insufficient_data`: entre 1 y 9 visualizaciones; UI “Muestra insuficiente”.
- `measured`: al menos 10 visualizaciones.

Los DTO incluyen valor nullable, estado y período ISO. El agente solo recibe propiedades
asignadas; la inmobiliaria solo su tenant. ADMIN conserva la política global de Fase 1: no obtiene
la primera inmobiliaria ni analítica implícita.

Se eliminó completamente “Impresiones” y su fórmula `Math.max(... 2.8 ...)`, además de las
afirmaciones de “tiempo real”. El antiguo índice ponderado de interés dejó de multiplicar
consultas y visitas físicas; donde se conserva una suma descriptiva se llama “Actividad
registrada” y aclara que no representa personas únicas.

## Fuentes de verdad y reconciliación

- `PropiedadVista` → fuente canónica de `Propiedad.visitas`.
- `Contacto` → fuente canónica de `Propiedad.consultas`; `OrigenContacto` distingue captación
  pública de altas manuales del panel.
- suma de `VisitaFisicaEvento.delta` → fuente canónica de `Contacto.visitasFisicas`.
- `legacyVisitCount` conserva el valor anterior a la migración como histórico no verificado.
  `Propiedad.visitas` comienza en cero y solo contiene medición nueva.

Consultas públicas aceptan `Idempotency-Key`; el contacto se crea antes del incremento dentro de
una transacción y una clave repetida devuelve el recibo existente. Eventos físicos nuevos
aceptan claves idempotentes. Constraints impiden contadores negativos y `delta` fuera de -1/+1.

`npm run analytics:reconcile` es dry-run por defecto y solo informa cantidades de divergencias,
sin PII. `npm run analytics:reconcile -- --apply` rechaza historiales físicos con suma negativa y
recalcula los tres caches en una transacción. Es seguro volver a ejecutarlo y nunca corre en
build, instalación o despliegue.

## Pruebas y validación de migraciones

Se agregaron pruebas de:

- exactitud de centavos y grandes valores, entradas inválidas y serialización;
- moneda cerrada y separación ARS/USD en precio por m²;
- conversión sin denominador y con muestra insuficiente;
- visualización pública, ventana móvil, concurrencia, panel/bot/prefetch/DNT/GPC y HMAC rotativo;
- presencia de índices, preflight, legado, rollback, reconciliación dry-run y ausencia de
  impresiones fabricadas;
- integración de contacto público y límites públicos existentes.

PostgreSQL 17 descartable validó:

- replay limpio de las 16 migraciones y diff vacío contra `schema.prisma`;
- fixture pre-Fase-2 `123456.78`, expensas `999.99`, moneda ` usd `, 17 visitas y 4 consultas;
- resultado exacto `123456.78`, `999.99`, `USD`, legado 17, medición 0 y consultas 4;
- rollback con precio/expensas preservados representativamente y visitas restauradas a 17.

## Riesgos y acciones pendientes

- Configurar `VIEW_TRACKING_SECRET` antes de habilitar medición en cada ambiente.
- Programar reconciliación periódica y alertas de drift.
- Aprobar y programar la retención/agregación de eventos antes de 13 meses.
- Los contadores históricos de visitas son no verificados y nunca se presentan como medición.
- La clasificación de bots es conservadora y debe mantenerse; no es una garantía absoluta.
- Un usuario puede borrar la cookie, por lo que la métrica es de sesiones estimadas, no de
  personas.
- El rollback pierde el detalle de eventos y vuelve a semántica float; requiere backup.

La Fase 3 no fue iniciada.
