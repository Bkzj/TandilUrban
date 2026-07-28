import { NextRequest, NextResponse } from 'next/server';
import type { GenerateContentResult, Part } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiError } from '@/lib/api-error';
import { requirePanelTenant } from '@/lib/panel-authorization';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { runRouteHandler } from '@/lib/route-handler';
import { aiImageOrderingSchema, aiPhotoClassificationSchema } from '@/lib/validation/ai';
import { getServerEnvironment } from '@/lib/validation/environment';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { parseImageDataUrl } from '@/lib/validation/upload';

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

  const decoded: unknown = JSON.parse(text);
  const parsed = aiPhotoClassificationSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new Error('La IA no devolvió un arreglo JSON.');
  }

  const map = new Map<number, { categoria: string; orden_sugerido: number }>();
  for (const row of parsed.data) {
    const index = row.index;
    const categoria = row.categoria;
    if (index === null || index < 0 || index >= expectedCount || !categoria) continue;

    map.set(index, {
      categoria,
      orden_sugerido: parseOrdenSugerido(row.orden_sugerido, index),
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
  return runRouteHandler(request, 'ai.photo_ordering.failed', async () => {
    const context = await requirePanelTenant();
    const environment = getServerEnvironment();
    const apiKey = environment.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError('EXTERNAL_UNAVAILABLE', {
        message: 'La clasificación con IA no está disponible.',
      });
    }
    const rate = await configuredRateLimitStore().consume(`ai:photos:user:${context.user.id}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    }
    const body = await parseJsonBody(
      request,
      aiImageOrderingSchema,
      REQUEST_LIMITS.aiImagesJsonBytes,
    );
    const imagesBase64 = body.imagesBase64.map((raw) => {
      const image = parseImageDataUrl(
        `data:image/jpeg;base64,${raw.replace(/\s/gu, '')}`,
        REQUEST_LIMITS.aiImageBytes,
        ['image/jpeg'],
      );
      if (!image) {
        throw new ApiError('VALIDATION_ERROR', {
          message: 'Una imagen no es JPEG válido o supera el tamaño permitido.',
        });
      }
      return image.base64;
    });
    const modelName = environment.GEMINI_MODEL ?? 'gemini-2.5-flash';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }, { timeout: 20_000 });

    const prompt = buildPrompt(body.layoutContext, imagesBase64.length);
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
  });
}
