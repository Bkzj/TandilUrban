# Propea Group - Portal & CRM Inmobiliario

**Propea Group** es una plataforma integral PropTech que conecta un **portal público de alta conversión** con un **backoffice B2B (SaaS)** para la gestión inmobiliaria: publicación de propiedades, leads, equipos de agentes y herramientas asistidas por IA.

---

## Características principales

- **Portal público** — Búsqueda, mapa, fichas con galería avanzada, favoritos, directorio de inmobiliarias, destacados y contacto por propiedad.
- **Motor de Match** — Alertas automáticas cuando una nueva publicación coincide con las preferencias guardadas por los usuarios (email vía Resend).
- **IA Copywriter** — Integración con **Google Gemini** para generar títulos y descripciones comerciales, y para clasificar/ordenar fotos como director de arte inmobiliario.
- **Generación de informes PDF** — Informes imprimibles por propiedad desde el panel (seguimiento comercial y presentación).
- **CRM integrado** — Gestión de leads, mensajes, funnel de conversión, seguimiento de visitas físicas y analytics en el panel de la inmobiliaria.
- **RBAC multi-tenant** — Roles Admin, Inmobiliaria (Main), Agente y Usuario del portal, con aislamiento por agencia.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 16** (App Router) |
| UI | **React 19**, **Tailwind CSS 4**, Framer Motion |
| Datos | **Prisma 7**, **PostgreSQL 16** |
| Auth | NextAuth.js (Credentials + JWT, adaptador Prisma) |
| Medios | **Cloudinary** |
| Email | **Resend** |
| IA | **@google/generative-ai** (Gemini) |
| Mapas | Leaflet / react-leaflet |

El esquema de Prisma vive en `database/schema.prisma` (configuración en `prisma.config.ts`).

---

## Getting Started

### Requisitos

- **Node.js 20+**
- **Docker** (Desktop o Engine + Compose) para PostgreSQL y Adminer

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd tandil-urban
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Editá `.env` con valores reales. Variables clave:

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Conexión PostgreSQL (local: ver `.env.example`) |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Sesión y auth |
| `GEMINI_API_KEY` | Textos y orden de fotos con IA |
| `CLOUDINARY_*` | Subida de imágenes en panel |
| `RESEND_API_KEY` / `RESEND_FROM` | Emails (verificación, match alerts) |
| `APP_URL` | URLs absolutas en correos |

### 3. Infraestructura local

```bash
docker compose up -d
```

| Servicio | Detalle |
|----------|---------|
| **PostgreSQL 16** | Contenedor `propea-db`, puerto **5432**, base `propea_group` |
| **Adminer** | [http://localhost:8080](http://localhost:8080) — motor **PostgreSQL**, servidor **`db`**, usuario/contraseña según `docker-compose.yml` |

Red Docker: `propea-network`. Volumen persistente: `propea_pg_data`.

> Si migrás desde una base local antigua (`tandilurban`), recreá el volumen o exportá/importá datos: `docker compose down -v` (borra datos) y volvé a levantar.

### 4. Dependencias y base de datos

```bash
npm install
npm run db:push
npm run db:seed
```

Opcional: `npm run db:studio` (Prisma Studio), `npm run db:migrate` (flujo de migraciones).

### 5. Desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

---

## Credenciales de prueba (seed)

El seed (`prisma/seed.ts`) recrea un entorno demo con inmobiliaria, propiedades y usuarios de prueba.

| Rol | Email | Contraseña |
|-----|-------|------------|
| **ADMIN** | `admin@tandilurban.local` | `Admin123!` |
| **INMOBILIARIA (Main)** | `inmobiliaria@tandilurban.local` | `Immo123!` |
| **AGENTE** | `agente@tandilurban.local` | `Immo123!` |

> Los dominios `@tandilurban.local` son identificadores legacy del entorno demo; el producto y la marca son **Propea Group**.

---

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm run start` | Producción |
| `npm run lint` | ESLint |
| `npm run db:push` | Sincroniza esquema Prisma → DB |
| `npm run db:seed` | Datos de prueba |
| `npm run db:studio` | Prisma Studio |
| `npm run db:migrate` | Migraciones en desarrollo |
| `npm run db:restore-cloudinary` | Restaura fichas desde JSON + Cloudinary |

---

## Documentación adicional

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — RBAC, onboarding del panel, decisiones de UI e infraestructura.
- **[RESUMEN.md](./RESUMEN.md)** — Estado funcional del producto y roadmap.

---

## Licencia

Proyecto privado (`"private": true`). Definir licencia pública cuando corresponda.
