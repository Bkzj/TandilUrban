import { redirect } from 'next/navigation';

import { AdminHeader } from '@/components/admin/AdminHeader';
import { AuthError } from '@/lib/auth';
import { requireGlobalAdmin } from '@/lib/panel-authorization';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireGlobalAdmin().catch((error: unknown) => {
    if (error instanceof AuthError && error.status === 401) redirect('/login?callbackUrl=/admin');
    redirect('/?error=unauthorized');
  });
  return <div className="min-h-screen bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark text-white"><AdminHeader />{children}</div>;
}
