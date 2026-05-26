/**
 * Genera prisma/data/cloudinary-properties.json desde la API de Cloudinary.
 * Ejecutar: npx tsx scripts/build-cloudinary-restore-json.ts
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { configureCloudinary, cloudinary } from '../src/lib/cloudinary';

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME ?? 'dijzh5isu';

function deliveryJpg(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/f_jpg,q_auto:good/${publicId}`;
}

function slugToTitle(slug: string): string {
  const base = slug
    .replace(/\//g, ' — ')
    .replace(/---/g, ' — ')
    .replace(/-/g, ' ');
  return base
    .replace(/\bjardn\b/gi, 'jardín')
    .replace(/\bbalcn\b/gi, 'balcón')
    .replace(/\bpanormica\b/gi, 'panorámica')
    .replace(/\bnic\b/gi, 'único')
    .replace(/\bc\b/g, 'c/')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function inferMeta(slug: string, title: string) {
  const s = slug.toLowerCase();
  const operacion = s.includes('alquiler') ? 'Alquiler' : 'Venta';
  const tipo =
    s.includes('dpto') || s.includes('depto') ? 'Departamento' : 'Casa';

  let precio = 150000;
  let moneda = 'USD';
  if (s.includes('usd-180k')) {
    precio = 180000;
    moneda = 'USD';
  } else if (s.includes('ud-1000')) {
    precio = 1000;
    moneda = 'USD';
  } else if (operacion === 'Alquiler') {
    precio = 450000;
    moneda = 'ARS';
  }

  let m2Total = 120;
  const m2Match = s.match(/(\d+)m2/);
  if (m2Match) m2Total = Number(m2Match[1]);
  else if (s.includes('300m')) m2Total = 300;
  else if (s.includes('400m2')) m2Total = 400;

  let ambientes = 3;
  let dormitorios = 2;
  if (s.includes('2-dorm')) dormitorios = 2;
  if (s.includes('4-amb')) ambientes = 4;
  if (tipo === 'Departamento' && s.includes('4-amb')) dormitorios = 3;

  return { operacion, tipo, precio, moneda, m2Total, m2Cubiertos: Math.round(m2Total * 0.85), ambientes, dormitorios };
}

async function main() {
  configureCloudinary();
  const res = await cloudinary.api.resources({
    type: 'upload',
    prefix: 'tandilurban/propiedades',
    max_results: 500,
    resource_type: 'image',
  });

  const byFolder = new Map<string, { public_id: string; secure_url: string }[]>();
  for (const r of res.resources as { public_id: string; secure_url: string }[]) {
    const parts = r.public_id.split('/');
    const folderSlug = parts.slice(2, -1).join('/');
    if (!byFolder.has(folderSlug)) byFolder.set(folderSlug, []);
    byFolder.get(folderSlug)!.push({ public_id: r.public_id, secure_url: r.secure_url });
  }

  const coords = [
    { lat: -37.3219, lng: -59.1339, barrio: 'Centro' },
    { lat: -37.2984, lng: -59.1182, barrio: 'El Dique' },
    { lat: -37.3112, lng: -59.1521, barrio: 'Altos del Valle' },
    { lat: -37.3562, lng: -59.0684, barrio: 'Las Delicias' },
    { lat: -37.3195, lng: -59.1298, barrio: 'Universidad' },
    { lat: -37.3254, lng: -59.1357, barrio: 'Parque Independencia' },
  ];

  const properties = [...byFolder.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folderSlug, imgs], i) => {
      const titulo = slugToTitle(folderSlug);
      const meta = inferMeta(folderSlug, titulo);
      const c = coords[i % coords.length]!;
      imgs.sort((a, b) => a.public_id.localeCompare(b.public_id));
      return {
        folderSlug,
        titulo,
        descripcion: `${titulo}. Publicación restaurada desde Cloudinary con fotos originales.`,
        ...meta,
        direccion: `Tandil — ${c.barrio}`,
        barrio: c.barrio,
        latitud: c.lat,
        longitud: c.lng,
        expensas: meta.operacion === 'Alquiler' && meta.moneda === 'ARS' ? 85000 : null,
        caracteristicas: ['Quincho', 'Jardín', 'Cochera', 'Parrilla'].slice(0, 3 + (i % 2)),
        imagenes: imgs.map((img, idx) => ({
          url: deliveryJpg(img.public_id),
          public_id: img.public_id,
          categoria: idx === 0 ? 'Portada' : 'Sin clasificar',
        })),
      };
    });

  const outPath = join(process.cwd(), 'prisma/data/cloudinary-properties.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), properties }, null, 2));
  console.log(`OK: ${properties.length} propiedades → prisma/data/cloudinary-properties.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
