#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost}"

echo "Checking ${BASE_URL}/"
curl --fail --silent --show-error "${BASE_URL}/" >/dev/null

echo "Checking ${BASE_URL}/portfolio"
curl --fail --silent --show-error "${BASE_URL}/portfolio" >/dev/null

echo "Checking ${BASE_URL}/poseidon/health"
curl --fail --silent --show-error "${BASE_URL}/poseidon/health" >/dev/null

echo "Checking ${BASE_URL}/triton/health"
curl --fail --silent --show-error "${BASE_URL}/triton/health" >/dev/null

echo "Smoke checks passed."
