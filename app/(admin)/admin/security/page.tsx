import { getSmtpConfigStatus } from '@/server/config/smtp'
import { getLocale } from '@/lib/i18n/server'

export default async function SecurityPage() {
  const locale = await getLocale()
  const isFrench = locale === 'fr'
  const smtp = getSmtpConfigStatus()
  const appSecretLength = (process.env.APP_SECRET ?? '').length
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '—'
  const isVercel = Boolean(process.env.VERCEL)
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const transactionalEmailBehavior =
    isVercel || nodeEnv === 'production'
      ? (isFrench
        ? 'Sans SMTP valide, les invitations et resets par email echouent avec une erreur serveur.'
        : 'Without valid SMTP, invitation and reset emails fail with a server error.')
      : (isFrench
        ? "Sans SMTP valide, les emails ne partent pas : le service ecrit seulement le destinataire et le sujet dans les logs."
        : 'Without valid SMTP, emails are not sent: the service only writes the recipient and subject to the logs.')

  const smtpStatus = smtp.configured
    ? {
        value: isFrench ? `Oui - ${smtp.host}:${smtp.port}` : `Yes - ${smtp.host}:${smtp.port}`,
        color: 'text-[var(--color-success)]',
      }
    : smtp.partial
      ? {
          value: isFrench ? `Partielle - manquantes : ${smtp.missing.join(', ')}` : `Partial - missing: ${smtp.missing.join(', ')}`,
          color: 'text-[var(--color-danger)]',
        }
      : {
          value: isFrench ? 'Non' : 'No',
          color: 'text-[var(--color-warning)]',
        }

  const secretStrength =
    appSecretLength >= 44 ? { label: isFrench ? 'Fort (>= 44 car.)' : 'Strong (>= 44 chars)', color: 'text-[var(--color-success)]' } :
    appSecretLength >= 32 ? { label: isFrench ? 'Correct (>= 32 car.)' : 'Acceptable (>= 32 chars)', color: 'text-[var(--color-warning)]' } :
    { label: isFrench ? `Trop court (${appSecretLength} car.)` : `Too short (${appSecretLength} chars)`, color: 'text-[var(--color-danger)]' }

  const sections = [
    {
      title: isFrench ? 'Session & JWT' : 'Session & JWT',
      items: [
        { label: isFrench ? 'Algorithme' : 'Algorithm', value: 'HS256 (HMAC-SHA-256)' },
        { label: isFrench ? 'Duree de validite' : 'Validity period', value: isFrench ? '24 heures' : '24 hours' },
        { label: isFrench ? 'Fenetre de refresh' : 'Refresh window', value: isFrench ? '4 heures avant expiration (auto-refresh)' : '4 hours before expiry (auto-refresh)' },
        { label: isFrench ? 'Invalidation' : 'Invalidation', value: isFrench ? 'token_version en base - logout/reset/desactivation incrementent la version' : 'token_version in DB - logout/reset/deactivation increment the version' },
        { label: 'Cookie', value: isFrench ? 'HttpOnly, SameSite=Lax, Secure sur Vercel' : 'HttpOnly, SameSite=Lax, Secure on Vercel' },
        { label: isFrench ? 'Nom du cookie' : 'Cookie name', value: '_session' },
      ],
    },
    {
      title: isFrench ? 'Rate limiting' : 'Rate limiting',
      items: [
        { label: isFrench ? 'Login / forgot-password' : 'Login / forgot-password', value: isFrench ? '5 tentatives / 15 minutes (par IP)' : '5 attempts / 15 minutes (per IP)' },
        { label: isFrench ? 'Stockage' : 'Storage', value: isVercel ? (isFrench ? 'In-memory (instance unique) - envisager Upstash KV en multi-instance' : 'In-memory (single instance) - consider Upstash KV for multi-instance') : (isFrench ? 'In-memory (developpement)' : 'In-memory (development)') },
      ],
    },
    {
      title: 'APP_SECRET',
      items: [
        { label: isFrench ? 'Force' : 'Strength', value: secretStrength.label, color: secretStrength.color },
        { label: isFrench ? 'Longueur' : 'Length', value: isFrench ? `${appSecretLength} caracteres` : `${appSecretLength} characters` },
        { label: isFrench ? 'Conseille' : 'Recommended', value: 'openssl rand -base64 32' },
      ],
    },
    {
      title: isFrench ? 'Emails transactionnels' : 'Transactional emails',
      items: [
        { label: isFrench ? 'SMTP configure' : 'SMTP configured', value: smtpStatus.value, color: smtpStatus.color },
        { label: 'From', value: smtp.from },
        { label: isFrench ? 'Effet si SMTP absent' : 'Impact if SMTP is missing', value: transactionalEmailBehavior },
      ],
    },
    {
      title: isFrench ? 'Environnement' : 'Environment',
      items: [
        { label: 'NODE_ENV', value: nodeEnv },
        { label: isFrench ? 'Sur Vercel' : 'On Vercel', value: isVercel ? (isFrench ? 'Oui' : 'Yes') : (isFrench ? 'Non (local)' : 'No (local)') },
        { label: 'APP_URL', value: appUrl },
        { label: 'CSP unsafe-eval', value: nodeEnv === 'development' ? (isFrench ? 'Active (dev uniquement - React Turbopack)' : 'Enabled (dev only - React Turbopack)') : (isFrench ? 'Desactive (production)' : 'Disabled (production)') },
      ],
    },
    {
      title: isFrench ? 'Posture actuelle' : 'Current posture',
      items: [
        { label: isFrench ? 'Mots de passe' : 'Passwords', value: 'bcrypt (12 rounds)', color: 'text-[var(--color-success)]' },
        { label: isFrench ? 'Tokens invite/reset' : 'Invite/reset tokens', value: isFrench ? 'SHA-256 uniquement en base (raw token jamais stocke)' : 'SHA-256 only in DB (raw token never stored)', color: 'text-[var(--color-success)]' },
        { label: isFrench ? 'User enumeration' : 'User enumeration', value: isFrench ? 'Protegee - forgot-password retourne toujours 200' : 'Protected - forgot-password always returns 200', color: 'text-[var(--color-success)]' },
        { label: isFrench ? 'Password minimum' : 'Minimum password', value: isFrench ? '12 caracteres' : '12 characters', color: 'text-[var(--color-success)]' },
        { label: 'MFA', value: isFrench ? 'Non implemente (prevu - champ mfa_secret en base)' : 'Not implemented yet (planned - mfa_secret field in DB)', color: 'text-[var(--color-text-muted)]' },
        { label: isFrench ? 'Rate limit multi-instance' : 'Multi-instance rate limit', value: isVercel ? (isFrench ? 'A configurer (Upstash/Vercel KV recommande)' : 'Needs configuration (Upstash/Vercel KV recommended)') : 'N/A', color: isVercel ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]' },
      ],
    },
  ]

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{isFrench ? 'Securite' : 'Security'}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {isFrench
            ? "Configuration de l'authentification et posture de securite actuelle."
            : 'Authentication configuration and current security posture.'}
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{section.title}</h2>
          </div>
          <dl className="divide-y divide-[var(--color-border)]">
            {section.items.map((item) => (
              <div key={item.label} className="px-4 py-2.5 flex gap-4">
                <dt className="text-xs text-[var(--color-text-muted)] w-52 shrink-0 pt-0.5">{item.label}</dt>
                <dd className={`text-xs flex-1 ${(item as { color?: string }).color ?? 'text-[var(--color-text-secondary)]'}`}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
