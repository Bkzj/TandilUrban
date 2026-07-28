import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  PUBLIC_PROPERTY_DETAIL_SELECT,
  toPublicPropertyDetailDto,
} from '@/lib/public-property-dto';
import { PUBLIC_PROPERTY_WHERE } from '@/lib/public-property-policy';
import type { PublicPropertyDetailDto } from '@/types/public-property';

export async function getPropiedadPublicDetail(
  id: string,
): Promise<PublicPropertyDetailDto | null> {
  const row = await prisma.propiedad.findFirst({
    where: { id, ...PUBLIC_PROPERTY_WHERE },
    select: PUBLIC_PROPERTY_DETAIL_SELECT,
  });

  return row ? toPublicPropertyDetailDto(row) : null;
}
