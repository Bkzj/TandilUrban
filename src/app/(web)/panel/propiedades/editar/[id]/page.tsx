import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RolUsuario } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { resolvePanelTenantInmobiliariaId } from '@/lib/panel-tenant';
import { getCurrentUser } from '@/lib/auth';
import type { CurrentUser } from '@/types/auth';
import type { PropertyFormData } from '@/types/panel';
import LinearPropertyForm from '@/components/panel/LinearPropertyForm';

export const metadata = {
  title: 'Editar propiedad | TandilUrban',
};

export const dynamic = 'force-dynamic';

function mapToFormData(
  prop: {
    id: string;
    operacion: string;
    tipo: string;
    direccion: string;
    barrio: string | null;
    latitud: number;
    longitud: number;
    m2Total: number;
    m2Cubiertos: number;
    ambientes: number;
    dormitorios: number;
    banos: number;
    cocheras: number;
    moneda: string;
    precio: number;
    expensas: number | null;
    caracteristicas: string[];
    imagenes: string[];
    titulo: string;
    descripcion: string;
  }
): Partial<PropertyFormData> & { id: string } {
  const moneda: PropertyFormData['moneda'] =
    prop.moneda === 'ARS' || prop.moneda === 'USD' ? prop.moneda : 'USD';
  const operacion: PropertyFormData['operacion'] =
    prop.operacion === 'VENTA' || prop.operacion === 'ALQUILER' ? prop.operacion : 'VENTA';

  const tipoRaw = prop.tipo;
  const tipos: PropertyFormData['tipo'][] = [
    'Casa',
    'Departamento',
    'Lote',
    'Local',
    'Oficina',
  ];
  const tipo = tipos.includes(tipoRaw as PropertyFormData['tipo'])
    ? (tipoRaw as PropertyFormData['tipo'])
    : 'Casa';

  return {
    id: prop.id,
    operacion,
    tipo,
    direccion: prop.direccion,
    barrio: prop.barrio ?? '',
    lat: prop.latitud,
    lng: prop.longitud,
    m2Total: String(prop.m2Total),
    m2Cubiertos: prop.m2Cubiertos != null ? String(prop.m2Cubiertos) : '',
    ambientes: String(prop.ambientes),
    dormitorios: prop.dormitorios,
    banos: prop.banos,
    cocheras: prop.cocheras,
    moneda,
    precio: String(prop.precio),
    expensas: prop.expensas != null ? String(prop.expensas) : '',
    caracteristicas: [...prop.caracteristicas],
    imagenes: [...prop.imagenes],
    titulo: prop.titulo,
    descripcion: prop.descripcion,
  };
}

export default async function EditarPropiedadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user: CurrentUser | null = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/panel/propiedades/editar/${id}`);

  const tenantInmobiliariaId = resolvePanelTenantInmobiliariaId(user);
  if (!tenantInmobiliariaId) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-text-primary via-naranja-dark/80 to-verde-dark/50 px-6 py-10 text-white md:px-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-naranja/30 bg-surface/5 p-8">
          <p className="text-naranja-light">No tenés una inmobiliaria asignada.</p>
          <Link
            href="/panel"
            className="mt-4 inline-block text-sm font-semibold text-verde hover:text-verde-hover"
          >
            Volver al panel
          </Link>
        </div>
      </main>
    );
  }

  const where: { id: string; inmobiliariaId: string; agenteId?: string } = {
    id,
    inmobiliariaId: tenantInmobiliariaId,
  };
  if (user.rol === RolUsuario.AGENTE) {
    where.agenteId = user.id;
  }

  const prop = await prisma.propiedad.findFirst({
    where,
  });

  if (!prop) notFound();

  const initialData = mapToFormData(prop);

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-text-primary via-naranja-dark/80 to-verde-dark/50 px-6 py-10 text-white md:px-8">
      <div className="border-b border-naranja/25 bg-surface/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-4">
          <Link
            href="/panel"
            className="inline-flex items-center gap-2 rounded-lg border border-naranja px-4 py-2 text-sm font-semibold text-naranja transition-colors hover:border-verde/60 hover:bg-verde/15 hover:text-white"
          >
            ← Volver al panel
          </Link>
          <span className="rounded-md bg-verde px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Modo Edición
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-b border-naranja/15 pb-2 pt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-naranja md:text-4xl">
          Editar propiedad
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-light text-white/80">
          Actualizá ubicación, características, fotos y textos. Acentos{' '}
          <span className="font-semibold text-naranja">naranja</span> · éxito{' '}
          <span className="font-semibold text-verde">verde</span>.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <LinearPropertyForm initialData={initialData} />
      </div>
    </main>
  );
}
