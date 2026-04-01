#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

HOST="${STORMTROOPER_HOST:-stormtrooper-lan}"
DEPLOY_PATH="${STORMTROOPER_DEPLOY_PATH:-/srv/www/kairos}"
NGINX_SITE_PATH="${STORMTROOPER_NGINX_SITE_PATH:-/etc/nginx/sites-available/kairos.conf}"

cd "${REPO_ROOT}"

npm ci
npm run build

echo "Syncing dist/ to ${HOST}:${DEPLOY_PATH}"
ssh "${HOST}" "mkdir -p '${DEPLOY_PATH}'"
rsync -az --delete "${REPO_ROOT}/dist/" "${HOST}:${DEPLOY_PATH}/"

echo "Copying Nginx site file to ${NGINX_SITE_PATH}"
scp "${REPO_ROOT}/deploy/nginx/kairos.conf" "${HOST}:${NGINX_SITE_PATH}"

echo "Validating and reloading nginx on ${HOST}"
ssh "${HOST}" "sudo nginx -t && sudo systemctl reload nginx"

echo "Deployment complete."
