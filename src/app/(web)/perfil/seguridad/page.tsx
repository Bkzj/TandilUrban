export const metadata = {
  title: 'Seguridad | Propea Group',
};

export default function PerfilSeguridadPage() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-bold text-gray-900">Seguridad</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        Próximamente vas a poder cambiar tu contraseña y activar verificación en dos pasos desde
        esta sección.
      </p>
      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
          <p className="text-sm font-medium text-gray-800">Contraseña</p>
          <p className="mt-1 text-xs text-gray-500">Actualizá tu contraseña de acceso.</p>
          <button
            type="button"
            disabled
            className="mt-3 cursor-not-allowed rounded-lg bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-500"
          >
            Cambiar contraseña (próximamente)
          </button>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
          <p className="text-sm font-medium text-gray-800">Verificación en dos pasos</p>
          <p className="mt-1 text-xs text-gray-500">Capa extra de protección para tu cuenta.</p>
          <button
            type="button"
            disabled
            className="mt-3 cursor-not-allowed rounded-lg bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-500"
          >
            Configurar 2FA (próximamente)
          </button>
        </div>
      </div>
    </section>
  );
}
