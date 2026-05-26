'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type FunnelChartDatum = {
  name: string;
  value: number;
};

type AnalyticsFunnelProps = {
  data: FunnelChartDatum[];
};

const BAR_FILL = '#10b981';

export function AnalyticsFunnel({ data }: AnalyticsFunnelProps) {
  return (
    <div className="h-[280px] w-full min-w-0 sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid vertical={false} horizontal={false} />
          <XAxis
            type="number"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{
              backgroundColor: '#1f2937',
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#fff',
            }}
            formatter={(value) => [
              typeof value === 'number' ? value.toLocaleString('es-AR') : String(value ?? ''),
              'Total',
            ]}
          />
          <Bar dataKey="value" fill={BAR_FILL} radius={[0, 4, 4, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
