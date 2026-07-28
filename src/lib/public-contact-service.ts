import type { ContactoPayload } from '@/types/api';

export type PublicContactProperty = {
  id: string;
  titulo: string;
  agenteEmail: string | null;
  adminEmail: string;
};

export type PublicContactReceipt = {
  id: string;
  createdAt: Date;
  created?: boolean;
};

export type PublicContactServiceDependencies = {
  findPublicProperty: (propertyId: string) => Promise<PublicContactProperty | null>;
  persistInquiry: (
    propertyId: string,
    payload: ContactoPayload,
    idempotencyKey?: string,
  ) => Promise<PublicContactReceipt>;
};

export type PublicContactServiceResult =
  | { ok: false; reason: 'property_not_available' }
  | {
      ok: true;
      property: PublicContactProperty;
      receipt: PublicContactReceipt;
    };

export async function createPublicContactInquiry(
  payload: ContactoPayload,
  dependencies: PublicContactServiceDependencies,
  idempotencyKey?: string,
): Promise<PublicContactServiceResult> {
  const property = await dependencies.findPublicProperty(payload.propiedadId);
  if (!property) return { ok: false, reason: 'property_not_available' };

  const receipt = await dependencies.persistInquiry(property.id, payload, idempotencyKey);
  return { ok: true, property, receipt };
}
