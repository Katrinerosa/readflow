import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
  id: 'process-book-content',
  name: 'Process Book Content',
  icon: 'auto_stories',
  description: 'Sanitize HTML, analyze readability, sync block & word audio, inject word explanations',
  overview: ({ book_content_translation }) => [
    {
      label: 'Translation ID',
      text: book_content_translation || 'Not set',
    },
  ],
  options: [
    {
      field: 'book_content_translation',
      name: 'Book Content Translation',
      type: 'string',
      meta: {
        width: 'full',
        interface: 'input',
        note: 'ID of the book_content_translation. The operation fetches content, language, book_content_id, image_settings, and reading_level automatically. Supports {{variable}} syntax.',
        required: true,
      },
    },
    {
      field: 'sanitize_info',
      name: 'HTML Sanitization',
      type: 'alias',
      meta: {
        width: 'full',
        interface: 'presentation-notice',
        options: {
          text: 'Content is sanitized before processing:\n- **Heading normalization**: h2-h6 → h1\n- **Allowed tags**: h1, p, img, em, strong, span\n- **Allowed attributes**: src, data-audio, data-word, target\n- **Empty paragraphs** (whitespace/nbsp/br only) are removed\n\nDisallowed tags are stripped but their text content is preserved.',
        },
      },
    },
  ],
});
