import { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

export default function MetricCard({ label, value, detail }: Props) {
  return (
    // Agregamos !bg-black/20 y !border-surface/10 para forzar el estilo
    <div className="group relative overflow-hidden rounded-2xl border !border-surface/10 !bg-black/20 p-6 backdrop-blur-md transition-all duration-300 hover:!border-naranja/40 hover:!bg-black/30 cursor-pointer">
      <p className="text-xs font-bold uppercase tracking-widest !text-surface/60">{label}</p>
      <p className="mt-3 text-4xl font-bold !text-white md:text-5xl">{value}</p>
      {detail && <p className="mt-2 text-sm !text-surface/50">{detail}</p>}
    </div>
  );
}