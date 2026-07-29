import { isIP } from 'node:net';

import { z } from 'zod';

import { REQUEST_LIMITS } from '@/lib/validation/limits';

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  );
}

export function isPrivateOrLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/u, '');
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized.endsWith('.local')) {
    return true;
  }
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) === 6) {
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
  }
  return false;
}

export function parseSafeHttpsUrl(
  value: string,
  options: { allowLocalDevelopment?: boolean; allowedHosts?: ReadonlySet<string> } = {},
): string | null {
  if (value.length > REQUEST_LIMITS.urlChars || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const localDevelopment =
    options.allowLocalDevelopment === true &&
    process.env.NODE_ENV !== 'production' &&
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.protocol !== 'https:' && !localDevelopment) return null;
  if (isPrivateOrLocalHostname(url.hostname) && !localDevelopment) return null;
  if (options.allowedHosts && !options.allowedHosts.has(url.hostname.toLowerCase())) return null;
  return url.toString();
}

export const propertyMediaUrlSchema = z
  .string()
  .trim()
  .max(REQUEST_LIMITS.urlChars)
  .transform((value, context) => {
    const parsed = parseSafeHttpsUrl(value, {
      allowLocalDevelopment: false,
    });
    if (!parsed) {
      context.addIssue({ code: 'custom', message: 'La URL de imagen no está permitida.' });
      return z.NEVER;
    }
    return parsed;
  });
