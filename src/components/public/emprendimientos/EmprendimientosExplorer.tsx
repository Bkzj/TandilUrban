'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Store, TrendingUp } from 'lucide-react';

import { EMPRENDIMIENTO_CATEGORIA_META } from '@/constants/emprendimientos';
import { EmprendimientoEditorialCard } from '@/components/public/emprendimientos/EmprendimientoEditorialCard';
import { EmprendimientosSpotlight } from '@/components/public/emprendimientos/EmprendimientosSpotlight';
import { EmprendimientoPropiedadCard } from '@/components/public/emprendimientos/EmprendimientoPropiedadCard';
import type {
  EmprendimientoCategoria,
  EmprendimientoEditorial,
  EmprendimientoFiltro,
  EmprendimientosPageData,
} from '@/types/emprendimientos';
import type { PublicPropiedadListItem } from '@/types/public-search';

const FILTROS: { id: EmprendimientoFiltro; label: string; icon: typeof Building2 }[] = [
  { id: 'todos', label: 'Todo', icon: TrendingUp },
  { id: 'pozo', label: 'En pozo', icon: Building2 },
  { id: 'local', label: 'Locales', icon: Store },
  { id: 'franquicia', label: 'Franquicias', icon: Store },
];

type Props = {
  data: EmprendimientosPageData;
  favoritoIds: string[];
};

function filterEditoriales(
  items: EmprendimientoEditorial[],
  filtro: EmprendimientoFiltro,
): EmprendimientoEditorial[] {
  if (filtro === 'todos') return items;
  return items.filter((i) => i.categoria === filtro);
}

function showPropiedadesPozo(filtro: EmprendimientoFiltro) {
  return filtro === 'todos' || filtro === 'pozo';
}

function showPropiedadesLocal(filtro: EmprendimientoFiltro) {
  return filtro === 'todos' || filtro === 'local';
}

function PropiedadesGrid({
  propiedades,
  favoritoSet,
  badge,
}: {
  propiedades: PublicPropiedadListItem[];
  favoritoSet: Set<string>;
  badge: string;
}) {
  if (propiedades.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {propiedades.map((p) => (
        <EmprendimientoPropiedadCard
          key={p.id}
          propiedad={p}
          isFavoritoInicial={favoritoSet.has(p.id)}
          badge={badge}
        />
      ))}
    </div>
  );
}

export function EmprendimientosExplorer({ data, favoritoIds }: Props) {
  const [filtro, setFiltro] = useState<EmprendimientoFiltro>('todos');
  const favoritoSet = useMemo(() => new Set(favoritoIds), [favoritoIds]);

  const editoriales = useMemo(
    () => filterEditoriales(data.editoriales, filtro),
    [data.editoriales, filtro],
  );

  const spotlight =
    data.editoriales.find((e) => e.destacado && e.categoria === 'pozo') ??
    data.editoriales.find((e) => e.destacado) ??
    data.editoriales[0];

  const sideCards = useMemo(() => {
    const pool = data.editoriales.filter((e) => e.id !== spotlight?.id);
    const franquicia =
      pool.find((e) => e.categoria === 'franquicia' && e.destacado) ??
      pool.find((e) => e.categoria === 'franquicia');
    const local =
      pool.find((e) => e.categoria === 'local' && e.destacado) ??
      pool.find((e) => e.categoria === 'local');
    const picked = [franquicia, local].filter(Boolean) as EmprendimientoEditorial[];
    for (const item of pool) {
      if (picked.length >= 2) break;
      if (!picked.some((p) => p.id === item.id)) picked.push(item);
    }
    return picked.slice(0, 2);
  }, [data.editoriales, spotlight?.id]);

  const spotlightHighlights = useMemo(() => {
    const ids = new Set([spotlight?.id, ...sideCards.map((c) => c.id)].filter(Boolean));
    return data.editoriales.filter((e) => !ids.has(e.id)).slice(0, 4);
  }, [data.editoriales, sideCards, spotlight?.id]);

  const editorialesPozoAll = editoriales.filter((e) => e.categoria === 'pozo');
  const editorialesPozo =
    filtro === 'todos'
      ? editorialesPozoAll.filter((e) => e.id !== spotlight?.id)
      : editorialesPozoAll;
  const editorialesLocal = editoriales.filter((e) => e.categoria === 'local');
  const editorialesFranquicia = editoriales.filter((e) => e.categoria === 'franquicia');

  const showSpotlight = filtro === 'todos' && spotlight;
  const totalVisible =
    editoriales.length +
    (showPropiedadesPozo(filtro) ? data.proyectosPozo.length : 0) +
    (showPropiedadesLocal(filtro) ? data.localesComerciales.length : 0);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-verde/10 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-2 px-4 py-3 sm:px-6">
          {FILTROS.map(({ id, label, icon: Icon }) => {
            const active = filtro === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-verde text-white shadow-sm'
                    : 'bg-white text-text-secondary ring-1 ring-black/5 hover:text-verde hover:ring-verde/20'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {showSpotlight ? (
        <EmprendimientosSpotlight
          spotlight={spotlight}
          highlights={[...sideCards, ...spotlightHighlights]}
          propiedades={data.proyectosPozo}
        />
      ) : null}

      {totalVisible === 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-dashed border-verde/25 bg-verde-light/30 px-6 py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-verde/60" aria-hidden />
            <p className="mt-4 text-lg font-semibold text-text-primary">
              No hay contenido en esta categoría
            </p>
            <p className="mx-auto mt-2 max-w-md text-text-secondary">
              Probá otro filtro o explorá todas las oportunidades del portal.
            </p>
            <button
              type="button"
              onClick={() => setFiltro('todos')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-verde px-6 py-3 text-sm font-semibold text-white transition hover:bg-verde-hover"
            >
              Ver todo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </section>
      ) : (
        <>
          {(filtro === 'todos' || filtro === 'pozo') &&
          (editorialesPozo.length > 0 || data.proyectosPozo.length > 0) ? (
            <SectionBlock categoria="pozo" editoriales={editorialesPozo}>
              {showPropiedadesPozo(filtro) && data.proyectosPozo.length > 0 ? (
                <>
                  <p className="mb-6 text-sm font-medium text-text-secondary">
                    Unidades publicadas en el portal con ficha completa, fotos y contacto directo.
                  </p>
                  <PropiedadesGrid
                    propiedades={data.proyectosPozo}
                    favoritoSet={favoritoSet}
                    badge="En pozo"
                  />
                </>
              ) : null}
            </SectionBlock>
          ) : null}

          {(filtro === 'todos' || filtro === 'local') &&
          (editorialesLocal.length > 0 || data.localesComerciales.length > 0) ? (
            <SectionBlock categoria="local" editoriales={editorialesLocal}>
              {showPropiedadesLocal(filtro) && data.localesComerciales.length > 0 ? (
                <>
                  <p className="mb-6 text-sm font-medium text-text-secondary">
                    Locales y oficinas disponibles en la red Propea Group.
                  </p>
                  <PropiedadesGrid
                    propiedades={data.localesComerciales}
                    favoritoSet={favoritoSet}
                    badge="Local comercial"
                  />
                </>
              ) : null}
            </SectionBlock>
          ) : null}

          {(filtro === 'todos' || filtro === 'franquicia') && editorialesFranquicia.length > 0 ? (
            <SectionBlock categoria="franquicia" editoriales={editorialesFranquicia} />
          ) : null}
        </>
      )}

      <section className="border-t border-verde/10 bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6 sm:py-16 lg:flex-row lg:text-left">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/90">
              Sumá tu emprendimiento
            </p>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              ¿Tenés un proyecto, local o franquicia para promocionar?
            </h2>
            <p className="mt-3 max-w-xl text-emerald-50/85">
              Publicá en la vidriera de emprendimientos de Propea Group y llegá a compradores,
              inversores y emprendedores de Tandil.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/para-inmobiliarias"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50"
            >
              Soy inmobiliaria
            </Link>
            <Link
              href="mailto:contacto@propeagroup.com?subject=Publicar%20en%20Emprendimientos"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Contactar al equipo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionBlock({
  categoria,
  editoriales,
  children,
}: {
  categoria: EmprendimientoCategoria;
  editoriales: EmprendimientoEditorial[];
  children?: ReactNode;
}) {
  const meta = EMPRENDIMIENTO_CATEGORIA_META[categoria];

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-2 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-verde">Catálogo</p>
            <h2 className="mt-2 text-2xl font-extrabold text-text-primary sm:text-3xl">
              {meta.navLabel}
            </h2>
            <p className="mt-2 max-w-2xl text-text-secondary">{meta.descripcion}</p>
          </div>
        </div>

        {editoriales.length > 0 ? (
          <div
            className={`grid gap-6 ${
              editoriales.length === 1
                ? 'grid-cols-1'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            } ${children ? 'mb-10' : ''}`}
          >
            {editoriales.map((item) => (
              <EmprendimientoEditorialCard key={item.id} item={item} />
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </section>
  );
}
