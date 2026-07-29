# Revisión de rendimiento: hero video

Se evaluó `public/videos/hero-sunset.mp4` sin modificarlo.

| Métrica | Resultado |
| --- | --- |
| Tamaño | 43,020,793 bytes (≈41 MiB) |
| Contenedor | MP4 (`mov,mp4,m4a,3gp,3g2,mj2`) |
| Video | H.264, 1920×1080, 30 fps, ≈20.37 Mb/s |
| Audio | AAC, ≈192 kb/s |
| Duración / bitrate total | 16.73 s / ≈20.57 Mb/s |
| Uso actual | sólo desktop (`md`+), `autoPlay`, `loop`, `muted`, `playsInline`, `preload="auto"` |
| Poster/fallback | imagen remota Unsplash usada como `poster` y fondo; no hay pantalla negra si falla. |
| Movimiento reducido | las animaciones Framer responden a reduced motion; el video no se desactiva para esa preferencia. |
| Cache headers | no hay regla específica; verificar en CDN/staging `Cache-Control` y soporte de range requests. |

Un hero de 41 MiB con `preload=auto` puede competir directamente por LCP y transferencia desktop, incluso aunque esté oculto en móvil. No se comprobó LCP de campo ni red real: debe medirse con Lighthouse y WebPageTest de staging en 4G/CPU móvil antes de declararlo aceptable.

Opciones seguras, sujetas a aprobación: producir variantes H.264 de menor bitrate y AV1/WebM con fallback MP4; bajar resolución para pantallas comunes; usar un poster local optimizado; pasar a `preload="metadata"` o iniciar tras interacción/idle; respetar `prefers-reduced-motion` y `prefers-reduced-data`; y servir por CDN con cache inmutable y byte ranges. Ninguna de estas opciones fue aplicada.
