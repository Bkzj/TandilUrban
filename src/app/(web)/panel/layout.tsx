import { redirect } from 'next/navigation';
import { RolUsuario } from '@/generated/prisma';

import PanelHeader from '@/components/panel/PanelHeader';
import { getCurrentUser } from '@/lib/auth';
import { roleCanAccessPanel } from '@/lib/rbac';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?callbackUrl=/panel');
  }

  if (!roleCanAccessPanel(user.rol) && user.rol !== RolUsuario.ADMIN) {
    redirect('/?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark text-white print:bg-white print:text-gray-900">
      <div className="print:hidden">
        <PanelHeader />
      </div>
      {children}
    </div>
  );
}
