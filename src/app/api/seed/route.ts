// src/app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Primero limpiamos la base de datos para no duplicar si recargas la página
    await prisma.propiedad.deleteMany({});

    // 2. Inyectamos 3 propiedades de prueba
    await prisma.propiedad.createMany({
      data: [
        {
          titulo: "Chalet Histórico 100 Años",
          descripcion: "Hermosa propiedad restaurada con detalles de categoría.",
          precio: 320000,
          moneda: "USD",
          tipo: "Casa",
          operacion: "Venta",
          latitud: -37.32167,
          longitud: -59.13316,
          m2Total: 276,
          m2Cubierto: 276,
          ambientes: 5,
          dormitorios: 4,
          banos: 2,
          toilettes: 1,
          plantas: 1,
          antiguedadAnos: 100,
          esSustentable: false,
          imagenes: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop"],
          ambientesExtra: ["Comedor de diario", "Dependencia servicio", "Escritorio"],
          servicios: ["Gas Natural", "Fibra Óptica"],
          comodidades: ["Aire Acondicionado", "Calefacción"]
        },
        {
          titulo: "Casa Moderna Eco-Friendly en las Sierras",
          descripcion: "Diseño minimalista con paneles solares y vista al lago.",
          precio: 450000,
          moneda: "USD",
          tipo: "Casa",
          operacion: "Venta",
          latitud: -37.33000,
          longitud: -59.14000,
          m2Total: 400,
          m2Cubierto: 250,
          m2Semicubierto: 50,
          ambientes: 4,
          dormitorios: 3,
          banos: 3,
          toilettes: 0,
          plantas: 2,
          antiguedadAnos: 2,
          esSustentable: true, // ¡Esta tiene el sello sustentable!
          imagenes: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop"],
          ambientesExtra: ["Lavadero", "Terraza", "Patio"],
          servicios: ["Agua Corriente", "Fibra Óptica"],
          comodidades: ["Piscina", "Losa Radiante", "Parrilla"]
        },
        {
          titulo: "Departamento Céntrico Premium",
          descripcion: "Ideal inversión. A dos cuadras de la plaza principal.",
          precio: 85000,
          moneda: "USD",
          tipo: "Departamento",
          operacion: "Venta",
          latitud: -37.32800,
          longitud: -59.13500,
          m2Total: 65,
          m2Cubierto: 60,
          m2Semicubierto: 5,
          ambientes: 2,
          dormitorios: 1,
          banos: 1,
          toilettes: 0,
          plantas: 1,
          antiguedadAnos: 5,
          esSustentable: false,
          imagenes: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop"],
          ambientesExtra: ["Balcón"],
          servicios: ["Gas Natural", "Cloacas"],
          comodidades: ["Calefacción Radiadores"]
        }
      ]
    });

    return NextResponse.json({ message: "¡3 propiedades creadas con éxito!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear propiedades" }, { status: 500 });
  }
}