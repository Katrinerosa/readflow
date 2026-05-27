/**
 * HTML sanitization for book content.
 *
 * Performs three transformations:
 * 1. Heading normalization — converts h2-h6 to h1 (strips attrs on converted headings)
 * 2. Tag/attribute filtering — keeps only allowed tags/attrs, strips others (preserving inner text)
 * 3. Empty paragraph removal — removes <p> containing only whitespace/nbsp/br
 */

/** Tags permitted in book content. Only structural and inline formatting tags. */
export const DEFAULT_ALLOWED_TAGS = ['h1', 'p', 'img', 'em', 'strong', 'span'];

/** Attributes permitted on allowed tags. Covers images (src), audio (data-audio), word tracking (data-word), and links (target). */
export const DEFAULT_ALLOWED_ATTRS = ['src', 'data-audio', 'data-word', 'target'];

interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttrs?: string[];
}

/**
 * Sanitize HTML content for book pages.
 *
 * @param html - Raw HTML string from WYSIWYG editor
 * @param options - Optional overrides for allowed tags/attrs
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string, options?: SanitizeOptions): string {
  const allowedTags = options?.allowedTags ?? DEFAULT_ALLOWED_TAGS;
  const allowedAttrs = options?.allowedAttrs ?? DEFAULT_ALLOWED_ATTRS;

  let result = html;

  // Step 1: Normalize headings — convert h2-h6 to h1, stripping attributes on converted tags.
  // Matches opening tags like <h3 class="foo"> and closing tags like </h3>.
  result = result.replace(/<(\/?)h([2-6])(\s[^>]*)?>/gi, (_, slash: string, _level: string, _attrs: string) => {
    return `<${slash}h1>`;
  });

  // Step 2: Filter tags — remove disallowed tags but keep their inner text.
  // Matches any HTML tag (opening, closing, or self-closing).
  // Self-closing tags like <br/> or <br /> are handled by the self-closing pattern.
  result = result.replace(/<(\/?)(\w+)(\s[^>]*)?\/?>/gi, (match, slash: string, tagName: string, attrsStr: string) => {
    const tag = tagName.toLowerCase();

    if (!allowedTags.includes(tag)) {
      // Strip disallowed tag entirely, preserving inner text (closing tags just disappear)
      return '';
    }

    // For allowed tags, filter attributes
    if (slash) {
      // Closing tag — no attrs needed
      return `</${tag}>`;
    }

    // Self-closing tag detection (img)
    const isSelfClosing = tag === 'img';

    // Parse and filter attributes
    const filteredAttrs = filterAttributes(attrsStr || '', allowedAttrs);
    const attrString = filteredAttrs.length > 0 ? ' ' + filteredAttrs.join(' ') : '';

    return isSelfClosing ? `<${tag}${attrString} />` : `<${tag}${attrString}>`;
  });

  // Step 3: Remove empty paragraphs — paragraphs containing only whitespace, &nbsp;, or <br> tags.
  // Pattern: <p> followed by any mix of whitespace, &nbsp;, and <br>/<br/>/<br />, then </p>.
  result = result.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');

  return result;
}

/**
 * Filter HTML attributes string, keeping only allowed attribute names.
 * Handles both quoted and unquoted attribute values.
 */
function filterAttributes(attrsStr: string, allowedAttrs: string[]): string[] {
  const result: string[] = [];
  // Matches attr="value", attr='value', or attr=value patterns
  const attrRegex = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const attrName = match[1].toLowerCase();
    if (allowedAttrs.includes(attrName)) {
      const value = match[2] ?? match[3] ?? match[4];
      if (value !== undefined) {
        result.push(`${attrName}="${value}"`);
      } else {
        result.push(attrName);
      }
    }
  }

  return result;
}
