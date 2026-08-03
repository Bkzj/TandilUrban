import { handleClearDevelopmentMailbox } from '@/server/development-mailbox-http';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request): Promise<Response> {
  return handleClearDevelopmentMailbox(request);
}
