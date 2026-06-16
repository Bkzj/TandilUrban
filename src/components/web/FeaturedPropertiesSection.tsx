'use client';

import { motion } from 'framer-motion';

import { FeaturedPropertyCard } from '@/components/web/FeaturedPropertyCard';
import type { PublicPropiedadListItem } from '@/types/public-search';

const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: PREMIUM_EASE,
      delay: i * 0.08,
    },
  }),
};

type Props = {
  propiedades: PublicPropiedadListItem[];
  favoritoIds: string[];
  eyebrow?: string;
  title?: string;
  titleAccent?: boolean;
  sectionClassName?: string;
  className?: string;
};

const DEFAULT_SECTION_CLASS =
  'border-b border-naranja/10 bg-gradient-to-b from-naranja-light/40 via-white to-white py-16 sm:py-20';

export function FeaturedPropertiesSection({
  propiedades,
  favoritoIds,
  eyebrow = 'Selección exclusiva',
  title = 'Lo más relevante del mes',
  titleAccent = false,
  sectionClassName,
  className = '',
}: Props) {
  const favoritoSet = new Set(favoritoIds);

  if (propiedades.length === 0) return null;

  return (
    <section className={`${sectionClassName ?? DEFAULT_SECTION_CLASS} ${className}`.trim()}>
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          className="mb-12 text-center sm:mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-5% 0px' }}
          transition={{ duration: 0.8, ease: PREMIUM_EASE }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-naranja">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {titleAccent ? (
              <span className="mr-2 text-[#B4853F]" aria-hidden>
                •
              </span>
            ) : null}
            {title}
          </h2>
        </motion.div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {propiedades.map((propiedad, index) => (
            <motion.div
              key={propiedad.id}
              custom={index}
              variants={reveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-4% 0px' }}
              className={index % 3 === 1 ? 'lg:mt-16' : ''}
            >
              <FeaturedPropertyCard
                propiedad={propiedad}
                isFavoritoInicial={favoritoSet.has(propiedad.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
