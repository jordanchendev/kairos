#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

REQUESTS_FILE="${TMP_DIR}/requests.log"
FAKE_CURL="${TMP_DIR}/curl"

cat >"${FAKE_CURL}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

url="${@: -1}"
printf '%s\n' "${url}" >> "${REQUESTS_FILE}"

case "${url}" in
  */|*/portfolio)
    exit 0
    ;;
  */poseidon/api/portfolio/performance)
    printf '{"nav_curve":[]}\n'
    ;;
  */triton/health)
    printf '{"status":"ok"}\n'
    ;;
  *)
    printf 'unexpected url: %s\n' "${url}" >&2
    exit 1
    ;;
esac
EOF

chmod +x "${FAKE_CURL}"

PATH="${TMP_DIR}:${PATH}" REQUESTS_FILE="${REQUESTS_FILE}" BASE_URL="http://example.test" \
  bash "${REPO_ROOT}/scripts/smoke-prod.sh"

cat >"${TMP_DIR}/expected.log" <<'EOF'
http://example.test/
http://example.test/portfolio
http://example.test/poseidon/api/portfolio/performance
http://example.test/triton/health
EOF

diff -u "${TMP_DIR}/expected.log" "${REQUESTS_FILE}"
