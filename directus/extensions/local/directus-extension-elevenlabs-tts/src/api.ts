import { defineOperationApi } from '@directus/extensions-sdk';
import { Readable } from 'stream';
import Redis from 'ioredis';

const BACKOFF_KEY = 'elevenlabs-tts:quota_backoff';

let redisClient: Redis | null = null;
function getRedis(url: string): Redis {
  if (!redisClient) redisClient = new Redis(url);
  return redisClient;
}

function parseDuration(str: string): number {
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return 86400000;
  const val = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 3600 * 1000;
  return val * 86400 * 1000;
}

interface OperationOptions {
  text: string;
  voiceId: string;
  modelId?: string;
  languageCode?: string;
  title?: string;
  folder?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
  useSpeakerBoost?: boolean;
  extraParams?: Record<string, any>;
  backoffFor?: string;
}

interface WordTiming {
  text: string;
  start: number;
  end: number;
}

interface ElevenLabsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
  normalized_alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

function charsToWords(characters: string[], startTimes: number[]): WordTiming[] {
  const words: WordTiming[] = [];
  let currentChars: string[] = [];
  let currentTimes: number[] = [];

  function flushWord(nextStartTime?: number): void {
    if (currentChars.length === 0) {
      return;
    }

    const text = currentChars.join('');
    const stripped = text.trim();

    if (!stripped) {
      currentChars = [];
      currentTimes = [];
      return;
    }

    const start = currentTimes[0];
    const end = nextStartTime !== undefined ? nextStartTime : currentTimes[currentTimes.length - 1];

    words.push({ text: stripped, start, end });
    currentChars = [];
    currentTimes = [];
  }

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    const t = startTimes[i];

    if (ch === ' ' || ch === '\n') {
      flushWord(t);
    } else {
      currentChars.push(ch);
      currentTimes.push(t);
    }
  }

  // Flush last word
  flushWord();

  return words;
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export default defineOperationApi<OperationOptions>({
  id: 'elevenlabs-tts',
  handler: async (options, context) => {
    const { services, getSchema, accountability, env, logger } = context;
    const { FilesService } = services;

    // Validate required inputs
    if (!options.text) {
      throw new Error('Text is required');
    }
    if (!options.voiceId) {
      throw new Error('Voice ID is required');
    }

    // Get API key from environment
    const apiKey = env['API_KEY_ELEVEN_LABS'] as string;
    if (!apiKey) {
      throw new Error('API_KEY_ELEVEN_LABS environment variable is not set');
    }

    // Check quota backoff
    const redisUrl = env['REDIS'] as string;
    if (redisUrl) {
      const redis = getRedis(redisUrl);
      const backoffUntil = await redis.get(BACKOFF_KEY);
      if (backoffUntil) {
        logger.warn(`ElevenLabs quota backoff active until ${backoffUntil}`);
        return { skipped: true, reason: 'quota_backoff', backoff_until: backoffUntil };
      }
    }

    // Build request body
    const requestBody: Record<string, any> = {
      text: options.text,
      model_id: options.modelId || 'eleven_multilingual_v2',
    };

    // Add language code if provided
    if (options.languageCode) {
      requestBody.language_code = options.languageCode;
    }

    // Add voice settings
    requestBody.voice_settings = {
      stability: options.stability ?? 0.5,
      similarity_boost: options.similarityBoost ?? 0.75,
      style: options.style ?? 0,
      speed: options.speed ?? 1,
      use_speaker_boost: options.useSpeakerBoost ?? true,
    };

    // Merge extra parameters if provided
    if (options.extraParams && typeof options.extraParams === 'object') {
      Object.assign(requestBody, options.extraParams);
    }

    logger.info(`Calling ElevenLabs TTS API for voice ${options.voiceId} with ${options.text.length} characters`);

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes('quota_exceeded') && redisUrl) {
        const backoffMs = parseDuration(options.backoffFor || '1d');
        const backoffUntil = new Date(Date.now() + backoffMs).toISOString();
        const redis = getRedis(redisUrl);
        await redis.set(BACKOFF_KEY, backoffUntil, 'PX', backoffMs);
        logger.error(`ElevenLabs quota exceeded — backoff set until ${backoffUntil}`);
      }
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as ElevenLabsResponse;

    // Extract word timings from alignment data
    const alignment = data.normalized_alignment || data.alignment;
    const wordTimings = charsToWords(
      alignment.characters,
      alignment.character_start_times_seconds
    );

    logger.info(`Generated ${wordTimings.length} word timings`);

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(data.audio_base64, 'base64');

    // Determine filename
    let filename: string;
    if (options.title) {
      const slugifiedName = slugify(options.title);
      filename = `${slugifiedName || 'audio'}.mp3`;
    } else {
      filename = `tts-${Date.now()}.mp3`;
    }

    // Get default storage location
    const storageLocations = (env['STORAGE_LOCATIONS'] as string || 'local').split(',');
    const storage = storageLocations[0].trim();

    // Create readable stream from buffer
    const stream = Readable.from(audioBuffer);

    // Initialize FilesService
    const schema = await getSchema();
    const filesService = new FilesService({
      schema,
      accountability,
    });

    // Prepare file metadata
    const fileData: Record<string, any> = {
      storage,
      filename_download: filename,
      type: 'audio/mpeg',
    };

    if (options.folder) {
      fileData.folder = options.folder;
    }
    if (options.title) {
      fileData.title = options.title;
    }

    logger.info(`Uploading audio file: ${filename} (${audioBuffer.length} bytes)`);

    // Upload the file
    const fileId = await filesService.uploadOne(stream, fileData);

    logger.info(`Audio file uploaded successfully: ${fileId}`);

    // Calculate duration from the last character's end time
    const endTimes = alignment.character_end_times_seconds;
    const duration = endTimes.length > 0 ? endTimes[endTimes.length - 1] : 0;

    // Return comprehensive output
    return {
      id: fileId,
      filename_disk: filename,
      filename_download: filename,
      title: options.title || null,
      type: 'audio/mpeg',
      filesize: audioBuffer.length,
      folder: options.folder || null,
      duration: duration,
      word_timing: wordTimings,
      word_count: wordTimings.length,
      character_count: alignment.characters.length,
    };
  },
});
