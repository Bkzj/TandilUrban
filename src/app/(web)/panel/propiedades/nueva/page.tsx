import LinearPropertyForm from '@/components/panel/LinearPropertyForm';

export const metadata = {
  title: 'Nueva propiedad | Propea Group',
};

export default function NuevaPropiedadPage() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <LinearPropertyForm />
      </div>
    </main>
  );
}
