#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost}"
POSEIDON_PROXY_PREFIX="${POSEIDON_PROXY_PREFIX:-/poseidon}"
TRITON_PROXY_PREFIX="${TRITON_PROXY_PREFIX:-/triton}"

echo "Checking ${BASE_URL}/"
curl --fail --silent --show-error "${BASE_URL}/" >/dev/null

echo "Checking ${BASE_URL}/portfolio"
curl --fail --silent --show-error "${BASE_URL}/portfolio" >/dev/null

echo "Checking ${BASE_URL}${POSEIDON_PROXY_PREFIX}/api/portfolio/performance"
curl --fail --silent --show-error "${BASE_URL}${POSEIDON_PROXY_PREFIX}/api/portfolio/performance" | grep -q '"nav_curve"'

echo "Checking ${BASE_URL}${TRITON_PROXY_PREFIX}/health"
curl --fail --silent --show-error "${BASE_URL}${TRITON_PROXY_PREFIX}/health" | grep -q '"status"'

echo "Smoke checks passed."
