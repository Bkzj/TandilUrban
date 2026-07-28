import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient, RolUsuario } from '../src/generated/prisma';
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

type RestoredProperty = {
  titulo: string;
  descripcion: string;
  operacion: string;
  tipo: string;
  precio: string;
  moneda: 'ARS' | 'USD';
  m2Total: number;
  m2Cubiertos: number;
  ambientes: number;
  dormitorios: number;
  direccion: string;
  barrio: string;
  latitud: number;
  longitud: number;
  expensas: string | null;
  caracteristicas: string[];
  imagenes: { url: string; public_id: string; categoria: string }[];
};

function loadRestoredProperties(): RestoredProperty[] {
  const path = join(process.cwd(), 'prisma/data/cloudinary-properties.json');
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { properties: RestoredProperty[] };
  if (!Array.isArray(raw.properties) || raw.properties.length === 0) {
    throw new Error(
      'Falta prisma/data/cloudinary-properties.json. Ejecutá: npx tsx scripts/build-cloudinary-restore-json.ts',
    );
  }
  return raw.properties;
}

async function main() {
  const restored = loadRestoredProperties();

  console.log('Limpiando base de datos...');
  await prisma.$transaction([
    prisma.contacto.deleteMany(),
    prisma.propiedad.deleteMany(),
    prisma.puntoInteres.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.inmobiliaria.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordAdmin = await hash('Admin123!', 12);
  const passwordInmobiliaria = await hash('Immo123!', 12);
  const passwordTandilProp = await hash('12345678', 12);

  console.log('Creando usuarios...');
  await prisma.user.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@tandilurban.local',
      passwordHash: passwordAdmin,
      rol: RolUsuario.ADMIN,
    },
  });

  const mainUser = await prisma.user.create({
    data: {
      nombre: 'Laura Martínez',
      email: 'inmobiliaria@tandilurban.local',
      passwordHash: passwordInmobiliaria,
      rol: RolUsuario.INMOBILIARIA,
      telefono: '+54 249 456-1200',
      emailVerifiedAt: new Date(),
    },
  });

  const inmobiliaria = await prisma.inmobiliaria.create({
    data: {
      userId: mainUser.id,
      nombreAgencia: 'Tandil Premium Propiedades',
      cuit: '30-71234567-8',
      direccion: 'Av. Avellaneda 425, Tandil',
      bio: 'Cartera real restaurada desde Cloudinary. Especialistas en casas y departamentos en Tandil.',
      destacada: true,
      logoAgencia:
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=85&auto=format&fit=crop',
      logoUrl:
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=85&auto=format&fit=crop',
    },
  });

  /** Cuenta alternativa usada en pruebas del panel (TandilProp VIP). */
  const tandilPropMain = await prisma.user.create({
    data: {
      nombre: 'Agustín (Main)',
      email: 'admin@tandilprop.com',
      passwordHash: passwordTandilProp,
      rol: RolUsuario.INMOBILIARIA,
      telefono: '+54 249 400-0000',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.inmobiliaria.create({
    data: {
      userId: tandilPropMain.id,
      nombreAgencia: 'TandilProp VIP',
      cuit: '30-88888888-1',
      direccion: 'Av. Colón 200, Tandil',
      bio: 'Perfil de pruebas del backoffice.',
      destacada: false,
      logoAgencia:
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=85&auto=format&fit=crop',
      logoUrl:
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=85&auto=format&fit=crop',
    },
  });

  console.log('Creando agente de ejemplo (podés editarlo desde Mi equipo)...');
  const agente = await prisma.user.create({
    data: {
      nombre: 'Sofía Ríos',
      email: 'agente@tandilurban.local',
      passwordHash: passwordInmobiliaria,
      rol: RolUsuario.AGENTE,
      agenciaId: inmobiliaria.id,
      telefono: '+54 249 456-1201',
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Restaurando ${restored.length} propiedades con fotos de Cloudinary...`);
  for (const p of restored) {
    await prisma.propiedad.create({
      data: {
        inmobiliariaId: inmobiliaria.id,
        agenteId: agente.id,
        titulo: p.titulo,
        descripcion: p.descripcion,
        estado: 'DISPONIBLE',
        tipo: p.tipo,
        operacion: p.operacion,
        precio: String(p.precio),
        moneda: p.moneda,
        expensas: p.expensas === null ? null : String(p.expensas),
        direccion: p.direccion,
        barrio: p.barrio,
        latitud: p.latitud,
        longitud: p.longitud,
        m2Total: p.m2Total,
        m2Cubiertos: p.m2Cubiertos,
        ambientes: p.ambientes,
        dormitorios: p.dormitorios,
        banos: p.tipo === 'Departamento' ? 1 : 2,
        caracteristicas: p.caracteristicas,
        imagenes: p.imagenes,
        visitas: Math.floor(Math.random() * 40) + 5,
        consultas: Math.floor(Math.random() * 8),
      },
    });
  }

  const poiCount = await prisma.puntoInteres.count();
  if (poiCount === 0) {
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
  }

  console.log('Seed completado (datos reales desde Cloudinary).');
  console.log(`   ${restored.length} propiedades — fotos en res.cloudinary.com`);
  console.log('   Main (cartera): inmobiliaria@tandilurban.local / Immo123!');
  console.log('   Agente: agente@tandilurban.local / Immo123!');
  console.log('   Alt panel: admin@tandilprop.com / 12345678');
  console.log('   Admin: admin@tandilurban.local / Admin123!');
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
