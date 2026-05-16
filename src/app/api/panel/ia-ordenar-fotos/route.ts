import { NextRequest, NextResponse } from 'next/server';
import type { GenerateContentResult, Part } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RolUsuario } from '@prisma/client';

import { AuthError, assertNotPublicPortalUser, getCurrentUser } from '@/lib/auth';

function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

/** Misma política que publicación / generar-textos: agencia o agente con agencia. */
async function requirePanelPublisher() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, 'Tenés que iniciar sesión.');
  }
  assertNotPublicPortalUser(user);
  if (
    (user.rol === RolUsuario.INMOBILIARIA && user.inmobiliariaPerfil) ||
    (user.rol === RolUsuario.AGENTE && user.agenciaId)
  ) {
    return user;
  }
  throw new AuthError(403, 'Tu cuenta no puede usar esta función.');
}

function responseTextSafe(result: GenerateContentResult): string {
  try {
    return result.response.text();
  } catch {
    return '';
  }
}

function parseClasificaciones(raw: string, expectedCount: number): { index: number; categoria: string }[] {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence) text = fence[1].trim();

  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('La IA no devolvió un arreglo JSON.');
  }

  const map = new Map<number, string>();
  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const index = typeof o.index === 'number' && Number.isInteger(o.index) ? o.index : null;
    const categoria =
      typeof o.categoria === 'string' ? o.categoria.trim() : String(o.categoria ?? '').trim();
    if (index === null || index < 0 || index >= expectedCount || !categoria) continue;
    map.set(index, categoria);
  }

  const out: { index: number; categoria: string }[] = [];
  for (let i = 0; i < expectedCount; i++) {
    out.push({ index: i, categoria: map.get(i) ?? 'Sin clasificar' });
  }

  return out;
}

function buildPrompt(layoutContext: string, imageCount: number): string {
  const layout =
    layoutContext.trim() ||
    '(No se indicó distribución detallada; inferí espacios habituales según las fotos.)';

  return `Eres un tasador inmobiliario experto. Aquí tienes fotos de una propiedad que tiene esta distribución (texto del agente):

"${layout}"

Tu tarea es asignar una categoría breve y útil a cada foto. El orden de las fotos es EXACTAMENTE el orden en que te las paso: la primera imagen después de este texto es índice 0, la segunda índice 1, y así hasta ${imageCount - 1}.

Devolvé ÚNICAMENTE un JSON array (sin texto adicional) con este formato estricto:
[{"index":0,"categoria":"Living"},{"index":1,"categoria":"Cocina"}]

Usá categorías lógicas en español como: Fachada, Living, Comedor, Cocina, Habitación 1, Habitación 2, Baño 1, Baño 2, Pasillo, Patio, Quincho, Cochera, Depósito, Vista exterior, Detalle, Otro.

Hay exactamente ${imageCount} fotos: incluí una entrada por cada índice de 0 a ${imageCount - 1}.`;
}

export async function POST(request: NextRequest) {
  try {
    await requirePanelPublisher();

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
