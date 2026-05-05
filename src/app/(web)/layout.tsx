// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // Es vital mantener esto para que Tailwind y tus colores funcionen

// Aquí definimos el título y descripción que aparecerán en Google y en la pestaña del navegador
export const metadata: Metadata = {
  title: "TandilUrban | Inmobiliaria Exclusiva",
  description: "Encuentra tu próximo hogar en las sierras de Tandil.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50 text-gray-900">
        {/* Aquí adentro (children) es donde Next.js inyecta tu page.tsx automáticamente */}
        {children}
      </body>
    </html>
  );
}