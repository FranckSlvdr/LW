export const LOCALES     = ['fr', 'en'] as const
export const DEFAULT_LOCALE = 'fr' as const

export type Locale = typeof LOCALES[number]

/** Human-readable label for each locale — used in the language switcher */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
}

/** Flag emojis for visual affordance */
export const LOCALE_FLAGS: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
}

export function isValidLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale)
}
