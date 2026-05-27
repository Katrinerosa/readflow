# Web (Astro SSR)

The public-facing website. Astro 4 with the Node adapter, rendered server-side. Reads from Directus over the REST API.

## URL pattern

Routes are localised — each supported language has its own URL slug for "books" and "about":

```
/                        Redirects to /:lang based on Accept-Language
/:lang                   Homepage (hero video, "how it works", featured books)
/:lang/books             Book catalogue   (en)
/:lang/boeger            same             (da)
/:lang/bucher            same             (de)
/:lang/books/:author              Author page
/:lang/books/:author/:book        Book detail
/:lang/about | /:lang/om | /:lang/uber    About page
/reader/*                Proxied to the Vue reader (Vite dev or built static files)
/api/health              Returns 200 if the app is up
/api/donations/summary   Internal donations summary endpoint
```

Languages currently shipped: `en`, `da`, `de`.

## Source layout

```
apps/web/src/
├── pages/                     File-based routing (see URL pattern above)
│   ├── [lang]/                Localised pages
│   ├── api/                   API endpoints
│   └── reader/                Reader entry — proxies in dev, serves static in prod
├── layouts/Layout.astro       Shared HTML shell
├── components/                Astro components (BookCard, LanguageSwitcher, Supporters)
├── lib/
│   ├── directus.ts            Directus client (uses PUBLIC_DIRECTUS_URL)
│   ├── i18n.ts                Translation lookup
│   ├── routes.ts              Localised route helpers
│   └── html-utils.ts          HTML sanitisation / extraction
└── middleware.ts              Proxies /reader/* to Vite in dev
```

## Reader integration

Two modes:

| Mode | How /reader/* is served |
|---|---|
| Dev (`make up` / `make start`) | `middleware.ts` proxies to the Vite dev server at `http://reader:5173` inside the Docker network. |
| Prod (`docker compose -f docker-compose.yml up -d --build`) | Reader built statically into `apps/web/dist/client/reader/`, served by Astro. |

You don't need to do anything special — both modes work out of the box.

## Directus URL

Astro reads `PUBLIC_DIRECTUS_URL` at build time and uses it at runtime. In Docker, `docker-compose.yml` and `docker-compose.dev.yml` set it to `http://directus:8055` (the internal Docker network hostname). The reader uses a different value (`http://localhost:8055`) because it runs in the browser; see `docs/reader.md`.

## Build

```
pnpm -C apps/reader build           Vue → apps/reader/dist
node apps/web/scripts/copy-reader.js  copies dist → apps/web/public/reader/
pnpm -C apps/web build              Astro → apps/web/dist
```

`apps/web/Dockerfile` runs all three inside Docker. Production output is a Node SSR app that listens on `PORT=3000`.

---

See also: `docs/reader.md`, `docs/directus.md`, `docs/development.md`.
