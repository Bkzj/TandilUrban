import { NextRequest, NextResponse } from 'next/server';
import type { GenerateContentResult } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiError } from '@/lib/api-error';
import { requirePanelTenant } from '@/lib/panel-authorization';
import { configuredRateLimitStore } from '@/lib/rate-limit';
import { runRouteHandler } from '@/lib/route-handler';
import {
  aiGeneratedTextSchema,
  aiTextRequestSchema,
  type AiTextRequest,
} from '@/lib/validation/ai';
import { getServerEnvironment } from '@/lib/validation/environment';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';
import { parseImageDataUrl } from '@/lib/validation/upload';

function techLineFromPayload(payload: AiTextRequest['data']): string {
  const operacion = String(payload.operacion ?? '(sin definir)');
  const tipo = String(payload.tipo ?? '(sin definir)');
  const barrio = String(payload.barrio ?? '(sin definir)');
  const m2Total = String(payload.m2Total ?? '(sin definir)');
  const ambientes = String(payload.ambientes ?? '(sin definir)');
  const dormitorios = String(payload.dormitorios ?? '0');
  const banos = String(payload.banos ?? '0');
  const cocheras = String(payload.cocheras ?? '0');
  const moneda = String(payload.moneda ?? '(sin definir)');
  const precio = String(payload.precio ?? '(sin definir)');
  const caracteristicas = payload.caracteristicas;
  const feats =
    caracteristicas.length > 0 ? caracteristicas.join(', ') : '(ninguna cargada)';
  return `TIPO: ${tipo}, OPERACION: ${operacion}, PRECIO: ${precio}, MONEDA: ${moneda}, M2: ${m2Total}, AMBIENTES: ${ambientes}, DORMITORIOS: ${dormitorios}, BAÑOS: ${banos}, COCHERAS: ${cocheras}, BARRIO: ${barrio}, CARACTERÍSTICAS: ${feats}`;
}

function buildStrictPrompt(agentNotes: string, datosTecnicosInsertados: string): string {
  const notasInsertadas = agentNotes.trim() || 'Ninguna nota adicional';
  return `Sos copywriter de avisos inmobiliarios en Argentina. La publicación la hace una inmobiliaria; vos redactás en su nombre. Escribís con honestidad, claridad y gancho comercial.

TAREA: Un título corto que resuma la propiedad (campo "titulo") y una descripción comercial inmersiva y detallada (campo "descripcion"). Operación, precio y moneda ya figuran en la ficha del portal: NO los repitas en el título.

DATOS TÉCNICOS: ${datosTecnicosInsertados}
NOTAS DEL AGENTE (CRÍTICO): ${notasInsertadas}

TÍTULO — REGLAS OBLIGATORIAS (campo "titulo"):
- Máximo 52 caracteres. Ideal: 35–50. Una sola línea, sin comas encadenando más de 3 datos.
- DEBE hablar de ESTA propiedad: tipo de inmueble, barrio/zona y 1 o 2 rasgos concretos que la diferencien (ej. jardín, balcón, luminoso, reciclado, cochera, patio).
- Es un micro-resumen irresistible: quien lo lee entiende qué es y por qué vale la pena el clic, sin leer la ficha completa.
- PROHIBIDO en el título: "venta", "alquiler", "en venta", "en alquiler", precio, moneda (USD/ARS/$), m², y cualquier mención a "Propea", "Propea Group" o al portal.
- NO repitas lo que el usuario ya ve en la publicación: operación, precio, moneda, ni frases tipo aviso clasificado.
- Evitá títulos abstractos o poéticos que no describen el inmueble (ej. solo metáforas sin tipo, zona o rasgo).
- Tono: directo, humano, profesional — como un buen titular de inmobiliaria, no como IA ni listado de MercadoLibre.

Ejemplos MALOS: "Casa en Venta, 4 Ambientes, 100m², USD 100.000" · "Luz de tarde en City Bell" (no dice qué es) · "Propea Group presenta..." · "Departamento en alquiler en Centro".
Ejemplos BUENOS: "Casa 4 amb con jardín y cochera · City Bell" · "Depto 3 amb luminoso con balcón · Centro" · "PH reciclado, patio y parrilla · Villa Cacique".

ESTILO Y ESTRUCTURA ESPERADA PARA LA DESCRIPCIÓN:
1. Párrafo introductorio: Usa storytelling para describir la ubicación, el entorno y el potencial del inmueble (sin exagerar si no corresponde).
2. Secciones claras: Divide la información usando títulos legibles (Ej: "Espacio común:", "Área Privada:", "Memoria descriptiva:", "El edificio:", "Amenities:").
3. Viñetas: Usa guiones (-) para listar las características técnicas, terminaciones o equipamiento de forma limpia y escaneable.
4. Cierre: Un llamado a la acción amigable (Ej: "¡Contactanos y coordinamos una visita!").
5. Legales y Contacto: Si en las NOTAS DEL AGENTE hay nombres de martilleros, matrículas o avisos legales, cópialos EXACTAMENTE al final del texto.

REGLAS ESTRICTAS (título y descripción):
- NUNCA menciones "Propea", "Propea Group" ni el nombre del portal. La publicación es de la inmobiliaria.
- NO hay límite de caracteres para la descripción. Queremos un texto largo, maquetado y sumamente profesional.
- Si hay una imagen adjunta, analízala. Si se ve estándar, antigua o a refaccionar, ESTÁ PROHIBIDO usar palabras como 'lujo', 'exclusivo', 'premium' o 'sofisticado'. Sé honesto con la realidad visual.
- En la descripción sí integrá operación, precio y datos técnicos cuando correspondan; en el título NO.
- IMPORTANTE: Como devolverás un JSON, asegúrate de escapar correctamente las comillas internas (\\") y los saltos de línea (\\n) en el campo "descripcion" para no invalidar el formato JSON.

Devuelve el resultado ESTRICTAMENTE en JSON con el siguiente formato: 
{ 
  "titulo": "Ej: Casa 4 amb con jardín y cochera · City Bell", 
  "descripcion": "Texto completo aquí..." 
}`;
}

const TITULO_MAX_CHARS = 52;

const TITULO_BANNED =
  /\b(propea(\s+group)?|en\s+venta|en\s+alquiler|venta|alquiler|usd|ars|u\$d|\$)\b/gi;

function enforceTituloGancho(titulo: string): string {
  let t = titulo.trim().replace(/\s+/g, ' ');
  t = t.replace(TITULO_BANNED, '').replace(/\s+/g, ' ').replace(/\s*·\s*·/g, ' · ').trim();
  t = t.replace(/^[·,\-–—]\s*|[·,\-–—]\s*$/g, '').trim();
  if (t.length > TITULO_MAX_CHARS) {
    const cut = t.slice(0, TITULO_MAX_CHARS);
    const lastSpace = cut.lastIndexOf(' ');
    t = (lastSpace > 22 ? cut.slice(0, lastSpace) : cut).trim();
  }
  return t;
}

function parseTituloDescripcion(raw: string): { titulo: string; descripcion: string } {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence) text = fence[1].trim();

  const decoded: unknown = JSON.parse(text);
  const parsed = aiGeneratedTextSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new Error('Respuesta inválida del modelo.');
  }
  const titulo = enforceTituloGancho(parsed.data.titulo);
  const descripcion = parsed.data.descripcion;
  if (!titulo || !descripcion) {
    throw new Error('Faltan título o descripción en la respuesta.');
  }
  return { titulo, descripcion };
}

function responseTextSafe(result: GenerateContentResult): string {
  try {
    return result.response.text();
  } catch {
    return '';
  }
}

export async function POST(request: NextRequest) {
  return runRouteHandler(request, 'ai.property_text.failed', async () => {
    const context = await requirePanelTenant();
    const environment = getServerEnvironment();
    const apiKey = environment.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError('EXTERNAL_UNAVAILABLE', {
        message: 'La generación de textos con IA no está disponible.',
      });
    }
    const rate = await configuredRateLimitStore().consume(`ai:text:user:${context.user.id}`, {
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      throw new ApiError('RATE_LIMITED', { retryAfterSeconds: rate.retryAfterSeconds });
    }
    const body = await parseJsonBody(
      request,
      aiTextRequestSchema,
      REQUEST_LIMITS.aiTextJsonBytes,
    );
    const prompt = buildStrictPrompt(body.notasIA, techLineFromPayload(body.data));
    const cover = body.portadaBase64
      ? parseImageDataUrl(
          `data:image/jpeg;base64,${body.portadaBase64.replace(/\s/gu, '')}`,
          REQUEST_LIMITS.aiCoverImageBytes,
          ['image/jpeg'],
        )
      : null;
    if (body.portadaBase64 && !cover) {
      throw new ApiError('VALIDATION_ERROR', {
        message: 'La portada no es JPEG válido o supera el tamaño permitido.',
      });
    }
    const modelName = environment.GEMINI_MODEL ?? 'gemini-2.5-flash';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }, { timeout: 20_000 });

    let text: string;
    if (cover) {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: cover.base64,
            mimeType: 'image/jpeg',
          },
        },
      ]);
      text = responseTextSafe(result);
    } else {
      const result = await model.generateContent(prompt);
      text = responseTextSafe(result);
    }

    const { titulo, descripcion } = parseTituloDescripcion(text);

    return NextResponse.json({ titulo, descripcion });
  });
}
