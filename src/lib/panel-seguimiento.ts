/** Métricas de engagement de una propiedad (portal + CRM). */
export type PropiedadEngagementMetrics = {
  visitasWeb: number;
  consultas: number;
  visitasFisicasLead: number;
  visitasFisicasPropiedad: number;
  /** Vista web + consultas×2 + visitas físicas de la propiedad×3 */
  actividadRegistrada: number;
};

export type VisitaFisicaHistorialItem = {
  id: string;
  delta: number;
  createdAt: string;
  visitanteNombre: string;
  registradoPorNombre: string;
};

export function calcularActividadRegistrada(
  visitasWeb: number,
  consultas: number,
  visitasFisicasPropiedad: number,
): number {
  return visitasWeb + consultas + visitasFisicasPropiedad;
}

export function buildPropiedadEngagement(
  visitasWeb: number,
  consultas: number,
  visitasFisicasLead: number,
  visitasFisicasPropiedad: number,
): PropiedadEngagementMetrics {
  return {
    visitasWeb,
    consultas,
    visitasFisicasLead,
    visitasFisicasPropiedad,
    actividadRegistrada: calcularActividadRegistrada(visitasWeb, consultas, visitasFisicasPropiedad),
  };
}
