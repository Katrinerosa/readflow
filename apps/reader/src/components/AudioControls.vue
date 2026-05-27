<template>
  <transition name="slide-in">
    <div
      v-if="visible && audioUrl"
      class="floating-audio-controls"
      :class="{ dragging: isDragging }"
      :style="{
        top: `${position.top}px`,
        left: `${position.left}px`
      }"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <!-- Drag handle -->
      <div
        class="audio-drag-handle"
        @mousedown="startDrag"
        :title="$t('reader.audio.dragToMove')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="9" cy="5" r="1" fill="currentColor" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="9" cy="19" r="1" fill="currentColor" />
          <circle cx="15" cy="5" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="19" r="1" fill="currentColor" />
        </svg>
      </div>

      <button
        @click="close"
        class="audio-close-btn"
        :aria-label="$t('reader.audio.close')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18" stroke-width="2"></line>
          <line x1="6" y1="6" x2="18" y2="18" stroke-width="2"></line>
        </svg>
      </button>

      <button
        @click="togglePlayPause"
        class="audio-btn audio-play-pause"
        :aria-label="isPlaying ? $t('reader.audio.pause') : $t('reader.audio.play')"
      >
        <svg v-if="!isPlaying" width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 4.98951C5 4.01835 5 3.53277 5.20249 3.2651C5.37889 3.03191 5.64852 2.88761 5.9404 2.87018C6.27544 2.85017 6.67946 3.11953 7.48752 3.65823L18.0031 10.6686C18.6708 11.1137 19.0046 11.3363 19.1209 11.6168C19.2227 11.8621 19.2227 12.1377 19.1209 12.383C19.0046 12.6635 18.6708 12.886 18.0031 13.3312L7.48752 20.3415C6.67946 20.8802 6.27544 21.1496 5.9404 21.1296C5.64852 21.1122 5.37889 20.9679 5.20249 20.7347C5 20.467 5 19.9814 5 19.0103V4.98951Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.5 15V9M14.5 15V9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <button
        @click="restart"
        class="audio-btn audio-restart"
        :aria-label="$t('reader.audio.restart')"
      >
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 20.5001C16.6944 20.5001 20.5 16.6945 20.5 12.0001C20.5 9.17456 19.1213 6.67103 17 5.1255M13 22.4001L11 20.4001L13 18.4001M12 3.5001C7.30558 3.5001 3.5 7.30568 3.5 12.0001C3.5 14.8256 4.87867 17.3292 7 18.8747M11 5.6001L13 3.6001L11 1.6001" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="audio-progress">
        <div class="audio-progress-bar" :style="{ width: `${progress}%` }"></div>
      </div>

      <div class="audio-time">
        {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
      </div>

      <!-- Word reading toggle -->
      <button
        @click="emit('toggleWordReading')"
        class="audio-btn word-reading-toggle"
        :class="{ active: props.wordReadingEnabled }"
        :aria-label="$t('reader.audio.wordReading')"
        :title="props.wordReadingEnabled ? $t('reader.audio.wordReadingOn') : $t('reader.audio.wordReadingOff')"
      >
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 3.5V2M5.06066 5.06066L4 4M5.06066 13L4 14.0607M13 5.06066L14.0607 4M3.5 9H2M15.8645 16.1896L13.3727 20.817C13.0881 21.3457 12.9457 21.61 12.7745 21.6769C12.6259 21.7349 12.4585 21.7185 12.324 21.6328C12.1689 21.534 12.0806 21.2471 11.9038 20.6733L8.44519 9.44525C8.3008 8.97651 8.2286 8.74213 8.28669 8.58383C8.33729 8.44595 8.44595 8.33729 8.58383 8.2867C8.74213 8.22861 8.9765 8.3008 9.44525 8.44519L20.6732 11.9038C21.247 12.0806 21.5339 12.169 21.6327 12.324C21.7185 12.4586 21.7348 12.6259 21.6768 12.7745C21.61 12.9458 21.3456 13.0881 20.817 13.3728L16.1896 15.8645C16.111 15.9068 16.0717 15.9279 16.0374 15.9551C16.0068 15.9792 15.9792 16.0068 15.9551 16.0374C15.9279 16.0717 15.9068 16.111 15.8645 16.1896Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- Word highlight toggle -->
      <button
        @click="emit('toggleWordHighlight')"
        class="audio-btn word-highlight-toggle"
        :class="{ active: props.wordHighlightEnabled }"
        :aria-label="$t('reader.audio.wordHighlight')"
        :title="props.wordHighlightEnabled ? $t('reader.audio.wordHighlightOn') : $t('reader.audio.wordHighlightOff')"
      >
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 4V11C18 14.3137 15.3137 17 12 17C8.68629 17 6 14.3137 6 11V4M4 21H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <audio
        ref="audioElement"
        :src="audioUrl"
        @timeupdate="updateProgress"
        @loadedmetadata="updateDuration"
        @ended="onEnded"
      ></audio>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";

interface WordTiming {
  text: string;
  start: number;
  end: number;
}

interface Props {
  visible: boolean;
  audioUrl: string | null;
  initialPosition: { top: number; left: number };
  wordReadingEnabled: boolean;
  wordHighlightEnabled: boolean;
  wordTiming: WordTiming[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  mouseEnter: [];
  mouseLeave: [];
  playingChange: [isPlaying: boolean];
  toggleWordReading: [];
  toggleWordHighlight: [];
  wordHighlight: [data: { word: string; index: number } | null];
}>();

// Audio element ref
const audioElement = ref<HTMLAudioElement | null>(null);

// Inactivity timer disabled - user must close manually
let inactivityTimer: number | null = null;

// Playback state
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);

// Position and drag state
const position = ref({ ...props.initialPosition });
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

// Computed
const progress = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

// Watch for initial position changes (when parent updates it)
watch(() => props.initialPosition, (newPos) => {
  if (!isDragging.value) {
    position.value = { ...newPos };
  }
}, { deep: true });

// Watch for visibility changes
watch(() => props.visible, (visible) => {
  if (visible) {
    // Start inactivity timer when controls become visible
    resetInactivityTimer();
  } else {
    // Clear timer, segment check, and pause when hiding
    clearInactivityTimer();
    if (segmentCheckInterval) {
      clearInterval(segmentCheckInterval);
      segmentCheckInterval = null;
    }
    segmentEndTime = null;
    if (audioElement.value && isPlaying.value) {
      audioElement.value.pause();
      isPlaying.value = false;
    }
  }
});

// Inactivity timer functions - disabled, kept for API compatibility
function resetInactivityTimer() {
  // Timer disabled - user must close manually
}

function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

// Watch for playing state to manage inactivity timer
watch(isPlaying, (playing) => {
  if (playing) {
    // Clear timer while playing
    clearInactivityTimer();
  } else {
    // Restart timer when playback stops
    resetInactivityTimer();
  }
});

// Watch for audio URL changes to reset state
watch(() => props.audioUrl, () => {
  currentTime.value = 0;
  duration.value = 0;
  if (isPlaying.value && audioElement.value) {
    audioElement.value.pause();
    isPlaying.value = false;
  }
});

// Emit playing state changes and manage word highlight tracking
watch(isPlaying, (playing) => {
  emit('playingChange', playing);

  if (playing) {
    startWordHighlightTracking();
  } else {
    stopWordHighlightTracking();
  }
});

// Playback functions
function togglePlayPause() {
  if (!audioElement.value) return;

  resetInactivityTimer();

  if (isPlaying.value) {
    audioElement.value.pause();
    isPlaying.value = false;
  } else {
    audioElement.value.play();
    isPlaying.value = true;
  }
}

function restart() {
  if (!audioElement.value) return;

  resetInactivityTimer();

  audioElement.value.currentTime = 0;
  audioElement.value.play();
  isPlaying.value = true;
}

function updateDuration() {
  if (audioElement.value) {
    duration.value = audioElement.value.duration;
  }
}

function onEnded() {
  isPlaying.value = false;
  currentTime.value = 0;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Close handler
function close() {
  if (audioElement.value && isPlaying.value) {
    audioElement.value.pause();
    isPlaying.value = false;
  }
  emit('close');
}

// Mouse event handlers
function onMouseEnter() {
  resetInactivityTimer();
  emit('mouseEnter');
}

function onMouseLeave() {
  emit('mouseLeave');
}

// Drag functions
function startDrag(event: MouseEvent) {
  resetInactivityTimer();

  isDragging.value = true;
  dragStart.value = {
    x: event.clientX - position.value.left,
    y: event.clientY - position.value.top
  };

  event.preventDefault();

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

function onDrag(event: MouseEvent) {
  if (!isDragging.value) return;

  const newX = event.clientX - dragStart.value.x;
  const newY = event.clientY - dragStart.value.y;

  const padding = 50;
  position.value = {
    left: Math.max(padding, Math.min(window.innerWidth - padding, newX)),
    top: Math.max(padding, Math.min(window.innerHeight - padding, newY))
  };
}

function stopDrag() {
  if (!isDragging.value) return;

  isDragging.value = false;

  // Save position to localStorage
  localStorage.setItem('audioControlsPosition', JSON.stringify(position.value));

  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// Cleanup
onUnmounted(() => {
  clearInactivityTimer();
  if (segmentCheckInterval) {
    clearInterval(segmentCheckInterval);
    segmentCheckInterval = null;
  }
  if (segmentTimeoutId) {
    clearTimeout(segmentTimeoutId);
    segmentTimeoutId = null;
  }
  stopWordHighlightTracking();
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});

// Method to start playback programmatically
function play() {
  if (audioElement.value && !isPlaying.value) {
    audioElement.value.play();
    isPlaying.value = true;
  }
}

// Track segment end time for word playback
let segmentEndTime: number | null = null;
let segmentCheckInterval: number | null = null;

// Track word highlighting during playback
let wordHighlightInterval: number | null = null;
let lastHighlightedIndex: number | null = null;

// Find and emit the current word based on playback time
function updateWordHighlight() {
  if (!props.wordHighlightEnabled || !audioElement.value || props.wordTiming.length === 0) {
    if (lastHighlightedIndex !== null) {
      lastHighlightedIndex = null;
      emit('wordHighlight', null);
    }
    return;
  }

  const currentTime = audioElement.value.currentTime;

  // Find the index of the word that matches current time
  const currentIndex = props.wordTiming.findIndex(
    wt => currentTime >= wt.start && currentTime < wt.end
  );

  // Only emit if the word changed
  if (currentIndex !== (lastHighlightedIndex ?? -1)) {
    if (currentIndex === -1) {
      lastHighlightedIndex = null;
      emit('wordHighlight', null);
    } else {
      lastHighlightedIndex = currentIndex;
      emit('wordHighlight', { word: props.wordTiming[currentIndex].text, index: currentIndex });
    }
  }
}

// Start word highlight tracking
function startWordHighlightTracking() {
  if (wordHighlightInterval) return;

  // Check every 50ms for smooth highlighting
  wordHighlightInterval = window.setInterval(updateWordHighlight, 50);
}

// Stop word highlight tracking
function stopWordHighlightTracking() {
  if (wordHighlightInterval) {
    clearInterval(wordHighlightInterval);
    wordHighlightInterval = null;
  }
  // Clear any highlighted word
  if (lastHighlightedIndex !== null) {
    lastHighlightedIndex = null;
    emit('wordHighlight', null);
  }
}

// Store timeout ID for cleanup
let segmentTimeoutId: number | null = null;

// Method to play a specific segment (for word hover)
function playSegment(startTime: number, endTime: number) {
  if (!audioElement.value) return;

  // Clear any existing timers
  if (segmentCheckInterval) {
    clearInterval(segmentCheckInterval);
    segmentCheckInterval = null;
  }
  if (segmentTimeoutId) {
    clearTimeout(segmentTimeoutId);
    segmentTimeoutId = null;
  }

  // Store the exact end time
  segmentEndTime = endTime;

  const audio = audioElement.value;

  // Seek to start time
  audio.currentTime = startTime;

  // Wait for seek to complete, then start precise timing
  const onSeeked = () => {
    audio.removeEventListener('seeked', onSeeked);

    // Now play from the exact position
    audio.play();
    isPlaying.value = true;

    // Calculate actual duration from current position
    const duration = (endTime - audio.currentTime) * 1000;

    // Use setTimeout for precise stopping based on actual duration
    segmentTimeoutId = window.setTimeout(() => {
      if (audio && segmentEndTime !== null) {
        audio.pause();
        isPlaying.value = false;
        segmentEndTime = null;
        segmentTimeoutId = null;
      }
    }, duration);
  };

  // If already at the right position, no seek needed
  if (Math.abs(audio.currentTime - startTime) < 0.01) {
    audio.play();
    isPlaying.value = true;

    const duration = (endTime - startTime) * 1000;
    segmentTimeoutId = window.setTimeout(() => {
      if (audio && segmentEndTime !== null) {
        audio.pause();
        isPlaying.value = false;
        segmentEndTime = null;
        segmentTimeoutId = null;
      }
    }, duration);
  } else {
    audio.addEventListener('seeked', onSeeked, { once: true });
  }
}

// Update progress for UI
function updateProgress() {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime;
  }
}

// Expose for parent component
defineExpose({
  isPlaying,
  play,
  playSegment
});
</script>

<style scoped>
/* Floating audio controls */
.floating-audio-controls {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 50px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  transition: box-shadow 0.2s;
}

.floating-audio-controls.dragging {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  cursor: grabbing;
}

/* Drag handle */
.audio-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 32px;
  cursor: grab;
  color: var(--text-muted);
  transition: color 0.15s;
  user-select: none;
  margin-left: -0.25rem;
}

.audio-drag-handle:hover {
  color: var(--text);
}

.audio-drag-handle:active {
  cursor: grabbing;
}

.dragging .audio-drag-handle {
  cursor: grabbing;
}

/* Slide in transition */
.slide-in-enter-active,
.slide-in-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-in-enter-from {
  transform: translateX(-20px);
  opacity: 0;
}

.slide-in-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

/* Close button */
.audio-close-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  background: var(--bg-alt);
  color: var(--text);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.15s;
}

.audio-close-btn:hover {
  background: var(--border);
  transform: scale(1.05);
}

.audio-close-btn:active {
  transform: scale(0.95);
}

/* Audio control buttons */
.audio-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
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

.audio-btn:hover {
  background: var(--primary-hover);
  transform: scale(1.05);
}

.audio-btn:active {
  transform: scale(0.95);
}

.audio-btn svg {
  width: 18px;
  height: 18px;
}

.audio-progress {
  width: 150px;
  height: 6px;
  background: var(--bg-alt);
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
}

.audio-progress-bar {
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.audio-time {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  min-width: 80px;
  text-align: center;
  font-family: var(--font-system);
}

/* Word reading toggle */
.word-reading-toggle {
  background: var(--bg-alt);
  color: var(--text);
}

.word-reading-toggle:hover {
  background: var(--border);
}

.word-reading-toggle.active {
  background: var(--primary);
  color: white;
}

.word-reading-toggle.active:hover {
  background: var(--primary-hover);
}

/* Word highlight toggle */
.word-highlight-toggle {
  background: var(--bg-alt);
  color: var(--text);
}

.word-highlight-toggle:hover {
  background: var(--border);
}

.word-highlight-toggle.active {
  background: var(--primary);
  color: white;
}

.word-highlight-toggle.active:hover {
  background: var(--primary-hover);
}

/* Mobile styles */
@media (max-width: 800px) {
  .floating-audio-controls {
    /* Position at top like mobile-footer-controls */
    top: 0 !important;
    bottom: auto !important;
    left: 0 !important;
    right: 0 !important;
    width: 100%;
    height: 60px;
    gap: 0.5rem;
    padding: 0 1rem;
    border-radius: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  /* Hide drag handle on mobile */
  .audio-drag-handle {
    display: none;
  }

  /* Smaller buttons on mobile */
  .audio-btn {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
  }

  .audio-btn svg {
    width: 16px;
    height: 16px;
  }

  .audio-close-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
  }

  /* Progress bar fills available space on mobile */
  .audio-progress {
    flex: 1;
    min-width: 60px;
    width: auto;
  }

  /* Smaller time display on mobile */
  .audio-time {
    font-size: 0.75rem;
    min-width: 55px;
  }
}

/* Very small screens */
@media (max-width: 380px) {
  .floating-audio-controls {
    gap: 0.25rem;
    padding: 0 0.5rem;
  }

  .audio-time {
    font-size: 0.7rem;
    min-width: 50px;
  }

  .audio-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
  }
}
</style>
