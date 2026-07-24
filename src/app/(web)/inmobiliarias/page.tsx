import type { Metadata } from 'next';
import { connection } from 'next/server';

import Navbar from '@/components/Navbar';
import { InmobiliariasContenido } from '@/components/public/inmobiliarias/InmobiliariasContenido';
import { InmobiliariasHero } from '@/components/public/inmobiliarias/InmobiliariasHero';
import { IMAGENES_HOME } from '@/constants/home';
import { getInmobiliariasDirectory } from '@/lib/data/inmobiliarias-directory';
import type { InmobiliariasDirectoryData } from '@/lib/data/inmobiliarias-directory';

export const metadata: Metadata = {
  title: 'Inmobiliarias | Propea Group',
  description:
    'Conocé las inmobiliarias de Tandil en Propea Group. Agencias destacadas y perfiles profesionales de la red.',
};

function collectShowcaseImages(data: InmobiliariasDirectoryData): string[] {
  const all = [...data.destacadas, ...data.todas];
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const item of all) {
    const url = item.avatarUrl?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= 6) break;
  }

  if (urls.length < 3) {
    for (const fallback of [IMAGENES_HOME.nosotros, IMAGENES_HOME.propiedades]) {
      if (urls.length >= 3) break;
      if (!seen.has(fallback)) urls.push(fallback);
    }
  }

  return urls;
}

export default async function InmobiliariasPage() {
  // El directorio es datos operativos de PostgreSQL y debe resolverse por request, no al compilar.
  await connection();
  const data = await getInmobiliariasDirectory();
  const totalAgencias = data.destacadas.length + data.todas.length;
  const showcaseImages = collectShowcaseImages(data);

  return (
    <main className="min-h-screen bg-background font-sans text-text-primary">
      <Navbar />
      <InmobiliariasHero totalAgencias={totalAgencias} showcaseImages={showcaseImages} />
      <InmobiliariasContenido data={data} />
    </main>
  );
}
