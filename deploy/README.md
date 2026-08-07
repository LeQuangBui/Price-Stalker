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

## Email

Mail is sent through [Resend](https://resend.com). Set `RESEND_API_KEY` in `.env.prod` and verify
the sending domain in the Resend dashboard — it refuses to send from an unverified domain, and
verification is DNS-propagation bound, so do it before the first deploy.

`email-service` validates the key at startup: if it is blank the service will not boot. Nothing
else in the stack depends on it, so the site stays up, but no verification emails are delivered
and users cannot complete signup.

DNS for the sending domain:

| Type | Name | Value |
|------|------|-------|
| TXT | `<domain>` (SPF) | `v=spf1 include:_spf.resend.com -all` |
| TXT | `_dmarc.<domain>` | `v=DMARC1; p=none; rua=mailto:<a mailbox you read>` |

Plus the DKIM records Resend generates for your account. Keep a **single** SPF record — two TXT
records starting with `v=spf1` at the same name is an RFC 7208 permerror that breaks SPF for every
message.

`MAIL_REPLY_TO` has no inbox in a send-only setup, so replies bounce. Point it at a real mailbox
or accept that knowingly.

### Self-hosting the MTA

A Postfix service used to ship here for `MAIL_PROVIDER=smtp`, self-hosting outbound mail. It was
removed in favour of Resend: the code path still exists, but the container does not, so the `smtp`
setting will not work until the service is restored from git history.

Worth knowing if you revisit it — reputation, not setup, is the hard part. A fresh IP with no
sending history gets filtered by the large providers for weeks regardless of how correct the DNS
is, which matters because these are signup verification codes. Restoring it needs the `postfix`
service and its two volumes back in `docker-compose.prod.yml`, a PTR record on the host IP (set
with the VPS provider, not the DNS host), DKIM/SPF/DMARC published, and a mail-tester score of at
least 9/10 before cutting over.
