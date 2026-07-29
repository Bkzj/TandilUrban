import 'server-only';

import { type Prisma } from '@prisma/client';
import {
  isPublicPropertyState,
  PUBLIC_PROPERTY_STATES,
} from '@/lib/public-property-state';

export { isPublicPropertyState, PUBLIC_PROPERTY_STATES };

export const PUBLIC_PROPERTY_WHERE = {
  estado: { in: [...PUBLIC_PROPERTY_STATES] },
} satisfies Prisma.PropiedadWhereInput;
