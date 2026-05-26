/** Rutas del segmento (web) con Prisma/pg: runtime Node, no Edge. */
export const runtime = 'nodejs';

import { Footer } from '@/components/public/Footer';

export default function WebSegmentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
