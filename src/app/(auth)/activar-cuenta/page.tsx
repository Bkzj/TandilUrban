import { InvitationActivationForm } from '@/components/auth/InvitationActivationForm';
import { prisma } from '@/lib/prisma';
import { getAccountInvitationPublicContext } from '@/server/admin/admin-management-service';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Activar cuenta | Propea Group' };

export default async function ActivateAccountPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : '';
  const invitation = await getAccountInvitationPublicContext(token, { client: prisma });
  return (
    <main className="min-h-screen bg-gradient-to-br from-text-primary via-verde-dark to-naranja-dark px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center justify-center">
        <section className="w-full max-w-md rounded-2xl border border-border-light/40 bg-surface/95 p-6 shadow-2xl backdrop-blur sm:p-8" aria-labelledby="activation-title">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-naranja">Propea Group</p>
          <div id="activation-title"><InvitationActivationForm token={token} invitation={invitation} /></div>
        </section>
      </div>
    </main>
  );
}
