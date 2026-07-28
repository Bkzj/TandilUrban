import 'server-only';

import { RolUsuario } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';
import {
  mapRowsToPublicPropiedadList,
  PUBLIC_LISTING_SELECT,
} from '@/lib/public-propiedad-list';
import type { InmobiliariaProfilePublic } from '@/types/inmobiliaria-profile';

/**
 * Perfil público B2B por ID público de perfil (dueño de inmobiliaria o agente).
 * Los datos de contacto se aprueban expresamente porque son el canal comercial
 * mostrado por esta página.
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
            where: PUBLIC_PROPERTY_WHERE,
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
        where: PUBLIC_PROPERTY_WHERE,
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
      propiedades: mapRowsToPublicPropiedadList(perfil.propiedades),
    };
  }

  if (user.rol === RolUsuario.AGENTE && user.agencia) {
    return {
      userId: user.id,
      displayName: user.nombre,
      subtitle: user.agencia.nombreAgencia,
      avatarUrl:
        user.avatarUrl ??
        user.agencia.logoUrl ??
        user.agencia.logoAgencia,
      logoUrl: user.agencia.logoUrl ?? user.agencia.logoAgencia,
      email: user.email,
      telefono: user.telefono,
      rol: 'AGENTE',
      agenciaNombre: user.agencia.nombreAgencia,
      propiedades: mapRowsToPublicPropiedadList(user.propiedadesComoAgente),
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
