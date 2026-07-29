import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createSourceZip, extractStoredZip } from './source-archive-lib.mjs';

const temporary = mkdtempSync(join(tmpdir(), 'propea-source-validation-'));
const zip = join(temporary, 'source.zip');
const extracted = join(temporary, 'extracted');
const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder',
  NEXTAUTH_SECRET: 'archive-validation-placeholder-secret-32-bytes',
  APP_INTERNAL_URL: 'https://app.example.test',
  RATE_LIMIT_BACKEND: 'memory',
};

try {
  createSourceZip(zip, resolve('.'));
  extractStoredZip(zip, extracted);
  const commands = [
    ['npm', ['ci']],
    ['npx', ['prisma', 'validate']],
    ['npx', ['prisma', 'generate']],
    ['npm', ['run', 'check:secrets']],
    ['npm', ['run', 'check:dead-code']],
    ['npm', ['test']],
    ['npm', ['run', 'test:integration']],
    ['npm', ['run', 'lint']],
    ['npm', ['run', 'typecheck']],
    ['npm', ['run', 'build']],
    ['git', ['diff', '--check']],
    ['npm', ['run', 'archive:source']],
  ];
  for (const [command, args] of commands) {
    if (command === 'git') {
      execFileSync('git', ['init', '--quiet'], { cwd: extracted, stdio: 'inherit' });
      execFileSync('git', ['config', 'user.email', 'archive-validation@example.test'], { cwd: extracted });
      execFileSync('git', ['config', 'user.name', 'Archive Validation'], { cwd: extracted });
      execFileSync('git', ['add', '--all'], { cwd: extracted, stdio: 'inherit' });
      execFileSync('git', ['commit', '--quiet', '-m', 'archive baseline'], { cwd: extracted, stdio: 'inherit' });
    }
    console.log(`Archive validation: ${command} ${args.join(' ')}`);
    if (process.platform === 'win32' && ['npm', 'npx'].includes(command)) {
      const commandProcessor = process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe';
      execFileSync(commandProcessor, ['/d', '/s', '/c', `${command}.cmd`, ...args], {
        cwd: extracted,
        env,
        stdio: 'inherit',
      });
    } else {
      execFileSync(command, args, { cwd: extracted, env, stdio: 'inherit' });
    }
  }
  console.log(`Archive validation OK: ${extracted}`);
} finally {
  if (process.env.KEEP_ARCHIVE_VALIDATION_TEMP !== 'true') rmSync(temporary, { recursive: true, force: true });
}
