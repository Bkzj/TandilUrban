# Arquitectura — Propea Group

Documento orientado a **decisiones técnicas** y a **cómo encajan** el portal público, el backoffice SaaS y la infraestructura local. Para puesta en marcha rápida, ver [README.md](./README.md).

---

## 1. RBAC y modelo de inquilino (tenant)

### Roles (`RolUsuario` en Prisma)

| Rol | Propósito |
|-----|-----------|
| **ADMIN** | Operación global de la plataforma (fuera del flujo “agencia” cotidiano del panel inmobiliario). |
| **INMOBILIARIA** | Dueño **Main** de una inmobiliaria: relación **1:1** `User` ↔ `Inmobiliaria` (`inmobiliariaPerfil`). Es quien publica, ve el resumen de agencia y **gestiona agentes**. |
| **AGENTE** | Usuario operativo bajo una agencia: relación **N:1** `User.agenciaId` → `Inmobiliaria`. Mismo “tenant” que el Main, sin permisos de administración de equipo. |
| **USUARIO_NORMAL** | Usuario del portal (favoritos, consultas, etc.). El registro público **fuerza** este rol en el API para evitar escalada de privilegios. |

### Jerarquía operativa

1. **INMOBILIARIA (Main)** es la autoridad del tenant: su `inmobiliariaPerfil.id` identifica la agencia.
2. **AGENTE** comparte tenant mediante `agenciaId === inmobiliariaPerfil.id` del Main.
3. Los **endpoints de panel** (por ejemplo gestión de equipo) usan helpers en `src/lib/auth.ts` (`requireInmobiliariaMain`, `getCurrentUser`, `isInmobiliariaMain`) para asegurar que solo el Main ejecute acciones sensibles.

### Tipos y sesión

- Tipos compartidos de usuario enriquecido y payloads de API: `src/types/` (`auth.ts`, `api.ts`, `panel.ts`, barrel `index.ts`).
- NextAuth: estrategia **JWT** + callbacks que adjuntan `id` y `role` al objeto de sesión; la carga completa del usuario con relaciones para RBAC se hace con Prisma en servidor (`getCurrentUser`).

---

## 2. Onboarding lineal de propiedades (Linear Property Form)

### Objetivo

Flujo **multi-paso** en el panel para cargar una propiedad con animación clara, teclado (Enter / Esc) y estética oscura alineada al resto del backoffice.

### Estructura de carpetas

- **Orquestador**: `src/components/panel/LinearPropertyForm.tsx`  
  - Estado: `formData`, `currentStep`.  
  - Navegación: `goNext`, `goPrev`, validación por paso (`advanceIfValid` donde aplica).  
  - Contenedor de `AnimatePresence` + `StepShell` + pie/header del flujo.

- **Pasos**: `src/components/panel/property-steps/`  
  - Un archivo por paso (`StepOperacion.tsx`, `StepTipo.tsx`, …).  
  - Constantes y catálogos: `constants.ts`.  
  - Validación y stub de publicación: `validation.ts`, `publish.ts`.  
  - UI reutilizable del flujo (inputs “subtle”, tarjetas grandes, etc.): `step-ui.tsx`.  
  - Contenedor animado del paso: `StepShell.tsx`.

### Contrato `StepProps`

Definido en `src/types/panel.ts`:

- `data`: snapshot del estado del formulario (`PropertyFormData`).
- `update`: mutación tipada por clave (`keyof PropertyFormData`).
- `onNext`: callback del padre (avance inmediato tras selección en pasos binarios, o avance condicionado a validación en pasos con Enter).

Así los pasos **no duplican** estado global y permanecen testeables de forma aislada.

### `StepShell` y zig-zag

`StepShell` envuelve el contenido del paso en un **`motion.div`** de Framer Motion:

- Paridad del índice del paso alterna **origen en X** y clases de alineación (`mr-auto` / `ml-auto` + padding lateral en `md:`), de modo que el contenido “entre” con un **zig-zag** perceptible.
- `AnimatePresence mode="wait"` en el padre evita solapamiento visual entre pasos.

Cualquier cambio futuro en la coreografía debe mantenerse **acotado** a `StepShell.tsx` y al contenedor del padre para no dispersar lógica de motion.

---

## 3. UI del panel, Tailwind y navegadores (Safari / JIT)

### Literales de cadena completos en `className`

En vistas del panel (resumen, métricas, tabs) se adoptó la convención de usar **solo literales de cadena completos** en atributos `className` (sin concatenar clases con variables ni plantillas que el analizador estático de Tailwind no pueda ver).

**Motivos:**

1. **Tailwind JIT**: solo incluye en el CSS final las clases que aparecen como **subcadenas detectables** en el código fuente. Patrones dinámicos pueden producir estilos “fantasma” o inconsistentes entre builds y entornos.
2. **Safari y caché**: combinado con hidratación y cambios de rol, los estilos dinámicos mal detectados pueden manifestarse como **regresiones visuales** difíciles de reproducir; los literales fijos estabilizan el surface de clases generadas.

Los componentes de negocio (p. ej. métricas) siguen usando **props de contenido** (`label`, `value`, `detail`) sin mezclar lógica en las cadenas de clase.

### Gradiente en `panel/layout.tsx`

El layout del segmento `(web)/panel` aplica un **`min-h-screen`** con **gradiente** (`bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark`) y texto claro.

**Función:**

- Garantiza **contraste** uniforme para el backoffice sin depender de que cada página repita el fondo.
- Reduce riesgos de “fondo blanco” o parpadeos en **primera pintura** / transiciones en WebKit cuando las rutas hijas montan contenido semitransparente (`bg-black/20`, `backdrop-blur`, etc.).

Las páginas hijas deben asumir este canvas oscuro y limitarse a layout interno (`max-w-7xl`, grids, tarjetas).

---

## 4. Infraestructura local (Docker)

Definido en `docker-compose.yml`:

| Servicio | Imagen | Puerto | Notas |
|----------|--------|--------|--------|
| **db** (`propea-db`) | `postgres:16-alpine` | `5432` | Base `propea_group`, volumen `propea_pg_data`, red `propea-network`. |
| **adminer** (`propea-adminer`) | `adminer:4` | `8080` | UI liviana para inspeccionar tablas. Servidor **`db`**, credenciales del Compose. |

El `DATABASE_URL` de la aplicación debe apuntar al host **localhost** (desde el proceso Node en tu máquina), no al nombre `db` (ese hostname solo resuelve **entre contenedores**).

---

## 5. Referencias rápidas de código

| Tema | Ubicación principal |
|------|----------------------|
| Esquema y enums | `database/schema.prisma` |
| Auth / RBAC helpers | `src/lib/auth.ts` |
| Tipos globales | `src/types/` |
| Panel layout | `src/app/(web)/panel/layout.tsx` |
| Equipo (API) | `src/app/api/panel/equipo/route.ts` |
| Pasos del onboarding | `src/components/panel/property-steps/` |

Este archivo debe actualizarse cuando cambien **reglas de negocio** (roles, límites de API) o **patrones estructurales** (nuevos módulos del panel).
