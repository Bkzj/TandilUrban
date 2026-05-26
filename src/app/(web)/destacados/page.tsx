import type { Metadata } from 'next';

import Navbar from '@/components/Navbar';
import { DestacadosContenido } from '@/components/public/destacados/DestacadosContenido';
import { DestacadosHero } from '@/components/public/destacados/DestacadosHero';
import { getServerAuthSession } from '@/lib/auth';
import { getPropiedadesDestacadas } from '@/lib/data/propiedades-destacadas';
import { getFavoritePropiedadIds } from '@/lib/favoritos';
import type { SessionUserAugmented } from '@/types/auth';

export const metadata: Metadata = {
  title: 'Destacados | Propea Group',
  description:
    'Las propiedades más exclusivas de Tandil, seleccionadas por su calidad y el interés de la comunidad en Propea Group.',
};

function collectShowcaseImages(propiedades: { imagenes: string[] }[]): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const p of propiedades) {
    for (const img of p.imagenes) {
      const trimmed = img?.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      urls.push(trimmed);
      if (urls.length >= 6) return urls;
    }
  }

  return urls;
}

export default async function DestacadosPage() {
  const [propiedades, session] = await Promise.all([
    getPropiedadesDestacadas(),
    getServerAuthSession(),
  ]);

  const userId = (session?.user as SessionUserAugmented | undefined)?.id;
  const favoritoIds = userId ? [...(await getFavoritePropiedadIds(userId))] : [];
  const showcaseImages = collectShowcaseImages(propiedades);

  return (
    <main className="min-h-screen bg-background font-sans text-text-primary">
      <Navbar />
      <DestacadosHero totalItems={propiedades.length} showcaseImages={showcaseImages} />
      <DestacadosContenido propiedades={propiedades} favoritoIds={favoritoIds} />
    </main>
  );
}
