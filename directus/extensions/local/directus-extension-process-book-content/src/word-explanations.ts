import { decode } from 'html-entities';
import { splitHtmlSegments } from './html';

export interface WordExplanationEntry {
  id: string;
  word: string;
  variants: string[] | null;
}

/**
 * Strip existing <span data-word="...">...</span> wrappers, preserving inner content.
 */
export function stripWordExplanationSpans(html: string): string {
  return html.replace(/<span\s+data-word="[^"]*">([\s\S]*?)<\/span>/gi, '$1');
}

/**
 * Entity map: special char → array of entity forms (case-insensitive pairs).
 */
const ENTITY_MAP: Record<string, { lower: string; upper: string; entities: string[] }> = {
  'æ': { lower: 'æ', upper: 'Æ', entities: ['&aelig;', '&AElig;', '&#230;', '&#198;', '&#xe6;', '&#xC6;'] },
  'ø': { lower: 'ø', upper: 'Ø', entities: ['&oslash;', '&Oslash;', '&#248;', '&#216;', '&#xf8;', '&#xD8;'] },
  'å': { lower: 'å', upper: 'Å', entities: ['&aring;', '&Aring;', '&#229;', '&#197;', '&#xe5;', '&#xC5;'] },
  'ü': { lower: 'ü', upper: 'Ü', entities: ['&uuml;', '&Uuml;', '&#252;', '&#220;', '&#xfc;', '&#xDC;'] },
  'ö': { lower: 'ö', upper: 'Ö', entities: ['&ouml;', '&Ouml;', '&#246;', '&#214;', '&#xf6;', '&#xD4;'] },
  'ä': { lower: 'ä', upper: 'Ä', entities: ['&auml;', '&Auml;', '&#228;', '&#196;', '&#xe4;', '&#xC4;'] },
};

// Reverse lookup: also index uppercase keys
const ENTITY_LOOKUP: Record<string, { lower: string; upper: string; entities: string[] }> = {};
for (const [key, val] of Object.entries(ENTITY_MAP)) {
  ENTITY_LOOKUP[key] = val;
  ENTITY_LOOKUP[val.upper] = val;
}

/**
 * Build a regex pattern string for a word that matches both literal and HTML-entity forms.
 * Case-insensitive per character.
 */
export function buildEntityAwarePattern(word: string): string {
  let pattern = '';
  for (const char of word) {
    const entry = ENTITY_LOOKUP[char] || ENTITY_LOOKUP[char.toLowerCase()];
    if (entry) {
      // Match literal lower/upper OR any entity form
      const alternatives = [
        escapeRegex(entry.lower),
        escapeRegex(entry.upper),
        ...entry.entities.map(e => escapeRegex(e)),
      ];
      pattern += `(?:${alternatives.join('|')})`;
    } else if (/[a-zA-Z]/.test(char)) {
      pattern += `[${char.toLowerCase()}${char.toUpperCase()}]`;
    } else {
      pattern += escapeRegex(char);
    }
  }
  return pattern;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Decode a word to get its actual character length for sorting */
function decodedLength(word: string): number {
  return decode(word, { level: 'all' }).length;
}

// Null byte markers for placeholder replacement
const MARKER_START = '\x00WE_START\x00';
const MARKER_END = '\x00WE_END\x00';
const MARKER_SEP = '\x00WE_SEP\x00';

// Word boundary: start/end of string, whitespace, or punctuation
// Using lookahead/lookbehind with common boundary characters
const WB_BEFORE = '(?:^|(?<=[\\s,.!?;:\'"()\\[\\]{}<>\\-–—/\\\\&]))';
const WB_AFTER = '(?=$|[\\s,.!?;:\'"()\\[\\]{}<>\\-–—/\\\\&])';

/**
 * Inject <span data-word="id">matched</span> around word explanation matches in HTML.
 * Only processes text segments (not inside HTML tags).
 * Uses marker-based replacement to prevent double-wrapping.
 */
export function injectWordExplanationSpans(
  html: string,
  explanations: WordExplanationEntry[],
): { html: string; explanations_matched: number; spans_injected: number } {
  if (explanations.length === 0) {
    return { html, explanations_matched: 0, spans_injected: 0 };
  }

  // Collect all words with their IDs, sorted by decoded length descending (longest first)
  const allWords: { id: string; pattern: string; decodedLen: number }[] = [];

  for (const exp of explanations) {
    const words = [exp.word, ...(exp.variants || [])];
    for (const w of words) {
      allWords.push({
        id: exp.id,
        pattern: buildEntityAwarePattern(w),
        decodedLen: decodedLength(w),
      });
    }
  }

  allWords.sort((a, b) => b.decodedLen - a.decodedLen);

  // Split HTML into segments
  const segments = splitHtmlSegments(html);

  // Process only text segments
  let spansInjected = 0;
  const matchedIds = new Set<string>();

  for (let i = 0; i < segments.length; i++) {
    if (segments[i].type !== 'text') continue;

    let text = segments[i].content;

    for (const entry of allWords) {
      const regex = new RegExp(`${WB_BEFORE}(${entry.pattern})${WB_AFTER}`, 'gi');
      text = text.replace(regex, (matched) => {
        spansInjected++;
        matchedIds.add(entry.id);
        return `${MARKER_START}${entry.id}${MARKER_SEP}${matched}${MARKER_END}`;
      });
    }

    segments[i].content = text;
  }

  // Reassemble and convert markers to spans
  let result = segments.map(s => s.content).join('');
  result = result.replace(
    new RegExp(`${escapeRegex(MARKER_START)}([^${'\x00'}]+)${escapeRegex(MARKER_SEP)}([\\s\\S]*?)${escapeRegex(MARKER_END)}`, 'g'),
    '<span data-word="$1">$2</span>',
  );

  return {
    html: result,
    explanations_matched: matchedIds.size,
    spans_injected: spansInjected,
  };
}

/**
 * Fetch published word explanations for a language from Directus.
 */
export async function fetchWordExplanations(
  language: string,
  service: any,
): Promise<WordExplanationEntry[]> {
  const items = await service.readByQuery({
    filter: {
      _and: [
        { status: { _eq: 'published' } },
        { language: { _eq: language } },
      ],
    },
    fields: ['id', 'word', 'variants'],
    limit: -1,
  });

  return (items as any[]).map((item) => ({
    id: item.id,
    word: item.word,
    variants: item.variants || null,
  }));
}
