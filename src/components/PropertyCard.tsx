import React from 'react';
import Link from 'next/link';

interface PropertyCardProps {
  id: string; // Agregamos el ID
  titulo: string;
  precio: number;
  moneda: string;
  operacion: string;
  ambientes: number;
  m2Total: number;
  esSustentable: boolean;
  imagenUrl: string;
}

export default function PropertyCard({ 
  id, titulo, precio, moneda, operacion, ambientes, m2Total, esSustentable, imagenUrl 
}: PropertyCardProps) {
  return (
    // Envolvemos todo en un Link que apunte a la ruta dinámica
    <Link href={`/propiedades/${id}`}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-gray-100 flex flex-col h-full hover:-translate-y-1">
        
        <div className="relative h-64 w-full overflow-hidden">
          <div className="absolute top-4 left-4 z-10 bg-verde text-white text-xs font-bold px-3 py-1 rounded-full uppercase">{operacion}</div>
          {esSustentable && (
            <div className="absolute top-4 right-4 z-10 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">🌱 Sustentable</div>
          )}
          <img src={imagenUrl} alt={titulo} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className="p-6 flex flex-col flex-grow">
          <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-1">{titulo}</h3>
          <div className="text-2xl font-light text-naranja mb-4">{moneda} {precio.toLocaleString('es-AR')}</div>
          <div className="w-full h-[1px] bg-gray-100 mb-4"></div>
          <div className="flex items-center justify-between text-gray-500 text-sm mt-auto">
            <div className="flex items-center gap-1"><span>📐</span> {m2Total} m²</div>
            <div className="flex items-center gap-1"><span>🚪</span> {ambientes} Amb.</div>
          </div>
        </div>
      </div>
    </Link>
  );
}