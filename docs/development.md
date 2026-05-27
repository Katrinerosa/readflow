# Development

For making code changes to the Vue reader, the Astro web app, or Directus extensions.

## Start

```bash
make start      # first time only: build + apply schema
make restore    # first time only: load production data
make up         # subsequent runs: just bring the stack up
```

This runs the dev overlay, which mounts source code as volumes and runs Vite + Astro dev servers with hot reload.

Use `dc` as a shell alias for ad-hoc commands so you never miss the dev overlay:

```bash
alias dc='docker compose -f docker-compose.yml -f docker-compose.dev.yml'
```

## What hot-reloads

| Change | Result |
|---|---|
| `apps/reader/src/**` (Vue components, stores, etc.) | Vite HMR — browser updates instantly |
| `apps/web/src/**` (Astro pages, layouts, components) | Astro hot reload — page reloads |
| `apps/reader/vite.config.ts` or `apps/web/astro.config.mjs` | Requires `dc restart reader` / `dc restart web` |
| `package.json` (any), Dockerfile, new dependency | Requires `dc up -d --build <service>` |

## Common commands

```bash
make logs                # tail all services
dc logs -f web           # one service only
dc restart web           # restart one service
dc exec web sh           # shell into a container
dc exec web pnpm --filter web-astro add <pkg>   # add a dependency
```

## Architecture in dev mode

```
Browser  →  web (Astro :3000)  →  middleware  →  reader (Vite :5173)
              ↑                                       ↑
              hot reload                              Vite HMR
              apps/web/src/                           apps/reader/src/
```

`apps/web/src/middleware.ts` proxies `/reader/*` requests to the Vite dev server in dev mode. In production it serves the built reader from `apps/web/dist/`.

## Two `PUBLIC_DIRECTUS_URL` values

The reader runs in the browser and needs `http://localhost:8055`. Astro SSR runs inside Docker and uses `http://directus:8055`. Both are wired correctly in `docker-compose.dev.yml`; you only need to be aware of this if you change the Docker network setup.

## Editing Directus content

Open <http://localhost:8055>, log in with the credentials from `.env`. See `docs/directus.md` for the schema and admin workflows.

---

See also: `docs/reader.md`, `docs/web.md`, `docs/directus.md`.
