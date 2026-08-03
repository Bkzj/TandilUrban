/**
 * Seed de demostración para inversores — cartera premium Tandil + CRM con métricas vivas.
 *
 * Ejecutar: npx tsx prisma/seed-demo.ts
 *          npm run db:seed-demo
 */
import 'dotenv/config';

import { PrismaClient, RolUsuario, EstadoContacto, EstadoPropiedad } from '../src/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida. Cargá tu .env antes de ejecutar el seed demo.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** Imágenes premium (Unsplash) — casas modernas / sierras. */
const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=85&auto=format&fit=crop',
] as const;

function imgs(...urls: string[]) {
  return urls.map((url, i) => ({
    url,
    public_id: null,
    categoria: i === 0 ? 'Portada' : 'Galería',
  }));
}

type DemoPropiedad = {
  titulo: string;
  descripcion: string;
  operacion: 'VENTA' | 'ALQUILER';
  tipo: string;
  precio: string;
  moneda: 'ARS' | 'USD';
  expensas: string | null;
  direccion: string;
  barrio: string;
  latitud: number;
  longitud: number;
  m2Total: number;
  m2Cubiertos: number;
  ambientes: number;
  dormitorios: number;
  banos: number;
  cocheras: number;
  caracteristicas: string[];
  estado: EstadoPropiedad;
  visitas: number;
  consultas: number;
  imageIndex: number;
};

const DEMO_PROPIEDADES: DemoPropiedad[] = [
  {
    titulo: 'Mansión contemporánea en Las Acacias',
    descripcion:
      'Residencia de autor en barrio cerrado con seguridad 24 h, pileta climatizada, quincho con parrilla y vista a la sierra. Ideal familia ejecutiva.',
    operacion: 'VENTA',
    tipo: 'Casa',
    precio: '320000.00',
    moneda: 'USD',
    expensas: null,
    direccion: 'Calle Los Eucaliptos 890, Barrio Las Acacias',
    barrio: 'Las Acacias',
    latitud: -37.2784,
    longitud: -59.1521,
    m2Total: 420,
    m2Cubiertos: 310,
    ambientes: 6,
    dormitorios: 4,
    banos: 3,
    cocheras: 2,
    caracteristicas: ['Pileta', 'Quincho', 'Seguridad 24h', 'Jardín', 'Cochera doble'],
    estado: EstadoPropiedad.DISPONIBLE,
    visitas: 342,
    consultas: 5,
    imageIndex: 0,
  },
  {
    titulo: 'Chalet con vista al Dique del Fuerte',
    descripcion:
      'Propiedad única a metros del dique. Deck de madera, living con hogar y suite principal con vestidor. Oportunidad de inversión turística.',
    operacion: 'VENTA',
    tipo: 'Casa',
    precio: '150000.00',
    moneda: 'USD',
    expensas: null,
    direccion: 'Camino al Dique km 2,5',
    barrio: 'Zona Dique',
    latitud: -37.3348,
    longitud: -59.1186,
    m2Total: 185,
    m2Cubiertos: 142,
    ambientes: 4,
    dormitorios: 3,
    banos: 2,
    cocheras: 1,
    caracteristicas: ['Vista panorámica', 'Deck', 'Hogar', 'Parrilla'],
    estado: EstadoPropiedad.DISPONIBLE,
    visitas: 218,
    consultas: 4,
    imageIndex: 1,
  },
  {
    titulo: 'Departamento premium en pleno Centro',
    descripcion:
      'Piso alto con amenities: gimnasio, SUM y terraza verde. Cochera fija y baulera. Excelente rentabilidad en alquiler temporario.',
    operacion: 'VENTA',
    tipo: 'Departamento',
    precio: '185000.00',
    moneda: 'USD',
    expensas: '95000.00',
    direccion: 'Av. Rivadavia 512, Piso 9',
    barrio: 'Centro',
    latitud: -37.3219,
    longitud: -59.1339,
    m2Total: 98,
    m2Cubiertos: 88,
    ambientes: 3,
    dormitorios: 2,
    banos: 2,
    cocheras: 1,
    caracteristicas: ['Amenities', 'Cochera', 'Baulera', 'Terraza'],
    estado: EstadoPropiedad.DISPONIBLE,
    visitas: 276,
    consultas: 3,
    imageIndex: 2,
  },
  {
    titulo: 'Casa con jardín en Valle Escondido',
    descripcion:
      'Arquitectura de sierra con grandes ventanales, parrilla techada y espacio home office. Barrio residencial de baja densidad.',
    operacion: 'ALQUILER',
    tipo: 'Casa',
    precio: '450000.00',
    moneda: 'ARS',
    expensas: null,
    direccion: 'Pasaje Los Robles 145',
    barrio: 'Valle Escondido',
    latitud: -37.2692,
    longitud: -59.1784,
    m2Total: 210,
    m2Cubiertos: 165,
    ambientes: 5,
    dormitorios: 3,
    banos: 2,
    cocheras: 2,
    caracteristicas: ['Home office', 'Parrilla', 'Jardín', 'Luminoso'],
    estado: EstadoPropiedad.DISPONIBLE,
    visitas: 189,
    consultas: 2,
    imageIndex: 3,
  },
  {
    titulo: 'Loft amueblado cerca de la peatonal',
    descripcion:
      'Unidad lista para habitar con diseño industrial-chic. Ideal profesional o pareja. Contrato anual con ajuste trimestral.',
    operacion: 'ALQUILER',
    tipo: 'Departamento',
    precio: '380000.00',
    moneda: 'ARS',
    expensas: '42000.00',
    direccion: 'San Martín 780, Loft B',
    barrio: 'Centro',
    latitud: -37.3235,
    longitud: -59.1312,
    m2Total: 72,
    m2Cubiertos: 72,
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    cocheras: 0,
    caracteristicas: ['Amueblado', 'Luminoso', 'Balcón'],
    estado: EstadoPropiedad.DISPONIBLE,
    visitas: 156,
    consultas: 1,
    imageIndex: 4,
  },
  {
    titulo: 'Residencia en Las Acacias — RESERVADA',
    descripcion:
      'Chalet en proceso de reserva con seña confirmada. Doble altura en living, suite en planta baja y dependencia de servicio.',
    operacion: 'VENTA',
    tipo: 'Casa',
    precio: '280000.00',
    moneda: 'USD',
    expensas: null,
    direccion: 'Calle Las Tipas 320, Barrio Las Acacias',
    barrio: 'Las Acacias',
    latitud: -37.2811,
    longitud: -59.1498,
    m2Total: 340,
    m2Cubiertos: 265,
    ambientes: 5,
    dormitorios: 3,
    banos: 3,
    cocheras: 2,
    caracteristicas: ['Suite PB', 'Doble altura', 'Dependencia', 'Pileta'],
    estado: EstadoPropiedad.RESERVADA,
    visitas: 412,
    consultas: 6,
    imageIndex: 5,
  },
];

type DemoLead = {
  nombre: string;
  email: string;
  telefono: string;
  mensaje: string;
  propiedadIndex: number;
  estado: EstadoContacto;
  visitasFisicas: number;
  daysAgo: number;
};

/** LEIDO = leads en seguimiento activo (equivalente a "en proceso" en la UI). */
const DEMO_LEADS: DemoLead[] = [
  {
    nombre: 'Juan Pérez',
    email: 'juan.perez@gmail.com',
    telefono: '+54 249 412-3456',
    mensaje: 'Buen día, me interesa coordinar una visita el fin de semana. ¿Tiene cochera doble?',
    propiedadIndex: 0,
    estado: EstadoContacto.NUEVO,
    visitasFisicas: 0,
    daysAgo: 0,
  },
  {
    nombre: 'María Gómez',
    email: 'maria.gomez@outlook.com',
    telefono: '+54 11 5566-7788',
    mensaje: 'Consulto si aceptan permuta por departamento en CABA. Gracias.',
    propiedadIndex: 0,
    estado: EstadoContacto.LEIDO,
    visitasFisicas: 2,
    daysAgo: 1,
  },
  {
    nombre: 'Carlos Fernández',
    email: 'cfernandez@empresa.com.ar',
    telefono: '+54 249 455-9012',
    mensaje: 'Somos familia con dos hijos, buscamos mudarnos antes de julio.',
    propiedadIndex: 0,
    estado: EstadoContacto.RESPONDIDO,
    visitasFisicas: 3,
    daysAgo: 3,
  },
  {
    nombre: 'Lucía Martínez',
    email: 'lucia.m@hotmail.com',
    telefono: '+54 249 401-2233',
    mensaje: '¿La propiedad del dique tiene escritura al día? Solicito planos.',
    propiedadIndex: 1,
    estado: EstadoContacto.NUEVO,
    visitasFisicas: 0,
    daysAgo: 0,
  },
  {
    nombre: 'Diego Ríos',
    email: 'drios.inversor@gmail.com',
    telefono: '+54 221 499-8877',
    mensaje: 'Evalúo compra para renta temporaria. ¿Cuál es la rentabilidad estimada?',
    propiedadIndex: 1,
    estado: EstadoContacto.LEIDO,
    visitasFisicas: 1,
    daysAgo: 2,
  },
  {
    nombre: 'Valentina Sosa',
    email: 'valen.sosa@yahoo.com',
    telefono: '+54 249 444-5566',
    mensaje: 'Me encantó la vista en las fotos. ¿Se puede visitar el jueves a la tarde?',
    propiedadIndex: 1,
    estado: EstadoContacto.NUEVO,
    visitasFisicas: 0,
    daysAgo: 1,
  },
  {
    nombre: 'Martín Acosta',
    email: 'macosta@tech.io',
    telefono: '+54 249 433-2100',
    mensaje: 'Busco piso alto con amenities para vivir yo. ¿Expensas actuales?',
    propiedadIndex: 2,
    estado: EstadoContacto.LEIDO,
    visitasFisicas: 2,
    daysAgo: 4,
  },
  {
    nombre: 'Camila Herrera',
    email: 'camila.h@empresa.com',
    telefono: '+54 249 422-7788',
    mensaje: 'Consulta por financiación bancaria y gastos de escrituración.',
    propiedadIndex: 2,
    estado: EstadoContacto.RESPONDIDO,
    visitasFisicas: 1,
    daysAgo: 6,
  },
  {
    nombre: 'Roberto Núñez',
    email: 'rnunez@gmail.com',
    telefono: '+54 249 411-9900',
    mensaje: 'Necesito alquiler anual con mascotas (labrador mediano). ¿Es posible?',
    propiedadIndex: 3,
    estado: EstadoContacto.NUEVO,
    visitasFisicas: 0,
    daysAgo: 0,
  },
  {
    nombre: 'Florencia Díaz',
    email: 'flor.diaz@outlook.com',
    telefono: '+54 249 400-1122',
    mensaje: 'Trabajo remoto, me interesa el home office. ¿Hay fibra óptica en la zona?',
    propiedadIndex: 3,
    estado: EstadoContacto.LEIDO,
    visitasFisicas: 3,
    daysAgo: 2,
  },
  {
    nombre: 'Gonzalo Vega',
    email: 'gvega@consultora.com',
    telefono: '+54 249 455-3344',
    mensaje: 'Loft para profesional soltero. ¿Incluye muebles y electrodomésticos?',
    propiedadIndex: 4,
    estado: EstadoContacto.NUEVO,
    visitasFisicas: 0,
    daysAgo: 1,
  },
  {
    nombre: 'Paula Benítez',
    email: 'paula.b@gmail.com',
    telefono: '+54 249 466-7788',
    mensaje: 'Quiero reservar visita para el sábado por la mañana.',
    propiedadIndex: 4,
    estado: EstadoContacto.LEIDO,
    visitasFisicas: 1,
    daysAgo: 3,
  },
  {
    nombre: 'Andrés Morales',
    email: 'amorales@inmobiliaria-test.com',
    telefono: '+54 249 477-8899',
    mensaje: 'Cliente mío pidió info de la casa reservada por si cae la operación.',
    propiedadIndex: 5,
    estado: EstadoContacto.LEIDO,
    visitasFisicas: 2,
    daysAgo: 1,
  },
  {
    nombre: 'Silvia Romero',
    email: 'sromero@fibertel.com.ar',
    telefono: '+54 249 488-9900',
    mensaje: 'Ya dejamos seña. Consulto fecha estimada de escritura.',
    propiedadIndex: 5,
    estado: EstadoContacto.RESPONDIDO,
    visitasFisicas: 3,
    daysAgo: 5,
  },
  {
    nombre: 'Facundo López',
    email: 'flopez@gmail.com',
    telefono: '+54 249 499-0011',
    mensaje: 'Interesado en la reserva si se libera. Prioridad alta.',
    propiedadIndex: 5,
    estado: EstadoContacto.NUEVO,
    visitasFisicas: 0,
    daysAgo: 0,
  },
];

async function limpiarBase() {
  console.log('🧹 Limpiando base de datos (orden FK)...');
  await prisma.$transaction([
    prisma.visitaFisicaEvento.deleteMany(),
    prisma.contacto.deleteMany(),
    prisma.propiedad.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.inmobiliaria.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function crearUsuariosDemo() {
  const passwordAdmin = await hash('Admin123!', 12);
  const passwordInmobiliaria = await hash('Immo123!', 12);

  console.log('👤 Creando usuarios demo...');

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
      nombreAgencia: 'Propea Group Tandil',
      cuit: '30-71234567-8',
      direccion: 'Av. Avellaneda 425, Tandil',
      bio: 'Cartera premium en sierras y barrios cerrados. Demo para inversores.',
      destacada: true,
      logoAgencia:
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=85&auto=format&fit=crop',
      logoUrl:
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=85&auto=format&fit=crop',
    },
  });

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

  return { inmobiliaria, agente, mainUser };
}

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10 + (days % 8), 30, 0, 0);
  return d;
}

async function main() {
  await limpiarBase();

  const { inmobiliaria, agente, mainUser } = await crearUsuariosDemo();

  console.log('🏡 Creando 6 propiedades premium en Tandil...');
  const propiedadIds: string[] = [];

  for (const p of DEMO_PROPIEDADES) {
    const url = DEMO_IMAGES[p.imageIndex];
    const created = await prisma.propiedad.create({
      data: {
        inmobiliariaId: inmobiliaria.id,
        agenteId: agente.id,
        titulo: p.titulo,
        descripcion: p.descripcion,
        estado: p.estado,
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
        banos: p.banos,
        cocheras: p.cocheras,
        caracteristicas: p.caracteristicas,
        imagenes: imgs(url, DEMO_IMAGES[(p.imageIndex + 1) % DEMO_IMAGES.length]),
        visitas: p.visitas,
        consultas: p.consultas,
      },
    });
    propiedadIds.push(created.id);
  }

  console.log('📩 Inyectando 15 leads con estados y visitas físicas...');
  let eventosCreados = 0;

  for (const lead of DEMO_LEADS) {
    const propiedadId = propiedadIds[lead.propiedadIndex]!;
    const contacto = await prisma.contacto.create({
      data: {
        nombre: lead.nombre,
        email: lead.email,
        telefono: lead.telefono,
        mensaje: lead.mensaje,
        propiedadId,
        estado: lead.estado,
        visitasFisicas: lead.visitasFisicas,
        createdAt: daysAgoDate(lead.daysAgo),
      },
    });

    if (lead.visitasFisicas > 0) {
      for (let i = 0; i < lead.visitasFisicas; i++) {
        const eventDate = daysAgoDate(lead.daysAgo + i);
        await prisma.visitaFisicaEvento.create({
          data: {
            contactoId: contacto.id,
            propiedadId,
            registradoPorId: mainUser.id,
            delta: 1,
            createdAt: eventDate,
          },
        });
        eventosCreados += 1;
      }
    }
  }

  const poiCount = await prisma.puntoInteres.count();
  if (poiCount === 0) {
    console.log('📍 Creando puntos de interés de referencia...');
    await prisma.puntoInteres.createMany({
      data: [
        { nombre: 'Hospital Santamarina', categoria: 'HOSPITAL', latitud: -37.3271, longitud: -59.1442 },
        { nombre: 'UNCPBA — Catedral Tandil', categoria: 'UNIVERSIDAD', latitud: -37.3198, longitud: -59.1274 },
        { nombre: 'Parque Independencia', categoria: 'PARQUE', latitud: -37.3254, longitud: -59.1357 },
      ],
    });
  }

  const totalVisitas = DEMO_PROPIEDADES.reduce((s, p) => s + p.visitas, 0);
  const nuevos = DEMO_LEADS.filter((l) => l.estado === EstadoContacto.NUEVO).length;
  const enSeguimiento = DEMO_LEADS.filter((l) => l.estado === EstadoContacto.LEIDO).length;
  const respondidos = DEMO_LEADS.filter((l) => l.estado === EstadoContacto.RESPONDIDO).length;

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  DEMO LISTA — Resumen de métricas');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Propiedades:     ${DEMO_PROPIEDADES.length} (3 venta · 2 alquiler · 1 reservada)`);
  console.log(`  Visitas web:     ${totalVisitas.toLocaleString('es-AR')} (embudo + top props)`);
  console.log(`  Leads (CRM):     ${DEMO_LEADS.length}`);
  console.log(`    · Nuevos:      ${nuevos}`);
  console.log(`    · En seguimiento (LEIDO): ${enSeguimiento}`);
  console.log(`    · Respondidos: ${respondidos}`);
  console.log(`  Visitas físicas: ${DEMO_LEADS.reduce((s, l) => s + l.visitasFisicas, 0)} (${eventosCreados} eventos)`);
  console.log('');
  console.log('  Panel: inmobiliaria@tandilurban.local / Immo123!');
  console.log('  Agente: agente@tandilurban.local / Immo123!');
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log('✅ Base de datos poblada. ¡Éxitos en la demo!');
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
