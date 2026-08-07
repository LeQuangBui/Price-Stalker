#!/usr/bin/env bash
# Deploy price-stalker to a VPS (build on the server). Run from your laptop.
#
# Prereqs on the VPS: Docker + docker compose, this repo cloned at $VPS_PATH,
# and a filled-in .env.prod next to docker-compose.prod.yml.
#
# Usage:
#   VPS_HOST=deploy@203.0.113.10 ./deploy/deploy.sh
#   VPS_HOST=203.0.113.10 VPS_USER=deploy VPS_PATH=/opt/price-stalker ./deploy/deploy.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:?Set VPS_HOST (e.g. deploy@203.0.113.10 or just the host)}"
VPS_USER="${VPS_USER:-}"                 # optional if VPS_HOST is already user@host
VPS_PATH="${VPS_PATH:-/opt/price-stalker}"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

target="$VPS_HOST"
[ -n "$VPS_USER" ] && target="$VPS_USER@$VPS_HOST"

echo ">> Deploying branch '$BRANCH' to $target:$VPS_PATH"

ssh "$target" BRANCH="$BRANCH" VPS_PATH="$VPS_PATH" \
  COMPOSE_FILE="$COMPOSE_FILE" ENV_FILE="$ENV_FILE" bash -se <<'REMOTE'
set -euo pipefail
cd "$VPS_PATH"

echo ">> Pulling latest $BRANCH"
git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo ">> Building images on the server"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo ">> Starting / updating services"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo ">> Pruning dangling images"
docker image prune -f

echo ">> Status"
docker compose -f "$COMPOSE_FILE" ps
REMOTE

echo ">> Deploy finished. Check ${PUBLIC_BASE_URL:-<PUBLIC_BASE_URL>}/api/healthz"
