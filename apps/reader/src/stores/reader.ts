import { defineStore } from "pinia";
import { ref, computed, watch, nextTick } from "vue";
import { directus } from "../lib/directus";
import { readItems } from "@directus/sdk";
import i18n from "../i18n";
import { parseBookContent, type ParsedContent, type ImageSettings } from "../lib/html-parser";
import { paginateContentV2, templatedPageToHTML, getImagePosition, type TemplatedPage, type PageDimensions } from "../lib/pagination-engine-v2";

export type LixLevel = "easy" | "medium" | "hard";
export type FontChoice = "atkinson" | "opendyslexic" | "serif";
export type BackgroundColor = "white" | "cream";
export type HighlightMode = "word" | "sentence";

export interface Book {
  id: string;
  title: string;
  slug: string;
  author_id?: any;
  author?: any; // Support both field names
  description?: string;
  excerpt?: string;
  instruction?: string;
  cover_image?: string;
  status: string;
  final_words?: string;
}

export interface BookPage {
  id: string;
  book: string;
  page_number: number;
  content_lix_easy?: string;
  content_lix_medium?: string;
  content_lix_hard?: string;
  image?: string;
  image_position?: "fill_page" | "page_top" | "page_bottom";
  hasAudio?: boolean; // True if page has data-audio attributes (dynamic pagination)
}

export interface ReaderSettings {
  lixLevel: LixLevel;
  font: FontChoice;
  backgroundColor: BackgroundColor;
  textSize: number; // 0.9 - 1.5
  lineSpacing: number; // 1.5 - 2.5
  wordReadingEnabled: boolean; // Enable word-by-word audio on hover
  wordHighlightEnabled: boolean; // Enable word highlighting during audio playback
  highlightMode: HighlightMode; // Highlight words or sentences during audio
}

const DEFAULT_SETTINGS: ReaderSettings = {
  lixLevel: "medium",
  font: "atkinson",
  backgroundColor: "white",
  textSize: 1.0,
  lineSpacing: 2.0,
  wordReadingEnabled: true,
  wordHighlightEnabled: true,
  highlightMode: "word",
};

export const useReaderStore = defineStore("reader", () => {
  // Feature flag: Use new dynamic pagination system
  const useDynamicPagination = ref(true); // Enabled: Permissions configured ✓

  // Book and pages state
  const currentBook = ref<Book | null>(null);
  const pages = ref<BookPage[]>([]);
  const currentPageNumber = ref(1);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Reader settings
  const settings = ref<ReaderSettings>({ ...DEFAULT_SETTINGS });

  // Preload cache for smooth LIX switching
  const preloadCache = ref<Map<number, BookPage>>(new Map());

  // Flag to prevent infinite loop when changing lix level internally
  const isLoadingContent = ref(false);

  // Flag to prevent re-entry into generateVirtualPages
  const isGeneratingPages = ref(false);

  // Content version - increment to force component remount
  const contentVersion = ref(0);

  // New dynamic pagination state
  const parsedContent = ref<ParsedContent | null>(null);
  const virtualPages = ref<TemplatedPage[]>([]);
  const pageDimensions = ref<PageDimensions>({
    width: 600,
    height: 602, // Initial values - will be updated at runtime
    padding: 48,  // Matches .page-content horizontal padding (3rem = 48px)
  });

  // Available reading levels for current book
  const availableReadingLevels = ref<LixLevel[]>([]);

  // Reading position marker (tracks where user is reading)
  const readingMarker = ref<{
    pageNumber: number;
    wordId: string | null; // data-word-id attribute of the clicked word (persists across repagination)
  } | null>(null);

  // Flag to signal that marker needs to be repositioned after repagination
  const pendingMarkerReposition = ref<string | null>(null);

  // Computed properties
  const totalPages = computed(() => pages.value.length);

  const currentPage = computed(() => {
    return pages.value.find((p) => p.page_number === currentPageNumber.value);
  });

  const currentContent = computed(() => {
    const page = currentPage.value;
    if (!page) return "";

    switch (settings.value.lixLevel) {
      case "easy":
        return page.content_lix_easy || "";
      case "medium":
        return page.content_lix_medium || "";
      case "hard":
        return page.content_lix_hard || "";
      default:
        return page.content_lix_medium || "";
    }
  });

  const nextPage = computed(() => {
    return pages.value.find((p) => p.page_number === currentPageNumber.value + 1);
  });

  const prevPage = computed(() => {
    return pages.value.find((p) => p.page_number === currentPageNumber.value - 1);
  });

  // Load settings from localStorage
  function loadSettings() {
    try {
      const saved = localStorage.getItem("reader-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        settings.value = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }

  // Save settings to localStorage
  function saveSettings() {
    try {
      localStorage.setItem("reader-settings", JSON.stringify(settings.value));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  // Watch settings for changes and save
  watch(settings, saveSettings, { deep: true });

  // Apply settings to DOM
  function applySettings() {
    const body = document.body;

    // Apply font class
    [...document.body.classList]
      .filter(c => c.startsWith("font-"))
      .forEach(c => document.body.classList.remove(c));
    body.classList.add(`font-${settings.value.font}`);

    // Apply background color
    [...document.body.classList]
      .filter(c => c.startsWith("bg-"))
      .forEach(c => document.body.classList.remove(c));
    body.classList.add(`bg-${settings.value.backgroundColor}`);

    // Apply text size and line spacing via CSS variables
    document.documentElement.style.setProperty("--text-size-multiplier", settings.value.textSize.toString());
    document.documentElement.style.setProperty("--line-spacing", settings.value.lineSpacing.toString());
  }

  // Update settings
  function updateSettings(partial: Partial<ReaderSettings>) {
    settings.value = { ...settings.value, ...partial };
    applySettings();
  }

  // Stores the level to use when loading content (set from URL parameter)
  // This bypasses the reactive settings which can be overwritten by watchers
  let pendingInitialLevel: LixLevel | null = null;

  // Load book by path (author-slug/book-slug)
  // Optional initialLevel parameter to override localStorage settings from URL
  async function loadBook(bookPath: string, initialLevel?: LixLevel) {
    isLoading.value = true;
    error.value = null;

    // Store the initial level to use in loadBookContent
    // This bypasses reactive settings which can be changed by watchers during async operations
    if (initialLevel) {
      console.log(`📚 Setting initial level from URL: ${initialLevel}`);
      pendingInitialLevel = initialLevel;
      isLoadingContent.value = true; // Prevent watcher from triggering content reload
      settings.value.lixLevel = initialLevel;
    }

    try {
      const parts = bookPath.split("/");
      let filter: any;

      if (parts.length === 2) {
        const [authorSlug, bookSlug] = parts;
        filter = {
          _and: [
            { slug: { _eq: bookSlug } },
            { status: { _eq: "published" } },
          ],
        };
      } else {
        filter = { slug: { _eq: bookPath }, status: { _eq: "published" } };
      }

      const books = await directus.request(
        readItems("books", {
          filter,
          fields: ["*", "author_id.*", "author.*"],
        })
      );

      let filteredBooks = books;
      if (parts.length === 2) {
        const [authorSlug] = parts;
        filteredBooks = books.filter((book: any) => {
          const author = book.author_id || book.author;
          return author && typeof author === "object" && author.slug === authorSlug;
        });
      }

      if (filteredBooks.length === 0) {
        throw new Error(i18n.global.t('reader.error.book_not_found'));
      }

      currentBook.value = filteredBooks[0] as Book;

      // Fetch book translations for final_words and other fields
      try {
        const currentLang = i18n.global.locale.value;
        const bookTranslations = await directus.request(
          readItems("books_translations", {
            filter: {
              _and: [
                { books_id: { _eq: currentBook.value.id } },
                { languages_code: { _eq: currentLang } }
              ]
            },
            limit: 1,
          })
        );

        if (bookTranslations && bookTranslations[0]) {
          const trans = bookTranslations[0];
          currentBook.value.final_words = trans.final_words;
          currentBook.value.description = trans.description;
          currentBook.value.excerpt = trans.excerpt;
          currentBook.value.instruction = trans.instruction;
        }
      } catch (e) {
        console.warn("Could not load book translations:", e);
      }

      await loadBookContent();

    } catch (e: any) {
      error.value = e.message || i18n.global.t('reader.error.failed_to_load_book');
      console.error("Failed to load book:", e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }



  // NEW: Load book_content and generate dynamic pages
  async function loadBookContent() {
    if (!currentBook.value) return;


    // Set flag to prevent infinite loop from watcher
    isLoadingContent.value = true;

    try {
      const currentLang = i18n.global.locale.value;

      // 1. Fetch ALL book_content for this book to determine available reading levels
      const allBookContents = await directus.request(
        readItems("book_content", {
          filter: { book: { _eq: currentBook.value.id } },
          fields: ["*"],
        })
      );

      if (allBookContents.length === 0) {
        console.warn("No book_content found");
        return;
      }

      // Filter to only book_contents with a published translation in the current language
      const publishedTranslations = await directus.request(
        readItems("book_content_translations", {
          filter: {
            _and: [
              { book_content_id: { _in: allBookContents.map((bc: any) => bc.id) } },
              { languages_code: { _eq: currentLang } },
              { status: { _eq: "published" } },
            ],
          },
          fields: ["book_content_id"],
          limit: -1,
        })
      );
      const publishedContentIds = new Set(
        publishedTranslations.map((t: any) => t.book_content_id)
      );
      const bookContents = allBookContents.filter((bc: any) =>
        publishedContentIds.has(bc.id)
      );

      if (bookContents.length === 0) {
        console.warn("No published book_content translation found for language");
        return;
      }

      // Sort by reading level: basic, easy, medium, difficult, hard
      const levelOrder: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
      bookContents.sort((a: any, b: any) =>
        (levelOrder[a.reading_level] || 99) - (levelOrder[b.reading_level] || 99)
      );

      // Store available reading levels
      availableReadingLevels.value = bookContents.map((bc: any) => bc.reading_level as LixLevel);

      // Select the book_content based on current reading level setting
      // Use pendingInitialLevel if set (from URL), otherwise use settings
      const targetLevel = pendingInitialLevel || settings.value.lixLevel;
      pendingInitialLevel = null; // Clear after use

      // Debug logging for reading level selection
      // console.log(`📚 Looking for content with reading level: ${targetLevel}`);
      // console.log(`📚 Available levels: ${availableReadingLevels.value.join(', ')}`);

      // Find matching book_content or default to first one
      let bookContent = bookContents.find((bc: any) =>
        bc.reading_level === targetLevel
      );

      if (!bookContent) {
        bookContent = bookContents[0];
        console.log(`📚 Level ${targetLevel} not found, falling back to ${bookContent.reading_level}`);
      }

      // Always update settings to match the loaded level
      settings.value.lixLevel = bookContent.reading_level as LixLevel;

      // 2. Fetch translation for current language
      const translations = await directus.request(
        readItems("book_content_translations", {
          filter: {
            _and: [
              { book_content_id: { _eq: bookContent.id } },
              { languages_code: { _eq: currentLang } },
              { status: { _eq: "published" } }
            ]
          },
          limit: 1,
          fields: ["*"],
        })
      );

      if (translations.length === 0) {
        throw new Error(`No translation found for language: ${currentLang}`);
      }

      const translation = translations[0];

      // 3. Fetch image settings for this book_content
      const imageSettings = await directus.request(
        readItems("book_content_image_settings", {
          filter: { book_content_id: { _eq: bookContent.id } },
          fields: ["*"],
        })
      );

      // 4. Parse HTML content
      parsedContent.value = parseBookContent(translation.content_output, imageSettings as ImageSettings[]);

      pages.value = []; // Clear old pages
      virtualPages.value = []; // Clear virtual pages

      // Reset dimensions to placeholders to force component to re-measure
      // This ensures the same flow as initial load:
      // 1. Empty pages render
      // 2. Component measures container
      // 3. updatePageDimensions() is called
      // 4. Pages are generated with correct dimensions
      pageDimensions.value = {
        width: 600,
        height: 602,
        padding: 48,
      };

      // Increment content version to force component remount
      contentVersion.value++;

    } catch (e) {
      console.error("Failed to load book content:", e);
      error.value = i18n.global.t('reader.error.book_not_found');
      // Fallback to old system
    } finally {
      // Reset flag to allow future lix level changes
      isLoadingContent.value = false;
    }
  }

  // Generate virtual pages from parsed content
  function generateVirtualPages() {

    if (!parsedContent.value) return;

    // Prevent re-entry
    if (isGeneratingPages.value) return;

    // Don't generate with placeholder dimensions
    if (pageDimensions.value.width === 600 && pageDimensions.value.height === 602) return;

    // Don't generate with invalid dimensions
    if (pageDimensions.value.width <= 0 || pageDimensions.value.height <= 0) {
      console.warn("⚠️ Invalid dimensions for page generation, skipping");
      return;
    }

    isGeneratingPages.value = true;

    try {
      // Generate pages using template-based pagination engine
      virtualPages.value = paginateContentV2(
        parsedContent.value,
        pageDimensions.value,
        settings.value
      );

      // Convert templated pages to BookPage format for compatibility
      pages.value = virtualPages.value.map((tPage, index) => {
        const html = templatedPageToHTML(tPage);
        const imagePosition = getImagePosition(tPage);

        return {
          id: `virtual-page-${index + 1}`,
          book: currentBook.value?.id || '',
          page_number: tPage.pageNumber,
          content_lix_easy: html,
          content_lix_medium: html,
          content_lix_hard: html,
          image: tPage.imageBlock?.assetId,
          image_position: imagePosition,
          hasAudio: tPage.hasAudio,
        } as BookPage;
      });

      // Preload first 3 pages
      if (pages.value.length > 0) {
        preloadPages([1, 2, 3]);
      }
    } finally {

      isGeneratingPages.value = false;
    }
  }

  // Update page dimensions based on actual container size
  async function updatePageDimensions(containerWidth: number, containerHeight: number, forceRepaginate: boolean = false) {
    // Skip invalid dimensions
    if (containerWidth <= 0 || containerHeight <= 0) {
      console.warn(`⚠️ Invalid container dimensions: ${containerWidth}x${containerHeight}, skipping`);
      return;
    }

    // PageFlip uses half width for two-page spread
    const pageWidth = Math.floor(containerWidth / 2);
    const pageHeight = containerHeight;

    await updatePageDimensionsDirect(pageWidth, pageHeight, forceRepaginate);
  }

  // Update page dimensions directly (without dividing width by 2)
  // Used when caller has already calculated the correct page dimensions
  async function updatePageDimensionsDirect(pageWidth: number, pageHeight: number, forceRepaginate: boolean = false) {
    // Skip invalid dimensions
    if (pageWidth <= 0 || pageHeight <= 0) {
      console.warn(`⚠️ Invalid page dimensions: ${pageWidth}x${pageHeight}, skipping`);
      return;
    }

    const oldHeight = pageDimensions.value.height;
    const oldWidth = pageDimensions.value.width;
    const wasInitialDimensions = (oldWidth === 600 && oldHeight === 602);

    // Determine padding based on page width (mobile uses smaller padding)
    // Mobile breakpoint is 800px, so single page width ~390px would indicate mobile
    const isMobilePage = pageWidth < 500;
    const padding = isMobilePage ? 24 : 48; // 1.5rem vs 3rem

    pageDimensions.value = {
      width: pageWidth,
      height: pageHeight,
      padding,
    };

    // Repaginate if dimensions changed significantly, transitioning from initial, or forced
    if (useDynamicPagination.value && parsedContent.value) {
      const widthChanged = Math.abs(pageWidth - oldWidth) > 10;
      const heightChanged = Math.abs(pageHeight - oldHeight) > 10;

      if (forceRepaginate || wasInitialDimensions || widthChanged || heightChanged) {
        console.log(`📐 Repaginating: force=${forceRepaginate}, initial=${wasInitialDimensions}, widthChanged=${widthChanged}, heightChanged=${heightChanged}`);
        // On initial load, wait for fonts before generating pages
        if (wasInitialDimensions) {
          await document.fonts.ready;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        generateVirtualPages();
      }
    }
  }

  // Repaginate when settings change
  function repaginate() {
    if (useDynamicPagination.value && parsedContent.value) {
      generateVirtualPages();
    }
  }

  // Preload specific pages (for smooth navigation and LIX switching)
  function preloadPages(pageNumbers: number[]) {

    pageNumbers.forEach((num) => {
      const page = pages.value.find((p) => p.page_number === num);
      if (page) {
        preloadCache.value.set(num, page);
      }
    });
  }

  // Go to specific page
  function goToPage(pageNumber: number) {
    if (pageNumber < 1 || pageNumber > totalPages.value) {
      return;
    }

    currentPageNumber.value = pageNumber;

    // Preload surrounding pages
    const toPreload = [
      pageNumber - 1,
      pageNumber,
      pageNumber + 1,
      pageNumber + 2,
    ].filter((n) => n >= 1 && n <= totalPages.value);

    preloadPages(toPreload);
  }

  // Navigation functions
  function nextPageNav() {
    if (currentPageNumber.value < totalPages.value) {
      goToPage(currentPageNumber.value + 1);
    }
  }

  function prevPageNav() {
    if (currentPageNumber.value > 1) {
      goToPage(currentPageNumber.value - 1);
    }
  }

  // Get image URL from Directus
  function getImageUrl(imageId: string): string {
    if (!imageId) return "";
    // Assuming Directus is running on the same domain or CORS is configured
    const directusUrl = import.meta.env.PUBLIC_DIRECTUS_URL || "http://localhost:8055";
    return `${directusUrl}/assets/${imageId}`;
  }

  // Initialize store
  function initialize() {
    loadSettings();
    applySettings();
  }

  // Find which page contains a word with the given word ID
  function findPageWithWordId(wordId: string): number | null {
    // Search through pages to find one containing data-word-id="wordId"
    for (const page of pages.value) {
      const content = page.content_lix_medium || page.content_lix_easy || page.content_lix_hard || '';
      if (content.includes(`data-word-id="${wordId}"`)) {
        return page.page_number;
      }
    }
    return null;
  }

  // Watch for visual settings changes to trigger repagination (text size, spacing, font)
  // After repagination, navigate to the page with the reading marker
  watch(
    () => [settings.value.textSize, settings.value.lineSpacing, settings.value.font],
    async (newValues, oldValues) => {
      if (useDynamicPagination.value) {
        console.log("Visual settings changed, CSS will update automatically");

        // If font changed, wait for the new font to load before repaginating
        const fontChanged = oldValues && newValues[2] !== oldValues[2];
        if (fontChanged) {
          const fontName = newValues[2];
          const fontFamily = fontName === 'opendyslexic' ? 'OpenDyslexic' :
                            fontName === 'atkinson' ? 'Atkinson Hyperlegible' :
                            'Georgia, serif';

          console.log(`🔤 Font changed to ${fontName}, loading ${fontFamily}...`);

          // Explicitly load the specific font - this is more reliable than fonts.ready
          try {
            await document.fonts.load(`1rem "${fontFamily}"`);
          } catch (e) {
            console.warn(`Could not load font ${fontFamily}:`, e);
          }

          // Extra frames to ensure font is applied to DOM and layout recalculated
          await new Promise(resolve => requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              requestAnimationFrame(resolve)
            )
          ));
        }

        // Store the word ID before repagination so we can find it after
        const wordToFind = readingMarker.value?.wordId || null;

        repaginate();

        // After repagination, signal component to find and reposition marker
        // Component will search DOM for word and update page number
        if (wordToFind) {
          nextTick(() => {
            pendingMarkerReposition.value = wordToFind;
            console.log(`📍 Requesting marker reposition for word: ${wordToFind}`);
          });
        }
      }
    },
    { deep: true }
  );

  // Watch for reading level changes to reload book content
  // Always navigate to page 1 after changing reading level
  watch(
    () => settings.value.lixLevel,
    async (newLevel, oldLevel) => {
      // Skip if we're already loading content (prevents infinite loop)
      if (isLoadingContent.value) {
        console.log(`📚 Skipping lix change watcher (already loading content): ${oldLevel} → ${newLevel}`);
        return;
      }

      if (useDynamicPagination.value && newLevel !== oldLevel && currentBook.value) {
        console.log(`📚 Reading level changed: ${oldLevel} → ${newLevel}`);
        console.log("Reloading book content...");
        await loadBookContent();
        // Reset to page 1 when changing reading level
        currentPageNumber.value = 1;
        readingMarker.value = null; // Clear marker
      }
    }
  );

  // Set reading marker to specific word on a page
  function setReadingMarker(pageNumber: number, wordId: string | null) {
    readingMarker.value = { pageNumber, wordId };
    console.log(`📍 Reading marker set: page ${pageNumber}, wordId: ${wordId}`);
  }

  // Clear reading marker (used when switching reading levels)
  function clearReadingMarker() {
    readingMarker.value = null;
    pendingMarkerReposition.value = null;
    console.log(`📍 Reading marker cleared`);
  }

  return {
    // State
    currentBook,
    pages,
    currentPageNumber,
    isLoading,
    error,
    settings,
    useDynamicPagination,
    parsedContent,
    virtualPages,
    availableReadingLevels,
    readingMarker,
    pendingMarkerReposition,
    contentVersion,

    // Computed
    totalPages,
    currentPage,
    currentContent,
    nextPage,
    prevPage,

    // Actions
    loadBook,
    loadBookContent,
    goToPage,
    nextPageNav,
    prevPageNav,
    updateSettings,
    applySettings,
    setReadingMarker,
    clearReadingMarker,
    getImageUrl,
    initialize,
    repaginate,
    updatePageDimensions,
    updatePageDimensionsDirect,
  };
});
