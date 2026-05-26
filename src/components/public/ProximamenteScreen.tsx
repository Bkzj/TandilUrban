import Link from 'next/link';

import Navbar from '@/components/Navbar';

type ProximamenteScreenProps = {
  title: string;
  description?: string;
};

export function ProximamenteScreen({ title, description }: ProximamenteScreenProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-verde">Próximamente</p>
        <h1 className="mt-4 text-3xl font-extrabold text-gray-900 md:text-4xl">{title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600">
          {description ?? 'Estamos preparando esta sección. Volvé pronto para descubrir más.'}
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-verde px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-verde-hover"
          >
            Volver al inicio
          </Link>
          <Link
            href="/buscar"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-verde transition-colors hover:bg-gray-50"
          >
            Buscar propiedades
          </Link>
        </div>
      </main>
    </div>
  );
}
