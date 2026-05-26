import Link from 'next/link';
import { MapPin, Users } from 'lucide-react';

import type { InmobiliariaDirectoryItem } from '@/types/inmobiliaria-directory';

import { InmobiliariaAvatar } from './InmobiliariaAvatar';

type InmobiliariaCardProps = {
  inmobiliaria: InmobiliariaDirectoryItem;
  variant?: 'default' | 'featured';
};

export function InmobiliariaCard({ inmobiliaria, variant = 'default' }: InmobiliariaCardProps) {
  const href = `/inmobiliarias/${inmobiliaria.userId}`;
  const isFeatured = variant === 'featured';

  return (
    <Link
      href={href}
      className={
        isFeatured
          ? 'group relative flex flex-col overflow-hidden rounded-3xl border border-verde/15 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6 text-white shadow-xl transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-8 sm:p-8'
          : 'group flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-all hover:border-verde/25 hover:shadow-md sm:p-8'
      }
    >
      {isFeatured ? (
        <span className="absolute right-4 top-4 rounded-full bg-naranja px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Destacada
        </span>
      ) : null}

      <InmobiliariaAvatar
        imageUrl={inmobiliaria.avatarUrl}
        alt={inmobiliaria.nombreAgencia}
        size={isFeatured ? 'xl' : 'lg'}
        className={isFeatured ? 'mx-auto sm:mx-0' : ''}
      />

      <div className={`mt-5 min-w-0 flex-1 ${isFeatured ? 'text-center sm:text-left' : ''}`}>
        <p
          className={
            isFeatured
              ? 'text-xs font-bold uppercase tracking-[0.2em] text-emerald-200/90'
              : 'text-xs font-bold uppercase tracking-[0.18em] text-verde'
          }
        >
          Inmobiliaria
        </p>
        <h3
          className={
            isFeatured
              ? 'mt-2 text-2xl font-bold tracking-tight sm:text-3xl'
              : 'mt-2 text-xl font-bold text-gray-900'
          }
        >
          {inmobiliaria.nombreAgencia}
        </h3>
        {inmobiliaria.bio ? (
          <p
            className={
              isFeatured
                ? 'mt-3 line-clamp-3 text-sm leading-relaxed text-emerald-50/90'
                : 'mt-3 line-clamp-2 text-sm leading-relaxed text-gray-600'
            }
          >
            {inmobiliaria.bio}
          </p>
        ) : null}

        <div
          className={
            isFeatured
              ? 'mt-4 flex flex-col gap-2 text-sm text-emerald-100/90 sm:flex-row sm:flex-wrap sm:gap-4'
              : 'mt-4 flex flex-col gap-2 text-sm text-gray-500'
          }
        >
          <span className="inline-flex items-center justify-center gap-1.5 sm:justify-start">
            <MapPin className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            {inmobiliaria.direccion}
          </span>
          <span className="inline-flex items-center justify-center gap-1.5 sm:justify-start">
            <Users className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            {inmobiliaria.agentesCount === 1
              ? '1 agente'
              : `${inmobiliaria.agentesCount} agentes`}
          </span>
        </div>

        <p
          className={
            isFeatured
              ? 'mt-6 text-sm font-semibold text-naranja-light group-hover:underline'
              : 'mt-5 text-sm font-semibold text-verde group-hover:text-verde-hover'
          }
        >
          Ver perfil →
        </p>
      </div>
    </Link>
  );
}
