import React from 'react';

interface ButtonProps {
  texto: string;
  variante?: 'primario' | 'secundario'; 
  onClick?: () => void;
}

export default function Button({ texto, variante = 'primario', onClick }: ButtonProps) {
  const estilosBase = "px-6 py-3 rounded-md font-semibold transition-all duration-300 transform hover:scale-105 shadow-md";
  
  // Estilos específicos para cada variante usando tus colores constantes
  const estilosPrimario = "bg-naranja text-surface hover:bg-naranja-hover";
  const estilosSecundario = "bg-verde text-surface hover:bg-verde-hover";

  // Elegimos qué estilo aplicar según la variante que nos pidan
  const claseFinal = `${estilosBase} ${variante === 'primario' ? estilosPrimario : estilosSecundario}`;

  return (
    <button className={claseFinal} onClick={onClick}>
      {texto}
    </button>
  );
}