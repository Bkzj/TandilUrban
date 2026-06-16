import type { PublicPropiedadListItem } from '@/types/public-search';

export type EmprendimientoCategoria = 'pozo' | 'local' | 'franquicia';

export type EmprendimientoEditorial = {
  id: string;
  categoria: EmprendimientoCategoria;
  titulo: string;
  subtitulo?: string;
  descripcion: string;
  imagen: string;
  /** Galería extra para mosaicos y vitrinas visuales. */
  imagenes?: string[];
  badge: string;
  ctaLabel: string;
  ctaHref: string;
  destacado?: boolean;
  patrocinado?: boolean;
};

export type EmprendimientosPageData = {
  editoriales: EmprendimientoEditorial[];
  proyectosPozo: PublicPropiedadListItem[];
  localesComerciales: PublicPropiedadListItem[];
};

export type EmprendimientoFiltro = 'todos' | EmprendimientoCategoria;
