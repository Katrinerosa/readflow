import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
  id: 'find-content-by-words',
  name: 'Find Content By Words',
  icon: 'search',
  description:
    'Returns IDs of book_content_translations whose unique_words contain any of the given words.',
  overview: ({ words, language, published_only }) => [
    {
      label: 'Words',
      text: Array.isArray(words)
        ? (words as string[]).join(', ')
        : (typeof words === 'string' ? words : 'Not set'),
    },
    { label: 'Language', text: language || 'any' },
    { label: 'Published only', text: published_only === false ? 'no' : 'yes' },
  ],
  options: [
    {
      field: 'words',
      name: 'Words',
      type: 'json',
      meta: {
        width: 'full',
        interface: 'tags',
        note: 'Words to look up in unique_words. Accepts an array, comma/newline-separated string, or {{var}} reference.',
        required: true,
      },
    },
    {
      field: 'language',
      name: 'Language Code',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Optional. Restricts to a single languages_code (e.g. da, en, de).',
      },
    },
    {
      field: 'published_only',
      name: 'Published Only',
      type: 'boolean',
      schema: { default_value: true },
      meta: {
        width: 'half',
        interface: 'boolean',
      },
    },
  ],
});
