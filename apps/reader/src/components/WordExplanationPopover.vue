<template>
  <Teleport to="body">
    <Transition name="popover-fade">
      <div
        v-if="activeExplanation"
        ref="popoverRef"
        class="word-explanation-popover"
        :class="{ 'position-above': positionAbove }"
        :style="popoverStyle"
        @click.stop
      >
        <button class="popover-close" @click="hideExplanation" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div class="popover-word">{{ activeExplanation.word.charAt(0).toUpperCase() + activeExplanation.word.slice(1) }}</div>
        <div class="popover-content" v-html="activeExplanation.content" />
        <div class="popover-arrow" :style="arrowStyle" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useWordExplanations } from "../composables/useWordExplanations";

const { activeExplanation, hideExplanation } = useWordExplanations();

const popoverRef = ref<HTMLElement | null>(null);
const positionAbove = ref(false);
const popoverLeft = ref(0);
const popoverTop = ref(0);
const arrowLeft = ref(0);

const POPOVER_MAX_WIDTH = 280;
const POPOVER_MARGIN = 8;

const popoverStyle = computed(() => ({
  left: `${popoverLeft.value}px`,
  top: `${popoverTop.value}px`,
  maxWidth: `${POPOVER_MAX_WIDTH}px`,
}));

const arrowStyle = computed(() => ({
  left: `${arrowLeft.value}px`,
}));

function positionPopover() {
  if (!activeExplanation.value || !popoverRef.value) return;

  const rect = activeExplanation.value.rect;
  const el = popoverRef.value;
  const elRect = el.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Horizontal: center on word, clamp to viewport
  let left = rect.left + rect.width / 2 - elRect.width / 2;
  left = Math.max(POPOVER_MARGIN, Math.min(left, viewportWidth - elRect.width - POPOVER_MARGIN));

  // Arrow points to center of word relative to popover left
  const wordCenter = rect.left + rect.width / 2;
  arrowLeft.value = Math.max(12, Math.min(wordCenter - left, elRect.width - 12));

  // Vertical: prefer below, fallback above
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow >= elRect.height + POPOVER_MARGIN + 8) {
    positionAbove.value = false;
    popoverTop.value = rect.bottom + 8;
  } else if (spaceAbove >= elRect.height + POPOVER_MARGIN + 8) {
    positionAbove.value = true;
    popoverTop.value = rect.top - elRect.height - 8;
  } else {
    // Not enough space either way, position below anyway
    positionAbove.value = false;
    popoverTop.value = rect.bottom + 8;
  }

  popoverLeft.value = left;
}

function onClickOutside(event: MouseEvent) {
  if (popoverRef.value && !popoverRef.value.contains(event.target as Node)) {
    hideExplanation();
  }
}

watch(activeExplanation, async (val) => {
  if (val) {
    await nextTick();
    positionPopover();
  }
});

onMounted(() => {
  document.addEventListener("click", onClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener("click", onClickOutside, true);
});
</script>

<style scoped>
.word-explanation-popover {
  position: fixed;
  z-index: 10000;
  background: var(--background, #fff);
  color: var(--text, #1a1a1a);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  font-size: 0.95rem;
  line-height: 1.5;
  max-width: 280px;
  word-wrap: break-word;
}

.popover-close {
  position: absolute;
  top: 6px;
  right: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text, #1a1a1a);
  opacity: 0.5;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.popover-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.popover-word {
  font-weight: 600;
  margin-bottom: 4px;
  padding-right: 18px;
}

.popover-content {
  font-size: 0.9rem;
  opacity: 0.9;
}

.popover-content :deep(p) {
  margin: 0;
}

.popover-content :deep(p + p) {
  margin-top: 0.5em;
}

.popover-arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--background, #fff);
  border: 1px solid var(--border, #e0e0e0);
  transform: rotate(45deg);
  pointer-events: none;
}

/* Arrow below popover (pointing down, popover above word) */
.position-above .popover-arrow {
  bottom: -7px;
  border-top: none;
  border-left: none;
}

/* Arrow above popover (pointing up, popover below word) */
.word-explanation-popover:not(.position-above) .popover-arrow {
  top: -7px;
  border-bottom: none;
  border-right: none;
}

/* Fade transition */
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.15s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
}
</style>
