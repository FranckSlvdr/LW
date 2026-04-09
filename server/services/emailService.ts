import 'server-only'

/**
 * Email service — sends transactional emails.
 *
 * Transport selection:
 *   - SMTP_HOST set → nodemailer SMTP transport
 *   - Otherwise      → stdout fallback (dev / preview environments)
 *
 * Required env vars (when SMTP_HOST is set):
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS
 *   EMAIL_FROM (default 'noreply@lastwar.app')
 */

const FROM    = process.env.EMAIL_FROM   ?? 'Last War Tracker <noreply@lastwar.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface MailOptions {
  to: string
  subject: string
  text: string
  html: string
}

async function sendMail(opts: MailOptions): Promise<void> {
  if (process.env.SMTP_HOST) {
    // Dynamic import so nodemailer isn't bundled in Edge Runtime
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
    await transporter.sendMail({ from: FROM, ...opts })
  } else {
    // Stdout fallback — useful in dev and preview
    console.log('[emailService] ─── EMAIL (stdout fallback) ───────────────')
    console.log(`To:      ${opts.to}`)
    console.log(`Subject: ${opts.subject}`)
    console.log(opts.text)
    console.log('────────────────────────────────────────────────────────────')
  }
}

// ─── Transactional emails ────────────────────────────────────────────────────

export async function sendInviteEmail(to: string, name: string, rawToken: string): Promise<void> {
  const url = `${APP_URL}/auth/accept-invite?token=${rawToken}`
  await sendMail({
    to,
    subject: 'Invitation à rejoindre Last War Tracker',
    text: `Bonjour ${name},\n\nVous avez été invité à rejoindre Last War Tracker.\n\nAccédez à votre compte ici (valable 48h) :\n${url}\n`,
    html: `
      <p>Bonjour <strong>${name}</strong>,</p>
      <p>Vous avez été invité à rejoindre <strong>Last War Tracker</strong>.</p>
      <p><a href="${url}">Activer mon compte</a> (lien valable 48h)</p>
      <p style="color:#666;font-size:12px">Si vous n'attendiez pas cet email, ignorez-le.</p>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const url = `${APP_URL}/auth/reset-password?token=${rawToken}`
  await sendMail({
    to,
    subject: 'Réinitialisation de votre mot de passe',
    text: `Une demande de réinitialisation de mot de passe a été reçue.\n\nCliquez ici (valable 1h) :\n${url}\n\nSi vous n'avez pas fait cette demande, ignorez cet email.`,
    html: `
      <p>Une demande de réinitialisation de mot de passe a été reçue.</p>
      <p><a href="${url}">Réinitialiser mon mot de passe</a> (lien valable 1h)</p>
      <p style="color:#666;font-size:12px">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `,
  })
}
