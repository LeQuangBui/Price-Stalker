# Deploying price-stalker to a VPS

Self-hosted Docker Compose deploy. Images are **built on the server** (no AWS, no
external registry). One Caddy container terminates HTTPS and routes traffic.

```
browser ──▶ Caddy (80/443)
              ├── /        ─▶ frontend (nginx SPA)
              └── /api/*   ─▶ api (Spring Boot 8080, strips /api)
api · cron-service · email-service · crawler ──▶ mysql + rabbitmq (internal)
```

`crawler` is a RabbitMQ worker (no HTTP port). `price-stalker-core` is a shared
library compiled into each Java image, not its own container.

## 1. Provision the VPS (one time)

Recommended: 2 vCPU / 4 GB RAM (Java + Node builds are memory-hungry; add swap on
smaller boxes). Ubuntu 22.04+ is fine.

```bash
# as root on the VPS
curl -fsSL https://get.docker.com | sh
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
# open the web ports
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

Point your DNS A record (e.g. `price-stalker.example.com`) at the VPS IP so Caddy
can issue a Let's Encrypt cert automatically.

## 2. Clone the repo and configure secrets (one time)

```bash
# as the deploy user
sudo mkdir -p /opt/price-stalker && sudo chown deploy:deploy /opt/price-stalker
git clone <YOUR_REPO_URL> /opt/price-stalker
cd /opt/price-stalker
cp .env.prod.example .env.prod
nano .env.prod          # fill in every value (passwords, JWT secret, domain, Resend key)
```

`.env.prod` is gitignored. Generate a JWT secret with:
`openssl rand -base64 64 | tr -d '\n'`.

## 3. First deploy

From the VPS:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml ps
```

Then verify:

```bash
curl -fsS https://price-stalker.example.com/healthz        # front-end -> ok
curl -fsS https://price-stalker.example.com/api/healthz     # api -> {"status":"ok"}
```

## 4. Ongoing deploys

**From your laptop** (SSHes in and rebuilds on the server):

```bash
VPS_HOST=deploy@203.0.113.10 ./deploy/deploy.sh
```

**Automatic on push to main** via `.github/workflows/ci-cd.yml` → `deploy` job.
Add these GitHub Actions repository secrets:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | server IP or hostname |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | private key whose public key is in the deploy user's `~/.ssh/authorized_keys` |
| `VPS_PATH` | `/opt/price-stalker` |

After tests pass on a push to `main`, the job SSHes in, pulls, rebuilds, and
restarts the stack.

## Operations

```bash
docker compose -f docker-compose.prod.yml ps                 # status
docker compose -f docker-compose.prod.yml logs -f api        # tail one service
docker compose -f docker-compose.prod.yml restart api        # restart one service
docker compose -f docker-compose.prod.yml down               # stop all (data volumes survive)
```

MySQL and RabbitMQ are **not** published to the host. To reach the RabbitMQ
management UI, SSH-tunnel it: `ssh -L 15672:localhost:15672 deploy@<host>` after
temporarily publishing the port, or add a guarded route in the Caddyfile.
