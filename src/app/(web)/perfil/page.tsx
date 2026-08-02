import { getCurrentUser } from '@/lib/auth';
import { PasswordChangeForm } from '@/components/perfil/PasswordChangeForm';

export const metadata = {
  title: 'Mi perfil | Propea Group',
};

export default async function PerfilPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-bold text-gray-900">Datos personales</h2>
      <p className="mt-1 text-sm text-gray-500">
        Próximamente podrás guardar cambios desde acá. Por ahora es solo una vista previa.
      </p>

      <form className="mt-6 flex flex-col gap-5" aria-label="Editar perfil">
        <div>
          <label htmlFor="perfil-nombre" className="mb-1.5 block text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            id="perfil-nombre"
            name="nombre"
            type="text"
            defaultValue={user?.nombre ?? ''}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-verde focus:ring-2 focus:ring-verde/20"
          />
        </div>
        <div>
          <label htmlFor="perfil-telefono" className="mb-1.5 block text-sm font-medium text-gray-700">
            Teléfono
          </label>
          <input
            id="perfil-telefono"
            name="telefono"
            type="tel"
            defaultValue={user?.telefono ?? ''}
            placeholder="+54 9 …"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-verde focus:ring-2 focus:ring-verde/20"
          />
        </div>
        <div>
          <label htmlFor="perfil-email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="perfil-email"
            name="email"
            type="email"
            defaultValue={user?.email ?? ''}
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-gray-100 bg-gray-100 px-4 py-3 text-sm text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-400">El email no se puede cambiar desde esta pantalla.</p>
        </div>
        <button
          type="button"
          disabled
          className="mt-2 w-full cursor-not-allowed rounded-xl bg-gray-200 py-3 text-sm font-semibold text-gray-500 sm:w-auto sm:px-8"
        >
          Guardar cambios (próximamente)
        </button>
      </form>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="perfil-seguridad">
      <h2 id="perfil-seguridad" className="text-lg font-bold text-gray-900">Seguridad</h2>
      <p className="mt-1 text-sm text-gray-500">
        Cambiá tu contraseña. Por seguridad, todas tus sesiones se cerrarán al finalizar.
      </p>
      <PasswordChangeForm />
    </section>
    </div>
  );
}
