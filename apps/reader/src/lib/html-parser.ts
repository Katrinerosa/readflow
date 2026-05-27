/**
 * HTML Parser for Dynamic Pagination
 *
 * Parses book_content HTML into structured content blocks that can be
 * dynamically paginated based on user accessibility settings.
 *
 * Supports:
 * - h1 (chapter headings with optional audio)
 * - p (paragraphs with optional audio)
 * - img (images with layout configuration from M2M table)
 */

export type ContentBlockType = 'heading' | 'paragraph' | 'image';

export type ImageLayout = 'full_page' | 'page_top' | 'page_bottom' | 'inline';

/**
 * Base content block interface
 */
export interface ContentBlock {
  type: ContentBlockType;
  index: number; // Position in original HTML
}

/**
 * Heading block (h1 tags)
 */
export interface HeadingBlock extends ContentBlock {
  type: 'heading';
  text: string;
  audioId?: string; // UUID from data-audio attribute
}

/**
 * Paragraph block (p tags)
 */
export interface ParagraphBlock extends ContentBlock {
  type: 'paragraph';
  text: string;
  audioId?: string; // UUID from data-audio attribute
}

/**
 * Image block (img tags)
 */
export interface ImageBlock extends ContentBlock {
  type: 'image';
  assetId: string; // UUID extracted from Directus asset URL
  alt?: string;
  layout: ImageLayout; // From M2M book_content_image_settings
  width?: number;
  height?: number;
}

/**
 * Image settings from M2M table
 * Note: Images are bound to book_content_id (shared across translations)
 */
export interface ImageSettings {
  id: number;
  book_content_id: string;
  directus_files_id: string;
  layout: ImageLayout;
  sort: number;
}

/**
 * Parsed book content result
 */
export interface ParsedContent {
  blocks: ContentBlock[];
  totalBlocks: number;
  hasAudio: boolean;
  hasImages: boolean;
  imageCount: number;
}

/**
 * Extract UUID from Directus asset URL
 *
 * @param url - Full Directus asset URL (e.g., http://localhost:8055/assets/UUID?params)
 * @returns UUID or null if not found
 *
 * @example
 * extractAssetId("http://localhost:8055/assets/831c0b86-70c7-4eb7-b7fd-11680fe26904.jpg?width=800")
 * // Returns: "831c0b86-70c7-4eb7-b7fd-11680fe26904"
 */
export function extractAssetId(url: string): string | null {
  const match = url.match(/\/assets\/([a-f0-9-]{36})/);
  return match ? match[1] : null;
}

/**
 * Extract audio UUID from data-audio attribute
 *
 * @param element - HTML element with data-audio attribute
 * @returns UUID or undefined if not present
 */
function extractAudioId(element: Element): string | undefined {
  const audioId = element.getAttribute('data-audio');
  return audioId || undefined;
}

/**
 * Parse HTML content into structured content blocks
 *
 * @param html - Raw HTML content from book_content_translations
 * @param imageSettings - Image layout settings from M2M table
 * @returns ParsedContent with structured blocks
 *
 * @example
 * const html = `
 *   <h1 data-audio="uuid1">Chapter 1</h1>
 *   <p>First paragraph...</p>
 *   <img src="http://localhost:8055/assets/uuid2.jpg" alt="Image" />
 *   <p data-audio="uuid3">Second paragraph with audio...</p>
 * `;
 * const settings = [{ directus_files_id: "uuid2", layout: "inline", sort: 1 }];
 * const result = parseBookContent(html, settings);
 * // result.blocks = [HeadingBlock, ParagraphBlock, ImageBlock, ParagraphBlock]
 */
export function parseBookContent(
  html: string,
  imageSettings: ImageSettings[] = []
): ParsedContent {
  // Create a temporary DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const blocks: ContentBlock[] = [];
  let blockIndex = 0;
  let hasAudio = false;
  let imageCount = 0;

  // Create a map of asset ID -> layout for quick lookup
  const layoutMap = new Map<string, ImageLayout>();
  imageSettings.forEach(setting => {
    layoutMap.set(setting.directus_files_id, setting.layout);
  });

  // Get all child elements (h1, p, img)
  const elements = doc.body.children;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'h1') {
      // Heading block - use innerHTML to preserve formatting (italic, bold, etc.)
      const text = element.innerHTML?.trim() || '';
      const audioId = extractAudioId(element);

      if (audioId) hasAudio = true;

      blocks.push({
        type: 'heading',
        index: blockIndex++,
        text,
        audioId,
      } as HeadingBlock);

    } else if (tagName === 'p') {
      // Check if paragraph contains an image (legacy format)
      const img = element.querySelector('img');

      if (img) {
        // Extract image from paragraph
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt');

        if (src) {
          const assetId = extractAssetId(src);

          if (assetId) {
            imageCount++;

            // Get layout from M2M settings or default to inline
            const layout = layoutMap.get(assetId) || 'inline';

            blocks.push({
              type: 'image',
              index: blockIndex++,
              assetId,
              alt: alt || undefined,
              layout,
            } as ImageBlock);
          }
        }
      } else {
        // Regular paragraph - use innerHTML to preserve formatting (italic, bold, etc.)
        const text = element.innerHTML?.trim() || '';
        const audioId = extractAudioId(element);

        if (audioId) hasAudio = true;

        // Only add non-empty paragraphs
        if (text) {
          blocks.push({
            type: 'paragraph',
            index: blockIndex++,
            text,
            audioId,
          } as ParagraphBlock);
        }
      }

    } else if (tagName === 'img') {
      // Standalone image
      const src = element.getAttribute('src');
      const alt = element.getAttribute('alt');

      if (src) {
        const assetId = extractAssetId(src);

        if (assetId) {
          imageCount++;

          // Get layout from M2M settings or default to inline
          const layout = layoutMap.get(assetId) || 'inline';

          blocks.push({
            type: 'image',
            index: blockIndex++,
            assetId,
            alt: alt || undefined,
            layout,
          } as ImageBlock);
        }
      }
    }
  }

  return {
    blocks,
    totalBlocks: blocks.length,
    hasAudio,
    hasImages: imageCount > 0,
    imageCount,
  };
}

/**
 * Get content blocks by type
 *
 * @param parsedContent - Parsed content result
 * @param type - Block type to filter by
 * @returns Array of blocks matching the type
 */
export function getBlocksByType<T extends ContentBlock>(
  parsedContent: ParsedContent,
  type: ContentBlockType
): T[] {
  return parsedContent.blocks.filter(block => block.type === type) as T[];
}

/**
 * Find block by index
 *
 * @param parsedContent - Parsed content result
 * @param index - Block index to find
 * @returns Block or undefined if not found
 */
export function getBlockByIndex(
  parsedContent: ParsedContent,
  index: number
): ContentBlock | undefined {
  return parsedContent.blocks.find(block => block.index === index);
}

/**
 * Check if block has audio
 *
 * @param block - Content block to check
 * @returns true if block has audio ID
 */
export function hasAudio(block: ContentBlock): boolean {
  return 'audioId' in block && block.audioId !== undefined;
}
