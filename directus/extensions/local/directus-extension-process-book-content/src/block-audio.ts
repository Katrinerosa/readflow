import { normalizeText } from './html';

/**
 * Extract text content from h and p tags in HTML.
 * Returns an array of objects with tag type and decoded text content.
 * Preserves document order. Skips tags that contain only whitespace or images.
 */
export function extractBlocks(html: string): { tag: string; text: string }[] {
  const blocks: { tag: string; text: string }[] = [];

  // Match h1-h6 and p tags with their content
  const tagRegex = /<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const textOnly = normalizeText(match[2]);

    // Skip empty blocks or image-only blocks
    if (textOnly.length === 0) continue;

    blocks.push({ tag, text: textOnly });
  }

  return blocks;
}

/**
 * Inject or update data-audio="<uuid>" attributes on h/p tags whose
 * normalized text content has an entry in audioMap (text → UUID).
 */
export function injectDataAudioAttributes(
  html: string,
  audioMap: Map<string, string>,
): string {
  return html.replace(
    /<(h[1-6]|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (fullMatch, tag, attrs, innerHtml) => {
      const textOnly = normalizeText(innerHtml);
      if (textOnly.length === 0) return fullMatch;

      const uuid = audioMap.get(textOnly);
      if (!uuid) return fullMatch;

      // Remove existing data-audio if present, then add new one
      const cleanAttrs = attrs.replace(/\s*data-audio="[^"]*"/, '');
      return `<${tag}${cleanAttrs} data-audio="${uuid}">${innerHtml}</${tag}>`;
    },
  );
}

/**
 * Sync block audio entries: create new, delete orphaned, update sort order.
 * Returns the text → UUID audio map for injection.
 */
export async function syncBlockAudio({
  blocks,
  language,
  bookContentTranslation,
  audioService,
}: {
  blocks: { tag: string; text: string }[];
  language: string;
  bookContentTranslation: string;
  audioService: any;
}): Promise<{
  audioMap: Map<string, string>;
  blocks_created: number;
  blocks_removed: number;
  blocks_kept: number;
}> {
  const blockTexts = new Set(blocks.map(b => b.text));

  // Fetch all existing entries for this translation
  const existing = await audioService.readByQuery({
    filter: {
      _and: [
        { language: { _eq: language } },
        { book_content_translation: { _eq: bookContentTranslation } },
      ],
    },
    fields: ['id', 'text_content'],
    limit: -1,
  });

  // Build text → existing entry map
  const existingByText = new Map<string, string>();
  for (const item of existing as { id: string; text_content: string }[]) {
    existingByText.set(item.text_content, item.id);
  }

  // Determine new, orphaned, and kept
  const newBlocks = blocks.filter(b => !existingByText.has(b.text));
  const orphanedIds = (existing as { id: string; text_content: string }[])
    .filter(item => !blockTexts.has(item.text_content))
    .map(item => item.id);
  const keptEntries = (existing as { id: string; text_content: string }[])
    .filter(item => blockTexts.has(item.text_content));

  // Delete orphaned entries
  if (orphanedIds.length > 0) {
    await audioService.deleteMany(orphanedIds);
  }

  // Create new entries
  if (newBlocks.length > 0) {
    await audioService.createMany(
      newBlocks.map(block => ({
        text_content: block.text,
        language,
        book_content_translation: bookContentTranslation,
        sort: blocks.findIndex(b => b.text === block.text) + 1,
      })),
    );
  }

  // Update sort order for kept entries
  for (const entry of keptEntries) {
    const sort = blocks.findIndex(b => b.text === entry.text_content) + 1;
    await audioService.updateOne(entry.id, { sort });
  }

  // Re-query all entries to build accurate text → UUID map
  const allEntries = await audioService.readByQuery({
    filter: {
      _and: [
        { language: { _eq: language } },
        { book_content_translation: { _eq: bookContentTranslation } },
      ],
    },
    fields: ['id', 'text_content'],
    limit: -1,
  });

  const audioMap = new Map<string, string>();
  for (const item of allEntries as { id: string; text_content: string }[]) {
    audioMap.set(item.text_content, item.id);
  }

  return {
    audioMap,
    blocks_created: newBlocks.length,
    blocks_removed: orphanedIds.length,
    blocks_kept: keptEntries.length,
  };
}
