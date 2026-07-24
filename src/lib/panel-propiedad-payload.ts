import type { CreatePropiedadPayload } from '@/types/api';
import type { PropiedadImagenItem } from '@/types/panel';

const TIPOS_VALIDOS = new Set(['Casa', 'Departamento', 'Lote', 'Local', 'Oficina']);
const OPERACIONES_VALIDAS = new Set(['VENTA', 'ALQUILER']);
const MONEDAS_VALIDAS = new Set(['USD', 'ARS']);

function asPositiveNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function asNonNegativeNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function parseImagenesPayload(raw: unknown): PropiedadImagenItem[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PropiedadImagenItem[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const url = item.trim();
      if (url) out.push({ url, public_id: null, categoria: 'Sin clasificar' });
      continue;
    }
    if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).url === 'string') {
      const o = item as Record<string, unknown>;
      const url = String(o.url).trim();
      if (!url) continue;
      const categoria =
        typeof o.categoria === 'string' && o.categoria.trim() !== ''
          ? o.categoria.trim()
          : 'Sin clasificar';
      // El public_id del cliente nunca es fuente de verdad. Se resuelve contra el registro server-side.
      out.push({ url, public_id: null, categoria });
    }
  }
  return out;
}

export function validarPropiedadPayload(
  body: unknown
): { ok: true; data: CreatePropiedadPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Cuerpo de la solicitud inválido.' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.operacion !== 'string' || !OPERACIONES_VALIDAS.has(b.operacion)) {
    return { ok: false, error: 'La operación es inválida.' };
  }
  if (typeof b.tipo !== 'string' || !TIPOS_VALIDOS.has(b.tipo)) {
    return { ok: false, error: 'El tipo de inmueble es inválido.' };
  }
  if (typeof b.direccion !== 'string' || b.direccion.trim().length < 3) {
    return { ok: false, error: 'La dirección es obligatoria.' };
  }
  if (typeof b.lat !== 'number' || typeof b.lng !== 'number') {
    return { ok: false, error: 'Faltan las coordenadas en el mapa.' };
  }
  if (typeof b.titulo !== 'string' || b.titulo.trim().length < 4) {
    return { ok: false, error: 'El título debe tener al menos 4 caracteres.' };
  }
  if (typeof b.descripcion !== 'string' || b.descripcion.trim().length < 10) {
    return { ok: false, error: 'La descripción debe tener al menos 10 caracteres.' };
  }
  if (typeof b.moneda !== 'string' || !MONEDAS_VALIDAS.has(b.moneda)) {
    return { ok: false, error: 'La moneda es inválida.' };
  }

  const precio = asPositiveNumber(b.precio);
  if (precio === null) {
    return { ok: false, error: 'El precio debe ser un número positivo.' };
  }
  const m2Total = asPositiveNumber(b.m2Total);
  if (m2Total === null) {
    return { ok: false, error: 'La superficie total debe ser un número positivo.' };
  }

  const m2Cubiertos = asNonNegativeNumber(b.m2Cubiertos);
  const ambientes = asNonNegativeNumber(b.ambientes);
  const dormitorios = asNonNegativeNumber(b.dormitorios) ?? 0;
  const banos = asNonNegativeNumber(b.banos) ?? 0;
  const cocheras = asNonNegativeNumber(b.cocheras) ?? 0;
  const expensas = asNonNegativeNumber(b.expensas);

  const imagenesParsed = parseImagenesPayload(b.imagenes);
  if (imagenesParsed === null) {
    return { ok: false, error: 'Las imágenes deben ser un arreglo válido.' };
  }
  if (imagenesParsed.length > 80) {
    return { ok: false, error: 'Máximo 80 imágenes por propiedad.' };
  }

  const caracteristicas = Array.isArray(b.caracteristicas)
    ? b.caracteristicas.filter((c): c is string => typeof c === 'string')
    : [];

  let planoUrl: string | null = null;
  if (typeof b.planoUrl === 'string' && b.planoUrl.trim() !== '') {
    planoUrl = b.planoUrl.trim();
  }

  return {
    ok: true,
    data: {
      uploadPropertyId:
        typeof b.uploadPropertyId === 'string' && b.uploadPropertyId.trim()
          ? b.uploadPropertyId.trim()
          : undefined,
      uploadToken:
        typeof b.uploadToken === 'string' && b.uploadToken.trim() ? b.uploadToken.trim() : undefined,
      operacion: b.operacion as 'VENTA' | 'ALQUILER',
      tipo: b.tipo,
      direccion: b.direccion.trim(),
      barrio: typeof b.barrio === 'string' && b.barrio.trim() !== '' ? b.barrio.trim() : null,
      lat: b.lat,
      lng: b.lng,
      m2Total,
      m2Cubiertos,
      ambientes,
      dormitorios,
      banos,
      cocheras,
      moneda: b.moneda as 'USD' | 'ARS',
      precio,
      expensas,
      caracteristicas,
      imagenes: imagenesParsed,
      planoUrl,
      titulo: b.titulo.trim(),
      descripcion: b.descripcion.trim(),
    },
  };
}
