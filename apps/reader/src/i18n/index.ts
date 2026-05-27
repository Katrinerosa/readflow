import { createI18n } from 'vue-i18n'

export type Language = 'en' | 'da' | 'de'

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'da', 'de']
export const DEFAULT_LANGUAGE: Language = 'en'

// Messages will be loaded from Directus at runtime
const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LANGUAGE,
  fallbackLocale: DEFAULT_LANGUAGE,
  messages: {
    en: {},
    da: {},
    de: {},
  },
})

/**
 * Load translations from Directus
 */
export async function loadTranslations(directusUrl: string): Promise<void> {
  try {
    const response = await fetch(
      `${directusUrl}/items/translation_strings?fields=key,translations.*&limit=1000`
    )

    if (!response.ok) {
      console.error('Failed to load translations from Directus')
      return
    }

    const data = await response.json()
    const translationStrings = data.data

    // Build messages object for each language
    const messages: Record<Language, Record<string, string>> = {
      en: {},
      da: {},
      de: {},
    }

    for (const item of translationStrings) {
      if (!item.key) continue

      // Only process reader translations
      if (!item.key.startsWith('reader.') && !item.key.startsWith('common.') && !item.key.startsWith('feedback.')) {
        continue
      }

      if (Array.isArray(item.translations)) {
        for (const translation of item.translations) {
          const langCode =
            typeof translation.languages_code === 'object'
              ? translation.languages_code.code
              : translation.languages_code

          if (SUPPORTED_LANGUAGES.includes(langCode as Language)) {
            const content = translation.content || item.key
            messages[langCode as Language][item.key] = content
          }
        }
      }
    }

    // Set messages for each language
    for (const lang of SUPPORTED_LANGUAGES) {
      i18n.global.setLocaleMessage(lang, messages[lang])
    }

    console.log('Translations loaded successfully')
  } catch (error) {
    console.error('Error loading translations:', error)
  }
}

/**
 * Detect language from URL path (route-based)
 * URL structure: /reader/:lang/:bookPath+/page/:pageNumber
 */
export function getLanguageFromPath(): Language {
  const pathname = window.location.pathname
  const segments = pathname.split('/').filter(Boolean)

  // For reader routes: /reader/:lang/...
  // segments[0] = 'reader', segments[1] = lang
  if (segments[0] === 'reader' && segments[1]) {
    const langSegment = segments[1]
    if (SUPPORTED_LANGUAGES.includes(langSegment as Language)) {
      return langSegment as Language
    }
  }

  // Fallback 1: Check localStorage (for initial load before route is parsed)
  const storedLang = localStorage.getItem('app-language')
  if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang as Language)) {
    return storedLang as Language
  }

  // Fallback 2: Check browser language
  const browserLang = navigator.language.split('-')[0] as Language
  if (SUPPORTED_LANGUAGES.includes(browserLang)) {
    return browserLang
  }

  return DEFAULT_LANGUAGE
}

/**
 * Set current language
 */
export function setLanguage(lang: Language): void {
  i18n.global.locale.value = lang
  // Use shared key for both web and reader
  localStorage.setItem('app-language', lang)
}

export default i18n
