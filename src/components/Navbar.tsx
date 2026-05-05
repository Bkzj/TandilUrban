import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="w-full z-50 bg-verde flex items-center justify-between px-8 py-2 text-white shadow-lg relative">
      
      {/* Logo */}
      <div className="text-3xl font-serif font-bold tracking-widest uppercase cursor-pointer drop-shadow-md">
        TandilUrban
      </div>
      
      {/* Enlaces al centro (Letra más  y legible) */}
      <div className="hidden lg:flex gap-10 font-medium text-sm tracking-widest uppercase items-center drop-shadow-sm">
        <Link href="#" className="hover:text-naranja transition-colors py-2">Propiedades</Link>
        <Link href="#" className="hover:text-naranja transition-colors py-2">Destacados</Link>
        <Link href="#" className="hover:text-naranja transition-colors py-2">Servicios</Link>
        <Link href="#" className="hover:text-naranja transition-colors py-2">Nosotros</Link>
      </div>

      {/* Botones de contacto a la derecha */}
      <div className="hidden md:flex items-center gap-6">
        {/* Botón Teléfono */}
        <button className="bg-naranja px-5 py-2.5 rounded-full text-sm font-bold hover:brightness-110 transition-all shadow-md flex items-center gap-2">
          📞 2494567891 - TANDIL
        </button>
        
        {/* Botón Email circular suave */}
        <button className="bg-naranja px-5 py-2.5 rounded-full text-sm font-bold hover:brightness-110 transition-all shadow-md flex items-center gap-2">
          ✉️
        </button>
      </div>

    </nav>
  );
}