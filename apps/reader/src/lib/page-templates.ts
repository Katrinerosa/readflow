/**
 * Page Template System
 *
 * Defines page layouts and calculates available space for text and images
 * dynamically based on container dimensions.
 */

import type { ReaderSettings, FontChoice } from '../stores/reader';

/**
 * Base font sizes matching CSS (in pixels, at 1rem = 16px)
 * These are multiplied by settings.textSize for final size
 */
export const BASE_FONT_SIZES = {
  PARAGRAPH: 16 * 1.1,  // 17.6px - matches .page-content font-size: calc(1.1rem * var(--text-size-multiplier))
  H1: 16 * 1.8,         // 28.8px - matches .page-content h1 font-size: calc(1.8rem * var(--text-size-multiplier))
  H2: 16 * 1.5,         // 24px   - matches .page-content h2 font-size: calc(1.5rem * var(--text-size-multiplier))
  H3: 16 * 1.25,        // 20px   - matches .page-content h3 font-size: calc(1.25rem * var(--text-size-multiplier))
} as const;

/**
 * Margins matching CSS (in pixels, at 1rem = 16px)
 * These are multiplied by settings.textSize for final size
 *
 * NOTE: CSS automatically removes margins for :first-child and :last-child
 * Our pagination calculations mirror this behavior for accurate measurements
 */
export const ELEMENT_MARGINS = {
  PARAGRAPH_BOTTOM: 16,  // 1.25rem - matches .page-content p margin-bottom (removed for :last-child)
  H1_TOP: 24,            // 1.5rem - matches .page-content h1 margin-top (removed for :first-child)
  H1_BOTTOM: 16,         // 1rem - matches .page-content h1 margin-bottom (removed for :last-child)
} as const;

/**
 * Line heights matching CSS
 */
export const LINE_HEIGHTS = {
  HEADING: 1.3,  // matches .page-content h1/h2/h3 line-height
  // PARAGRAPH uses settings.lineSpacing from user settings
} as const;

/**
 * Map font setting to actual font family name
 */
export function getFontFamily(fontChoice: FontChoice): string {
  switch (fontChoice) {
    case 'opendyslexic':
      return 'OpenDyslexic';
    case 'serif':
      return 'Georgia, serif';
    case 'atkinson':
    default:
      return 'Atkinson Hyperlegible';
  }
}

/**
 * Load fresh reader settings from localStorage
 * This ensures measurements always use current user settings
 */
export function loadFreshSettings(): ReaderSettings {
  const DEFAULT_SETTINGS: ReaderSettings = {
    lixLevel: "medium",
    font: "atkinson",
    backgroundColor: "white",
    textSize: 1.0,
    lineSpacing: 1.7,
  };

  try {
    const saved = localStorage.getItem("reader-settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load settings from localStorage:", e);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Available page templates
 */
export type PageTemplate =
  | 'full-text'              // Only text content
  | 'text-top-image-bottom'  // Text at top, image at bottom
  | 'image-top-text-bottom'  // Image at top, text at bottom
  | 'full-image';            // Only image (no text)

/**
 * Text area dimensions within a page
 */
export interface TextArea {
  top: number;      // Pixels from page top
  left: number;     // Pixels from page left
  width: number;    // Available width for text
  height: number;   // Available height for text
}

/**
 * Image area dimensions within a page
 */
export interface ImageArea {
  top: number;      // Pixels from page top
  left: number;     // Pixels from page left
  width: number;    // Available width for image
  height: number;   // Available height for image
}

/**
 * Complete page layout with all areas
 */
export interface PageLayout {
  template: PageTemplate;
  textArea?: TextArea;
  imageArea?: ImageArea;
}

/**
 * Measure actual available text height by rendering a temporary page with image
 *
 * This creates a temporary DOM structure matching the page layout, adds the image,
 * and measures the actual height available for text content after flex layout.
 *
 * @param template - The page template type
 * @param pageWidth - Total page width in pixels
 * @param pageHeight - Total page height in pixels
 * @param padding - Content padding in pixels
 * @param imageUrl - Optional image URL for templates with images
 * @returns Measured available text height in pixels
 */
export function measureAvailableTextHeight(
  template: PageTemplate,
  pageWidth: number,
  pageHeight: number,
  padding: number,
  imageUrl?: string
): number {
  // Calculate available text height mathematically
  // This allows CSS to use min-height: 0 for dynamic image sizing at render time

  const IMAGE_MIN_HEIGHT_PERCENT = 0.40; // 30% of page height - matches CSS .page-image min-height

  let contentHeight: number;

  if (template === 'full-text' || template === 'full-image') {
    // Full page for text (minus padding)
    contentHeight = pageHeight - (padding * 2);
  } else {
    // Image templates: subtract image minimum height (30% of page)
    const imageMinHeight = pageHeight * IMAGE_MIN_HEIGHT_PERCENT;
    contentHeight = pageHeight - imageMinHeight - (padding * 2);
  }

  console.log(`📏 Calculated page-content height for ${template}: ${contentHeight}px`);
  return contentHeight;
}

/**
 * Calculate page layout based on template and container dimensions
 *
 * Measures actual available space by rendering temporary DOM structure with image.
 *
 * @param template - The page template to use
 * @param pageWidth - Total page width in pixels
 * @param pageHeight - Total page height in pixels
 * @param padding - Padding around content in pixels
 * @param imageUrl - Optional image URL for measuring with actual image
 * @returns Layout with calculated areas
 */
export function calculatePageLayout(
  template: PageTemplate,
  pageWidth: number,
  pageHeight: number,
  padding: number,
  imageUrl?: string
): PageLayout {
  const contentWidth = pageWidth - (padding * 2);

  // Measure available text height by rendering temporary page structure
  const contentHeight = measureAvailableTextHeight(template, pageWidth, pageHeight, padding, imageUrl);

  // contentHeight is now the MEASURED available text area height for this template
  // It already accounts for images, flex layouts, and all spacing
  switch (template) {
    case 'full-text':
      return {
        template,
        textArea: {
          top: padding,
          left: padding,
          width: contentWidth,
          height: contentHeight,
        },
      };

    case 'text-top-image-bottom':
      return {
        template,
        textArea: {
          top: padding,
          left: padding,
          width: contentWidth,
          height: contentHeight, // Measured height already accounts for image space
        },
        imageArea: {
          top: 0, // Positioned by CSS flex order
          left: padding,
          width: contentWidth,
          height: 0, // Sized by CSS flex
        },
      };

    case 'image-top-text-bottom':
      return {
        template,
        imageArea: {
          top: 0, // Positioned by CSS flex order
          left: padding,
          width: contentWidth,
          height: 0, // Sized by CSS flex
        },
        textArea: {
          top: 0, // Positioned by CSS flex order
          left: padding,
          width: contentWidth,
          height: contentHeight, // Measured height already accounts for image space
        },
      };

    case 'full-image':
      return {
        template,
        imageArea: {
          top: padding,
          left: padding,
          width: contentWidth,
          height: contentHeight,
        },
      };
  }
}

/**
 * Determine which template to use based on image layout
 *
 * @param imageLayout - Image layout from content block
 * @returns Appropriate page template
 */
export function getTemplateForImageLayout(imageLayout: 'full_page' | 'page_top' | 'page_bottom' | 'inline'): PageTemplate {
  switch (imageLayout) {
    case 'full_page':
      return 'full-image';
    case 'page_top':
      return 'image-top-text-bottom';
    case 'page_bottom':
      return 'text-top-image-bottom';
    case 'inline':
    default:
      return 'full-text'; // Inline images are treated as part of text flow
  }
}

/**
 * Measure actual text height when rendered in a specific area
 *
 * @param text - Text content to measure
 * @param textArea - Area where text will be rendered
 * @param settings - Reader settings (font size, line spacing, etc.)
 * @param fontFamily - Font family to use (use getFontFamily(settings.font))
 * @param fontSize - Base font size (will be multiplied by textSize) - use BASE_FONT_SIZES.PARAGRAPH or BASE_FONT_SIZES.H1
 * @param lineHeight - Optional override for line-height (defaults to settings.lineSpacing)
 * @param fontWeight - Optional font weight (600 for headings)
 * @returns Actual rendered height in pixels
 */
export function measureTextInArea(
  text: string,
  textArea: TextArea,
  settings: ReaderSettings,
  fontFamily: string,
  fontSize: number,
  lineHeight?: number,
  fontWeight?: number | string
): number {
  if (typeof document === 'undefined') {
    // Fallback for SSR
    return estimateTextHeight(text, textArea.width, fontSize, lineHeight || settings.lineSpacing);
  }

  // Create temporary measurement element
  const measure = document.createElement('div');
  measure.style.position = 'absolute';
  measure.style.visibility = 'hidden';
  measure.style.left = '-9999px';
  measure.style.width = `${textArea.width}px`;
  measure.style.fontSize = `${fontSize * settings.textSize}px`;
  measure.style.fontFamily = fontFamily;
  measure.style.lineHeight = (lineHeight || settings.lineSpacing).toString();
  measure.style.fontWeight = fontWeight ? fontWeight.toString() : 'normal';
  measure.style.whiteSpace = 'normal';
  measure.style.overflowWrap = 'break-word';
  measure.style.margin = '0';
  measure.style.padding = '0';
  measure.textContent = text;

  document.body.appendChild(measure);
  const height = measure.offsetHeight;
  document.body.removeChild(measure);

  return height;
}

/**
 * Estimate text height (fallback for SSR)
 */
function estimateTextHeight(
  text: string,
  width: number,
  fontSize: number,
  lineSpacing: number
): number {
  const avgCharWidth = fontSize * 0.5;
  const charsPerLine = Math.floor(width / avgCharWidth);
  const lines = Math.ceil(text.length / charsPerLine);
  return lines * fontSize * lineSpacing;
}

/**
 * Split HTML text by spaces that are outside HTML tags.
 * Spaces inside tags (e.g., <span data-word="uuid">) are preserved
 * so tags are never split across page boundaries.
 */
function splitHtmlByWords(html: string): string[] {
  const words: string[] = [];
  let current = '';
  let inTag = false;

  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    if (char === '<') {
      inTag = true;
      current += char;
    } else if (char === '>' && inTag) {
      inTag = false;
      current += char;
    } else if (char === ' ' && !inTag) {
      if (current) words.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) words.push(current);
  return words;
}

/**
 * Fit text into available area, splitting if necessary
 *
 * Returns the text that fits and any overflow text.
 *
 * @param text - Text to fit
 * @param textArea - Available area
 * @param settings - Reader settings
 * @param fontFamily - Font family to use (use getFontFamily(settings.font))
 * @param fontSize - Base font size (will be multiplied by textSize) - use BASE_FONT_SIZES.PARAGRAPH or BASE_FONT_SIZES.H1
 * @returns Object with fitted text and overflow
 */
export function fitTextToArea(
  text: string,
  textArea: TextArea,
  settings: ReaderSettings,
  fontFamily: string,
  fontSize: number
): { fitted: string; overflow: string } {
  // First check if all text fits
  const fullHeight = measureTextInArea(text, textArea, settings, fontFamily, fontSize);

  if (fullHeight <= textArea.height) {
    // All text fits!
    return { fitted: text, overflow: '' };
  }

  // Text doesn't fit - need to split it
  // Use binary search to find the split point
  const words = splitHtmlByWords(text);
  let low = 0;
  let high = words.length;
  let bestFit = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const testText = words.slice(0, mid).join(' ');
    const testHeight = measureTextInArea(testText, textArea, settings, fontFamily, fontSize);

    if (testHeight <= textArea.height) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Split at best fit point
  const fitted = words.slice(0, bestFit).join(' ');
  const overflow = words.slice(bestFit).join(' ');

  return { fitted, overflow };
}
