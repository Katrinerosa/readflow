import { defineMiddleware } from "astro:middleware";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageFromPath } from "./lib/i18n";

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // In development, proxy /reader/* requests to the Vite dev server
  if (
    import.meta.env.MODE === "development" &&
    pathname.startsWith("/reader/")
  ) {
    try {
      const readerUrl = `http://reader:5173${pathname}${context.url.search}`;
      const response = await fetch(readerUrl, {
        method: context.request.method,
        headers: context.request.headers,
      });

      // Return the proxied response
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.error("Failed to proxy to reader dev server:", error);
      // Fall through to normal handling
    }
  }

  // Handle language detection and redirects
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  // If path starts with a language code, store it in locals
  if (firstSegment && SUPPORTED_LANGUAGES.includes(firstSegment as any)) {
    context.locals.lang = firstSegment;
  } else {
    // If no language in path and not accessing static assets or reader
    if (!pathname.startsWith('/_') && !pathname.startsWith('/reader/')) {
      // Check for stored language preference in cookie
      const storedLang = context.cookies.get('app-language')?.value;
      const targetLang = (storedLang && SUPPORTED_LANGUAGES.includes(storedLang as any))
        ? storedLang
        : DEFAULT_LANGUAGE;

      // Redirect to preferred or default language (including root path)
      const targetPath = pathname === '/' ? `/${targetLang}` : `/${targetLang}${pathname}`;
      return context.redirect(targetPath, 302);
    }
    context.locals.lang = DEFAULT_LANGUAGE;
  }

  return next();
});
