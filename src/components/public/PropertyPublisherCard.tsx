import Image from 'next/image';
import Link from 'next/link';
import { Building2, User } from 'lucide-react';

type PublisherAvatarProps = {
  imageUrl: string | null;
  fallback: 'user' | 'building';
  alt: string;
};

function PublisherAvatar({ imageUrl, fallback, alt }: PublisherAvatarProps) {
  if (imageUrl?.trim()) {
    return (
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-gray-100 shadow-sm ring-1 ring-gray-200 sm:h-16 sm:w-16">
        <Image src={imageUrl} alt={alt} fill className="object-cover" sizes="64px" />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 p-2.5 ring-1 ring-gray-200 sm:h-16 sm:w-16 sm:p-3">
      {fallback === 'user' ? (
        <User className="h-7 w-7 text-gray-400 sm:h-8 sm:w-8" aria-hidden />
      ) : (
        <Building2 className="h-7 w-7 text-gray-400 sm:h-8 sm:w-8" aria-hidden />
      )}
    </div>
  );
}

export type PropertyPublisherCardProps = {
  profileHref: string | null;
  agenciaNombre: string;
  contactoNombre: string;
  /** Logo de la inmobiliaria (logoUrl o logoAgencia). */
  logoUrl: string | null;
  /** Avatar del agente asignado, si existe. */
  agenteAvatarUrl: string | null;
  tieneAgente: boolean;
};

export function PropertyPublisherCard({
  profileHref,
  agenciaNombre,
  contactoNombre,
  logoUrl,
  agenteAvatarUrl,
  tieneAgente,
}: PropertyPublisherCardProps) {
  const avatarSrc = tieneAgente ? agenteAvatarUrl : logoUrl;
  const avatarFallback = tieneAgente ? 'user' : 'building';
  const avatarAlt = tieneAgente ? contactoNombre : agenciaNombre;

  const inner = (
    <div className="flex gap-4">
      <PublisherAvatar imageUrl={avatarSrc} fallback={avatarFallback} alt={avatarAlt} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Inmobiliaria</p>
        <p className="mt-1 text-xl font-extrabold leading-tight text-gray-900">{agenciaNombre}</p>
        {tieneAgente ? (
          <>
            <p className="mt-5 text-xs font-bold uppercase tracking-wide text-gray-500">
              Contacto comercial
            </p>
            <p className="mt-1 text-xl font-extrabold leading-tight text-gray-900">
              {contactoNombre}
            </p>
          </>
        ) : null}
        {profileHref ? (
          <p className="mt-4 text-sm font-semibold text-verde">Ver todas sus propiedades →</p>
        ) : null}
      </div>
    </div>
  );

  if (!profileHref) {
    return <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">{inner}</div>;
  }

  return (
    <Link
      href={profileHref}
      className="block rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:border-verde/20 hover:bg-verde-light/40"
    >
      {inner}
    </Link>
  );
}
