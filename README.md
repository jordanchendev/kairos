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
- `src/routes/` - lazy placeholder routes for the Phase 29 view map
- `src/lib/` - shared runtime, query client, utilities
- `deploy/nginx/` - optional Nginx site config matching the production proxy namespaces
- `deploy/stormtrooper/` - production Caddy + Compose deployment files
- `scripts/` - repeatable deploy and smoke-check entrypoints

## Production Deployment

Production on `stormtrooper` currently uses the Caddy-based deployment in `deploy/stormtrooper/`. It serves the SPA at `/` and proxies backend traffic through the same-origin namespaces:

- `/poseidon/*` -> Poseidon
- `/triton/*` -> Triton

`deploy/nginx/kairos.conf` is kept as an alternative host config and follows the same proxy contract.

Typical flow:

```bash
npm run build
STORMTROOPER_HOST=stormtrooper-lan \
STORMTROOPER_DEPLOY_PATH=/srv/www/kairos \
npm run deploy:stormtrooper
```

After deployment, run:

```bash
BASE_URL=https://your-kairos-host.example.com npm run smoke:prod
```

The smoke script checks `/`, `/portfolio`, `/poseidon/api/portfolio/performance`, and `/triton/health`.
