import { NextRequest, NextResponse } from 'next/server';
import type { GenerateContentResult } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RolUsuario } from '@prisma/client';

import { AuthError, getCurrentUser } from '@/lib/auth';

function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

/** Misma política que publicación de propiedades: solo dueño de agencia o agente asignado. */
async function requirePanelPublisher() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, 'Tenés que iniciar sesión.');
  }
  if (
    (user.rol === RolUsuario.INMOBILIARIA && user.inmobiliariaPerfil) ||
    (user.rol === RolUsuario.AGENTE && user.agenciaId)
  ) {
    return user;
  }
  throw new AuthError(403, 'Tu cuenta no puede usar esta función.');
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
  const notasInsertadas = agentNotes.trim() || "Ninguna nota adicional";
  return `Eres un copywriter inmobiliario profesional en Argentina. Escribes con honestidad y persuasión. TAREA: Redacta un título (máx 60 chars) y descripción (máx 800 chars) para esta propiedad.
DATOS TÉCNICOS: ${datosTecnicosInsertados}.
NOTAS DEL AGENTE (CRÍTICO): ${notasInsertadas}.
REGLAS:

Si hay una imagen adjunta, analízala. Si se ve estándar, vieja o a refaccionar, ESTÁ PROHIBIDO usar palabras como 'lujo', 'exclusivo', 'premium' o 'sofisticado'.

Respeta estrictamente si es Alquiler o Venta y el Precio/Moneda.

Si el agente dejó NOTAS DEL AGENTE (ej: requisitos, solo estudiantes, temporal), DEBES integrarlas de forma natural y destacada en la descripción.
Devuelve el resultado ESTRICTAMENTE en JSON con formato: { "titulo": "...", "descripcion": "..." }.`;
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
  const titulo = typeof o.titulo === 'string' ? o.titulo.trim() : '';
  const descripcion = typeof o.descripcion === 'string' ? o.descripcion.trim() : '';
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
    await requirePanelPublisher();

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
