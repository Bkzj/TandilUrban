import { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

export default function MetricCard({ label, value, detail }: Props) {
  return (
    <div className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg shadow-lg shadow-black/20 transition-all duration-300 hover:border-naranja/40 hover:bg-white/10">
      <p className="text-xs font-bold uppercase tracking-widest !text-surface/60">{label}</p>
      <p className="mt-3 text-4xl font-bold !text-white md:text-5xl">{value}</p>
      {detail && <p className="mt-2 text-sm !text-surface/50">{detail}</p>}
    </div>
  );
}