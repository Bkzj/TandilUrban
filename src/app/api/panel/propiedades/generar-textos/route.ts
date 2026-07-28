import { NextRequest, NextResponse } from 'next/server';
import type { GenerateContentResult } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthError } from '@/lib/auth';
import { requirePanelTenant } from '@/lib/panel-authorization';

function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

function techLineFromPayload(payload: Record<string, unknown>): string {
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
  const caracteristicas = Array.isArray(payload.caracteristicas)
    ? (payload.caracteristicas as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
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

function sanitizeBase64(input: unknown): string | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  let s = input.trim();
  const dataUrlMatch = /^data:image\/[\w+.+-]+;base64,/i.exec(s);
  if (dataUrlMatch) s = s.slice(dataUrlMatch[0].length);
  return s.replace(/\s/g, '');
}

function parseTituloDescripcion(raw: string): { titulo: string; descripcion: string } {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence) text = fence[1].trim();

  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Respuesta inválida del modelo.');
  }
  const o = parsed as Record<string, unknown>;
  const tituloRaw = typeof o.titulo === 'string' ? o.titulo.trim() : '';
  const descripcion = typeof o.descripcion === 'string' ? o.descripcion.trim() : '';
  const titulo = enforceTituloGancho(tituloRaw);
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
  try {
    await requirePanelTenant();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) {
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
    const data = body.data;
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Falta data con el formulario de la propiedad.' }, { status: 400 });
    }

    const payload = data as Record<string, unknown>;
    const notasIA =
      typeof body.notasIA === 'string' ? body.notasIA : typeof body.notasIA === 'number' ? String(body.notasIA) : '';
    const techLine = techLineFromPayload(payload);
    const prompt = buildStrictPrompt(notasIA, techLine);

    const portadaBase64 = sanitizeBase64(body.portadaBase64);

    const modelName =
      process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    let text: string;
    if (portadaBase64) {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: portadaBase64,
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
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    console.error('[POST /api/panel/propiedades/generar-textos]', error);
    const message =
      error instanceof Error ? error.message : 'No se pudieron generar los textos con IA.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
