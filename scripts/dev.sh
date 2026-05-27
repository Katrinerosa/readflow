#!/usr/bin/env bash
# Development mode — runs with hot reload.
# Move to the package root (this script lives in scripts/)
cd "$(dirname "$0")/.."

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
echo "Development server starting with hot reload..."
echo "Web:      http://localhost:3000"
echo "Directus: http://localhost:8055"
echo ""
echo "Logs: docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f web"
