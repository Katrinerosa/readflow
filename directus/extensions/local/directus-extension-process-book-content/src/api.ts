import { defineOperationApi } from '@directus/extensions-sdk';
import { analyzeBookContent } from './analyze';
import { extractBlocks, injectDataAudioAttributes, syncBlockAudio } from './block-audio';
import { sanitizeHtml, DEFAULT_ALLOWED_TAGS, DEFAULT_ALLOWED_ATTRS } from './sanitize';
import { extractWords, syncWordAudio } from './word-audio';
import { stripWordExplanationSpans, injectWordExplanationSpans, fetchWordExplanations } from './word-explanations';

interface OperationOptions {
  book_content_translation: string;
}

export default defineOperationApi<OperationOptions>({
  id: 'process-book-content',
  handler: async (options, context) => {
    const { logger, getSchema, services } = context;
    const { ItemsService } = services;

    // Validate required input
    if (!options.book_content_translation) {
      throw new Error('Book Content Translation ID is required');
    }

    const bookContentTranslation = options.book_content_translation.trim();

    // Fetch all needed data from the translation record
    const schema = await getSchema();
    const translationsService = new ItemsService('book_content_translations', {
      schema,
      knex: context.database,
      accountability: { admin: true },
    });

    const record = await translationsService.readOne(bookContentTranslation, {
      fields: ['content', 'languages_code', 'book_content_id'],
    });

    if (!record?.content) throw new Error('Translation record missing content');
    if (!record.book_content_id) throw new Error('Translation record missing book_content_id');

    const content = record.content as string;
    const language = record.languages_code as string;
    const bookContentId = record.book_content_id as string;

    // Fetch book_content separately to avoid nested relational query issues
    const bookContentService = new ItemsService('book_content', {
      schema,
      knex: context.database,
      accountability: { admin: true },
    });

    const bookContent = await bookContentService.readOne(bookContentId, {
      fields: ['id', 'image_settings.directus_files_id', 'reading_level'],
    });

    const existingImageSettings = bookContent.image_settings || [];
    const targetReadingLevel = bookContent.reading_level as string | undefined;

    // Step 0: Sanitize HTML (normalize headings, filter tags/attrs, remove empty paragraphs)
    const cleanContent = sanitizeHtml(content, {
      allowedTags: DEFAULT_ALLOWED_TAGS,
      allowedAttrs: DEFAULT_ALLOWED_ATTRS,
    });

    logger.info(
      `Processing book content: ${cleanContent.length} chars (${content.length} raw), ` +
      `language=${language}, book_content_id=${bookContentId}`
    );

    // Step 1: Analyze content (pure, no DB)
    const analysis = analyzeBookContent(
      cleanContent,
      bookContentId,
      existingImageSettings,
      targetReadingLevel
    );

    logger.info(
      `Analysis: ${analysis.book_content_translation.word_count} words, ` +
      `LIX=${analysis.book_content_translation.lix}, ` +
      `LET=${analysis.book_content_translation.lettal}, ` +
      `level=${analysis.book_content_translation.reading_level}`
    );

    // Step 2: Extract blocks from HTML
    const blocks = extractBlocks(cleanContent);

    logger.info(`Blocks: ${blocks.length} found`);

    const audioService = new ItemsService('book_content_audio', {
      schema,
      knex: context.database,
      accountability: { admin: true },
    });
    const wordAudioService = new ItemsService('word_audio', {
      schema,
      knex: context.database,
      accountability: { admin: true },
    });
    const wordExplanationsService = new ItemsService('word_explanations', {
      schema,
      knex: context.database,
      accountability: { admin: true },
    });

    // Step 3: Sync block audio entries
    let blockResult = { audioMap: new Map<string, string>(), blocks_created: 0, blocks_removed: 0, blocks_kept: 0 };
    if (blocks.length > 0) {
      blockResult = await syncBlockAudio({
        blocks,
        language,
        bookContentTranslation,
        audioService,
      });
    }

    logger.info(
      `Block audio: ${blockResult.blocks_created} created, ` +
      `${blockResult.blocks_removed} removed, ${blockResult.blocks_kept} kept`
    );

    // Step 4: Inject data-audio attributes into HTML
    const modifiedContent = blocks.length > 0
      ? injectDataAudioAttributes(cleanContent, blockResult.audioMap)
      : cleanContent;

    // Step 5: Extract words and sync word audio
    const words = extractWords(cleanContent);
    let wordResult = { words_existing: 0, words_created: 0, created_ids: [] as string[] };
    if (words.length > 0) {
      wordResult = await syncWordAudio({
        words,
        language,
        wordAudioService,
      });
    }

    logger.info(
      `Word audio: ${words.length} unique words, ` +
      `${wordResult.words_existing} existing, ${wordResult.words_created} created`
    );

    // Step 6: Fetch word explanations for this language
    const wordExplanations = await fetchWordExplanations(language, wordExplanationsService);

    logger.info(`Word explanations: ${wordExplanations.length} fetched for language=${language}`);

    // Step 7: Strip existing word explanation spans, then inject fresh ones
    let finalContent = modifiedContent;
    let wordExplanationResult = { explanations_matched: 0, spans_injected: 0 };

    if (wordExplanations.length > 0) {
      finalContent = stripWordExplanationSpans(finalContent);
      const injectionResult = injectWordExplanationSpans(finalContent, wordExplanations);
      finalContent = injectionResult.html;
      wordExplanationResult = {
        explanations_matched: injectionResult.explanations_matched,
        spans_injected: injectionResult.spans_injected,
      };

      logger.info(
        `Word explanations: ${wordExplanationResult.explanations_matched} matched, ` +
        `${wordExplanationResult.spans_injected} spans injected`
      );
    }

    // Step 8: Return combined result
    return {
      book_content_translation: {
        ...analysis.book_content_translation,
        content_output: finalContent,
        unique_words: words,
      },
      book_content: analysis.book_content,
      block_audio: {
        blocks_found: blocks.length,
        blocks_created: blockResult.blocks_created,
        blocks_removed: blockResult.blocks_removed,
        blocks_kept: blockResult.blocks_kept,
      },
      word_audio: {
        words_found: words.length,
        words_existing: wordResult.words_existing,
        words_created: wordResult.words_created,
        created_ids: wordResult.created_ids,
      },
      word_explanations: {
        total_fetched: wordExplanations.length,
        explanations_matched: wordExplanationResult.explanations_matched,
        spans_injected: wordExplanationResult.spans_injected,
      },
    };
  },
});
