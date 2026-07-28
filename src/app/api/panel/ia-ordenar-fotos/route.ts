import { NextRequest, NextResponse } from 'next/server';
import type { GenerateContentResult, Part } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthError } from '@/lib/auth';
import { requirePanelTenant } from '@/lib/panel-authorization';

function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

function responseTextSafe(result: GenerateContentResult): string {
  try {
    return result.response.text();
  } catch {
    return '';
  }
}

const ORDEN_FALLBACK_FINAL = 99;

type ClasificacionFila = {
  index: number;
  categoria: string;
  orden_sugerido: number;
};

function parseOrdenSugerido(value: unknown, indexFallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const orden = Math.round(value);
    if (orden >= 1) return orden;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) {
      const orden = Math.round(n);
      if (orden >= 1) return orden;
    }
  }
  return ORDEN_FALLBACK_FINAL + indexFallback;
}

function parseClasificaciones(raw: string, expectedCount: number): ClasificacionFila[] {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence) text = fence[1].trim();

  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('La IA no devolvió un arreglo JSON.');
  }

  const map = new Map<number, { categoria: string; orden_sugerido: number }>();
  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const index = typeof o.index === 'number' && Number.isInteger(o.index) ? o.index : null;
    const categoria =
      typeof o.categoria === 'string' ? o.categoria.trim() : String(o.categoria ?? '').trim();
    if (index === null || index < 0 || index >= expectedCount || !categoria) continue;

    const tieneOrdenValido =
      (typeof o.orden_sugerido === 'number' && Number.isFinite(o.orden_sugerido)) ||
      (typeof o.orden_sugerido === 'string' && o.orden_sugerido.trim() !== '');

    map.set(index, {
      categoria,
      orden_sugerido: tieneOrdenValido
        ? parseOrdenSugerido(o.orden_sugerido, index)
        : ORDEN_FALLBACK_FINAL + index,
    });
  }

  const out: ClasificacionFila[] = [];
  for (let i = 0; i < expectedCount; i++) {
    const entry = map.get(i);
    out.push({
      index: i,
      categoria: entry?.categoria ?? 'Sin clasificar',
      orden_sugerido: entry?.orden_sugerido ?? ORDEN_FALLBACK_FINAL + i,
    });
  }

  out.sort((a, b) => {
    if (a.orden_sugerido !== b.orden_sugerido) return a.orden_sugerido - b.orden_sugerido;
    return a.index - b.index;
  });

  if (out.length !== expectedCount) {
    throw new Error('La clasificación no cubrió todas las fotos.');
  }

  return out;
}

function buildPrompt(layoutContext: string, imageCount: number): string {
  const layout =
    layoutContext.trim() ||
    '(No se indicó distribución detallada; inferí espacios habituales según las fotos.)';

  return `Sos un Director de Arte Inmobiliario de primer nivel. Tenés fotos de una propiedad con esta distribución (texto del agente):

"${layout}"

Tu misión es doble para CADA foto:
1) Asignar una categoría breve en español (Fachada, Living, Comedor, Cocina, Habitación principal, Habitación 2, Baño, Pasillo, Lavadero, Patio, Quincho, Cochera, Plano, Detalle, Otro, etc.).
2) Asignar orden_sugerido: un número entero del 1 al ${imageCount} que define la jerarquía visual ideal para un aviso premium (1 = portada, ${imageCount} = última).

Evaluá cada imagen por iluminación, amplitud del encuadre, limpieza visual y atractivo comercial. Aplicá esta jerarquía estricta al numerar:

- Orden 1 (portada): la foto más espectacular — fachada impecable, living/comedor muy luminoso o el mejor "wow" del lote.
- Orden medio: ambientes principales (Living, Cocina, habitación principal), del más al menos atractivo.
- Orden bajo: ambientes secundarios (baños, pasillos, lavaderos, depósitos).
- Orden final: planos arquitectónicos, fotos oscuras, baja calidad o detalles menores (termotanque, medidores, etc.).

El orden en que recibís las imágenes es fijo: la primera imagen después de este texto es índice 0, la segunda índice 1, hasta ${imageCount - 1}. No confundas índice con orden_sugerido: index identifica la foto original; orden_sugerido es tu ranking de publicación.

Devolvé ÚNICAMENTE un JSON array (sin texto adicional) con este formato estricto:
[{"index":0,"categoria":"Plano","orden_sugerido":15},{"index":1,"categoria":"Living","orden_sugerido":1}]

Reglas del JSON:
- Una entrada por cada índice de 0 a ${imageCount - 1} (exactamente ${imageCount} objetos).
- orden_sugerido: enteros únicos entre 1 y ${imageCount}, sin repetir.
- Ordená mentalmente de mejor a peor; la portada siempre lleva orden_sugerido: 1.`;
}

export async function POST(request: NextRequest) {
  try {
    await requirePanelTenant();

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'El servidor no tiene configurada GEMINI_API_KEY.' },
        { status: 503 }
      );
    }

    const rawBody = await request.json();
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
    }

    const body = rawBody as Record<string, unknown>;
    const layoutContext = typeof body.layoutContext === 'string' ? body.layoutContext : '';
    const imagesRaw = body.imagesBase64;
    if (!Array.isArray(imagesRaw)) {
      return NextResponse.json({ error: 'Falta imagesBase64 (arreglo).' }, { status: 400 });
    }

    const imagesBase64 = imagesRaw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    if (imagesBase64.length === 0) {
      return NextResponse.json({ error: 'Necesitamos al menos una imagen comprimida.' }, { status: 400 });
    }
    if (imagesBase64.length > 15) {
      return NextResponse.json(
        { error: 'Máximo 15 imágenes por solicitud (clasificación por lotes).' },
        { status: 400 }
      );
    }

    const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = buildPrompt(layoutContext, imagesBase64.length);
    const parts: Part[] = [
      { text: prompt },
      ...imagesBase64.map((data) => ({
        inlineData: {
          mimeType: 'image/jpeg' as const,
          data: data.replace(/\s/g, ''),
        },
      })),
    ];

    const result = await model.generateContent(parts);
    const text = responseTextSafe(result);
    const clasificaciones = parseClasificaciones(text, imagesBase64.length);

    return NextResponse.json({ clasificaciones });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error('[POST /api/panel/ia-ordenar-fotos]', error);
    const message =
      error instanceof Error ? error.message : 'No se pudieron clasificar las fotos con IA.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
