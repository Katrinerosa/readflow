import { ref, watch } from "vue";
import { directus } from "../lib/directus";
import { readItems } from "@directus/sdk";
import { useReaderStore, type LixLevel } from "../stores/reader";
import i18n from "../i18n";

export interface WordExplanation {
  id: string;
  word: string;
  content: string;
}

interface WordExplanationRaw {
  id: string;
  word: string;
  explanation_easy: string | null;
  explanation_medium: string | null;
  explanation_hard: string | null;
}

const fieldMap: Record<LixLevel, keyof WordExplanationRaw> = {
  easy: "explanation_easy",
  medium: "explanation_medium",
  hard: "explanation_hard",
};

// Singleton state shared across component instances
const explanationCache = new Map<string, WordExplanation | null>();
const pendingUuids = new Set<string>();
const activeExplanation = ref<{
  uuid: string;
  word: string;
  content: string;
  rect: DOMRect;
} | null>(null);

// Track current params for cache invalidation
let cachedLixLevel: LixLevel | null = null;
let cachedLocale: string | null = null;

export function useWordExplanations() {
  const readerStore = useReaderStore();
  const locale = i18n.global.locale;

  // Watch for LIX/locale changes → clear cache
  watch(
    () => readerStore.settings.lixLevel,
    () => {
      if (cachedLixLevel !== readerStore.settings.lixLevel) {
        explanationCache.clear();
        cachedLixLevel = readerStore.settings.lixLevel;
      }
    }
  );

  watch(
    locale,
    () => {
      const currentLocale = typeof locale === "string" ? locale : locale.value;
      if (cachedLocale !== currentLocale) {
        explanationCache.clear();
        cachedLocale = currentLocale;
      }
    }
  );

  function extractUuidsFromHtml(html: string): string[] {
    const regex = /data-word="([a-f0-9-]{36})"/g;
    const uuids: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      uuids.push(match[1]);
    }
    return uuids;
  }

  async function prefetchForPages(pageNumbers: number[]) {
    const pages = readerStore.pages;
    const lixLevel = readerStore.settings.lixLevel;
    const currentLocale =
      typeof locale === "string" ? locale : locale.value;

    // Extract UUIDs from page HTML
    const allUuids: string[] = [];
    for (const num of pageNumbers) {
      const page = pages.find((p) => p.page_number === num);
      if (!page) continue;
      // Pages use same HTML for all lix levels in dynamic pagination
      const html = page.content_lix_easy || page.content_lix_medium || page.content_lix_hard || "";
      allUuids.push(...extractUuidsFromHtml(html));
    }

    // Filter to uncached, non-pending UUIDs
    const toFetch = [...new Set(allUuids)].filter(
      (uuid) => !explanationCache.has(uuid) && !pendingUuids.has(uuid)
    );

    if (toFetch.length === 0) return;

    // Mark as pending
    toFetch.forEach((uuid) => pendingUuids.add(uuid));

    try {
      const results = (await directus.request(
        readItems("word_explanations" as any, {
          filter: {
            _and: [
              { id: { _in: toFetch } },
              { status: { _eq: "published" } },
              { language: { _eq: currentLocale } },
            ],
          },
          fields: [
            "id",
            "word",
            "explanation_easy",
            "explanation_medium",
            "explanation_hard",
          ],
        })
      )) as WordExplanationRaw[];

      // Cache results
      const resultMap = new Map(results.map((r) => [r.id, r]));
      for (const uuid of toFetch) {
        const raw = resultMap.get(uuid);
        if (!raw) {
          explanationCache.set(uuid, null);
          continue;
        }
        const content = raw[fieldMap[lixLevel]] as string | null;
        if (!content) {
          explanationCache.set(uuid, null);
        } else {
          explanationCache.set(uuid, {
            id: raw.id,
            word: raw.word,
            content,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch word explanations:", err);
      // Mark as null so we don't retry
      toFetch.forEach((uuid) => explanationCache.set(uuid, null));
    } finally {
      toFetch.forEach((uuid) => pendingUuids.delete(uuid));
    }
  }

  function getExplanation(uuid: string): WordExplanation | null {
    return explanationCache.get(uuid) ?? null;
  }

  function showExplanation(
    uuid: string,
    explanation: WordExplanation,
    rect: DOMRect
  ) {
    activeExplanation.value = {
      uuid,
      word: explanation.word,
      content: explanation.content,
      rect,
    };
  }

  function hideExplanation() {
    activeExplanation.value = null;
  }

  function hasExplanation(uuid: string): boolean {
    return explanationCache.has(uuid) && explanationCache.get(uuid) !== null;
  }

  function applyExplanationVisibility(container: HTMLElement) {
    const spans = container.querySelectorAll<HTMLElement>(".word-explainable");
    spans.forEach((span) => {
      const uuid = span.getAttribute("data-word");
      if (uuid && explanationCache.has(uuid) && !explanationCache.get(uuid)) {
        span.classList.remove("word-explainable");
      }
    });
  }

  return {
    activeExplanation,
    prefetchForPages,
    getExplanation,
    showExplanation,
    hideExplanation,
    hasExplanation,
    applyExplanationVisibility,
  };
}
