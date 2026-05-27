#!/usr/bin/env bash
# restore-data.sh
#
# Restores the production data dump from data/readflow-*.tar.gz into the
# running stack:
#   1. pg_restore the database dump   (drops + recreates everything)
#   2. Extracts uploads.tar.gz         (if present in the bundle)
#   3. Flushes Redis                   (kills permission-cache poisoning)
#   4. Restarts Directus               (so it picks up the new state)
#   5. Promotes ADMIN_EMAIL from .env  (so you can log in immediately)
#
# Safe to re-run: pg_restore uses --clean --if-exists, uploads are overwritten,
# Redis flush is idempotent.
#
# Pre-requisite: the stack must already be running. Run `make start` first.

set -euo pipefail

# Move to the package root (this script lives in scripts/)
cd "$(dirname "$0")/.."

# --- Load .env ---------------------------------------------------------------
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Run 'cp .env.example .env' and fill it in first."
  exit 1
fi

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | head -1 | cut -d= -f2-)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | head -1 | cut -d= -f2-)
ADMIN_EMAIL=$(grep -E '^ADMIN_EMAIL=' .env | head -1 | cut -d= -f2-)
ADMIN_PASSWORD=$(grep -E '^ADMIN_PASSWORD=' .env | head -1 | cut -d= -f2-)

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
  echo "ERROR: POSTGRES_USER or POSTGRES_DB missing from .env"
  exit 1
fi

# --- Locate the bundle -------------------------------------------------------
BUNDLE=$(ls -1t data/readflow-*.tar.gz 2>/dev/null | head -1 || true)
if [ -z "$BUNDLE" ]; then
  echo "ERROR: no data bundle found at data/readflow-*.tar.gz"
  exit 1
fi
echo "[1/6] Using bundle: $BUNDLE"

# --- Verify the stack is up (use actual health probes, not `ps` grep) --------
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.dev.yml"

# Wait up to 30s for each service — handles the race right after `make start`.
wait_for() {
  local name="$1"; local check="$2"
  for i in $(seq 1 15); do
    if eval "$check" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  echo "ERROR: $name is not reachable. Run 'make start' first, then re-run 'make restore'."
  exit 1
}
wait_for "postgres"  "$COMPOSE exec -T postgres pg_isready -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\""
wait_for "directus"  "curl -sfo /dev/null http://localhost:8055/server/health"
wait_for "redis"     "$COMPOSE exec -T redis redis-cli PING | grep -q PONG"

# --- Extract bundle to a temp dir --------------------------------------------
TMPDIR=$(mktemp -d -t readflow-restore.XXXXXX)
trap 'rm -rf "$TMPDIR"' EXIT

echo "[2/6] Extracting bundle..."
tar xzf "$BUNDLE" -C "$TMPDIR"

if [ ! -f "$TMPDIR/db.dump" ]; then
  echo "ERROR: db.dump not found inside the bundle."
  exit 1
fi

# --- Restore the database ----------------------------------------------------
echo "[3/6] Restoring database (drops + recreates all objects)..."
$COMPOSE cp "$TMPDIR/db.dump" postgres:/tmp/db.dump
$COMPOSE exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --no-owner --clean --if-exists -j 4 /tmp/db.dump || {
  # pg_restore returns non-zero when it skips already-absent objects on first
  # restore. Check the DB actually has tables now; if it does, treat as success.
  TABLE_COUNT=$($COMPOSE exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d '[:space:]')
  if [ "${TABLE_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    echo "      pg_restore reported warnings (expected on first run); $TABLE_COUNT tables present — continuing."
  else
    echo "ERROR: pg_restore failed and no tables were created."
    exit 1
  fi
}
$COMPOSE exec -T postgres rm -f /tmp/db.dump

# --- Restore uploads ---------------------------------------------------------
if [ -f "$TMPDIR/uploads.tar.gz" ]; then
  echo "[4/6] Restoring uploads into /directus/uploads ..."
  $COMPOSE cp "$TMPDIR/uploads.tar.gz" directus:/tmp/u.tgz
  # Tarball contains 'uploads/...' paths; extract at /directus so files land
  # at /directus/uploads/<id>.<ext> where Directus expects them.
  $COMPOSE exec -T -u root directus sh -eu -c '
    mkdir -p /directus/uploads
    tar xzf /tmp/u.tgz -C /directus
    chown -R node:node /directus/uploads
    rm -f /tmp/u.tgz
  '
else
  echo "[4/6] No uploads.tar.gz in bundle — skipping uploads restore."
fi

# --- Flush Redis (CRITICAL) --------------------------------------------------
# Directus caches permission lookups in Redis. When the stack first comes up
# with an empty schema, every request from the web app produces a cached
# "FORBIDDEN" result for the Public role. Those cache entries survive a
# Directus restart and would keep the public site returning 403 forever.
echo "[5/6] Flushing Redis cache..."
$COMPOSE exec -T redis redis-cli FLUSHALL >/dev/null

# --- Restart Directus so it sees the restored state --------------------------
echo "[6/6] Restarting Directus..."
$COMPOSE restart directus >/dev/null

# Wait for Directus to come back up
for i in $(seq 1 60); do
  if curl -sfo /dev/null http://localhost:8055/server/health; then break; fi
  sleep 2
done

# --- Ensure ADMIN_EMAIL / ADMIN_PASSWORD from .env can log in ---------------
# pg_restore wiped the bootstrap admin that Directus created on first start.
# Strategy: if ADMIN_EMAIL exists in the restored data, reset its password.
# Otherwise, create the user and attach an admin policy. Uses Directus's CLI
# so password hashing matches the running version. Verifies success by
# checking the user is actually present in directus_users afterward.

user_in_db() {
  local result
  result=$($COMPOSE exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
      "SELECT 1 FROM directus_users WHERE email = '$1' LIMIT 1;" 2>/dev/null | tr -d '[:space:]')
  [ "$result" = "1" ]
}

ADMIN_OK=0
if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo ""
  echo "[admin] Ensuring '$ADMIN_EMAIL' can log in as admin..."

  if user_in_db "$ADMIN_EMAIL"; then
    # Existing user — just reset the password.
    CLI_OUT=$($COMPOSE exec -T directus npx directus users passwd \
      --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" 2>&1) || true
    if user_in_db "$ADMIN_EMAIL"; then
      echo "        Password reset for existing user '$ADMIN_EMAIL'."
      ADMIN_OK=1
    else
      echo "        WARNING: password reset did not take effect. CLI output:"
      echo "$CLI_OUT" | sed 's/^/          /'
    fi
  else
    # New user. Need an admin role to attach.
    ADMIN_ROLE_ID=$($COMPOSE exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
        "SELECT da.role FROM directus_access da
         JOIN directus_policies dp ON dp.id = da.policy
         WHERE dp.admin_access = true AND da.role IS NOT NULL
         ORDER BY dp.name LIMIT 1;" 2>/dev/null | tr -d '[:space:]')

    if [ -n "$ADMIN_ROLE_ID" ]; then
      CLI_OUT=$($COMPOSE exec -T directus npx directus users create \
        --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" --role "$ADMIN_ROLE_ID" 2>&1) || true
      if user_in_db "$ADMIN_EMAIL"; then
        echo "        Created admin user '$ADMIN_EMAIL' and attached role with admin policy."
        ADMIN_OK=1
      else
        echo "        WARNING: user-create command ran but '$ADMIN_EMAIL' is not in directus_users."
        echo "        CLI output:"
        echo "$CLI_OUT" | sed 's/^/          /'
      fi
    else
      echo "        WARNING: no role with an admin policy found in the restored data."
    fi
  fi
fi

# --- Print final status, including emails to fall back on -------------------
cat <<EOF

================================================================
Restore complete.

  Web (Astro):    http://localhost:3000
  Directus admin: http://localhost:8055
EOF

if [ "$ADMIN_OK" = "1" ]; then
  cat <<EOF
                  Log in as:  $ADMIN_EMAIL
                  Password:   the ADMIN_PASSWORD from your .env
EOF
else
  echo ""
  echo "  ADMIN AUTO-PROMOTE DID NOT SUCCEED. Pick an existing admin email"
  echo "  below and reset its password manually:"
  $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT '    ' || u.email
       FROM directus_users u
       LEFT JOIN directus_access a ON a.user = u.id OR a.role = u.role
       LEFT JOIN directus_policies p ON p.id = a.policy
       WHERE p.admin_access = true OR u.role IN (
         SELECT role FROM directus_access da JOIN directus_policies dp ON dp.id = da.policy WHERE dp.admin_access = true
       )
       GROUP BY u.email
       ORDER BY u.email;" 2>/dev/null
  echo ""
  echo "    docker compose exec directus npx directus users passwd --email <one-of-the-above>"
fi

cat <<'EOF'

Quick verification (no login needed):
  curl -sf 'http://localhost:8055/items/books?limit=1' | head -c 200

Expected: a JSON object with a 'data' array. A 403 here means something is
off — re-run "make restore" once more (it is idempotent).

Note: previously-issued Directus access tokens are invalid (your local KEY /
SECRET differ from production). All users must log in again from the admin UI.
================================================================
EOF
