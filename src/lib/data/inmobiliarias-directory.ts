import { EstadoPropiedad } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type { InmobiliariaDirectoryItem } from '@/types/inmobiliaria-directory';

export type InmobiliariasDirectoryData = {
  destacadas: InmobiliariaDirectoryItem[];
  todas: InmobiliariaDirectoryItem[];
};

function mapRow(row: {
  nombreAgencia: string;
  direccion: string;
  logoUrl: string | null;
  logoAgencia: string | null;
  bio: string | null;
  destacada: boolean;
  user: {
    id: string;
    nombre: string;
    email: string;
    telefono: string | null;
    avatarUrl: string | null;
  };
  _count: { agentes: number; propiedades: number };
}): InmobiliariaDirectoryItem {
  return {
    userId: row.user.id,
    nombreAgencia: row.nombreAgencia,
    bio: row.bio,
    direccion: row.direccion,
    avatarUrl: row.logoUrl ?? row.logoAgencia ?? row.user.avatarUrl,
    contactoNombre: row.user.nombre,
    email: row.user.email,
    telefono: row.user.telefono,
    destacada: row.destacada,
    agentesCount: row._count.agentes,
    propiedadesDisponibles: row._count.propiedades,
  };
}

export async function getInmobiliariasDirectory(): Promise<InmobiliariasDirectoryData> {
  const rows = await prisma.inmobiliaria.findMany({
    orderBy: [{ destacada: 'desc' }, { nombreAgencia: 'asc' }],
    select: {
      nombreAgencia: true,
      direccion: true,
      logoUrl: true,
      logoAgencia: true,
      bio: true,
      destacada: true,
      user: {
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          agentes: true,
          propiedades: {
            where: { estado: EstadoPropiedad.DISPONIBLE },
          },
        },
      },
    },
  });

  const items = rows.map(mapRow);
  const destacadas = items.filter((i) => i.destacada);
  const todas = items.filter((i) => !i.destacada);

  return { destacadas, todas };
}
