'use server';

import { revalidatePath } from 'next/cache';

import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { SessionUserAugmented } from '@/types/auth';

export type ToggleFavoritoResult =
  | { error: 'requires_login' }
  | { error: string }
  | { isFavorito: boolean };

export async function toggleFavorito(propiedadId: string): Promise<ToggleFavoritoResult> {
  const session = await getServerAuthSession();
  const userId = (session?.user as SessionUserAugmented | undefined)?.id;

  if (!userId) {
    return { error: 'requires_login' };
  }

  const propiedad = await prisma.propiedad.findUnique({
    where: { id: propiedadId },
    select: { id: true },
  });
  if (!propiedad) {
    return { error: 'Propiedad no encontrada.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      favoritos: {
        where: { id: propiedadId },
        select: { id: true },
      },
    },
  });

  const yaEsFavorito = (user?.favoritos.length ?? 0) > 0;

  await prisma.user.update({
    where: { id: userId },
    data: {
      favoritos: yaEsFavorito
        ? { disconnect: { id: propiedadId } }
        : { connect: { id: propiedadId } },
    },
  });

  const isFavorito = !yaEsFavorito;

  revalidatePath('/');
  revalidatePath('/buscar');
  revalidatePath(`/propiedades/${propiedadId}`);
  revalidatePath('/perfil/favoritos');

  return { isFavorito };
}
