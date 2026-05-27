<template>
  <div class="reader-view">
    <!-- Loading state -->
    <div v-if="readerStore.isLoading" class="loading-screen">
      <div class="loading-spinner"></div>
      <p v-html="$t('reader.loading')"></p>
    </div>

    <!-- Error state -->
    <div v-else-if="readerStore.error" class="error-screen">
      <div class="error-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 7L15 13M15 7L9 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 v-html="$t('reader.error.loading_book')"></h2>
      <p>{{ readerStore.error }}</p>
      <a :href="homeUrl" class="btn" v-html="$t('reader.nav.back_home')"></a>
    </div>

    <!-- Reader content -->
    <div v-else-if="readerStore.currentBook" class="reader-content">
      <!-- Settings Panel (floating on desktop, fullscreen on mobile) -->
      <SettingsPanel
        @fullscreenChange="onFullscreenChange"
        :isFullscreen="isFullscreen"
        :show="showSettings"
        @close="showSettings = false"
        :showChapters="showChapters"
        @closeChapters="showChapters = false"
      />

      <!-- Back button (hidden on mobile < 800px, shown in footer instead) -->
      <a v-if="!isFullscreen" :href="backToBookUrl" class="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span v-html="$t('reader.nav.back_to_book')"></span>
      </a>

      <!-- Book Title (hidden on mobile < 800px to create fullscreen-like experience) -->
      <div v-if="!isFullscreen" class="book-title">
        <h1>{{ readerStore.currentBook.title }}</h1>
        <p v-if="readerStore.currentBook.author_id || readerStore.currentBook.author" class="author-name">
          <span v-html="$t('common.by')"></span> {{ (readerStore.currentBook.author_id || readerStore.currentBook.author)?.name }}
        </p>
      </div>

      <!-- Two-Page Spread (handles both single-page and two-page modes internally) -->
      <!-- Key forces remount when content version changes (LIX switch) -->
      <TwoPageSpread
        :key="readerStore.contentVersion"
        :fullscreen="isFullscreen"
        :bookPath="props.bookPath"
        @toggleSettings="toggleSettings"
        @toggleChapters="toggleChapters"
        @toggleFeedback="toggleFeedback"
      />

      <!-- Feedback Button -->
      <FeedbackButton ref="feedbackButtonRef" :isFullscreen="isFullscreen" />
    </div>

    <!-- Empty state (no book loaded) -->
    <div v-else class="empty-state">
      <p v-html="$t('reader.error.no_book_selected')"></p>
      <a href="/" class="btn" v-html="$t('reader.nav.browse_books')"></a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useReaderStore, type LixLevel } from "../stores/reader";
import TwoPageSpread from "../components/TwoPageSpread.vue";
import SettingsPanel from "../components/SettingsPanel.vue";
import FeedbackButton from "../components/FeedbackButton.vue";
import { useReaderHints } from "../composables/useReaderHints";
import { warmupAudio } from "../composables/useWordAudio";
import { DEFAULT_LANGUAGE } from "../i18n";

const isFullscreen = ref(false);
const showSettings = ref(false);
const showChapters = ref(false);
const feedbackButtonRef = ref<InstanceType<typeof FeedbackButton> | null>(null);

interface Props {
  lang?: string;
  bookPath?: string;
  level?: string;
  pageNumber?: number;
}

const props = defineProps<Props>();
const route = useRoute();
const router = useRouter();
const readerStore = useReaderStore();
const hints = useReaderHints();

// Compute the back to book URL with proper language path
const backToBookUrl = computed(() => {
  const lang = props.lang || DEFAULT_LANGUAGE;
  // Map language to URL path (en -> books, da -> boeger, de -> bucher)
  const booksPath = lang === 'da' ? 'boeger' : lang === 'de' ? 'bucher' : 'books';
  return `/${lang}/${booksPath}/${props.bookPath}`;
});

// Compute the home URL - go to root to let Astro handle routing
const homeUrl = computed(() => {
  return '/';
});

function onFullscreenChange(value: boolean) {
  isFullscreen.value = value;
}

function toggleSettings() {
  showSettings.value = !showSettings.value;
}

function toggleChapters() {
  showChapters.value = !showChapters.value;
}

function toggleFeedback() {
  feedbackButtonRef.value?.open();
}

// Load book on mount
onMounted(async () => {
  console.log("ReaderView mounted");
  console.log("Props:", props);
  console.log("Route params:", route.params);
  console.log("Route path:", route.path);

  // Prime the OS audio output device on the user's first interaction with
  // the reader. The autoplay policy requires we wait for a gesture, but as
  // soon as we get one we play a silent sound so the device is fully warm
  // by the time the first real word click happens — no clipped onset.
  const onFirstInteraction = () => {
    warmupAudio();
    document.removeEventListener("pointerdown", onFirstInteraction);
    document.removeEventListener("keydown", onFirstInteraction);
  };
  document.addEventListener("pointerdown", onFirstInteraction, { once: false });
  document.addEventListener("keydown", onFirstInteraction, { once: false });

  // Reset onboarding hint visit so the next un-dismissed step is shown for this book load
  hints.resetVisit();

  // Initialize store (loads settings from localStorage)
  readerStore.initialize();

  let bookPathToLoad = props.bookPath;

  // If no bookPath prop, try to get from query params (legacy support)
  if (!bookPathToLoad && route.query.book) {
    bookPathToLoad = route.query.book as string;
  }

  console.log("Book path to load:", bookPathToLoad);

  // Determine initial level from URL (if valid)
  const initialLevel = props.level && ['basic', 'easy', 'medium', 'difficult', 'hard'].includes(props.level)
    ? props.level as LixLevel
    : undefined;

  if (bookPathToLoad) {
    try {
      // Pass the URL level directly to loadBook to ensure it's used
      // This prevents race conditions between updateSettings and loadBook
      await readerStore.loadBook(bookPathToLoad, initialLevel);

      // If a page number was provided, navigate to that page
      if (props.pageNumber && props.pageNumber > 0) {
        readerStore.goToPage(props.pageNumber);
      }
    } catch (error) {
      console.error("Failed to load book:", error);
    }
  } else {
    // No book path provided, redirect to home
    console.warn("No book path provided");
    router.push("/");
  }
});

// Watch for page number changes in the URL and sync with store
watch(
  () => props.pageNumber,
  (newPageNumber) => {
    if (newPageNumber && newPageNumber > 0 && readerStore.currentBook) {
      readerStore.goToPage(newPageNumber);
    }
  }
);

// Reset onboarding hint visit when switching to a different book
watch(
  () => props.bookPath,
  () => hints.resetVisit()
);

// Sync URL when page or level changes in store
watch(
  [() => readerStore.currentPageNumber, () => readerStore.settings.lixLevel],
  ([newPage, newLevel]) => {
    if (readerStore.currentBook && props.bookPath) {
      const lang = props.lang || DEFAULT_LANGUAGE;
      const newPath = `/${lang}/${props.bookPath}/level/${newLevel}/page/${newPage}`;
      if (route.path !== newPath) {
        router.replace(newPath);
      }
    }
  }
);
</script>

<style scoped>
.reader-view {
  width: 100%;
  min-height: 100vh;
  position: relative;
}

/* Loading Screen */
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--bg-alt);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-screen p {
  color: var(--text-light);
  font-size: 1rem;
}

/* Error Screen */
.error-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.error-icon {
  color: var(--text-light);
  margin-bottom: 0.5rem;
}

.error-screen h2 {
  font-size: 1.5rem;
  color: var(--text);
  margin: 0;
}

.error-screen p {
  color: var(--text-light);
  max-width: 500px;
  margin: 0;
}

/* Reader Content */
.reader-content {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

/* Back Button */
.back-button {
  position: fixed;
  top: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px; /* Dyslexia-friendly minimum touch target */
  padding: 0.625rem 1rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  color: var(--text);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
  z-index: 900;
}

.back-button:hover {
  background: var(--bg-alt);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.back-button svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

/* Book Title */
.book-title {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 900;
  max-width: 500px;
}

.book-title h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.author-name {
  font-size: 0.875rem;
  color: var(--text-light);
  margin: 0.25rem 0 0 0;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}

.empty-state p {
  color: var(--text-light);
  font-size: 1rem;
}

/* Button */
.btn {
  display: inline-block;
  min-height: 44px; /* Dyslexia-friendly minimum touch target */
  padding: 0.4rem 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
}

.btn:hover {
  background: var(--primary-hover);
}

/* Mobile Optimizations - under 800px: Fullscreen-like experience */
@media (max-width: 800px) {
  /* Reader content takes full viewport on mobile */
  .reader-content {
    padding: 0;
  }

  /* Hide back button on mobile for fullscreen-like experience */
  .back-button {
    display: none;
  }

  /* Hide title on mobile for fullscreen-like experience */
  .book-title {
    display: none;
  }
}
</style>
