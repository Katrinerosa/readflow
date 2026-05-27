<template>
  <div ref="settingsPanelRef" class="settings-panel" :class="{ open: isOpen || show || showChapters, 'in-fullscreen': props.isFullscreen, 'mobile-fullscreen': show, 'mobile-fullscreen-chapters': showChapters }">
    <!-- Fullscreen Toggle Button (only on desktop) -->
    <button
      v-if="!show"
      class="fullscreen-toggle"
      :class="{ active: isFullscreen }"
      @click="toggleFullscreen"
      :aria-label="$t('reader.fullscreen.toggle')"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 9L21 3M21 3H15M21 3V9M9 9L3 3M3 3L3 9M3 3L9 3M9 15L3 21M3 21H9M3 21L3 15M15 15L21 21M21 21V15M21 21H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Fullscreen Hint -->
    <transition name="hint">
      <div
        v-if="showFullscreenHint"
        class="tour-hint fullscreen-hint"
        :class="{ 'no-chapters': chapters.length === 0 }"
        @click.stop="hints.advance('fullscreen')"
      >
        <span v-html="$t('reader.hint.fullscreen')"></span>
        <div class="hint-arrow"></div>
      </div>
    </transition>

    <!-- Chapter Navigation Toggle Button (only on desktop) -->
    <button
      v-if="!show && chapters.length > 0"
      class="chapter-nav-toggle"
      :class="{ active: isChapterNavOpen }"
      @click.stop="toggleChapterNav"
      :aria-label="$t('reader.chapters.toggle')"
    >
      <svg v-if="!isChapterNavOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <!-- Chapters Hint -->
    <transition name="hint">
      <div
        v-if="showChaptersHint"
        class="tour-hint chapters-hint"
        @click.stop="hints.advance('chapters')"
      >
        <span v-html="$t('reader.hint.chapters')"></span>
        <div class="hint-arrow"></div>
      </div>
    </transition>

    <!-- Settings Toggle Button (only on desktop, hidden on mobile footer controls) -->
    <button v-if="!show" class="settings-toggle" @click.stop="togglePanel" :aria-label="$t('reader.settings.toggle')">
      <svg v-if="!isOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 8L15 8M15 8C15 9.65686 16.3431 11 18 11C19.6569 11 21 9.65685 21 8C21 6.34315 19.6569 5 18 5C16.3431 5 15 6.34315 15 8ZM9 16L21 16M9 16C9 17.6569 7.65685 19 6 19C4.34315 19 3 17.6569 3 16C3 14.3431 4.34315 13 6 13C7.65685 13 9 14.3431 9 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <!-- Settings Hint -->
    <transition name="hint">
      <div
        v-if="showSettingsHint"
        class="tour-hint settings-hint"
        @click.stop="hints.advance('settings')"
      >
        <span v-html="$t('reader.hint.settings')"></span>
        <div class="hint-arrow"></div>
      </div>
    </transition>

    <transition name="slide">
      <div v-if="isOpen || show" class="settings-content">
        <!-- Fixed header for mobile -->
        <div v-if="show" class="mobile-settings-header">
          <h2 class="settings-title" v-html="$t('reader.settings.title')"></h2>
          <button class="mobile-close-button" @click="emit('close')" :aria-label="$t('reader.settings.close')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" stroke-width="2"></line>
              <line x1="6" y1="6" x2="18" y2="18" stroke-width="2"></line>
            </svg>
          </button>
        </div>

        <!-- Settings body wrapper -->
        <div class="settings-body" :class="{ 'with-header': show }">
          <h2 v-if="!show" class="settings-title" v-html="$t('reader.settings.title')"></h2>

          <!-- LIX Level -->
          <div class="setting-group">
            <label class="setting-label" v-html="$t('reader.settings.reading_level')"></label>
            <div class="button-group button-group-levels">
              <button
                v-if="isLevelAvailable('easy')"
                :class="{ active: readerStore.settings.lixLevel === 'easy' }"
                @click="updateLixLevel('easy')"
                class="btn-option"
                v-html="$t('reader.settings.level.easy')"
              >
              </button>
              <button
                v-if="isLevelAvailable('medium')"
                :class="{ active: readerStore.settings.lixLevel === 'medium' }"
                @click="updateLixLevel('medium')"
                class="btn-option"
                v-html="$t('reader.settings.level.medium')"
              >
              </button>
              <button
                v-if="isLevelAvailable('hard')"
                :class="{ active: readerStore.settings.lixLevel === 'hard' }"
                @click="updateLixLevel('hard')"
                class="btn-option"
                v-html="$t('reader.settings.level.advanced')"
              >
              </button>
            </div>
          </div>

          <!-- Font Selection -->
          <div class="setting-group">
            <label class="setting-label" v-html="$t('reader.settings.font')"></label>
            <div class="button-group">
              <button
                :class="{ active: readerStore.settings.font === 'atkinson' }"
                @click="updateFont('atkinson')"
                class="btn-option"
                v-html="$t('reader.settings.font.atkinson')"
              >
              </button>
              <button
                :class="{ active: readerStore.settings.font === 'opendyslexic' }"
                @click="updateFont('opendyslexic')"
                class="btn-option"
                v-html="$t('reader.settings.font.opendyslexic')"
              >
              </button>
              <button
                :class="{ active: readerStore.settings.font === 'serif' }"
                @click="updateFont('serif')"
                class="btn-option"
                v-html="$t('reader.settings.font.serif')"
              >
              </button>
            </div>
          </div>

          <!-- Text Size -->
          <div class="setting-group">
            <label class="setting-label">
              <span v-html="$t('reader.settings.text_size')"></span>: {{ Math.round(readerStore.settings.textSize * 100) }}%
            </label>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              :value="readerStore.settings.textSize"
              @input="updateTextSize"
              class="slider"
            />
          </div>

          <!-- Line Spacing -->
          <div class="setting-group">
            <label class="setting-label">
              <span v-html="$t('reader.settings.line_spacing')"></span>: {{ readerStore.settings.lineSpacing.toFixed(1) }}
            </label>
            <input
              type="range"
              min="1.4"
              max="2.5"
              step="0.1"
              :value="readerStore.settings.lineSpacing"
              @input="updateLineSpacing"
              class="slider"
            />
          </div>

          <!-- Background Color -->
          <div class="setting-group">
            <label class="setting-label" v-html="$t('reader.settings.background')"></label>
            <div class="button-group">
              <button
                :class="{ active: readerStore.settings.backgroundColor === 'white' }"
                @click="updateBackgroundColor('white')"
                class="btn-option"
                v-html="$t('reader.settings.background.white')"
              >
              </button>
              <button
                :class="{ active: readerStore.settings.backgroundColor === 'cream' }"
                @click="updateBackgroundColor('cream')"
                class="btn-option"
                v-html="$t('reader.settings.background.cream')"
              >
              </button>
            </div>
          </div>

          <!-- Highlight Mode -->
          <div class="setting-group">
            <label class="setting-label" v-html="$t('reader.settings.highlight_mode')"></label>
            <div class="button-group">
              <button
                :class="{ active: readerStore.settings.highlightMode === 'word' }"
                @click="updateHighlightMode('word')"
                class="btn-option"
                v-html="$t('reader.settings.highlight_mode.word')"
              >
              </button>
              <button
                :class="{ active: readerStore.settings.highlightMode === 'sentence' }"
                @click="updateHighlightMode('sentence')"
                class="btn-option"
                v-html="$t('reader.settings.highlight_mode.sentence')"
              >
              </button>
            </div>
          </div>

          <!-- Reset Button -->
          <div class="setting-group">
            <button @click="resetSettings" class="btn-reset" v-html="$t('reader.settings.reset')"></button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Chapter Navigation Panel -->
    <transition name="slide">
      <div v-if="isChapterNavOpen" class="settings-content chapter-content">
        <h2 class="settings-title" v-html="$t('reader.chapters.title')"></h2>
        <div class="chapter-list">
          <button
            v-for="chapter in chapters"
            :key="chapter.index"
            class="chapter-item"
            @click="goToChapter(chapter.pageNumber)"
          >
            <span class="chapter-name" v-html="chapter.text"></span>
            <span class="chapter-page">{{ chapter.pageNumber }}</span>
          </button>
        </div>
      </div>
    </transition>

    <!-- Mobile Chapters Fullscreen Panel -->
    <transition name="slide">
      <div v-if="showChapters" class="settings-content mobile-chapters-content">
        <!-- Fixed header for mobile chapters -->
        <div class="mobile-settings-header">
          <h2 class="settings-title" v-html="$t('reader.chapters.title')"></h2>
          <button class="mobile-close-button" @click="emit('closeChapters')" :aria-label="$t('reader.settings.close')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" stroke-width="2"></line>
              <line x1="6" y1="6" x2="18" y2="18" stroke-width="2"></line>
            </svg>
          </button>
        </div>

        <!-- Chapters body wrapper -->
        <div class="settings-body with-header">
          <div class="chapter-list">
            <button
              v-for="chapter in chapters"
              :key="chapter.index"
              class="chapter-item"
              @click="goToChapterMobile(chapter.pageNumber)"
            >
              <span class="chapter-name" v-html="chapter.text"></span>
              <span class="chapter-page">{{ chapter.pageNumber }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useReaderStore } from "../stores/reader";
import type { LixLevel, FontChoice, BackgroundColor, HighlightMode } from "../stores/reader";
import { useReaderHints } from "../composables/useReaderHints";

interface Props {
  isFullscreen?: boolean;
  show?: boolean;
  showChapters?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isFullscreen: false,
  show: false,
  showChapters: false
});

const emit = defineEmits<{
  fullscreenChange: [value: boolean];
  close: [];
  closeChapters: [];
}>();

const readerStore = useReaderStore();
const isOpen = ref(false);
const isFullscreen = ref(false);
const isChapterNavOpen = ref(false);
const settingsPanelRef = ref<HTMLElement | null>(null);

const hints = useReaderHints();

const isTourEligible = computed(() =>
  !props.show && !props.isFullscreen && !isOpen.value && !isChapterNavOpen.value && !hints.dismissedThisVisit.value
);

const showSettingsHint = computed(() => isTourEligible.value && hints.currentStep.value === 'settings');
const showChaptersHint = computed(() => isTourEligible.value && hints.currentStep.value === 'chapters' && chapters.value.length > 0);
const showFullscreenHint = computed(() => isTourEligible.value && hints.currentStep.value === 'fullscreen');

// Handle click outside to close panels
function handleClickOutside(event: MouseEvent) {
  if (!settingsPanelRef.value) return;

  const target = event.target as HTMLElement;

  // Check if click is outside the settings panel container
  if (!settingsPanelRef.value.contains(target)) {
    if (isOpen.value) {
      isOpen.value = false;
    }
    if (isChapterNavOpen.value) {
      isChapterNavOpen.value = false;
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Get chapters (headings) from parsed content with their page numbers
const chapters = computed(() => {
  if (!readerStore.parsedContent || !readerStore.virtualPages.length) return [];

  const headings = readerStore.parsedContent.blocks.filter(block => block.type === 'heading');

  return headings.map(heading => {
    // Find which page this heading is on by searching virtualPages
    let pageNumber = 1;
    for (let i = 0; i < readerStore.virtualPages.length; i++) {
      const page = readerStore.virtualPages[i];
      // Check if this page contains the heading text
      const hasHeading = page.textBlocks?.some(
        block => block.type === 'heading' && block.text === (heading as any).text
      );
      if (hasHeading) {
        pageNumber = i + 1;
        break;
      }
    }
    return {
      index: heading.index,
      text: (heading as any).text,
      pageNumber
    };
  });
});

// Sync chapter availability into hint composable so the chapters step is skipped
// for books without chapters. Wait until both parsedContent and virtualPages are
// ready — chapters depends on both, and reporting before either is set would
// incorrectly mark the book as having no chapters.
watch(
  [() => readerStore.parsedContent, () => readerStore.virtualPages.length],
  ([parsed, vpLen]) => {
    if (parsed && vpLen > 0) hints.setHasChapters(chapters.value.length > 0);
  },
  { immediate: true }
);

function toggleChapterNav() {
  hints.advance('chapters');
  isChapterNavOpen.value = !isChapterNavOpen.value;
  // Close settings panel if opening chapters
  if (isChapterNavOpen.value) {
    isOpen.value = false;
  }
}

function togglePanel() {
  hints.advance('settings');
  // On desktop, use local state; on mobile, emit close event
  const isMobile = window.innerWidth < 800;
  if (isMobile && props.show) {
    emit('close');
  } else {
    isOpen.value = !isOpen.value;
    // Close chapter nav if opening settings
    if (isOpen.value) {
      isChapterNavOpen.value = false;
    }
  }
}

function goToChapter(pageNumber: number) {
  readerStore.goToPage(pageNumber);
  isChapterNavOpen.value = false;
}

function goToChapterMobile(pageNumber: number) {
  readerStore.goToPage(pageNumber);
  emit('closeChapters');
}

function toggleFullscreen() {
  hints.advance('fullscreen');
  isFullscreen.value = !isFullscreen.value;
  emit('fullscreenChange', isFullscreen.value);
}

function updateLixLevel(level: LixLevel) {
  readerStore.updateSettings({ lixLevel: level });
}

function updateFont(font: FontChoice) {
  readerStore.updateSettings({ font });
}

function updateTextSize(event: Event) {
  const target = event.target as HTMLInputElement;
  readerStore.updateSettings({ textSize: parseFloat(target.value) });
}

function updateLineSpacing(event: Event) {
  const target = event.target as HTMLInputElement;
  readerStore.updateSettings({ lineSpacing: parseFloat(target.value) });
}

function updateBackgroundColor(color: BackgroundColor) {
  readerStore.updateSettings({ backgroundColor: color });
}

function updateHighlightMode(mode: HighlightMode) {
  readerStore.updateSettings({ highlightMode: mode });
}

function resetSettings() {
  readerStore.updateSettings({
    lixLevel: "medium",
    font: "atkinson",
    backgroundColor: "white",
    textSize: 1.0,
    lineSpacing: 2.0,
    highlightMode: "word",
  });
}

// Check if a reading level is available for the current book
function isLevelAvailable(level: LixLevel): boolean {
  // If no book loaded or using old pagination system, show all levels
  if (!readerStore.useDynamicPagination || readerStore.availableReadingLevels.length === 0) {
    return true;
  }

  // Database already stores 'easy', 'medium', 'hard' - direct comparison
  return readerStore.availableReadingLevels.includes(level);
}

// Keyboard shortcut (optional: F for font, L for level)
// You can implement this in the ReaderView component
</script>

<style scoped>
.settings-panel {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  gap: 0.5rem;
  flex-direction: row;
  align-items: flex-start;
}

/* Fullscreen Toggle Button */
.fullscreen-toggle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-alt);
  color: var(--text);
  border: 2px solid var(--border);
  box-shadow: 0 4px 12px var(--shadow);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: background 0.15s, transform 0.15s, border-color 0.15s, opacity 0.15s;
}

.fullscreen-toggle:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  color: white;
  transform: scale(1.05);
}

.fullscreen-toggle.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.fullscreen-toggle.active:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  color: white;
}

/* Transparent buttons when in fullscreen */
.settings-panel.in-fullscreen .fullscreen-toggle.active {
  opacity: 0.4;
}

.settings-panel.in-fullscreen .fullscreen-toggle.active:hover {
  opacity: 1;
}

.fullscreen-toggle svg {
  width: 24px;
  height: 24px;
  stroke-width: 2;
}

/* Chapter Navigation Toggle */
.chapter-nav-toggle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-alt);
  color: var(--text);
  border: 2px solid var(--border);
  box-shadow: 0 4px 12px var(--shadow);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: background 0.15s, transform 0.15s, border-color 0.15s, opacity 0.15s;
}

.chapter-nav-toggle:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  color: white;
  transform: scale(1.05);
}

.chapter-nav-toggle.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.chapter-nav-toggle.active:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  color: white;
}

/* Transparent in fullscreen mode */
.settings-panel.in-fullscreen .chapter-nav-toggle {
  opacity: 0.4;
}

.settings-panel.in-fullscreen .chapter-nav-toggle:hover {
  opacity: 1;
}

.chapter-nav-toggle svg {
  width: 24px;
  height: 24px;
  stroke-width: 2;
}

/* Chapter Content Panel */
.chapter-content {
  max-height: calc(100vh - 100px);
}

.chapter-list {
  display: flex;
  flex-direction: column;
}

.chapter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--border);
}

.chapter-item:last-child {
  border-bottom: none;
}

.chapter-item:hover {
  background: var(--bg-alt);
}

.chapter-name {
  flex: 1;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 1rem;
}

.chapter-page {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg-alt);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  flex-shrink: 0;
}

/* Settings Toggle Button */
.settings-toggle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  border: none;
  box-shadow: 0 4px 12px var(--shadow);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: background 0.15s, transform 0.15s, opacity 0.15s;
}

.settings-toggle:hover {
  background: var(--primary-hover);
  transform: scale(1.05);
}

/* Transparent in fullscreen mode */
.settings-panel.in-fullscreen .settings-toggle {
  opacity: 0.4;
}

.settings-panel.in-fullscreen .settings-toggle:hover {
  opacity: 1;
}

.settings-toggle svg {
  width: 24px;
  height: 24px;
  stroke-width: 2;
}

/* Tour Hint Bubbles (sequential onboarding) */
.tour-hint {
  position: fixed;
  top: 4.75rem;
  background: rgba(31, 41, 55, 0.92);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  max-width: 220px;
  z-index: 999;
  animation: hint-bounce 1.8s ease-in-out infinite;
}

.tour-hint .hint-arrow {
  position: absolute;
  top: -6px;
  right: 18px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(31, 41, 55, 0.92);
}

/* Position each hint to point at its button (buttons are 48px wide, 8px gap, top:1rem right:1rem) */
.settings-hint { right: 1rem; }
.chapters-hint { right: 4.5rem; }
.fullscreen-hint { right: 8rem; }
.fullscreen-hint.no-chapters { right: 4.5rem; }

@keyframes hint-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.hint-enter-active,
.hint-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .settings-hint { animation: none; }
}

.settings-content {
  position: fixed;
  top: 5rem;
  right: 1rem;
  min-width: 280px;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 1.5rem;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.settings-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text);
}

.setting-group {
  margin-bottom: 1.5rem;
}

.setting-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--text-light);
  margin-top: 0.25rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

/* Level buttons - use grid for better handling of 5 buttons */
.button-group-levels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 0.5rem;
}

.btn-option {
  flex: 1;
  min-height: 44px; /* Dyslexia-friendly minimum touch target */
  padding: 0.625rem 1rem;
  background: var(--bg-alt);
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-option:hover {
  background: #E5E7EB;
  border-color: var(--primary);
}

.btn-option.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-alt);
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  transition: transform 0.15s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  border: none;
  transition: transform 0.15s;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.15);
}

.btn-reset {
  width: 100%;
  min-height: 44px; /* Dyslexia-friendly minimum touch target */
  padding: 0.625rem 1rem;
  background: var(--bg-alt);
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-reset:hover {
  background: #E5E7EB;
  border-color: var(--primary);
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .slide-enter-active,
  .slide-leave-active {
    transition: none;
  }
}

/* Mobile optimization */
@media (max-width: 800px) {
  /* Hide desktop toggle buttons on mobile (shown in footer instead) */
  .fullscreen-toggle,
  .chapter-nav-toggle,
  .settings-toggle,
  .tour-hint {
    display: none;
  }

  /* Mobile fullscreen mode */
  .settings-panel.mobile-fullscreen {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2000; /* Above footer */
  }

  .settings-panel.mobile-fullscreen .settings-content {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    height: 100vh;
    max-height: 100vh; /* Override desktop max-height */
    background: white;
    border-radius: 0;
    box-shadow: none;
    overflow: hidden; /* Changed from overflow-y: auto */
    padding: 0; /* Changed from padding: 1.5rem */
    transform: none;
    display: flex;
    flex-direction: column;
  }

  /* Fixed header for mobile */
  .mobile-settings-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 70px;
    background: white;
    border-bottom: 1px solid var(--border, #e5e7eb);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1.5rem;
    z-index: 20;
    flex-shrink: 0;
  }

  .mobile-settings-header .settings-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text);
  }

  .mobile-close-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 1rem;
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
    z-index: 10;
  }

  .mobile-close-button:active {
    background: var(--bg-hover, #e5e5e5);
  }

  .mobile-close-button svg {
    stroke-width: 2.5;
  }

  /* Scrollable settings body */
  .settings-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .settings-body.with-header {
    padding-top: 70px; /* Height of fixed header */
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    padding-bottom: 1.5rem;
  }

  .button-group {
    flex-direction: column;
  }

  /* Mobile fullscreen transition - no animation, instant show/hide */
  .settings-panel.mobile-fullscreen .slide-enter-active,
  .settings-panel.mobile-fullscreen .slide-leave-active {
    transition: none !important;
  }

  /* Mobile chapters fullscreen mode */
  .settings-panel.mobile-fullscreen-chapters {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2000; /* Above footer */
  }

  .settings-panel.mobile-fullscreen-chapters .mobile-chapters-content {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    height: 100vh;
    max-height: 100vh;
    background: white;
    border-radius: 0;
    box-shadow: none;
    overflow: hidden;
    padding: 0;
    transform: none;
    display: flex;
    flex-direction: column;
  }

  .settings-panel.mobile-fullscreen-chapters .slide-enter-active,
  .settings-panel.mobile-fullscreen-chapters .slide-leave-active {
    transition: none !important;
  }
}
</style>
