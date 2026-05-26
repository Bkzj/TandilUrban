import Link from 'next/link';
import { ArrowUpRight, Megaphone } from 'lucide-react';

import { EMPRENDIMIENTO_CATEGORIA_META } from '@/constants/emprendimientos';
import type { EmprendimientoEditorial } from '@/types/emprendimientos';

type Props = {
  item: EmprendimientoEditorial;
  size?: 'default' | 'large' | 'compact';
};

function badgeClasses(categoria: EmprendimientoEditorial['categoria'], patrocinado?: boolean) {
  if (patrocinado) {
    return 'border border-naranja/40 bg-naranja-light/90 text-naranja-dark';
  }
  if (categoria === 'franquicia') {
    return 'bg-naranja text-white';
  }
  if (categoria === 'pozo') {
    return 'bg-verde text-white';
  }
  return 'bg-verde-light text-verde-dark';
}

export function EmprendimientoEditorialCard({ item, size = 'default' }: Props) {
  const meta = EMPRENDIMIENTO_CATEGORIA_META[item.categoria];
  const isLarge = size === 'large';
  const isCompact = size === 'compact';

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        item.patrocinado
          ? 'ring-naranja/25 hover:ring-naranja/40'
          : 'ring-black/5 hover:ring-verde/20'
      } ${isLarge ? 'sm:flex-row' : ''}`}
    >
      <div
        className={`relative shrink-0 overflow-hidden bg-gray-100 ${
          isLarge ? 'aspect-[16/10] sm:aspect-auto sm:w-[52%]' : isCompact ? 'aspect-[16/9]' : 'aspect-[16/10]'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imagen}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent ${
            isLarge ? 'sm:bg-gradient-to-r sm:from-black/10 sm:via-transparent sm:to-transparent' : ''
          }`}
          aria-hidden
        />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${badgeClasses(
              item.categoria,
              item.patrocinado,
            )}`}
          >
            {item.badge}
          </span>
          {item.patrocinado ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wide text-naranja-dark backdrop-blur-sm">
              <Megaphone className="h-3 w-3" aria-hidden />
              Patrocinado
            </span>
          ) : null}
        </div>
      </div>

      <div className={`flex flex-1 flex-col ${isLarge ? 'p-6 sm:p-8' : isCompact ? 'p-4' : 'p-5 sm:p-6'}`}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-verde">
          {meta.navLabel}
        </p>
        <h3
          className={`mt-2 font-extrabold tracking-tight text-text-primary ${
            isLarge ? 'text-2xl sm:text-3xl' : isCompact ? 'text-lg' : 'text-xl'
          }`}
        >
          {item.titulo}
        </h3>
        {item.subtitulo ? (
          <p className="mt-1 text-sm font-medium text-naranja">{item.subtitulo}</p>
        ) : null}
        {!isCompact ? (
          <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
            {item.descripcion}
          </p>
        ) : (
          <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{item.descripcion}</p>
        )}
        <Link
          href={item.ctaHref}
          className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
            item.patrocinado
              ? 'text-naranja hover:text-naranja-hover'
              : 'text-verde hover:text-verde-hover'
          }`}
        >
          {item.ctaLabel}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </article>
  );
}
