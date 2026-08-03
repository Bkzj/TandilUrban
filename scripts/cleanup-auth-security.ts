import { prisma } from '../src/lib/prisma';
import { cleanupAuthSessions } from '../src/server/auth-security/auth-session-repository';

const apply = process.argv.includes('--apply');
const unknown = process.argv.slice(2).filter((value) => value !== '--apply');
if (unknown.length > 0) throw new Error(`Argumentos no reconocidos: ${unknown.join(', ')}`);

const now = new Date();
const securityCutoff = new Date(now.getTime() - 365 * 86_400_000);
const transientCutoff = new Date(now.getTime() - 30 * 86_400_000);

try {
  const sessions = await cleanupAuthSessions({ now, retentionDays: 30, apply });
  const [challenges, resetTokens, verificationTokens, securityEvents] = await Promise.all([
    prisma.twoFactorChallenge.count({ where: { OR: [{ consumedAt: { lt: transientCutoff } }, { expiresAt: { lt: transientCutoff } }] } }),
    prisma.passwordResetToken.count({ where: { OR: [{ consumedAt: { lt: transientCutoff } }, { expiresAt: { lt: transientCutoff } }] } }),
    prisma.verificationToken.count({ where: { OR: [{ consumedAt: { lt: transientCutoff } }, { invalidatedAt: { lt: transientCutoff } }, { expiresAt: { lt: transientCutoff } }] } }),
    prisma.securityEvent.count({ where: { createdAt: { lt: securityCutoff } } }),
  ]);
  if (apply) {
    await prisma.$transaction([
      prisma.twoFactorChallenge.deleteMany({ where: { OR: [{ consumedAt: { lt: transientCutoff } }, { expiresAt: { lt: transientCutoff } }] } }),
      prisma.passwordResetToken.deleteMany({ where: { OR: [{ consumedAt: { lt: transientCutoff } }, { expiresAt: { lt: transientCutoff } }] } }),
      prisma.verificationToken.deleteMany({ where: { OR: [{ consumedAt: { lt: transientCutoff } }, { invalidatedAt: { lt: transientCutoff } }, { expiresAt: { lt: transientCutoff } }] } }),
      prisma.securityEvent.deleteMany({ where: { createdAt: { lt: securityCutoff } } }),
    ]);
  }
  process.stdout.write(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', sessions, challenges, resetTokens, verificationTokens, securityEvents }) + '\n');
} finally {
  await prisma.$disconnect();
}
