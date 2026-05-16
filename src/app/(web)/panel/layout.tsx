import { redirect } from 'next/navigation';

import PanelHeader from '@/components/panel/PanelHeader';
import { getServerAuthSession } from '@/lib/auth';
import { roleCanAccessPanel } from '@/lib/rbac';
import type { SessionUserAugmented } from '@/types/auth';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect('/login?callbackUrl=/panel');
  }

  const role = (session.user as SessionUserAugmented).role;
  if (!roleCanAccessPanel(role)) {
    redirect('/?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark text-white">
      <PanelHeader />
      <div className="pt-4">{children}</div>
    </div>
  );
}
