/**
 * Lightweight i18n utilities — no external dependencies.
 */

/**
 * Replaces {key} placeholders in a template string with the provided params.
 *
 * @example
 * interpolate("Hello, {name}!", { name: "Alice" }) // → "Hello, Alice!"
 * interpolate("{count} player{s}", { count: 3, s: "s" }) // → "3 players"
 */
export function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const val = params[key]
    return val !== undefined ? String(val) : `{${key}}`
  })
}

/**
 * Returns '' for n === 1, 's' otherwise.
 * Works for both English and French regular plurals.
 */
export function s(n: number): '' | 's' {
  return n === 1 ? '' : 's'
}

/**
 * Parses an Accept-Language header and returns the best matching locale.
 * Falls back to the provided default if no match is found.
 *
 * @example
 * parseAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8", ['fr', 'en'], 'fr') // → 'fr'
 */
export function parseAcceptLanguage(
  header: string | null,
  supported: readonly string[],
  fallback: string,
): string {
  if (!header) return fallback

  const tags = header
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=')
      return { lang: lang?.trim() ?? '', q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { lang } of tags) {
    const base = lang.split('-')[0]?.toLowerCase() ?? ''
    if (supported.includes(lang.toLowerCase())) return lang.toLowerCase()
    if (base && supported.includes(base)) return base
  }

  return fallback
}
