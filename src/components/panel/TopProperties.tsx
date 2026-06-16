import Image from 'next/image';
import Link from 'next/link';

import type { TopPropiedadItem } from '@/lib/panel-analytics';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800&auto=format&fit=crop';

type TopPropertiesProps = {
  topPropiedades: TopPropiedadItem[];
};

export function TopProperties({ topPropiedades }: TopPropertiesProps) {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg shadow-lg shadow-black/20 sm:p-8 lg:col-span-3">
      <div className="border-b border-white/10 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Ranking</p>
        <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
          Propiedades más vistas
        </h2>
      </div>

      {topPropiedades.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">
          Todavía no hay visitas registradas en tu cartera.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {topPropiedades.map((propiedad, index) => {
            const src = propiedad.imagen.trim() || PLACEHOLDER;
            return (
              <Link
                key={propiedad.id}
                href={`/panel/propiedades/editar/${propiedad.id}`}
                className="group block"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
                    aria-hidden
                  />
                  <span className="absolute right-3 top-3 rounded bg-black/50 px-2 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
                    {propiedad.visitas.toLocaleString('es-AR')} visitas
                  </span>
                  <div className="absolute bottom-0 left-0 p-4 pr-16">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-300/90">
                      #{index + 1}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-white">
                      {propiedad.titulo}
                    </h3>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
