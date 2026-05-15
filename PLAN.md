# 🏙️ TandilUrban - Plan de Desarrollo V2.0

## 1. Visión y Stack Tecnológico
Plataforma inmobiliaria de vanguardia, inmersiva, escalable y altamente interactiva, diseñada con mentalidad B2B SaaS y foco en la experiencia de usuario (UX).
- **Framework:** Next.js 14+ (App Router).
- **Base de Datos & ORM:** PostgreSQL + Prisma (Dockerizado).
- **Estilos:** Tailwind CSS (Uso estricto de **Literales de Cadena Completos** en Backoffice para evitar Ghost Caching en Safari/iOS).
- **Autenticación:** NextAuth.js (Auth.js) con sistema RBAC (Tenant/Agencia).
- **Mapas:** React Leaflet + Nominatim (OpenStreetMap) con Geofencing local.
- **Inteligencia Artificial:** Gemini 1.5 Flash/Pro (Grounding Visual + Contexto).
- **Imágenes:** Cloudinary / AWS S3 (Próximamente para persistencia real).
- **Motor de Animaciones:** Framer Motion y Lenis (Smooth Scrolling).
- **Motor 3D:** React Three Fiber / Spline (Pendiente para Hero/Portal).

## 2. Experiencia Visual y Animaciones (Pilar Core)
La plataforma NO debe sentirse estática.
- **Smooth Scrolling:** `Lenis` global para navegación fluida.
- **Micro-interacciones:** Botones magnéticos, físicas "Spring" en hovers, StepShells con "zig-zag" de Framer Motion en el onboarding.
- **Theming Dinámico:** - **Portal Público:** Primario Verde, luminoso, enfocado en el cliente.
  - **Backoffice (Inmobiliaria):** Primario Naranja, gradientes oscuros (`text-primary` a `naranja-dark`), diseño premium de alta concentración.

## 3. Principios de Arquitectura
- **Modularización Extrema (DRY):** Componentes aislados. El formulario de propiedades se divide por pasos (Principio de Responsabilidad Única).
- **Programación Defensiva:** Tipado estricto (`@src/types/panel.ts`), validación antes de avanzar pasos y manejo seguro de promesas en Next.js.
- **Human-in-the-loop (IA):** La IA asiste al agente, pero el agente controla el contexto (notas, correcciones).

## 4. Estructura de Datos (Prisma)
- **User / Rol:** `ADMIN`, `INMOBILIARIA` (Dueño/Tenant), `AGENTE` (Empleado, vinculado por `agenciaId`), `USUARIO_NORMAL`.
- **Propiedad:** `id`, `inmobiliariaId`, `agenteId`, `titulo`, `descripcion`, `estado`, `tipo`, `operacion`, `precio`, `moneda`, `direccion`, `barrio`, `latitud`, `longitud`, `m2Total`, `m2Cubiertos`, `ambientes`, **`dormitorios`, `banos`, `cocheras`** (Nuevos), `caracteristicas` (array), `imagenes` (array URLs).

---

## 5. Roadmap y Fases de Ejecución

### ✅ Fases Completadas (Estables)
- [x] **Fase 1 - Base de Datos & Auth:** Docker + PostgreSQL, NextAuth, Roles RBAC, Protección de rutas.
- [x] **Fase 2 - UI Kit & Layouts:** Tailwind configurado, gradientes oscuros, layout dual (Web vs Panel).
- [x] **Fase 3 - Linear Onboarding V1:** Formulario paso a paso con Framer Motion, validaciones aisladas y persistencia inicial en BD.
- [x] **Fase 4 - RBAC en Acción:** Lógica B2B. La inmobiliaria ve a su equipo; el agente solo publica; el admin ve todo.
- [x] **Fase 5 - Mapa Inteligente:** Integración Leaflet + Nominatim, geofencing en Tandil, pin personalizado arrastrable (SVG Piedra).

### ⏳ En Progreso / Inmediato
- [ ] **Fase 6 - IA Generativa Definitiva:** Conectar Gemini 2.5 flash con envío de imagen Base64 (Grounding) + "Notas del Agente" para generación de copy perfecto y honesto.
- [ ] **Fase 7 - Enriquecimiento y Rediseño de Property Page:** - Agregar `dormitorios`, `baños` y `cocheras` al backend y al flujo del panel.
  - Rediseñar `[id]/page.tsx` público: Grilla de fotos atractiva, íconos de Lucide para comodidades, saltos de línea en descripción y Tarjeta de Contacto real (Inmobiliaria/Agente).

### 🚀 Futuras Fases (Backlog)
- [ ] **Fase 8 - Persistencia Real de Imágenes:** Cambiar los `blob:http` locales por subida asíncrona a Cloudinary o S3 (`/api/upload`) para que las fotos sobrevivan a la recarga de página.
- [ ] **Fase 9 - Inteligencia Geoespacial (POIs):** Usar la API de OpenStreetMap (Overpass) para calcular distancia a escuelas, plazas y paradas de colectivo más cercanas al pin de la propiedad.
- [ ] **Fase 10 - Inmersión 3D:** Integrar Spline o React Three Fiber en el Hero público del portal para el impacto visual (ej. llaves o logo flotante interactivo).
- [ ] **Fase 11 - Sistema de Leads:** Bandeja de mensajes B2B donde la inmobiliaria recibe las consultas de la página de propiedad y las asigna a sus agentes.