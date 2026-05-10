import Link from 'next/link';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import EquipoManager from '@/components/panel/EquipoManager';
import { getCurrentUser, isInmobiliariaMain } from '@/lib/auth';
import type { Agente } from '@/types/panel';
import type { CurrentUser } from '@/types/auth';
import PanelTabs from '@/components/panel/PanelTabs';

export const metadata = {
  title: 'Mi equipo · Panel | TandilUrban',
};

export const dynamic = 'force-dynamic';

export default async function EquipoPage() {
  const user: CurrentUser | null = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/panel/equipo');

  if (!isInmobiliariaMain(user) || !user.inmobiliariaPerfil) {
    return (
      <main className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8">
        <PanelTabs showEquipo={false} />
        <div className="mt-12 rounded-2xl border border-surface/10 bg-surface/5 p-10 text-center backdrop-blur">
          <h1 className="text-2xl font-semibold text-white">Acceso restringido</h1>
          <p className="mt-3 text-sm text-surface/65">
            Esta sección está disponible solo para el administrador principal de una inmobiliaria.
          </p>
          <Link
            href="/panel"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-surface/15 bg-surface/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-surface/80 transition hover:border-naranja/60 hover:bg-naranja/15 hover:text-surface"
          >
            ← Volver al panel
          </Link>
        </div>
      </main>
    );
  }

  // Lista inicial de agentes (server-side) — la UI client la usa como hidratación.
  const agentesRaw = await prisma.user.findMany({
    where: {
      agenciaId: user.inmobiliariaPerfil.id,
      rol: 'AGENTE',
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const agentes: Agente[] = agentesRaw.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    email: a.email,
    rol: a.rol,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 md:px-8">
      <PanelTabs showEquipo />

      <header className="mt-6 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-naranja-light">
          {user.inmobiliariaPerfil.nombreAgencia} · Administrador
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Mi equipo</h1>
        <p className="max-w-2xl text-sm text-surface/70 md:text-base">
          Sumá agentes a tu inmobiliaria. Cada uno accede con sus propias credenciales y opera
          dentro de esta agencia.
        </p>
      </header>

      <div className="mt-10">
        <EquipoManager agentes={agentes} />
      </div>
    </main>
  );
}
