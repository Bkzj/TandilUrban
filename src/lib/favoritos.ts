import { prisma } from '@/lib/prisma';

/** IDs de propiedades marcadas como favoritas por el usuario. */
export async function getFavoritePropiedadIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.propiedad.findMany({
    where: { favoritadosPor: { some: { id: userId } } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export async function isPropiedadFavorita(
  userId: string | undefined,
  propiedadId: string,
): Promise<boolean> {
  if (!userId) return false;

  const count = await prisma.propiedad.count({
    where: {
      id: propiedadId,
      favoritadosPor: { some: { id: userId } },
    },
  });
  return count > 0;
}
