# TandilUrban

**TandilUrban** es una plataforma inmobiliaria para la ciudad de Tandil que combina:

- **Portal público**: listado y detalle de propiedades, mapa, contacto y experiencia de marca.
- **SaaS inmobiliario (backoffice)**: panel para inmobiliarias y agentes, alta guiada de propiedades (onboarding lineal) y gestión de equipo con control de acceso por roles (RBAC).

El objetivo del proyecto es ofrecer un producto **profesional, escalable y mantenible**, con stack moderno y documentación explícita de arquitectura y operación local.

---

## Tech stack

| Área | Tecnología |
|------|------------|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| ORM / datos | [Prisma](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/) |
| Conexión DB (dev) | [Docker](https://docs.docker.com/compose/) (`docker-compose.yml`) |
| Autenticación | [NextAuth.js](https://next-auth.js.org/) (Credentials + JWT, adaptador Prisma) |
| UI / motion | [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer-motion.com/) |
| Email (opcional) | [Resend](https://resend.com/) para verificación de registro |

El esquema de Prisma vive en `database/schema.prisma` (configurado vía `prisma.config.ts`).

---

## Guía de inicio

### Requisitos previos

- Node.js **20+** (recomendado, alineado con el ecosistema Next.js actual).
- Docker Desktop (o Docker Engine + Compose) para levantar PostgreSQL y Adminer.

### Variables de entorno

Creá un archivo `.env` en la raíz del proyecto (no se versiona). Como mínimo:

```env
DATABASE_URL="postgresql://admin:password123@localhost:5432/tandilurban"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generá-un-secreto-largo-y-estable"
```

Ajustá `DATABASE_URL` si cambiás usuario, contraseña o nombre de base en `docker-compose.yml`. Para correo de verificación (opcional): `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`.

### Pasos

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Levantar la base de datos (y Adminer)**

   ```bash
   docker compose up -d
   ```

   - PostgreSQL: puerto **5432** (volumen persistente `postgres_data`).
   - **Adminer**: [http://localhost:8080](http://localhost:8080) — sistema **PostgreSQL**, servidor **`db`**, mismas credenciales que definiste en Compose.

3. **Aplicar el esquema a la base**

   ```bash
   npx prisma db push
   ```

4. **Cargar datos de prueba (seed)**

   ```bash
   npx prisma db seed
   ```

   (Equivalente: `npm run db:seed`.)

5. **Arrancar la app en desarrollo**

   ```bash
   npm run dev
   ```

   Abrí [http://localhost:3000](http://localhost:3000).

---

## Credenciales de prueba (seed)

El script `prisma/seed.ts` **limpia** tablas clave y recrea un entorno mínimo: inmobiliaria de demostración, propiedades y puntos de interés. Las cuentas con contraseña fija creadas por el seed son las siguientes.

| Rol | Nombre | Email | Contraseña | Notas |
|-----|--------|-------|------------|--------|
| **ADMIN** | Administrador | `admin@tandilurban.local` | `Admin123!` | Rol global de plataforma. |
| **INMOBILIARIA** (Main) | Laura Martínez | `inmobiliaria@tandilurban.local` | `Immo123!` | Usuario **principal** de la inmobiliaria; perfil 1:1 con agencia **Tandil Premium Propiedades**. Accede al panel y a **Mi equipo**. |
| **AGENTE** | — | — | — | **No** se inserta en el seed actual. Los agentes se crean desde el panel (**Mi equipo**) con el usuario Main. |
| **USUARIO_NORMAL** | — | — | — | **No** se inserta en el seed. Alta pública en `/register` (el API fuerza rol `USUARIO_NORMAL`). |

Tras el seed, el login del backoffice para probar el flujo “inmobiliaria” es `inmobiliaria@tandilurban.local` / `Immo123!`.

---

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Next.js. |
| `npm run build` / `npm run start` | Build y servidor de producción. |
| `npm run lint` | ESLint. |
| `npm run db:seed` | Ejecuta el seed de Prisma. |
| `npm run db:migrate` | Migraciones en modo desarrollo (`prisma migrate dev`). |

---

## Documentación adicional

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — RBAC, onboarding lineal del panel, decisiones de UI/Tailwind e infraestructura Docker.

---

## Licencia

Proyecto privado (`"private": true` en `package.json`). Ajustá la licencia cuando definas distribución pública.
