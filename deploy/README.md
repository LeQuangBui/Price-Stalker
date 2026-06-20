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

## Self-hosted email (Postfix) — switching off Resend

The `email-service` sends through a `MailProvider` chosen by `MAIL_PROVIDER` (`resend` |
`smtp`). The default is `resend`. The `postfix` service self-hosts outbound mail; flipping to
`smtp` is a DNS + one-env-var change. **Order matters — do not flip `MAIL_PROVIDER=smtp` until
DNS is live, or verification emails will land in spam.**

Prereqs: outbound port 25 open on the VPS, and the ability to set reverse DNS (PTR) on the VPS
IP. Many providers block port 25 by default — confirm first
(`nc -zv -w5 gmail-smtp-in.l.google.com 25` from the VPS should connect).

### 1. Bring up Postfix and read its DKIM key
With `MAIL_PROVIDER=resend` still set (so live mail keeps flowing via Resend), deploy so the
`postfix` container starts and generates its DKIM key:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postfix
docker compose -f docker-compose.prod.yml logs postfix | grep -iA20 dkim   # prints the DKIM TXT record + selector
```

### 2. Publish DNS, then PTR (before cutover)
Set `MAIL_DOMAIN` in `.env.prod` (usually your app domain), then create:

| Type | Name | Value |
|------|------|-------|
| A | `mail.<MAIL_DOMAIN>` | `<VPS_IP>` |
| PTR | `<VPS_IP>` | `mail.<MAIL_DOMAIN>` (VPS provider panel; must match the A record) |
| TXT | `<MAIL_DOMAIN>` (SPF) | `v=spf1 a:mail.<MAIL_DOMAIN> include:_spf.resend.com -all` |
| TXT | `<selector>._domainkey.<MAIL_DOMAIN>` (DKIM) | the key from step 1 |
| TXT | `_dmarc.<MAIL_DOMAIN>` | `v=DMARC1; p=none; rua=mailto:<id>@<hosted-aggregator>` |

The SPF `include:_spf.resend.com` keeps the Resend fallback deliverable. The DMARC `rua=` points
at a free hosted aggregator (URIports / Postmark / dmarcian) so you get reports without running an
inbox. Wait for propagation (`dig +short <selector>._domainkey.<MAIL_DOMAIN> TXT`, `dig -x <VPS_IP>`).

### 3. Baseline, then cut over
Send a test (envelope sender on `<MAIL_DOMAIN>`) to https://www.mail-tester.com and to a Gmail +
Outlook account. Confirm **≥ 9/10** and SPF/DKIM/DMARC **pass and align** (check Return-Path, not
just From). Only then:

```bash
# in .env.prod:
MAIL_PROVIDER=smtp
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d email-service
```

### Rollback
Set `MAIL_PROVIDER=resend` and `up -d email-service` again (seconds). SPF already authorizes
Resend, so the fallback delivers cleanly.

### Notes
- Outbound mail egresses via the host IP (Docker NAT), so PTR lives on the **host** IP, not a
  container address. Port 25 is never published inbound.
- The DKIM key persists in the `postfix_dkim` volume — back it up; losing it silently breaks DKIM
  until you republish the TXT record.
- `MAIL_REPLY_TO` has no inbox in an outbound-only setup, so replies bounce — point it at a real
  mailbox or accept that knowingly.
