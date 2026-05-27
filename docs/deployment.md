# Production deployment

For a hosting partner deploying ReadFlow to a server you control. Vendor-neutral — works with any Docker-friendly host (Hetzner, DigitalOcean, AWS, Coolify, Dokku, etc.). The local-Docker workflow in the root `README.md` is the same stack; this guide adds the production concerns: a public domain, TLS, reverse proxy, automated backups.

## Shape

The same `docker-compose.yml` you used locally runs in production. On top of it you add:

1. A reverse proxy (Nginx, Caddy, or your platform's built-in router) that terminates TLS and forwards:
   - `https://yourdomain.com → web:3000`
   - `https://cms.yourdomain.com → directus:8055`
2. Persistent volumes for `pgdata`, `directus_uploads`, `redisdata`, `directus_extensions`.
3. A scheduled job that backs up the database + uploads (see "Backups" below).
4. Production values in `.env`: long random `KEY` / `SECRET`, strong passwords, `CORS_ORIGIN` locked to your domain.

## First deploy

```bash
# On the server
git clone <your-repo> /opt/readflow      # or unpack the delivery zip
cd /opt/readflow
cp .env.example .env
# Edit .env — see "Production .env" below
make start              # build images, apply schema
make restore            # load production data (if you have a dump)
```

If this is a brand-new deployment without prior data, skip `make restore` and add content via the Directus admin.

## Production `.env`

The minimum set you must change from `.env.example`:

```env
# Strong, random — never reuse local-dev values
POSTGRES_PASSWORD=<openssl rand -base64 32>
KEY=<openssl rand -base64 48>
SECRET=<openssl rand -base64 48>
ADMIN_PASSWORD=<openssl rand -base64 24>

# Public URLs
PUBLIC_URL=https://cms.yourdomain.com
PUBLIC_DIRECTUS_URL=https://cms.yourdomain.com
DIRECTUS_URL=http://directus:8055      # internal Docker network — leave as-is

# Lock CORS down to your domain
CORS_ORIGIN=https://yourdomain.com

# Optional: ElevenLabs API key (text-to-speech). Leave blank to disable TTS.
API_KEY_ELEVEN_LABS=
```

Full upstream env-var reference: <https://directus.io/docs/configuration/general>

## Reverse proxy + TLS

Two server blocks, one per host. Pick Nginx or Caddy.

### Nginx + Let's Encrypt

```nginx
# /etc/nginx/sites-available/readflow

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name cms.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/cms.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cms.yourdomain.com/privkey.pem;

    client_max_body_size 50M;   # for admin uploads

    location / {
        proxy_pass http://127.0.0.1:8055;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com cms.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/readflow /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d cms.yourdomain.com
sudo certbot renew --dry-run
```

### Caddy (auto-TLS)

```caddyfile
yourdomain.com, www.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}
cms.yourdomain.com {
    reverse_proxy 127.0.0.1:8055
}
```

## Firewall

```bash
sudo ufw allow 22/tcp 80/tcp 443/tcp && sudo ufw enable
```

Do not expose 5432 (Postgres), 6379 (Redis), 8055 (Directus) or 3000 (web) directly to the internet — the reverse proxy fronts them.

## Backups

Capture the Postgres database with `pg_dump -Fc`, the uploads volume with `tar`, and push the bundle off-site. Minimum cron entry:

```bash
# /opt/readflow/backup.sh
#!/usr/bin/env bash
set -euo pipefail
cd /opt/readflow
. .env
TS=$(date -u +%Y%m%d-%H%M%S)
docker compose exec -T postgres pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" > /tmp/db.dump
docker run --rm \
  -v $(docker volume ls -q | grep directus_uploads):/uploads:ro \
  -v /tmp:/out alpine \
  sh -c 'cd / && tar czf /out/uploads.tar.gz uploads'
tar czf /backups/readflow-$TS.tar.gz -C /tmp db.dump uploads.tar.gz
rm /tmp/db.dump /tmp/uploads.tar.gz
# Then sync /backups/ off-site (aws s3 cp / rclone copy / etc.)
```

```bash
# crontab -e  — nightly at 03:15 UTC
15 3 * * * /opt/readflow/backup.sh >> /var/log/readflow-backup.log 2>&1
```

To restore a bundle on any host (local or another server), drop it into `data/` and run `make restore`. The script handles `pg_restore`, the uploads extraction, the Redis cache flush, and admin promotion.

## Updates

```bash
git pull origin main
make start          # rebuild + restart + re-apply schema
                    # data volumes are preserved
```

To bump Directus, edit `FROM directus/directus:11.17.4` in `directus/Dockerfile` to the new tag, then `dc up -d --build directus`. Directus migrates the schema automatically on boot. Read the upstream release notes first: <https://github.com/directus/directus/releases>

## Monitoring

| URL | What it checks |
|---|---|
| `https://yourdomain.com/api/health` | Web app responsive |
| `https://cms.yourdomain.com/server/health` | Directus + DB + Redis healthy |

Hook these into any uptime monitor (UptimeRobot, Better Uptime, your platform's built-in checks).

## Security checklist

- [ ] `KEY`, `SECRET`, all passwords are long and random
- [ ] `CORS_ORIGIN` restricted to your domain (not `*`)
- [ ] TLS certificates installed + auto-renewing
- [ ] Firewall opens only 22, 80, 443
- [ ] Default admin (`ADMIN_PASSWORD` from `.env`) password is strong; any default test accounts removed via Directus admin
- [ ] A recent backup has been test-restored
- [ ] `RATE_LIMITER_ENABLED=true` (default)
- [ ] Disk-space alert configured (uploads grow over time)

## Troubleshooting

| Symptom | What to check |
|---|---|
| Web returns 502 | `make ps` — is `web` up? `make logs` to inspect. |
| Directus admin returns 502 | Same for `directus`. SSH-check: `curl -fsS http://localhost:8055/server/health`. |
| TLS cert expired | `sudo certbot renew && sudo systemctl reload nginx`. |
| Public site shows raw translation keys | Permission cache poisoning — see root `README.md` → "Public role permissions". `dc exec redis redis-cli FLUSHALL && make restart`. |
| Out of disk | `docker system prune -a` is safe. The uploads volume under `/var/lib/docker/volumes` is usually the culprit. |
| Cannot log in after a dump restore | `dc exec directus npx directus users passwd --email <email>`. |

---

See also: root `README.md` (setup), `docs/directus.md` (CMS internals).
