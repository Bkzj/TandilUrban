'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const selectClass =
  'w-full rounded-xl border border-border-light bg-background p-3 font-medium text-text-primary outline-none transition-shadow focus:ring-2 focus:ring-verde';

export default function SearchBox() {
  const router = useRouter();
  const [operacion, setOperacion] = useState('Todos');
  const [tipo, setTipo] = useState('Todos');
  const [barrio, setBarrio] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (operacion !== 'Todos') params.append('operacion', operacion);
    if (tipo !== 'Todos') params.append('tipo', tipo);
    if (barrio.trim() !== '') params.append('barrio', barrio.trim());

    setLoading(true);

    // Navegar con los params y después hacer scroll suave hacia la grilla
    router.push(`/?${params.toString()}`);

    // Pequeño delay para que Next.js renderice antes del scroll
    setTimeout(() => {
      setLoading(false);
      const target = document.getElementById('oportunidades');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-5xl rounded-3xl border border-border-light bg-surface p-4 shadow-2xl md:p-6"
    >
      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 items-end gap-4 md:grid-cols-4"
      >
        <div className="w-full">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Operación
          </label>
          <select
            value={operacion}
            onChange={(e) => setOperacion(e.target.value)}
            className={selectClass}
          >
            <option value="Todos">Cualquiera</option>
            <option value="Venta">Venta</option>
            <option value="Alquiler">Alquiler</option>
          </select>
        </div>

        <div className="w-full">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={selectClass}
          >
            <option value="Todos">Cualquiera</option>
            <option value="Casa">Casa</option>
            <option value="Departamento">Departamento</option>
            <option value="Lote">Lote / Terreno</option>
          </select>
        </div>

        <div className="w-full">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Barrio / Zona
          </label>
          <input
            type="text"
            value={barrio}
            onChange={(e) => setBarrio(e.target.value)}
            placeholder="Ej: Centro, Dique…"
            className={`${selectClass} placeholder:text-text-secondary`}
          />
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.96 }}
          className="h-[50px] w-full rounded-xl bg-verde py-3 font-bold text-surface shadow-lg transition-colors hover:bg-verde-hover disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Buscando…
            </span>
          ) : (
            'Buscar'
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
