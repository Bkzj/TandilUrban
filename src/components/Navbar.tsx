'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, User, X } from 'lucide-react';

import { roleCanAccessPanel } from '@/lib/rbac';
import type { SessionUserAugmented } from '@/types/auth';

const LEFT_LINKS = [
  { href: '/buscar', label: 'Propiedades' },
  { href: '/emprendimientos', label: 'Emprendimientos' },
] as const;

const RIGHT_LINKS = [
  { href: '/inmobiliarias', label: 'Inmobiliarias' },
  { href: '/buscar', label: 'Mapa' },
] as const;

const MOBILE_NAV_LINKS = [...LEFT_LINKS, ...RIGHT_LINKS] as const;

const NAV_LINK_CLASS =
  'text-base font-semibold text-gray-800 transition-colors hover:text-emerald-800';

const FAVORITES_HREF = '/perfil/favoritos';
const FAVORITES_LOGIN = `/login?callbackUrl=${encodeURIComponent(FAVORITES_HREF)}`;

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [userMenu, setUserMenu] = useState({ pathname, open: false });
  const [mobileNav, setMobileNav] = useState({ pathname, open: false });
  const userMenuOpen = userMenu.pathname === pathname && userMenu.open;
  const mobileNavOpen = mobileNav.pathname === pathname && mobileNav.open;
  const setUserMenuOpen = useCallback((value: boolean | ((open: boolean) => boolean)) =>
    setUserMenu({ pathname, open: typeof value === 'function' ? value(userMenuOpen) : value }),
  [pathname, userMenuOpen]);
  const setMobileNavOpen = useCallback((value: boolean | ((open: boolean) => boolean)) =>
    setMobileNav({ pathname, open: typeof value === 'function' ? value(mobileNavOpen) : value }),
  [mobileNavOpen, pathname]);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setUserMenuOpen]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileNavOpen(false);
      }
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [setMobileNavOpen, setUserMenuOpen]);

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
  const favoritesHref = session ? FAVORITES_HREF : FAVORITES_LOGIN;

  const iconBtnClass =
    'flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 transition hover:border-gray-300 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200';

  const menuItemClass =
    'flex items-center gap-2.5 px-4 py-2.5 text-base font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-emerald-800';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid h-16 w-full grid-cols-3 items-center md:h-[4.5rem]">
          <div className="flex items-center justify-start gap-3 md:gap-8">
            <button
              type="button"
              className={`${iconBtnClass} md:hidden`}
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileNavOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>

            <div className="hidden items-center gap-8 md:flex">
              {LEFT_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={NAV_LINK_CLASS}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <Link
              href="/"
              onClick={closeMobileNav}
              aria-label="Propea Group — inicio"
              className="font-serif text-base font-bold uppercase tracking-[0.2em] text-gray-900 sm:text-lg md:text-xl"
            >
              Propea Group
            </Link>
          </div>

          <div className="flex items-center justify-end gap-3 sm:gap-4 md:gap-6">
            <div className="hidden items-center gap-6 md:flex">
              {RIGHT_LINKS.map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className={NAV_LINK_CLASS}>
                  {link.label}
                </Link>
              ))}
            </div>

            <Link
              href={favoritesHref}
              className={`${iconBtnClass} hover:text-red-600`}
              aria-label="Mis favoritos"
              title="Mis favoritos"
            >
              <Heart className="h-[1.15rem] w-[1.15rem]" aria-hidden />
            </Link>

            <div className="flex items-center gap-2 md:gap-3">
              {status === 'loading' ? (
                <span className="h-9 w-20 animate-pulse rounded-xl bg-gray-200" aria-hidden />
              ) : !session ? (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-base font-semibold text-gray-800 transition hover:border-emerald-200 hover:text-emerald-800 sm:px-4"
                  >
                    Ingresar
                  </Link>
                  <Link
                    href="/register"
                    className="hidden rounded-xl bg-gray-900 px-3 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-900 sm:inline-flex sm:px-4"
                  >
                    Registrarse
                  </Link>
                </>
              ) : (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-1.5 transition hover:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 md:h-auto md:px-2 md:py-1.5 md:pr-3"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    aria-label={`Menú de ${displayName}`}
                  >
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-lg object-cover ring-2 ring-emerald-700/30 md:h-9 md:w-9"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-xs font-bold text-white md:h-9 md:w-9">
                        {initials || 'PG'}
                      </span>
                    )}
                    <span className="hidden max-w-[140px] truncate text-left text-base font-semibold text-gray-800 lg:inline lg:max-w-[180px]">
                      {displayName}
                    </span>
                    <motion.span
                      animate={{ rotate: userMenuOpen ? 180 : 0 }}
                      className="hidden text-gray-600 md:inline"
                    >
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
                        className="absolute right-0 z-[100] mt-2 min-w-[220px] origin-top overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-xl shadow-black/10"
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
                          href={FAVORITES_HREF}
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
                          className="w-full px-4 py-2.5 text-left text-base font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-emerald-800"
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
        </div>
      </div>

      <AnimatePresence>
        {mobileNavOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-gray-100 bg-white/95 md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {MOBILE_NAV_LINKS.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  onClick={closeMobileNav}
                  className={`block rounded-xl px-3 py-3 ${NAV_LINK_CLASS} hover:bg-gray-50`}
                >
                  {link.label}
                </Link>
              ))}

              <Link
                href={favoritesHref}
                onClick={closeMobileNav}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-3 ${NAV_LINK_CLASS} hover:bg-gray-50`}
              >
                <Heart className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
                Favoritos
              </Link>

              <div className="my-3 h-px bg-gray-100" />

              {status === 'loading' ? (
                <span className="mx-3 block h-10 animate-pulse rounded-xl bg-gray-200" aria-hidden />
              ) : !session ? (
                <div className="flex flex-col gap-2 px-1">
                  <Link
                    href="/login"
                    onClick={closeMobileNav}
                    className="rounded-xl border border-gray-200 px-4 py-3 text-center text-base font-semibold text-gray-800 transition hover:text-emerald-800"
                  >
                    Ingresar
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobileNav}
                    className="rounded-xl bg-gray-900 px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-emerald-900"
                  >
                    Registrarse
                  </Link>
                </div>
              ) : (
                <div className="space-y-1 px-1">
                  <p className="px-3 py-2 text-base font-semibold text-gray-900">{displayName}</p>
                  {showPanelLink ? (
                    <Link
                      href="/panel"
                      onClick={closeMobileNav}
                      className={`block rounded-xl px-3 py-3 ${NAV_LINK_CLASS} hover:bg-gray-50`}
                    >
                      Panel
                    </Link>
                  ) : null}
                  <Link
                    href="/perfil"
                    onClick={closeMobileNav}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-3 ${NAV_LINK_CLASS} hover:bg-gray-50`}
                  >
                    <User className="h-4 w-4 shrink-0" aria-hidden />
                    Mi Perfil
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileNav();
                      void signOut({ callbackUrl: '/' });
                    }}
                    className="w-full rounded-xl px-3 py-3 text-left text-base font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-emerald-800"
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
};
