import { defineOperationApi } from '@directus/extensions-sdk';

interface OperationOptions {
  words: unknown;
  language?: string | null;
  published_only?: boolean;
}

function normalizeWords(input: unknown): string[] {
  let raw: unknown = input;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try { raw = JSON.parse(trimmed); }
      catch { raw = trimmed.split(/[,\n]/); }
    } else {
      raw = trimmed.split(/[,\n]/);
    }
  }
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(
    raw
      .filter((w): w is string => typeof w === 'string')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0),
  ));
}

export default defineOperationApi<OperationOptions>({
  id: 'find-content-by-words',
  handler: async (options, { database, logger }) => {
    const words = normalizeWords(options.words);

    if (words.length === 0) {
      logger.info('find-content-by-words: no words supplied, returning empty result');
      return { ids: [], words: [] };
    }

    const language = typeof options.language === 'string' && options.language.trim()
      ? options.language.trim()
      : null;
    const publishedOnly = options.published_only !== false;

    const query = database('book_content_translations')
      .select('id')
      .whereRaw(
        // unique_words is JSON; cast to jsonb to use jsonb_array_elements_text.
        // Compare lower-cased tokens against the lower-cased word list.
        `EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(unique_words::jsonb) AS w
          WHERE lower(w) = ANY(?)
        )`,
        [words],
      );

    if (language) query.where('languages_code', language);
    if (publishedOnly) query.where('status', 'published');

    const rows: Array<{ id: string }> = await query;
    const ids = rows.map((r) => r.id);

    logger.info(
      `find-content-by-words: ${ids.length} match(es) for ${words.length} word(s)` +
      (language ? ` lang=${language}` : '') +
      (publishedOnly ? ' published-only' : ''),
    );

    return { ids, words };
  },
});
