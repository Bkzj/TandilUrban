import { EstadoPropiedad, RolUsuario } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { imagenesItemsToUrls, normalizePropiedadImagenesDb } from '@/lib/propiedad-imagenes';
import type { InmobiliariaProfilePublic } from '@/types/inmobiliaria-profile';
import type { PublicPropiedadListItem } from '@/types/public-search';

const PUBLIC_LISTING_SELECT = {
  id: true,
  titulo: true,
  direccion: true,
  barrio: true,
  precio: true,
  moneda: true,
  operacion: true,
  tipo: true,
  ambientes: true,
  dormitorios: true,
  banos: true,
  m2Total: true,
  latitud: true,
  longitud: true,
  imagenes: true,
  visitas: true,
  consultas: true,
} as const;

type ListingRow = {
  id: string;
  titulo: string;
  direccion: string;
  barrio: string | null;
  precio: number;
  moneda: string;
  operacion: string;
  tipo: string;
  ambientes: number;
  dormitorios: number;
  banos: number;
  m2Total: number;
  latitud: number;
  longitud: number;
  imagenes: unknown;
  visitas: number;
  consultas: number;
};

function mapListingRows(rows: ListingRow[]): PublicPropiedadListItem[] {
  return rows.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    direccion: p.direccion,
    barrio: p.barrio,
    precio: p.precio,
    moneda: p.moneda,
    operacion: p.operacion,
    tipo: p.tipo,
    ambientes: p.ambientes,
    dormitorios: p.dormitorios,
    banos: p.banos,
    m2Total: p.m2Total,
    latitud: p.latitud,
    longitud: p.longitud,
    imagenes: imagenesItemsToUrls(normalizePropiedadImagenesDb(p.imagenes)),
    visitas: p.visitas,
    consultas: p.consultas,
  }));
}

/**
 * Perfil público B2B por ID de usuario (dueño de inmobiliaria o agente).
 */
export async function getInmobiliariaProfile(
  userId: string,
): Promise<InmobiliariaProfilePublic | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      avatarUrl: true,
      rol: true,
      inmobiliariaPerfil: {
        select: {
          nombreAgencia: true,
          logoUrl: true,
          logoAgencia: true,
          propiedades: {
            where: { estado: EstadoPropiedad.DISPONIBLE },
            orderBy: { createdAt: 'desc' },
            select: PUBLIC_LISTING_SELECT,
          },
        },
      },
      agencia: {
        select: {
          nombreAgencia: true,
          logoUrl: true,
          logoAgencia: true,
        },
      },
      propiedadesComoAgente: {
        where: { estado: EstadoPropiedad.DISPONIBLE },
        orderBy: { createdAt: 'desc' },
        select: PUBLIC_LISTING_SELECT,
      },
    },
  });

  if (!user) return null;

  if (user.rol === RolUsuario.INMOBILIARIA && user.inmobiliariaPerfil) {
    const perfil = user.inmobiliariaPerfil;
    return {
      userId: user.id,
      displayName: perfil.nombreAgencia,
      subtitle: user.nombre,
      avatarUrl: perfil.logoUrl ?? perfil.logoAgencia ?? user.avatarUrl,
      logoUrl: perfil.logoUrl ?? perfil.logoAgencia,
      email: user.email,
      telefono: user.telefono,
      rol: 'INMOBILIARIA',
      agenciaNombre: perfil.nombreAgencia,
      propiedades: mapListingRows(perfil.propiedades),
    };
  }

  if (user.rol === RolUsuario.AGENTE) {
    return {
      userId: user.id,
      displayName: user.nombre,
      subtitle: user.agencia?.nombreAgencia ?? null,
      avatarUrl: user.avatarUrl ?? user.agencia?.logoAgencia ?? null,
      logoUrl: user.agencia?.logoAgencia ?? null,
      email: user.email,
      telefono: user.telefono,
      rol: 'AGENTE',
      agenciaNombre: user.agencia?.nombreAgencia ?? null,
      propiedades: mapListingRows(user.propiedadesComoAgente),
    };
  }

  return null;
}

export function buildWhatsAppUrl(telefono: string | null, message?: string): string | null {
  if (!telefono?.trim()) return null;
  const digits = telefono.replace(/\D/g, '');
  if (!digits) return null;
  const text = encodeURIComponent(
    message ?? 'Hola, vi tu perfil en Propea Group y me gustaría consultar por una propiedad.',
  );
  return `https://wa.me/${digits}?text=${text}`;
}
