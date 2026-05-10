import LinearPropertyForm from '@/components/panel/LinearPropertyForm';

export const metadata = {
  title: 'Nueva propiedad | TandilUrban',
};

export default function NuevaPropiedadPage() {
  return (
    <main className="relative">
      <LinearPropertyForm />
    </main>
  );
}
