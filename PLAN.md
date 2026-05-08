## 1. Visión y Stack Tecnológico
Plataforma inmobiliaria de vanguardia, inmersiva, escalable y altamente interactiva.
- **Framework:** Next.js (App Router).
- **Base de Datos & ORM:** PostgreSQL + Prisma.
- **Estilos:** Tailwind CSS.
- **Autenticación:** NextAuth.js (Auth.js) con soporte 2FA.
- **Imágenes:** Cloudinary / S3 (formato WebP/AVIF y uso estricto de `<Image>`).
- **Motor de Animaciones (Core):** Framer Motion y Lenis (Smooth Scrolling).
- **Motor 3D (Core):** React Three Fiber / Drei / Spline (Para elementos inmersivos).

## 2. Experiencia 3D y Animaciones (Pilar Fundamental)
La plataforma NO debe sentirse estática en ningún momento. Las animaciones no son parches, son parte de la arquitectura base:
- **Smooth Scrolling:** Implementar `Lenis` globalmente para un scroll fluido.
- **Elementos 3D Integrados:** Incorporar un componente 3D interactivo en el Hero (ej. un modelado arquitectónico abstracto o llaves flotantes que reaccionan al mouse) cargado dinámicamente (`next/dynamic`) para no afectar el renderizado inicial.
- **Micro-interacciones Constantes:** Botones magnéticos (que siguen un poco al cursor), físicas de "Spring" (rebote natural) en los hover de las tarjetas, y skeleton loaders dinámicos.
- **Macro-interacciones:** Transiciones de página fluidas (Page Transitions) al navegar entre el Home y el Detalle. Elementos que aparecen gradualmente al hacer scroll (Scroll Reveals y Parallax).
- **Efectos en Tarjetas:** Las "Property Cards" deben tener un ligero efecto de inclinación 3D (3D Tilt) al pasar el mouse.

## 3. Principios de Arquitectura (Frontend & Backend)
- **Modularización Extrema (DRY):** Todo debe ser un componente reutilizable aislado en `src/components/ui/` (Botones animados, inputs, modales).
- **Theming Dinámico:** - **Portal Público:** Primario: Verde / Secundario: Naranja.
  - **Dashboard Inmobiliaria:** Colores invertidos (Primario: Naranja / Secundario: Verde) para dar identidad visual propia al backoffice.
- **Programación Defensiva:** Manejo de errores en cada endpoint con Try/Catch, tipado estricto e interfaces de TypeScript.

## 4. Estructura de Datos (Prisma)
- **User:** `id`, `rol` (ADMIN, INMOBILIARIA, USUARIO_NORMAL), `nombre`, `email`, `passwordHash`, `telefono`, `avatarUrl`, `twoFactorEnabled`, `twoFactorSecret`.
  - *Perfil Inmobiliaria:* `nombreAgencia`, `logoAgencia`, `cuit`, `direccion`.
- **Propiedad:** `id`, `inmobiliariaId` (relación), `titulo`, `descripcion`, `estado` (DISPONIBLE, RESERVADA, VENDIDA, PAUSADA), `tipo` (Casa, Depto, etc.), `operacion` (Venta, Alquiler), `precio`, `moneda`, `expensas`, `direccion`, `barrio`, `latitud`, `longitud`, `m2Total`, `m2Cubiertos`, `ambientes`, `caracteristicas` (array), `imagenes` (array URLs).
- **Contacto (Leads):** `nombre`, `email`, `mensaje`, `propiedadId` (relación).

## 5. Features Principales
- **Para el Cliente Final:** Búsqueda inteligente por URL, mapa interactivo, sistema de propiedades favoritas, alertas personalizadas y visualizador de imágenes inmersivo.
- **Para la Inmobiliaria (Backoffice):** Panel de control, ABM (CRUD) animado de propiedades, gestión de leads (mensajes recibidos), métricas clave (vistas, conversiones).

## 6. Fases de Ejecución
1. **Fase 1 - Base de Datos & Auth:** Actualizar `schema.prisma`. Configurar NextAuth y registro/login con soporte de roles.
2. **Fase 2 - Core Animado & Ui Kit:** Configurar Lenis (Scroll), instalar Framer Motion, crear componentes base animados (Botones 3D, Cards con Tilt) y el sistema de colores dinámicos.
3. **Fase 3 - Experiencia Inmersiva (Frontend):** Integrar R3F/Spline para el Hero 3D, y conectar la carga real de propiedades con el buscador y el mapa.
4. **Fase 4 - Backoffice Inmobiliarias:** Dashboard naranja/verde y formulario multipaso animado para crear/editar propiedades.