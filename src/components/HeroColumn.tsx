import React from 'react';

interface HeroColumnProps {
  icono: React.ReactNode;
  lineasTitulo: string[];
  fondoImagen: string; //imagen específica de esta columna
  estaActiva: boolean; 
  hayAlgunaActiva: boolean; 
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  tieneBordeRight?: boolean;
}

export default function HeroColumn({ 
  icono, 
  lineasTitulo, 
  fondoImagen,
  estaActiva,
  hayAlgunaActiva,
  onMouseEnter,
  onMouseLeave,
  tieneBordeRight = true 
}: HeroColumnProps) {
  
  // Lógica visual basada en el estado:
  // Si NO hay ninguna activa, somos neutrales.
  // Si hay alguna activa, y es ESTA, la mostramos brillante.
  // Si hay alguna activa, pero NO es esta, la oscurecemos.
  let opacidadFondoLocal = "opacity-0";
  let colorOverlay = "bg-text-primary/30 hover:bg-text-primary/10"; // Estado por defecto

  if (hayAlgunaActiva) {
    if (estaActiva) {
      opacidadFondoLocal = "opacity-100"; // Mostramos la imagen de la columna
      colorOverlay = "bg-text-primary/10"; // Menos oscuro para que resalte la imagen
    } else {
      opacidadFondoLocal = "opacity-0"; // Mantenemos oculta la imagen local
      colorOverlay = "bg-text-primary/70 backdrop-blur-[2px]"; // Oscurecemos mucho las demás
    }
  }

  return (
    <div 
      className={`group relative flex flex-1 cursor-pointer flex-col items-center justify-center text-surface transition-all duration-500 ${tieneBordeRight ? 'border-r border-surface/20' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 1. IMAGEN LOCAL (Propia de la columna, se revela en hover) */}
      <div 
        className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-500 ease-in-out ${opacidadFondoLocal}`}
        style={{ backgroundImage: `url('${fondoImagen}')` }}
      ></div>

      {/* 2. OVERLAY OSCURO (Regula qué tan oscura se ve la columna) */}
      <div className={`absolute inset-0 z-10 transition-all duration-500 ${colorOverlay}`}></div>

      {/* 3. CONTENIDO (Iconos y Textos) */}
      <div className="relative z-20 flex flex-col items-center w-full">
        <span className="text-5xl mb-6 group-hover:scale-110 transition-transform drop-shadow-lg">
          {icono}
        </span>
        
        <div className="flex items-center w-full justify-center gap-4 text-center">
          <div className="h-[1px] w-12 bg-surface/70"></div>
          
          <h2 className="text-xl md:text-2xl font-light tracking-[0.25em] drop-shadow-md flex flex-col">
            {lineasTitulo.map((linea, index) => (
              <span key={index}>{linea}</span>
            ))}
          </h2>
          
          <div className="h-[1px] w-12 bg-surface/70"></div>
        </div>
      </div>
    </div>
  );
}