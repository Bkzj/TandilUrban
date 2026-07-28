import 'server-only';

import type { Prisma } from '@prisma/client';

import { renderMatchNotificationHtml } from '@/lib/match-notification-html';
import { enviarMatchNotificationEmail } from '@/lib/match-notification-mail';
import { normalizePropiedadImagenesDb } from '@/lib/normalize-propiedad-imagenes';
import { prisma } from '@/lib/prisma';
import { decimalToMoneyText, formatMoneyAmount } from '@/lib/money';
import type { Currency } from '@/types/money';

/** Datos mínimos de una propiedad recién publicada para el motor de match. */
export type PropiedadParaMatch = {
  id: string;
  tipo: string;
  operacion: string;
  barrio: string | null;
  agenteId: string | null;
  titulo: string;
  precio: string;
  moneda: Currency;
  imagenPrincipalUrl: string | null;
};

function getAppBase(): string {
  const base =
    process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

export function propiedadPublicUrl(propiedadId: string): string {
  return `${getAppBase()}/propiedades/${propiedadId}`;
}

export function formatPrecioMatch(moneda: Currency, precio: string): string {
  return `${moneda} ${formatMoneyAmount(precio)}`;
}

export function toPropiedadParaMatch(row: {
  id: string;
  tipo: string;
  operacion: string;
  barrio: string | null;
  agenteId: string | null;
  titulo: string;
  precio: Prisma.Decimal;
  moneda: Currency;
  imagenes: unknown;
}): PropiedadParaMatch {
  const imagenes = normalizePropiedadImagenesDb(row.imagenes);
  const imagenPrincipalUrl = imagenes[0]?.url?.trim() || null;

  return {
    id: row.id,
    tipo: row.tipo,
    operacion: row.operacion,
    barrio: row.barrio?.trim() || null,
    agenteId: row.agenteId,
    titulo: row.titulo,
    precio: decimalToMoneyText(row.precio),
    moneda: row.moneda,
    imagenPrincipalUrl,
  };
}

/**
 * Usuarios con al menos un favorito que coincide en tipo + operación
 * (y barrio, si la nueva propiedad tiene barrio definido).
 * Excluye al agente que publica la propiedad.
 */
export async function findMatchingUsersForProperty(
  nuevaPropiedad: PropiedadParaMatch,
): Promise<string[]> {
  const favoriteFilter: Prisma.PropiedadWhereInput = {
    tipo: nuevaPropiedad.tipo,
    operacion: nuevaPropiedad.operacion,
    id: { not: nuevaPropiedad.id },
  };

  const barrio = nuevaPropiedad.barrio;
  if (barrio) {
    favoriteFilter.barrio = barrio;
  }

  const users = await prisma.user.findMany({
    where: {
      favoritos: { some: favoriteFilter },
      ...(nuevaPropiedad.agenteId ? { id: { not: nuevaPropiedad.agenteId } } : {}),
    },
    select: { email: true },
  });

  const seen = new Set<string>();
  const emails: string[] = [];

  for (const { email } of users) {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@') || seen.has(normalized)) continue;
    seen.add(normalized);
    emails.push(email.trim());
  }

  return emails;
}

/**
 * Notifica por correo a usuarios cuyos favoritos coinciden con la propiedad publicada.
 * Los errores se registran y no se propagan (no debe tumbar la publicación).
 */
export async function notifyMatchingUsers(
  propiedadPublicada: PropiedadParaMatch,
): Promise<void> {
  try {
    const emails = await findMatchingUsersForProperty(propiedadPublicada);
    if (emails.length === 0) {
      console.info(
        `[match-engine] Sin usuarios coincidentes para propiedad ${propiedadPublicada.id}`,
      );
      return;
    }

    const propiedadUrl = propiedadPublicUrl(propiedadPublicada.id);
    const precioFormatted = formatPrecioMatch(
      propiedadPublicada.moneda,
      propiedadPublicada.precio,
    );

    const html = renderMatchNotificationHtml({
      titulo: propiedadPublicada.titulo,
      precioFormatted,
      imagenUrl: propiedadPublicada.imagenPrincipalUrl,
      propiedadUrl,
    });

    const subject = `Nueva propiedad que coincide con tus favoritos — ${propiedadPublicada.titulo}`;

    for (const email of emails) {
      try {
        await enviarMatchNotificationEmail({ to: email, subject, html });
      } catch (err) {
        console.error(`[match-engine] Error enviando a ${email}:`, err);
      }
    }
  } catch (err) {
    console.error('[match-engine] notifyMatchingUsers:', err);
  }
}

const MATCH_SELECT = {
  id: true,
  tipo: true,
  operacion: true,
  barrio: true,
  agenteId: true,
  titulo: true,
  precio: true,
  moneda: true,
  imagenes: true,
  estado: true,
} as const;

/** Carga la propiedad y dispara notificaciones si está DISPONIBLE. */
export async function notifyMatchingUsersByPropiedadId(propiedadId: string): Promise<void> {
  const row = await prisma.propiedad.findUnique({
    where: { id: propiedadId },
    select: MATCH_SELECT,
  });

  if (!row || row.estado !== 'DISPONIBLE') return;

  await notifyMatchingUsers(toPropiedadParaMatch(row));
}

/** Alias usado por rutas API y server actions. */
export async function onPropiedadPublicada(propiedadId: string): Promise<void> {
  await notifyMatchingUsersByPropiedadId(propiedadId);
}
