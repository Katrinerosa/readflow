<template>
  <div class="two-page-spread" :class="{ fullscreen: isFullscreenActive }">
    <div
      class="book-container-wrapper"
      :class="{ fullscreen: isFullscreenActive, 'is-transitioning': isTransitioning }"
    >
      <div ref="bookContainer" class="book-container">
        <!-- Pages will be inserted here by PageFlip -->
      </div>
    </div>

    <!-- Mobile Footer Controls (visible on screens < 800px) -->
    <div v-if="!props.fullscreen" class="mobile-footer-controls">
      <div class="footer-left-buttons">
        <a :href="backUrl" class="footer-back-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </a>
        <button @click="$emit('toggleFeedback')" class="footer-feedback-button" :aria-label="$t('feedback.button.label')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="footer-page-nav">
        <button
          @click="prevPage"
          :disabled="!canGoPrev"
          class="btn-nav-footer btn-prev"
          :aria-label="$t('reader.nav.previous_page')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div class="page-indicator" v-html="$t('reader.nav.page_of', { current: currentPage, total: totalPages })">
        </div>

        <button
          @click="nextPage"
          :disabled="!canGoNext"
          class="btn-nav-footer btn-next"
          :aria-label="$t('reader.nav.next_page')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <div class="footer-right-buttons">
        <button @click="$emit('toggleChapters')" class="footer-chapters-button" :aria-label="$t('reader.chapters.toggle')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button @click="$emit('toggleSettings')" class="footer-settings-button" :aria-label="$t('reader.settings.toggle')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8L15 8M15 8C15 9.65686 16.3431 11 18 11C19.6569 11 21 9.65685 21 8C21 6.34315 19.6569 5 18 5C16.3431 5 15 6.34315 15 8ZM9 16L21 16M9 16C9 17.6569 7.65685 19 6 19C4.34315 19 3 17.6569 3 16C3 14.3431 4.34315 13 6 13C7.65685 13 9 14.3431 9 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Desktop Navigation Controls (visible on screens >= 800px) -->
    <div v-if="!props.fullscreen" class="book-controls">
      <button
        @click="prevPage"
        :disabled="!canGoPrev"
        class="btn-nav btn-prev"
        :aria-label="$t('reader.nav.previous_page')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div class="page-indicator" v-html="$t('reader.nav.page_of', { current: currentPage, total: totalPages })">
      </div>

      <button
        @click="nextPage"
        :disabled="!canGoNext"
        class="btn-nav btn-next"
        :aria-label="$t('reader.nav.next_page')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>

    <!-- Floating Audio Controls (shown when hovering page audio icon) -->
    <AudioControls
      ref="audioControlsRef"
      :visible="showingAudioControls"
      :audio-url="audioUrl"
      :initial-position="audioControlsPosition"
      :word-reading-enabled="readerStore.settings.wordReadingEnabled"
      :word-highlight-enabled="readerStore.settings.wordHighlightEnabled"
      :word-timing="currentWordTiming"
      @close="closeAudioControls"
      @mouse-enter="keepAudioControlsOpen"
      @mouse-leave="hideAudioControls"
      @playing-change="onAudioPlayingChange"
      @toggle-word-reading="toggleWordReading"
      @toggle-word-highlight="toggleWordHighlight"
      @word-highlight="onWordHighlight"
    />

    <!-- Word Explanation Popover -->
    <WordExplanationPopover />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { PageFlip } from "page-flip";
import { useReaderStore } from "../stores/reader";
import type { BookPage } from "../stores/reader";
import AudioControls from "./AudioControls.vue";
import WordExplanationPopover from "./WordExplanationPopover.vue";
import { useWordExplanations } from "../composables/useWordExplanations";
import { useWordAudio } from "../composables/useWordAudio";

interface Props {
  fullscreen?: boolean;
  bookPath?: string;
}

const props = withDefaults(defineProps<Props>(), {
  fullscreen: false,
  bookPath: ''
});

const emit = defineEmits<{
  toggleSettings: []
  toggleChapters: []
  toggleFeedback: []
}>();

const { t } = useI18n();

const readerStore = useReaderStore();
const wordExplanations = useWordExplanations();
const wordAudio = useWordAudio();
const bookContainer = ref<HTMLDivElement | null>(null);

// Global word counter for unique word IDs (reset on page rebuild)
let globalWordId = 0;

// Computed property for back URL with language-aware path
const backUrl = computed(() => {
  if (!props.bookPath) return '/';
  const locale = useI18n().locale.value;
  // Map language to URL path (en -> books, da -> boeger, de -> bucher)
  const booksPath = locale === 'da' ? 'boeger' : locale === 'de' ? 'bucher' : 'books';
  return `/${locale}/${booksPath}/${props.bookPath}`;
});
let pageFlipInstance: PageFlip | null = null;

// Mobile breakpoint constant
const MOBILE_BREAKPOINT = 800;

// Helper function to check if we're in mobile mode
const isMobileViewport = () => window.innerWidth < MOBILE_BREAKPOINT;

// Track the actual displayed page (including final page)
const displayedPage = ref(1);

// Track whether we're in single-page mode (reactive)
const isInSinglePageMode = ref(true);

/**
 * PageFlip Configuration - All possible parameters for tuning
 *
 * This configuration object controls the behavior of the page-flip library.
 * Modify these values to customize the flip animation, interaction, and appearance.
 *
 * To tune parameters:
 * 1. Edit values in this config object
 * 2. Save the file (hot reload will apply changes automatically in dev mode)
 * 3. Test the behavior in the browser
 *
 * Reference: https://github.com/Nodlik/StPageFlip
 *
 * Key parameters to experiment with:
 * - flippingTime: Speed of the flip animation (in milliseconds)
 * - maxShadowOpacity: Intensity of shadows during flip (0-1)
 * - swipeDistance: How far to swipe before triggering a flip
 * - renderOnMouseMove: Page curl follows mouse movement
 */
const pageFlipConfig = ref({
  // Required: Page dimensions (will be calculated dynamically)
  width: 0,
  height: 0,

  // Size mode: "fixed" (set size) or "stretch" (fit container)
  size: "fixed" as "fixed" | "stretch",

  // Minimum page size
  minWidth: 315,
  minHeight: 400,

  // Maximum page size (only when not fullscreen)
  maxWidth: 600,
  maxHeight: 1000,

  // Start page number (0-indexed)
  startPage: 0,

  // Z-index for the book
  startZIndex: 0,

  // Auto-size to fit container
  autoSize: false,

  // Show the book cover (first page as cover)
  showCover: false,

  // Flip animation duration in milliseconds
  flippingTime: 600,

  // Enable portrait mode (single page view) for narrow viewports
  // IMPORTANT: This forces single-page mode on mobile devices
  usePortrait: true, // Will be updated dynamically in initializePageFlip()

  // Enable mouse/touch events (but only for drag, not for edge detection)
  useMouseEvents: true,

  // Enable swipe gestures
  swipeDistance: 30, // Minimum swipe distance in pixels to trigger flip

  // Click zones for flipping: left/right thirds of page
  clickEventForward: false, // Disable click right side to go forward

  // Disable edge flipping (prevents auto-flip when mouse is near edge)
  showPageCorners: false, // Disable corner hints that trigger edge flips

  // Shadows
  drawShadow: true,
  maxShadowOpacity: 0.5, // 0 to 1

  // Mobile scroll behavior
  mobileScrollSupport: false, // If true, allows vertical scrolling on mobile

  // Disable flipping (for read-only mode)
  disableFlipByClick: true,

  // Page rendering mode: "simple" (CSS transform) or "complex" (canvas-based)
  // simple = better performance, complex = more realistic page curl
  renderOnMouseMove: false, // Disable page curl following mouse movement (only flip on drag)

  // Sound on flip (requires audio file)
  // flipSound: '/path/to/flip-sound.mp3',
});

// Track transition state for smooth fullscreen toggle and initial load
const isTransitioning = ref(true); // Start invisible for initial load
const isFullscreenActive = ref(props.fullscreen);
let transitionStartTime = 0; // Track when fade-out started
const FADE_DURATION = 300; // CSS transition duration in ms
let isInitializing = false; // Prevent recursive initializePageFlip calls

const currentPage = computed(() => displayedPage.value);
const totalPages = computed(() => {
  // Add 1 to total pages if book has final_words
  const baseTotalPages = readerStore.totalPages;
  return readerStore.currentBook?.final_words ? baseTotalPages + 1 : baseTotalPages;
});

const canGoPrev = computed(() => {
  // In both modes, can go prev if we're past the first page
  return currentPage.value > 1;
});

const canGoNext = computed(() => {
  // In single-page mode: can go next if current page < total pages
  // In two-page mode: can go next if there's at least one more page after the current spread
  if (isInSinglePageMode.value) {
    return currentPage.value < totalPages.value;
  } else {
    // In two-page mode, currentPage is the left page of the spread
    // We need at least 2 more pages to show a full new spread
    // But we can still navigate if there's at least one more page
    return currentPage.value + 1 < totalPages.value;
  }
});

// Audio player state
const showingAudioControls = ref(false);
const audioControlsPosition = ref({ top: 0, left: 0 });
const activeAudioPageNumber = ref<number | null>(null); // Track which page's audio is active
const activeAudioId = ref<string | null>(null); // Track which specific audio ID is active
const audioControlsRef = ref<InstanceType<typeof AudioControls> | null>(null);
let hideAudioTimeout: number | null = null;

// Position tracking for audio controls
const hasManualPosition = ref(false); // Track if user has manually positioned the controls

// Audio URL (fetched from Directus)
const audioUrl = ref<string | null>(null);

// Cache for audio data: book_content_audio ID -> { audioFile, wordTiming }
interface WordTiming {
  text: string;
  start: number;
  end: number;
}
interface AudioData {
  audioFile: string;
  wordTiming: WordTiming[];
}
const audioDataCache = new Map<string, AudioData>();

// Current word timing data for active audio
const currentWordTiming = ref<WordTiming[]>([]);

// Fetch audio URL when active page changes
async function updateAudioUrl() {
  if (activeAudioPageNumber.value === null) {
    audioUrl.value = null;
    return;
  }

  const page = readerStore.pages.find(p => p.page_number === activeAudioPageNumber.value);
  if (!page) {
    audioUrl.value = null;
    return;
  }

  // Try old system first (sound_lix_* fields with MP3 files)
  let soundFile: string | null = null;
  switch (readerStore.settings.lixLevel) {
    case "easy":
      soundFile = (page as any).sound_lix_easy || null;
      break;
    case "medium":
      soundFile = (page as any).sound_lix_medium || null;
      break;
    case "hard":
      soundFile = (page as any).sound_lix_hard || null;
      break;
    default:
      soundFile = (page as any).sound_lix_medium || null;
  }

  if (soundFile) {
    audioUrl.value = readerStore.getImageUrl(soundFile);
    return;
  }

  // New system: Use activeAudioId directly (set when icon is clicked/hovered)
  if (activeAudioId.value) {
    const audioRecordId = activeAudioId.value;

    // Check cache first
    if (audioDataCache.has(audioRecordId)) {
      const cached = audioDataCache.get(audioRecordId)!;
      audioUrl.value = readerStore.getImageUrl(cached.audioFile);
      currentWordTiming.value = cached.wordTiming;
      return;
    }

    // Fetch from book_content_audio collection to get audio_file and word_timing
    try {
      const directusUrl = import.meta.env.PUBLIC_DIRECTUS_URL || "http://localhost:8055";
      const response = await fetch(
        `${directusUrl}/items/book_content_audio/${audioRecordId}?fields=audio_file,word_timing`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data?.audio_file) {
          // Cache the result
          const audioData: AudioData = {
            audioFile: data.data.audio_file,
            wordTiming: data.data.word_timing || []
          };
          audioDataCache.set(audioRecordId, audioData);
          audioUrl.value = readerStore.getImageUrl(data.data.audio_file);
          currentWordTiming.value = audioData.wordTiming;
          return;
        }
      }
    } catch (error) {
      console.error('Failed to fetch audio file:', error);
    }
  }

  audioUrl.value = null;
}

// Watch for active page number or audio ID changes to update audio URL
watch([() => activeAudioPageNumber.value, () => activeAudioId.value], () => {
  updateAudioUrl();
});

// Watch for LIX level changes to update audio URL and clear marker
watch(() => readerStore.settings.lixLevel, () => {
  // Clear reading marker when level changes (different text content)
  readerStore.clearReadingMarker();
  // Hide all markers
  if (bookContainer.value) {
    const allMarkers = bookContainer.value.querySelectorAll('.reading-marker');
    allMarkers.forEach(m => m.classList.remove('visible'));
  }

  if (activeAudioPageNumber.value !== null) {
    updateAudioUrl();
  }
});

// Audio control functions
function keepAudioControlsOpen() {
  if (hideAudioTimeout) {
    clearTimeout(hideAudioTimeout);
    hideAudioTimeout = null;
  }
}

function onAudioPlayingChange(playing: boolean) {
  if (activeAudioId.value === null) return;

  const audioIcons = document.querySelectorAll('.page-audio-icon');
  audioIcons.forEach((icon: Element) => {
    const iconAudioId = (icon as HTMLElement).dataset.audioId;
    if (iconAudioId === activeAudioId.value) {
      if (playing) {
        icon.classList.add('active');
      } else {
        icon.classList.remove('active');
      }
    } else {
      icon.classList.remove('active');
    }
  });
}

function showAudioControls(event?: Event) {
  if (hideAudioTimeout) {
    clearTimeout(hideAudioTimeout);
    hideAudioTimeout = null;
  }

  // Only calculate position when hovering the icon, not the controls
  if (event && event.target) {
    const target = event.target as HTMLElement;
    // Check if the target is the audio icon (not the controls)
    if (target.classList.contains('page-audio-icon') || target.closest('.page-audio-icon')) {
      const iconElement = target.classList.contains('page-audio-icon')
        ? target
        : target.closest('.page-audio-icon') as HTMLElement;

      if (iconElement) {
        // Set which page's audio to play based on the icon's data attribute
        const pageNumber = iconElement.dataset.pageNumber;
        const audioId = iconElement.dataset.audioId;
        const currentPageNumber = pageNumber ? parseInt(pageNumber, 10) : null;

        if (currentPageNumber !== null) {
          activeAudioPageNumber.value = currentPageNumber;
          activeAudioId.value = audioId || null;

          // Only reposition if user hasn't manually positioned the controls
          if (!hasManualPosition.value) {
            const iconRect = iconElement.getBoundingClientRect();
            // Position controls above the icon with 20px gap
            // Audio controls height is approximately 50px
            const audioControlsHeight = 50;
            const iconPosition = {
              top: iconRect.top - audioControlsHeight - 20,
              left: iconRect.right + 12, // Position to the right of icon with 12px gap
            };

            audioControlsPosition.value = iconPosition;
            // Mark as positioned so subsequent hovers don't move it
            hasManualPosition.value = true;
          }
        }
      }
    }
  }

  showingAudioControls.value = true;
}

function hideAudioControls() {
  // Auto-hide disabled - user must close manually via X button
  // Keeping function for API compatibility with mouseleave events
}

function closeAudioControls() {
  showingAudioControls.value = false;
  activeAudioPageNumber.value = null;
  activeAudioId.value = null;
  hasManualPosition.value = false; // Reset manual position so next hover positions at icon
  if (hideAudioTimeout) {
    clearTimeout(hideAudioTimeout);
    hideAudioTimeout = null;
  }
}

// Handle click on audio icon - show controls and start playback
function handleAudioIconClick(event: Event) {
  // First show the controls (this sets up activeAudioPageNumber)
  showAudioControls(event);

  // Start playback after a short delay to allow audioUrl to update
  nextTick(() => {
    if (audioControlsRef.value) {
      audioControlsRef.value.play();
    }
  });
}

// Handle click on paragraph/heading body - play whole-element audio
// when the click is not on a specific word
async function handleParagraphAudioClick(event: Event) {
  const target = event.target as HTMLElement;
  if (target.closest('.word-hover')) return;

  const element = event.currentTarget as HTMLElement;
  const audioIcon = element.querySelector('.page-audio-icon') as HTMLElement | null;
  if (!audioIcon) return;

  const pageNumber = audioIcon.dataset.pageNumber;
  const audioId = audioIcon.dataset.audioId;
  if (!pageNumber) return;

  activeAudioPageNumber.value = parseInt(pageNumber, 10);
  activeAudioId.value = audioId || null;

  if (!hasManualPosition.value) {
    const iconRect = audioIcon.getBoundingClientRect();
    const audioControlsHeight = 50;
    audioControlsPosition.value = {
      top: iconRect.top - audioControlsHeight - 20,
      left: iconRect.right + 12,
    };
    hasManualPosition.value = true;
  }

  showingAudioControls.value = true;

  if (hideAudioTimeout) {
    clearTimeout(hideAudioTimeout);
    hideAudioTimeout = null;
  }

  // Wait for audioUrl to resolve (and the <audio> element to mount)
  // before triggering playback, otherwise the first click is a no-op.
  await updateAudioUrl();
  await nextTick();
  audioControlsRef.value?.play();
}

// Toggle word reading setting
function toggleWordReading() {
  readerStore.settings.wordReadingEnabled = !readerStore.settings.wordReadingEnabled;
}

// Toggle word highlight setting
function toggleWordHighlight() {
  readerStore.settings.wordHighlightEnabled = !readerStore.settings.wordHighlightEnabled;
}

// Track current sentence boundaries to avoid re-highlighting
let currentSentenceBounds: { start: number; end: number } | null = null;

// Common abbreviations that end with periods but aren't sentence endings
const ABBREVIATIONS = new Set([
  // Danish
  'nr', 'bl.a', 'f.eks', 'fx', 'm.m', 'osv', 'dvs', 'ifh', 'mht', 'ca', 'evt', 'inkl', 'ekskl',
  'pga', 'ift', 'mfl', 'mv', 'el', 'lign', 'resp', 'jf', 'kl', 'tlf', 'adr', 'att',
  // English
  'mr', 'mrs', 'ms', 'dr', 'prof', 'inc', 'ltd', 'etc', 'vs', 'eg', 'ie', 'no', 'vol',
  // German
  'z.b', 'bzw', 'usw', 'evtl', 'ggf', 'inkl', 'exkl', 'ca', 'nr'
]);

// Check if a word ending with punctuation is actually a sentence ending
function isSentenceEnding(text: string): boolean {
  const trimmed = text.trim();

  // Must end with sentence-ending punctuation
  if (!/[.!?]$/.test(trimmed)) return false;

  // Check for abbreviations (word before the period)
  const withoutPunct = trimmed.replace(/[.!?]+$/, '').toLowerCase();

  // If it's a known abbreviation, it's not a sentence ending
  if (ABBREVIATIONS.has(withoutPunct)) return false;

  // Single letter followed by period is likely an abbreviation (e.g., "A.", "B.")
  if (withoutPunct.length === 1) return false;

  // Check for patterns like "nr." where it's clearly an abbreviation
  // Numbers followed by period are usually not sentence endings in context
  if (/^\d+$/.test(withoutPunct)) return false;

  return true;
}

// Handle word highlight events from AudioControls
function onWordHighlight(data: { word: string; index: number } | null) {
  if (!bookContainer.value) return;

  // Check highlight mode (default to 'word' if not set)
  const highlightMode = readerStore.settings.highlightMode || 'word';

  // If no word to highlight, clear everything
  if (!data) {
    const highlightedWords = bookContainer.value.querySelectorAll('.word-hover.word-highlight-active');
    highlightedWords.forEach((el) => {
      el.classList.remove('word-highlight-active');
    });
    currentSentenceBounds = null;
    return;
  }

  const { index } = data;

  // Collect word spans from EVERY element sharing the active audio ID
  // (a paragraph split across pages keeps the same data-audio on each fragment).
  const activeId = activeAudioId.value;
  if (!activeId) return;

  const audioElements = bookContainer.value.querySelectorAll(
    `[data-audio="${activeId}"]`
  );
  if (audioElements.length === 0) return;

  const wordSpansArray: HTMLElement[] = [];
  audioElements.forEach((el) => {
    el.querySelectorAll('.word-hover').forEach((span) => {
      wordSpansArray.push(span as HTMLElement);
    });
  });

  if (highlightMode === 'word') {
    // Word mode: remove old highlights and highlight the word at the exact index
    wordSpansArray.forEach((span) => {
      span.classList.remove('word-highlight-active');
    });

    if (index >= 0 && index < wordSpansArray.length) {
      wordSpansArray[index].classList.add('word-highlight-active');
    }
    currentSentenceBounds = null;
  } else {
    // Sentence mode: use index directly
    const matchingWordIndex = index;

    if (matchingWordIndex < 0 || matchingWordIndex >= wordSpansArray.length) return;

    // Find sentence boundaries
    let sentenceStart = 0;
    let sentenceEnd = wordSpansArray.length - 1;

    // Check if this is inside a heading - treat entire heading as one unit
    const parentElement = wordSpansArray[0]?.closest('p, h1, h2, h3');
    const isHeading = parentElement && /^h[1-3]$/i.test(parentElement.tagName);

    if (!isHeading) {
      // Find start of sentence (search backwards for sentence-ending punctuation)
      for (let i = matchingWordIndex - 1; i >= 0; i--) {
        const text = wordSpansArray[i].textContent || '';
        if (isSentenceEnding(text)) {
          sentenceStart = i + 1;
          break;
        }
      }

      // Find end of sentence (search forwards for sentence-ending punctuation)
      for (let i = matchingWordIndex; i < wordSpansArray.length; i++) {
        const text = wordSpansArray[i].textContent || '';
        if (isSentenceEnding(text)) {
          sentenceEnd = i;
          break;
        }
      }
    }

    // Check if we're still in the same sentence - if so, don't re-highlight
    if (currentSentenceBounds &&
        currentSentenceBounds.start === sentenceStart &&
        currentSentenceBounds.end === sentenceEnd) {
      return; // Same sentence, keep current highlights
    }

    // New sentence - remove old highlights and add new ones
    wordSpansArray.forEach((span) => {
      span.classList.remove('word-highlight-active');
    });

    // Highlight all words in the sentence
    for (let i = sentenceStart; i <= sentenceEnd; i++) {
      wordSpansArray[i].classList.add('word-highlight-active');
    }

    // Remember current sentence bounds
    currentSentenceBounds = { start: sentenceStart, end: sentenceEnd };
  }
}

// Handle word explanation click
function handleWordExplanationClick(event: Event, uuid: string) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const explanation = wordExplanations.getExplanation(uuid);
  if (explanation) {
    wordExplanations.showExplanation(uuid, explanation, rect);
  }
}

// Handle word click to play audio segment
async function handleWordClick(event: Event, audioRecordId: string, wordText: string) {
  // Check if word reading is enabled
  if (!readerStore.settings.wordReadingEnabled) return;

  const targetElement = event.target as HTMLElement;

  // Check highlight mode
  const highlightMode = readerStore.settings.highlightMode || 'word';

  if (highlightMode === 'word') {
    // Word mode: play individual word audio from word_audio collection
    await wordAudio.playWord(wordText);
    return;
  }

  // Sentence mode: needs full page audio + timing — set up audio controls
  const parentWithAudio = targetElement.closest('[data-audio]');
  if (!parentWithAudio) return;

  const audioIcon = parentWithAudio.querySelector('.page-audio-icon') as HTMLElement;
  if (audioIcon) {
    const pageNumber = audioIcon.dataset.pageNumber;
    const audioIdFromIcon = audioIcon.dataset.audioId;
    if (pageNumber) {
      activeAudioPageNumber.value = parseInt(pageNumber, 10);
      activeAudioId.value = audioIdFromIcon || audioRecordId;

      if (!hasManualPosition.value && !showingAudioControls.value) {
        const iconRect = audioIcon.getBoundingClientRect();
        const audioControlsHeight = 50;
        audioControlsPosition.value = {
          top: iconRect.top - audioControlsHeight - 20,
          left: iconRect.right + 12,
        };
      }

      showingAudioControls.value = true;

      if (hideAudioTimeout) {
        clearTimeout(hideAudioTimeout);
        hideAudioTimeout = null;
      }
    }
  }

  await updateAudioUrl();
  await nextTick();

  if (currentWordTiming.value.length === 0) return;

  {
    // Sentence mode: find all words in the sentence and play them all
    const contentParent = targetElement.closest('p, h1, h2, h3');
    if (!contentParent) return;

    // Get all word spans in this content element
    const wordSpans = contentParent.querySelectorAll('.word-hover');
    const wordSpansArray = Array.from(wordSpans);

    // Find the index of the clicked word
    const clickedIndex = wordSpansArray.indexOf(targetElement);
    if (clickedIndex === -1) return;

    // Find sentence boundaries
    let sentenceStart = 0;
    let sentenceEnd = wordSpansArray.length - 1;

    // Check if this is a heading - treat entire heading as one unit
    const isHeading = /^h[1-3]$/i.test(contentParent.tagName);

    if (!isHeading) {
      // Find start of sentence
      for (let i = clickedIndex - 1; i >= 0; i--) {
        const text = wordSpansArray[i].textContent || '';
        if (isSentenceEnding(text)) {
          sentenceStart = i + 1;
          break;
        }
      }

      // Find end of sentence
      for (let i = clickedIndex; i < wordSpansArray.length; i++) {
        const text = wordSpansArray[i].textContent || '';
        if (isSentenceEnding(text)) {
          sentenceEnd = i;
          break;
        }
      }
    }

    // Get words in the sentence
    const sentenceWords: string[] = [];
    for (let i = sentenceStart; i <= sentenceEnd; i++) {
      const wordText = wordSpansArray[i].textContent?.trim().toLowerCase() || '';
      if (wordText) {
        // Clean punctuation for matching
        const cleanWord = wordText.replace(/[.,!?;:'"]/g, '');
        if (cleanWord) sentenceWords.push(cleanWord);
      }
    }

    // Find timings for all words in sentence
    const sentenceTimings = sentenceWords
      .map(word => currentWordTiming.value.find(
        wt => wt.text.toLowerCase().replace(/[.,!?;:'"]/g, '') === word
      ))
      .filter(Boolean);

    if (sentenceTimings.length > 0 && audioControlsRef.value) {
      // Get start of first word and end of last word
      const startTime = sentenceTimings[0]!.start;
      const endTime = sentenceTimings[sentenceTimings.length - 1]!.end;
      audioControlsRef.value.playSegment(startTime, endTime);
    }
  }
}

// Watch for showingAudioControls and activeAudioId changes to update icon states
watch([() => showingAudioControls.value, () => activeAudioId.value], ([showing, activeId]) => {
  const audioIcons = document.querySelectorAll('.page-audio-icon');
  audioIcons.forEach((icon: Element) => {
    const iconAudioId = (icon as HTMLElement).dataset.audioId;
    if (iconAudioId === activeId && showing) {
      icon.classList.add('controls-visible');
    } else {
      icon.classList.remove('controls-visible');
      // Also remove active class when controls are hidden
      if (!showing) {
        icon.classList.remove('active');
      }
    }
  });
});

// Watch for settings changes - hide marker and highlight immediately when repagination starts
watch(
  () => [readerStore.settings.textSize, readerStore.settings.lineSpacing, readerStore.settings.font],
  () => {
    // Hide all markers immediately when visual settings change (before repagination)
    if (bookContainer.value) {
      const allMarkers = bookContainer.value.querySelectorAll('.reading-marker');
      allMarkers.forEach(m => m.classList.remove('visible'));
      // Also remove word highlight
      const highlightedWord = bookContainer.value.querySelector('.word-highlighted');
      if (highlightedWord) {
        highlightedWord.classList.remove('word-highlighted');
      }
    }
  }
);

// Watch for page changes - hide marker/highlight and restore if returning to bookmarked page
watch(() => displayedPage.value, async (newPage) => {
  if (!bookContainer.value) return;

  // Always hide all markers first on any page change
  const allMarkers = bookContainer.value.querySelectorAll('.reading-marker');
  allMarkers.forEach(m => m.classList.remove('visible'));

  // Check if we're on the bookmarked page (or spread in two-page mode)
  const bookmark = readerStore.readingMarker;
  if (bookmark && bookmark.wordId) {
    // In two-page mode, displayedPage is the left page, so also check right page
    const isOnLeftPage = bookmark.pageNumber === newPage;
    const isOnRightPage = !isInSinglePageMode.value && bookmark.pageNumber === newPage + 1;

    // Find the word element
    const wordSpan = bookContainer.value.querySelector(`[data-word-id="${bookmark.wordId}"]`) as HTMLElement;

    if (isOnLeftPage || isOnRightPage) {
      // Wait for DOM to be ready
      await nextTick();
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Show marker and highlight on bookmarked page
      if (wordSpan) {
        const page = wordSpan.closest('.page') as HTMLElement;
        if (page) {
          const marker = page.querySelector('.reading-marker') as HTMLElement;
          const pageInner = page.querySelector('.page-inner') as HTMLElement;
          if (marker && pageInner) {
            const innerRect = pageInner.getBoundingClientRect();
            const wordRect = wordSpan.getBoundingClientRect();

            const right = 20; // Center of 3rem padding
            const wordCenterY = wordRect.top + (wordRect.height / 2);
            const top = wordCenterY - innerRect.top - 4;

            marker.style.right = `${right}px`;
            marker.style.left = 'auto';
            marker.style.top = `${top}px`;
            marker.classList.add('visible');

            // Restore word highlight
            wordSpan.classList.add('word-highlighted');
          }
        }
      }
    } else {
      // Not on bookmarked page - remove highlight (marker already hidden)
      if (wordSpan) {
        wordSpan.classList.remove('word-highlighted');
      }
    }
  }
});

// Reposition marker at a word after repagination - called from initializePageFlip
async function repositionMarkerAtWord(wordId: string) {
  if (!bookContainer.value) return;

  // Find the word element by its word ID
  const wordSpan = bookContainer.value.querySelector(`[data-word-id="${wordId}"]`) as HTMLElement;
  if (!wordSpan) {
    console.log(`📍 Could not find word with ID: ${wordId}`);
    readerStore.pendingMarkerReposition = null;
    return;
  }

  // Find the page containing this word
  const page = wordSpan.closest('.page') as HTMLElement;
  if (!page) {
    readerStore.pendingMarkerReposition = null;
    return;
  }

  // Get the page number and navigate to it
  const pageNumber = parseInt(page.dataset.pageNumber || '1');

  // Update store with new page number and navigate
  readerStore.setReadingMarker(pageNumber, wordId);
  readerStore.goToPage(pageNumber);

  // Wait for page flip to complete
  await nextTick();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // Find the marker within this page
  const marker = page.querySelector('.reading-marker') as HTMLElement;
  const pageInner = page.querySelector('.page-inner') as HTMLElement;
  if (!marker || !pageInner) return;

  // Now position the marker
  const innerRect = pageInner.getBoundingClientRect();
  const wordRect = wordSpan.getBoundingClientRect();

  // Calculate position: right side of page, vertically centered with word
  const right = 20; // Center of 3rem padding
  const wordCenterY = wordRect.top + (wordRect.height / 2);
  const top = wordCenterY - innerRect.top - 4;

  // Position marker
  marker.style.right = `${right}px`;
  marker.style.left = 'auto';
  marker.style.top = `${top}px`;
  marker.classList.add('visible');

  // Also restore word highlight
  wordSpan.classList.add('word-highlighted');

  console.log(`📍 Repositioned marker at word: ${wordId} on page ${pageNumber}`);

  // Clear the flag
  readerStore.pendingMarkerReposition = null;
}

// Watch for pages array changes (both length and content)
// This triggers on:
// - Page count changes (reading level switch, repagination)
// - Content updates (text size/spacing changes that keep same page count)
let reinitTimeout: NodeJS.Timeout | null = null;
watch(() => readerStore.pages, (newPages, oldPages) => {
  const hadPages = oldPages && oldPages.length > 0;
  const hasPages = newPages && newPages.length > 0;

  if (hadPages && hasPages) {
    // Skip if already initializing (prevents recursive calls from updatePageDimensions)
    if (isInitializing) {
      console.log(`📖 Pages changed during initialization - skipping`);
      return;
    }

    // Hide immediately on first change (start of drag)
    if (!reinitTimeout) {
      isTransitioning.value = true;
      transitionStartTime = Date.now();
      console.log(`📖 Pages changing - hiding for rebuild`);
    }

    // Debounce the actual rebuild (wait for drag to finish)
    if (reinitTimeout) clearTimeout(reinitTimeout);

    reinitTimeout = setTimeout(() => {
      console.log(`📖 Pages updated (count: ${newPages.length}) - reinitializing PageFlip`);
      initializePageFlip();
      reinitTimeout = null;
    }, 100); // 100ms debounce
  } else if (!hadPages && hasPages) {
    // Initial load
    console.log(`📖 Initial pages loaded (count: ${newPages.length})`);
    initializePageFlip();
  }
}, { deep: true });

// Watch for transition completion to check images
// This ensures images are checked after pages are visible and layout is stable
let imageCheckTimeout: NodeJS.Timeout | null = null;
watch(() => isTransitioning.value, async (isTransitioning, wasTransitioning) => {
  if (wasTransitioning && !isTransitioning) {
    // Transition just completed - but there might be another rebuild coming
    // Debounce the image check to wait for all rebuilds to complete
    console.log('📸 Transition complete, scheduling image check...');

    if (imageCheckTimeout) clearTimeout(imageCheckTimeout);

    imageCheckTimeout = setTimeout(async () => {
      console.log('📸 Checking images after debounce...');
      await nextTick();
      // Wait longer for flex layout to stabilize
      await new Promise(resolve => setTimeout(resolve, 300));
      // Multiple animation frames to ensure layout is complete
      await new Promise(resolve => requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(resolve)
        )
      ));
      await checkAndRemoveOverflowingImages();
      updateAudioIconVisibility();
      imageCheckTimeout = null;
    }, 500); // Wait 500ms for any additional rebuilds
  }
});

// Create final page element
function createFinalPage(): HTMLDivElement | null {
  if (!readerStore.currentBook?.final_words) return null;

  const pageDiv = document.createElement("div");
  pageDiv.className = "page page-final";
  pageDiv.dataset.density = "hard";

  const innerDiv = document.createElement("div");
  innerDiv.className = "page-inner page-final-inner";

  const contentDiv = document.createElement("div");
  contentDiv.className = "page-final-content";
  contentDiv.innerHTML = readerStore.currentBook.final_words;
  innerDiv.appendChild(contentDiv);

  pageDiv.appendChild(innerDiv);
  return pageDiv;
}

// Create blank page for even page count in two-page mode
function createBlankPage(): HTMLDivElement {
  const pageDiv = document.createElement("div");
  pageDiv.className = "page page-blank";
  pageDiv.dataset.density = "hard";

  const innerDiv = document.createElement("div");
  innerDiv.className = "page-inner page-blank-inner";

  pageDiv.appendChild(innerDiv);
  return pageDiv;
}

// Initialize or reinitialize PageFlip
// This is the ONLY function that controls showing content (sets isTransitioning = false)
// Pass forceRepaginate=true when dimensions might not change but repagination is needed (e.g., fullscreen toggle)
async function initializePageFlip(forceRepaginate: boolean = false) {
  console.log('initializePageFlip called, bookContainer exists:', !!bookContainer.value, 'forceRepaginate:', forceRepaginate);

  if (!bookContainer.value) {
    console.error('No bookContainer available!');
    return;
  }

  // Prevent recursive calls
  if (isInitializing) {
    console.log('Already initializing - skipping');
    return;
  }
  isInitializing = true;

  // Reset global word counter for consistent IDs across repagination
  globalWordId = 0;

  try {
    // Save current page before recreating
    const currentPageToRestore = displayedPage.value;

    // DON'T destroy the existing instance - it removes the container from DOM!
    // Just let it be garbage collected and create a new one
    const hadPreviousInstance = !!pageFlipInstance;

    // Ensure content is hidden during rebuild
    if (!isTransitioning.value) {
      isTransitioning.value = true;
      transitionStartTime = Date.now();
    }

    // Wait for fade-out to complete before starting rebuild
    // Calculate remaining time based on when transition started
    const elapsed = Date.now() - transitionStartTime;
    const remainingFadeTime = Math.max(0, FADE_DURATION - elapsed);
    if (remainingFadeTime > 0) {
      console.log(`⏳ Waiting ${remainingFadeTime}ms for fade-out to complete`);
      await new Promise(resolve => setTimeout(resolve, remainingFadeTime));
    }

    pageFlipInstance = null;

    console.log('Creating new PageFlip instance (previous existed:', hadPreviousInstance, ')');

    // Clear container - remove any page elements and PageFlip wrapper elements
    console.log('Clearing container, current children:', bookContainer.value.children.length);
    while (bookContainer.value.firstChild) {
      bookContainer.value.removeChild(bookContainer.value.firstChild);
    }
    console.log('Container cleared, children now:', bookContainer.value.children.length);

    // Calculate container dimensions FIRST (before creating page elements)
    // Use the wrapper's dimensions (it has explicit size via CSS)
    const wrapper = bookContainer.value.parentElement;

    // Check if we're in narrow viewport (mobile mode)
    const isNarrowViewport = isMobileViewport();

    // In fullscreen OR narrow viewport mode, use full viewport dimensions
    // Otherwise use the wrapper's dimensions (not bookContainer which may be empty)
    const containerWidth = (props.fullscreen || isNarrowViewport)
      ? window.innerWidth
      : (wrapper?.clientWidth || window.innerWidth * 0.9);
    // On mobile, subtract footer height (60px)
    const containerHeight = (props.fullscreen || isNarrowViewport)
      ? window.innerHeight - (isNarrowViewport && !props.fullscreen ? 60 : 0)
      : (wrapper?.clientHeight || window.innerHeight * 0.75);

    // Calculate actual page width for pagination
    // Mobile uses full width, desktop uses half (two-page spread)
    const pageWidth = isNarrowViewport ? containerWidth : Math.floor(containerWidth / 2);
    const pageHeight = containerHeight;

    console.log('Initializing PageFlip with dimensions:', {
      containerWidth,
      containerHeight,
      pageWidth,
      pageHeight,
      fullscreen: props.fullscreen,
      isNarrowViewport,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      bookContainerClientWidth: bookContainer.value.clientWidth,
      bookContainerClientHeight: bookContainer.value.clientHeight
    });

    // Update page dimensions for dynamic pagination BEFORE creating elements
    // Pass actual page dimensions (not container dimensions)
    await readerStore.updatePageDimensionsDirect(pageWidth, pageHeight, forceRepaginate);

    // Now create page elements from the (potentially updated) pages
    console.log('Creating page elements, total pages:', readerStore.pages.length);
    let pagesCreated = 0;
    readerStore.pages.forEach((page) => {
      const pageElement = createPageElement(page);
      if (pageElement && bookContainer.value) {
        bookContainer.value.appendChild(pageElement);
        pagesCreated++;
      }
    });

    // Add final page if book has final_words
    const finalPage = createFinalPage();

    // In two-page mode, ensure even number of pages so final page is on the right
    if (!isNarrowViewport && finalPage) {
      // Count total pages including final
      const totalWithFinal = pagesCreated + 1;
      if (totalWithFinal % 2 !== 0) {
        // Add blank page before final to make it even
        const blankPage = createBlankPage();
        bookContainer.value.appendChild(blankPage);
        pagesCreated++;
        console.log('Added blank page to ensure even page count');
      }
    }

    if (finalPage && bookContainer.value) {
      bookContainer.value.appendChild(finalPage);
      pagesCreated++;
    }

    console.log('Page elements appended:', pagesCreated);
    console.log('Page elements in DOM:', bookContainer.value.querySelectorAll('.page').length);
    console.log('Container has children:', bookContainer.value.children.length);

    await nextTick();

    // Wait a bit for DOM and CSS to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('After wait, container children:', bookContainer.value.children.length);

    // Update dynamic configuration values
    // ALWAYS use viewport check to determine single vs two-page mode (consistent with fullscreen behavior)
    const useSinglePageMode = isMobileViewport();
    isInSinglePageMode.value = useSinglePageMode; // Update reactive state
    console.log('📱 Viewport width:', window.innerWidth, 'px → Mode:', useSinglePageMode ? 'SINGLE PAGE' : 'TWO PAGE SPREAD');

    pageFlipConfig.value.width = useSinglePageMode ? containerWidth : Math.floor(containerWidth / 2);
    pageFlipConfig.value.height = containerHeight;
    pageFlipConfig.value.usePortrait = useSinglePageMode;

    // Create config object for PageFlip initialization
    const config: any = { ...pageFlipConfig.value };

    // Adjust size constraints for fullscreen or single-page mode
    if (props.fullscreen || useSinglePageMode) {
      delete config.maxWidth;
      delete config.maxHeight;
      delete config.minHeight;
      // CRITICAL: Set minWidth to trigger portrait mode
      // PageFlip checks: blockWidth < minWidth * 2 to enable portrait mode
      // So we set minWidth to half the container width + 1 to ensure portrait mode activates
      config.minWidth = Math.ceil(containerWidth / 2) + 1;
    }

    // Use stretch mode in single-page mode for better fit
    if (useSinglePageMode) {
      config.size = "stretch";
    }

    console.log('🔧 PageFlip config:', {
      width: config.width,
      height: config.height,
      usePortrait: config.usePortrait,
      size: config.size,
      minWidth: config.minWidth,
      hasMinWidth: 'minWidth' in config
    });
    pageFlipInstance = new PageFlip(bookContainer.value, config);

    // Disable click-to-turn (keep drag-to-turn). PageFlip's userStop fires
    // flipController.flip() on mouseup when no movement happened — short-circuit
    // that path while preserving drag (isUserMove === true) and swipes.
    const pfInternal = pageFlipInstance as any;
    if (typeof pfInternal.userStop === "function") {
      const origUserStop = pfInternal.userStop.bind(pfInternal);
      pfInternal.userStop = function (point: any, isSwipe = false) {
        if (this.isUserTouch && !this.isUserMove) {
          this.isUserTouch = false;
          return;
        }
        return origUserStop(point, isSwipe);
      };
    }

    // Load pages into PageFlip
    const pageElements = bookContainer.value.querySelectorAll(".page");
    console.log('Loading pages into PageFlip:', pageElements.length);
    pageFlipInstance.loadFromHTML(pageElements);

    // Handle page flip events
    pageFlipInstance.on("flip", (e: any) => {
      const newPage = e.data + 1;
      console.log(`  📄 Flip event: index=${e.data}, newPage=${newPage}, mode=${isInSinglePageMode.value ? 'SINGLE' : 'TWO-PAGE'}`);
      displayedPage.value = newPage;

      // Only update store if it's not the final page
      // Final page index would be beyond the store's pages array
      if (newPage <= readerStore.totalPages) {
        readerStore.goToPage(newPage);
      }
    });

    // Turn to the correct page after initialization
    await nextTick();
    console.log('Turning to page:', displayedPage.value);
    if (displayedPage.value > 1) {
      pageFlipInstance.turnToPage(displayedPage.value - 1);
    }

    console.log('PageFlip initialization complete');

    // Wait for browser to complete layout after all pages are added
    // Use minimal delay - pages are already in DOM at this point
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Show content - rebuild is complete
    console.log('✅ Rebuild complete - showing content');
    isTransitioning.value = false;
    // Note: Image checking now happens via isTransitioning watcher

    // Check if there's a pending marker reposition after settings change
    const pendingWordId = readerStore.pendingMarkerReposition;
    if (pendingWordId) {
      // Wait a bit for the page flip to settle, then reposition marker
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));
      await repositionMarkerAtWord(pendingWordId);
    }
  } catch (error) {
    console.error("Failed to initialize PageFlip:", error);
    // Restore visibility even on error
    isTransitioning.value = false;
  } finally {
    isInitializing = false;
  }
}

// Initialize reading marker on a page - sets it to first text element
function initializeReadingMarker(pageNumber: number) {
  if (!bookContainer.value) return;

  const pages = bookContainer.value.querySelectorAll('.page');
  if (!pages) return;

  // Find the page element by data-page-number attribute
  let targetPage: HTMLElement | null = null;

  pages.forEach((page) => {
    const pageEl = page as HTMLElement;
    if (parseInt(pageEl.dataset.pageNumber || '0') === pageNumber) {
      targetPage = pageEl;
    }
  });

  if (!targetPage) return;

  // Find first h1 or p element in page-content
  const contentDiv = (targetPage as HTMLElement).querySelector('.page-content');
  if (!contentDiv) return;

  const textElements = contentDiv.querySelectorAll('h1, p');
  if (textElements.length === 0) return;

  const firstElement = textElements[0] as HTMLElement;
  positionMarkerAtElement(targetPage, firstElement, pageNumber);
}

// Position the marker at a specific element (used for hover on h1/p)
function positionMarkerAtElement(page: HTMLElement, element: HTMLElement, pageNumber: number) {
  if (!bookContainer.value) return;

  // Find the marker within this page
  const marker = page.querySelector('.reading-marker') as HTMLElement;
  if (!marker) return;

  // Get the page-inner element for relative positioning
  const pageInner = page.querySelector('.page-inner') as HTMLElement;
  if (!pageInner) return;

  // Get positions relative to the page-inner
  const innerRect = pageInner.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  // Calculate position relative to page-inner (right side of page)
  const right = 20; // Center of 3rem padding // 8px from right edge
  const top = elementRect.top - innerRect.top + 8; // Align with top of text, slight offset

  // Position marker
  marker.style.right = `${right}px`;
  marker.style.left = 'auto';
  marker.style.top = `${top}px`;
  marker.classList.add('visible');

  // Update store (no specific word, so no audio ID for persistence)
  readerStore.setReadingMarker(pageNumber, null);
}

// Position reading marker at a clicked word - vertically centered with the word
// Toggle behavior: click same word again to remove marker and highlight
function positionReadingMarkerAtWord(wordSpan: HTMLElement) {
  if (!bookContainer.value) return;

  // Get the unique word ID
  const wordId = wordSpan.getAttribute('data-word-id');

  // Find the page containing this word
  const page = wordSpan.closest('.page') as HTMLElement;
  if (!page) return;

  // Find the marker within this page
  const marker = page.querySelector('.reading-marker') as HTMLElement;
  if (!marker) return;

  // Check if clicking on the same word that's already marked (toggle off)
  const currentMarker = readerStore.readingMarker;
  if (currentMarker && currentMarker.wordId === wordId) {
    // Remove highlight from word
    wordSpan.classList.remove('word-highlighted');
    // Hide marker
    marker.classList.remove('visible');
    // Clear marker in store
    readerStore.clearReadingMarker();
    return;
  }

  // Remove highlight from previously highlighted word (if any)
  if (currentMarker && currentMarker.wordId) {
    const prevWord = bookContainer.value.querySelector(`[data-word-id="${currentMarker.wordId}"]`);
    if (prevWord) {
      prevWord.classList.remove('word-highlighted');
    }
    // Hide all markers on other pages
    const allMarkers = bookContainer.value.querySelectorAll('.reading-marker');
    allMarkers.forEach(m => m.classList.remove('visible'));
  }

  // Add highlight to clicked word
  wordSpan.classList.add('word-highlighted');

  // Get the page-inner element for relative positioning
  const pageInner = page.querySelector('.page-inner') as HTMLElement;
  if (!pageInner) return;

  // Get positions relative to the page-inner
  const innerRect = pageInner.getBoundingClientRect();
  const wordRect = wordSpan.getBoundingClientRect();

  // Calculate position: right side of page, vertically centered with word
  const right = 20; // Center of 3rem padding // 8px from right edge
  const wordCenterY = wordRect.top + (wordRect.height / 2);
  const top = wordCenterY - innerRect.top - 4; // -4 to center the 8px marker

  // Position marker
  marker.style.right = `${right}px`;
  marker.style.left = 'auto';
  marker.style.top = `${top}px`;
  marker.classList.add('visible');

  // Get page number for store
  const pageNumber = parseInt(page.dataset.pageNumber || '1');

  // Save to store
  readerStore.setReadingMarker(pageNumber, wordId);
}

// Add hover listeners to h1/p elements on all pages
function addReadingMarkerListeners() {
  const pages = bookContainer.value?.querySelectorAll('.page');
  if (!pages) return;

  pages.forEach((page) => {
    const pageEl = page as HTMLElement;
    const contentDiv = pageEl.querySelector('.page-content');
    if (!contentDiv) return;

    // Get page number from data attribute
    const pageNumber = parseInt(pageEl.dataset.pageNumber || '1');

    const textElements = contentDiv.querySelectorAll('h1, p');
    textElements.forEach((element) => {
      element.addEventListener('mouseenter', () => {
        positionMarkerAtElement(pageEl, element as HTMLElement, pageNumber);
      });
    });
  });
}

// Initialize on mount
onMounted(async () => {
  if (!bookContainer.value) return;

  // Handle window resize - register early to ensure it's always active
  window.addEventListener("resize", handleResize);

  // Initialize displayed page from store
  displayedPage.value = readerStore.currentPageNumber;

  // Load saved audio controls position as default, but don't mark as manual
  // so first hover will position at icon
  const savedPosition = localStorage.getItem('audioControlsPosition');
  if (savedPosition) {
    try {
      audioControlsPosition.value = JSON.parse(savedPosition);
      // Don't set hasManualPosition here - first hover should position at icon
    } catch (e) {
      // Invalid saved position, will use default icon-based positioning
    }
  }

  // If pages are empty, trigger dimension update which will generate pages
  // The pages watcher will then call initializePageFlip() after pagination completes
  if (readerStore.pages.length === 0) {
    console.log('📏 No pages yet, calculating dimensions to trigger pagination...');
    const wrapper = bookContainer.value.parentElement;
    const isNarrowViewport = isMobileViewport();

    const containerWidth = (props.fullscreen || isNarrowViewport)
      ? window.innerWidth
      : (wrapper?.clientWidth || window.innerWidth * 0.9);
    // On mobile, subtract footer height (60px)
    const containerHeight = (props.fullscreen || isNarrowViewport)
      ? window.innerHeight - (isNarrowViewport && !props.fullscreen ? 60 : 0)
      : (wrapper?.clientHeight || window.innerHeight * 0.75);

    // Calculate actual page width for pagination
    const pageWidth = isNarrowViewport ? containerWidth : Math.floor(containerWidth / 2);
    const pageHeight = containerHeight;

    console.log(`📐 Initial page dimensions: ${pageWidth}x${pageHeight} (container: ${containerWidth}x${containerHeight})`);
    await readerStore.updatePageDimensionsDirect(pageWidth, pageHeight);
    // Pages watcher will call initializePageFlip() after pagination completes
    return;
  }

  await initializePageFlip();
  // Note: isTransitioning is set to false by initializePageFlip via changeState event
});

// Add audio icons to elements with data-audio attributes
function addAudioIconsToElements(contentDiv: HTMLElement, pageNumber: number) {
  // Find all elements with data-audio attribute (h1, h2, h3, p)
  const elementsWithAudio = contentDiv.querySelectorAll('h1[data-audio], h2[data-audio], h3[data-audio], p[data-audio]');

  elementsWithAudio.forEach((element) => {
    const audioId = element.getAttribute('data-audio');

    // Create audio icon container
    const audioIconDiv = document.createElement("div");
    audioIconDiv.className = "page-audio-icon";
    audioIconDiv.dataset.pageNumber = pageNumber.toString();
    if (audioId) {
      audioIconDiv.dataset.audioId = audioId;
    }
    audioIconDiv.title = t('reader.audio.available');

    // Add SVG icon
    audioIconDiv.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    // Add hover events to show/hide audio controls
    audioIconDiv.addEventListener('mouseenter', showAudioControls);
    audioIconDiv.addEventListener('mouseleave', hideAudioControls);

    // Add click event to start playback
    audioIconDiv.addEventListener('click', handleAudioIconClick);

    // Make element position relative so icon can be positioned absolutely within it
    (element as HTMLElement).style.position = 'relative';

    // Insert icon at the beginning of the element (left side in padding)
    element.insertBefore(audioIconDiv, element.firstChild);

    // Click anywhere in the paragraph/heading (off-word) plays its audio
    (element as HTMLElement).addEventListener('click', handleParagraphAudioClick);
  });
}

// Create a page element
function createPageElement(page: BookPage): HTMLDivElement {
  const pageDiv = document.createElement("div");
  pageDiv.className = "page";
  pageDiv.dataset.density = "hard";
  pageDiv.dataset.pageNumber = page.page_number.toString(); // Store page number for marker positioning

  // Get content based on current LIX level
  const content = getContentForPage(page);

  // Inner page structure with template class
  const innerDiv = document.createElement("div");
  // Add template class based on image position
  let templateClass = "template-full-text";
  if (page.image) {
    if (page.image_position === "fill_page") {
      templateClass = "template-full-image";
    } else if (page.image_position === "page_top") {
      templateClass = "template-image-page_top";
    } else if (page.image_position === "page_bottom") {
      templateClass = "template-image-page_bottom";
    }
  }
  innerDiv.className = `page-inner ${templateClass}`;
  console.log(`🎨 Creating page ${page.page_number} with template: ${templateClass}`);

  // Track image elements for potential removal
  let topImageDiv: HTMLDivElement | null = null;
  let bottomImageDiv: HTMLDivElement | null = null;

  // Handle images
  if (page.image) {
    const imageDiv = document.createElement("div");
    imageDiv.className = `page-image page-image-${page.image_position || "page_top"}`;
    imageDiv.dataset.removable = "true"; // Mark as removable if content overflows

    const img = document.createElement("img");
    img.src = readerStore.getImageUrl(page.image);
    img.alt = t('reader.page.illustration', { page: page.page_number });
    imageDiv.appendChild(img);

    if (page.image_position === "page_top") {
      topImageDiv = imageDiv;
      innerDiv.appendChild(imageDiv);
    } else if (page.image_position === "fill_page") {
      // Fill page images are never removed
      innerDiv.appendChild(imageDiv);
      pageDiv.appendChild(innerDiv);
      return pageDiv;
    }
  }

  // Content
  if (!page.image || page.image_position !== "fill_page") {
    const contentDiv = document.createElement("div");
    contentDiv.className = "page-content";
    contentDiv.innerHTML = content;

    // Wrap words in spans for hover effects
    wrapWordsInSpans(contentDiv);

    // Add audio icons next to each element with data-audio
    addAudioIconsToElements(contentDiv, page.page_number);

    innerDiv.appendChild(contentDiv);
  }

  // Image at bottom
  if (page.image && page.image_position === "page_bottom") {
    const imageDiv = document.createElement("div");
    imageDiv.className = "page-image page-image-page_bottom";
    imageDiv.dataset.removable = "true";

    const img = document.createElement("img");
    img.src = readerStore.getImageUrl(page.image);
    img.alt = t('reader.page.illustration', { page: page.page_number });
    imageDiv.appendChild(img);

    bottomImageDiv = imageDiv;
    innerDiv.appendChild(imageDiv);
  }

  // Page number
  const pageNumberDiv = document.createElement("div");
  pageNumberDiv.className = "page-number";
  // Add special class if there's a bottom image
  if (page.image && (page.image_position === "page_bottom" || page.image_position === "fill_page")) {
    pageNumberDiv.classList.add("page-number-on-image");
  }
  pageNumberDiv.textContent = page.page_number.toString();
  innerDiv.appendChild(pageNumberDiv);

  // Reading marker for this page
  const markerDiv = document.createElement("div");
  markerDiv.className = "reading-marker";
  innerDiv.appendChild(markerDiv);

  // Audio icons are now added per-element via addAudioIconsToElements() above

  pageDiv.appendChild(innerDiv);

  // Store reference to image divs for overflow checking
  (pageDiv as any).__imageRefs = { topImageDiv, bottomImageDiv };

  return pageDiv;
}

// Get content for a page based on current LIX level
function getContentForPage(page: BookPage): string {
  switch (readerStore.settings.lixLevel) {
    case "easy":
      return page.content_lix_easy || "";
    case "medium":
      return page.content_lix_medium || "";
    case "hard":
      return page.content_lix_hard || "";
    default:
      return page.content_lix_medium || "";
  }
}

// Check if current LIX level has audio for a page
function hasAudioForCurrentLevel(page: BookPage): boolean {
  // Check for new dynamic pagination system (data-audio attributes)
  if (page.hasAudio) {
    return true;
  }

  // Check for old system (sound_lix_* MP3 files)
  switch (readerStore.settings.lixLevel) {
    case "easy":
      return !!page.sound_lix_easy;
    case "medium":
      return !!page.sound_lix_medium;
    case "hard":
      return !!page.sound_lix_hard;
    default:
      return !!page.sound_lix_medium;
  }
}

// Wrap each word in a span for hover effects (helps with dyslexia)
function wrapWordsInSpans(element: HTMLElement) {
  // Pre-process single-word [data-word] elements: convert them directly to word-hover spans
  // This avoids double-wrapping (outer data-word span + inner word-hover span)
  const wordElements = element.querySelectorAll<HTMLElement>('[data-word]');
  wordElements.forEach((el) => {
    const text = el.textContent?.trim() || '';
    // Single word (no spaces) — convert element itself into a word-hover span
    if (text && !text.includes(' ')) {
      const uuid = el.getAttribute('data-word')!;
      el.classList.add('word-hover', 'word-explainable');
      el.setAttribute('data-word-id', `w${globalWordId++}`);

      // Check if also inside an audio element
      const audioParent = el.closest('[data-audio]');
      const audioRecordId = audioParent?.getAttribute('data-audio') || null;
      if (audioRecordId) {
        el.classList.add('word-audio');
        el.addEventListener('click', (event) => {
          handleWordClick(event, audioRecordId, text);
        });
      }

      el.addEventListener('click', (event) => {
        handleWordExplanationClick(event, uuid);
      });
      el.addEventListener('mouseenter', () => {
        handleSentenceHover(el, true);
      });
      el.addEventListener('mouseleave', () => {
        handleSentenceHover(el, false);
      });
      el.addEventListener('click', () => {
        positionReadingMarkerAtWord(el);
      });
      el.addEventListener('mousedown', (event) => {
        event.stopPropagation();
      });
    }
  });

  // Get all text nodes
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  // Process each text node
  textNodes.forEach((textNode) => {
    const text = textNode.textContent || '';
    if (!text.trim()) return; // Skip whitespace-only nodes

    // Don't process if parent is already a word-hover span
    if (textNode.parentElement?.classList.contains('word-hover')) return;

    // Check if this text node is inside an element with data-audio
    const audioParent = textNode.parentElement?.closest('[data-audio]');
    const audioRecordId = audioParent?.getAttribute('data-audio') || null;

    // Check if this text node is inside an element with data-word (word explanation)
    const wordParent = textNode.parentElement?.closest('[data-word]');
    const wordExplanationId = wordParent?.getAttribute('data-word') || null;

    // Split text into words and spaces
    const parts = text.split(/(\s+)/);
    const fragment = document.createDocumentFragment();

    parts.forEach((part) => {
      if (part.match(/\s+/)) {
        // Keep whitespace as text nodes
        fragment.appendChild(document.createTextNode(part));
      } else if (part.trim()) {
        // Punctuation-only tokens aren't real words — keep them as text so
        // they don't shift word_timing indices used for highlighting/audio.
        if (!/[\p{L}\p{N}]/u.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }
        // Wrap words in spans
        const span = document.createElement('span');
        span.className = 'word-hover';
        span.textContent = part;

        // Add unique word ID for bookmark tracking
        span.setAttribute('data-word-id', `w${globalWordId++}`);

        // Add audio click handler if inside an audio element
        if (audioRecordId) {
          span.classList.add('word-audio');
          span.addEventListener('click', (event) => {
            handleWordClick(event, audioRecordId, part);
          });
        }

        // Add word explanation click handler if inside a data-word element
        if (wordExplanationId) {
          span.setAttribute('data-word', wordExplanationId);
          span.classList.add('word-explainable');
          span.addEventListener('click', (event) => {
            handleWordExplanationClick(event, wordExplanationId);
          });
        }

        // Add sentence hover handlers
        span.addEventListener('mouseenter', () => {
          handleSentenceHover(span, true);
        });
        span.addEventListener('mouseleave', () => {
          handleSentenceHover(span, false);
        });

        // Add click handler to show reading marker at this word
        span.addEventListener('click', () => {
          positionReadingMarkerAtWord(span);
        });

        // Prevent page flip when clicking/dragging on words
        span.addEventListener('mousedown', (event) => {
          event.stopPropagation();
        });

        fragment.appendChild(span);
      }
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}

// Handle sentence highlighting on hover
function handleSentenceHover(wordSpan: HTMLElement, isEntering: boolean) {
  // Only apply sentence hover in sentence mode
  const highlightMode = readerStore.settings.highlightMode || 'word';
  if (highlightMode !== 'sentence') return;

  // Find the parent content element (p, h1, etc.)
  const contentParent = wordSpan.closest('p, h1, h2, h3');
  if (!contentParent) return;

  // Get all word spans in this content element
  const wordSpans = contentParent.querySelectorAll('.word-hover');
  const wordSpansArray = Array.from(wordSpans);

  if (!isEntering) {
    // Mouse left - remove sentence hover highlights
    wordSpansArray.forEach((span) => {
      span.classList.remove('sentence-hover-active');
    });
    return;
  }

  // Find the index of the hovered word
  const hoveredIndex = wordSpansArray.indexOf(wordSpan);
  if (hoveredIndex === -1) return;

  // Find sentence boundaries
  let sentenceStart = 0;
  let sentenceEnd = wordSpansArray.length - 1;

  // Headings (h1, h2, h3) are treated as single units - highlight entire heading
  const isHeading = /^h[1-3]$/i.test(contentParent.tagName);

  if (!isHeading) {
    // Find start of sentence (search backwards for sentence-ending punctuation)
    for (let i = hoveredIndex - 1; i >= 0; i--) {
      const text = wordSpansArray[i].textContent || '';
      if (isSentenceEnding(text)) {
        sentenceStart = i + 1;
        break;
      }
    }

    // Find end of sentence (search forwards for sentence-ending punctuation)
    for (let i = hoveredIndex; i < wordSpansArray.length; i++) {
      const text = wordSpansArray[i].textContent || '';
      if (isSentenceEnding(text)) {
        sentenceEnd = i;
        break;
      }
    }
  }

  // Remove old hover highlights and add new ones
  wordSpansArray.forEach((span) => {
    span.classList.remove('sentence-hover-active');
  });

  // Highlight all words in the sentence
  for (let i = sentenceStart; i <= sentenceEnd; i++) {
    wordSpansArray[i].classList.add('sentence-hover-active');
  }
}

// Check if images are too small (< 10% of page height) and hide/show them
async function checkAndRemoveOverflowingImages() {
  if (!bookContainer.value) return;

  const pages = bookContainer.value.querySelectorAll('.page');

  // Collect all images that need to be checked
  const imagesToWaitFor: HTMLImageElement[] = [];
  pages.forEach((pageElement) => {
    const imageRefs = (pageElement as any).__imageRefs;
    if (!imageRefs) return;

    if (imageRefs.topImageDiv) {
      const img = imageRefs.topImageDiv.querySelector('img');
      if (img) imagesToWaitFor.push(img);
    }
    if (imageRefs.bottomImageDiv) {
      const img = imageRefs.bottomImageDiv.querySelector('img');
      if (img) imagesToWaitFor.push(img);
    }
  });

  console.log(`⏳ Waiting for ${imagesToWaitFor.length} images to load...`);

  // Wait for all images to load before measuring
  await Promise.all(
    imagesToWaitFor.map((img, index) => {
      if (img.complete) {
        console.log(`✅ Image ${index} already loaded (complete=true)`);
        return Promise.resolve();
      }
      console.log(`⏳ Waiting for image ${index} to load (complete=false)...`);
      return new Promise((resolve) => {
        img.addEventListener('load', () => {
          console.log(`✅ Image ${index} loaded via event`);
          resolve(null);
        }, { once: true });
        img.addEventListener('error', () => {
          console.log(`❌ Image ${index} failed to load`);
          resolve(null);
        }, { once: true });
        // Timeout fallback in case load events don't fire
        setTimeout(() => {
          console.log(`⏱️ Image ${index} timed out after 500ms`);
          resolve(null);
        }, 500);
      });
    })
  );

  console.log(`✅ All images ready, now measuring...`);

  // Wait for browser to recalculate layout after images load
  // Use requestAnimationFrame twice to ensure layout is complete
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // TEMPORARY FIX: Just show all images without measuring
  // The measurement logic was failing due to flex layout timing issues
  console.log(`✅ Ensuring all images are visible (measurement disabled)...`);

  pages.forEach((pageElement) => {
    const pageDiv = pageElement as HTMLElement;

    // Find all image divs and make sure they're visible
    const topImageDiv = pageDiv.querySelector('.page-image-page_top') as HTMLElement | null;
    const bottomImageDiv = pageDiv.querySelector('.page-image-page_bottom') as HTMLElement | null;
    const fillImageDiv = pageDiv.querySelector('.page-image-fill_page') as HTMLElement | null;

    if (topImageDiv) {
      topImageDiv.style.display = 'flex';
      console.log(`Page ${pageElement.querySelector('.page-number')?.textContent} top image shown`);
    }

    if (bottomImageDiv) {
      bottomImageDiv.style.display = 'flex';
      console.log(`Page ${pageElement.querySelector('.page-number')?.textContent} bottom image shown`);
    }

    if (fillImageDiv) {
      fillImageDiv.style.display = 'flex';
      console.log(`Page ${pageElement.querySelector('.page-number')?.textContent} full-page image shown`);
    }
  });
}

// Update audio icon visibility based on current LIX level
function updateAudioIconVisibility() {
  if (!bookContainer.value) return;

  const pages = bookContainer.value.querySelectorAll('.page');
  pages.forEach((pageElement, index) => {
    const page = readerStore.pages[index];
    if (!page) return;

    const audioIcon = pageElement.querySelector('.page-audio-icon') as HTMLElement;
    if (!audioIcon) return;

    // Show/hide icon based on whether current LIX level has audio
    const hasAudio = hasAudioForCurrentLevel(page);
    audioIcon.style.display = hasAudio ? '' : 'none';
  });

  // Close audio controls if currently active page has no audio for new level
  if (activeAudioPageNumber.value !== null) {
    const activePage = readerStore.pages.find(p => p.page_number === activeAudioPageNumber.value);
    if (activePage && !hasAudioForCurrentLevel(activePage)) {
      closeAudioControls();
    }
  }
}

// Update page content without destroying PageFlip
function updatePageContent() {
  console.log('updatePageContent called - swapping LIX content');
  if (!bookContainer.value) {
    console.warn('No book container, cannot update content');
    return;
  }

  const pages = bookContainer.value.querySelectorAll('.page');
  console.log(`Updating content for ${pages.length} pages`);

  pages.forEach((pageElement, index) => {
    const page = readerStore.pages[index];
    if (!page) return;

    const contentDiv = pageElement.querySelector('.page-content') as HTMLElement;
    if (!contentDiv) return;

    // Get the new content based on current LIX level
    const newContent = getContentForPage(page);

    // Just swap the innerHTML - no DOM recreation needed!
    contentDiv.innerHTML = newContent;

    // Re-wrap words in spans for hover effects
    wrapWordsInSpans(contentDiv);
  });

  console.log('Content updated for all pages');

  // Check if images need to be removed/restored due to content size change
  setTimeout(async () => {
    await checkAndRemoveOverflowingImages();
    updatePageNumberStyles();
    updateAudioIconVisibility();
  }, 100);
}

// Update page number styles based on image visibility
function updatePageNumberStyles() {
  if (!bookContainer.value) return;

  const pages = bookContainer.value.querySelectorAll('.page');
  pages.forEach((pageElement, index) => {
    const page = readerStore.pages[index];
    if (!page) return;

    const pageNumberDiv = pageElement.querySelector('.page-number') as HTMLElement;
    if (!pageNumberDiv) return;

    const imageRefs = (pageElement as any).__imageRefs;

    // Check if there's a visible bottom image or fill_page image
    const hasVisibleBottomImage =
      (page.image_position === 'fill_page') ||
      (page.image_position === 'page_bottom' && imageRefs?.bottomImageDiv &&
       imageRefs.bottomImageDiv.style.display !== 'none');

    // Update page number class based on visible images
    if (hasVisibleBottomImage) {
      pageNumberDiv.classList.add('page-number-on-image');
    } else {
      pageNumberDiv.classList.remove('page-number-on-image');
    }
  });
}

// Navigation functions
function nextPage() {
  if (!pageFlipInstance) {
    console.warn('No pageFlipInstance');
    return;
  }
  if (!canGoNext.value) {
    console.warn('Cannot go next - already at end');
    return;
  }

  const currentIndex = pageFlipInstance.getCurrentPageIndex();
  const mode = isInSinglePageMode.value ? 'SINGLE' : 'TWO-PAGE';
  const increment = isInSinglePageMode.value ? 1 : 2;
  const targetIndex = currentIndex + increment;

  console.log(`📖 Next: mode=${mode}, currentIndex=${currentIndex}, currentPage=${currentPage.value} → targetIndex=${targetIndex}`);

  // Always use turnToPage with explicit index - flipNext/flipPrev are unreliable
  pageFlipInstance.turnToPage(targetIndex);
  console.log(`  ✓ turnToPage(${targetIndex}) called`);
}

function prevPage() {
  if (!pageFlipInstance) {
    console.warn('No pageFlipInstance');
    return;
  }
  if (!canGoPrev.value) {
    console.warn('Cannot go prev - already at start');
    return;
  }

  const currentIndex = pageFlipInstance.getCurrentPageIndex();
  const mode = isInSinglePageMode.value ? 'SINGLE' : 'TWO-PAGE';
  const decrement = isInSinglePageMode.value ? 1 : 2;
  const targetIndex = currentIndex - decrement;

  console.log(`📖 Prev: mode=${mode}, currentIndex=${currentIndex}, currentPage=${currentPage.value} → targetIndex=${targetIndex}`);

  // Always use turnToPage with explicit index - flipNext/flipPrev are unreliable
  pageFlipInstance.turnToPage(targetIndex);
  console.log(`  ✓ turnToPage(${targetIndex}) called`);
}

// Watch for LIX level changes - swap text content and reset audio
watch(
  () => readerStore.settings.lixLevel,
  (newLevel, oldLevel) => {
    if (!pageFlipInstance) return;

    console.log('LIX level changed:', oldLevel, '->', newLevel);
    updatePageContent();

    // Audio will reset automatically when audioUrl changes (handled by AudioControls component)
  }
);

// Prefetch word explanations for surrounding pages
function prefetchWordExplanations() {
  const pageNum = readerStore.currentPageNumber;
  if (!readerStore.pages.length) return;
  const range = [pageNum - 1, pageNum, pageNum + 1, pageNum + 2]
    .filter(n => n >= 1 && n <= readerStore.totalPages);
  wordExplanations.prefetchForPages(range).then(() => {
    if (bookContainer.value) {
      wordExplanations.applyExplanationVisibility(bookContainer.value);
    }
  });
}

// Trigger prefetch on page change and when pages become available
watch(() => readerStore.currentPageNumber, prefetchWordExplanations);
watch(() => readerStore.pages.length, prefetchWordExplanations);

// Watch for visual settings changes - these don't require re-rendering, just CSS updates
watch(
  () => [
    readerStore.settings.textSize,
    readerStore.settings.lineSpacing,
    readerStore.settings.font,
    readerStore.settings.backgroundColor
  ],
  () => {
    console.log('Visual settings changed, CSS will update automatically');
    // No need to re-render, CSS variables handle these changes
  }
);

// Watch for page changes from store
watch(() => readerStore.currentPageNumber, (newPage) => {
  displayedPage.value = newPage;
  if (pageFlipInstance) {
    const currentFlipPage = pageFlipInstance.getCurrentPageIndex();
    if (currentFlipPage !== newPage - 1) {
      pageFlipInstance.turnToPage(newPage - 1);
    }
  }
});

// Watch for fullscreen changes and trigger resize
watch(() => props.fullscreen, async (newVal) => {
  console.log('Fullscreen changed to:', newVal);

  // Step 1: Start fade out
  isTransitioning.value = true;
  transitionStartTime = Date.now();

  // Step 2: Wait for fade-out to complete BEFORE repositioning
  await new Promise(resolve => setTimeout(resolve, FADE_DURATION));

  // Step 3: Now reposition (container is invisible)
  isFullscreenActive.value = newVal;

  // Step 4: Wait for CSS and DOM to update with new dimensions
  await nextTick();

  // Re-apply settings to ensure CSS variables are current before measuring
  readerStore.applySettings();

  // Wait for fonts to be ready (important for text measurement)
  await document.fonts.ready;

  // Wait longer for browser to fully apply fullscreen layout and CSS variables
  // This ensures all elements have their true dimensions before measuring
  await new Promise(resolve => setTimeout(resolve, 300));

  // Multiple animation frames to ensure layout is complete
  await new Promise(resolve => requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      requestAnimationFrame(resolve)
    )
  ));

  // Step 5: Reinitialize PageFlip with new dimensions
  // Force repagination since fullscreen changes dimensions significantly
  if (bookContainer.value) {
    console.log('Reinitializing for fullscreen change');
    await initializePageFlip(true); // Force repagination
  } else {
    console.warn('Cannot reinitialize - bookContainer missing');
    isTransitioning.value = false;
  }
});

// Handle window resize with debounce
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
let resizeStartTimeout: ReturnType<typeof setTimeout> | null = null;

function handleResize() {
  const newWidth = window.innerWidth;
  const willUseSinglePage = isMobileViewport();
  console.log('🔄 Window resized:', newWidth, 'px →', willUseSinglePage ? 'SINGLE PAGE MODE' : 'TWO PAGE SPREAD');

  // Clear any existing timeouts
  if (resizeStartTimeout) {
    clearTimeout(resizeStartTimeout);
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }

  // Start fade out after a short delay (user is actively resizing)
  resizeStartTimeout = setTimeout(() => {
    isTransitioning.value = true;
    transitionStartTime = Date.now();
  }, 100);

  // Reinitialize after user stops resizing
  // initializePageFlip will show content when done
  resizeTimeout = setTimeout(async () => {
    if (bookContainer.value) {
      console.log('♻️ Reinitializing PageFlip...');
      await initializePageFlip();
    }
  }, 300);
}

// Cleanup
onUnmounted(() => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  if (resizeStartTimeout) {
    clearTimeout(resizeStartTimeout);
  }
  if (pageFlipInstance) {
    pageFlipInstance.destroy();
  }
  if (hideAudioTimeout) {
    clearTimeout(hideAudioTimeout);
  }

  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.two-page-spread {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, #f5f5f5, #e0e0e0);
  position: relative;
  overflow: hidden;
}

.two-page-spread.fullscreen {
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
}

.book-container-wrapper {
  width: min(90vw, 1200px);
  height: min(75vh, 800px);
  margin: 0 auto;
  position: relative;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.book-container-wrapper.is-transitioning {
  opacity: 0;
}

.book-container-wrapper.fullscreen {
  width: 100vw;
  height: 100vh;
  margin: 0;
}

.book-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* Ensure PageFlip wrapper is visible */
.book-container :deep(.stf__wrapper) {
  width: 100% !important;
  height: 100% !important;
}

.two-page-spread.fullscreen .book-container :deep(.stf__wrapper) {
  width: 100vw !important;
  height: 100vh !important;
}

/* Page styles (will be applied to dynamically created pages) */
.book-container :deep(.page) {
  background: var(--bg);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.book-container :deep(.page-inner) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--font-reader);
  line-height: var(--line-spacing);
  letter-spacing: var(--letter-spacing);
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
}

.book-container :deep(.page-content) {
  /* Default: flexible content that fills available space */
  flex: 1 1 auto;
  padding: 2.5rem 3rem;
  font-size: calc(1.1rem * var(--text-size-multiplier, 1));
  color: var(--text);
  position: relative;
  letter-spacing: var(--letter-spacing);
  word-spacing: var(--word-spacing);
  box-sizing: border-box;
  overflow: hidden;
  /* Disable text selection */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Extra top padding in fullscreen to make room for controls */
.two-page-spread.fullscreen .book-container :deep(.page-content) {
  padding: 4.5rem 3rem;
}

/* Word hover effect for better reading focus
   All states share the same 2px border — only color and style change, never width.
   This prevents any layout shift between states. */
.book-container :deep(.word-hover) {
  display: inline;
  cursor: pointer;
  transition: border-bottom-color 0.15s ease, background-color 0.15s ease;
  border-bottom: 2px solid transparent;
  padding-bottom: 2px;
}

.book-container :deep(.word-hover:hover) {
  border-bottom-color: var(--primary);
  background-color: rgba(15, 42, 145, 0.08);
  border-radius: 2px;
}

/* Word explanation - dotted underline with text color, primary on hover */
.book-container :deep(.word-hover.word-explainable) {
  border-bottom-style: dotted;
  border-bottom-color: var(--text);
}

.book-container :deep(.word-hover.word-explainable:hover) {
  border-bottom-style: dotted;
  border-bottom-color: var(--primary);
  background-color: rgba(15, 42, 145, 0.08);
}

/* Active word highlight during audio playback — solid primary, no width change */
.book-container :deep(.word-hover.word-highlight-active) {
  border-bottom-color: var(--primary);
  border-bottom-style: solid;
  background-color: rgba(15, 42, 145, 0.15);
  border-radius: 2px;
}

/* Sentence hover highlight (when sentence mode is active) */
.book-container :deep(.word-hover.sentence-hover-active) {
  border-bottom-color: var(--primary);
  background-color: rgba(15, 42, 145, 0.08);
  border-radius: 2px;
}


.book-container :deep(.page-content p) {
  margin-bottom: 1rem;
}

/* Preserve inline formatting in content */
.book-container :deep(.page-content em),
.book-container :deep(.page-content i) {
  font-style: italic;
}

.book-container :deep(.page-content strong),
.book-container :deep(.page-content b) {
  font-weight: 700;
}

.book-container :deep(.page-content h1) {
  font-size: calc(1.8rem * var(--text-size-multiplier, 1));
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  line-height: 1.3;
  font-weight: 600;
}

.book-container :deep(.page-content h2) {
  font-size: calc(1.5rem * var(--text-size-multiplier, 1));
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  line-height: 1.3;
  font-weight: 600;
}

.book-container :deep(.page-content h3) {
  font-size: calc(1.25rem * var(--text-size-multiplier, 1));
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  line-height: 1.3;
  font-weight: 600;
}

/* Remove top margin from first element in page-content */
.book-container :deep(.page-content h1:first-child),
.book-container :deep(.page-content h2:first-child),
.book-container :deep(.page-content h3:first-child),
.book-container :deep(.page-content p:first-child) {
  margin-top: 0 !important;
}

/* Remove bottom margin from last element in page-content */
.book-container :deep(.page-content h1:last-child),
.book-container :deep(.page-content h2:last-child),
.book-container :deep(.page-content h3:last-child),
.book-container :deep(.page-content p:last-child) {
  margin-bottom: 0 !important;
}

/* Audio icons for elements with data-audio attribute */
.book-container :deep(.page-content h1[data-audio]),
.book-container :deep(.page-content h2[data-audio]),
.book-container :deep(.page-content h3[data-audio]),
.book-container :deep(.page-content p[data-audio]) {
  position: relative;
}

/* Audio icons are now added dynamically via addAudioIconsToElements() */

/* Template-based image positioning */
/* Images are flex items that share space with page-content */

.book-container :deep(.page-image) {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.book-container :deep(.page-image img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Full-text template: no images, content fills everything */
.book-container :deep(.template-full-text .page-content) {
  flex: 1 1 auto;
}

/* Image at top template: image first (with order: -1), then content */
.book-container :deep(.template-image-page_top .page-image) {
  order: -1;
  flex: 1 1 auto; /* Grows/shrinks to fill remaining space */
  min-height: 40%; /* Minimum height */
}

.book-container :deep(.template-image-page_top .page-content) {
  flex: 0 0 auto; /* Fixed size, doesn't grow or shrink */
  min-height: 0; /* Allow content to shrink, image fills remaining space */
  order: 0;
}

/* Image at bottom template: content first, then image */
.book-container :deep(.template-image-page_bottom .page-content) {
  flex: 0 0 auto; /* Fixed size, doesn't grow or shrink */
  min-height: 0; /* Allow content to shrink, image fills remaining space */
  order: 0;
}

.book-container :deep(.template-image-page_bottom .page-image) {
  order: 1;
  flex: 1 1 auto; /* Grows/shrinks to fill remaining space */
  min-height: 40%; /* Minimum height */
}

/* Full-image template: image fills entire page */
.book-container :deep(.template-full-image .page-image) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  flex: none;
}

.book-container :deep(.template-full-image .page-image img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-container :deep(.page-number) {
  position: absolute;
  bottom: 0.5rem;
  left: 0;
  right: 0;
  text-align: center;
  font-size: calc(0.75rem * var(--text-size-multiplier, 1));
  color: var(--text);
  font-family: var(--font-system);
  z-index: 10;
  pointer-events: none;
}

.book-container :deep(.page-number-on-image) {
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* Final page styling - centered content */
.book-container :deep(.page-final-inner) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.book-container :deep(.page-final-content) {
  text-align: center;
  font-size: calc(1.2rem * var(--text-size-multiplier, 1));
  color: var(--text);
  max-width: 80%;
}

.book-container :deep(.page-final-content p) {
  margin: 0;
  line-height: var(--line-spacing);
}

/* Blank page for even page count in two-page mode */
.book-container :deep(.page-blank-inner) {
  /* Inherits background from page-inner */
}

/* Mobile Footer Controls */
.mobile-footer-controls {
  display: none; /* Hidden on desktop, shown on mobile via media query */
}

/* Desktop Navigation Controls */
.book-controls {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2rem;
  background: white;
  padding: 1rem;
  border-radius: 50px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

/* Fade transition for control switching */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.btn-nav {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.15s;
}

.btn-nav:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: scale(1.05);
}

.btn-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-nav svg {
  width: 24px;
  height: 24px;
  stroke-width: 2;
}

.page-indicator {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text);
  min-width: 120px;
  text-align: center;
}

/* Mobile styles - single page view (matches MOBILE_BREAKPOINT = 800px in JS) */
@media (max-width: 800px) {
  .book-container-wrapper {
    width: 100vw;
    height: calc(100vh - 60px); /* Account for footer height */
    margin: 0;
  }

  .book-container {
    width: 100%;
    height: 100%;
  }

  /* Hide desktop controls on mobile */
  .book-controls {
    display: none;
  }

  /* Show mobile footer on mobile */
  .mobile-footer-controls {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: white;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    z-index: 1000;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  }

  .footer-left-buttons,
  .footer-right-buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .footer-back-button,
  .footer-feedback-button,
  .footer-settings-button,
  .footer-chapters-button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--bg-alt, #f5f5f5);
    color: var(--text);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    text-decoration: none;
    flex-shrink: 0;
  }

  .footer-back-button:hover,
  .footer-back-button:active,
  .footer-feedback-button:hover,
  .footer-feedback-button:active,
  .footer-settings-button:hover,
  .footer-settings-button:active,
  .footer-chapters-button:hover,
  .footer-chapters-button:active {
    background: var(--bg-hover, #e5e5e5);
  }

  .footer-back-button svg,
  .footer-feedback-button svg,
  .footer-settings-button svg,
  .footer-chapters-button svg {
    stroke-width: 2;
  }

  .footer-page-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    justify-content: center;
    max-width: 240px;
  }

  .btn-nav-footer {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.15s;
    flex-shrink: 0;
  }

  .btn-nav-footer:active:not(:disabled) {
    background: var(--primary-hover);
    transform: scale(0.95);
  }

  .btn-nav-footer:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-nav-footer svg {
    width: 18px;
    height: 18px;
    stroke-width: 2.5;
  }

  .footer-page-nav .page-indicator {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text);
    min-width: 80px;
    text-align: center;
  }

  .book-container :deep(.page-inner) {
    overflow: visible; /* Allow audio icon to be clickable outside content */
  }

  .book-container :deep(.page-content) {
    padding: 2.5rem;
    padding-bottom: 2rem;
  }

  .book-container :deep(.page-number) {
    bottom: 5rem; /* Move up to avoid navigation controls and padding */
    margin-bottom: 0.5rem; /* Extra space before footer */
  }
}

/* Page audio icon - hidden but kept in DOM as positioning anchor */
.book-container :deep(.page-audio-icon) {
  position: absolute;
  top: 0;
  left: -40px;
  width: 32px;
  height: 32px;
  visibility: hidden;
  pointer-events: none;
  z-index: 10;
}

/* Click anywhere in a paragraph/heading with audio to play it */
.book-container :deep(p[data-audio]),
.book-container :deep(h1[data-audio]),
.book-container :deep(h2[data-audio]),
.book-container :deep(h3[data-audio]) {
  cursor: pointer;
}

.book-container :deep(.page-audio-icon:hover),
.book-container :deep(.page-audio-icon.controls-visible) {
  transform: scale(1.1);
  box-shadow: 0 3px 10px rgba(15, 42, 145, 0.3);
  background: rgba(255, 255, 255, 1);
  border-color: rgb(15, 42, 145);
}

.book-container :deep(.page-audio-icon svg) {
  width: 18px;
  height: 18px;
  color: var(--primary);
  transition: color 0.15s;
}

.book-container :deep(.page-audio-icon:hover svg),
.book-container :deep(.page-audio-icon.controls-visible svg) {
  color: rgb(15, 42, 145);
}

/* Active state when audio is playing */
.book-container :deep(.page-audio-icon.active) {
  background: var(--primary);
  box-shadow: 0 3px 10px rgba(15, 42, 145, 0.3);
}

.book-container :deep(.page-audio-icon.active svg) {
  color: white;
}

/* Mobile adjustments for page audio icon */
@media (max-width: 800px) {
  .book-container :deep(.page-audio-icon) {
    left: -32px;
    top: 0.4rem;
    width: 28px;
    height: 28px;
  }

  .book-container :deep(.page-audio-icon svg) {
    width: 16px;
    height: 16px;
  }
}

</style>

<!-- Non-scoped styles for per-page reading marker -->
<style>
/* Reading position marker - dot showing current reading position on each page */
.reading-marker {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: var(--primary, #10b981);
  border-radius: 50%;
  opacity: 0; /* Hidden by default */
  transition: right 0.2s ease, top 0.2s ease, opacity 0.2s ease;
  pointer-events: none;
  z-index: 10; /* Above page content */
}

.reading-marker.visible {
  opacity: 0.7;
}

/* Word highlighted state - persists when clicked to set reading marker */
.word-highlighted {
  background-color: rgba(15, 42, 145, 0.3) !important;
  border-radius: 2px;
}
</style>
