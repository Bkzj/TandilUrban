'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Bus,
  GraduationCap,
  Hospital,
  Loader2,
  MapPinOff,
  Shield,
  ShoppingCart,
  TreePine,
} from 'lucide-react';

import { formatDistanciaCercania } from '@/lib/cercanias-format';
import {
  CERCANIAS_CATEGORY_ORDER,
  getTransportLineId,
  type CercaniasCategoryKey,
  type PoiConDistancia,
  type PoisCercanosResult,
  type TransporteCercano,
} from '@/types/cercanias';

type PropertyCercaniasProps = {
  categorias: PoisCercanosResult | null;
  loading: boolean;
  error: string | null;
};

const ICON_CLASS = 'text-verde';

const CATEGORY_META: Record<CercaniasCategoryKey, { label: string; icon: LucideIcon }> = {
  educacion: { label: 'Educación', icon: GraduationCap },
  supermercados: { label: 'Supermercados', icon: ShoppingCart },
  transporte: { label: 'Transporte', icon: Bus },
  parques: { label: 'Parques', icon: TreePine },
  salud: { label: 'Salud', icon: Hospital },
  seguridad: { label: 'Seguridad', icon: Shield },
};

const CARD_CLASS =
  'rounded-3xl border border-verde/10 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-8';

function poiKeyPunto(poi: PoiConDistancia, index: number): string {
  return `${poi.nombre}-${poi.lat}-${poi.lng}-${index}`;
}

function CategoryBlock({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: LucideIcon;
  items: Array<{ key: string; text: string }>;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-verde-light">
          <Icon className={`h-5 w-5 ${ICON_CLASS}`} strokeWidth={2} aria-hidden />
        </span>
        <h4 className="text-base font-semibold text-gray-900">{label}</h4>
      </div>
      <ul className="space-y-2 pl-[52px]">
        {items.map((item) => (
          <li key={item.key}>
            <span className="text-sm text-gray-600">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CercaniasSkeleton() {
  return (
    <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100" />
            <div className="h-4 w-28 rounded bg-gray-100" />
          </div>
          <div className="ml-[52px] space-y-2">
            <div className="h-3 w-full rounded bg-gray-50" />
            <div className="h-3 w-3/4 rounded bg-gray-50" />
            <div className="h-3 w-4/5 rounded bg-gray-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildCategoryItems(
  key: CercaniasCategoryKey,
  categorias: PoisCercanosResult
): Array<{ key: string; text: string }> {
  if (key === 'transporte') {
    return categorias.transporte.map((line: TransporteCercano) => ({
      key: getTransportLineId(line),
      text: `${line.nombre} - a ${formatDistanciaCercania(line.distanciaMetros)}`,
    }));
  }
  return categorias[key].map((poi, index) => ({
    key: poiKeyPunto(poi, index),
    text: `${poi.nombre} - a ${formatDistanciaCercania(poi.distanciaMetros)}`,
  }));
}

export default function PropertyCercanias({ categorias, loading, error }: PropertyCercaniasProps) {
  const blocks = categorias
    ? CERCANIAS_CATEGORY_ORDER.filter((key) => categorias[key].length > 0).map((key) => {
        const meta = CATEGORY_META[key];
        return (
          <CategoryBlock
            key={key}
            label={meta.label}
            icon={meta.icon}
            items={buildCategoryItems(key, categorias)}
          />
        );
      })
    : [];

  return (
    <section className={CARD_CLASS} aria-busy={loading}>
      <h3 className="mb-6 text-2xl font-bold text-gray-900">Entorno y Servicios</h3>

      {loading ? (
        <div className="flex flex-col items-center gap-6 py-2">
          <Loader2 className="h-8 w-8 animate-spin text-verde" aria-hidden />
          <CercaniasSkeleton />
        </div>
      ) : error ? (
        <p className="text-sm text-gray-500">{error}</p>
      ) : blocks.length === 0 ? (
        <div className="flex items-center gap-3 text-gray-500">
          <MapPinOff className="h-5 w-5 shrink-0" aria-hidden />
          <p className="text-sm">No hay puntos de interés registrados cerca de esta ubicación.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{blocks}</div>
      )}
    </section>
  );
}
