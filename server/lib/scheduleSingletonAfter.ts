import 'server-only'

import { after } from 'next/server'
import { logger } from '@/lib/logger'

const scheduledKeys = new Set<string>()

export function scheduleSingletonAfter(
  key: string,
  task: () => Promise<void>,
  context?: Record<string, unknown>,
): boolean {
  if (scheduledKeys.has(key)) {
    return false
  }

  scheduledKeys.add(key)

  try {
    after(async () => {
      try {
        await task()
      } catch (err) {
        logger.error('Deferred task failed', {
          key,
          err: String(err),
          ...context,
        })
      } finally {
        scheduledKeys.delete(key)
      }
    })
    return true
  } catch (err) {
    scheduledKeys.delete(key)
    logger.warn('Deferred task could not be scheduled', {
      key,
      err: String(err),
      ...context,
    })
    return false
  }
}
