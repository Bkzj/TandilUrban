import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RolUsuario } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import { decimalToMoneyText, divideMoney } from '@/lib/money';
import { resolvePanelTenantInmobiliariaId } from '@/lib/panel-tenant';
import { getCurrentUser, isInmobiliariaMain, roleCanAccessPanel } from '@/lib/auth';
import type { CurrentUser } from '@/types/auth';
import type { PanelPropiedadTableRow } from '@/types/panel';
import PanelTabs from '@/components/panel/PanelTabs';
import { PropertiesClientTable } from '@/components/panel/PropertiesClientTable';
import { panelBtnGhost, panelGlassEmpty } from '@/components/panel/panel-theme';

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
      m2Total: true,
      visitas: true,
      consultas: true,
      estado: true,
      createdAt: true,
      _count: { select: { favoritadosPor: true } },
      contactos: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          visitasFisicas: true,
          createdAt: true,
        },
      },
      visitasFisicasEventos: {
        where: { delta: 1 },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          createdAt: true,
          contacto: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
            },
          },
        },
      },
    },
  });

  const propiedades: PanelPropiedadTableRow[] = rows.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    imagenes: normalizePropiedadImagenesDb(p.imagenes),
    operacion: p.operacion,
    tipo: p.tipo,
    precio: decimalToMoneyText(p.precio),
    moneda: p.moneda,
    valorM2: divideMoney(p.precio, p.m2Total),
    m2Total: p.m2Total,
    visitas: p.visitas,
    consultas: p.consultas,
    favoritosCount: p._count.favoritadosPor,
    visitasFisicas: p.contactos.reduce((sum, c) => sum + c.visitasFisicas, 0),
    consultasPropiedad: p.contactos.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      visitasFisicas: c.visitasFisicas,
      createdAt: c.createdAt.toISOString(),
    })),
    visitantesPresenciales: p.visitasFisicasEventos.map((ev) => ({
      id: ev.id,
      contactoId: ev.contacto.id,
      nombre: ev.contacto.nombre,
      email: ev.contacto.email,
      telefono: ev.contacto.telefono,
      fechaVisita: ev.createdAt.toISOString(),
    })),
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
