import type { Metadata } from 'next';

import Navbar from '@/components/Navbar';
import { EmprendimientosExplorer } from '@/components/public/emprendimientos/EmprendimientosExplorer';
import { EmprendimientosHero } from '@/components/public/emprendimientos/EmprendimientosHero';
import { getServerAuthSession } from '@/lib/auth';
import { getEmprendimientosPageData } from '@/lib/data/emprendimientos';
import { getFavoritePropiedadIds } from '@/lib/favoritos';
import type { SessionUserAugmented } from '@/types/auth';

export const metadata: Metadata = {
  title: 'Emprendimientos | Propea Group',
  description:
    'Proyectos en pozo, locales comerciales, franquicias y publicidad para emprendedores en Tandil. Portal informativo y fichas de propiedades en un solo lugar.',
};

function collectShowcaseImages(
  editoriales: { imagen: string; imagenes?: string[] }[],
  propiedades: { imagenes: string[] }[],
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const push = (url: string | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };

  for (const item of editoriales) {
    push(item.imagen);
    for (const img of item.imagenes ?? []) push(img);
  }
  for (const p of propiedades) {
    push(p.imagenes[0]);
  }

  return urls.slice(0, 6);
}

export default async function EmprendimientosPage() {
  const [data, session] = await Promise.all([
    getEmprendimientosPageData(),
    getServerAuthSession(),
  ]);

  const userId = (session?.user as SessionUserAugmented | undefined)?.id;
  const favoritoIds = userId ? [...(await getFavoritePropiedadIds(userId))] : [];

  const totalItems =
    data.editoriales.length + data.proyectosPozo.length + data.localesComerciales.length;

  const showcaseImages = collectShowcaseImages(data.editoriales, data.proyectosPozo);

  return (
    <main className="min-h-screen bg-background font-sans text-text-primary">
      <Navbar />
      <EmprendimientosHero totalItems={totalItems} showcaseImages={showcaseImages} />
      <EmprendimientosExplorer data={data} favoritoIds={favoritoIds} />
    </main>
  );
}
