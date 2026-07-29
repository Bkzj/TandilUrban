'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { PanelPropiedadEstado, PanelPropiedadTableRow } from '@/types/panel';
import { formatMoney } from '@/lib/money-format';

import { panelGlassTable } from '@/components/panel/panel-theme';

import { EstadoSelector } from './EstadoSelector';
import { PropertyQuickView } from './PropertyQuickView';

const PLACEHOLDER_THUMB =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="#2a2a2a"/><path d="M16 32l8-10 6 6 4-4v6H16v2z" fill="#555"/></svg>`
  );

function formatConvRate(visitas: number, consultas: number): string {
  if (visitas <= 0) return '0.0%';
  return `${((consultas / visitas) * 100).toFixed(1)}%`;
}

type Props = {
  propiedades: PanelPropiedadTableRow[];
};

export function PropertiesClientTable({ propiedades: initialPropiedades }: Props) {
  const [propiedades, setPropiedades] = useState(initialPropiedades);
  const [selectedProp, setSelectedProp] = useState<PanelPropiedadTableRow | null>(null);

  const onEstadoChange = useCallback((id: string, estado: PanelPropiedadEstado) => {
    setPropiedades((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
    setSelectedProp((prev) => (prev?.id === id ? { ...prev, estado } : prev));
  }, []);

  const onPropiedadUpdate = useCallback((updated: PanelPropiedadTableRow) => {
    setPropiedades((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedProp(updated);
  }, []);

  return (
    <>
      <div className={`mt-10 w-full ${panelGlassTable}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm !text-white">
            <thead>
              <tr className="border-b border-white/10 !text-white/60">
                <th className="px-4 py-3 font-semibold">Propiedad</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Operación / Tipo</th>
                <th className="px-4 py-3 font-semibold">Precio</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Métricas</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {propiedades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center !text-white/60">
                    No hay propiedades para mostrar.{' '}
                    <Link
                      href="/panel/propiedades/nueva"
                      className="font-semibold !text-naranja-light underline underline-offset-2 hover:!text-white"
                    >
                      Publicar una nueva
                    </Link>
                  </td>
                </tr>
              ) : (
                propiedades.map((prop) => {
                  const thumb = prop.imagenes[0]?.url?.trim();
                  const visitas = prop.visitas ?? 0;
                  const consultas = prop.consultas ?? 0;
                  const conv = formatConvRate(visitas, consultas);

                  return (
                    <tr
                      key={prop.id}
                      onClick={() => setSelectedProp(prop)}
                      className="cursor-pointer border-b border-white/10 transition-colors hover:bg-white/5"
                    >
                      <td className="max-w-[14rem] px-4 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          {thumb && !thumb.startsWith('data:') ? (
                            <Image
                              src={thumb}
                              alt=""
                              width={44}
                              height={44}
                              className="h-11 w-11 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element -- placeholder SVG data URI
                            <img
                              src={PLACEHOLDER_THUMB}
                              alt=""
                              className="h-11 w-11 shrink-0 rounded-xl object-cover"
                            />
                          )}
                          <span className="line-clamp-2 font-medium !text-white">{prop.titulo}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 align-middle uppercase sm:table-cell !text-white/85">
                        {prop.operacion} · {prop.tipo}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle tabular-nums !text-white/90">
                        {formatMoney(prop.precio, prop.moneda)}
                      </td>
                      <td className="hidden px-4 py-3 align-middle md:table-cell !text-white/80">
                        <span className="block text-xs uppercase tracking-wide !text-white/50">
                          Visitas · Consultas · Conv.
                        </span>
                        <span className="font-medium !text-white">
                          {visitas} · {consultas} · {conv}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EstadoSelector
                          key={`${prop.id}-${prop.estado}`}
                          propiedadId={prop.id}
                          estadoActual={prop.estado}
                          onEstadoChange={(estado) => onEstadoChange(prop.id, estado)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProp ? (
        <PropertyQuickView
          propiedad={selectedProp}
          onClose={() => setSelectedProp(null)}
          onPropiedadUpdate={onPropiedadUpdate}
        />
      ) : null}
    </>
  );
}
