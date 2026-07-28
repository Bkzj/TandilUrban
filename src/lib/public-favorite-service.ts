export type PublicFavoriteDependencies = {
  publicPropertyExists: (propertyId: string) => Promise<boolean>;
  isFavorite: (userId: string, propertyId: string) => Promise<boolean>;
  setFavorite: (
    userId: string,
    propertyId: string,
    favorite: boolean,
  ) => Promise<void>;
};

export type PublicFavoriteResult =
  | { ok: false; reason: 'property_not_available' }
  | { ok: true; isFavorite: boolean };

export async function togglePublicFavorite(
  userId: string,
  propertyId: string,
  dependencies: PublicFavoriteDependencies,
): Promise<PublicFavoriteResult> {
  if (!(await dependencies.publicPropertyExists(propertyId))) {
    return { ok: false, reason: 'property_not_available' };
  }

  const wasFavorite = await dependencies.isFavorite(userId, propertyId);
  const isFavorite = !wasFavorite;
  await dependencies.setFavorite(userId, propertyId, isFavorite);
  return { ok: true, isFavorite };
}
