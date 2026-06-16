type ExclusivaInput = {
  operacion: string;
  moneda: string;
  precio: number | string;
};

/** Clasificación automática según umbrales de precio (VENTA USD / ALQUILER ARS). */
export function computeEsExclusiva(data: ExclusivaInput): boolean {
  const precioNum = Number(data.precio) || 0;

  if (data.operacion === 'VENTA' && data.moneda === 'USD' && precioNum > 130_000) {
    return true;
  }

  if (data.operacion === 'ALQUILER' && data.moneda === 'ARS' && precioNum > 2_100_000) {
    return true;
  }

  return false;
}
