import { redirect } from 'next/navigation';

import { getCurrentUser, isInmobiliariaMain, type CurrentUser } from '@/lib/auth';
import PanelTabs from '@/components/panel/PanelTabs';
import MetricCard from '@/components/panel/MetricCard';

export const dynamic = 'force-dynamic';

export default async function PanelPage() {
  const user: CurrentUser | null = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/panel');

  const canManageTeam = isInmobiliariaMain(user);
  const isAgente = user.rol !== 'INMOBILIARIA' && user.rol !== 'ADMIN';
  const rolDisplay = canManageTeam ? 'Administrador' : isAgente ? 'Cuenta' : user.rol;
  const nombre = user.nombre.split(' ')[0];

  const labelActivas = canManageTeam ? 'Propiedades activas' : 'Mis propiedades activas';
  const labelConsultas = canManageTeam ? 'Consultas nuevas' : 'Mis consultas nuevas';
  const detailActivas = 'DISPONIBLE en la red pública · ▲ +3';
  const detailConsultas = 'Últimos 7 días · ▲ +2';
  const detailVisitas = 'Mes en curso · ▲ +14%';
  const detailConversion = 'Consultas / vistas · ▼ −0.3%';

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8">
      <PanelTabs showEquipo={canManageTeam} />

      <header className="mt-8 flex flex-col">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest !text-naranja-light/80">
          Agencia · {rolDisplay}
        </p>
        <h1 className="text-5xl font-semibold tracking-tight !text-white">Hola, {nombre}</h1>
        <p className="mt-2 text-lg font-light !text-white">Estado actual de la inmobiliaria...</p>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={labelActivas} value="12" detail={detailActivas} />
        <MetricCard label={labelConsultas} value="5" detail={detailConsultas} />
        <MetricCard label="Visitas al perfil" value="340" detail={detailVisitas} />
        <MetricCard label="Conversion rate" value="4.2%" detail={detailConversion} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <a
          href="/panel/propiedades/nueva"
          className="group flex flex-col justify-between rounded-2xl border border-surface/10 !bg-black/20 p-7 backdrop-blur-md transition-all duration-300 !hover:border-naranja/40 !hover:bg-black/30"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest !text-naranja-light/80">Onboarding</p>
            <h2 className="mt-3 text-2xl font-semibold !text-white">Publicar propiedad</h2>
            <p className="mt-2 text-sm !text-white/80">
              Flujo lineal y guiado para subir una nueva propiedad en pocos pasos.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold !text-white transition-transform group-hover:translate-x-0.5">
            Empezar →
          </span>
        </a>

        {canManageTeam ? (
          <a
            href="/panel/equipo"
            className="group flex flex-col justify-between rounded-2xl border border-surface/10 !bg-black/20 p-7 backdrop-blur-md transition-all duration-300 !hover:border-naranja/40 !hover:bg-black/30"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest !text-naranja-light/80">B2B</p>
              <h2 className="mt-3 text-2xl font-semibold !text-white">Mi equipo</h2>
              <p className="mt-2 text-sm !text-white/80">
                Sumá agentes para que carguen propiedades en nombre de tu inmobiliaria.
              </p>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold !text-white transition-transform group-hover:translate-x-0.5">
              Gestionar agentes →
            </span>
          </a>
        ) : null}

        <div className="flex flex-col justify-between rounded-2xl border border-dashed border-surface/10 !bg-black/20 p-7 backdrop-blur-md !text-surface/60">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest !text-surface/50">Próximamente</p>
            <h2 className="mt-3 text-2xl font-semibold !text-white">Leads · Mensajes</h2>
            <p className="mt-2 text-sm !text-surface/50">
              Bandeja unificada de consultas, asignación a agentes y métricas de respuesta.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-surface/45">
            En desarrollo
          </span>
        </div>
      </div>
    </main>
  );
}
