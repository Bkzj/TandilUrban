import { hash } from 'bcryptjs';
import { Prisma, RolUsuario } from '@prisma/client';
import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { requireTenantAdministrator } from '@/lib/panel-authorization';
import { prisma } from '@/lib/prisma';
import { runRouteHandler } from '@/lib/route-handler';
import { createAgentSchema } from '@/lib/validation/auth';
import { identifierSchema } from '@/lib/validation/common';
import { REQUEST_LIMITS } from '@/lib/validation/limits';
import { parseJsonBody } from '@/lib/validation/request';

export async function GET(request: Request) {
  return runRouteHandler(request, 'panel.team_list.failed', async () => {
    const { inmobiliariaId } = await requireTenantAdministrator();
    const agentes = await prisma.user.findMany({
      where: { agenciaId: inmobiliariaId, rol: RolUsuario.AGENTE },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
        emailVerifiedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ agentes });
  });
}
export async function POST(request: Request) {
  return runRouteHandler(request, 'panel.team_create.failed', async () => {
    const { inmobiliariaId } = await requireTenantAdministrator();
    const payload = await parseJsonBody(request, createAgentSchema, REQUEST_LIMITS.authJsonBytes);
    const exists = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });
    if (exists) throw new ApiError('CONFLICT', { message: 'Ya existe una cuenta con ese email.' });

    try {
      const agente = await prisma.user.create({
        data: {
          nombre: payload.nombre,
          email: payload.email,
          passwordHash: await hash(payload.password, 12),
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError('CONFLICT', { message: 'Ya existe una cuenta con ese email.' });
      }
      throw error;
    }
  });
}

export async function DELETE(request: Request) {
  return runRouteHandler(request, 'panel.team_delete.failed', async () => {
    const { inmobiliariaId } = await requireTenantAdministrator();
    const parsedId = identifierSchema.safeParse(new URL(request.url).searchParams.get('id'));
    if (!parsedId.success) throw new ApiError('VALIDATION_ERROR', { message: 'El agente es inválido.' });
    const agent = await prisma.user.findFirst({
      where: { id: parsedId.data, agenciaId: inmobiliariaId, rol: RolUsuario.AGENTE },
      select: { id: true },
    });
    if (!agent) throw new ApiError('NOT_FOUND', { message: 'Agente no encontrado.' });
    await prisma.user.delete({ where: { id: agent.id } });
    return NextResponse.json({ ok: true });
  });
}
