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
    <div className="bg-white p-4 md:p-6 rounded-3xl shadow-2xl w-full max-w-5xl mx-auto border border-gray-100">
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        
        <div className="w-full">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Operación</label>
          <select 
            value={operacion}
            onChange={(e) => setOperacion(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-verde text-gray-800 font-medium"
          >
            <option value="Todos">Cualquiera</option>
            <option value="Venta">Venta</option>
            <option value="Alquiler">Alquiler</option>
          </select>
        </div>

        <div className="w-full">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo</label>
          <select 
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-verde text-gray-800 font-medium"
          >
            <option value="Todos">Cualquiera</option>
            <option value="Casa">Casa</option>
            <option value="Departamento">Departamento</option>
            <option value="Lote">Lote / Terreno</option>
          </select>
        </div>

        {/* Nuevo Input de Texto para Barrio */}
        <div className="w-full">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Barrio / Zona</label>
          <input 
            type="text"
            value={barrio}
            onChange={(e) => setBarrio(e.target.value)}
            placeholder="Ej: Centro, Dique..."
            className="w-full p-3 rounded-xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-verde text-gray-800 font-medium placeholder-gray-400"
          />
        </div>

        <button 
          type="submit"
          className="w-full bg-verde text-white font-bold py-3 rounded-xl hover:bg-black transition-all shadow-lg h-[50px]"
        >
          Buscar
        </button>
      </form>
    </div>
  );
}