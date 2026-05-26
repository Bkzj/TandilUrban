import { redirect } from 'next/navigation';

import Navbar from '@/components/Navbar';
import { PerfilNav } from '@/components/perfil/PerfilNav';
import { getServerAuthSession } from '@/lib/auth';

export default async function PerfilLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect('/login?callbackUrl=/perfil');
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar />
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Mi cuenta</h1>
          <p className="mt-1 text-sm text-gray-500">Gestioná tu perfil y propiedades guardadas.</p>
        </header>
        <PerfilNav />
        {children}
      </div>
    </div>
  );
}
