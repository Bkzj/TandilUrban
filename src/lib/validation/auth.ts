import { z } from 'zod';

import {
  normalizedEmailSchema,
  normalizedNameSchema,
  passwordSchema,
} from '@/lib/validation/common';

export const registerSchema = z
  .object({
    nombre: normalizedNameSchema,
    email: normalizedEmailSchema,
    password: passwordSchema,
  })
  .strict();

export const createAgentSchema = registerSchema;

export const resendVerificationSchema = z
  .object({
    email: normalizedEmailSchema,
  })
  .strict();

export const credentialsSchema = z
  .object({
    email: normalizedEmailSchema,
    password: passwordSchema,
  })
  .strict();

export const verificationTokenSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{43}$/u, 'Token de verificación inválido.');

export function safeInternalCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return '/';
  const value = raw.trim();
  if (
    value.length > 512 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\u0000-\u001f\u007f\\]/u.test(value)
  ) {
    return '/';
  }
  return value;
}
