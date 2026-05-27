import { defineHook } from '@directus/extensions-sdk';
import { sanitizeHtml } from './sanitize.js';

export default defineHook(({ filter }, { logger }) => {
  const COLLECTION = 'book_content_translations';

  filter(`${COLLECTION}.items.create`, (payload: Record<string, unknown>) => {
    if (typeof payload['content'] === 'string') {
      const before = payload['content'];
      payload['content'] = sanitizeHtml(before);
      if (payload['content'] !== before) {
        logger.info(`[sanitize-content] Cleaned HTML on create`);
      }
    }
    return payload;
  });

  filter(`${COLLECTION}.items.update`, (payload: Record<string, unknown>) => {
    if (typeof payload['content'] === 'string') {
      const before = payload['content'];
      payload['content'] = sanitizeHtml(before);
      if (payload['content'] !== before) {
        logger.info(`[sanitize-content] Cleaned HTML on update`);
      }
    }
    return payload;
  });
});
