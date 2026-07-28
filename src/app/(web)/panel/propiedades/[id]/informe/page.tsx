import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RolUsuario, type Prisma } from '@prisma/client';

import { PropiedadInformePrintButton } from '@/components/panel/PropiedadInformePrintButton';
import { getCurrentUser, roleCanAccessPanel } from '@/lib/auth';
import { imagenesItemsToUrls, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { resolvePanelTenantInmobiliariaId } from '@/lib/panel-tenant';
import { prisma } from '@/lib/prisma';
import type { CurrentUser } from '@/types/auth';
import { decimalToMoneyText, formatMoneyAmount } from '@/lib/money';

export const metadata = {
  title: 'Informe de valoración | Propea Group',
};

export const dynamic = 'force-dynamic';

function formatPrecio(precio: Prisma.Decimal, moneda: string): string {
  return `${moneda} ${formatMoneyAmount(decimalToMoneyText(precio))}`;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadInformePage({ params }: PageProps) {
  const { id } = await params;
  const user: CurrentUser | null = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/panel/propiedades/${id}/informe`);
  if (!roleCanAccessPanel(user.rol)) redirect('/?error=unauthorized');

  const tenantInmobiliariaId = resolvePanelTenantInmobiliariaId(user);
  if (!tenantInmobiliariaId) notFound();

  const where: { id: string; inmobiliariaId: string; agenteId?: string } = {
    id,
    inmobiliariaId: tenantInmobiliariaId,
  };
  if (user.rol === RolUsuario.AGENTE) {
    where.agenteId = user.id;
  }

  const prop = await prisma.propiedad.findFirst({
    where,
    include: {
      inmobiliaria: { select: { nombreAgencia: true } },
      agente: { select: { nombre: true, telefono: true, email: true } },
    },
  });

  if (!prop) notFound();

  const imagenes = imagenesItemsToUrls(normalizePropiedadImagenesDb(prop.imagenes));
  const fotoPrincipal = imagenes[0] ?? null;
  const agenteNombre = prop.agente?.nombre ?? user.nombre;
  const agenteTelefono = prop.agente?.telefono ?? user.telefono ?? '—';
  const ubicacion = [prop.direccion, prop.barrio].filter(Boolean).join(' · ');
  const hoy = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date());

  return (
    <div className="print:m-0 print:bg-white print:p-0">
      <div className="print:hidden border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link
            href="/panel/propiedades"
            className="text-sm font-semibold text-naranja-light transition hover:text-white"
          >
            ← Volver a propiedades
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/panel/propiedades/${prop.id}/informe-total`}
              className="text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white"
            >
              Informe integral
            </Link>
            <Link
              href={`/panel/propiedades/editar/${prop.id}`}
              className="text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white"
            >
              Editar ficha
            </Link>
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-[210mm] bg-white px-6 py-10 text-gray-900 shadow-xl print:max-w-none print:px-0 print:py-0 print:shadow-none md:px-12 md:py-12">
        <header className="flex items-start justify-between gap-6 border-b border-gray-200 pb-6 print:pb-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-naranja text-sm font-bold uppercase tracking-widest text-white"
            >
              PG
            </span>
            <div>
              <p className="font-serif text-xl font-bold uppercase tracking-[0.2em] text-gray-900">
                Propea Group
              </p>
              <p className="text-xs text-gray-500">{prop.inmobiliaria.nombreAgencia}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-semibold text-gray-900">Informe de Valoración Comercial</h1>
            <p className="mt-1 text-xs text-gray-500">{hoy}</p>
          </div>
        </header>

        {fotoPrincipal ? (
          <div className="relative mt-8 aspect-[16/10] w-full overflow-hidden rounded-lg bg-gray-100 print:mt-6 print:rounded-none">
            <Image
              src={fotoPrincipal}
              alt={prop.titulo}
              fill
              className="object-cover"
              sizes="(max-width: 210mm) 100vw"
              priority
            />
          </div>
        ) : (
          <div className="mt-8 flex aspect-[16/10] items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400 print:mt-6">
            Sin imagen principal
          </div>
        )}

        <section className="mt-8 print:mt-6">
          <h2 className="text-2xl font-bold text-gray-900">{prop.titulo}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {prop.tipo} · {prop.operacion}
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 print:mt-6">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Ficha técnica</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-800">
              <li>
                <span className="text-gray-500">Superficie total:</span>{' '}
                <strong>{prop.m2Total} m²</strong>
              </li>
              <li>
                <span className="text-gray-500">Superficie cubierta:</span>{' '}
                <strong>{prop.m2Cubiertos} m²</strong>
              </li>
              <li>
                <span className="text-gray-500">Ambientes:</span> <strong>{prop.ambientes}</strong>
              </li>
              <li>
                <span className="text-gray-500">Dormitorios:</span>{' '}
                <strong>{prop.dormitorios}</strong>
              </li>
              <li>
                <span className="text-gray-500">Baños:</span> <strong>{prop.banos}</strong>
              </li>
              <li>
                <span className="text-gray-500">Cocheras:</span> <strong>{prop.cocheras}</strong>
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Ubicación</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-800">{ubicacion || '—'}</p>
            <p className="mt-2 text-xs text-gray-500">
              Coordenadas: {prop.latitud.toFixed(5)}, {prop.longitud.toFixed(5)}
            </p>
          </div>
        </section>

        {prop.caracteristicas.length > 0 ? (
          <section className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Características</h3>
            <p className="mt-2 text-sm text-gray-800">{prop.caracteristicas.join(' · ')}</p>
          </section>
        ) : null}

        <section className="mt-8 rounded-lg border-2 border-naranja/30 bg-naranja/5 p-6 print:mt-6 print:break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider text-naranja">Valoración de mercado</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatPrecio(prop.precio, prop.moneda)}</p>
          {prop.expensas != null && prop.expensas.gt(0) ? (
            <p className="mt-1 text-sm text-gray-600">
              Expensas: {formatPrecio(prop.expensas, prop.moneda)}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-gray-500">
            Precio de publicación vigente al {hoy}. Sujeto a condiciones de mercado.
          </p>
        </section>

        {prop.descripcion ? (
          <section className="mt-8 print:mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Descripción</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {prop.descripcion}
            </p>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-gray-200 pt-6 print:mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Agente responsable</h3>
          <p className="mt-2 text-base font-semibold text-gray-900">{agenteNombre}</p>
          <p className="text-sm text-gray-700">Tel: {agenteTelefono}</p>
          {prop.agente?.email ? (
            <p className="text-sm text-gray-600">{prop.agente.email}</p>
          ) : null}
        </footer>
      </article>

      <PropiedadInformePrintButton
        propiedadId={prop.id}
        variant="valoracion"
        filename={`informe-valoracion-${prop.id.slice(-8).toUpperCase()}.pdf`}
      />
    </div>
  );
}
