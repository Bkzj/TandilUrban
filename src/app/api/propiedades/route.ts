import type { Prisma } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo');
    const operacion = searchParams.get('operacion');
    const barrio = searchParams.get('barrio'); // Leemos el nuevo parámetro

    const filtros: Prisma.PropiedadWhereInput = {};
    
    if (tipo && tipo !== 'Todos') filtros.tipo = tipo;
    if (operacion && operacion !== 'Todos') filtros.operacion = operacion;
    
    // Si escribió un barrio, buscamos que el campo lo contenga (sin importar mayúsculas/minúsculas)
    if (barrio) {
      filtros.barrio = {
        contains: barrio,
        mode: 'insensitive'
      };
    }

    const propiedades = await prisma.propiedad.findMany({
      where: filtros,
      orderBy: { precio: 'asc' }
    });

    return NextResponse.json(propiedades);
  } catch (error) {
    console.error("Error en API:", error);
    return NextResponse.json({ error: "Error al buscar propiedades" }, { status: 500 });
  }
}