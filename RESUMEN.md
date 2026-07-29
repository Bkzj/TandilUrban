# Resumen del proyecto — Propea Group (Tandil Urban)

Documento de estado al **21 de mayo de 2026**. Describe qué tiene implementada la aplicación hoy: portal público, backoffice SaaS, datos, integraciones y pendientes.

> **Marca en UI:** Propea Group (`metadata`, Navbar, correos, OG).  
> **Identificadores técnicos legacy:** carpeta Cloudinary `tandilurban/`, base Docker `tandilurban`, emails `*@tandilurban.local`, clave localStorage `tandilurban:recent-properties`.

---

## 1. Qué es el producto

Plataforma inmobiliaria para **Tandil** con dos caras:

| Cara | Audiencia | Objetivo |
|------|-----------|----------|
| **Portal público** | Compradores / inquilinos | Buscar propiedades, ver fichas, contactar, guardar favoritos |
| **Backoffice (panel)** | Inmobiliaria main, agentes, admin | Publicar y editar propiedades, equipo, leads, analíticas básicas |

Modelo **SaaS B2B**: las inmobiliarias se crean por base de datos; el registro público solo crea **usuarios finales** (`USUARIO_NORMAL`).

---

## 2. Stack tecnológico

| Área | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Estilos / UI | Tailwind CSS 4, Framer Motion, Lucide |
| Base de datos | PostgreSQL 16 (Docker local) |
| ORM | Prisma 7 (`database/schema.prisma`, cliente en `src/generated/prisma`) |
| Auth | NextAuth.js (Credentials + JWT + Prisma Adapter) |
| Imágenes | Cloudinary (`tandilurban/propiedades/{slug}`) |
| IA | Google Gemini (copy de fichas, ordenar fotos por ambiente) |
| Email | Resend (verificación, reset, notificación de leads) |
| Mapas | Leaflet + react-leaflet, tiles Carto Voyager |
| Gráficos panel | Recharts |
| Scroll suave (home) | react-lenis (donde aplica) |

---

## 3. Portal público — rutas y funcionalidad

### 3.1 Páginas

| Ruta | Estado | Descripción |
|------|--------|-------------|
| `/` | ✅ | Home: hero 75vh con columnas + video, búsqueda superpuesta, bloque **OPORTUNIDADES**, grilla de propiedades disponibles con mapa (scroll animations) |
| `/buscar` | ✅ | Listado + mapa sticky: filtros por URL (`query`, `operacion`, `tipo`), Intersection Observer sincroniza pines visibles, favoritos si hay sesión |
| `/propiedades/[id]` | ✅ | Ficha completa (ver §3.2) |
| `/inmobiliarias` | ✅ | Directorio de agencias (destacadas + listado), sin propiedades en esta página |
| `/inmobiliarias/[id]` | ✅ | Perfil B2B de agencia + grilla de sus propiedades |
| `/destacados` | 🔜 | Pantalla “Próximamente” |
| `/emprendimientos` | 🔜 | Próximamente |
| `/servicios` | 🔜 | Próximamente |
| `/nosotros` | 🔜 | Próximamente |
| `/para-inmobiliarias` | ✅ | Landing B2B (captación de agencias) |
| `/login`, `/register` | ✅ | Auth con diseño de marca |
| `/perfil` | ✅ | Datos del usuario |
| `/perfil/favoritos` | ✅ | Propiedades guardadas |

### 3.2 Ficha de propiedad (`/propiedades/[id]`)

- **Galería** de imágenes (estructura JSON con `url`, `public_id`, `categoria`).
- **Precio, operación, tipo**, ambientes, m², características expandibles.
- **Mapa de ubicación** (zoom 16) + sección de **cercanías** (POIs: hospitales, universidades, paradas, parques) vía API geo.
- **Formulario de contacto** (teléfono obligatorio) → crea `Contacto` y notifica por email (Resend).
- **Tarjeta del publicador** (agencia + agente si existe) y enlace WhatsApp.
- **Compartir** (Web Share API / fallback).
- **Favoritos** (corazón) para usuarios logueados.
- **Propiedades similares** (mismo tipo/operación, proximidad).
- **Vistos recientemente** (localStorage, cliente).
- **Tracking de visitas** en servidor al ver la ficha.
- **SEO / OG**: metadata dinámica + imagen OG generada (`/api/og/propiedad`).

### 3.3 Navegación y componentes públicos clave

- `Navbar`: Propiedades, Destacados, Servicios, Nosotros; corazón → favoritos (si hay sesión); menú usuario; acceso panel si rol lo permite.
- `Footer` corporativo.
- `HeroSearch` / `PublicSearchPill`: búsqueda hacia `/buscar`.
- `PropertyCardPublic`, `PropertyGrid`, `ExplorerMap` (mapa del buscador con validación de coordenadas).
- Directorio: `InmobiliariasDirectory`, `InmobiliariaCard`, `InmobiliariaAvatar`.

---

## 4. Backoffice — panel (`/panel`)

Layout común: gradiente oscuro (verde/naranja), `PanelHeader`, `PanelTabs`.

| Ruta | Quién | Función |
|------|-------|---------|
| `/panel` | Main, Agente, Admin* | Resumen: métricas, embudo visitas→consultas, top propiedades, gráfico precio/m² por zona |
| `/panel/propiedades` | Main, Agente | Tabla de propiedades del tenant, quick view, editar, eliminar |
| `/panel/propiedades/nueva` | Main, Agente | Onboarding lineal multi-paso (`LinearPropertyForm`) |
| `/panel/propiedades/editar/[id]` | Main, Agente | Edición hidratada del mismo flujo |
| `/panel/equipo` | Solo **Main** | CRUD de agentes (`AGENTE`) |
| `/panel/mensajes` | Main, Agente | Mini-CRM de contactos/leads por propiedad |

\* Admin con acceso según `roleCanAccessPanel`.

### 4.1 Onboarding / edición de propiedad (pasos)

Flujo **zig-zag** con Framer Motion, teclado (Enter/Esc), paleta panel (naranja/verde):

1. Operación (Venta / Alquiler)  
2. Tipo (Casa, Departamento, Lote, …)  
3. Ubicación (mapa + lat/lng)  
4. Dimensiones (m², ambientes, dormitorios, baños, cocheras)  
5. Características (tags)  
6. Precio y moneda  
7. Textos (título, descripción; **IA Gemini** para generar copy)  
8. Imágenes (preview, compresión cliente, subida **Cloudinary**, categorías; **IA** para ordenar por ambiente)

Al guardar: POST/PATCH en API panel; borrado de assets huérfanos en Cloudinary cuando corresponde.

### 4.2 Otros componentes del panel

- `PropertyQuickView`, `PropertiesClientTable`, `DeletePropertyButton`
- `LeadsTable`, `LeadQuickView`
- `EquipoManager`
- `StatCards`, `AnalyticsFunnel`, `PricePerSqmChart`, `TopProperties`

---

## 5. Autenticación y roles (RBAC)

| Rol | Descripción |
|-----|-------------|
| `ADMIN` | Plataforma |
| `INMOBILIARIA` | Dueño **Main** — 1:1 con `Inmobiliaria` (`inmobiliariaPerfil`) |
| `AGENTE` | Hijo de agencia — `agenciaId` → misma inmobiliaria |
| `USUARIO_NORMAL` | Cliente portal — registro público **forzado** en API |

Helpers en `src/lib/auth.ts`: `getCurrentUser`, `isInmobiliariaMain`, `requireAgencyPublishingContext` (multi-tenant al publicar).

Registro: verificación por email (token + Resend). Login con feedback animado (sin Three.js).

---

## 6. Modelo de datos (Prisma)

| Modelo | Uso principal |
|--------|----------------|
| `User` | Cuentas, roles, avatar, campos 2FA reservados sin flujo activo, favoritos M:N |
| `Inmobiliaria` | Agencia: nombre, CUIT, dirección, `logoUrl`, `bio`, `destacada` |
| `Propiedad` | Ficha completa, `imagenes` JSONB, métricas `visitas` / `consultas`, `agenteId` opcional |
| `Contacto` | Lead desde ficha: estado `NUEVO` / `LEIDO` / `RESPONDIDO`, teléfono |
| `PuntoInteres` | POIs globales del mapa (seed) |
| `VerificationToken` | Verificación de email |

Estados de propiedad: `DISPONIBLE`, `RESERVADA`, `VENDIDA`, `PAUSADA`.

---

## 7. APIs (`src/app/api`)

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/auth/[...nextauth]` | * | Sesión NextAuth |
| `/api/auth/register` | POST | Alta usuario (rol fijo `USUARIO_NORMAL`) |
| `/api/auth/verify` | GET | Verificar email |
| `/api/propiedades` | GET | Listado público |
| `/api/propiedades/[id]` | GET | Detalle público |
| `/api/contacto` | POST | Formulario de contacto |
| `/api/upload` | POST | Subida Cloudinary (auth agencia) |
| `/api/panel/propiedades` | GET, POST | Listar / crear propiedad |
| `/api/panel/propiedades/[id]` | GET, PATCH, DELETE | CRUD propiedad + cleanup Cloudinary |
| `/api/panel/propiedades/generar-textos` | POST | Gemini — título/descripción |
| `/api/panel/ia-ordenar-fotos` | POST | Gemini — categorizar fotos |
| `/api/panel/equipo` | GET, POST, DELETE | Agentes |
| `/api/panel/mensajes/[id]` | PATCH | Estado del lead |
| `/api/public/cercanias` | GET | POIs cercanos a lat/lng |
| `/api/og/propiedad` | GET | Imagen Open Graph dinámica |
| `/api/seed` | GET | Utilidad dev: recrea 3 props demo (legacy) |

**Server Actions:** `src/actions/favoritos.ts` (toggle favoritos).

---

## 8. Integraciones externas

### Cloudinary

- Variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Carpetas: `tandilurban/propiedades/{slug-titulo}/`
- Persistencia en DB: `{ url, public_id, categoria }`
- URLs de entrega con `f_jpg` para compatibilidad en `<img>` y OG

### Google Gemini

- Copy de propiedad y clasificación de imágenes por ambiente
- Variable: `GEMINI_API_KEY`

### Resend

- Verificación y notificación de nuevo lead
- Variables: `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL` / `NEXTAUTH_URL`

### Datos geoespaciales

- `public/data/geo/`: educación geocodificada, supermercados, POIs Tandil
- Scripts: `npm run geo:geocode`, `npm run geo:process`
- `src/lib/geo-utils.ts`: distancias Haversine, segmentos de transporte, cercanías

---

## 9. Datos de prueba y restauración

El seed (`prisma/seed.ts`) **limpia** contactos, propiedades, tokens, inmobiliarias y usuarios, luego recrea:

| Cuenta | Email | Contraseña | Notas |
|--------|-------|------------|--------|
| Admin | `admin@tandilurban.local` | `Admin123!` | |
| Main (cartera) | `inmobiliaria@tandilurban.local` | `Immo123!` | **Tandil Premium Propiedades** — 6 propiedades reales |
| Agente ejemplo | `agente@tandilurban.local` | `Immo123!` | Asignado a propiedades restauradas |
| Main alt | `admin@tandilprop.com` | `12345678` | **TandilProp VIP** (sin propiedades) |

**Propiedades restauradas:** 6 fichas reconstruidas desde **Cloudinary** (`prisma/data/cloudinary-properties.json`), ~183 fotos con URLs y `public_id`. Metadatos (precio, dirección exacta) inferidos del slug; conviene ajustar manualmente si hace falta.

Comandos:

```bash
npm run db:seed
npm run db:restore-cloudinary   # refresca JSON desde Cloudinary + seed
```

Puntos de interés: 6 registros (hospital, universidad, parques, paradas) si la tabla está vacía.

---

## 10. Infraestructura local

`docker-compose.yml`:

- **PostgreSQL** → `localhost:5432`, DB `tandilurban`
- **Adminer** → `http://localhost:8080`

Variables mínimas en `.env`: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, más Cloudinary/Gemini/Resend según features.

---

## 11. Estructura de carpetas (referencia rápida)

```
src/app/(web)/          # Portal + panel (rutas públicas y backoffice)
src/app/(auth)/         # Login / register
src/app/api/            # Route handlers
src/components/       # UI (public/, panel/, propiedades/, perfil/)
src/lib/                # Auth, prisma, cloudinary, geo, OG, analytics…
src/types/              # Tipos compartidos
src/actions/            # Server actions (favoritos)
src/hooks/              # Client hooks (mounted, recently viewed)
database/               # schema.prisma + migrations/
prisma/                 # seed.ts, data/cloudinary-properties.json
scripts/                # geo, restore Cloudinary
public/data/geo/        # GeoJSON / JSON de POIs
```

Documentación adicional: `README.md`, `ARCHITECTURE.md`, `PLAN.md` (roadmap).

---

## 12. Funcionalidades destacadas ya entregadas

- [x] Auth B2B + registro público blindado  
- [x] Panel unificado (Main + Agente) con tenant isolation  
- [x] Onboarding lineal de propiedades con IA y Cloudinary  
- [x] Edición y eliminación con cleanup de imágenes  
- [x] Gestión de equipo (agentes)  
- [x] Mini-CRM de mensajes / leads  
- [x] Portal: buscar con mapa, ficha rica, contacto, OG  
- [x] Favoritos y perfil de usuario  
- [x] Directorio y perfil de inmobiliarias  
- [x] Cercanías y mapas Leaflet robustos (validación coords, layout)  
- [x] Rebranding UI a **Propea Group**  
- [x] Restauración de cartera real desde Cloudinary  

---

## 13. Pendiente / roadmap (según `PLAN.md`)

- Destacados, emprendimientos, servicios, nosotros (contenido real)  
- Galería masonry en ficha  
- Categorización IA estilo Airbnb en frontend público  
- FOS/FOT y más capas urbanísticas  
- Dashboards B2B más profundos (Tremor, embudos avanzados)  
- Campo `isDestacada` en schema  
- Notificaciones in-app  
- Chatbot / calificador de leads con Gemini  
- PostGIS (proyección futura)  

---

## 14. Comandos útiles

| Comando | Acción |
|---------|--------|
| `npm run dev` | Desarrollo en :3000 |
| `npm run build` | Build producción |
| `npm run db:migrate` | Migraciones Prisma |
| `npm run db:seed` | Seed / restauración |
| `npm run db:restore-cloudinary` | Regenerar JSON + seed desde nube |
| `npm run geo:geocode` | Geocodificar educación |
| `npm run geo:process` | Procesar capas geo |

---

*Este archivo se puede actualizar al cerrar cada sprint o antes de demos importantes.*
