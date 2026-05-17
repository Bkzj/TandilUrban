'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export type PublicSearchPillProps = {
  /** Clases extra del <form> (p. ej. sombra distinta en home vs /buscar) */
  formClassName?: string;
  defaultQuery?: string;
  defaultOperacion?: string;
  defaultTipo?: string;
  /** Barrios con propiedades disponibles (autocomplete en el campo de búsqueda). */
  barrios?: string[];
};

function tipoFromUrl(v: string | undefined): string {
  const x = (v ?? '').toLowerCase();
  if (x === 'casa') return 'Casa';
  if (x === 'depto') return 'Departamento';
  if (x === 'lote') return 'Lote';
  return '';
}

function tipoToUrl(t: string): string {
  if (t === 'Casa') return 'casa';
  if (t === 'Departamento') return 'depto';
  if (t === 'Lote') return 'lote';
  return '';
}

function operacionFromUrl(v: string | undefined): string {
  const x = (v ?? '').toLowerCase();
  if (x === 'venta') return 'VENTA';
  if (x === 'alquiler') return 'ALQUILER';
  return '';
}

function operacionToUrl(o: string): string {
  if (o === 'VENTA') return 'venta';
  if (o === 'ALQUILER') return 'alquiler';
  return '';
}

const SUGGEST_MAX = 80;

const DEFAULT_PILL_CLASS =
  'relative z-10 mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 overflow-visible rounded-3xl border-0 bg-white p-4 shadow-2xl md:flex md:flex-row md:items-end md:gap-0 md:divide-x md:divide-gray-200/90 md:rounded-full md:border md:border-white/30 md:bg-white/92 md:p-3 md:shadow-2xl md:backdrop-blur-xl';

const FIELD_SHELL =
  'flex min-h-0 w-full items-center px-3 py-2 md:min-h-[52px] md:px-4';

export function PublicSearchPill({
  formClassName,
  defaultQuery = '',
  defaultOperacion = '',
  defaultTipo = '',
  barrios,
}: PublicSearchPillProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [operacion, setOperacion] = useState(() => operacionFromUrl(defaultOperacion));
  const [tipo, setTipo] = useState(() => tipoFromUrl(defaultTipo));
  const [suggestOpen, setSuggestOpen] = useState(false);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasBarrios = Boolean(barrios && barrios.length > 0);

  const filteredBarrios = useMemo(() => {
    if (!barrios?.length) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? barrios.filter((b) => b.toLowerCase().includes(q))
      : barrios;
    return list.slice(0, SUGGEST_MAX);
  }, [barrios, query]);

  useEffect(() => {
    setQuery(defaultQuery);
    setOperacion(operacionFromUrl(defaultOperacion));
    setTipo(tipoFromUrl(defaultTipo));
  }, [defaultQuery, defaultOperacion, defaultTipo]);

  const clearBlurTimer = useCallback(() => {
    if (blurCloseTimer.current !== null) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  }, []);

  const scheduleCloseSuggestions = useCallback(() => {
    clearBlurTimer();
    blurCloseTimer.current = setTimeout(() => setSuggestOpen(false), 160);
  }, [clearBlurTimer]);

  useEffect(() => () => clearBlurTimer(), [clearBlurTimer]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSuggestOpen(false);
    const params = new URLSearchParams();
    const q = query.trim();
    if (q) params.set('query', q);
    if (operacion) params.set('operacion', operacionToUrl(operacion));
    if (tipo) params.set('tipo', tipoToUrl(tipo));
    const qs = params.toString();
    router.push(qs ? `/buscar?${qs}` : '/buscar');
  }

  const pillClass = formClassName ?? DEFAULT_PILL_CLASS;
  const formOverflow = hasBarrios ? 'overflow-visible' : '';
  const queryPlaceholder = hasBarrios ? 'Buscar barrio...' : 'Buscar barrio, ciudad o dirección';

  const selectClass =
    'w-full cursor-pointer appearance-none border-0 bg-transparent bg-[length:1rem] bg-[right_0.25rem_center] bg-no-repeat py-2 pr-7 text-sm font-medium text-text-primary outline-none md:py-1 md:pr-8';

  return (
    <form onSubmit={onSubmit} className={`${pillClass} ${formOverflow}`.trim()}>
      <div
        className={`${FIELD_SHELL} relative z-20 col-span-2 min-w-0 gap-2 md:col-span-1 md:flex-1 md:gap-3`}
      >
        <Search className="h-4 w-4 shrink-0 text-naranja md:h-5 md:w-5" aria-hidden />
        <div className="relative min-w-0 flex-1">
          <input
            type="search"
            name="query"
            id="public-search-query"
            value={query}
            onChange={(ev) => {
              setQuery(ev.target.value);
              if (hasBarrios) setSuggestOpen(true);
            }}
            onFocus={() => {
              clearBlurTimer();
              if (hasBarrios) setSuggestOpen(true);
            }}
            onBlur={scheduleCloseSuggestions}
            placeholder={queryPlaceholder}
            className="w-full min-w-0 border-0 bg-transparent py-0 text-sm text-text-primary outline-none placeholder:text-text-secondary"
            autoComplete="off"
            aria-label="Buscar ubicación"
            aria-expanded={hasBarrios ? suggestOpen : undefined}
            aria-controls={hasBarrios ? 'hero-barrios-suggestions' : undefined}
            aria-autocomplete={hasBarrios ? 'list' : undefined}
          />

          {hasBarrios && suggestOpen ? (
            <ul
              id="hero-barrios-suggestions"
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-56 overflow-y-auto rounded-2xl border border-white/30 bg-white/20 py-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/15"
            >
              {filteredBarrios.length === 0 ? (
                <li className="px-4 py-3 text-center text-sm text-text-secondary">Sin coincidencias</li>
              ) : (
                filteredBarrios.map((b) => (
                  <li key={b} role="presentation">
                    <button
                      type="button"
                      role="option"
                      className="w-full px-4 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-white/25"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        clearBlurTimer();
                        setQuery(b);
                        setSuggestOpen(false);
                      }}
                    >
                      {b}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>

      <div className={`${FIELD_SHELL} col-span-1 md:flex-1`}>
        <select
          aria-label="Operación"
          value={operacion}
          onChange={(ev) => setOperacion(ev.target.value)}
          className={selectClass}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          }}
        >
          <option value="">Operación</option>
          <option value="VENTA">Venta</option>
          <option value="ALQUILER">Alquiler</option>
        </select>
      </div>

      <div className={`${FIELD_SHELL} col-span-1 md:flex-1`}>
        <select
          aria-label="Tipo de propiedad"
          value={tipo}
          onChange={(ev) => setTipo(ev.target.value)}
          className={selectClass}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          }}
        >
          <option value="">Tipo</option>
          <option value="Casa">Casa</option>
          <option value="Departamento">Depto</option>
          <option value="Lote">Lote</option>
        </select>
      </div>

      <div className="col-span-2 flex w-full items-center justify-center px-1 pb-0.5 md:col-span-1 md:w-auto md:justify-end md:px-2 md:pb-0">
        <button
          type="submit"
          className="w-full rounded-full bg-naranja px-6 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-naranja/90 md:w-auto md:px-8 md:py-3"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
