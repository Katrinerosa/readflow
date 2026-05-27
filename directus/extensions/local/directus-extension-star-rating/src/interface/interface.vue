<template>
  <div class="star-rating-interface">
    <div class="stars-container">
      <button
        v-for="star in maxStarsValue"
        :key="star"
        type="button"
        class="star-button"
        :class="{
          'filled': star <= currentValue,
          'half': allowHalf && star - 0.5 === currentValue,
          'hovered': star <= hoverValue
        }"
        @click="selectRating(star)"
        @mouseenter="hoverValue = star"
        @mouseleave="hoverValue = 0"
      >
        <svg
          viewBox="0 0 24 24"
          class="star-icon"
          :style="{
            fill: getStarFill(star),
            stroke: getStarStroke(star)
          }"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    </div>
    <button
      v-if="currentValue > 0"
      type="button"
      class="clear-button"
      @click="clearRating"
    >
      <svg viewBox="0 0 24 24" class="clear-icon">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(defineProps<{
  value: number | null;
  maxStars?: number;
  allowHalf?: boolean;
  color?: string;
  emptyColor?: string;
  disabled?: boolean;
}>(), {
  maxStars: 5,
  allowHalf: false,
  color: '#f59e0b',
  emptyColor: '#d1d5db',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'input', value: number | null): void;
}>();

const hoverValue = ref(0);

const maxStarsValue = computed(() => {
  const max = props.maxStars || 5;
  return Math.min(Math.max(1, max), 10);
});

const currentValue = computed(() => props.value || 0);

function getStarFill(star: number): string {
  if (hoverValue.value > 0) {
    return star <= hoverValue.value ? props.color : props.emptyColor;
  }
  return star <= currentValue.value ? props.color : props.emptyColor;
}

function getStarStroke(star: number): string {
  if (hoverValue.value > 0) {
    return star <= hoverValue.value ? props.color : props.emptyColor;
  }
  return star <= currentValue.value ? props.color : props.emptyColor;
}

function selectRating(star: number) {
  if (props.disabled) return;

  if (star === currentValue.value) {
    emit('input', null);
  } else {
    emit('input', star);
  }
}

function clearRating() {
  if (props.disabled) return;
  emit('input', null);
}
</script>

<style scoped>
.star-rating-interface {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stars-container {
  display: flex;
  gap: 2px;
}

.star-button {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  transition: transform 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-button:hover {
  transform: scale(1.1);
}

.star-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.star-icon {
  width: 24px;
  height: 24px;
  transition: fill 0.15s ease, stroke 0.15s ease;
}

.clear-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-button:hover {
  opacity: 1;
}

.clear-icon {
  width: 16px;
  height: 16px;
  fill: var(--theme--foreground-subdued);
}
</style>
