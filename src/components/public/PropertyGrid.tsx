import { PropertyCardPublic } from '@/components/public/PropertyCardPublic';
import type { PublicPropiedadListItem } from '@/types/public-search';

type PropertyGridProps = {
  propiedades: PublicPropiedadListItem[];
  /** IDs de propiedades favoritas del usuario (opcional). */
  favoritoIds?: ReadonlySet<string>;
  variant?: 'default' | 'featured';
};

export function PropertyGrid({ propiedades, favoritoIds, variant = 'default' }: PropertyGridProps) {
  if (propiedades.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-text-secondary">
        No hay propiedades publicadas en este momento.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {propiedades.map((propiedad) => (
        <PropertyCardPublic
          key={propiedad.id}
          propiedad={propiedad}
          isFavoritoInicial={favoritoIds?.has(propiedad.id) ?? false}
          variant={variant}
        />
      ))}
    </div>
  );
}
