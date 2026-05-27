import { decode } from 'html-entities';

/**
 * Extract unique normalized words from HTML content.
 */
export function extractWords(html: string): string[] {
  // Decode HTML entities
  const decoded = decode(html, { level: 'all' });

  // Strip HTML tags, keep text
  const textOnly = decoded
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Tokenize on whitespace
  const tokens = textOnly.split(/\s+/).filter(t => t.length > 0);

  // Normalize: strip leading/trailing non-letter/non-digit, lowercase
  const words = new Set<string>();
  for (const token of tokens) {
    const normalized = token
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
      .toLowerCase();
    if (normalized.length > 0) {
      words.add(normalized);
    }
  }

  return Array.from(words).sort();
}

/**
 * Sync word audio entries: check existing, create missing.
 */
export async function syncWordAudio({
  words,
  language,
  wordAudioService,
}: {
  words: string[];
  language: string;
  wordAudioService: any;
}): Promise<{
  words_existing: number;
  words_created: number;
  created_ids: string[];
}> {
  // Batch check existing words
  const existing = await wordAudioService.readByQuery({
    filter: {
      _and: [
        { language: { _eq: language } },
        { text_content: { _in: words } },
      ],
    },
    fields: ['text_content'],
    limit: -1,
  });

  const existingWords = new Set(existing.map((item: any) => item.text_content));
  const newWords = words.filter(w => !existingWords.has(w));

  let createdIds: string[] = [];
  if (newWords.length > 0) {
    createdIds = await wordAudioService.createMany(
      newWords.map(word => ({
        text_content: word,
        language,
      }))
    );
  }

  return {
    words_existing: existingWords.size,
    words_created: newWords.length,
    created_ids: createdIds,
  };
}
