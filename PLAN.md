# 🏙️ TandilUrban - Plan de Desarrollo V3.0 (Fase de Maduración)

## 1. Visión y Stack Tecnológico
SaaS B2B inmobiliario de alto impacto con integración de IA multimodal e inteligencia geoespacial.
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, Framer Motion, Lenis.
- **Backend/DB:** PostgreSQL + Prisma + PostGIS (proyección).
- **IA:** Google Gemini 1.5 Pro/Flash (Grounding Visual & Clasificación de Imágenes).
- **Mails & Notifs:** Resend / React Email.
- **Mapas:** Leaflet + OpenStreetMap + KML de Gobierno Abierto.

## 2. Estructura de Datos (Prisma - Próximas Migraciones)
- **Propiedad:** Añadir `isDestacada` (Boolean), `fos` (Float), `fot` (Float). Transformar `imagenes` para soportar categorías `{ url: string, categoria: string, publicId: string }`.
- **Notificacion:** Nueva tabla para alertas in-app (Lead recibido, propiedad aprobada).
- **Contacto (Lead):** Expandir para enlazar `propiedadId`, `agenteId` y estado de gestión.

---

## 5. Roadmap y Fases de Ejecución

### ✅ Fases Completadas (Estables)
- [x] Fases 1 a 5: Auth B2B, Roles, Panel Oscuro, Formulario Lineal (Framer Motion).
- [x] Fase 6 y 7: Copywriter de IA con Grounding Visual y mejoras UI en Propiedad (Iconos Lucide).
- [x] Fase 8 y 9: Panel de Administración, Tenant Isolation, QuickView Slide-over (Naranja/Verde) y Edición hidratada bidireccional.
- [x] Fase 10: Persistencia real de imágenes en Cloudinary con borrado físico (Cleanup).

### ⏳ Fases Inmediatas (Core UX & Leads)
- [ ] **Fase 11 - Rediseño del Portal y Buscador Main:** - Grilla de propiedades "Destacadas".
  - Buscador global por parámetros URL.
  - Galería "Mosaico" (Masonry) en la vista detallada de propiedad.
- [ ] **Fase 12 - Mini-CRM y Correos (Leads):** - Formulario de contacto en la propiedad conectando al backend.
  - Integración de `Resend` para mails de autenticación y notificaciones de nuevos leads.
  - Pestaña "Mensajes" en el backoffice para gestionar contactos.

### 🚀 Fases de Innovación Técnica (El Moat)
- [ ] **Fase 13 - La "Killer Feature" (Categorización IA de Imágenes):** - Modificar el uploader para enviar el batch de fotos a Gemini.
  - Prompt multimodal para agrupar fotos por ambiente (Cocina, Baño, etc.) automáticamente.
  - Renderizado agrupado al estilo Airbnb en el frontend.
- [ ] **Fase 14 - Inteligencia Geoespacial & Datos Urbanísticos:** - Incorporar FOS y FOT en el panel para propiedades tipo Lote/Casa vieja.
  - Parsear el KML de la Municipalidad (Establecimientos educativos) e inyectarlo en el  de propiedades para calcular cercanías.
- [ ] **Fase 15 - Dashboards Analíticos B2B:** - Integrar Tremor/Recharts en el Panel de Resumen.
  - Gráficos de Embudo: Impresiones -> Visitas -> Consultas.mapa

🗺️ El Masterplan de TandilUrban (Fases 15 a 18)
Sprint 1: El Gancho B2B (Camino 1) 📍 (Lo que hacemos hoy)

Creación de la ruta dinámica /inmobiliarias/[slug].

Vidriera personalizada para cada agencia/agente (Logo, Portada, Contacto).

Grilla exclusiva con el inventario de esa agencia.

Sprint 2: Conversión y UX en la Ficha 💬 * Botón de "Compartir" nativo (aprovechando el SEO que hicimos).

Píldoras de recomendaciones en el formulario ("¿Aceptan mascotas?", "¿Tiene cochera?").

Sección "Vistos Última Vez" (usando LocalStorage).

Sprint 3: Retención de Usuarios (Camino 2) ❤️

Sistema de "Favoritos" (Botón de corazón en las tarjetas).

Creación del Panel de Usuario (/perfil): Editar datos, cambiar contraseña, ver propiedades guardadas.

Sprint 4: Inteligencia y Sugerencias (Fase 16) 🧠

Sección "Propiedades Similares" en la parte inferior de la ficha.

Sprint 5: Dashboards B2B (Fase 15) 📊

Integración de Tremor y Recharts en el Panel de Administración.

Gráficos de embudo (Vistas de tarjeta -> Clics -> Consultas).

Sprint 6: Cierre Institucional (Fase 17) 🏢

Landing Page B2B ("Uní tu Inmobiliaria a TandilUrban").

Footer corporativo (Legales, Redes, Contacto).

Sprint 7: El As bajo la Manga (Camino 3 - IA) 🤖

Conectar la base de datos a un agente Gemini (aprovechando tu experiencia con Bunker-404) para un chatbot inteligente o calificador de leads.