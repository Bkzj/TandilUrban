import Link from 'next/link';
import Image from 'next/image';

type EmprendimientoPreviewItem = {
  id: string;
  badge: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  href: string;
};

const PREVIEW_ITEMS: EmprendimientoPreviewItem[] = [
  {
    id: 'pozo-torres-parque',
    badge: 'EN POZO',
    titulo: 'Torres del Parque',
    descripcion:
      'Departamentos de 1 a 3 ambientes con amenities y financiación en pesos, a metros del Parque Independencia.',
    imagen:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070&auto=format&fit=crop',
    href: '/emprendimientos',
  },
  {
    id: 'local-galeria-comercial',
    badge: 'LOCAL',
    titulo: 'Local en galería comercial',
    descripcion:
      'Vidriera a la calle con 85 m², alto tránsito peatonal e ideal para retail o servicios en Av. Colón.',
    imagen:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
    href: '/emprendimientos',
  },
  {
    id: 'franquicia-cafe',
    badge: 'FRANQUICIA',
    titulo: 'Franquicia de café especializado',
    descripcion:
      'Marca nacional con master franquicia disponible en Tandil. Capacitación incluida y acompañamiento en locación.',
    imagen:
      'https://images.unsplash.com/photo-1495474472287-4d89bcf2ff42?q=80&w=2070&auto=format&fit=crop',
    href: '/emprendimientos',
  },
];

function EmprendimientoPreviewCard({ item }: { item: EmprendimientoPreviewItem }) {
  return (
    <Link
      href={item.href}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white text-gray-900 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        <Image
          src={item.imagen}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-[#0A2A1A] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {item.badge}
        </span>
      </div>

      <div className="flex flex-grow flex-col p-6">
        <h3 className="text-xl font-bold text-gray-900">{item.titulo}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">{item.descripcion}</p>
        <span className="mt-auto inline-flex pt-6 text-sm font-semibold text-[#B4853F] transition-transform duration-300 group-hover:translate-x-1">
          Más información ↗
        </span>
      </div>
    </Link>
  );
}

export function HomeEmprendimientosPreview() {
  return (
    <section className="bg-[#0A2A1A] py-24 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <header className="text-center">
          <h2 className="text-4xl font-bold text-white md:text-5xl">Oportunidades de Inversión</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
            Proyectos en pozo, locales y franquicias seleccionadas para potenciar tu capital.
          </p>
        </header>

        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-3">
          {PREVIEW_ITEMS.map((item) => (
            <EmprendimientoPreviewCard key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link
            href="/emprendimientos"
            className="flex items-center gap-2 rounded-full bg-white px-8 py-4 font-semibold text-[#0A2A1A] shadow-sm transition-all hover:bg-gray-100"
          >
            Explorar todas las oportunidades →
          </Link>
        </div>
      </div>
    </section>
  );
}
