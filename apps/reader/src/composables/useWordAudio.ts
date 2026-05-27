import { directus } from "../lib/directus";
import { readItems } from "@directus/sdk";
import { useReaderStore } from "../stores/reader";
import i18n from "../i18n";

// word:lang -> audio file ID (or null if not found in Directus)
const wordAudioCache = new Map<string, string | null>();

// audio file ID -> decoded AudioBuffer (one decode per file, replays are free)
const bufferCache = new Map<string, AudioBuffer>();

// In-flight loads so concurrent calls don't double-fetch the same file
const bufferLoading = new Map<string, Promise<AudioBuffer>>();

const playbackQueue: string[] = [];
let isProcessing = false;

let audioCtx: AudioContext | null = null;
let keepWarmStarted = false;

// Must be called synchronously inside a user-gesture handler the first time,
// otherwise the autoplay policy will leave the context suspended.
function getCtx(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

// Continuous keep-warm: one full cycle of a 1Hz sine wave at ~-42dB,
// looped sample-accurately via native AudioBufferSourceNode.loop.
//
// Why this defeats Chrome's auto-suspend:
//   Chrome marks a tab as "playing audio" only when the actual sample level
//   reaching the destination is above ~-45dB. Below that threshold the tab
//   indicator goes off, the OS audio output device is suspended for the tab,
//   and the next playback hits a 50-150ms cold-start that clips word onsets.
//   -42dB is just above the threshold.
//
// Why no clicks:
//   sin(0) = sin(2π) = 0, so the buffer starts and ends at exactly 0. Native
//   AudioBufferSourceNode looping is sample-accurate, so the loop boundary
//   has zero discontinuity. Howler's loop, by contrast, restarts the source
//   per iteration and produces an audible pop.
//
// Why inaudible:
//   1Hz is well below the ~20Hz lower bound of human hearing, so even at
//   -42dB peak there's nothing to hear — speakers can't reproduce it as
//   sound, only as cone movement.
function startKeepWarm(ctx: AudioContext): void {
  if (keepWarmStarted) return;
  const sr = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sr, sr); // 1 second = 1 full cycle of 1Hz
  const channel = buffer.getChannelData(0);
  const amplitude = 0.008;
  for (let i = 0; i < channel.length; i++) {
    channel[i] = amplitude * Math.sin((2 * Math.PI * i) / channel.length);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(ctx.destination);
  source.start(0);
  keepWarmStarted = true;
}

// Call inside a user-gesture handler when the reader mounts. Creates the
// AudioContext (which the autoplay policy requires happen in a gesture)
// and starts the continuous keep-warm signal that prevents Chrome from
// suspending the tab's audio output.
export function warmupAudio(): void {
  const ctx = getCtx();
  startKeepWarm(ctx);
}

function cacheKey(word: string, language: string): string {
  return `${word}:${language}`;
}

async function fetchWordAudio(
  word: string,
  language: string
): Promise<string | null> {
  const normalized = word
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!normalized) return null;
  const key = cacheKey(normalized, language);

  if (wordAudioCache.has(key)) {
    return wordAudioCache.get(key)!;
  }

  try {
    const results = (await directus.request(
      readItems("word_audio" as any, {
        filter: {
          text_content: { _eq: normalized },
          language: { _eq: language },
        },
        fields: ["audio_file"],
        limit: 1,
      })
    )) as { audio_file: string | null }[];

    const audioFileId = results[0]?.audio_file ?? null;
    wordAudioCache.set(key, audioFileId);
    return audioFileId;
  } catch (err) {
    console.error("Failed to fetch word audio:", err);
    wordAudioCache.set(key, null);
    return null;
  }
}

async function loadBuffer(audioFileId: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(audioFileId);
  if (cached) return cached;

  const inFlight = bufferLoading.get(audioFileId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const readerStore = useReaderStore();
    const url = readerStore.getImageUrl(audioFileId);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await getCtx().decodeAudioData(arrayBuffer);
    bufferCache.set(audioFileId, buffer);
    bufferLoading.delete(audioFileId);
    return buffer;
  })();

  bufferLoading.set(audioFileId, promise);
  return promise;
}

function playBuffer(buffer: AudioBuffer): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => resolve();
    source.start(0);
  });
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  while (playbackQueue.length > 0) {
    const id = playbackQueue.shift()!;
    try {
      const buffer = await loadBuffer(id);
      await playBuffer(buffer);
    } catch (err) {
      console.error("Word audio playback error:", err);
    }
  }
  isProcessing = false;
}

export function useWordAudio() {
  const locale = i18n.global.locale;

  function getCurrentLocale(): string {
    return typeof locale === "string" ? locale : locale.value;
  }

  async function playWord(word: string): Promise<void> {
    // Touch the AudioContext synchronously while we still hold the user-gesture
    // activation. Awaiting the Directus fetch first would lose it on first
    // click and leave the context suspended.
    getCtx();

    const audioFileId = await fetchWordAudio(word, getCurrentLocale());
    if (!audioFileId) return;
    playbackQueue.push(audioFileId);
    void processQueue();
  }

  return { playWord };
}
