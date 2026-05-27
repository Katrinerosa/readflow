<template>
  <div class="book-page" :class="pageClass">
    <div v-if="page" class="page-inner">
      <!-- Image positioning: page_top -->
      <div
        v-if="page.image && page.image_position === 'page_top'"
        class="page-image page-image-top"
      >
        <img :src="imageUrl" :alt="$t('reader.page.illustration', { page: page.page_number })" />
      </div>

      <!-- Image positioning: fill_page -->
      <div
        v-if="page.image && page.image_position === 'fill_page'"
        class="page-image page-image-fill"
      >
        <img :src="imageUrl" :alt="$t('reader.page.illustration', { page: page.page_number })" />
      </div>

      <!-- Content area (only shown if not fill_page) -->
      <div
        v-if="!page.image || page.image_position !== 'fill_page'"
        class="page-content"
        v-html="content"
      ></div>

      <!-- Image positioning: page_bottom -->
      <div
        v-if="page.image && page.image_position === 'page_bottom'"
        class="page-image page-image-bottom"
      >
        <img :src="imageUrl" :alt="$t('reader.page.illustration', { page: page.page_number })" />
      </div>

      <!-- Page number footer -->
      <div class="page-number">{{ page.page_number }}</div>
    </div>
    <div v-else class="page-empty">
      <p>{{ $t('reader.error.page_not_found') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useReaderStore } from "../stores/reader";
import type { BookPage } from "../stores/reader";

interface Props {
  page: BookPage | undefined;
  content: string;
}

const props = defineProps<Props>();
const readerStore = useReaderStore();

const pageClass = computed(() => {
  if (!props.page) return "";
  return `page-${props.page.page_number % 2 === 0 ? "even" : "odd"}`;
});

const imageUrl = computed(() => {
  if (!props.page?.image) return "";
  return readerStore.getImageUrl(props.page.image);
});
</script>

<style scoped>
.book-page {
  width: 100%;
  height: 100%;
  background: var(--bg);
  box-shadow: 0 2px 8px var(--shadow);
  position: relative;
  overflow: hidden;
}

.page-inner {
  width: 100%;
  height: 100%;
  padding: 3rem 2.5rem;
  display: flex;
  flex-direction: column;
  font-family: var(--font-reader);
  line-height: var(--line-spacing);
  letter-spacing: var(--letter-spacing);
}

.page-content {
  flex: 1;
  overflow-y: auto;
  font-size: calc(1.1rem * var(--text-size-multiplier, 1));
  color: var(--text);
}

/* Typography for content */
.page-content :deep(p) {
  margin-bottom: 1.25rem;
}

.page-content :deep(h1),
.page-content :deep(h2),
.page-content :deep(h3) {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  line-height: 1.3;
  font-weight: 600;
}

/* Remove top margin from first element (heading or paragraph) */
.page-content :deep(h1:first-child),
.page-content :deep(h2:first-child),
.page-content :deep(h3:first-child),
.page-content :deep(p:first-child) {
  margin-top: 0 !important;
}

/* Remove bottom margin from last element (heading or paragraph) */
.page-content :deep(h1:last-child),
.page-content :deep(h2:last-child),
.page-content :deep(h3:last-child),
.page-content :deep(p:last-child) {
  margin-bottom: 0 !important;
}

.page-content :deep(h1) {
  font-size: calc(1.8rem * var(--text-size-multiplier, 1));
}

.page-content :deep(h2) {
  font-size: calc(1.5rem * var(--text-size-multiplier, 1));
}

.page-content :deep(h3) {
  font-size: calc(1.25rem * var(--text-size-multiplier, 1));
}

/* Image styles */
.page-image {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.page-image img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.page-image-top {
  margin-bottom: 2rem;
  max-height: 40%;
}

.page-image-bottom {
  margin-top: 2rem;
  max-height: 40%;
}

.page-image-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 0;
}

.page-image-fill img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Page number */
.page-number {
  position: absolute;
  padding-bottom: 0.5rem;
  text-align: center;
  width: 100%;
  font-size: 0.875rem;
  color: var(--text-light);
  font-family: var(--font-system);
}

.page-odd .page-number {
  left: 0;
}

.page-even .page-number {
  right: 0;
}

/* Empty page */
.page-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-light);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .page-inner {
    padding: 2rem 1.5rem;
  }

  .page-content {
    font-size: calc(1rem * var(--text-size-multiplier, 1));
  }
}
</style>
