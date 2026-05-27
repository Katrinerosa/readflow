import { createDirectus, rest, readItems } from "@directus/sdk";

// Use DIRECTUS_URL for server-side API calls (internal Docker network)
// Falls back to PUBLIC_DIRECTUS_URL for development, then localhost
const directusUrl =
  typeof process !== "undefined" && process.env.DIRECTUS_URL
    ? process.env.DIRECTUS_URL
    : typeof process !== "undefined" && process.env.PUBLIC_DIRECTUS_URL
      ? process.env.PUBLIC_DIRECTUS_URL
      : import.meta.env.PUBLIC_DIRECTUS_URL || "http://localhost:8055";

export const directus = createDirectus(directusUrl).with(rest());

// Type definitions for your collections
export interface Author {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  photo?: string;
  date_created: string;
  date_updated: string;
}

export interface Book {
  id: string;
  status: string;
  title: string;
  slug: string;
  description?: string;
  cover_image?: string;
  author_id?: string | Author;
  author?: string | Author; // Support both field names
  date_created: string;
  date_updated: string;
}


// Helper to check if book has complete translations for a language
export async function hasCompleteBookTranslations(bookId: string, languageCode: string): Promise<boolean> {
  try {
    const translations = await directus.request(
      readItems("books_translations", {
        filter: {
          _and: [
            { books_id: { _eq: bookId } },
            { languages_code: { _eq: languageCode } }
          ]
        },
        limit: 1,
      })
    );

    if (!translations || translations.length === 0) return false;

    const trans = translations[0];
    // Check if all required fields are filled (not null and not empty string)
    return !!(trans.description && trans.excerpt && trans.instruction && trans.final_words);
  } catch (e) {
    console.error("Error checking book translations:", e);
    return false;
  }
}

// Helper to check if book has content with translations for a language
export async function hasCompleteContentTranslations(bookId: string, languageCode: string): Promise<boolean> {
  try {
    // Get all book_content entries for the book
    const bookContents = await directus.request(
      readItems("book_content", {
        filter: { book: { _eq: bookId } },
        fields: ["id"],
      })
    );

    if (!bookContents || bookContents.length === 0) return false;

    // Get all content translations for this language with published status
    const contentIds = bookContents.map((c: any) => c.id);
    const contentTranslations = await directus.request(
      readItems("book_content_translations", {
        filter: {
          _and: [
            { book_content_id: { _in: contentIds } },
            { languages_code: { _eq: languageCode } },
            { status: { _eq: "published" } }
          ]
        },
      })
    );

    // Check that we have at least one published translation
    return contentTranslations.length > 0;
  } catch (e) {
    console.error("Error checking content translations:", e);
    return false;
  }
}

// Helper to check if book is available in a language (book + content translated)
export async function isBookAvailableInLanguage(bookId: string, languageCode: string): Promise<boolean> {
  const [hasBookTranslations, hasContentTranslations] = await Promise.all([
    hasCompleteBookTranslations(bookId, languageCode),
    hasCompleteContentTranslations(bookId, languageCode)
  ]);

  return hasBookTranslations && hasContentTranslations;
}

// Helper functions
export async function getPublishedBooks() {
  return await directus.request(
    readItems("books", {
      filter: { status: { _eq: "published" } },
      sort: ["-date_created"],
      fields: ["*", "author.*"],
    })
  );
}

export async function getBookByAuthorAndSlug(authorSlug: string, bookSlug: string) {
  const books = await directus.request(
    readItems("books", {
      filter: {
        _and: [
          { slug: { _eq: bookSlug } },
          { status: { _eq: "published" } },
        ],
      },
      limit: 1,
      fields: ["*", "author.*"],
    })
  );

  // Filter by author slug in code since nested filter may not work
  const filteredBooks = books.filter((book: any) => {
    const author = book.author_id || book.author;
    return author && typeof author === 'object' && author.slug === authorSlug;
  });

  return filteredBooks[0] || null;
}

// Legacy function for backwards compatibility
export async function getBookBySlug(slug: string) {
  const books = await directus.request(
    readItems("books", {
      filter: { slug: { _eq: slug }, status: { _eq: "published" } },
      limit: 1,
      fields: ["*", "author.*"],
    })
  );
  return books[0] || null;
}

