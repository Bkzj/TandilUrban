import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RolUsuario } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { resolvePanelTenantInmobiliariaId } from '@/lib/panel-tenant';
import { getCurrentUser, isInmobiliariaMain, roleCanAccessPanel } from '@/lib/auth';
import type { CurrentUser } from '@/types/auth';
import type { PanelPropiedadTableRow } from '@/types/panel';
import PanelTabs from '@/components/panel/PanelTabs';
import { PropertiesClientTable } from '@/components/panel/PropertiesClientTable';

export const metadata = {
  title: 'Administrar propiedades · Panel | Propea Group',
};

export const dynamic = 'force-dynamic';

export default async function PanelPropiedadesPage() {
  const user: CurrentUser | null = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/panel/propiedades');
  if (!roleCanAccessPanel(user.rol)) redirect('/?error=unauthorized');

  const canManageTeam = isInmobiliariaMain(user);
  const isAgente = user.rol === RolUsuario.AGENTE && Boolean(user.agenciaId);
  const tenantInmobiliariaId = resolvePanelTenantInmobiliariaId(user);

  if (!tenantInmobiliariaId) {
    return (
      <main className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8">
        <PanelTabs showEquipo={canManageTeam} />
        <div className="mt-12 rounded-2xl border border-surface/10 bg-surface/5 p-10 text-center backdrop-blur">
          <h1 className="text-2xl font-semibold !text-white">Acceso restringido</h1>
          <p className="mt-3 text-sm !text-white/65">
            Solo tienen permiso usuarios ligados a una inmobiliaria (administrador o agente).
          </p>
          <Link
            href="/panel"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-surface/15 bg-surface/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] !text-white/80 transition hover:border-naranja/60 hover:bg-naranja/15"
          >
            ← Volver al panel
          </Link>
        </div>
      </main>
    );
  }

  const whereTenant: { inmobiliariaId: string; agenteId?: string } = {
    inmobiliariaId: tenantInmobiliariaId,
  };

  if (isAgente) {
    whereTenant.agenteId = user.id;
  }

  const rows = await prisma.propiedad.findMany({
    where: whereTenant,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      titulo: true,
      imagenes: true,
      operacion: true,
      tipo: true,
      precio: true,
      moneda: true,
      visitas: true,
      consultas: true,
      estado: true,
      createdAt: true,
    },
  });

  const propiedades: PanelPropiedadTableRow[] = rows.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    imagenes: normalizePropiedadImagenesDb(p.imagenes),
    operacion: p.operacion,
    tipo: p.tipo,
    precio: p.precio,
    moneda: p.moneda,
    visitas: p.visitas,
    consultas: p.consultas,
    estado: p.estado,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8">
      <PanelTabs showEquipo={canManageTeam} />

      <header className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest !text-naranja-light/80">
            Inventario · Publicaciones
          </p>
          <h1 className="text-4xl font-semibold tracking-tight !text-white md:text-5xl">
            Administrar Propiedades
          </h1>
          <p className="mt-2 text-lg font-light !text-white/85">
            {canManageTeam
              ? 'Listado de la agencia con visitas, consultas y conversión.'
              : 'Tus publicaciones y métricas.'}
          </p>
        </div>
        <Link
          href="/panel/propiedades/nueva"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-naranja px-5 py-3 text-sm font-semibold text-surface shadow-lg shadow-naranja/30 transition hover:bg-naranja-hover"
        >
          <span aria-hidden>+</span>
          Nueva propiedad
        </Link>
      </header>

      <PropertiesClientTable propiedades={propiedades} />
    </main>
  );
}
