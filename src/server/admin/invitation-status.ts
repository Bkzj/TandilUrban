export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'INVALIDATED' | 'SEND_FAILED';

export function accountInvitationStatus(
  invitation: {
    consumedAt: Date | null;
    invalidatedAt: Date | null;
    expiresAt: Date;
    deliveryStatus: 'PENDING' | 'SENT' | 'FAILED';
  } | null,
  now = new Date(),
): InvitationStatus {
  if (!invitation) return 'INVALIDATED';
  if (invitation.consumedAt) return 'ACCEPTED';
  if (invitation.invalidatedAt) return 'INVALIDATED';
  if (invitation.expiresAt <= now) return 'EXPIRED';
  if (invitation.deliveryStatus === 'FAILED') return 'SEND_FAILED';
  return 'PENDING';
}

export const INVITATION_STATUS_LABELS: Readonly<Record<InvitationStatus, string>> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  EXPIRED: 'Vencida',
  INVALIDATED: 'Cancelada',
  SEND_FAILED: 'Error de envío',
};
