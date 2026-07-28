type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Readonly<Record<string, unknown>>;

const SENSITIVE_KEY = /(authorization|cookie|password|secret|token|api[-_]?key|mensaje|email|telefono|body)/iu;

export function redactLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
    return value;
  }
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactLogValue(item, seen));

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactLogValue(nested, seen);
  }
  return output;
}

function write(level: LogLevel, event: string, context: LogContext = {}): void {
  const safeContext = redactLogValue(context);
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(safeContext && typeof safeContext === 'object' && !Array.isArray(safeContext) ? safeContext : {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (level === 'info') console.info(line);
  else if (process.env.NODE_ENV !== 'production') console.debug(line);
}

export const serverLogger = {
  debug: (event: string, context?: LogContext) => write('debug', event, context),
  info: (event: string, context?: LogContext) => write('info', event, context),
  warn: (event: string, context?: LogContext) => write('warn', event, context),
  error: (event: string, context?: LogContext) => write('error', event, context),
};
