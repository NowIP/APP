# NowIP

> Open-source Dynamic DNS (DDNS) platform with a Nuxt 4 control plane, Bun/Hono API, and an embedded authoritative DNS server.

Looking for the backend/DNS service guide? Head over to [`API/README.md`](https://git.leicraftmc.de/NowIP/API/README.md).

## Highlights
- Full-stack DDNS service: create domains, provision DDNSv2 credentials, and serve A/AAAA records directly from the built-in DNS server.
- Modern operator UI built with Nuxt 4 + Nuxt UI, featuring dark/light theming, route-level auth guards, and typed API hooks generated from OpenAPI.
- Bun-powered API using Hono, Drizzle ORM, SQLite, and `better-dns` to keep the stack dependency-light yet production ready.
- Batteries included developer experience: OpenAPI docs at `/docs`, codegened TypeScript client, DNS custom-record overrides, and automatic admin bootstrap.

## Architecture
```
[Nuxt 4 app (APP/)] <--REST/JSON--> [Hono API (API/)] -- Drizzle --> SQLite (data/db.sqlite)
															 |
															 +-- better-dns authoritative server -> Internet resolvers
```

## Repository Layout
```
APP/  ─ Nuxt 4 UI, @nuxt/ui components, generated API client, route middleware, assets
API/  ─ Bun entrypoint, Hono routers (auth, domains, account, DDNSv2), Drizzle schema, DNS server
```

## Tech Stack
| Layer | Tech | Notes |
| --- | --- | --- |
| UI | Nuxt 4, Nuxt UI, Vue 3, Pinia-like stores | SSR enabled, theme picker, typed composables |
| API | Bun 1.x, Hono, Zod, Drizzle ORM | Session cookies, OpenAPI docs, modular routers |
| DNS | `better-dns` | Hybrid record store that mixes DB driven A/AAAA answers with static overrides |
| Tooling | `@hey-api/openapi-ts`, Drizzle Kit | Generates type-safe client + migrations |

## Prerequisites
- **Node.js 20+** (or Bun) for the Nuxt app.
- **Bun 1.1+** for the API and DNS server.
- **SQLite** (bundled with Bun) and open TCP/UDP ports for DNS (defaults to 53).
- Recommended package managers: `pnpm` for `APP/`, Bun for `API/`.

## Quick Start (frontend)
1. **Set up the backend first**
	- Follow the instructions in [`API/README.md`](https://git.leicraftmc.de/NowIP/API/README.md) to run the Bun/Hono API and DNS server.
	- Confirm it is reachable at the URL you plan to place in `NOWIP_API_URL` (defaults to `http://localhost:3003`).
2. **Copy the frontend environment file**
	```bash
	cp APP/example.env APP/.env
	```
3. **Install UI dependencies**
	```bash
	cd APP
	pnpm install   # or npm/yarn/bun if preferred
	```
4. **Run the Nuxt dev server**
	```bash
	pnpm dev       # http://localhost:3000
	```
5. **Regenerate the API client when contracts change**
	```bash
	pnpm api-client:generate
	```

## Environment Variables
### Frontend (`APP/.env`)
| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `NOWIP_API_URL` | Yes | `http://localhost:3003` | Base URL for the Bun API (used by `useAPI`). |
| `NOWIP_APP_ENABLE_SIGNUP` | No | `false` | Exposes the signup form when true. |
| `NOWIP_DNS_DOMAIN` | Yes | `dyn.is-on.net` | Displayed base domain for guidance and link building. |
| `USE_DEV_PROXY` | No | `false` | When true, routes `/api/proxy` through `nitro.devProxy`. |
| `DEV_PROXY_TARGET` | No | `https://api.nowip.is-on.net` | Target URL when `USE_DEV_PROXY=true`. |

## Working with the API & DNS
- UI-side data fetching happens through the generated client in `app/api-client/*`, driven by the backend OpenAPI schema.
- Whenever the backend contracts change, restart the API (to refresh `/docs/openapi`) and run `pnpm api-client:generate`.
- For detailed backend endpoints, DDNS behavior, and DNS configuration, see [`API/README.md`](https://git.leicraftmc.de/NowIP/API/README.md).

## Frontend workflow (APP/)
- `pnpm dev` – SSR dev server with Nuxt DevTools.
- `pnpm build && pnpm preview` – production build & preview.
- `pnpm api-client:generate` – regenerates `app/api-client/*` from the live OpenAPI schema; run whenever backend contracts change.
- `app/composables/useAPI.ts` keeps session cookies in sync and transparently redirects to `/auth/login` when needed.
- Pages cover auth (`/auth/*`), domain dashboards (`/domains` + dynamic routes), DNS record editing, and account settings.

## Deployment Notes
- Deploy the Nuxt app via Nitro (Bun preset already configured) or export a static build with `pnpm generate` if SSR is not required.
- Configure runtime env vars (`NOWIP_API_URL`, etc.) in your hosting platform to point at the live API instance.
- For backend/DNS deployment considerations (ports, SQLite, DNS records, etc.) refer to [`API/README.md`](https://git.leicraftmc.de/NowIP/API/README.md).

## Troubleshooting
- **Auth redirects loop**: confirm the backend has `NOWIP_FRONTEND_URL` set correctly (see API README) and that `NOWIP_API_URL` points to it.
- **Missing API types in the UI**: rerun `pnpm api-client:generate` after backend schema changes, then restart Nuxt.
- **CORS/cookie issues**: the REST origin must match the backend config; double-check proxy settings or use `USE_DEV_PROXY=true` for remote APIs.
- Backend-specific DNS/DDNS issues are documented in [`API/README.md`](https://git.leicraftmc.de/NowIP/API/README.md).

NowIP is still evolving—issues, PRs, and suggestions are welcome!
