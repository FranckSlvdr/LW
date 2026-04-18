import { getSmtpConfigStatus } from '@/server/config/smtp'

// Server component — safe to read process.env
export default function SecurityPage() {
  const smtp = getSmtpConfigStatus()
  const appSecretLength  = (process.env.APP_SECRET ?? '').length
  const appUrl           = process.env.NEXT_PUBLIC_APP_URL ?? '—'
  const isVercel         = Boolean(process.env.VERCEL)
  const nodeEnv          = process.env.NODE_ENV ?? 'development'
  const transactionalEmailBehavior =
    isVercel || nodeEnv === 'production'
      ? 'Sans SMTP valide, les invitations et resets par email echouent avec une erreur serveur.'
      : "Sans SMTP valide, les emails ne partent pas: le service ecrit seulement le destinataire et le sujet dans les logs."

  const smtpStatus = smtp.configured
    ? {
        value: `Oui — ${smtp.host}:${smtp.port}`,
        color: 'text-[var(--color-success)]',
      }
    : smtp.partial
      ? {
          value: `Partielle — manquantes: ${smtp.missing.join(', ')}`,
          color: 'text-[var(--color-danger)]',
        }
      : {
          value: 'Non',
          color: 'text-[var(--color-warning)]',
        }

  const secretStrength =
    appSecretLength >= 44 ? { label: 'Fort (≥ 44 car.)', color: 'text-[var(--color-success)]' } :
    appSecretLength >= 32 ? { label: 'Correct (≥ 32 car.)', color: 'text-[var(--color-warning)]' } :
    { label: `Trop court (${appSecretLength} car.)`, color: 'text-[var(--color-danger)]' }

  const sections = [
    {
      title: 'Session & JWT',
      items: [
        { label: 'Algorithme',           value: 'HS256 (HMAC-SHA-256)' },
        { label: 'Durée de validité',    value: '24 heures' },
        { label: 'Fenêtre de refresh',   value: '4 heures avant expiry (auto-refresh)' },
        { label: 'Invalidation',         value: 'token_version en base — logout/reset/désactivation incrémentent la version' },
        { label: 'Cookie',               value: 'HttpOnly, SameSite=Lax, Secure sur Vercel' },
        { label: 'Nom du cookie',        value: '_session' },
      ],
    },
    {
      title: 'Rate limiting',
      items: [
        { label: 'Login / forgot-password', value: '5 tentatives / 15 minutes (par IP)' },
        { label: 'Stockage',                value: isVercel ? 'In-memory (single instance) — envisager Upstash KV en multi-instance' : 'In-memory (développement)' },
      ],
    },
    {
      title: 'APP_SECRET',
      items: [
        { label: 'Force',     value: secretStrength.label, color: secretStrength.color },
        { label: 'Longueur',  value: `${appSecretLength} caractères` },
        { label: 'Conseillé', value: 'Générer avec : openssl rand -base64 32' },
      ],
    },
    {
      title: 'Emails transactionnels',
      items: [
        {
          label: 'SMTP configuré',
          value: smtpStatus.value,
          color: smtpStatus.color,
        },
        { label: 'From',    value: smtp.from },
        { label: 'Effet si SMTP absent', value: transactionalEmailBehavior },
      ],
    },
    {
      title: 'Environnement',
      items: [
        { label: 'NODE_ENV',     value: nodeEnv },
        { label: 'Sur Vercel',   value: isVercel ? 'Oui' : 'Non (local)' },
        { label: 'APP_URL',      value: appUrl },
        { label: 'CSP unsafe-eval', value: nodeEnv === 'development' ? 'Activé (dev uniquement — React Turbopack)' : 'Désactivé (production)' },
      ],
    },
    {
      title: 'Posture actuelle',
      items: [
        { label: 'Mots de passe', value: 'bcrypt (12 rounds)', color: 'text-[var(--color-success)]' },
        { label: 'Tokens invite/reset', value: 'SHA-256 uniquement en base (raw token jamais stocké)', color: 'text-[var(--color-success)]' },
        { label: 'Enum user enumeration', value: 'Prévenu — forgot-password retourne toujours 200', color: 'text-[var(--color-success)]' },
        { label: 'Password minimum', value: '12 caractères', color: 'text-[var(--color-success)]' },
        { label: 'MFA', value: 'Non implémenté (prévu — champ mfa_secret en base)', color: 'text-[var(--color-text-muted)]' },
        { label: 'Rate limit multi-instance', value: isVercel ? 'À configurer (Upstash/Vercel KV recommandé)' : 'N/A (développement)', color: isVercel ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]' },
      ],
    },
  ]

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Sécurité</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Configuration de l&apos;authentification et posture de sécurité actuelle.
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
