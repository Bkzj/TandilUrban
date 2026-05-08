import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida. Cargá tu .env antes de ejecutar el seed.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const unsplash = {
  modernHouse1:
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2070&q=90&auto=format&fit=crop',
  modernHouse2:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2070&q=90&auto=format&fit=crop',
  modernHouse3:
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=2069&q=90&auto=format&fit=crop',
  apartment1:
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=2080&q=90&auto=format&fit=crop',
  apartment2:
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=2070&q=90&auto=format&fit=crop',
  interior1:
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=2053&q=90&auto=format&fit=crop',
  facade1:
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=2070&q=90&auto=format&fit=crop',
  loft1:
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=2070&q=90&auto=format&fit=crop',
  kitchen1:
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=2070&q=90&auto=format&fit=crop',
  living1:
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=2074&q=90&auto=format&fit=crop',
  pool1:
    'https://images.unsplash.com/photo-1600585152911-d8bec054a0ae?w=2070&q=90&auto=format&fit=crop',
  ruralEstate:
    'https://images.unsplash.com/photo-1570129477498-9136dfeb6f72?w=2071&q=90&auto=format&fit=crop',
};

async function main() {
  console.log('Limpiando base de datos...');
  await prisma.$transaction([
    prisma.contacto.deleteMany(),
    prisma.propiedad.deleteMany(),
    prisma.puntoInteres.deleteMany(),
    prisma.inmobiliaria.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordAdmin = await hash('Admin123!', 12);
  const passwordInmobiliaria = await hash('Immo123!', 12);

  console.log('Creando usuarios...');
  const admin = await prisma.user.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@tandilurban.local',
      passwordHash: passwordAdmin,
      rol: 'ADMIN',
    },
  });

  const userInmobiliaria = await prisma.user.create({
    data: {
      nombre: 'Laura Martínez',
      email: 'inmobiliaria@tandilurban.local',
      passwordHash: passwordInmobiliaria,
      rol: 'INMOBILIARIA',
    },
  });

  console.log('Creando inmobiliaria de prueba...');
  const inmobiliaria = await prisma.inmobiliaria.create({
    data: {
      userId: userInmobiliaria.id,
      nombreAgencia: 'Tandil Premium Propiedades',
      cuit: '30-71234567-8',
      direccion: 'Av. Avellaneda 425, Tandil',
      logoAgencia:
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&q=80&auto=format&fit=crop',
    },
  });

  console.log('Creando propiedades en Tandil...');
  await prisma.propiedad.createMany({
    data: [
      {
        inmobiliariaId: inmobiliaria.id,
        titulo: 'Casa contemporánea en El Dique',
        descripcion:
          'Amplia casa con líneas modernas, luminosidad norte y jardín privado. Ubicación estratégica cerca de espacios verdes y accesos principales.',
        tipo: 'Casa',
        operacion: 'Venta',
        precio: 285000,
        moneda: 'USD',
        expensas: null,
        direccion: 'Pasaje Los Alamos 312',
        barrio: 'El Dique',
        latitud: -37.2984,
        longitud: -59.1182,
        m2Total: 420,
        m2Cubiertos: 210,
        ambientes: 5,
        caracteristicas: ['Jardín', 'Quincho', 'Garaje doble', 'Cocina integrada'],
        imagenes: [
          unsplash.modernHouse1,
          unsplash.modernHouse2,
          unsplash.interior1,
          unsplash.facade1,
        ],
      },
      {
        inmobiliariaId: inmobiliaria.id,
        titulo: 'Departamento premium en Centro',
        descripcion:
          'Unidad de dos dormitorios en piso alto con vista panorámica, amenities y terminaciones de categoría.',
        tipo: 'Departamento',
        operacion: 'Alquiler',
        precio: 520000,
        moneda: 'ARS',
        expensas: 85000,
        direccion: '9 de Julio 850, piso 8',
        barrio: 'Centro',
        latitud: -37.3219,
        longitud: -59.1339,
        m2Total: 95,
        m2Cubiertos: 82,
        ambientes: 3,
        caracteristicas: ['Balcón terraza', 'Pileta en edificio', 'Seguridad 24h'],
        imagenes: [unsplash.apartment1, unsplash.apartment2, unsplash.living1, unsplash.kitchen1],
      },
      {
        inmobiliariaId: inmobiliaria.id,
        titulo: 'Loft tipo estudio en zona universitaria',
        descripcion:
          'Ideal profesionales o estudiantes de posgrado. Espacio diáfano con altura regulable y muebles premium.',
        tipo: 'Departamento',
        operacion: 'Alquiler',
        precio: 380000,
        moneda: 'ARS',
        expensas: 45000,
        direccion: 'Constitución 1400',
        barrio: 'Universidad',
        latitud: -37.3195,
        longitud: -59.1298,
        m2Total: 54,
        m2Cubiertos: 54,
        ambientes: 2,
        caracteristicas: ['Altillo', 'Ventanal full', 'Sommier vestidor'],
        imagenes: [unsplash.loft1, unsplash.interior1, unsplash.facade1, unsplash.modernHouse3],
      },
      {
        inmobiliariaId: inmobiliaria.id,
        titulo: 'Casa quinta con pileta — Las Delicias',
        descripcion:
          'Tranquilidad absoluta en entorno arborizado: parrillero techado, pileta rectangular y pérgola liviana.',
        tipo: 'Casa',
        operacion: 'Venta',
        precio: 198000,
        moneda: 'USD',
        expensas: null,
        direccion: 'Ruta 226 km 12, Las Delicias',
        barrio: 'Las Delicias',
        latitud: -37.3562,
        longitud: -59.0684,
        m2Total: 1800,
        m2Cubiertos: 240,
        ambientes: 6,
        caracteristicas: ['Pileta', 'Quincho', 'Depósito', 'Dos lotes cercados'],
        imagenes: [unsplash.pool1, unsplash.ruralEstate, unsplash.facade1, unsplash.interior1],
      },
      {
        inmobiliariaId: inmobiliaria.id,
        titulo: 'Dúplex a estrenar en Altos del Valle',
        descripcion:
          'Últimas unidades. Doble entrada, luminaria LED y pisos vinílico premium. Excelente valoración futura.',
        tipo: 'Casa',
        operacion: 'Venta',
        precio: 165000,
        moneda: 'USD',
        expensas: null,
        direccion: 'Av. Buzón 1850',
        barrio: 'Altos del Valle',
        latitud: -37.3112,
        longitud: -59.1521,
        m2Total: 310,
        m2Cubiertos: 185,
        ambientes: 4,
        caracteristicas: ['A estrenar', 'Cochera semicubierta', 'Patio'],
        imagenes: [unsplash.modernHouse3, unsplash.modernHouse1, unsplash.kitchen1, unsplash.living1],
      },
    ],
  });

  console.log('Creando puntos de interés...');
  await prisma.puntoInteres.createMany({
    data: [
      {
        nombre: 'Hospital Santamarina',
        categoria: 'HOSPITAL',
        latitud: -37.3271,
        longitud: -59.1442,
      },
      {
        nombre: 'UNCPBA — Catedral Tandil',
        categoria: 'UNIVERSIDAD',
        latitud: -37.3198,
        longitud: -59.1274,
      },
      {
        nombre: 'Parque Independencia',
        categoria: 'PARQUE',
        latitud: -37.3254,
        longitud: -59.1357,
      },
      {
        nombre: 'Parada transporte — Av. Buzón y Colombres',
        categoria: 'PARADA_BUS',
        latitud: -37.3126,
        longitud: -59.1401,
      },
      {
        nombre: 'Parada transporte — 9 de Julio y Garibaldi',
        categoria: 'PARADA_BUS',
        latitud: -37.3228,
        longitud: -59.1325,
      },
      {
        nombre: 'Paseo de las Flores (área verde)',
        categoria: 'PARQUE',
        latitud: -37.3189,
        longitud: -59.1386,
      },
    ],
  });

  console.log('Seed completado.');
  console.log(`   Admin ID: ${admin.id} — admin@tandilurban.local / Admin123!`);
  console.log(
    `   Inmobiliaria: ${inmobiliaria.nombreAgencia} — inmobiliaria@tandilurban.local / Immo123!`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
