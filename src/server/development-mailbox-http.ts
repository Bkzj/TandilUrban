import { assertTrustedMutationRequest } from '@/lib/request-security';
import { clearDevelopmentMailbox, isDevelopmentMailboxAvailable } from '@/server/development-mailbox';

type ClearMailboxOptions = Readonly<{
  nodeEnv?: string;
  assertTrustedRequest?: (request: Request) => void;
}>;

export async function handleClearDevelopmentMailbox(
  request: Request,
  options: ClearMailboxOptions = {},
): Promise<Response> {
  if (!isDevelopmentMailboxAvailable(options.nodeEnv)) {
    return Response.json({ error: 'No encontrado.' }, { status: 404, headers: { 'cache-control': 'no-store' } });
  }
  try {
    (options.assertTrustedRequest ?? assertTrustedMutationRequest)(request);
  } catch {
    return Response.json({ error: 'Solicitud no autorizada.' }, { status: 403, headers: { 'cache-control': 'no-store' } });
  }
  const removed = clearDevelopmentMailbox();
  return Response.json({ removed }, { headers: { 'cache-control': 'no-store' } });
}
