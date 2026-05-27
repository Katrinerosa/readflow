<template>
  <div class="star-rating-display" :class="sizeClass">
    <span
      v-for="star in maxStarsValue"
      :key="star"
      class="star"
    >
      <svg
        viewBox="0 0 24 24"
        class="star-icon"
        :style="{
          fill: star <= currentValue ? color : emptyColor,
          stroke: star <= currentValue ? color : emptyColor
        }"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </span>
    <span v-if="showValue && currentValue > 0" class="value-text">
      {{ currentValue }}/{{ maxStarsValue }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  value: number | null;
  maxStars?: number;
  color?: string;
  emptyColor?: string;
  showValue?: boolean;
  size?: 'small' | 'medium' | 'large';
}>(), {
  maxStars: 5,
  color: '#f59e0b',
  emptyColor: '#d1d5db',
  showValue: false,
  size: 'small',
});

const maxStarsValue = computed(() => {
  const max = props.maxStars || 5;
  return Math.min(Math.max(1, max), 10);
});

const currentValue = computed(() => props.value || 0);

const sizeClass = computed(() => `size-${props.size}`);
</script>

<style scoped>
.star-rating-display {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.star {
  display: inline-flex;
  align-items: center;
}

.star-icon {
  transition: fill 0.15s ease;
}

.size-small .star-icon {
  width: 14px;
  height: 14px;
}

.size-medium .star-icon {
  width: 18px;
  height: 18px;
}

.size-large .star-icon {
  width: 24px;
  height: 24px;
}

.value-text {
  margin-left: 6px;
  font-size: 0.875em;
  color: var(--theme--foreground-subdued);
}
</style>
