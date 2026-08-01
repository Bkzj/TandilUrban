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
    passwordConfirmation: passwordSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.password !== value.passwordConfirmation) {
      context.addIssue({
        code: 'custom',
        path: ['passwordConfirmation'],
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

export const createAgentSchema = z
  .object({
    nombre: normalizedNameSchema,
    email: normalizedEmailSchema,
    password: passwordSchema,
  })
  .strict();

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

export function safeInternalCallbackUrl(
  raw: string | null | undefined,
  trustedApplicationUrl?: string,
): string {
  if (!raw) return '/';
  if (/[\u0000-\u001f\u007f\\]|%(?:00|0a|0d)/iu.test(raw)) return '/';
  const value = raw.trim();
  if (value.length > 512) return '/';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (!trustedApplicationUrl) return '/';
  try {
    const trusted = new URL(trustedApplicationUrl);
    const candidate = new URL(value);
    if (
      !['http:', 'https:'].includes(candidate.protocol) ||
      candidate.username ||
      candidate.password ||
      candidate.origin !== trusted.origin
    ) {
      return '/';
    }
    return candidate.toString();
  } catch {
    return '/';
  }
}
