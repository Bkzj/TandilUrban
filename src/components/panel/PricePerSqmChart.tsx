'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { PrecioM2PorZonaResult } from '@/lib/panel-analytics';
import { formatMoneyAmount } from '@/lib/money-format';

type PricePerSqmChartProps = { data: PrecioM2PorZonaResult[] };

const ZONE_COLORS = ['#10b981', '#34d399', '#059669', '#047857', '#6ee7b7', '#a7f3d0'];
const TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  borderColor: 'rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
};

export function PricePerSqmChart({ data }: PricePerSqmChartProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg shadow-lg shadow-black/20">
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">Inteligencia de precios</h2>
        <p className="mt-1 text-xs text-gray-500">Promedio exacto por moneda · solo ventas</p>
      </div>

      {data.length > 0 ? data.map(({ zonas, promedioGeneral, moneda }) => (
        <section key={moneda} className="mt-5 border-b border-white/10 pb-5 last:border-0">
          <p className="text-2xl font-bold tabular-nums tracking-tight text-white">
            {moneda} {formatMoneyAmount(promedioGeneral)} / m²
          </p>
          <div className="mt-4 h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={zonas.map((zone) => ({ ...zone, value: Number(zone.value) }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                >
                  {zonas.map((zone, index) => (
                    <Cell key={zone.name} fill={ZONE_COLORS[index % ZONE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [`${moneda} ${String(value)} / m²`, String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2">
            {zonas.map((item, index) => (
              <li key={item.name} className="flex items-center justify-between gap-3 text-sm text-gray-300">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: ZONE_COLORS[index % ZONE_COLORS.length] }}
                    aria-hidden
                  />
                  <span className="truncate font-medium">{item.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-gray-400">
                  {moneda} {formatMoneyAmount(item.value)}/m²
                </span>
              </li>
            ))}
          </ul>
        </section>
      )) : (
        <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-gray-500">
          Publicá propiedades en venta con precio y superficie para ver el análisis por moneda.
        </p>
      )}
    </div>
  );
}
