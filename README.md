# ReadFlow — Dyslexia-friendly book reading platform

ReadFlow is a web platform for publishing and reading books online, built for children with dyslexia. Authors and editors manage content in Directus; readers get a clean reading experience with page-flip animations, multiple text-difficulty levels (LIX), and dyslexia-optimized typography.

The whole stack runs locally with two commands via Docker Compose.

## Stack

| Layer       | Tech                                              |
|-------------|---------------------------------------------------|
| Database    | PostgreSQL 16                                     |
| Cache       | Redis 7                                           |
| CMS / API   | Directus (with custom Dockerfile + extensions)    |
| Web         | Astro 4 (SSR, Node adapter)                       |
| Reader SPA  | Vue 3 + Pinia + Vue Router + page-flip            |
| Tooling     | pnpm workspaces, TypeScript, Vite, Docker Compose |

In production the Vue reader is built and served by Astro under `/reader/*`. In dev, Astro proxies that path to the Vite dev server on port 5173 (hot reload).

## Repository layout

```
.
├── apps/
│   ├── reader/             Vue 3 reader SPA
│   └── web/                Astro SSR app
│       ├── Dockerfile      Production image (built reader + Astro SSR)
│       └── Dockerfile.dev  Dev image (used by reader + web dev services)
├── directus/
│   ├── Dockerfile          Directus image with extensions baked in
│   ├── extensions/
│   │   ├── package.json    npm-published Directus extensions
│   │   ├── extract-extensions.js   Build helper called by the Dockerfile
│   │   └── local/          Custom extensions built from source (6 total)
│   └── snapshots/
│       ├── schema.json     Directus schema (collections, fields, relations)
│       └── translations.json   UI translation strings (en / da / de)
├── data/
│   └── readflow-*.tar.gz   Production data dump (database + uploads)
├── scripts/
│   ├── start.sh            One-shot bootstrap: up + wait for Directus + apply schema
│   ├── restore-data.sh     Load production data into the running stack
│   └── dev.sh              Start the stack in dev mode (hot reload)
├── docs/                   Detailed docs (development, CMS, deployment, etc.)
│   └── redaktor-guide/
│       └── redaktor-guide.pdf   Editor guide in Danish (PDF, for content managers)
├── docker-compose.yml      Production compose
├── docker-compose.dev.yml  Dev overlay (hot reload for reader + web)
├── Makefile                All `make` shortcuts (`make start`, `make restore`, `make up`, `make down`, `make restart`, `make logs`, `make ps`)
├── .env.example            Copy to .env, fill in CHANGE_ME values
└── package.json            pnpm workspace root
```

## Prerequisites

You need:

1. **Docker Desktop** — install from <https://www.docker.com/products/docker-desktop/>. After installing, open Docker Desktop once so the engine starts. ReadFlow needs Docker Compose v2, which Docker Desktop already includes.
2. **~3 GB free disk space** — the data dump expands as it's loaded.
3. **A terminal**:
   - **macOS**: open *Terminal* (`cmd+space` → "terminal").
   - **Linux**: any terminal emulator.
   - **Windows**: install [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) and run everything from a WSL Ubuntu shell. The bash scripts in this package will not run in plain `cmd.exe` or PowerShell.
4. **A text editor** for editing `.env` — any editor works (TextEdit, Notepad, VS Code, nano, vim, …).

You do *not* need Node, pnpm, or Postgres on the host — everything runs inside Docker.

## Quick start

Open a terminal in the unzipped `readflow-1.2-leverancen/` folder, then run:

```bash
# 1. Create your local environment file from the template
cp .env.example .env
```

Open `.env` in your text editor and replace every `CHANGE_ME` value. The most important ones:

- `POSTGRES_PASSWORD` — any strong password.
- `KEY` and `SECRET` — must each be at least 32 random characters. Generate one with:
  `openssl rand -base64 48` (run this in the terminal, paste the result).
- `ADMIN_PASSWORD` — the password you will use to log in to the Directus admin panel.
- `ADMIN_EMAIL` — your email (or any address you want to use for login).

Then start everything:

```bash
# 2. Build images and bring the stack up
make start

# 3. Load the production data (database + uploaded files) into the running stack
make restore
```

**Expected timings on a typical broadband connection:**

| Step | First run | Subsequent runs |
|---|---|---|
| `make start` (image pull + build + boot) | 3–8 min | ~20 s |
| `make restore` (522 MB extract + pg_restore + uploads) | 1–3 min | 1–3 min |

If `make start` looks frozen for >5 min on the first run, watch the build with `make logs` in another terminal.

After `make restore` finishes, the script prints a verification command — run it to confirm the public API works:

```bash
curl -sf 'http://localhost:8055/items/books?limit=1' | head -c 200
# Expected: a JSON {"data":[…]} response. A 403 means re-run make restore.
```

After `make restore` finishes:

| Service          | URL                                     |
|------------------|-----------------------------------------|
| Web (Astro)      | http://localhost:3000                   |
| Directus admin   | http://localhost:8055                   |
| Reader (Vite)    | proxied through Astro at `/reader/*`    |
| PostgreSQL       | localhost:5432                          |
| Redis            | localhost:6379                          |

**Log in to the Directus admin** with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in `.env`. `make restore` attempts to reset that user's password (or create the user) inside the restored database. If `make restore` printed a `WARNING:` in its `[admin]` step instead of confirming the user, see the "Login fails" troubleshooting row below.

On first login, Directus shows a BSL 1.1 license modal — click "Remind Later" or accept it once per installation.

**Stop the stack with `make down`** (not `docker compose down`). The reader service lives in `docker-compose.dev.yml`, so plain `docker compose down` would leave a stray `reader` container running. `make down` uses both compose files and tears everything down. To also wipe data volumes (you can re-run `make restore` after), add a `docker volume rm` step (see "Start from scratch" below).

## Reference: Directus documentation

The CMS layer is [Directus](https://directus.io/). When you want to look something up:

- **Configuration / environment variables**: <https://directus.io/docs/configuration/general>
- **Schema management** (`schema apply` / `schema snapshot`): <https://directus.io/docs/configuration/schema-sync>
- **Flows** (automation): <https://directus.io/docs/automate/flows>
- **Extensions** (the kind you'll find in `directus/extensions/local/`): <https://directus.io/docs/guides/extensions/overview>
- **REST + GraphQL API**: <https://directus.io/docs/api>
- **Self-hosting + Docker**: <https://directus.io/docs/self-hosting/overview>

The full env-var list, in particular, is worth bookmarking — anything `.env.example` doesn't cover is documented there.

## Generating secrets

`KEY`, `SECRET`, `POSTGRES_PASSWORD`, and `ADMIN_PASSWORD` in `.env` must be strong random values. `KEY` and `SECRET` MUST be at least 32 characters long.

```bash
# Pick one
openssl rand -base64 48
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Restoring production data

`data/readflow-<timestamp>.tar.gz` contains:

| File | What it is |
|---|---|
| `db.dump` | `pg_dump -Fc` of the production Postgres database (schema + all content, users, flows, permissions) |
| `uploads.tar.gz` | All files uploaded through Directus (cover images, author photos, audio, etc.) |

`make restore` handles the restore end-to-end:

1. Extracts the bundle
2. `pg_restore`s the database into the Postgres container (`--clean --if-exists` drops + recreates all objects, safe to re-run)
3. Extracts `uploads.tar.gz` into the Directus container at `/directus/uploads/`
4. **Flushes Redis** — kills permission-lookup cache poisoning that would otherwise make the public site return 403 forever (Directus caches a "Public has no access" entry on the empty-DB first boot)
5. Restarts Directus so it picks up the new state
6. Promotes your `ADMIN_EMAIL` to a working admin user (resets password if the email already existed in the dump, otherwise creates a new admin user)

Verify it worked with a single curl call:

```bash
curl -sf 'http://localhost:8055/items/books?limit=1' | head -c 200
```

You should see a JSON object with a `data` array. A `403` here means the cache flush was missed — re-run `make restore` (it's idempotent).

To re-restore (e.g. after edits you want to throw away):

```bash
make restore                   # just re-run — it's idempotent
```

To start from scratch:

```bash
make down                           # wipe containers (volumes survive)
docker volume rm $(basename $PWD)_pgdata $(basename $PWD)_directus_uploads  # wipe data
make start && make restore     # back to a clean restored state
```

### About the production secrets

`KEY` and `SECRET` in your local `.env` do **not** need to match production, and production secrets are not included in this package. Consequences:

- **User accounts work normally** — passwords are hashed independently of `KEY`.
- **Existing access tokens are invalid** — any user previously logged in must log in again. Fine for local restore.
- **Encrypted-at-rest fields in Directus settings (if any) are not readable** — ReadFlow does not use such fields, so this has no impact.
- **Your local `ADMIN_EMAIL` works** — `make restore` promotes it inside the restored database (either resets the password if the email already existed, or creates a new admin user).

If the auto-promote step printed a warning and you can't log in, the script prints the list of existing admin emails at the bottom of its output — pick one and reset its password:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec directus \
  npx directus users passwd --email <one-of-the-printed-emails>
```

## Public role permissions

The web app and reader fetch content from Directus as an unauthenticated client. Public-role READ permissions are part of the database dump, so after `make restore` they are in place (and the cache flush in step 5 above ensures Directus serves them, not stale 403s).

If the public site still shows empty pages after a clean `make start` + `make restore`:

1. **Smoke-test the API**: `curl -sf 'http://localhost:8055/items/books?limit=1'`. If this returns a `403`, the cache flush did not take effect — re-run `make restore`.
2. **Check the policy in admin**: Directus → Settings → Access Policies → Public should exist with READ permissions on `authors`, `books`, `book_content`, `book_content_translations`, `book_content_image_settings`, `book_content_audio`, `languages`, `translation_strings`, `supporters`, `directus_files`.
3. **Force-flush manually**: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec redis redis-cli FLUSHALL` then `make restart`.

## Editor guide

`docs/redaktor-guide/redaktor-guide.pdf` is a Danish guide for content editors. It walks through:

- Admin login + interface basics
- Authors and books
- Book content + LIX reading levels
- Word explanations
- The reader experience
- ElevenLabs audio
- Directus flows used for content processing

Hand this PDF to anyone who is going to manage books in the platform.

## Directus local extensions

Six custom extensions ship in `directus/extensions/local/` and are built into the Directus image automatically:

| Extension | Purpose |
|---|---|
| `process-book-content` | Operation. Sanitizes HTML and computes LIX / LET-tal / word + chapter + image counts, reading-time estimate, and detected reading level. Wired into the "Analyse content" flow. |
| `sanitize-content` | Operation. HTML sanitizer used independently and inside `process-book-content`. |
| `base64-upload` | Endpoint. Accepts base64-encoded files (used by integrations that can't multipart-upload). |
| `elevenlabs-tts` | Operation. Generates audio via ElevenLabs API for words and book content. **Requires `API_KEY_ELEVEN_LABS`** in `.env` to be active. |
| `find-content-by-words` | Endpoint. Looks up book content where given words appear (used by the word-explanations workflow). |
| `star-rating` | Display + interface. Custom field UI for star ratings. |

## ElevenLabs (text-to-speech)

The `elevenlabs-tts` extension is installed in the Directus image but only does work when `API_KEY_ELEVEN_LABS` is set. You can decide later:

- **Skip TTS for now** — leave `API_KEY_ELEVEN_LABS=` empty. The extension stays loaded but inactive, the rest of the platform works.
- **Enable TTS** — create your own ElevenLabs account at https://elevenlabs.io, generate an API key under **API → API keys**, paste it into `.env`, and restart Directus:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml restart directus
  ```

We do not provide an ElevenLabs key with this delivery. Audio that was already generated and stored in Directus (and in the uploads dump) plays back without the key — only generating new audio needs the key.

## Useful commands

All `make` shortcuts wrap `docker compose` with both compose files so the `reader` service is never orphaned.

**Bootstrap (run once after unpacking):**

```bash
make start      # build images, bring stack up, apply schema
make restore    # load production data into the running stack
```

**Day-to-day operations:**

```bash
make up         # bring the stack up (rebuilds if needed)
make down       # stop the stack (volumes survive)
make restart    # full restart with rebuild
make logs       # tail all logs
make ps         # show container status
```

For ad-hoc commands, define a shell alias so you don't forget the dev overlay:

```bash
alias dc='docker compose -f docker-compose.yml -f docker-compose.dev.yml'

dc logs -f web              # tail web logs
dc logs -f directus         # tail directus logs
dc restart web              # restart one service
dc up -d --build directus   # rebuild after editing a Dockerfile or adding an extension
dc exec postgres pg_dump -U readflow readflow > backup.sql
```

**Wipe everything and start over** (drops all data):

```bash
make down
docker volume rm $(basename $PWD)_pgdata $(basename $PWD)_directus_uploads $(basename $PWD)_redisdata $(basename $PWD)_directus_extensions
make start && make restore
```

## Development mode (hot reload)

The default `make start` and `make up` already use the dev overlay so Astro and the Vue reader pick up source changes without rebuilding. If you want to launch dev mode explicitly:

```bash
./scripts/dev.sh
```

For a production-style build (single `web` container serving the built reader), use the production compose only:

```bash
docker compose -f docker-compose.yml up -d --build
```

See `docs/development.md` for details.

## Adding Directus extensions

- **From npm:** add the package to `directus/extensions/package.json`, then `docker compose up -d --build directus`. The build runs `extract-extensions.js`, which copies any package with a `directus:extension` field in its `package.json` into the layout Directus expects on disk.
- **Custom (built from source):** drop the extension folder into `directus/extensions/local/<name>/`. The Dockerfile builds and installs each subfolder during image build.

## Backups

For ongoing operation you'll want regular database + uploads backups. The simplest approach is a cron job on your production host that runs `pg_dump -Fc` against the postgres container and archives the `directus_uploads` volume, then uploads the bundle to S3-compatible storage. See `docs/deployment.md` for example commands and a cron schedule.

To restore a backup locally for testing or migration, drop the resulting `*.tar.gz` (containing `db.dump` and optionally `uploads.tar.gz`) into `data/` and run `make restore`.

## Data model

The schema includes ~15 collections. The core flow is:

```
authors  ── 1:N ──>  books  ── 1:N ──>  book_content  ── 1:N ──>  book_content_translations
                                                              \─>  book_content_image_settings
                                                              \─>  book_content_audio
```

Multi-language UI strings live in `translation_strings` + `translation_strings_translations`, with the language list in `languages`. Author and book metadata is also translatable via `authors_translations` and `books_translations`.

ReadFlow uses the Swedish LIX readability index: easy (<30), medium (30–50), hard (>50).

## Troubleshooting

All `docker compose …` commands below assume the dev overlay alias from "Useful commands": `alias dc='docker compose -f docker-compose.yml -f docker-compose.dev.yml'`.

| Symptom                                  | What to do                                                                                  |
|------------------------------------------|---------------------------------------------------------------------------------------------|
| `KEY must be set in .env`                | Copy `.env.example` to `.env` and fill in every CHANGE_ME, then re-run `make start`.        |
| Directus stays "unhealthy"               | `dc logs directus`. Most often `KEY` / `SECRET` are < 32 chars, or contain a `$` that compose interpolation ate. |
| `make start` times out applying schema   | Increase the wait or apply manually once `dc ps` shows healthy: `dc exec directus npx directus schema apply --yes /directus/snapshots/schema.json`. |
| `make restore` says "postgres / directus / redis is not running" | Run `make start` first.                                          |
| `make restore` finishes but `curl 'http://localhost:8055/items/books'` returns 403 | The Redis flush in step 5 was missed. Re-run `make restore` — idempotent. |
| Public site shows raw keys (`nav.home`, `home.welcome`) | Same root cause — `dc exec redis redis-cli FLUSHALL && make restart`. |
| Author photos / book covers don't load   | The uploads restore step failed. Re-run `make restore` and watch its `[4/6]` log line. |
| Reader 404s under `/reader/...`          | `dc ps reader` — make sure it's running. `dc logs reader`.                                  |
| Login fails with "Invalid user credentials" | `make restore` prints existing admin emails at the end if it couldn't auto-promote yours. Pick one and: `dc exec directus npx directus users passwd --email <email>`. |
| ElevenLabs TTS doesn't generate audio    | `API_KEY_ELEVEN_LABS` is empty or wrong in `.env`. Set it and run `dc restart directus`.    |
| Stale extension after editing            | `dc up -d --build directus`.                                                                |
| Stray container after `docker compose down` | Use `make down` instead — it includes the dev overlay so the `reader` service is torn down. |
