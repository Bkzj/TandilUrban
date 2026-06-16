import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RolUsuario } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { resolvePanelTenantInmobiliariaId } from '@/lib/panel-tenant';
import { getCurrentUser, isInmobiliariaMain, roleCanAccessPanel } from '@/lib/auth';
import type { CurrentUser } from '@/types/auth';
import type { PanelLeadEstado, PanelLeadRow } from '@/types/panel';
import PanelTabs from '@/components/panel/PanelTabs';
import { panelBtnGhost, panelGlassEmpty } from '@/components/panel/panel-theme';
import { LeadsTable } from '@/components/panel/LeadsTable';

export const metadata = {
  title: 'Mensajes · Panel | Propea Group',
};

export const dynamic = 'force-dynamic';

export default async function PanelMensajesPage() {
  const user: CurrentUser | null = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/panel/mensajes');
  if (!roleCanAccessPanel(user.rol)) redirect('/?error=unauthorized');

  const canManageTeam = isInmobiliariaMain(user);
  const isAgente = user.rol === RolUsuario.AGENTE && Boolean(user.agenciaId);
  const tenantInmobiliariaId = resolvePanelTenantInmobiliariaId(user);

  if (!tenantInmobiliariaId) {
    return (
      <main className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8">
        <PanelTabs showEquipo={canManageTeam} />
        <div className={`mt-12 ${panelGlassEmpty}`}>
          <h1 className="text-2xl font-semibold !text-white">Acceso restringido</h1>
          <p className="mt-3 text-sm !text-white/65">
            Solo tienen permiso usuarios ligados a una inmobiliaria (administrador o agente).
          </p>
          <Link href="/panel" className={`mt-6 ${panelBtnGhost}`}>
            ← Volver al panel
          </Link>
        </div>
      </main>
    );
  }

  const propiedadWhere: { inmobiliariaId: string; agenteId?: string } = {
    inmobiliariaId: tenantInmobiliariaId,
  };
  if (isAgente) {
    propiedadWhere.agenteId = user.id;
  }

  const rows = await prisma.contacto.findMany({
    where: { propiedad: propiedadWhere },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      mensaje: true,
      estado: true,
      visitasFisicas: true,
      createdAt: true,
      propiedad: {
        select: {
          id: true,
          titulo: true,
          imagenes: true,
          visitas: true,
          consultas: true,
        },
      },
    },
  });

  const leads: PanelLeadRow[] = rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    telefono: r.telefono,
    mensaje: r.mensaje,
    estado: r.estado as PanelLeadEstado,
    visitasFisicas: r.visitasFisicas,
    createdAt: r.createdAt.toISOString(),
    propiedad: {
      id: r.propiedad.id,
      titulo: r.propiedad.titulo,
      imagenes: normalizePropiedadImagenesDb(r.propiedad.imagenes),
      visitas: r.propiedad.visitas,
      consultas: r.propiedad.consultas,
    },
  }));

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8">
      <PanelTabs showEquipo={canManageTeam} />

      <header className="mt-8 flex flex-col">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest !text-naranja-light/80">
          Consultas · Leads
        </p>
        <h1 className="text-4xl font-semibold tracking-tight !text-white md:text-5xl">Mensajes</h1>
        <p className="mt-2 text-lg font-light !text-white/85">
          {canManageTeam
            ? 'Consultas recibidas sobre las publicaciones de tu agencia.'
            : 'Consultas sobre tus publicaciones.'}
        </p>
      </header>

      <LeadsTable leads={leads} />
    </main>
  );
}
