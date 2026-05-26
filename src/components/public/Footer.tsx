import Link from 'next/link';
import { Mail, MessageCircle } from 'lucide-react';

function InstaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const WHATSAPP_URL = 'https://wa.me/5492494567818';
const EMAIL = 'contacto@propeagroup.com';
const INSTAGRAM_URL = 'https://www.instagram.com/propeagroup';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-emerald-950 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-block font-serif text-2xl font-bold uppercase tracking-[0.18em] text-white sm:text-3xl"
            >
              Propea Group
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
              El portal inmobiliario premium de Tandil. Encontrá tu próximo hogar o potenciá tu
              agencia con tecnología de punta.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">Explorar</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/buscar" className="transition-colors hover:text-white">
                  Buscar propiedades
                </Link>
              </li>
              <li>
                <Link href="/emprendimientos" className="transition-colors hover:text-white">
                  Emprendimientos
                </Link>
              </li>
              <li>
                <Link href="/#nosotros" className="transition-colors hover:text-white">
                  Nosotros
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">
              Para profesionales
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/para-inmobiliarias"
                  className="font-semibold text-emerald-300 transition-colors hover:text-white"
                >
                  Uní tu inmobiliaria →
                </Link>
              </li>
              <li>
                <Link href="/panel" className="transition-colors hover:text-white">
                  Panel de control
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-white">
                  Ingresar al sistema
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">Contacto</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
                >
                  <InstaIcon className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${EMAIL}`}
                  className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                  {EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-xs text-gray-500 sm:text-left">
          © 2026 Propea Group. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
