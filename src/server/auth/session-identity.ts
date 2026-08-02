import { getServerAuthSession } from '@/lib/auth';
import type { SessionUserAugmented } from '@/types/auth';

export async function currentSessionIdentity(): Promise<{ userId: string; sessionVersion: number } | null> {
  const session = await getServerAuthSession();
  const user = session?.user as SessionUserAugmented | undefined;
  if (!user?.id || user.sessionVersion === undefined) return null;
  return { userId: user.id, sessionVersion: user.sessionVersion };
}
