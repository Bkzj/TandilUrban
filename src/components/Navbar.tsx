'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, User, X } from 'lucide-react';

import { roleCanAccessPanel } from '@/lib/rbac';
import type { SessionUserAugmented } from '@/types/auth';

const NAV_LINKS = [
  { href: '/buscar', label: 'Propiedades' },
  { href: '/destacados', label: 'Destacados' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/nosotros', label: 'Nosotros' },
] as const;

export default function Navbar() {
  const { data: session, status } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileNavOpen(false);
      }
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

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

  const sessionRole = (session?.user as SessionUserAugmented | undefined)?.role;
  const showPanelLink = Boolean(session && roleCanAccessPanel(sessionRole));

  const closeMobileNav = () => setMobileNavOpen(false);
  const isAuthenticated = Boolean(session);

  const favoritesLinkClass =
    'flex h-10 w-10 items-center justify-center rounded-xl border border-surface/25 bg-surface/10 text-surface transition hover:bg-surface/20 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-naranja-light';

  const menuItemClass =
    'flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition hover:bg-verde-light hover:text-verde-dark';

  return (
    <nav className="relative z-50 w-full bg-verde text-surface shadow-lg">
      <div className="mx-auto flex w-full max-w-[100vw] items-center justify-between gap-3 px-4 py-2 sm:px-6 md:px-8">
        <Link
          href="/"
          onClick={closeMobileNav}
          aria-label="Propea Group — inicio"
          className="shrink-0 cursor-pointer text-xl font-serif font-bold uppercase tracking-widest drop-shadow-md sm:text-2xl md:text-3xl"
        >
          Propea Group
        </Link>

        {/* Enlaces — desktop */}
        <div className="hidden flex-1 items-center justify-center gap-8 text-sm font-medium uppercase tracking-widest drop-shadow-sm md:flex lg:gap-10">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="py-2 transition-colors hover:text-naranja"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Contacto — solo pantallas grandes */}
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

          {/* Auth — tablet/desktop */}
          <div className="hidden items-center gap-2 md:flex md:gap-3">
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
              <>
                <Link
                  href="/perfil/favoritos"
                  className={favoritesLinkClass}
                  aria-label="Mis favoritos"
                  title="Mis favoritos"
                >
                  <Heart className="h-5 w-5" aria-hidden />
                </Link>
                <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-xl border border-surface/20 bg-surface/10 px-2 py-1.5 pr-3 backdrop-blur transition hover:bg-surface/20 focus:outline-none focus:ring-2 focus:ring-naranja-light sm:gap-3"
                  aria-expanded={userMenuOpen}
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
                  <span className="hidden max-w-[140px] truncate text-left text-xs font-semibold uppercase tracking-wide lg:inline lg:max-w-[180px] lg:text-sm">
                    {displayName}
                  </span>
                  <motion.span animate={{ rotate: userMenuOpen ? 180 : 0 }} className="text-surface/80">
                    ▾
                  </motion.span>
                </button>

                <AnimatePresence>
                  {userMenuOpen ? (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute right-0 z-[100] mt-2 min-w-[200px] origin-top overflow-hidden rounded-xl border border-border-light bg-surface py-2 text-text-primary shadow-2xl"
                    >
                      {showPanelLink ? (
                        <Link
                          role="menuitem"
                          href="/panel"
                          onClick={() => setUserMenuOpen(false)}
                          className={menuItemClass}
                        >
                          Panel
                        </Link>
                      ) : null}
                      <Link
                        role="menuitem"
                        href="/perfil"
                        onClick={() => setUserMenuOpen(false)}
                        className={menuItemClass}
                      >
                        <User className="h-4 w-4 shrink-0" aria-hidden />
                        Mi Perfil
                      </Link>
                      <Link
                        role="menuitem"
                        href="/perfil/favoritos"
                        onClick={() => setUserMenuOpen(false)}
                        className={menuItemClass}
                      >
                        <Heart className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
                        Favoritos
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
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
              </>
            )}
          </div>

          {isAuthenticated ? (
            <Link
              href="/perfil/favoritos"
              className={`${favoritesLinkClass} md:hidden`}
              aria-label="Mis favoritos"
              title="Mis favoritos"
            >
              <Heart className="h-5 w-5" aria-hidden />
            </Link>
          ) : null}

          {/* Menú hamburguesa — móvil */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface/25 bg-surface/10 text-surface transition hover:bg-surface/20 md:hidden"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileNavOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Panel móvil */}
      <AnimatePresence>
        {mobileNavOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-surface/15 md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={closeMobileNav}
                  className="block rounded-lg px-3 py-3 text-sm font-medium uppercase tracking-widest transition-colors hover:bg-surface/10 hover:text-naranja"
                >
                  {link.label}
                </Link>
              ))}

              <div className="my-3 h-px bg-surface/15" />

              {status === 'loading' ? (
                <span className="mx-3 block h-10 animate-pulse rounded-lg bg-surface/20" aria-hidden />
              ) : !session ? (
                <div className="flex flex-col gap-2 px-1">
                  <Link
                    href="/login"
                    onClick={closeMobileNav}
                    className="rounded-xl border border-surface/30 px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide transition hover:bg-surface/10"
                  >
                    Ingresar
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobileNav}
                    className="rounded-xl bg-naranja px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-surface shadow-md transition hover:bg-naranja-hover"
                  >
                    Registrarse
                  </Link>
                </div>
              ) : (
                <div className="space-y-1 px-1">
                  <p className="px-3 py-2 text-sm font-semibold">{displayName}</p>
                  {showPanelLink ? (
                    <Link
                      href="/panel"
                      onClick={closeMobileNav}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium transition hover:bg-surface/10"
                    >
                      Panel
                    </Link>
                  ) : null}
                  <Link
                    href="/perfil"
                    onClick={closeMobileNav}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium transition hover:bg-surface/10"
                  >
                    <User className="h-4 w-4 shrink-0" aria-hidden />
                    Mi Perfil
                  </Link>
                  <Link
                    href="/perfil/favoritos"
                    onClick={closeMobileNav}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium transition hover:bg-surface/10"
                  >
                    <Heart className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
                    Favoritos
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileNav();
                      void signOut({ callbackUrl: '/' });
                    }}
                    className="w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-naranja-light transition hover:bg-surface/10"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
