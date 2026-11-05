# kairos

`kairos/` is the v6 SPA scaffold for Aquarium. It is a clean rebuild for the trading dashboard shell and deployment topology, while the legacy application now lives in `../kairos-bak/` as reference-only material.

## Stack

- React 19 + Vite + strict TypeScript
- Tailwind CSS v4 with CSS-variable tokens
- shadcn/ui baseline via `components.json`
- TanStack Query for server state
- Zustand for UI-only state
- `@hey-api/openapi-ts` for Poseidon and Triton client generation

## Development

```bash
npm install
npm run api:check
npm run api:generate
npm run dev
```

The dev server runs on `http://localhost:5173` and the frontend runtime talks to same-origin proxy bases:

- `/poseidon/*`
- `/triton/*`

The exact local proxy wiring is handled by the generated client runtime and Vite config; generated clients remain the only approved API access path.

Generated clients are the only approved API access path. Raw `fetch()` and `axios` imports are lint-blocked outside generated code.

## Project Layout

- `src/app/` - shell, nav model, command menu
- `src/routes/` - lazy placeholder routes for the view map
- `src/lib/` - shared runtime, query client, utilities
- `deploy/nginx/` - optional Nginx site config matching the production proxy namespaces
- `deploy/stormtrooper/` - production Caddy + Compose deployment files
- `scripts/` - repeatable deploy and smoke-check entrypoints

## Production Deployment

Production on `stormtrooper` currently uses the Caddy-based deployment in `deploy/stormtrooper/`. It serves the SPA at `/` and proxies backend traffic through the same-origin namespaces:

- `/poseidon/*` -> Poseidon
- `/triton/*` -> Triton
- `/briefs/*` -> read-only market-brief server on macminim4 (`index.json` + markdown; GET/HEAD only)
- `/ops/board.json` -> the pipeline status board, a static file from a read-only mount of `~/pipeline-status/public` (page `/ops`; spec `openapi/ops.json`, client `src/api/ops`, regenerate with `OPENAPI_SERVICE=ops npm run api:generate`)

`deploy/nginx/kairos.conf` is kept as an alternative host config and follows the same proxy contract.

Deploys are owner-run packages in the aquarium workspace (`local_dev/scripts/kairos/deploy-kairos-*.sh`): they ship a
git bundle into `~/Projects/kairos`, build `dist` on stormtrooper and recreate `kairos-proxy` with `docker compose up -d`,
which reads `deploy/stormtrooper/.env` itself. The old `scripts/deploy-stormtrooper.sh` (pulled a key out of a running
container) is retired.

After deployment, run:

```bash
BASE_URL=https://your-kairos-host.example.com npm run smoke:prod
```

The smoke script checks `/`, `/portfolio`, `/poseidon/api/portfolio/performance`, and `/triton/health`.
