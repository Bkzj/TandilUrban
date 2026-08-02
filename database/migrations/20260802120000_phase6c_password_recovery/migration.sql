-- Phase 6C adds explicit audit categories without changing account or token data.
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET_COMPLETED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGE_FAILED';
