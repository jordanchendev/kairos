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

The dev server runs on `http://localhost:5173` and proxies:

- `/api/poseidon/*` -> `http://localhost:8001/*`
- `/api/triton/*` -> `http://localhost:8000/*`

Generated clients are the only approved API access path. Raw `fetch()` and `axios` imports are lint-blocked outside generated code.

## Project Layout

- `src/app/` - shell, nav model, command menu
- `src/routes/` - lazy placeholder routes for the Phase 29 view map
- `src/lib/` - shared runtime, query client, utilities
- `deploy/nginx/` - stormtrooper Nginx site config
- `scripts/` - repeatable deploy and smoke-check entrypoints

## Production Deployment

Build the SPA locally or on CI, sync `dist/` to the stormtrooper frontend directory, then install `deploy/nginx/kairos.conf` as the site definition on the host. The config keeps the same `/api/poseidon` and `/api/triton` namespaces used in local development, so production stays same-origin and does not rely on CORS.

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

The deploy script prints or syncs the Nginx site path, and the smoke script checks `/`, `/api/poseidon/health`, and `/api/triton/health`.
