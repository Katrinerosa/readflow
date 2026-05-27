# Directus schema snapshots

This folder contains the canonical Directus schema and UI translation strings.

Background reading: [Directus schema management](https://directus.io/docs/configuration/schema-sync) (covers `schema apply`, `schema snapshot`, and the diff workflow).

## Files

| File | What it holds |
|---|---|
| `schema.json` | Collections, fields, relations, system-role permissions. Applied by `./start.sh` and baked into the Directus image. |
| `translations.json` | UI translation strings (en / da / de) as exported from `translation_strings`. Reference / re-import only — not auto-applied. |

The schema itself is *also* contained in the database dump (`data/readflow-*.tar.gz`). `schema.json` is here for transparency, version control, and recovery without a full DB dump.

## Apply schema by hand

`./start.sh` already does this for you. If you ever need to re-apply manually:

```bash
docker compose exec directus npx directus schema apply --yes /directus/snapshots/schema.json
```

This is idempotent — Directus computes a diff and only applies what is missing.

## Export the current schema from a running stack

After editing collections / fields in the Directus admin UI:

```bash
docker compose exec directus npx directus schema snapshot --format json /directus/snapshots/schema.json
```

The `directus/snapshots/` folder is bind-mounted into the container by `docker-compose.dev.yml`, so the file appears on the host immediately.

## Re-import the UI translation strings

`translations.json` is a flat list of `{key, translations: [{languages_code, content}]}`. There is no built-in Directus importer, but the Directus REST API accepts straight inserts to `/items/translation_strings` and `/items/translation_strings_translations`. The production dump already contains every translation — only re-import if you want to overlay onto a fresh schema-only setup.

## Notes

- **Schema includes**: collections, fields, relations, system roles, system permissions.
- **Schema does NOT include**: row data, files, users, flows. Those live in the database dump.
- **Format**: JSON. Diffable in git.
