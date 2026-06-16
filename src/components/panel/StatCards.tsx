import { Home, MessageCircle, MousePointerClick, TrendingUp } from 'lucide-react';

import type { PanelAnalyticsStats } from '@/lib/panel-analytics';

type StatCardsProps = {
  stats: PanelAnalyticsStats;
};

const CARD_CLASS =
  'rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg shadow-lg shadow-black/20';

const BASE_CARDS = [
  {
    key: 'totalPropiedades' as const,
    label: 'Total propiedades',
    icon: Home,
    iconClass: 'text-emerald-400 bg-white/10',
  },
  {
    key: 'visitasTotales' as const,
    label: 'Visitas totales',
    icon: MousePointerClick,
    iconClass: 'text-verde-light bg-white/10',
  },
  {
    key: 'totalConsultas' as const,
    label: 'Total consultas',
    icon: MessageCircle,
    iconClass: 'text-emerald-400 bg-white/10',
  },
] as const;

function formatTasaConversion(consultas: number, visitas: number): string {
  if (visitas <= 0) return '0%';
  return `${((consultas / visitas) * 100).toFixed(1)}%`;
}

export function StatCards({ stats }: StatCardsProps) {
  const tasaLabel = formatTasaConversion(stats.totalConsultas, stats.visitasTotales);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {BASE_CARDS.map(({ key, label, icon: Icon, iconClass }) => (
        <div key={key} className={CARD_CLASS}>
          <div
            className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
          >
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <p className="text-sm font-medium text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-white">
            {stats[key].toLocaleString('es-AR')}
          </p>
        </div>
      ))}

      <div className={CARD_CLASS}>
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-emerald-400">
          <TrendingUp className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <p className="text-sm font-medium text-gray-400">Tasa de conversión</p>
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-white">{tasaLabel}</p>
      </div>
    </div>
  );
}
