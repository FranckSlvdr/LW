import 'server-only'

const REQUIRED_SMTP_ENV_KEYS = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const
const DEFAULT_SMTP_PORT = 587
const DEFAULT_EMAIL_FROM = 'Last War Tracker <noreply@lastwar.app>'

type RequiredSmtpEnvKey = (typeof REQUIRED_SMTP_ENV_KEYS)[number]

function readRequiredEnv(key: RequiredSmtpEnvKey): string {
  return process.env[key]?.trim() ?? ''
}

function readSmtpPort(): number {
  const parsed = Number(process.env.SMTP_PORT ?? DEFAULT_SMTP_PORT)
  return Number.isFinite(parsed) ? parsed : DEFAULT_SMTP_PORT
}

export function getSmtpConfigStatus() {
  const values = {
    SMTP_HOST: readRequiredEnv('SMTP_HOST'),
    SMTP_USER: readRequiredEnv('SMTP_USER'),
    SMTP_PASS: readRequiredEnv('SMTP_PASS'),
  }

  const missing = REQUIRED_SMTP_ENV_KEYS.filter((key) => !values[key])
  const hasAnyRequiredValue = REQUIRED_SMTP_ENV_KEYS.some((key) => Boolean(values[key]))

  return {
    configured: missing.length === 0,
    partial: hasAnyRequiredValue && missing.length > 0,
    missing,
    host: values.SMTP_HOST,
    user: values.SMTP_USER,
    pass: values.SMTP_PASS,
    port: readSmtpPort(),
    from: process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM,
  }
}

