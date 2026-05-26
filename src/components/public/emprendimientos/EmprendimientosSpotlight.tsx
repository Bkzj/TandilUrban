'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import type { EmprendimientoEditorial } from '@/types/emprendimientos';
import type { PublicPropiedadListItem } from '@/types/public-search';

const MAX_GALERIA = 6;
const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  spotlight: EmprendimientoEditorial;
  highlights: EmprendimientoEditorial[];
  propiedades: PublicPropiedadListItem[];
};

type MosaicTile = {
  href: string;
  imagen: string;
  titulo: string;
  badge: string;
};

function itemImages(item: EmprendimientoEditorial): string[] {
  return [item.imagen, ...(item.imagenes ?? [])];
}

function buildMosaic(
  spotlight: EmprendimientoEditorial,
  highlights: EmprendimientoEditorial[],
  propiedades: PublicPropiedadListItem[],
): MosaicTile[] {
  const tiles: MosaicTile[] = [];
  const seen = new Set<string>();

  const push = (tile: MosaicTile) => {
    if (seen.has(tile.imagen) || tiles.length >= MAX_GALERIA) return;
    seen.add(tile.imagen);
    tiles.push(tile);
  };

  for (const item of [spotlight, ...highlights]) {
    push({ href: item.ctaHref, imagen: item.imagen, titulo: item.titulo, badge: item.badge });
  }

  for (const p of propiedades) {
    if (tiles.length >= MAX_GALERIA) break;
    const imagen = p.imagenes[0]?.trim();
    if (!imagen) continue;
    push({
      href: `/propiedades/${p.id}`,
      imagen,
      titulo: p.titulo,
      badge: 'Ficha real',
    });
  }

  if (tiles.length < MAX_GALERIA) {
    for (const item of [spotlight, ...highlights]) {
      for (const imagen of itemImages(item).slice(1)) {
        push({ href: item.ctaHref, imagen, titulo: item.titulo, badge: item.badge });
        if (tiles.length >= MAX_GALERIA) break;
      }
      if (tiles.length >= MAX_GALERIA) break;
    }
  }

  return tiles;
}

export function EmprendimientosSpotlight({ spotlight, highlights, propiedades }: Props) {
  const mosaic = buildMosaic(spotlight, highlights, propiedades);

  if (mosaic.length === 0) return null;

  return (
    <section
      id="oportunidades"
      className="scroll-mt-20 border-b border-verde/10 bg-gradient-to-b from-verde-light/40 to-background py-10 sm:py-12"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-8% 0px' }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-verde">
              Vidriera de oportunidades
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-text-primary sm:text-4xl">
              Lo más relevante del mes
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Galería curada de proyectos, franquicias y fichas del portal
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {mosaic.length} fotos
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {mosaic.map((tile, index) => (
            <motion.div
              key={`${tile.imagen}-${index}`}
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-5% 0px' }}
              transition={{ duration: 0.55, ease: EASE, delay: index * 0.07 }}
            >
              <Link
                href={tile.href}
                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tile.imagen}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                  aria-hidden
                />
                <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                  {tile.badge}
                </span>
                <p className="absolute inset-x-0 bottom-0 line-clamp-2 p-2.5 text-xs font-semibold leading-snug text-white sm:p-3 sm:text-sm">
                  {tile.titulo}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
