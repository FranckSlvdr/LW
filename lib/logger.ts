import 'server-only'

/**
 * Server-side structured logger.
 *
 * Rules:
 * - NEVER import this file in client components or pages (server-only)
 * - Outputs JSON for easy parsing in Vercel logs / external log aggregators
 * - In development, output is pretty-printed for readability
 * - Never log sensitive data (tokens, passwords, full user objects)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

const isDev = process.env.NODE_ENV === 'development'

function formatEntry(entry: LogEntry): string {
  if (isDev) {
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
    return `[${entry.level.toUpperCase()}] ${entry.message}${ctx}`
  }
  return JSON.stringify(entry)
}

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  }

  const formatted = formatEntry(entry)

  switch (level) {
    case 'error':
      console.error(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    default:
      console.log(formatted)
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    log('error', message, context),
}
