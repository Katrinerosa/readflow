import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const bookId = url.searchParams.get("book_id");

  if (!bookId) {
    return new Response(JSON.stringify({ error: "book_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TODO: Implement actual donation tracking
  // This would query your donation records from Directus or a separate table
  // For now, returning mock data

  const summary = {
    book_id: bookId,
    total_donations: 0,
    total_amount: 0,
    recent_donations: [],
  };

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
};
