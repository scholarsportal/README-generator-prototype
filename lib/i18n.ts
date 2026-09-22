// ── Localization ──────────────────────────────────────────────────────────────
// Types and lookup only. Strings live in lib/locales/en.ts and fr.ts.

import en from './locales/en'
import fr from './locales/fr'

export type Locale = 'en' | 'fr'
export type { TranslationKey } from './locales/en'

export const LOCALES: Locale[] = ['en', 'fr']

const STRINGS: Record<Locale, Record<string, string>> = { en, fr }

type Vars = Record<string, string | number>

/**
 * Coerce anything (a query param, a saved preference) into a supported locale.
 * Dataverse sends {localeCode} as 'en' or 'fr', but some configurations send
 * 'fr-CA', so match on the language part only.
 */
export function normalizeLocale(raw?: string | null): Locale {
  if (!raw) return 'en'
  return raw.toLowerCase().split('-')[0] === 'fr' ? 'fr' : 'en'
}

/**
 * Look up a string and fill any {slots}.
 *
 * Uses || rather than ?? on purpose: an empty string in fr.ts means "not yet
 * translated", so it falls back to English instead of rendering blank.
 */
export function t(key: string, locale: Locale = 'en', vars?: Vars): string {
  const s = STRINGS[locale]?.[key] || STRINGS.en[key] || key
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

/**
 * Plural-aware lookup. Reads `${key}.one` or `${key}.other` and passes
 * {count} through automatically.
 *
 * French treats 0 as singular ("0 fichier"), English treats it as plural
 * ("0 files"), which is why this can't just be `count === 1`.
 */
export function tn(key: string, count: number, locale: Locale = 'en', vars: Vars = {}): string {
  const singular = locale === 'fr' ? count <= 1 : count === 1
  return t(`${key}.${singular ? 'one' : 'other'}`, locale, { count, ...vars })
}

/** Keys with no translation yet (missing or empty). Handy for tracking progress. */
export function missingKeys(locale: Locale): string[] {
  return Object.keys(en).filter((k) => !STRINGS[locale][k])
}
