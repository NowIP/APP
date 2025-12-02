# NowIP

> Open-source Dynamic DNS (DDNS) platform with a Nuxt 4 control plane, Bun/Hono API, and an embedded authoritative DNS server.

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

## Quick Start
1. **Clone & copy environment files**
	```bash
	cp APP/example.env APP/.env
	cp API/example.env API/.env
	```
2. **Install dependencies**
	```bash
	cd APP && pnpm install         # or npm/yarn/bun
	cd ../API && bun install
	```
3. **Prepare the database (API/)**
	```bash
	cd API
	bun db:migrate                 # ensures data/db.sqlite exists + runs migrations
	```
4. **Run the backend (API + DNS)**
	```bash
	cd API
	bun run dev                    # HTTP API on NOWIP_API_HOST:NOWIP_API_PORT, DNS on NOWIP_DNS_PORT
	```
	> Port 53 requires elevated privileges on most systems. Adjust `NOWIP_DNS_PORT` (e.g., 5353) for local development if needed.
5. **Run the Nuxt app**
	```bash
	cd APP
	pnpm dev                       # http://localhost:3000
	```
6. **Grab the bootstrap admin credentials**
	- First API launch seeds an `admin` user and writes `data/initial_admin_credentials.txt`. Log in via the UI and rotate the password immediately.

## Environment Variables
### Frontend (`APP/.env`)
| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `NOWIP_API_URL` | Yes | `http://localhost:3003` | Base URL for the Bun API (used by `useAPI`). |
| `NOWIP_APP_ENABLE_SIGNUP` | No | `false` | Exposes the signup form when true. |
| `NOWIP_DNS_DOMAIN` | Yes | `dyn.is-on.net` | Displayed base domain for guidance and link building. |
| `USE_DEV_PROXY` | No | `false` | When true, routes `/api/proxy` through `nitro.devProxy`. |
| `DEV_PROXY_TARGET` | No | `https://api.nowip.is-on.net` | Target URL when `USE_DEV_PROXY=true`. |

### Backend (`API/.env`)
| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `NOWIP_FRONTEND_URL` | ✅ | `http://localhost:3000` | Allowed CORS origin + session redirect target. |
| `NOWIP_APP_ENABLE_SIGNUP` | No | `false` | Enables signup routes; keep false for closed beta. |
| `NOWIP_API_HOST` | No | `::` | Host interface for the HTTP API. |
| `NOWIP_API_PORT` | No | `3003` | API port. |
| `NOWIP_DB_PATH` | No | `./data/db.sqlite` | SQLite file location. |
| `NOWIP_LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error`, `critical`. |
| `NOWIP_DNS_HOST` | No | `::` | Host/interface for DNS server. |
| `NOWIP_DNS_PORT` | No | `53` | UDP/TCP port for DNS answers. |
| `NOWIP_DNS_DOMAIN` | ✅ | — | Root zone served by DNS + displayed in the UI. |
| `NOWIP_DNS_NS_PRIMARY` | ✅ | — | Primary NS glue record advertised in SOA/NS responses. |
| `NOWIP_DNS_NS_SECONDARY` | No | — | Optional secondary NS. |
| `NOWIP_DNS_CUSTOM_RECORDS_FILE` | No | `./config/custom-records.json` | JSON file for static records (see below). |

## Working with the API & DNS
- **REST + OpenAPI docs**: visit `http://localhost:3003/docs` for Scalar UI and `.../docs/openapi` for the spec consumed by `openapi-ts`.
- **DDNSv2 endpoint**: `GET /nic/update` accepts Basic Auth (`<domainId>:<secret>`) and `hostname`/`myip` query params, returning `good <ip>` or `badauth`.
  ```bash
  curl -u "42:ddnsv2_secret" "http://localhost:3003/nic/update?hostname=home.dyn.example.com&myip=203.0.113.10"
  ```
- **Custom DNS records**: populate the JSON pointed to by `NOWIP_DNS_CUSTOM_RECORDS_FILE`.
  ```json
  {
	 "@": { "TXT": [{ "text": "v=spf1 ~all", "ttl": 300 }] },
	 "status": { "CNAME": [{ "target": "uptime.example.net", "ttl": 120 }] }
  }
  ```
  The hybrid record store automatically merges these with per-domain additions from the UI while preventing invalid apex `CNAME/A/AAAA` conflicts.

## Frontend workflow (APP/)
- `pnpm dev` – SSR dev server with Nuxt DevTools.
- `pnpm build && pnpm preview` – production build & preview.
- `pnpm api-client:generate` – regenerates `app/api-client/*` from the live OpenAPI schema; run whenever backend contracts change.
- `app/composables/useAPI.ts` keeps session cookies in sync and transparently redirects to `/auth/login` when needed.
- Pages cover auth (`/auth/*`), domain dashboards (`/domains` + dynamic routes), DNS record editing, and account settings.

## Backend workflow (API/)
- `bun run dev` – watches `src/**`, starts Hono API and DNS simultaneously.
- `bun run start` – production entry.
- `bun db:generate` / `bun db:migrate` / `bun db:push` – Drizzle Kit operations (see `drizzle.config.ts`).
- Sessions live in `sessions` table; cookies named `session_token` are issued by `/auth/login`.
- Initial admin credentials land in `data/initial_admin_credentials.txt`; rotate or delete after onboarding.

## Deployment Notes
- Run the API/DNS service behind a supervisor (systemd, Docker, etc.). Map UDP+TCP 53 to the container/host when exposing DNS publicly.
- The Nuxt app can be deployed as a static site (`pnpm generate`) or server-rendered via Nitro (Bun preset already configured).
- Remember to set real domains for `NOWIP_DNS_DOMAIN` and NS records, then publish corresponding glue/NS entries at your registrar.
- For multi-instance setups, point all replicas to the same SQLite (or migrate to Postgres via Drizzle) and place `NOWIP_DNS_CUSTOM_RECORDS_FILE` on shared storage.

## Troubleshooting
- **DNS port already in use**: set `NOWIP_DNS_PORT=5353` locally and use `dig @127.0.0.1 -p 5353`. Switch back to 53 only in production.
- **Auth redirects loop**: ensure `NOWIP_FRONTEND_URL` matches the origin you use in the browser so CORS + cookies succeed.
- **Missing API types in the UI**: rerun `pnpm api-client:generate` after the backend schema changes, then restart Nuxt.
- **Custom records ignored**: verify JSON validity and restart the API; the loader currently runs on boot.

NowIP is still evolving—issues, PRs, and suggestions are welcome!
