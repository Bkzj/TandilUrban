'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBox() {
  const router = useRouter();
  
  const [operacion, setOperacion] = useState('Todos');
  const [tipo, setTipo] = useState('Todos');
  const [barrio, setBarrio] = useState(''); // Nuevo estado para el input de texto

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params = new URLSearchParams();
    if (operacion !== 'Todos') params.append('operacion', operacion);
    if (tipo !== 'Todos') params.append('tipo', tipo);
    if (barrio.trim() !== '') params.append('barrio', barrio.trim()); // Limpiamos espacios extra
    
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl rounded-3xl border border-border-light bg-surface p-4 shadow-2xl md:p-6">
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        
        <div className="w-full">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">Operación</label>
          <select 
            value={operacion}
            onChange={(e) => setOperacion(e.target.value)}
            className="w-full rounded-xl border border-border-light bg-background p-3 font-medium text-text-primary outline-none focus:ring-2 focus:ring-verde"
          >
            <option value="Todos">Cualquiera</option>
            <option value="Venta">Venta</option>
            <option value="Alquiler">Alquiler</option>
          </select>
        </div>

        <div className="w-full">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">Tipo</label>
          <select 
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-xl border border-border-light bg-background p-3 font-medium text-text-primary outline-none focus:ring-2 focus:ring-verde"
          >
            <option value="Todos">Cualquiera</option>
            <option value="Casa">Casa</option>
            <option value="Departamento">Departamento</option>
            <option value="Lote">Lote / Terreno</option>
          </select>
        </div>

        {/* Nuevo Input de Texto para Barrio */}
        <div className="w-full">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">Barrio / Zona</label>
          <input 
            type="text"
            value={barrio}
            onChange={(e) => setBarrio(e.target.value)}
            placeholder="Ej: Centro, Dique..."
            className="w-full rounded-xl border border-border-light bg-background p-3 font-medium text-text-primary outline-none placeholder:text-text-secondary focus:ring-2 focus:ring-verde"
          />
        </div>

        <button 
          type="submit"
          className="h-[50px] w-full rounded-xl bg-verde py-3 font-bold text-surface shadow-lg transition-all hover:bg-verde-hover"
        >
          Buscar
        </button>
      </form>
    </div>
  );
}