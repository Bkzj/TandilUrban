'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, []);

  const displayName =
    typeof session?.user?.name === 'string' ? session.user.name : 'Usuario';
  const initials = displayName
    .split(/\s+/)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl =
    typeof session?.user?.image === 'string' && session.user.image.length > 0
      ? session.user.image
      : null;

  return (
    <nav className="relative z-50 flex w-full items-center justify-between bg-verde px-4 py-2 text-surface shadow-lg sm:px-8">
      {/* Logo */}
      <Link
        href="/"
        className="cursor-pointer text-2xl font-serif font-bold uppercase tracking-widest drop-shadow-md sm:text-3xl"
      >
        Pietra Miliare
      </Link>

      {/* Enlaces al centro */}
      <div className="hidden items-center gap-10 text-sm font-medium uppercase tracking-widest drop-shadow-sm lg:flex">
        <Link href="/#oportunidades" className="py-2 transition-colors hover:text-naranja">
          Propiedades
        </Link>
        <Link href="#" className="py-2 transition-colors hover:text-naranja">
          Destacados
        </Link>
        <Link href="#" className="py-2 transition-colors hover:text-naranja">
          Servicios
        </Link>
        <Link href="#" className="py-2 transition-colors hover:text-naranja">
          Nosotros
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {/* Contacto (desktop+) */}
        <div className="hidden items-center gap-3 xl:flex xl:gap-4">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-naranja px-5 py-2.5 text-sm font-bold text-surface shadow-md transition-all hover:bg-naranja-hover"
          >
            📞 2494567818 - TANDIL
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-naranja px-5 py-2.5 text-sm font-bold text-surface shadow-md transition-all hover:bg-naranja-hover"
          >
            ✉️
          </button>
        </div>

        {/* Auth al extremo derecho */}
        <div className="flex items-center gap-2 sm:gap-3">
          {status === 'loading' ? (
            <span className="h-9 w-20 animate-pulse rounded-lg bg-surface/20" aria-hidden />
          ) : !session ? (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-surface/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-surface transition hover:bg-surface/10 sm:px-4 sm:text-sm"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-naranja px-3 py-2 text-xs font-bold uppercase tracking-wide text-surface shadow-md transition hover:bg-naranja-hover sm:px-4 sm:text-sm"
              >
                Registrarse
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-surface/20 bg-surface/10 px-2 py-1.5 pr-3 backdrop-blur transition hover:bg-surface/20 focus:outline-none focus:ring-2 focus:ring-naranja-light sm:gap-3"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-lg object-cover ring-2 ring-naranja/40"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-naranja text-xs font-bold text-surface shadow-inner">
                    {initials || 'TU'}
                  </span>
                )}
                <span className="hidden max-w-[140px] truncate text-left text-xs font-semibold uppercase tracking-wide sm:inline sm:max-w-[180px] sm:text-sm">
                  {displayName}
                </span>
                <motion.span animate={{ rotate: menuOpen ? 180 : 0 }} className="text-surface/80">
                  ▾
                </motion.span>
              </button>

              <AnimatePresence>
                {menuOpen ? (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute right-0 z-[100] mt-2 min-w-[200px] origin-top overflow-hidden rounded-xl border border-border-light bg-surface py-2 text-text-primary shadow-2xl"
                  >
                    <div className="border-b border-border-light px-4 py-3 sm:hidden">
                      <p className="truncate text-sm font-semibold">{displayName}</p>
                      <p className="truncate text-xs text-text-secondary">{session.user?.email}</p>
                    </div>
                    <Link
                      role="menuitem"
                      href="/panel"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm font-medium transition hover:bg-verde-light hover:text-verde-dark"
                    >
                      Panel
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        void signOut({ callbackUrl: '/' });
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-naranja-dark transition hover:bg-naranja-light"
                    >
                      Cerrar sesión
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
