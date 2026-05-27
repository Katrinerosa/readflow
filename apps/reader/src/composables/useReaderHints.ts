import { ref, computed, readonly } from 'vue';

export type HintStep = 'settings' | 'chapters' | 'fullscreen' | 'feedback' | 'done';

const STORAGE_KEY = 'readflow-hint-step';
const LEGACY_KEYS = [
  'readflow-hint-settings-dismissed',
  'readflow-hint-feedback-dismissed',
];

const ORDER: HintStep[] = ['settings', 'chapters', 'fullscreen', 'feedback', 'done'];

function load(): HintStep {
  try {
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    const v = localStorage.getItem(STORAGE_KEY) as HintStep | null;
    if (v && ORDER.includes(v)) return v;
  } catch {}
  return 'settings';
}

const currentStep = ref<HintStep>(load());
const hasChapters = ref(false);
// One hint per visit: show the current step on mount, hide all after first dismissal
// in this visit. Reset by resetVisit() (called by ReaderView on each book load).
const dismissedThisVisit = ref(false);

function persist(step: HintStep) {
  try { localStorage.setItem(STORAGE_KEY, step); } catch {}
}

function nextStep(from: HintStep): HintStep {
  const i = ORDER.indexOf(from);
  let next = ORDER[i + 1] ?? 'done';
  if (next === 'chapters' && !hasChapters.value) next = nextStep('chapters');
  return next;
}

export function useReaderHints() {
  function setHasChapters(v: boolean) {
    hasChapters.value = v;
    if (currentStep.value === 'chapters' && !v) advance('chapters');
  }

  function advance(from: HintStep) {
    if (currentStep.value !== from) return;
    const next = nextStep(from);
    currentStep.value = next;
    persist(next);
    dismissedThisVisit.value = true;
  }

  function resetVisit() {
    dismissedThisVisit.value = false;
    // Re-read persisted step so other tabs / prior dismissals are reflected.
    currentStep.value = load();
  }

  function isActive(step: HintStep) {
    return computed(() => currentStep.value === step && !dismissedThisVisit.value);
  }

  return {
    currentStep: readonly(currentStep),
    dismissedThisVisit: readonly(dismissedThisVisit),
    setHasChapters,
    advance,
    resetVisit,
    isActive,
  };
}
