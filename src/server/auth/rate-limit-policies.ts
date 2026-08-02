import { hashAuthSecret } from '@/lib/auth-security';

export const AUTH_RATE_LIMIT_POLICIES = {
  registrationIp: { limit: 5, windowMs: 60 * 60 * 1000 },
  registrationIdentity: { limit: 3, windowMs: 60 * 60 * 1000 },
  verificationResendIp: { limit: 5, windowMs: 60 * 60 * 1000 },
  verificationResendIdentity: { limit: 3, windowMs: 60 * 60 * 1000 },
  loginIp: { limit: 30, windowMs: 15 * 60 * 1000 },
  loginIdentity: { limit: 10, windowMs: 15 * 60 * 1000 },
  passwordResetRequestIp: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordResetRequestIdentity: { limit: 3, windowMs: 60 * 60 * 1000 },
  passwordResetConsumeIp: { limit: 10, windowMs: 15 * 60 * 1000 },
  passwordResetConsumeToken: { limit: 5, windowMs: 15 * 60 * 1000 },
  passwordChangeIp: { limit: 10, windowMs: 15 * 60 * 1000 },
  passwordChangeUser: { limit: 5, windowMs: 15 * 60 * 1000 },
  twoFactorLoginIp: { limit: 10, windowMs: 15 * 60 * 1000 },
  twoFactorLoginChallenge: { limit: 5, windowMs: 15 * 60 * 1000 },
  twoFactorSetupUser: { limit: 5, windowMs: 15 * 60 * 1000 },
  twoFactorManagementUser: { limit: 5, windowMs: 15 * 60 * 1000 },
} as const;

export function authIdentityRateLimitKey(scope: string, normalizedEmail: string): string {
  return `${scope}:identity:${hashAuthSecret(normalizedEmail).slice(0, 32)}`;
}
