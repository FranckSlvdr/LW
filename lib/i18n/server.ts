import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { isValidLocale, DEFAULT_LOCALE } from './config'
import type { Locale } from './config'
import type { Dictionary } from './types'

/** Read the locale injected by middleware (x-locale request header). */
export async function getLocale(): Promise<Locale> {
  const headerStore = await headers()
  const value = headerStore.get('x-locale')
  return isValidLocale(value) ? value : DEFAULT_LOCALE
}

const loadDict = cache(async (locale: Locale): Promise<Dictionary> => {
  const { [locale]: dict } = await import(`./locales/${locale}`)
  return dict as Dictionary
})

/** Load the full translation dictionary for the given locale. */
export async function getDict(locale: Locale): Promise<Dictionary> {
  return loadDict(locale)
}
