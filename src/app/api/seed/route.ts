// Mantener en línea con database/schema.prisma (Propiedad + relación obligatoria).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const inmobiliaria = await prisma.inmobiliaria.findFirst();
    if (!inmobiliaria) {
      return NextResponse.json(
        {
          error:
            'No hay ninguna inmobiliaria en la base. Ejecutá `npm run db:seed` para cargar datos de prueba.',
        },
        { status: 400 }
      );
    }

    await prisma.propiedad.deleteMany({ where: { inmobiliariaId: inmobiliaria.id } });

    await prisma.propiedad.createMany({
      data: [
        {
          inmobiliariaId: inmobiliaria.id,
          titulo: 'Chalet histórico 100 años',
          descripcion:
            'Propiedad restaurada con detalle de autor y ubicación destacada.',
          estado: 'DISPONIBLE',
          tipo: 'Casa',
          operacion: 'Venta',
          precio: 320000,
          moneda: 'USD',
          direccion: 'Av. Francia 980',
          barrio: 'Centro',
          latitud: -37.32167,
          longitud: -59.13316,
          m2Total: 276,
          m2Cubiertos: 220,
          ambientes: 5,
          caracteristicas: ['Jardín', 'Quincho', 'Pieza de servicio', 'Fibra Óptica'],
          imagenes: [
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=2069&q=90&auto=format&fit=crop',
          ],
        },
        {
          inmobiliariaId: inmobiliaria.id,
          titulo: 'Casa moderna eco-friendly en las sierras',
          descripcion: 'Diseño minimalista con buena orientación norte y vistas.',
          estado: 'DISPONIBLE',
          tipo: 'Casa',
          operacion: 'Venta',
          precio: 450000,
          moneda: 'USD',
          direccion: 'Camino Rural S/N km 8',
          barrio: 'Sierras',
          latitud: -37.33,
          longitud: -59.14,
          m2Total: 400,
          m2Cubiertos: 250,
          ambientes: 4,
          caracteristicas: ['Piscina', 'Parrilla', 'Paneles solares'],
          imagenes: [
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=2053&q=90&auto=format&fit=crop',
          ],
        },
        {
          inmobiliariaId: inmobiliaria.id,
          titulo: 'Departamento céntrico premium',
          descripcion: 'Ideal inversión. A dos cuadras de la plaza principal.',
          estado: 'DISPONIBLE',
          tipo: 'Departamento',
          operacion: 'Venta',
          precio: 85000,
          moneda: 'USD',
          direccion: '9 de Julio 612',
          barrio: 'Centro',
          latitud: -37.328,
          longitud: -59.135,
          m2Total: 65,
          m2Cubiertos: 60,
          ambientes: 2,
          caracteristicas: ['Balcón', 'Orientación norte'],
          imagenes: [
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop',
          ],
        },
      ],
    });

    return NextResponse.json({ message: '3 propiedades creadas con éxito (sobre datos de demo).' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al crear propiedades' }, { status: 500 });
  }
}
