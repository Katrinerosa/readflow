import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
  id: 'base64-upload',
  name: 'Base64 File Upload',
  icon: 'cloud_upload',
  description: 'Upload a base64 encoded file to Directus assets',
  overview: ({ title, folder }) => [
    { label: 'Title', text: title || 'Auto' },
    { label: 'Folder', text: folder || 'Root' },
  ],
  options: [
    {
      field: 'base64Data',
      name: 'Base64 Data',
      type: 'string',
      meta: {
        width: 'full',
        interface: 'input-multiline',
        note: 'Base64 string (with or without data URI prefix). Supports {{variable}} syntax.',
      },
    },
    {
      field: 'title',
      name: 'File Title',
      type: 'string',
      meta: {
        width: 'half',
        interface: 'input',
        note: 'Title for the file (also used as filename). Supports {{variable}} syntax.',
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
  ],
});
