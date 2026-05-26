import type { Metadata } from "next";
import "./(web)/globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Propea Group | Inmobiliaria Exclusiva",
  description: "Encuentra tu próximo hogar en las sierras de Tandil.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-background text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
