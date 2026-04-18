import 'server-only'
import { getSmtpConfigStatus } from '@/server/config/smtp'

/**
 * Email service for transactional messages.
 *
 * Transport selection:
 * - `SMTP_HOST` set: use nodemailer SMTP transport
 * - otherwise: allow a local-dev fallback only
 *
 * Required env vars when SMTP is configured:
 * - `SMTP_HOST`
 * - `SMTP_PORT` (default `587`)
 * - `SMTP_USER`
 * - `SMTP_PASS`
 * - `EMAIL_FROM` (optional, defaults to `noreply@lastwar.app`)
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface MailOptions {
  to: string
  subject: string
  text: string
  html: string
}

async function sendMail(opts: MailOptions): Promise<void> {
  const smtp = getSmtpConfigStatus()

  if (smtp.partial) {
    throw new Error(
      `SMTP configuration is incomplete. Missing: ${smtp.missing.join(', ')}`,
    )
  }

  if (smtp.configured) {
    // Keep nodemailer out of routes that never send email.
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    })

    await transporter.sendMail({ from: smtp.from, ...opts })
    return
  }

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new Error('SMTP is not configured for transactional email delivery.')
  }

  console.log('[emailService] Email delivery skipped because SMTP is not configured.')
  console.log(`To: ${opts.to}`)
  console.log(`Subject: ${opts.subject}`)
}

export async function sendInviteEmail(
  to: string,
  name: string,
  rawToken: string,
): Promise<void> {
  const url = `${APP_URL}/auth/accept-invite?token=${rawToken}`
  await sendMail({
    to,
    subject: 'Invitation a rejoindre Last War Tracker',
    text:
      `Bonjour ${name},\n\n` +
      'Vous avez ete invite a rejoindre Last War Tracker.\n\n' +
      `Accedez a votre compte ici (valable 48h) :\n${url}\n`,
    html: [
      `<p>Bonjour <strong>${name}</strong>,</p>`,
      '<p>Vous avez ete invite a rejoindre <strong>Last War Tracker</strong>.</p>',
      `<p><a href="${url}">Activer mon compte</a> (lien valable 48h)</p>`,
      "<p style=\"color:#666;font-size:12px\">Si vous n'attendiez pas cet email, ignorez-le.</p>",
    ].join(''),
  })
}

export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
): Promise<void> {
  const url = `${APP_URL}/auth/reset-password?token=${rawToken}`
  await sendMail({
    to,
    subject: 'Reinitialisation de votre mot de passe',
    text:
      'Une demande de reinitialisation de mot de passe a ete recue.\n\n' +
      `Cliquez ici (valable 1h) :\n${url}\n\n` +
      "Si vous n'avez pas fait cette demande, ignorez cet email.",
    html: [
      '<p>Une demande de reinitialisation de mot de passe a ete recue.</p>',
      `<p><a href="${url}">Reinitialiser mon mot de passe</a> (lien valable 1h)</p>`,
      "<p style=\"color:#666;font-size:12px\">Si vous n'avez pas fait cette demande, ignorez cet email.</p>",
    ].join(''),
  })
}
