'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Users } from 'lucide-react';

import type { InmobiliariasDirectoryData } from '@/lib/data/inmobiliarias-directory';
import type { InmobiliariaDirectoryItem } from '@/types/inmobiliaria-directory';

import { InmobiliariaCard } from './InmobiliariaCard';
import { InmobiliariaAvatar } from './InmobiliariaAvatar';

const MAX_GALERIA = 6;
const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  data: InmobiliariasDirectoryData;
};

function allAgencies(data: InmobiliariasDirectoryData): InmobiliariaDirectoryItem[] {
  return [...data.destacadas, ...data.todas];
}

export function InmobiliariasContenido({ data }: Props) {
  const { destacadas, todas } = data;
  const total = destacadas.length + todas.length;
  const galeria = allAgencies(data).slice(0, MAX_GALERIA);

  if (total === 0) {
    return (
      <section
        id="inmobiliarias"
        className="scroll-mt-20 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20"
      >
        <motion.div
          className="rounded-3xl border border-dashed border-verde/25 bg-verde-light/30 px-6 py-16 text-center"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <Users className="mx-auto h-10 w-10 text-verde/60" aria-hidden />
          <p className="mt-4 text-lg font-semibold text-text-primary">
            Pronto vas a ver las inmobiliarias de la red
          </p>
          <p className="mx-auto mt-2 max-w-md text-text-secondary">
            Mientras tanto, explorá propiedades disponibles en el portal.
          </p>
          <Link
            href="/buscar"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-verde px-6 py-3 text-sm font-semibold text-white transition hover:bg-verde-hover"
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
      {galeria.length > 0 ? (
        <section
          id="inmobiliarias"
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
                  Selección Propea Group
                </p>
                <h2 className="mt-2 text-3xl font-extrabold text-text-primary sm:text-4xl">
                  Lo más relevante del mes
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Agencias partner con mayor presencia en la plataforma
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {galeria.length} en galería
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              {galeria.map((item, index) => (
                <motion.div
                  key={item.userId}
                  initial={{ opacity: 0, y: 32, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-5% 0px' }}
                  transition={{ duration: 0.55, ease: EASE, delay: index * 0.07 }}
                >
                  <Link
                    href={`/inmobiliarias/${item.userId}`}
                    className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-emerald-950 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {item.avatarUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.avatarUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-emerald-950/20"
                          aria-hidden
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-900 to-emerald-950 p-6">
                        <InmobiliariaAvatar
                          imageUrl={null}
                          alt={item.nombreAgencia}
                          size="xl"
                        />
                      </div>
                    )}
                    <span
                      className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-white ${
                        item.destacada ? 'bg-naranja' : 'bg-verde'
                      }`}
                    >
                      {item.destacada ? 'Destacada' : 'Partner'}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                      <p className="line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-sm">
                        {item.nombreAgencia}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[0.65rem] text-emerald-100/80">
                        {item.propiedadesDisponibles}{' '}
                        {item.propiedadesDisponibles === 1 ? 'propiedad' : 'propiedades'}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {destacadas.length > 0 ? (
        <section className="border-b border-gray-100 bg-gray-50 py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <motion.div
              className="mb-8 text-center sm:mb-10"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-8% 0px' }}
              transition={{ duration: 0.65, ease: EASE }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-verde">
                Agencias premium
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Inmobiliarias destacadas
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-gray-600">
                Las agencias con mayor presencia y trayectoria en la plataforma.
              </p>
            </motion.div>

            <div className="mx-auto flex max-w-4xl flex-col gap-6">
              {destacadas.map((item, index) => (
                <motion.div
                  key={item.userId}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-5% 0px' }}
                  transition={{ duration: 0.6, ease: EASE, delay: index * 0.08 }}
                >
                  <InmobiliariaCard inmobiliaria={item} variant="featured" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <motion.div
          className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-8% 0px' }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-verde">
              Directorio completo
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              {destacadas.length > 0 ? 'Más inmobiliarias' : 'Inmobiliarias en Tandil'}
            </h2>
            <p className="mt-2 text-gray-600">
              {total === 1
                ? '1 agencia registrada en la red.'
                : `${total} agencias registradas en la red.`}
            </p>
          </div>
          <Link
            href="/para-inmobiliarias"
            className="shrink-0 text-sm font-semibold text-verde transition-colors hover:text-verde-hover"
          >
            ¿Sos inmobiliaria? Sumate →
          </Link>
        </motion.div>

        {todas.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {todas.map((item, index) => (
              <motion.div
                key={item.userId}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-5% 0px' }}
                transition={{ duration: 0.55, ease: EASE, delay: (index % 4) * 0.06 }}
              >
                <InmobiliariaCard inmobiliaria={item} />
              </motion.div>
            ))}
          </div>
        ) : destacadas.length > 0 ? (
          <motion.p
            className="text-center text-gray-500"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Todas nuestras agencias partner están en el bloque destacado.
          </motion.p>
        ) : null}
      </section>
    </>
  );
}
