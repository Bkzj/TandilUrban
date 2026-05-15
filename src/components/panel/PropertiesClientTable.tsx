'use client';

import { useState } from 'react';
import Link from 'next/link';

import type { PanelPropiedadTableRow } from '@/types/panel';

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

export function PropertiesClientTable({ propiedades }: Props) {
  const [selectedProp, setSelectedProp] = useState<PanelPropiedadTableRow | null>(null);

  return (
    <>
      <div className="mt-10 w-full overflow-hidden rounded-2xl border !border-surface/10 !bg-black/20 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm !text-white">
            <thead>
              <tr className="border-b border-surface/10 !text-white/60">
                <th className="px-4 py-3 font-semibold">Propiedad</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Operación / Tipo</th>
                <th className="px-4 py-3 font-semibold">Precio</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Métricas</th>
              </tr>
            </thead>
            <tbody>
              {propiedades.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center !text-white/60">
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
                  const thumb = prop.imagenes[0]?.trim();
                  const visitas = prop.visitas ?? 0;
                  const consultas = prop.consultas ?? 0;
                  const conv = formatConvRate(visitas, consultas);

                  return (
                    <tr
                      key={prop.id}
                      onClick={() => setSelectedProp(prop)}
                      className="cursor-pointer border-b border-surface/10 transition-colors hover:!bg-surface/10"
                    >
                      <td className="max-w-[14rem] px-4 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <img
                            src={thumb || PLACEHOLDER_THUMB}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-lg object-cover"
                          />
                          <span className="line-clamp-2 font-medium !text-white">{prop.titulo}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 align-middle uppercase sm:table-cell !text-white/85">
                        {prop.operacion} · {prop.tipo}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle tabular-nums !text-white/90">
                        {prop.moneda} {prop.precio.toLocaleString('es-AR')}
                      </td>
                      <td className="hidden px-4 py-3 align-middle md:table-cell !text-white/80">
                        <span className="block text-xs uppercase tracking-wide !text-white/50">
                          Visitas · Consultas · Conv.
                        </span>
                        <span className="font-medium !text-white">
                          {visitas} · {consultas} · {conv}
                        </span>
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
        <PropertyQuickView propiedad={selectedProp} onClose={() => setSelectedProp(null)} />
      ) : null}
    </>
  );
}
