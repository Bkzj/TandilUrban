/** Métricas de engagement de una propiedad (portal + CRM). */
export type PropiedadEngagementMetrics = {
  visitasWeb: number;
  consultas: number;
  visitasFisicasLead: number;
  visitasFisicasPropiedad: number;
  /** Vista web + consultas×2 + visitas físicas de la propiedad×3 */
  indiceInteres: number;
};

export type VisitaFisicaHistorialItem = {
  id: string;
  delta: number;
  createdAt: string;
  visitanteNombre: string;
  registradoPorNombre: string;
};

export function calcularIndiceInteres(
  visitasWeb: number,
  consultas: number,
  visitasFisicasPropiedad: number,
): number {
  return visitasWeb + consultas * 2 + visitasFisicasPropiedad * 3;
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
    indiceInteres: calcularIndiceInteres(visitasWeb, consultas, visitasFisicasPropiedad),
  };
}
