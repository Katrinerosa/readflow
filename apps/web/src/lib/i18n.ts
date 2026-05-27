import { readItems } from '@directus/sdk';
import { directus } from './directus';

export const SUPPORTED_LANGUAGES = ['en', 'da', 'de'] as const;
export type Language = typeof SUPPORTED_LANGUAGES[number];
export const DEFAULT_LANGUAGE: Language = 'en';

// Cache translations in memory for performance (TTL so CMS edits propagate without rebuild)
const TRANSLATIONS_TTL_MS = 60_000;
let translationsCache: Record<string, Record<Language, string>> | null = null;
let translationsCacheAt = 0;
let translationsRawCache: Record<string, Record<Language, string>> | null = null;
let translationsRawCacheAt = 0;

/**
 * Load all translations from Directus
 */
export async function loadTranslations(preserveHtml: boolean = false): Promise<Record<string, Record<Language, string>>> {
  const now = Date.now();
  const cache = preserveHtml ? translationsRawCache : translationsCache;
  const cachedAt = preserveHtml ? translationsRawCacheAt : translationsCacheAt;
  if (cache && now - cachedAt < TRANSLATIONS_TTL_MS) {
    return cache;
  }

  try {
    // Fetch all translation strings with their translations
    const translationStrings = await directus.request(
      readItems('translation_strings', {
        fields: ['key', 'translations.*'],
        limit: 1000, // High limit to get all translations
      })
    );

    // Build translations object: { "key": { "en": "value", "da": "value", "de": "value" } }
    const translations: Record<string, Record<Language, string>> = {};

    for (const item of translationStrings) {
      if (!item.key) continue;

      translations[item.key] = {} as Record<Language, string>;

      if (Array.isArray(item.translations)) {
        for (const translation of item.translations) {
          // Handle both object and string for languages_code
          const langCode = typeof translation.languages_code === 'object'
            ? translation.languages_code.code
            : translation.languages_code;
          const lang = langCode as Language;

          if (SUPPORTED_LANGUAGES.includes(lang)) {
            // Skip translations with null or empty content
            if (!translation.content && !translation.value) {
              continue;
            }

            // Use 'content' field for translation value
            const rawContent = translation.content || translation.value;

            let processedContent: string;
            if (preserveHtml) {
              // Keep HTML as-is
              processedContent = rawContent.trim();
            } else {
              // Strip HTML tags
              processedContent = rawContent.replace(/<[^>]*>/g, '').trim();
            }

            // Skip if after processing we have nothing
            if (!processedContent) {
              continue;
            }

            // Decode HTML entities
            processedContent = processedContent
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#039;/g, "'")
              .replace(/&oslash;/g, 'ø')
              .replace(/&Oslash;/g, 'Ø')
              .replace(/&aring;/g, 'å')
              .replace(/&Aring;/g, 'Å')
              .replace(/&aelig;/g, 'æ')
              .replace(/&AElig;/g, 'Æ')
              .replace(/&uuml;/g, 'ü')
              .replace(/&Uuml;/g, 'Ü')
              .replace(/&ouml;/g, 'ö')
              .replace(/&Ouml;/g, 'Ö')
              .replace(/&auml;/g, 'ä')
              .replace(/&Auml;/g, 'Ä')
              .replace(/&szlig;/g, 'ß');

            translations[item.key][lang] = processedContent;
          }
        }
      }
    }

    if (preserveHtml) {
      translationsRawCache = translations;
      translationsRawCacheAt = Date.now();
    } else {
      translationsCache = translations;
      translationsCacheAt = Date.now();
    }
    return translations;
  } catch (error) {
    console.error('Failed to load translations:', error);
    return {};
  }
}

/**
 * Get translation for a key in a specific language
 * @param key - Translation key (e.g., "books.title")
 * @param lang - Language code (en, da, de)
 * @param options - Options for translation
 *   - preserveHtml: keep HTML tags (default: false)
 *   - stripParagraphs: remove outer <p> tags while keeping inline HTML (default: false)
 * @returns Translated string or the key itself if not found
 */
export async function t(
  key: string,
  lang: Language = DEFAULT_LANGUAGE,
  options: { preserveHtml?: boolean; stripParagraphs?: boolean } = {}
): Promise<string> {
  const translations = await loadTranslations(options.preserveHtml || false);

  if (!translations[key]) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }

  let result = translations[key][lang] || translations[key][DEFAULT_LANGUAGE] || key;

  // Strip outer paragraph tags if requested
  if (options.stripParagraphs) {
    result = result.replace(/^<p[^>]*>|<\/p>$/g, '').trim();
  }

  return result;
}

/**
 * Extract language from URL pathname
 * @param pathname - URL pathname (e.g., "/en/books")
 * @returns Language code or default language
 */
export function getLanguageFromPath(pathname: string): Language {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && SUPPORTED_LANGUAGES.includes(firstSegment as Language)) {
    return firstSegment as Language;
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Remove language prefix from pathname
 * @param pathname - URL pathname (e.g., "/en/books")
 * @returns Pathname without language prefix (e.g., "/books")
 */
export function removeLanguagePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && SUPPORTED_LANGUAGES.includes(firstSegment as Language)) {
    return '/' + segments.slice(1).join('/');
  }

  return pathname;
}

/**
 * Add language prefix to pathname
 * @param pathname - URL pathname (e.g., "/books")
 * @param lang - Language code
 * @returns Pathname with language prefix (e.g., "/en/books")
 */
export function addLanguagePrefix(pathname: string, lang: Language): string {
  const cleanPath = removeLanguagePrefix(pathname);
  return `/${lang}${cleanPath}`;
}

/**
 * Get available languages from Directus
 */
export async function getAvailableLanguages(): Promise<Array<{ code: Language; name: string }>> {
  try {
    const languages = await directus.request(
      readItems('languages', {
        fields: ['code', 'name'],
        limit: 1000,
      })
    );

    return languages
      .filter(lang => SUPPORTED_LANGUAGES.includes(lang.code as Language))
      .map(lang => ({
        code: lang.code as Language,
        name: lang.name || lang.code,
      }));
  } catch (error) {
    console.error('Failed to load languages:', error);
    return [
      { code: 'en', name: 'English' },
      { code: 'da', name: 'Dansk' },
      { code: 'de', name: 'Deutsch' },
    ];
  }
}
