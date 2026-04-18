import 'server-only'

const requiresCronSecret = Boolean(process.env.VERCEL || process.env.VERCEL_ENV)

export function getCronSecret(): string | null {
  const rawSecret = process.env.CRON_SECRET

  if (!rawSecret) {
    if (requiresCronSecret) {
      throw new Error(
        '[env] CRON_SECRET is required on Vercel for scheduled jobs.',
      )
    }

    return null
  }

  const trimmedSecret = rawSecret.trim()

  if (!trimmedSecret) {
    if (requiresCronSecret) {
      throw new Error('[env] CRON_SECRET must not be empty.')
    }

    return null
  }

  if (rawSecret !== trimmedSecret) {
    throw new Error(
      '[env] CRON_SECRET must not contain leading or trailing whitespace.',
    )
  }

  return trimmedSecret
}
