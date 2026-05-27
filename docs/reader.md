# Reader (Vue 3 SPA)

The page-flip book reader. Built with Vue 3 + Pinia + Vue Router + Vite, plus the `page-flip` library for the animation. Served by the Astro web app under `/reader/*`.

The reader runs entirely in the browser — there is no server-side rendering. It talks to Directus over the REST API.

## URL pattern

```
/:lang/:bookPath+/level/:level/page/:pageNumber
/:lang/:bookPath+/page/:pageNumber
/:lang/:bookPath+

Example: /da/katrine-beck/drommernes-hus-bog-2-zombien-i-skolegarden/page/3
```

The `bookPath` segment captures the localised author + book slugs. The reader resolves them to a `book_content` row based on the current `:level` (defaults to `medium`).

## Source layout

```
apps/reader/src/
├── main.ts                       Entry point
├── App.vue                       Root component
├── router/index.ts               Vue Router config
├── stores/reader.ts              Pinia store (book + settings state)
├── views/ReaderView.vue          Main reader view
├── components/
│   ├── TwoPageSpread.vue         Page-flip surface
│   ├── BookPage.vue              Single page rendering
│   ├── AudioControls.vue         Per-paragraph audio playback
│   ├── SettingsPanel.vue         Accessibility settings drawer
│   ├── FeedbackButton.vue        In-reader feedback
│   └── WordExplanationPopover.vue   Ordforklaring popover
├── composables/                  Reusable Vue composables
├── i18n/                         UI strings
├── lib/                          Directus client + helpers
└── style.css
```

Static fonts (Atkinson Hyperlegible, OpenDyslexic) live in `apps/reader/public/fonts/`.

## Directus URL

The reader uses `import.meta.env.PUBLIC_DIRECTUS_URL`, defined in `apps/reader/vite.config.ts`. In Docker this is set to `http://localhost:8055` because the reader runs in the user's browser — Docker hostnames like `http://directus:8055` are unreachable from there.

## Build

In production, the reader is built first and copied into `apps/web/public/reader/`, then Astro builds and serves it as static files. The full chain is:

```
pnpm -C apps/reader build
node apps/web/scripts/copy-reader.js
pnpm -C apps/web build
```

`apps/web/Dockerfile` runs all three steps inside Docker. You only need to invoke them manually if iterating outside Docker.

## Accessibility settings

The reader's settings panel writes to `localStorage`:

- Font family (Atkinson Hyperlegible / OpenDyslexic / system)
- Text size (80–150 %)
- Line spacing (1.4–2.5)
- Background colour (white / cream)
- LIX reading level (easy / medium / hard) — also reflected in the URL

Settings persist across reloads.

---

See also: `docs/development.md`, `docs/web.md`, `docs/directus.md`.
