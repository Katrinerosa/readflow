import { decode } from 'html-entities';

/**
 * Normalize inner HTML to plain text: decode entities, strip tags, collapse whitespace.
 * Shared by block-audio extraction and injection.
 */
export function normalizeText(innerHtml: string): string {
  const decoded = decode(innerHtml, { level: 'all' });
  return decoded
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface HtmlSegment {
  type: 'tag' | 'text';
  content: string;
}

/**
 * Split HTML into alternating tag and text segments.
 * Tags (including comments, self-closing) become 'tag' segments.
 * Everything else becomes 'text' segments.
 */
export function splitHtmlSegments(html: string): HtmlSegment[] {
  const segments: HtmlSegment[] = [];
  const tagRegex = /<[^>]+>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: html.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'tag', content: match[0] });
    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < html.length) {
    segments.push({ type: 'text', content: html.slice(lastIndex) });
  }

  return segments;
}
