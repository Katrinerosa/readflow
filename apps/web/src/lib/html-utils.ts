/**
 * Utility functions for handling HTML content from Directus translations
 */

/**
 * Strips HTML tags from a string
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Truncates HTML content by first stripping tags, then truncating plain text
 * @param html - The HTML string to truncate
 * @param maxLength - Maximum length of plain text (default: 150)
 * @param ellipsis - String to append if truncated (default: '...')
 * @returns Truncated plain text with ellipsis if needed
 */
export function truncateHtml(html: string, maxLength: number = 150, ellipsis: string = '...'): string {
  if (!html) return '';

  // Strip HTML tags first
  const plainText = stripHtml(html);

  // Truncate if needed
  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Find last space before maxLength to avoid cutting words
  let truncateAt = maxLength;
  const lastSpace = plainText.lastIndexOf(' ', maxLength);
  if (lastSpace > maxLength * 0.8) { // Only use last space if it's not too far back
    truncateAt = lastSpace;
  }

  return plainText.substring(0, truncateAt).trim() + ellipsis;
}

/**
 * Safely renders HTML content, useful for Astro set:html
 * Returns the HTML as-is if valid, empty string if null/undefined
 */
export function safeHtml(html: string | null | undefined): string {
  return html || '';
}
