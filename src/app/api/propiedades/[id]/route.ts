// src/app/api/propiedades/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  // 1. Le decimos que params es una Promesa
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // 2. Esperamos (await) a que los parámetros estén listos
    const resolvedParams = await params; 
    const id = resolvedParams.id;

    const propiedad = await prisma.propiedad.findUnique({
      where: { id: id },
    });

    if (!propiedad) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    return NextResponse.json(propiedad);
  } catch (error) {
    return NextResponse.json({ error: "Error al buscar la propiedad" }, { status: 500 });
  }
}