import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const nextBinary = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
const buildUrl = 'https://build.invalid';
const buildDatabaseUrl = new URL('postgresql://127.0.0.1:5432/propea_build');
buildDatabaseUrl.username = 'build';
buildDatabaseUrl.password = 'build';
const result = spawnSync(process.execPath, [nextBinary, 'build'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATABASE_URL: buildDatabaseUrl.toString(),
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? buildUrl,
    NEXTAUTH_SECRET: 'b'.repeat(64),
    APP_URL: process.env.APP_URL ?? buildUrl,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? buildUrl,
    APP_INTERNAL_URL: process.env.APP_INTERNAL_URL ?? buildUrl,
    VIEW_TRACKING_SECRET: 'c'.repeat(64),
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? 'build',
    CLOUDINARY_API_KEY: 'build-only-key',
    CLOUDINARY_API_SECRET: 'd'.repeat(32),
    RESEND_API_KEY: 're_build_only',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? 'Build <build@build.invalid>',
    RATE_LIMIT_BACKEND: 'postgresql',
  },
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.signal) {
  process.stderr.write(`next build terminó por la señal ${result.signal}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
