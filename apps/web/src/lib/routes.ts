import type { Language } from "./i18n";

// Route names (logical routes used in code)
export type RouteName = "home" | "books" | "about" | "book" | "author";

// Route configuration: maps route names to localized URL segments
export const routes: Record<RouteName, Record<Language, string>> = {
  home: {
    en: "",
    da: "",
    de: "",
  },
  books: {
    en: "books",
    da: "boeger",
    de: "bucher",
  },
  about: {
    en: "about",
    da: "om",
    de: "uber",
  },
  book: {
    en: "books",
    da: "boeger",
    de: "bucher",
  },
  author: {
    en: "books",
    da: "boeger",
    de: "bucher",
  },
};

/**
 * Generate a localized URL for a given route
 * @param lang - The language code
 * @param route - The route name
 * @param params - Optional parameters for dynamic routes (e.g., author slug, book slug)
 * @returns The localized URL path
 */
export function localizedRoute(
  lang: Language,
  route: RouteName,
  params?: { author?: string; book?: string; page?: number }
): string {
  const basePath = `/${lang}`;
  const routeSegment = routes[route][lang];

  if (route === "home") {
    return basePath;
  }

  if (route === "books" || route === "about") {
    return `${basePath}/${routeSegment}`;
  }

  if (route === "author" && params?.author) {
    return `${basePath}/${routeSegment}/${params.author}`;
  }

  if (route === "book" && params?.author && params?.book) {
    return `${basePath}/${routeSegment}/${params.author}/${params.book}`;
  }

  // Fallback
  return basePath;
}

/**
 * Get the current route name from a URL path
 * @param pathname - The URL pathname
 * @param lang - The language code
 * @returns The route name or null if not found
 */
export function getRouteNameFromPath(
  pathname: string,
  lang: Language
): RouteName | null {
  // Remove leading/trailing slashes and split
  const segments = pathname.replace(/^\/|\/$/g, "").split("/");

  // Remove language segment
  if (segments[0] === lang) {
    segments.shift();
  }

  if (segments.length === 0) {
    return "home";
  }

  const firstSegment = segments[0];

  // Check each route
  for (const [routeName, translations] of Object.entries(routes)) {
    if (translations[lang] === firstSegment) {
      // Determine if it's books list or a specific book/author
      if (routeName === "books") {
        if (segments.length === 1) {
          return "books";
        } else if (segments.length === 2) {
          return "author";
        } else if (segments.length >= 3) {
          return "book";
        }
      }
      return routeName as RouteName;
    }
  }

  return null;
}
