import type { Prisma } from '@prisma/client';

import { decimalToMoneyText } from '@/lib/money';
import type { PublicPropertyDetailDto } from '@/types/public-property';

export const PUBLIC_PROPERTY_DETAIL_SELECT = {
  id: true,
  titulo: true,
  descripcion: true,
  operacion: true,
  tipo: true,
  precio: true,
  moneda: true,
  direccion: true,
  barrio: true,
  latitud: true,
  longitud: true,
  m2Total: true,
  ambientes: true,
  dormitorios: true,
  banos: true,
  cocheras: true,
  caracteristicas: true,
  imagenes: true,
  inmobiliaria: {
    select: {
      nombreAgencia: true,
      logoUrl: true,
      logoAgencia: true,
      userId: true,
    },
  },
  agente: {
    select: {
      id: true,
      nombre: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.PropiedadSelect;

export type PublicPropertyDetailPayload = Prisma.PropiedadGetPayload<{
  select: typeof PUBLIC_PROPERTY_DETAIL_SELECT;
}>;

export function toPublicPropertyDetailDto(
  row: PublicPropertyDetailPayload,
): PublicPropertyDetailDto {
  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    operacion: row.operacion,
    tipo: row.tipo,
    precio: decimalToMoneyText(row.precio),
    moneda: row.moneda,
    direccion: row.direccion,
    barrio: row.barrio,
    latitud: row.latitud,
    longitud: row.longitud,
    m2Total: row.m2Total,
    ambientes: row.ambientes,
    dormitorios: row.dormitorios,
    banos: row.banos,
    cocheras: row.cocheras,
    caracteristicas: row.caracteristicas,
    imagenes: row.imagenes,
    inmobiliaria: {
      nombreAgencia: row.inmobiliaria.nombreAgencia,
      logoUrl: row.inmobiliaria.logoUrl ?? row.inmobiliaria.logoAgencia,
      publicProfileUserId: row.inmobiliaria.userId,
    },
    agente: row.agente
      ? {
          publicProfileUserId: row.agente.id,
          nombre: row.agente.nombre,
          avatarUrl: row.agente.avatarUrl,
        }
      : null,
  };
}
