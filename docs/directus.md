# Directus CMS

Directus 11 is the content management system. The Vue reader and Astro web app both read from it via its REST API.

Official Directus docs: <https://directus.io/docs/>

## Logging in

After `make start` + `make restore`, visit <http://localhost:8055> and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your root `.env`. `make restore`'s `[admin]` step promotes that user inside the restored database. If it printed a `WARNING:` instead of confirming, see the README's "Login fails" troubleshooting row.

## Collections

ReadFlow's schema has 20 application collections (plus Directus's `directus_*` system tables). The complete schema lives in `directus/snapshots/schema.json`.

The core content flow is:

```
authors  1:N  books  1:N  book_content  1:N  book_content_translations
                                           \  book_content_image_settings
                                           \  book_content_audio
```

`book_content` has one row per reading-level variant (easy / medium / hard). `book_content_translations` holds the actual body text per language. The reader paginates that text dynamically.

Other collections you will see in the admin: `word_audio`, `word_explanations`, `frontpage`, `translation_strings` (UI labels), `languages`, `supporters`, `feedback`.

## Local extensions

Six extensions ship in `directus/extensions/local/`. The notable ones:

- **`process-book-content`** — wired into the *Analyse content* flow. On `book_content_translations` create / update it sanitizes HTML and computes LIX / word + chapter + image counts.
- **`elevenlabs-tts`** — generates audio via the ElevenLabs API. Requires `API_KEY_ELEVEN_LABS` in `.env`; otherwise inactive.
- `sanitize-content`, `base64-upload`, `find-content-by-words`, `star-rating` — see each folder's `package.json` for details.

To add or modify an extension, edit `directus/extensions/` and rebuild: `dc up -d --build directus`. Reference: <https://directus.io/docs/guides/extensions/overview>

## Flows

Flows live inside the database (not in files). The shipped dump already contains the *Analyse content* and TTS-generation flows. View or edit them in **Settings → Flows**.

Flow changes are *not* captured by `schema.json`. To preserve flow changes across a `make restore`, take a fresh database dump.

Reference: <https://directus.io/docs/automate/flows>

## Schema management

`directus/snapshots/schema.json` is the canonical schema (collections, fields, relations — not row data, files, users, or flows).

- **Apply** (idempotent): `dc exec directus npx directus schema apply --yes /directus/snapshots/schema.json` — `make start` does this for you on first boot.
- **Export** after editing in the admin UI: `dc exec directus npx directus schema snapshot --format json /directus/snapshots/schema.json`

Reference: <https://directus.io/docs/configuration/schema-sync>

## Public role permissions

The web app and reader hit Directus anonymously. The Public policy must have READ on the public-facing collections. This is already configured in the shipped database dump.

If the public site returns 403 after a restore, the permission cache is poisoned. Re-running `make restore` fixes it (its Redis flush step is the cure). See the root `README.md` troubleshooting section.

## Configuration

Directus reads its config from environment variables in the root `.env` (no separate `directus/.env`). See `.env.example` for what to set; full upstream reference: <https://directus.io/docs/configuration/general>

---

See also: root `README.md` (setup), `docs/development.md` (dev workflow), `docs/deployment.md` (production hosting).
