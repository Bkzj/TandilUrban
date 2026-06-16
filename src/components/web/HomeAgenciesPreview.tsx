import Link from 'next/link';
import Image from 'next/image';

import type { InmobiliariaDirectoryItem } from '@/types/inmobiliaria-directory';

type Props = {
  inmobiliarias: InmobiliariaDirectoryItem[];
};

function AgencyPreviewCard({ agencia }: { agencia: InmobiliariaDirectoryItem }) {
  const logoUrl = agencia.avatarUrl?.trim();

  return (
    <Link
      href={`/inmobiliarias/${agencia.userId}`}
      className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      {logoUrl ? (
        <div className="relative mb-4 h-16 w-16 overflow-hidden rounded-full bg-gray-100">
          <Image src={logoUrl} alt="" fill sizes="64px" className="object-cover" />
        </div>
      ) : (
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-400"
          aria-hidden
        >
          {agencia.nombreAgencia.charAt(0).toUpperCase()}
        </div>
      )}

      <h3 className="text-center text-sm font-bold text-gray-900">{agencia.nombreAgencia}</h3>
      <span className="mt-3 text-xs font-medium text-gray-500 transition-colors group-hover:text-gray-700">
        Ver propiedades →
      </span>
    </Link>
  );
}

export function HomeAgenciesPreview({ inmobiliarias }: Props) {
  if (inmobiliarias.length === 0) return null;

  return (
    <section className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-4">
        <header className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Red de Profesionales</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600">
            Las mejores inmobiliarias de Tandil confían en nuestra tecnología.
          </p>
        </header>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {inmobiliarias.map((agencia) => (
            <AgencyPreviewCard key={agencia.userId} agencia={agencia} />
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/inmobiliarias"
            className="text-sm font-semibold text-gray-700 transition-colors hover:text-gray-900"
          >
            Ver directorio completo →
          </Link>
        </div>
      </div>
    </section>
  );
}
