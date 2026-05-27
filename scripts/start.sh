#!/usr/bin/env bash
# ReadFlow bootstrap: brings up the full stack and applies the Directus schema.
# Re-running is safe — schema apply is idempotent.
#
# After this finishes, run `make restore` to load the production data
# (database + uploads) from data/readflow-*.tar.gz.

set -euo pipefail

# Move to the package root (this script lives in scripts/)
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: .env not found."
  echo "Run:  cp .env.example .env  and replace every CHANGE_ME value."
  echo "      See README.md (Quick start) for how to generate secrets."
  exit 1
fi

DIRECTUS_URL="http://localhost:8055"

echo "[1/3] Building images and starting containers..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

echo "[2/3] Waiting for Directus to be ready (this can take ~60s on first boot)..."
for i in $(seq 1 90); do
  if curl -sfo /dev/null "$DIRECTUS_URL/server/health"; then
    echo "      Directus is healthy."
    break
  fi
  if [ "$i" -eq 90 ]; then
    echo "ERROR: Directus did not become healthy in 3 minutes."
    echo "       Inspect logs:  docker compose logs directus"
    exit 1
  fi
  sleep 2
done

echo "[3/3] Applying Directus schema (idempotent)..."
docker compose exec -T directus npx directus schema apply --yes /directus/snapshots/schema.json

cat <<'EOF'

ReadFlow is up with an empty schema.

  Web (Astro):    http://localhost:3000
  Directus admin: http://localhost:8055

The public site will look broken until you load real data — that's the next step:

  make restore

Useful commands:
  make logs       # tail all logs
  make down       # stop everything (containers — volumes survive)
  make restart    # full restart with rebuild

To start completely from scratch (drops all data):
  make down
  docker volume rm $(basename $PWD)_pgdata $(basename $PWD)_directus_uploads \
                   $(basename $PWD)_redisdata $(basename $PWD)_directus_extensions
  make start && make restore
EOF
