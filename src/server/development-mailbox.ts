import { randomUUID } from 'node:crypto';

const MAX_MESSAGES = 100;
const MAX_HTML_LENGTH = 512_000;
const MAX_TEXT_LENGTH = 256_000;

export type DevelopmentMailboxTemplate =
  | 'account_invitation'
  | 'email_verification'
  | 'password_reset'
  | 'password_changed'
  | 'two_factor_notification'
  | 'other';

export type DevelopmentMailboxCapture = Readonly<{
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: DevelopmentMailboxTemplate;
  actionUrl?: string;
  correlationId?: string;
}>;

export type DevelopmentMailboxMessage = Readonly<{
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  template: DevelopmentMailboxTemplate;
  actionUrl?: string;
  correlationId: string;
  createdAt: Date;
}>;

type DevelopmentMailboxState = { messages: DevelopmentMailboxMessage[] };

declare global {
  var __propeaDevelopmentMailbox: DevelopmentMailboxState | undefined;
}

function mailboxState(): DevelopmentMailboxState {
  globalThis.__propeaDevelopmentMailbox ??= { messages: [] };
  return globalThis.__propeaDevelopmentMailbox;
}

function safeHeaderText(value: string, maximum: number): string {
  return value.replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, maximum);
}

function safeLocalActionUrl(value: string | undefined): string | undefined {
  if (!value || /[\u0000-\u001f\u007f]/u.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function sanitizeDevelopmentEmailHtml(value: string): string {
  return value
    .slice(0, MAX_HTML_LENGTH)
    .replace(/<(script|iframe|object|embed|form|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, '')
    .replace(/<\/?(?:script|iframe|object|embed|form|svg|math|base|meta|link)\b[^>]*>/giu, '')
    .replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, '')
    .replace(/\s+(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data):[\s\S]*?\2/giu, ' $1="#"')
    .replace(/\burl\s*\(/giu, 'blocked-url(');
}

export function isDevelopmentMailboxAvailable(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === 'development';
}

export function captureDevelopmentEmail(input: DevelopmentMailboxCapture): DevelopmentMailboxMessage {
  const message: DevelopmentMailboxMessage = {
    id: randomUUID(),
    to: safeHeaderText(input.to, 320),
    subject: safeHeaderText(input.subject, 240),
    html: sanitizeDevelopmentEmailHtml(input.html),
    text: (input.text ?? '').slice(0, MAX_TEXT_LENGTH),
    template: input.template ?? 'other',
    correlationId: safeHeaderText(input.correlationId ?? randomUUID(), 128),
    createdAt: new Date(),
    ...(safeLocalActionUrl(input.actionUrl) ? { actionUrl: safeLocalActionUrl(input.actionUrl) } : {}),
  };
  const state = mailboxState();
  state.messages.unshift(message);
  if (state.messages.length > MAX_MESSAGES) state.messages.length = MAX_MESSAGES;
  return message;
}

export function listDevelopmentEmails(): readonly DevelopmentMailboxMessage[] {
  return mailboxState().messages.slice();
}

export function getDevelopmentEmail(id: string): DevelopmentMailboxMessage | null {
  return mailboxState().messages.find((message) => message.id === id) ?? null;
}

export function clearDevelopmentMailbox(): number {
  const state = mailboxState();
  const removed = state.messages.length;
  state.messages.length = 0;
  return removed;
}
