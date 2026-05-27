import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
  id: 'elevenlabs-tts',
  name: 'ElevenLabs Text-to-Speech',
  icon: 'record_voice_over',
  description: 'Generate speech from text using ElevenLabs API with word timing',
  overview: ({ text, voiceId, folder }) => [
    { label: 'Text', text: text ? (text.length > 30 ? text.substring(0, 30) + '...' : text) : 'Not set' },
    { label: 'Voice', text: voiceId || 'Default' },
    { label: 'Folder', text: folder || 'Root' },
  ],
  options: [
    {
      field: 'text',
      name: 'Text',
      type: 'text',
      meta: {
        width: 'full',
        interface: 'input-multiline',
        note: 'Text to convert to speech. Supports {{variable}} syntax.',
      },
    },
    {
      field: 'voiceId',
      name: 'Voice ID',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'ElevenLabs voice ID. Supports {{variable}} syntax.',
      },
    },
    {
      field: 'modelId',
      name: 'Model ID',
      type: 'string',
      schema: {
        default_value: 'eleven_multilingual_v2',
      },
      meta: {
        width: 'half',
        interface: 'select-dropdown',
        options: {
          choices: [
            { text: 'Eleven Multilingual v2', value: 'eleven_multilingual_v2' },
            { text: 'Eleven Turbo v2.5', value: 'eleven_turbo_v2_5' },
            { text: 'Eleven Turbo v2', value: 'eleven_turbo_v2' },
            { text: 'Eleven Monolingual v1', value: 'eleven_monolingual_v1' },
          ],
        },
        note: 'ElevenLabs model to use.',
      },
    },
    {
      field: 'languageCode',
      name: 'Language Code',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'select-dropdown',
        options: {
          choices: [
            { text: 'Auto-detect', value: '' },
            { text: 'Danish (da)', value: 'da' },
            { text: 'English (en)', value: 'en' },
            { text: 'German (de)', value: 'de' },
            { text: 'Spanish (es)', value: 'es' },
            { text: 'French (fr)', value: 'fr' },
            { text: 'Italian (it)', value: 'it' },
            { text: 'Dutch (nl)', value: 'nl' },
            { text: 'Polish (pl)', value: 'pl' },
            { text: 'Portuguese (pt)', value: 'pt' },
            { text: 'Swedish (sv)', value: 'sv' },
            { text: 'Norwegian (no)', value: 'no' },
          ],
          allowOther: true,
        },
        note: 'Language code for pronunciation. Leave empty for auto-detect.',
      },
    },
    {
      field: 'title',
      name: 'File Title',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Title for the audio file (also used as filename). Supports {{variable}} syntax.',
      },
    },
    {
      field: 'folder',
      name: 'Target Folder',
      type: 'uuid',
      meta: {
        width: 'half',
        interface: 'system-folder',
        note: 'Target folder in Directus assets. Leave empty for root.',
      },
    },
    {
      field: 'stability',
      name: 'Stability',
      type: 'float',
      schema: {
        default_value: 0.5,
      },
      meta: {
        width: 'half',
        interface: 'slider',
        options: {
          min: 0,
          max: 1,
          step: 0.01,
        },
        note: 'Voice stability (0-1). Higher = more consistent.',
      },
    },
    {
      field: 'similarityBoost',
      name: 'Similarity Boost',
      type: 'float',
      schema: {
        default_value: 0.75,
      },
      meta: {
        width: 'half',
        interface: 'slider',
        options: {
          min: 0,
          max: 1,
          step: 0.01,
        },
        note: 'Similarity boost (0-1). Higher = more similar to original voice.',
      },
    },
    {
      field: 'style',
      name: 'Style',
      type: 'float',
      schema: {
        default_value: 0,
      },
      meta: {
        width: 'half',
        interface: 'slider',
        options: {
          min: 0,
          max: 1,
          step: 0.01,
        },
        note: 'Style exaggeration (0-1). Higher = more expressive.',
      },
    },
    {
      field: 'speed',
      name: 'Speed',
      type: 'float',
      schema: {
        default_value: 1,
      },
      meta: {
        width: 'half',
        interface: 'slider',
        options: {
          min: 0.5,
          max: 2,
          step: 0.05,
        },
        note: 'Speech speed (0.5-2). Default is 1.',
      },
    },
    {
      field: 'useSpeakerBoost',
      name: 'Speaker Boost',
      type: 'boolean',
      schema: {
        default_value: true,
      },
      meta: {
        width: 'half',
        interface: 'boolean',
        note: 'Enhance voice clarity and likeness.',
      },
    },
    {
      field: 'extraParams',
      name: 'Extra Parameters',
      type: 'json',
      meta: {
        width: 'full',
        interface: 'input-code',
        options: {
          language: 'json',
          template: JSON.stringify({
            seed: 0,
            previous_text: '',
            next_text: '',
            apply_text_normalization: 'auto',
          }, null, 2),
        },
        note: 'Additional API parameters (JSON). Will be merged into request body. Example: {"seed": 123, "previous_text": "...", "next_text": "...", "apply_text_normalization": "auto"}',
      },
    },
    {
      field: 'backoffFor',
      name: 'Quota Backoff Duration',
      type: 'string',
      schema: {
        default_value: '1d',
      },
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Duration to pause after quota error (e.g. 1h, 6h, 1d)',
      },
    },
  ],
});
