import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { Prisma, RolUsuario } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { AuthError, requireInmobiliariaMain } from '@/lib/auth';

// =============================================================================
// Helpers
// =============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

type CreateAgentePayload = { nombre: string; email: string; password: string };

function validarCreate(body: unknown):
  | { ok: true; data: CreateAgentePayload }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'El cuerpo de la solicitud es invalido.' };
  }

  const { nombre, email, password } = body as Record<string, unknown>;

  if (typeof nombre !== 'string' || nombre.trim().length < 2) {
    return { ok: false, error: 'El nombre debe tener al menos 2 caracteres.' };
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'El email no es válido.' };
  }
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, error: 'La contraseña temporal debe tener al menos 8 caracteres.' };
  }

  return {
    ok: true,
    data: {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      password,
    },
  };
}

// =============================================================================
// GET — listar agentes de la agencia del MAIN logueado
// =============================================================================

export async function GET() {
  try {
    const { inmobiliariaId } = await requireInmobiliariaMain();

    const agentes = await prisma.user.findMany({
      where: {
        agenciaId: inmobiliariaId,
        rol: RolUsuario.AGENTE,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
        emailVerifiedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ agentes });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error('[GET /api/panel/equipo]', error);
    return NextResponse.json({ error: 'No se pudo obtener el equipo.' }, { status: 500 });
  }
}

// =============================================================================
// POST — crea un agente hijo en la agencia del MAIN logueado
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { inmobiliariaId } = await requireInmobiliariaMain();

    const body = await request.json();
    const payload = validarCreate(body);
    if (!payload.ok) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const existe = await prisma.user.findUnique({
      where: { email: payload.data.email },
      select: { id: true },
    });
    if (existe) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email.' }, { status: 409 });
    }

    const passwordHash = await hash(payload.data.password, 12);

    const agente = await prisma.user.create({
      data: {
        nombre: payload.data.nombre,
        email: payload.data.email,
        passwordHash,
        rol: RolUsuario.AGENTE,
        agenciaId: inmobiliariaId,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
        emailVerifiedAt: true,
      },
    });

    return NextResponse.json({ agente }, { status: 201 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email.' }, { status: 409 });
    }
    console.error('[POST /api/panel/equipo]', error);
    return NextResponse.json({ error: 'No se pudo crear el agente.' }, { status: 500 });
  }
}

// =============================================================================
// DELETE — elimina un agente solo si es de la misma agencia
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { inmobiliariaId } = await requireInmobiliariaMain();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Falta el id del agente.' }, { status: 400 });
    }

    const agente = await prisma.user.findUnique({
      where: { id },
      select: { id: true, agenciaId: true, rol: true },
    });

    if (
      !agente ||
      agente.agenciaId !== inmobiliariaId ||
      agente.rol !== RolUsuario.AGENTE
    ) {
      // 404 sin filtrar info: el atacante no descubre ids ajenos.
      return NextResponse.json({ error: 'Agente no encontrado.' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error('[DELETE /api/panel/equipo]', error);
    return NextResponse.json({ error: 'No se pudo eliminar al agente.' }, { status: 500 });
  }
}
