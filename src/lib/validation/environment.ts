import { z } from 'zod';

import { parseSafeHttpsUrl } from '@/lib/validation/url';

const optionalTrimmed = z.string().trim().min(1).optional();
const optionalBounded = z.string().trim().min(1).max(2_048).optional();
const requiredUrl = z.string().trim().transform((value, context) => {
  const parsed = parseSafeHttpsUrl(value, { allowLocalDevelopment: true });
  if (!parsed) {
    context.addIssue({ code: 'custom', message: 'Debe ser una URL HTTP(S) confiable.' });
    return z.NEVER;
  }
  return parsed;
});
const secret = z.string().min(32, 'Debe tener al menos 32 caracteres.');

export const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .string()
      .trim()
      .refine((value) => {
        try {
          const protocol = new URL(value).protocol;
          return protocol === 'postgresql:' || protocol === 'postgres:';
        } catch {
          return false;
        }
      }, 'DATABASE_URL debe ser una URL PostgreSQL válida.'),
    NEXTAUTH_URL: requiredUrl,
    NEXTAUTH_SECRET: secret,
    APP_URL: requiredUrl,
    NEXT_PUBLIC_APP_URL: requiredUrl,
    APP_INTERNAL_URL: requiredUrl,
    VIEW_TRACKING_SECRET: secret,
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: optionalTrimmed.refine((value) => {
      if (!value) return true;
      try {
        return [16, 24, 32].includes(Buffer.from(value, 'base64').byteLength);
      } catch {
        return false;
      }
    }, 'Debe ser Base64 y decodificar a 16, 24 o 32 bytes.'),
    CLOUDINARY_CLOUD_NAME: z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/u).optional(),
    CLOUDINARY_API_KEY: z.string().trim().min(3).max(256).optional(),
    CLOUDINARY_API_SECRET: z.string().trim().min(16).max(512).optional(),
    GEMINI_API_KEY: z.string().trim().min(8).max(512).optional(),
    GEMINI_MODEL: z.string().trim().regex(/^[A-Za-z0-9._-]{1,128}$/u).optional(),
    RESEND_API_KEY: z.string().trim().min(5).max(512).optional(),
    RESEND_FROM_EMAIL: optionalBounded,
    LEAD_NOTIFICATION_TO_EMAIL: optionalBounded,
    MATCH_NOTIFICATION_TO_EMAIL: optionalBounded,
    RATE_LIMIT_BACKEND: z.enum(['postgresql', 'memory']).default('postgresql'),
    RATE_LIMIT_TRUSTED_IP_HEADER: z
      .enum(['x-vercel-forwarded-for', 'cf-connecting-ip'])
      .optional(),
    PUPPETEER_EXECUTABLE_PATH: optionalBounded,
    PUPPETEER_DISABLE_SANDBOX: z.enum(['true', 'false']).default('false'),
    PDF_ALLOWED_ORIGINS: optionalBounded,
  })
  .passthrough()
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'production') return;
    const requiredProduction = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'RESEND_API_KEY',
      'RESEND_FROM_EMAIL',
    ] as const;
    for (const field of requiredProduction) {
      if (!value[field]) {
        context.addIssue({ code: 'custom', message: 'Variable requerida en producción.', path: [field] });
      }
    }
    if (value.RATE_LIMIT_BACKEND !== 'postgresql') {
      context.addIssue({
        code: 'custom',
        message: 'En producción el rate limit debe usar PostgreSQL.',
        path: ['RATE_LIMIT_BACKEND'],
      });
    }
    for (const field of [
      'NEXTAUTH_URL',
      'APP_URL',
      'NEXT_PUBLIC_APP_URL',
      'APP_INTERNAL_URL',
    ] as const) {
      if (!value[field].startsWith('https://')) {
        context.addIssue({ code: 'custom', message: 'En producción debe usar HTTPS.', path: [field] });
      }
    }
    for (const field of ['NEXTAUTH_SECRET', 'VIEW_TRACKING_SECRET'] as const) {
      if (/replace|example|change|secret/i.test(value[field])) {
        context.addIssue({ code: 'custom', message: 'El valor parece un placeholder.', path: [field] });
      }
    }
    if (value.PDF_ALLOWED_ORIGINS) {
      for (const rawOrigin of value.PDF_ALLOWED_ORIGINS.split(',')) {
        const origin = rawOrigin.trim();
        const parsed = parseSafeHttpsUrl(origin);
        if (!parsed || new URL(parsed).origin !== origin.replace(/\/$/u, '')) {
          context.addIssue({
            code: 'custom',
            message: 'Contiene un origen HTTPS inválido.',
            path: ['PDF_ALLOWED_ORIGINS'],
          });
          break;
        }
      }
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function validateServerEnvironment(
  environment: NodeJS.ProcessEnv,
): { ok: true; data: ServerEnvironment } | { ok: false; fields: readonly string[] } {
  const parsed = serverEnvironmentSchema.safeParse(environment);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    fields: [...new Set(parsed.error.issues.map((issue) => issue.path.join('.') || '_environment'))],
  };
}

export function getServerEnvironment(): ServerEnvironment {
  return (() => {
    const localDatabaseUrl = new URL('postgresql://127.0.0.1:5432/propea_local');
    localDatabaseUrl.username = 'local';
    localDatabaseUrl.password = 'local';
    const runtimeEnvironment =
      process.env.NODE_ENV === 'production'
        ? process.env
        : {
            DATABASE_URL: localDatabaseUrl.toString(),
            NEXTAUTH_URL: 'http://localhost:3000',
            NEXTAUTH_SECRET: ['local', 'only', 'nextauth', 'minimum', '32', 'bytes'].join('-'),
            APP_URL: 'http://localhost:3000',
            NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
            APP_INTERNAL_URL: 'http://localhost:3000',
            VIEW_TRACKING_SECRET: 'local-only-view-secret-32-bytes-minimum',
            ...process.env,
          };
    const parsed = validateServerEnvironment(runtimeEnvironment);
    if (!parsed.ok) {
      throw new Error(`Configuración de entorno inválida: ${parsed.fields.join(', ')}`);
    }
    return parsed.data;
  })();
}
