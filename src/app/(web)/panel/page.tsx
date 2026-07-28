import { redirect } from 'next/navigation';

import { AnalyticsFunnel } from '@/components/panel/AnalyticsFunnel';
import { PricePerSqmChart } from '@/components/panel/PricePerSqmChart';
import { StatCards } from '@/components/panel/StatCards';
import { TopProperties } from '@/components/panel/TopProperties';
import PanelTabs from '@/components/panel/PanelTabs';
import { panelGlassCardPadded as GLASS_CARD } from '@/components/panel/panel-theme';
import { AuthError, isInmobiliariaMain } from '@/lib/auth';
import { getPanelAnalytics } from '@/lib/panel-analytics';
import { requirePanelTenant } from '@/lib/panel-authorization';

export const dynamic = 'force-dynamic';

type PanelPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function PanelPage({ searchParams }: PanelPageProps) {
  const context = await requirePanelTenant().catch((error: unknown) => {
    if (error instanceof AuthError && error.status === 401) {
      redirect('/login?callbackUrl=/panel');
    }
    redirect('/?error=unauthorized');
  });
  const user = context.user;

  const sp = await Promise.resolve(searchParams ?? {});
  const publishedFlag = Array.isArray(sp.published) ? sp.published[0] : sp.published;
  const justPublished = publishedFlag === '1';

  const canManageTeam = isInmobiliariaMain(user);
  const isAgente = user.rol !== 'INMOBILIARIA' && user.rol !== 'ADMIN';
  const rolDisplay = canManageTeam ? 'Administrador' : isAgente ? 'Cuenta' : user.rol;
  const nombre = user.nombre.split(' ')[0];

  const analytics = await getPanelAnalytics(context);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PanelTabs showEquipo={canManageTeam} />

      {justPublished ? (
        <div
          className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-medium text-white backdrop-blur-lg shadow-lg shadow-black/20"
          role="status"
        >
          Propiedad publicada con éxito.
        </div>
      ) : null}

      <header className="mt-8 flex flex-col">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-naranja-light/80">
          Agencia · {rolDisplay}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Hola, {nombre}
        </h1>
        <p className="mt-2 text-lg font-light text-white/75">
          Métricas medidas de tu cartera durante los últimos 30 días.
        </p>
      </header>

      {analytics ? (
        <div className="mt-12 flex flex-col gap-6 lg:gap-8">
          <StatCards stats={analytics.stats} />

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            <div className={`${GLASS_CARD} lg:col-span-2`}>
              <div className="mb-6 border-b border-white/10 pb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Analytics
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Actividad medida
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Visualizaciones calificadas y consultas recibidas en el mismo período.
                </p>
              </div>
              <AnalyticsFunnel data={analytics.funnel} />
            </div>

            <PricePerSqmChart data={analytics.precioM2PorMoneda} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3">
            <TopProperties topPropiedades={analytics.topPropiedades} />
          </section>
        </div>
      ) : (
        <div className={`mt-12 text-center ${GLASS_CARD}`}>
          <p className="text-sm text-gray-400">
            Vinculá tu cuenta a una inmobiliaria para ver estadísticas de la agencia.
          </p>
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <a
          href="/panel/propiedades/nueva"
          className={`group flex flex-col justify-between ${GLASS_CARD} p-7 transition-all hover:border-naranja/40 hover:bg-white/10`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-naranja-light/90">
              Onboarding
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Publicar propiedad</h2>
            <p className="mt-2 text-sm text-gray-400">
              Flujo lineal y guiado para subir una nueva propiedad en pocos pasos.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-transform group-hover:translate-x-0.5">
            Empezar →
          </span>
        </a>

        {canManageTeam ? (
          <a
            href="/panel/equipo"
            className={`group flex flex-col justify-between ${GLASS_CARD} p-7 transition-all hover:border-naranja/40 hover:bg-white/10`}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-naranja-light/90">B2B</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Mi equipo</h2>
              <p className="mt-2 text-sm text-gray-400">
                Sumá agentes para que carguen propiedades en nombre de tu inmobiliaria.
              </p>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-transform group-hover:translate-x-0.5">
              Gestionar agentes →
            </span>
          </a>
        ) : (
          <a
            href="/panel/mensajes"
            className={`group flex flex-col justify-between ${GLASS_CARD} p-7 transition-all hover:border-naranja/40 hover:bg-white/10`}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-naranja-light/90">
                Leads
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Mensajes</h2>
              <p className="mt-2 text-sm text-gray-400">
                Bandeja de consultas y seguimiento con interesados.
              </p>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-transform group-hover:translate-x-0.5">
              Ver bandeja →
            </span>
          </a>
        )}
      </div>
    </main>
  );
}
