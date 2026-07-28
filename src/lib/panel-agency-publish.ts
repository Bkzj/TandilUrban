import 'server-only';

import { requirePanelTenant } from '@/lib/panel-authorization';

/** Contexto fresco de tenant para publicar o subir desde el panel. */
export async function requireAgencyPublishingContext() {
  const { user, tenantId } = await requirePanelTenant();
  return { user, inmobiliariaId: tenantId };
}
