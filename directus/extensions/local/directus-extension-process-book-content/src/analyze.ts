import { decode } from 'html-entities';

interface ImageSetting {
  directus_files_id?: {
    id: string;
  } | string;
}

export interface AnalysisResult {
  book_content_translation: {
    word_count: number;
    chapter_count: number;
    image_count: number;
    lix: number;
    lettal: number;
    reading_level: string;
    reading_min_minutes: number;
    reading_max_minutes: number;
    status?: string;
  };
  book_content: {
    id: string;
    data: {
      image_settings: {
        create: Array<{
          directus_files_id: { id: string };
        }>;
      };
    };
  };
}

/**
 * Extract asset UUIDs from HTML content
 */
export function extractAssetIds(html: string): string[] {
  const regex = /\/assets\/([0-9a-fA-F-]{36})/gi;
  const ids: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    ids.push(match[1]);
  }

  // Return unique IDs
  return Array.from(new Set(ids));
}

/**
 * Calculate LIX (Läsbarhetsindex) readability metric
 * LIX = (words/sentences) + (long words × 100/words)
 * Where long words = words with more than 6 letters
 */
export function calculateLIX(text: string): number {
  // Split into words, removing empty strings
  const words = text
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);

  const wordCount = words.length;

  if (wordCount === 0) return 0;

  // Split into sentences using common sentence endings (language-neutral)
  const sentences = text
    .split(/[.!?;:]+/)
    .filter(s => s.trim().length > 0);

  const sentenceCount = sentences.length || 1;

  // Count long words (more than 6 letters, Unicode-aware)
  const longWords = words.filter(word => {
    // Remove all non-letter characters (keeps letters from any language)
    const cleanWord = word.replace(/[^\p{L}]/gu, '');
    return cleanWord.length > 6;
  }).length;

  // LIX formula
  const lix = (wordCount / sentenceCount) + ((longWords * 100) / wordCount);

  return Math.round(lix);
}

/**
 * Convert LIX score to reading level
 */
export function getLIXLevel(lix: number): string {
  if (lix <= 28) return 'easy';
  if (lix <= 38) return 'medium';
  return 'hard';
}

/**
 * Calculate LET-tal (Danish readability metric for children)
 * Based on multiple factors: word count, long words, sentence length, pages, syntax, images
 * Returns a score from 6-24 (1-4 points per category)
 */
export function calculateLET(
  text: string,
  wordCount: number,
  imageCount: number
): number {
  // Split into words
  const wordsArray = text
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);

  const totalWords = wordCount > 0 ? wordCount : wordsArray.length;

  if (totalWords === 0) return 6; // Minimum score

  // Count long words (7+ letters, Unicode-aware)
  const longWordCount = wordsArray.filter(word => {
    const cleanWord = word.replace(/[^\p{L}]/gu, '');
    return cleanWord.length > 6;
  }).length;

  // Analyze sentences
  const sentences = text
    .split(/[.!?;:]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const sentenceWordCounts = sentences.map(s =>
    s.split(/\s+/).filter(w => w.length > 0).length
  );

  const longestSentenceLength = sentenceWordCounts.length > 0
    ? Math.max(...sentenceWordCounts)
    : totalWords;

  // Estimate pages (roughly 100 words per page)
  const estimatedPages = Math.max(1, Math.round(totalWords / 100));

  // Count syntactic features (commas, colons, semicolons)
  const commas = (text.match(/,/g) || []).length;
  const colons = (text.match(/:/g) || []).length;
  const semicolons = (text.match(/;/g) || []).length;
  const syntacticFeatures = commas + colons + semicolons;

  const images = imageCount || 0;

  // Score each category (1-4 points)

  // 1. Word count
  let pointsWords: number;
  if (totalWords <= 50) pointsWords = 1;
  else if (totalWords <= 95) pointsWords = 2;
  else if (totalWords <= 140) pointsWords = 3;
  else pointsWords = 4;

  // 2. Long words
  let pointsLongWords: number;
  if (longWordCount <= 1) pointsLongWords = 1;
  else if (longWordCount <= 4) pointsLongWords = 2;
  else if (longWordCount <= 7) pointsLongWords = 3;
  else pointsLongWords = 4;

  // 3. Longest sentence
  let pointsLongestSentence: number;
  if (longestSentenceLength <= 7) pointsLongestSentence = 1;
  else if (longestSentenceLength <= 10) pointsLongestSentence = 2;
  else if (longestSentenceLength <= 12) pointsLongestSentence = 3;
  else pointsLongestSentence = 4;

  // 4. Pages
  let pointsPages: number;
  if (estimatedPages <= 8) pointsPages = 1;
  else if (estimatedPages <= 16) pointsPages = 2;
  else if (estimatedPages <= 24) pointsPages = 3;
  else pointsPages = 4;

  // 5. Syntax complexity
  let pointsSyntax: number;
  if (syntacticFeatures <= 2) pointsSyntax = 1;
  else if (syntacticFeatures <= 5) pointsSyntax = 2;
  else if (syntacticFeatures <= 8) pointsSyntax = 3;
  else pointsSyntax = 4;

  // 6. Image support (more images = easier = fewer points)
  let pointsImages: number;
  if (images <= 0) {
    pointsImages = 4; // No images = harder
  } else {
    const wordsPerImage = totalWords / images;
    if (wordsPerImage <= 20) pointsImages = 1; // Many images
    else if (wordsPerImage <= 50) pointsImages = 2;
    else if (wordsPerImage <= 100) pointsImages = 3;
    else pointsImages = 4;
  }

  const letTotal =
    pointsWords +
    pointsLongWords +
    pointsLongestSentence +
    pointsPages +
    pointsSyntax +
    pointsImages;

  return letTotal;
}

/**
 * Main analysis function
 */
export function analyzeBookContent(
  htmlString: string,
  bookContentId: string,
  existingImageSettings: any[],
  targetReadingLevel?: string
): AnalysisResult {
  const settings = existingImageSettings || [];

  // Step 1: Decode ALL HTML entities properly
  const decodedHtml = decode(htmlString, {
    level: 'all', // Decode all entities including XML/HTML4/HTML5
  });

  // Step 2: Remove HTML tags and extract clean text
  const textOnly = decodedHtml
    .replace(/<img[^>]*>/gi, '') // Remove images
    .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Step 3: Extract asset IDs from original HTML
  const assetIds = extractAssetIds(htmlString);

  // Step 4: Count elements
  const chapterCount = (htmlString.match(/<h1[^>]*>/gi) || []).length;
  const imageCount = (htmlString.match(/<img[^>]*>/gi) || []).length;

  // Step 5: Calculate word count
  const words = textOnly.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  // Step 6: Calculate readability metrics
  const lix = calculateLIX(textOnly);
  const readingLevel = getLIXLevel(lix);
  const lettal = calculateLET(textOnly, wordCount, imageCount);

  // Step 7: Estimate reading time
  const minMinutes = Math.ceil(wordCount / 200); // Fast reader
  const maxMinutes = Math.ceil(wordCount / 50); // Slow reader

  // Step 8: Build existing file IDs set
  const existingFileIds = new Set(
    settings
      .map((item: ImageSetting) => {
        if (!item) return null;

        // Handle both raw ID string and nested object with id
        if (typeof item.directus_files_id === 'string') {
          return item.directus_files_id;
        }

        if (item.directus_files_id && typeof item.directus_files_id === 'object') {
          return item.directus_files_id.id;
        }

        return null;
      })
      .filter((x): x is string => Boolean(x))
  );

  // Step 9: Filter out existing asset IDs
  const newAssetIds = assetIds.filter(id => !existingFileIds.has(id));

  // Step 10: Convert new asset IDs to Directus relational format
  const imageSettingsCreate = newAssetIds.map(id => ({
    directus_files_id: { id },
  }));

  // Step 11: Determine status (draft if level doesn't match target)
  const status =
    targetReadingLevel && targetReadingLevel !== readingLevel
      ? 'draft'
      : undefined;

  // Step 12: Return analysis results
  return {
    book_content_translation: {
      word_count: wordCount,
      chapter_count: chapterCount,
      image_count: imageCount,
      lix,
      lettal,
      reading_level: readingLevel,
      reading_min_minutes: minMinutes,
      reading_max_minutes: maxMinutes,
      ...(status ? { status } : {}),
    },
    book_content: {
      id: bookContentId,
      data: {
        image_settings: {
          create: imageSettingsCreate,
        },
      },
    },
  };
}
