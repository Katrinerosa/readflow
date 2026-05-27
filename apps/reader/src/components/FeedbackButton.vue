<template>
  <div v-if="!props.isFullscreen" class="feedback-container">
    <!-- Feedback Hint Bubble (desktop only, dismissable) -->
    <transition name="hint">
      <div
        v-if="showHint"
        class="feedback-hint"
        @click.stop="hints.advance('feedback')"
      >
        <span v-html="$t('reader.hint.feedback')"></span>
        <div class="hint-arrow"></div>
      </div>
    </transition>

    <!-- Feedback Toggle Button -->
    <button
      class="feedback-toggle"
      @click="openModal"
      :aria-label="$t('feedback.button.label')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Modal Backdrop -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isOpen" class="feedback-backdrop" @click="closeModal"></div>
      </Transition>
    </Teleport>

    <!-- Modal Content -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isOpen" class="feedback-modal">
          <!-- Success State -->
          <div v-if="showSuccess" class="success-state">
            <div class="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h2 v-html="$t('feedback.success.title')"></h2>
            <p v-html="activeTab === 'bug' ? $t('feedback.success.bug') : $t('feedback.success.message')"></p>
            <button class="btn-primary" @click="closeModal" v-html="$t('feedback.close')"></button>
          </div>

          <!-- Error State -->
          <div v-else-if="showError" class="error-state">
            <div class="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <h2 v-html="$t('feedback.error.title')"></h2>
            <p v-html="$t('feedback.error.message')"></p>
            <button class="btn-primary" @click="showError = false" v-html="$t('feedback.error.retry')"></button>
          </div>

          <!-- Form State -->
          <div v-else class="form-state">
            <!-- Header -->
            <div class="modal-header">
              <h2 v-html="$t('feedback.modal.title')"></h2>
              <button class="close-button" @click="closeModal" :aria-label="$t('feedback.close')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18" stroke-width="2"></line>
                  <line x1="6" y1="6" x2="18" y2="18" stroke-width="2"></line>
                </svg>
              </button>
            </div>

            <!-- Tabs (desktop) -->
            <div class="tabs desktop-tabs">
              <button
                :class="['tab', { active: activeTab === 'feedback' }]"
                @click="activeTab = 'feedback'"
              >
                <svg class="tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span v-html="$t('feedback.tab.feedback')"></span>
              </button>
              <button
                v-if="bookTitle"
                :class="['tab', { active: activeTab === 'review' }]"
                @click="activeTab = 'review'"
              >
                <svg class="tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                <span v-html="$t('feedback.tab.review')"></span>
              </button>
              <button
                :class="['tab', { active: activeTab === 'feature' }]"
                @click="activeTab = 'feature'"
              >
                <svg class="tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18h6"></path>
                  <path d="M10 22h4"></path>
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
                </svg>
                <span v-html="$t('feedback.tab.feature')"></span>
              </button>
              <button
                :class="['tab', { active: activeTab === 'bug' }]"
                @click="activeTab = 'bug'"
              >
                <svg class="tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span v-html="$t('feedback.tab.bug')"></span>
              </button>
            </div>

            <!-- Dropdown (mobile) -->
            <div class="tabs-dropdown mobile-tabs">
              <select v-model="activeTab" class="tab-select">
                <option value="feedback" v-html="$t('feedback.tab.feedback')"></option>
                <option v-if="bookTitle" value="review" v-html="$t('feedback.tab.review')"></option>
                <option value="feature" v-html="$t('feedback.tab.feature')"></option>
                <option value="bug" v-html="$t('feedback.tab.bug')"></option>
              </select>
            </div>

            <!-- Feedback Form (General) -->
            <div v-if="activeTab === 'feedback'" class="form-content">
              <p class="welcome-text" v-html="$t('feedback.modal.welcome')"></p>

              <!-- Star Rating -->
              <div class="rating-group">
                <label v-html="$t('feedback.rating.label')"></label>
                <div class="stars">
                  <button
                    v-for="star in 5"
                    :key="star"
                    class="star-button"
                    @click="rating = star"
                    @mouseenter="hoverRating = star"
                    @mouseleave="hoverRating = 0"
                    :aria-label="`Rate ${star} stars`"
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      :fill="star <= (hoverRating || rating) ? 'currentColor' : 'none'"
                      :class="{ filled: star <= (hoverRating || rating) }"
                    >
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
                <span class="hint" v-html="$t('feedback.rating.hint')"></span>
              </div>

              <!-- Message -->
              <div class="input-group">
                <div class="label-row">
                  <label v-html="$t('feedback.message.label.feedback')"></label>
                  <span v-if="messageCharCount > 0 && messageCharCount < 40" class="char-counter error">{{ messageCharCount - 40 }}</span>
                  <span v-else-if="messageCharCount > 200" class="char-counter error">+{{ messageCharCount - 200 }}</span>
                </div>
                <textarea
                  v-model="message"
                  :placeholder="$t('feedback.message.placeholder')"
                  rows="4"
                ></textarea>
              </div>
            </div>

            <!-- Book Review Form -->
            <div v-else-if="activeTab === 'review'" class="form-content">
              <p class="welcome-text">
                <span v-html="$t('feedback.scope.book')"></span> <strong>{{ bookTitle }}</strong>
              </p>

              <!-- Star Rating -->
              <div class="rating-group">
                <label v-html="$t('feedback.rating.label.book')"></label>
                <div class="stars">
                  <button
                    v-for="star in 5"
                    :key="star"
                    class="star-button"
                    @click="rating = star"
                    @mouseenter="hoverRating = star"
                    @mouseleave="hoverRating = 0"
                    :aria-label="`Rate ${star} stars`"
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      :fill="star <= (hoverRating || rating) ? 'currentColor' : 'none'"
                      :class="{ filled: star <= (hoverRating || rating) }"
                    >
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
                <span class="hint" v-html="$t('feedback.rating.hint')"></span>
              </div>

              <!-- Message -->
              <div class="input-group">
                <div class="label-row">
                  <label v-html="$t('feedback.message.label.review')"></label>
                  <span v-if="messageCharCount > 0 && messageCharCount < 40" class="char-counter error">{{ messageCharCount - 40 }}</span>
                  <span v-else-if="messageCharCount > 200" class="char-counter error">+{{ messageCharCount - 200 }}</span>
                </div>
                <textarea
                  v-model="message"
                  :placeholder="$t('feedback.message.placeholder')"
                  rows="4"
                ></textarea>
              </div>
            </div>

            <!-- Feature Request Form -->
            <div v-else-if="activeTab === 'feature'" class="form-content">
              <p class="welcome-text" v-html="$t('feedback.feature.welcome')"></p>

              <div class="input-group">
                <div class="label-row">
                  <label v-html="$t('feedback.feature.description.label')"></label>
                  <span v-if="featureCharCount > 0 && featureCharCount < 40" class="char-counter error">{{ featureCharCount - 40 }}</span>
                  <span v-else-if="featureCharCount > 200" class="char-counter error">+{{ featureCharCount - 200 }}</span>
                </div>
                <textarea
                  v-model="featureDescription"
                  :placeholder="$t('feedback.feature.description.placeholder')"
                  rows="6"
                ></textarea>
              </div>
            </div>

            <!-- Bug Report Form -->
            <div v-else-if="activeTab === 'bug'" class="form-content">
              <p class="welcome-text" v-html="$t('feedback.bug.welcome')"></p>

              <div class="input-group">
                <div class="label-row">
                  <label v-html="$t('feedback.bug.description.label')"></label>
                  <span v-if="bugCharCount > 0 && bugCharCount < 40" class="char-counter error">{{ bugCharCount - 40 }}</span>
                  <span v-else-if="bugCharCount > 200" class="char-counter error">+{{ bugCharCount - 200 }}</span>
                </div>
                <textarea
                  v-model="bugDescription"
                  :placeholder="$t('feedback.bug.description.placeholder')"
                  rows="6"
                ></textarea>
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-actions">
              <button
                class="btn-secondary"
                @click="closeModal"
                v-html="$t('feedback.cancel')"
              ></button>
              <button
                class="btn-primary"
                @click="submitFeedback"
                :disabled="!canSubmit"
                v-html="activeTab === 'bug' ? $t('feedback.submit.bug') : activeTab === 'feature' ? $t('feedback.submit.feature') : $t('feedback.submit')"
              ></button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useReaderStore } from '../stores/reader';
import { useReaderHints } from '../composables/useReaderHints';

interface Props {
  isFullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isFullscreen: false
});

const readerStore = useReaderStore();

const isOpen = ref(false);
const showSuccess = ref(false);
const showError = ref(false);
const activeTab = ref<'feedback' | 'review' | 'feature' | 'bug'>('feedback');

const hints = useReaderHints();
const showHint = computed(() => hints.currentStep.value === 'feedback' && !isOpen.value && !hints.dismissedThisVisit.value);
const rating = ref(0);
const hoverRating = ref(0);
const message = ref('');
const bugDescription = ref('');
const featureDescription = ref('');
const isSubmitting = ref(false);

// Get book info from store
const bookTitle = computed(() => readerStore.currentBook?.title || '');
const bookId = computed(() => readerStore.currentBook?.id || null);

// Character counts
const messageCharCount = computed(() => message.value.trim().length);
const bugCharCount = computed(() => bugDescription.value.trim().length);
const featureCharCount = computed(() => featureDescription.value.trim().length);

// Validation helper - message is optional but if provided must be 40-200 chars
const isMessageValid = computed(() => {
  const count = messageCharCount.value;
  return count === 0 || (count >= 40 && count <= 200);
});

// Bug report message is required (40-200 chars)
const isBugValid = computed(() => {
  const count = bugCharCount.value;
  return count >= 40 && count <= 200;
});

// Feature request message is required (40-200 chars)
const isFeatureValid = computed(() => {
  const count = featureCharCount.value;
  return count >= 40 && count <= 200;
});

const canSubmit = computed(() => {
  if (isSubmitting.value) return false;
  if (activeTab.value === 'feedback' || activeTab.value === 'review') {
    return rating.value > 0 && isMessageValid.value;
  }
  if (activeTab.value === 'feature') {
    return isFeatureValid.value;
  }
  return isBugValid.value;
});

function openModal() {
  hints.advance('feedback');
  isOpen.value = true;
  showSuccess.value = false;
}

// Expose open method for external calls (e.g., from mobile footer)
defineExpose({
  open: openModal
});

function closeModal() {
  isOpen.value = false;
  // Reset form after close animation
  setTimeout(() => {
    resetForm();
  }, 300);
}

function resetForm() {
  rating.value = 0;
  hoverRating.value = 0;
  message.value = '';
  bugDescription.value = '';
  featureDescription.value = '';
  activeTab.value = 'feedback';
  showSuccess.value = false;
  showError.value = false;
}

async function submitFeedback() {
  if (isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    // Determine type and scope based on active tab
    const isBug = activeTab.value === 'bug';
    const isFeature = activeTab.value === 'feature';
    const isBookReview = activeTab.value === 'review';

    // Determine message based on tab type
    let feedbackMessage = message.value;
    if (isBug) {
      feedbackMessage = bugDescription.value;
    } else if (isFeature) {
      feedbackMessage = featureDescription.value;
    }

    // Build feedback data for Directus
    const feedbackData: Record<string, unknown> = {
      type: isBug ? 'bug' : isFeature ? 'feature' : 'feedback',
      scope: isBookReview ? 'book' : 'general',
      rating: (!isBug && !isFeature) ? rating.value : null,
      message: feedbackMessage,
      url: window.location.href,
      user_agent: navigator.userAgent
    };

    // Add book reference if this is a book review
    if (isBookReview && bookId.value) {
      feedbackData.book = bookId.value;
    }

    // Send to Directus
    const directusUrl = import.meta.env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
    const response = await fetch(`${directusUrl}/items/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedbackData)
    });

    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.status}`);
    }

    // Show success state
    showSuccess.value = true;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    // Show error state
    showError.value = true;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.feedback-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 900;
}

/* Feedback Toggle Button */
.feedback-toggle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: opacity 0.2s, transform 0.2s, background 0.2s;
}

.feedback-toggle:hover {
  opacity: 1;
  background: var(--primary-hover);
  transform: scale(1.05);
}

.feedback-toggle svg {
  width: 20px;
  height: 20px;
}

/* Feedback Hint Bubble */
.feedback-hint {
  position: absolute;
  bottom: 12px;
  right: 60px;
  background: rgba(31, 41, 55, 0.92);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  z-index: 1;
  animation: feedback-hint-bounce 1.8s ease-in-out infinite;
}

.feedback-hint .hint-arrow {
  position: absolute;
  top: 50%;
  right: -6px;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 6px solid rgba(31, 41, 55, 0.92);
}

@keyframes feedback-hint-bounce {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-4px); }
}

.hint-enter-active,
.hint-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateX(6px);
}

@media (prefers-reduced-motion: reduce) {
  .feedback-hint { animation: none; }
}

/* Modal Backdrop */
.feedback-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1999;
}

/* Modal */
.feedback-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 2000;
}

/* Success State */
.success-state {
  padding: 3rem 2rem;
  text-align: center;
}

.success-icon {
  color: #10B981;
  margin-bottom: 1rem;
}

.success-state h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.5rem 0;
}

.success-state p {
  color: var(--text-light);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
}

/* Error State */
.error-state {
  padding: 3rem 2rem;
  text-align: center;
}

.error-icon {
  color: #EF4444;
  margin-bottom: 1rem;
}

.error-state h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.5rem 0;
}

.error-state p {
  color: var(--text-light);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
}

/* Form State */
.form-state {
  display: flex;
  flex-direction: column;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.close-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-alt);
  color: var(--text);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.close-button:hover {
  background: #E5E7EB;
}

/* Tabs (Desktop) */
.desktop-tabs {
  display: flex;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--border);
}

.mobile-tabs {
  display: none;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.tab-select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  background: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
}

.tab-select:focus {
  outline: none;
  border-color: var(--primary);
}

.tab {
  flex: 1;
  padding: 0.75rem 0.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-light);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.tab-icon {
  flex-shrink: 0;
}

.tab:hover {
  color: var(--text);
}

.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* Form Content */
.form-content {
  padding: 1.5rem;
}

.welcome-text {
  color: var(--text-light);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
}

/* Rating Group */
.rating-group {
  margin-bottom: 1.5rem;
}

.rating-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.75rem;
}

.stars {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.star-button {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #FCD34D;
  transition: transform 0.15s;
}

.star-button:hover {
  transform: scale(1.1);
}

.star-button svg {
  display: block;
}

.star-button svg.filled {
  filter: drop-shadow(0 2px 4px rgba(251, 191, 36, 0.4));
}

.hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Input Group */
.input-group {
  margin-bottom: 1rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.label-row label {
  margin-bottom: 0;
}

.char-counter {
  font-size: 0.75rem;
  font-weight: 600;
}

.char-counter.error {
  color: #EF4444;
}

.input-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.input-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.input-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.input-group textarea::placeholder {
  color: #9CA3AF;
  opacity: 0.7;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid var(--border);
}

.btn-primary,
.btn-secondary {
  flex: 1;
  min-height: 44px;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-alt);
  color: var(--text);
  border: 2px solid var(--border);
}

.btn-secondary:hover {
  background: #E5E7EB;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.95);
}

/* Mobile Optimizations */
@media (max-width: 800px) {
  .feedback-container {
    display: none; /* Hidden on mobile - using footer button instead */
  }

  .feedback-toggle {
    width: 44px;
    height: 44px;
  }

  .feedback-modal {
    width: 100%;
    max-width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    top: 0;
    left: 0;
    transform: none;
  }

  /* Hide desktop tabs, show mobile dropdown */
  .desktop-tabs {
    display: none;
  }

  .mobile-tabs {
    display: block;
  }

  .modal-enter-from,
  .modal-leave-to {
    transform: translateY(100%);
  }

  .modal-enter-active,
  .modal-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .modal-enter-to {
    transform: translateY(0);
  }

  .form-content {
    padding: 1.5rem;
    padding-bottom: 100px; /* Space for fixed actions */
  }

  .modal-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid var(--border);
    padding: 1rem;
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .modal-enter-active,
  .modal-leave-active {
    transition: none;
  }

  .star-button:hover {
    transform: none;
  }

  .feedback-toggle:hover {
    transform: none;
  }
}
</style>
