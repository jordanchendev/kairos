#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost}"

echo "Checking ${BASE_URL}/"
curl --fail --silent --show-error "${BASE_URL}/" >/dev/null

echo "Checking ${BASE_URL}/portfolio"
curl --fail --silent --show-error "${BASE_URL}/portfolio" >/dev/null

echo "Checking ${BASE_URL}/poseidon/api/portfolio/performance"
curl --fail --silent --show-error "${BASE_URL}/poseidon/api/portfolio/performance" | grep -q '"nav_curve"'

echo "Checking ${BASE_URL}/triton/health"
curl --fail --silent --show-error "${BASE_URL}/triton/health" | grep -q '"status"'

echo "Smoke checks passed."
