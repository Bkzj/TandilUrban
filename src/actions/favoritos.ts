'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';
import { togglePublicFavorite } from '@/lib/public-favorite-service';

export type ToggleFavoritoResult =
  | { error: 'requires_login' }
  | { error: string }
  | { isFavorito: boolean };

export async function toggleFavorito(propiedadId: string): Promise<ToggleFavoritoResult> {
  const user = await getCurrentUser();
  const userId = user?.id;

  if (!userId) {
    return { error: 'requires_login' };
  }

  const result = await togglePublicFavorite(userId, propiedadId, {
    publicPropertyExists: async (id) => {
      const propiedad = await prisma.propiedad.findFirst({
        where: { id, ...PUBLIC_PROPERTY_WHERE },
        select: { id: true },
      });
      return propiedad !== null;
    },
    isFavorite: async (id, propertyId) => {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          favoritos: {
            where: { id: propertyId },
            select: { id: true },
          },
        },
      });
      return (user?.favoritos.length ?? 0) > 0;
    },
    setFavorite: async (id, propertyId, favorite) => {
      await prisma.user.update({
        where: { id },
        data: {
          favoritos: favorite
            ? { connect: { id: propertyId } }
            : { disconnect: { id: propertyId } },
        },
      });
    },
  });

  if (!result.ok) {
    return { error: 'La propiedad no está disponible.' };
  }

  const isFavorito = result.isFavorite;

  revalidatePath('/');
  revalidatePath('/buscar');
  revalidatePath(`/propiedades/${propiedadId}`);
  revalidatePath('/perfil/favoritos');

  return { isFavorito };
}
