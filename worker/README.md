# price-stalker-images

Cloudflare Worker serving product images at **https://images.price-stalker.com**.

The MEGA S4 bucket is private. This Worker is the only public read path: it signs each request
with SigV4 and proxies the object back, so bucket credentials never reach the browser and the
bucket never has to be made public.

```
crawler (Scrapy S3 pipeline)  ──▶  MEGA S4  price-stalker/products/…
                                      ▲
browser ──▶ images.price-stalker.com ─┘   (this Worker, signs + caches)
```

Adapted from [worker-signed-s3-template](https://github.com/obezuk/worker-signed-s3-template);
the original MIT/Apache licences are kept alongside.

## Behaviour

- **GET and HEAD only** — anything else gets 405.
- **Query strings are dropped before signing.** Without this, a caller could append `?acl`,
  `?tagging` or `?versionId` and turn a public image proxy into an arbitrary S3 API gateway
  under our credentials.
- **Bucket listing is disabled** (`ALLOW_LIST_BUCKET = "false"`), so `/` returns 404.
- **Upstream errors are never passed through.** A raw S4 403 body echoes the access key ID, so
  any failure is mapped to a bare 404 or 502 with `Cache-Control: no-store`.
- **Only 2xx responses are cached** (24h). Caching a transient 404/5xx would pin a momentary
  miss into a sticky one.

## Configuration

`wrangler.toml` `[vars]` — not secret, safe to commit:

| Var | Value |
|-----|-------|
| `AWS_DEFAULT_REGION` | `ap-tokyo` |
| `AWS_S3_BUCKET` | `price-stalker` |
| `ALLOW_LIST_BUCKET` | `false` |

The bucket host is derived as `${AWS_S3_BUCKET}.s3.${AWS_DEFAULT_REGION}.megas4.com`.

## Secrets

Two, set as encrypted Worker secrets so they are never committed:

```bash
npx wrangler secret put AWS_ACCESS_KEY_ID
npx wrangler secret put AWS_SECRET_ACCESS_KEY
```

They are injected as globals in this Service-Worker-format script, exactly like `[vars]`, so
`index.js` reads them with no code change. Wrangler secrets are **write-only** — they cannot be
read back, only overwritten.

## Deploy

```bash
npm install
npx wrangler deploy
```

Not covered by `deploy/deploy.sh` or the CI pipeline — those deploy the VPS stack only. This
Worker is deployed manually and changes rarely.

## Rotating S4 credentials — read this first

The crawler and this Worker hold **separate copies of the same key pair**. Rotating means
updating both:

1. `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in `.env.prod` on the VPS, then
   `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d crawler`
   (`up -d`, not `restart` — a restart reuses the old environment)
2. Both `wrangler secret put` values here

Updating only one produces a confusing failure: images already in the bucket keep serving
perfectly while new uploads fail with `InvalidAccessKeyId`, which looks like a crawler bug
rather than a stale key.

## Checking it works

```bash
curl -sI https://images.price-stalker.com/products/<some-key>.jpg   # 200 + image/jpeg
curl -so /dev/null -w '%{http_code}\n' https://images.price-stalker.com/   # 404, listing off
curl -so /dev/null -w '%{http_code}\n' -X POST https://images.price-stalker.com/x   # 405
```

A **404** on a key you know is missing means signing worked and S4 reported `NoSuchKey`.
A **502** means S4 rejected the request — usually bad or rotated credentials.

### Known issue

`HEAD` returns 502 even for objects that exist, while `GET` on the same key returns 200.
Browsers use GET for `<img>` so image loading is unaffected, but clients that issue a HEAD
validation request will fail. Cause not yet identified — the Worker masks the upstream status
by design, so diagnosing it needs temporary logging of the S4 response code.
