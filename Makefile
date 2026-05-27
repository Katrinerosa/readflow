# All shortcuts pass BOTH compose files so the `reader` service (defined in
# the dev overlay) is included.
#
# First-time bootstrap:  make start   then   make restore
# Day-to-day operations: make up / down / restart / logs / ps

COMPOSE := docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: start restore up down restart logs ps

# First-time bootstrap (two-step)
start:
	./scripts/start.sh

restore:
	./scripts/restore-data.sh

# Day-to-day operations
up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) down && $(COMPOSE) up -d --build

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps
