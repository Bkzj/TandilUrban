import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/** Bloque estático de OPORTUNIDADES — server component, sin animaciones de entrada. */
export function OportunidadesIntro() {
  return (
    <section
      id="oportunidades"
      className="bg-gray-50 px-4 py-12 sm:px-6 lg:p-12"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-4xl font-extrabold text-gray-900">OPORTUNIDADES</h2>
        <p className="mt-4 text-lg text-gray-600">
          Descubre las propiedades más exclusivas ingresadas esta semana.
        </p>
        <Link
          href="/buscar"
          className="mt-8 inline-flex items-center justify-center gap-2 text-base font-semibold uppercase tracking-wide text-verde transition-colors hover:text-verde-hover"
        >
          VER TODAS
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
