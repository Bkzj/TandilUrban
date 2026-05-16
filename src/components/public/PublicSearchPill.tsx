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

  const pillClass =
    formClassName ??
    'mx-auto flex w-full max-w-5xl flex-col gap-3 divide-y divide-gray-200 rounded-full border border-white/20 bg-white p-3 shadow-2xl sm:flex-row sm:items-stretch sm:gap-0 sm:divide-x sm:divide-y-0';

  const fieldShell = 'flex min-h-[52px] flex-1 items-center px-4 sm:min-h-0';

  const formOverflow = hasBarrios ? 'overflow-visible' : '';

  const queryPlaceholder = hasBarrios ? 'Buscar barrio...' : 'Buscar barrio, ciudad o dirección';

  return (
    <form
      onSubmit={onSubmit}
      className={`${pillClass} ${formOverflow} relative`.trim()}
    >
      <div className={`${fieldShell} relative z-20 min-w-0 gap-3 sm:overflow-visible`}>
        <Search className="h-5 w-5 shrink-0 text-naranja" aria-hidden />
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
            className="w-full min-w-0 border-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
            autoComplete="off"
            aria-label="Buscar"
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

      <div className={fieldShell}>
        <select
          aria-label="Operación"
          value={operacion}
          onChange={(ev) => setOperacion(ev.target.value)}
          className="w-full cursor-pointer appearance-none border-0 bg-transparent bg-[length:1rem] bg-[right_0.25rem_center] bg-no-repeat py-1 pr-8 text-sm font-medium text-text-primary outline-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          }}
        >
          <option value="">Operación</option>
          <option value="VENTA">Venta</option>
          <option value="ALQUILER">Alquiler</option>
        </select>
      </div>

      <div className={fieldShell}>
        <select
          aria-label="Tipo de propiedad"
          value={tipo}
          onChange={(ev) => setTipo(ev.target.value)}
          className="w-full cursor-pointer appearance-none border-0 bg-transparent bg-[length:1rem] bg-[right_0.25rem_center] bg-no-repeat py-1 pr-8 text-sm font-medium text-text-primary outline-none"
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

      <div className="flex items-center justify-center px-2 pb-1 sm:justify-end sm:pb-0 sm:pl-2 sm:pr-1">
        <button
          type="submit"
          className="rounded-full bg-naranja px-8 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-naranja/90"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
