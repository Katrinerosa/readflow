/**
 * Template-Based Dynamic Pagination Engine V2
 *
 * Uses page templates to calculate available space and fits text dynamically.
 * Splits paragraphs when they don't fit in the available space.
 * All dimensions calculated at runtime - no hardcoded values!
 */

import type {
  ContentBlock,
  HeadingBlock,
  ParagraphBlock,
  ImageBlock,
  ParsedContent,
} from './html-parser';
import type { ReaderSettings } from '../stores/reader';
import {
  type PageTemplate,
  type PageLayout,
  calculatePageLayout,
  measureTextInArea,
  fitTextToArea,
  getFontFamily,
  BASE_FONT_SIZES,
  ELEMENT_MARGINS,
  LINE_HEIGHTS,
} from './page-templates';

// Helper to construct image URL from asset ID
function getImageUrl(assetId: string): string {
  const directusUrl = import.meta.env.PUBLIC_DIRECTUS_URL || "http://localhost:8055";
  return `${directusUrl}/assets/${assetId}`;
}

/**
 * Text block that can be split across pages
 */
interface TextBlock {
  type: 'heading' | 'paragraph';
  text: string;
  audioId?: string;
  fontSize: number; // Calculated font size for this block
}

/**
 * Page content with template information
 */
export interface TemplatedPage {
  pageNumber: number;
  template: PageTemplate;
  layout: PageLayout;
  textBlocks: TextBlock[];
  imageBlock?: ImageBlock;
  hasAudio: boolean;
}

/**
 * Page dimensions (provided by container)
 */
export interface PageDimensions {
  width: number;
  height: number;
  padding: number;
}

/**
 * Paginate content using incremental page building
 *
 * NEW APPROACH: Build pages one at a time by adding content incrementally.
 * - Place image first (if needed for this page)
 * - Add h1 and p blocks one at a time
 * - Measure page-content height after each addition
 * - Stop when page is full
 * - Image shrinks naturally via CSS flex
 * - No gaps in content, image stays close to original position
 *
 * @param parsedContent - Parsed HTML content
 * @param dimensions - Page dimensions from container
 * @param settings - Reader settings
 * @returns Array of templated pages
 */
export function paginateContentV2(
  parsedContent: ParsedContent,
  dimensions: PageDimensions,
  settings: ReaderSettings
): TemplatedPage[] {
  const pages: TemplatedPage[] = [];
  let pageNumber = 1;
  let blockIndex = 0;
  let pendingOverflow: { type: 'heading' | 'paragraph'; text: string; audioId?: string } | undefined;

  // Safety limit to prevent infinite loops
  // Can be adjusted if books need more pages
  const MAX_PAGES = 100;

  console.log(`📄 Paginating ${parsedContent.blocks.length} blocks (${dimensions.width}x${dimensions.height}px)`);

  while (blockIndex < parsedContent.blocks.length || pendingOverflow) {
    // Safety check: prevent infinite loops
    if (pages.length >= MAX_PAGES) {
      console.error(`🛑 SAFETY LIMIT: Stopped at ${MAX_PAGES} pages. blockIndex=${blockIndex}, pendingOverflow=${!!pendingOverflow}`);
      if (pendingOverflow) {
        console.error(`   Overflow text length: ${pendingOverflow.text.length} chars`);
      }
      break;
    }
    const currentBlock = parsedContent.blocks[blockIndex];

    // Handle full-page images (they get their own page, no text)
    if (currentBlock && currentBlock.type === 'image') {
      const imageBlock = currentBlock as ImageBlock;
      if (imageBlock.layout === 'full_page') {
        const layout = calculatePageLayout('full-image', dimensions.width, dimensions.height, dimensions.padding);
        pages.push({
          pageNumber: pageNumber++,
          template: 'full-image',
          layout,
          textBlocks: [],
          imageBlock,
          hasAudio: false,
        });
        blockIndex++;
        continue;
      }
    }

    // Build a regular page incrementally
    const page = buildPageIncrementally(
      parsedContent.blocks,
      blockIndex,
      pendingOverflow,
      dimensions,
      settings,
      pageNumber
    );

    pages.push(page);
    blockIndex = page.nextBlockIndex;
    pendingOverflow = page.overflowText;
    pageNumber++;

    // Safety check: ensure we're making progress
    if (page.nextBlockIndex === blockIndex && !pendingOverflow && page.textBlocks.length === 0) {
      console.warn(`⚠️ No progress at block ${blockIndex}, forcing skip`);
      blockIndex++;
    }
  }

  console.log(`✅ Generated ${pages.length} pages`);
  return pages.map(p => ({
    pageNumber: p.pageNumber,
    template: p.template,
    layout: p.layout,
    textBlocks: p.textBlocks,
    imageBlock: p.imageBlock,
    hasAudio: p.hasAudio,
  }));
}

/**
 * Build a single page incrementally by adding content one block at a time
 *
 * Strategy:
 * 1. Check if there's an image that should be on this page (page_top or page_bottom)
 * 2. Place the image if needed (this sets the template)
 * 3. Add text blocks (h1, p) one at a time
 * 4. After each addition, measure if content still fits in page-content
 * 5. Stop when adding next block would overflow
 * 6. Image shrinks via flex to accommodate text
 */
function buildPageIncrementally(
  blocks: ContentBlock[],
  startIndex: number,
  initialOverflow: { type: 'heading' | 'paragraph'; text: string; audioId?: string } | undefined,
  dimensions: PageDimensions,
  settings: ReaderSettings,
  pageNumber: number
): TemplatedPage & { nextBlockIndex: number; overflowText?: { type: 'heading' | 'paragraph'; text: string; audioId?: string } } {

  let currentIndex = startIndex;
  let template: PageTemplate = 'full-text';
  let imageBlock: ImageBlock | undefined;
  const textBlocks: TextBlock[] = [];
  let hasAudio = false;
  let overflowText = initialOverflow;

  // Step 1: Check if current block is a page_top image
  // (page_top images must be placed first, before any text)
  if (blocks[currentIndex] && blocks[currentIndex].type === 'image') {
    const imgBlock = blocks[currentIndex] as ImageBlock;
    if (imgBlock.layout === 'page_top') {
      // Image at top: place image first, then add text below
      template = 'image-top-text-bottom';
      imageBlock = imgBlock;
      currentIndex++; // Move past image
    }
    // Note: page_bottom images are NOT handled here - they're collected during text flow
  }

  // Calculate layout with image URL if we have an image
  let layout = calculatePageLayout(
    template,
    dimensions.width,
    dimensions.height,
    dimensions.padding,
    imageBlock ? getImageUrl(imageBlock.assetId) : undefined
  );

  // Apply safety margin to prevent overflow
  // Reduced from 30px to 10px as measurements are now font-accurate
  const SAFETY_MARGIN = 10; // pixels
  let availableHeight = layout.textArea!.height - SAFETY_MARGIN;

  // Check for invalid available height - this would cause infinite empty pages
  if (availableHeight <= 0) {
    console.error(`🛑 Invalid availableHeight: ${availableHeight}px (textArea.height=${layout.textArea!.height}px). Page dimensions may be wrong.`);
    // Return page with current state but clear overflow to prevent infinite loop
    return {
      pageNumber,
      template,
      layout,
      textBlocks,
      imageBlock,
      hasAudio,
      nextBlockIndex: blocks.length, // Skip all remaining blocks
      overflowText: undefined, // Clear overflow to stop loop
    };
  }

  // Step 2: Add text blocks incrementally until page is full
  let usedHeight = 0;

  // Handle carry-over text from previous page first
  if (overflowText) {
    const isFirst = textBlocks.length === 0;
    const fontSize = overflowText.type === 'heading' ? BASE_FONT_SIZES.H1 : BASE_FONT_SIZES.PARAGRAPH;
    const lineHeight = overflowText.type === 'heading' ? LINE_HEIGHTS.HEADING : undefined; // Headings use 1.3, paragraphs use settings.lineSpacing
    const fontWeight = overflowText.type === 'heading' ? 600 : undefined; // Headings use font-weight: 600
    const textHeight = measureTextInArea(
      overflowText.text,
      layout.textArea!,
      settings,
      getFontFamily(settings.font),
      fontSize,
      lineHeight,
      fontWeight
    );



    // Calculate margins based on type and position
    let marginTop = 0;
    let marginBottom = 0;
    if (overflowText.type === 'heading') {
      marginTop = isFirst ? 0 : (ELEMENT_MARGINS.H1_TOP * settings.textSize);
      marginBottom = ELEMENT_MARGINS.H1_BOTTOM * settings.textSize;
    } else {
      // Paragraphs have no top margin
      marginBottom = ELEMENT_MARGINS.PARAGRAPH_BOTTOM * settings.textSize;
    }

    const blockHeightWithMargins = textHeight + marginTop + marginBottom;
    const blockHeightWithoutBottomMargin = textHeight + marginTop;

    // Check if there's content after this overflow element
    const hasContentAfter = currentIndex < blocks.length;

    if (usedHeight + blockHeightWithMargins <= availableHeight) {
      // Overflow text fits WITH bottom margin!
      textBlocks.push({
        type: overflowText.type,
        text: overflowText.text,
        audioId: overflowText.audioId,
        fontSize,
      });
      if (overflowText.audioId) hasAudio = true;
      usedHeight += blockHeightWithMargins;
      overflowText = undefined;
    } else if (usedHeight + blockHeightWithoutBottomMargin <= availableHeight) {
      // For headings: only allow as last element if there's NO content after
      // For paragraphs: can be last element regardless
      if (overflowText.type === 'heading' && hasContentAfter) {
        // Orphaned heading - leave for next page
      } else {
        // Overflow text fits WITHOUT bottom margin (will be last element)
        textBlocks.push({
          type: overflowText.type,
          text: overflowText.text,
          audioId: overflowText.audioId,
          fontSize,
        });
        if (overflowText.audioId) hasAudio = true;
        usedHeight += blockHeightWithoutBottomMargin;
        overflowText = undefined;
      }

    } else {
      // Overflow text doesn't fit at all - we MUST split it to make progress
      // This prevents infinite loops when text is larger than page height
      if (overflowText.type === 'paragraph') {
        const availableForText = availableHeight - usedHeight;
        const oneLineHeight = (BASE_FONT_SIZES.PARAGRAPH * settings.textSize) * settings.lineSpacing;
        const minSpaceNeeded = oneLineHeight * 1.5;

        if (availableForText >= minSpaceNeeded) {
          const result = fitTextToArea(
            overflowText.text,
            { ...layout.textArea!, height: availableForText },
            settings,
            getFontFamily(settings.font),
            fontSize
          );

          if (result.fitted && result.fitted.trim().length > 0) {
            textBlocks.push({
              type: 'paragraph',
              text: result.fitted,
              audioId: overflowText.audioId,
              fontSize,
            });
            if (overflowText.audioId) hasAudio = true;
          }

          if (result.overflow && result.overflow.trim().length > 0) {
            overflowText = {
              type: 'paragraph',
              text: result.overflow,
              audioId: overflowText.audioId,
            };
          } else {
            overflowText = undefined;
          }
        }
        // If not enough space, leave for next page
      }
      // Heading overflow that doesn't fit is left for next page
    }
  }

  // Add blocks from content stream
  while (currentIndex < blocks.length && !overflowText) {
    const block = blocks[currentIndex];

    // Handle images encountered during text collection
    if (block.type === 'image') {
      const imgBlock = block as ImageBlock;

      // Treat inline and page_bottom images the same way - place them at bottom of current page
      if ((imgBlock.layout === 'page_bottom' || imgBlock.layout === 'inline') && !imageBlock) {
        // Found a page_bottom/inline image - add it to this page!
        // Switch to image template if we haven't already

        if (template === 'full-text') {
          // Need to recalculate layout with image template and actual image URL
          const newLayout = calculatePageLayout(
            'text-top-image-bottom',
            dimensions.width,
            dimensions.height,
            dimensions.padding,
            getImageUrl(imgBlock.assetId)
          );

          // Try to squeeze text content in, the image will shrink via flex
          if (usedHeight > 1.5 * newLayout.textArea!.height) {
            // Content doesn't fit with image - skip image and continue with text
            //currentIndex++;
            break;
          }

          // Image fits - update template and layout
          template = 'text-top-image-bottom';
          layout = newLayout;
          availableHeight = newLayout.textArea!.height;
        }

        imageBlock = imgBlock;
        currentIndex++;
        continue;
      } else if (imgBlock.layout === 'full_page' || imgBlock.layout === 'page_top') {
        // Full-page or page-top image - stop here, it will be on next page
        break;
      } else {
        // Already have an image on this page - stop here
        break;
      }
    }

    if (block.type === 'heading') {
      const heading = block as HeadingBlock;
      const fontSize = BASE_FONT_SIZES.H1;
      const isFirst = textBlocks.length === 0; // Is this the first element on the page?

      // Headings use line-height: 1.3 and font-weight: 600 (from CSS)
      const textHeight = measureTextInArea(heading.text, layout.textArea!, settings, getFontFamily(settings.font), fontSize, LINE_HEIGHTS.HEADING, 600);

      // Calculate margins:
      // - Top margin: only if NOT first element on page
      // - Bottom margin: creates space for next element
      const marginTop = isFirst ? 0 : (ELEMENT_MARGINS.H1_TOP * settings.textSize);
      const marginBottom = ELEMENT_MARGINS.H1_BOTTOM * settings.textSize;
      const blockHeightWithMargins = textHeight + marginTop + marginBottom;
      const blockHeightWithoutBottomMargin = textHeight + marginTop;

      // Check if there's content after this heading
      const hasContentAfter = currentIndex + 1 < blocks.length;

      if (usedHeight + blockHeightWithMargins <= availableHeight) {
        // Heading fits WITH bottom margin!
        textBlocks.push({
          type: 'heading',
          text: heading.text,
          audioId: heading.audioId,
          fontSize,
        });
        if (heading.audioId) hasAudio = true;
        usedHeight += blockHeightWithMargins;
        currentIndex++;
      } else if (usedHeight + blockHeightWithoutBottomMargin <= availableHeight && !hasContentAfter) {
        // Heading fits WITHOUT bottom margin AND it's the last block in the content
        // Only allow heading as last element if there's NO content after it
        textBlocks.push({
          type: 'heading',
          text: heading.text,
          audioId: heading.audioId,
          fontSize,
        });
        if (heading.audioId) hasAudio = true;
        usedHeight += blockHeightWithoutBottomMargin;
        currentIndex++;
      } else {
        // Heading doesn't fit, OR would be orphaned - move to next page
        break;
      }
    } else if (block.type === 'paragraph') {
      const para = block as ParagraphBlock;
      const fontSize = BASE_FONT_SIZES.PARAGRAPH;
      const textHeight = measureTextInArea(para.text, layout.textArea!, settings, getFontFamily(settings.font), fontSize);
      const marginBottom = ELEMENT_MARGINS.PARAGRAPH_BOTTOM * settings.textSize;
      const fullHeight = textHeight + marginBottom;

      if (usedHeight + fullHeight <= availableHeight) {
        // Paragraph fits entirely WITH bottom margin!
        textBlocks.push({
          type: 'paragraph',
          text: para.text,
          audioId: para.audioId,
          fontSize,
        });
        if (para.audioId) hasAudio = true;
        usedHeight += fullHeight;
        currentIndex++;
      } else if (usedHeight + textHeight <= availableHeight) {
        // Paragraph fits WITHOUT bottom margin (will be last element on page)
        textBlocks.push({
          type: 'paragraph',
          text: para.text,
          audioId: para.audioId,
          fontSize,
        });
        if (para.audioId) hasAudio = true;
        usedHeight += textHeight;
        currentIndex++;
      } else {
        // Paragraph doesn't fit entirely - try to split it
        // For last element on page, we have ALL remaining space (no bottom margin needed)
        const availableForText = availableHeight - usedHeight;

        // Calculate minimum height needed for at least one line of text
        const oneLineHeight = (BASE_FONT_SIZES.PARAGRAPH * settings.textSize) * settings.lineSpacing;
        const minSpaceNeeded = oneLineHeight * 1.5; // Need at least 1.5 lines

        if (availableForText >= minSpaceNeeded) {
          const result = fitTextToArea(
            para.text,
            { ...layout.textArea!, height: availableForText },
            settings,
            getFontFamily(settings.font),
            fontSize
          );

          if (result.fitted && result.fitted.trim().length > 0) {
            textBlocks.push({
              type: 'paragraph',
              text: result.fitted,
              audioId: para.audioId,
              fontSize,
            });
            if (para.audioId) hasAudio = true;
          }

          if (result.overflow && result.overflow.trim().length > 0) {
            overflowText = {
              type: 'paragraph',
              text: result.overflow,
              audioId: para.audioId,
            };
          }

          currentIndex++;
        }
        // If not enough space, whole paragraph goes to next page
        break;
      }
    } else {
      // Unknown block type, skip it
      currentIndex++;
    }
  }

  return {
    pageNumber,
    template,
    layout,
    textBlocks,
    imageBlock,
    hasAudio,
    nextBlockIndex: currentIndex,
    overflowText,
  };
}

/**
 * Convert templated page to HTML (text content only)
 *
 * Images are handled separately in the page structure.
 * This function only returns the text content for .page-content div.
 *
 * @param page - Templated page
 * @returns HTML string for text content only
 */
export function templatedPageToHTML(page: TemplatedPage): string {
  let html = '';

  // Add text blocks only
  for (const textBlock of page.textBlocks) {
    const audioAttr = textBlock.audioId ? ` data-audio="${textBlock.audioId}"` : '';

    if (textBlock.type === 'heading') {
      html += `<h1${audioAttr}>${textBlock.text}</h1>`;
    } else {
      html += `<p${audioAttr}>${textBlock.text}</p>`;
    }
  }

  return html;
}

/**
 * Get image position from template
 *
 * @param page - Templated page
 * @returns Image position or undefined if no image
 */
export function getImagePosition(page: TemplatedPage): 'fill_page' | 'page_top' | 'page_bottom' | undefined {
  if (!page.imageBlock) return undefined;

  switch (page.template) {
    case 'full-image':
      return 'fill_page';
    case 'image-top-text-bottom':
      return 'page_top';
    case 'text-top-image-bottom':
      return 'page_bottom';
    default:
      return undefined;
  }
}
