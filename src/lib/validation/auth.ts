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

export const forgotPasswordSchema = z
  .object({ email: normalizedEmailSchema })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/u, 'El enlace no es válido o venció.'),
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

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    passwordConfirmation: passwordSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.newPassword !== value.passwordConfirmation) {
      context.addIssue({
        code: 'custom',
        path: ['passwordConfirmation'],
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

const totpCodeSchema = z.string().max(16).transform((value) => value.replace(/\s/gu, '')).pipe(z.string().regex(/^\d{6}$/u));
const recoveryCodeSchema = z.string().trim().min(8).max(64);

export const twoFactorLoginStartSchema = credentialsSchema;
export const twoFactorLoginCompleteSchema = z.object({
  challengeToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
  factor: z.enum(['totp', 'recovery']),
  code: z.string().min(1).max(64),
}).strict();
export const twoFactorSetupStartSchema = z.object({ password: passwordSchema }).strict();
export const twoFactorSetupConfirmSchema = z.object({ code: totpCodeSchema }).strict();
export const twoFactorRegenerateSchema = z.object({ password: passwordSchema, code: totpCodeSchema }).strict();
export const twoFactorDisableSchema = z.object({
  password: passwordSchema,
  factor: z.enum(['totp', 'recovery']),
  code: z.union([totpCodeSchema, recoveryCodeSchema]),
}).strict();

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
