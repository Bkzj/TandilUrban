'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Home, Star, TrendingUp } from 'lucide-react';

import { DestacadoPropertyCard } from '@/components/public/destacados/DestacadoPropertyCard';
import type { PublicPropiedadListItem } from '@/types/public-search';

const MAX_GALERIA = 6;
const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

const reveal = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.95,
      ease: PREMIUM_EASE,
      delay: i * 0.1,
    },
  }),
};

type FiltroTipo = 'todos' | 'Casa' | 'Departamento' | 'Lote';

const FILTROS: { id: FiltroTipo; label: string; icon: typeof Home }[] = [
  { id: 'todos', label: 'Todo', icon: TrendingUp },
  { id: 'Casa', label: 'Casas', icon: Home },
  { id: 'Departamento', label: 'Deptos', icon: Building2 },
  { id: 'Lote', label: 'Lotes', icon: Star },
];

type Props = {
  propiedades: PublicPropiedadListItem[];
  favoritoIds: string[];
};

function matchesTipo(p: PublicPropiedadListItem, filtro: FiltroTipo): boolean {
  if (filtro === 'todos') return true;
  return p.tipo.toLowerCase() === filtro.toLowerCase();
}

export function DestacadosContenido({ propiedades, favoritoIds }: Props) {
  const [filtro, setFiltro] = useState<FiltroTipo>('todos');
  const favoritoSet = useMemo(() => new Set(favoritoIds), [favoritoIds]);

  const filtradas = useMemo(
    () => propiedades.filter((p) => matchesTipo(p, filtro)),
    [propiedades, filtro],
  );

  const galeria = useMemo(
    () => (filtro === 'todos' ? propiedades.slice(0, MAX_GALERIA) : filtradas.slice(0, MAX_GALERIA)),
    [propiedades, filtradas, filtro],
  );

  if (propiedades.length === 0) {
    return (
      <section
        id="oportunidades"
        className="scroll-mt-20 mx-auto w-full max-w-5xl px-6 py-20 sm:px-8"
      >
        <motion.div
          className="rounded-2xl border border-dashed border-naranja/20 bg-naranja-light/20 px-8 py-16 text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: PREMIUM_EASE }}
        >
          <Star className="mx-auto h-8 w-8 text-naranja/50" aria-hidden />
          <p className="mt-4 text-base font-semibold text-text-primary">
            Todavía no hay propiedades destacadas
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
            Muy pronto vas a ver acá las publicaciones más exclusivas.
          </p>
          <Link
            href="/buscar"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-verde px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-700 hover:bg-verde-hover"
          >
            Explorar propiedades
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </motion.div>
      </section>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-naranja/8 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-6 py-3 sm:px-8 hide-scrollbar">
          {FILTROS.map(({ id, label, icon: Icon }) => {
            const active = filtro === id;
            const count =
              id === 'todos'
                ? propiedades.length
                : propiedades.filter((p) => matchesTipo(p, id)).length;
            if (id !== 'todos' && count === 0) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-700 ${
                  active
                    ? 'bg-naranja text-white shadow-sm shadow-naranja/15'
                    : 'bg-white/80 text-text-secondary ring-1 ring-black/[0.05] hover:text-naranja hover:ring-naranja/20'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {filtro === 'todos' && galeria.length > 0 ? (
        <section
          id="oportunidades"
          className="scroll-mt-20 border-b border-naranja/8 bg-gradient-to-b from-naranja-light/25 via-background to-background py-16 sm:py-20"
        >
          <div className="mx-auto max-w-5xl px-6 sm:px-8">
            <motion.div
              className="mb-12 text-center sm:mb-14"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-5% 0px' }}
              transition={{ duration: 0.9, ease: PREMIUM_EASE }}
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-naranja">
                Selección exclusiva
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
                Lo más relevante del mes
              </h2>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-x-10 gap-y-12">
              {galeria.map((p, index) => (
                <motion.div
                  key={p.id}
                  custom={index}
                  variants={reveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-4% 0px' }}
                >
                  <DestacadoPropertyCard
                    propiedad={p}
                    isFavoritoInicial={favoritoSet.has(p.id)}
                    rank={index + 1}
                    size="sm"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div id="oportunidades" className="scroll-mt-20" />
      )}

      <section className="mx-auto w-full max-w-5xl px-6 py-20 sm:px-8 sm:py-24">
        <motion.div
          className="mb-14 text-center sm:mb-16"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-5% 0px' }}
          transition={{ duration: 0.9, ease: PREMIUM_EASE }}
        >
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-naranja">
            Catálogo
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            {filtro === 'todos'
              ? 'Oportunidades que no podés dejar pasar'
              : `Destacadas · ${FILTROS.find((f) => f.id === filtro)?.label ?? ''}`}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-text-secondary">
            {filtradas.length === 1
              ? '1 propiedad en esta selección.'
              : `${filtradas.length} propiedades en esta selección.`}
          </p>
        </motion.div>

        {filtradas.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-14">
            {filtradas.map((propiedad, index) => (
              <motion.div
                key={propiedad.id}
                custom={index}
                variants={reveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-4% 0px' }}
              >
                <DestacadoPropertyCard
                  propiedad={propiedad}
                  isFavoritoInicial={favoritoSet.has(propiedad.id)}
                  rank={index + 1}
                  size="md"
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            className="mx-auto max-w-md rounded-2xl border border-dashed border-naranja/20 bg-naranja-light/15 px-8 py-12 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: PREMIUM_EASE }}
          >
            <p className="text-sm text-text-secondary">
              No hay propiedades destacadas en esta categoría.
            </p>
            <button
              type="button"
              onClick={() => setFiltro('todos')}
              className="mt-4 text-xs font-semibold text-naranja transition-colors duration-700 hover:text-naranja-hover"
            >
              Ver todo
            </button>
          </motion.div>
        )}

        <div className="mt-16 text-center">
          <Link
            href="/buscar"
            className="text-xs font-semibold tracking-wide text-naranja transition-colors duration-700 hover:text-naranja-hover"
          >
            Ver catálogo completo →
          </Link>
        </div>
      </section>

      <section className="border-t border-naranja/10 bg-gradient-to-br from-emerald-950 via-emerald-950 to-naranja-dark/90 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-16 text-center sm:px-8 sm:py-20 lg:flex-row lg:text-left">
          <div className="flex-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-naranja-light">
              Mayor visibilidad
            </p>
            <h2 className="mt-3 text-xl font-extrabold sm:text-2xl">
              ¿Querés que tu propiedad destaque en el portal?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-emerald-50/80 lg:mx-0">
              Las publicaciones con mejor calidad y engagement aparecen en esta selección curada.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/para-inmobiliarias"
              className="inline-flex items-center justify-center rounded-lg bg-naranja px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-700 hover:bg-naranja-hover"
            >
              Soy inmobiliaria
            </Link>
            <Link
              href="/buscar"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-700 hover:bg-white/10"
            >
              Explorar propiedades
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
