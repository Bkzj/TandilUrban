import { roleCanAccessPanel } from '@/lib/rbac';

export type NavbarLink = {
  href: string;
  label: string;
};

export const NAVBAR_LEFT_LINKS = [
  { href: '/buscar', label: 'Propiedades' },
  { href: '/emprendimientos', label: 'Emprendimientos' },
] as const satisfies readonly NavbarLink[];

export const NAVBAR_RIGHT_LINKS = [
  { href: '/inmobiliarias', label: 'Inmobiliarias' },
  { href: '/buscar', label: 'Mapa' },
] as const satisfies readonly NavbarLink[];

export const NAVBAR_MOBILE_LINKS = [
  ...NAVBAR_LEFT_LINKS,
  ...NAVBAR_RIGHT_LINKS,
] as const;

export const FAVORITES_HREF = '/perfil/favoritos';
export const FAVORITES_LOGIN_HREF =
  `/login?callbackUrl=${encodeURIComponent(FAVORITES_HREF)}`;

export type NavbarAccess = {
  authenticated: boolean;
  favoritesHref: string;
  showPanelLink: boolean;
  showAdminLink: boolean;
};

export function buildNavbarAccess(
  authenticated: boolean,
  role: string | undefined,
): NavbarAccess {
  return {
    authenticated,
    favoritesHref: authenticated ? FAVORITES_HREF : FAVORITES_LOGIN_HREF,
    showPanelLink: authenticated && roleCanAccessPanel(role),
    showAdminLink: authenticated && role === 'ADMIN',
  };
}
