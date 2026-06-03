çimport type { EmprendimientoEditorial } from '@/types/emprendimientos';

/** Contenido editorial curado hasta existir un modelo dedicado en Prisma. */
export const EMPRENDIMIENTOS_EDITORIALES: EmprendimientoEditorial[] = [
  {
    id: 'pozo-torres-parque',
    categoria: 'pozo',
    titulo: 'Torres del Parque',
    subtitulo: 'Entrega estimada · 2027',
    descripcion:
      'Desarrollo de departamentos de 1, 2 y 3 ambientes con amenities, cocheras y financiación en pesos. Zona en expansión, a metros del Parque Independencia.',
    imagen:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070&auto=format&fit=crop',
    imagenes: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2070&auto=format&fit=crop',
    ],
    badge: 'Proyecto en pozo',
    ctaLabel: 'Solicitar información',
    ctaHref: 'mailto:contacto@propeagroup.com?subject=Torres%20del%20Parque',
    destacado: true,
  },
  {
    id: 'pozo-barrio-acacias',
    categoria: 'pozo',
    titulo: 'Barrio Las Acacias',
    subtitulo: 'Lotes + viviendas llave en mano',
    descripcion:
      'Emprendimiento mixto con lotes desde 400 m² y modelos de casas modulares. Ideal para familias que buscan construir a medida en Tandil.',
    imagen:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    imagenes: [
      'https://images.unsplash.com/photo-1605276374104-de8862b9b2a7?q=80&w=2070&auto=format&fit=crop',
    ],
    badge: 'Proyecto en pozo',
    ctaLabel: 'Ver planos y precios',
    ctaHref: 'mailto:contacto@propeagroup.com?subject=Barrio%20Las%20Acacias',
  },
  {
    id: 'pozo-edificio-centro',
    categoria: 'pozo',
    titulo: 'Edificio Centro Comercial',
    subtitulo: 'Oficinas y locales en planta baja',
    descripcion:
      'Torre mixta en pleno microcentro: unidades en pozo con rentabilidad proyectada y locales comerciales desde 45 m².',
    imagen:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
    badge: 'Proyecto en pozo',
    ctaLabel: 'Consultar disponibilidad',
    ctaHref: 'mailto:contacto@propeagroup.com?subject=Edificio%20Centro%20Comercial',
  },
  {
    id: 'local-galeria-comercial',
    categoria: 'local',
    titulo: 'Local en galería comercial',
    subtitulo: 'Av. Colón · 85 m²',
    descripcion:
      'Vidriera a la calle con baño y depósito. Alto tránsito peatonal, ideal para retail o servicios. Expensas moderadas.',
    imagen:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
    badge: 'Local comercial',
    ctaLabel: 'Coordinar visita',
    ctaHref: '/buscar?tipo=local',
  },
  {
    id: 'franquicia-cafe',
    categoria: 'franquicia',
    titulo: 'Franquicia de café especializado',
    subtitulo: 'Marca nacional · Tandil disponible',
    descripcion:
      'Oportunidad de master franquicia en la región. Inversión inicial desde USD 45.000, capacitación incluida y acompañamiento en locación.',
    imagen:
      'https://images.unsplash.com/photo-1495474472287-4d89bcf2ff42?q=80&w=2070&auto=format&fit=crop',
    imagenes: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1453614512568-c402808d2a47?q=80&w=2070&auto=format&fit=crop',
    ],
    badge: 'Franquicia',
    ctaLabel: 'Pedir dossier',
    ctaHref: 'mailto:contacto@propeagroup.com?subject=Franquicia%20caf%C3%A9',
    destacado: true,
  },
  {
    id: 'franquicia-farmacia',
    categoria: 'franquicia',
    titulo: 'Cadena de farmacias',
    subtitulo: 'Zona norte · punto en evaluación',
    descripcion:
      'Franquicia farmacéutica con stock centralizado y marketing regional. Buscamos inversor local con experiencia comercial.',
    imagen:
      'https://images.unsplash.com/photo-1576602970547-0b5ea095c1c0?q=80&w=2070&auto=format&fit=crop',
    badge: 'Franquicia',
    ctaLabel: 'Más información',
    ctaHref: 'mailto:contacto@propeagroup.com?subject=Franquicia%20farmacia',
  },
  {
    id: 'pub-financiacion',
    categoria: 'publicidad',
    titulo: 'Financiación para emprendedores',
    subtitulo: 'Banco aliado · Propea Group',
    descripcion:
      'Líneas especiales para compra de local, pozo o franquicia. Tasas preferenciales y asesoramiento gratuito para socios del portal.',
    imagen:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2070&auto=format&fit=crop',
    imagenes: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2070&auto=format&fit=crop',
    ],
    badge: 'Publicidad',
    ctaLabel: 'Conocer condiciones',
    ctaHref: 'mailto:contacto@propeagroup.com?subject=Financiaci%C3%B3n%20emprendedores',
    patrocinado: true,
    destacado: true,
  },
  {
    id: 'pub-asesoria-legal',
    categoria: 'publicidad',
    titulo: 'Asesoría legal para negocios',
    subtitulo: 'Estudio jurídico asociado',
    descripcion:
      'Contratos de franquicia, locación comercial y constitución de sociedades. Primera consulta sin cargo para usuarios Propea Group.',
    imagen:
      'https://images.unsplash.com/photo-1589829545855-d11d042db266?q=80&w=2070&auto=format&fit=crop',
    badge: 'Publicidad',
    ctaLabel: 'Agendar consulta',
    ctaHref: 'mailto:contacto@propeagroup.com?subject=Asesor%C3%ADa%20legal',
    patrocinado: true,
  },
];

export const EMPRENDIMIENTO_CATEGORIA_META = {
  pozo: {
    label: 'En pozo',
    navLabel: 'Proyectos en pozo',
    descripcion: 'Desarrollos y unidades en construcción con financiación.',
    accent: 'verde' as const,
  },
  local: {
    label: 'Local comercial',
    navLabel: 'Locales de negocio',
    descripcion: 'Espacios listos para abrir o transferir tu actividad.',
    accent: 'verde' as const,
  },
  franquicia: {
    label: 'Franquicia',
    navLabel: 'Franquicias',
    descripcion: 'Marcas consolidadas buscando socios en Tandil.',
    accent: 'naranja' as const,
  },
  publicidad: {
    label: 'Patrocinado',
    navLabel: 'Publicidad',
    descripcion: 'Servicios y aliados recomendados para emprendedores.',
    accent: 'naranja' as const,
  },
} as const;
