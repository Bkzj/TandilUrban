/** Rutas del segmento (web) con Prisma/pg: runtime Node, no Edge. */
export const runtime = 'nodejs';

export default function WebSegmentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
