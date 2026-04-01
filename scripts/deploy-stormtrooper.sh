#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

HOST="${STORMTROOPER_HOST:-stormtrooper}"
REMOTE_REPO_PATH="${STORMTROOPER_REPO_PATH:-~/Projects/kairos}"
REMOTE_COMPOSE_FILE="${STORMTROOPER_COMPOSE_FILE:-deploy/stormtrooper/docker-compose.yml}"

cd "${REPO_ROOT}"

echo "Deploying kairos on ${HOST} from ${REMOTE_REPO_PATH}"
ssh "${HOST}" "cd ${REMOTE_REPO_PATH} && git pull --ff-only origin main && npm ci && npm run build && export POSEIDON_API_KEY=\$(sudo docker inspect poseidon-api-1 --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSEIDON_API_KEY=//p' | head -n 1) && sudo --preserve-env=POSEIDON_API_KEY docker compose -f ${REMOTE_COMPOSE_FILE} up -d"

echo "Deployment complete."
