# 🧹 Cleanarr

[![CI](https://github.com/godwin42sh/Cleanarr/actions/workflows/ci.yml/badge.svg)](https://github.com/godwin42sh/Cleanarr/actions/workflows/ci.yml)
[![Publish images](https://github.com/godwin42sh/Cleanarr/actions/workflows/publish.yml/badge.svg)](https://github.com/godwin42sh/Cleanarr/actions/workflows/publish.yml)

Cleanarr scans your media download directories for **unused** files — media files
that are old enough and no longer hardlinked anywhere in your library — matches
them to their **qBittorrent** torrents (grouping cross-seed duplicates), stores
the candidates in PostgreSQL, and lets you review and manually clean them from a
simple web UI. A scheduled cron keeps the candidate list fresh; cleaning is
always a deliberate, manual action.

It is the productionised successor to a small shell script that listed media
files older than N days with a hardlink count of 1.

## How it works

1. **Scan** — walk the configured download directories and collect media files
   whose age exceeds `SCAN_DAYS` and whose hardlink count is exactly `1`
   (nothing in the library references them anymore).
2. **Link** — query the qBittorrent WebUI API and match each unused file to the
   torrent(s) whose content path owns it. Several torrents on the same content
   are surfaced together as a **cross-seed** group.
3. **Store** — persist the resulting candidates (with their files, torrents, and
   an audit trail of scan runs) to PostgreSQL via Prisma.
4. **Clean** — _always manual_. From the UI or API you select candidates to
   clean; the matched torrents are removed from qBittorrent (with their data by
   default) and files matching no torrent are deleted directly from disk. Every
   cleanup is recorded as an auditable event.

A NestJS cron runs the scan periodically and **only scans and stores** — it
never cleans. Cleaning is triggered manually.

## Monorepo layout

```
Cleanarr/
├── packages/
│   ├── backend/    NestJS + TypeScript API (scanner, qBittorrent client, Prisma, cron)
│   │   └── prisma/ Prisma schema + migrations
│   └── frontend/   React + Vite + TypeScript UI
├── docker-compose.yml
└── .env.example
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`corepack enable`)
- A reachable qBittorrent WebUI
- A PostgreSQL database

## Setup

```bash
pnpm install
cp .env.example .env   # then edit values (DATABASE_URL, qBittorrent, scan dirs)

# Generate the Prisma client and apply the schema to your database:
pnpm --filter @cleanarr/backend prisma:generate
pnpm --filter @cleanarr/backend prisma:migrate      # production: migrate deploy
# For local dev against a fresh DB you can instead use:
# pnpm --filter @cleanarr/backend prisma:migrate:dev
```

## Development

```bash
pnpm dev:backend     # NestJS on http://localhost:3000/api
pnpm dev:frontend    # Vite on http://localhost:5173 (proxies /api → backend)
```

## Quality

```bash
pnpm test            # unit + component tests (all packages)
pnpm lint            # eslint (all packages)
pnpm format          # prettier --write
pnpm format:check    # prettier --check
```

The backend also has an e2e suite: `pnpm --filter @cleanarr/backend test:e2e`.

## API

| Method | Path                | Body                                    | Description                                             |
| ------ | ------------------- | --------------------------------------- | ------------------------------------------------------- |
| `GET`  | `/api/files/unused` | —                                       | List stored cleanup candidates from the last scan.      |
| `POST` | `/api/files/scan`   | —                                       | Trigger a fresh scan now, persist, and return the list. |
| `POST` | `/api/files/clean`  | `{ "files": string[], "deleteFiles"? }` | Clean the given files' torrents/data (manual).          |
| `GET`  | `/api/health`       | —                                       | Health check.                                           |

The API is documented with **OpenAPI** via `@nestjs/swagger`. When the backend
is running, interactive docs are at **`/api/docs`** (raw spec at `/api/docs-json`).

### Typed client (OpenAPI → hey-api)

The frontend talks to the backend through a client **generated from the OpenAPI
spec** with [`@hey-api/openapi-ts`](https://heyapi.dev), including **runtime
response validation** (Zod schemas generated from the same spec). To regenerate
after changing the API:

```bash
pnpm --filter @cleanarr/backend generate:openapi   # writes packages/backend/openapi.json
pnpm --filter @cleanarr/frontend generate:api       # regenerates packages/frontend/src/client
```

Both the spec (`openapi.json`) and the generated client (`src/client`) are
committed, so no codegen is required to build.

## Configuration

All configuration is via environment variables — see [`.env.example`](.env.example).

| Variable            | Default        | Description                                                                                                           |
| ------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_USER`     | `cleanarr`     | Postgres user (docker compose; shared with backend).                                                                  |
| `POSTGRES_PASSWORD` | `cleanarr`     | Postgres password — the single source of truth.                                                                       |
| `POSTGRES_DB`       | `cleanarr`     | Postgres database name.                                                                                               |
| `DATABASE_URL`      | derived        | Prisma connection string. In compose it is derived from `POSTGRES_*`; set it directly for host dev or an external DB. |
| `QB_URL`            | —              | qBittorrent WebUI base URL.                                                                                           |
| `QB_USERNAME`       | —              | qBittorrent username.                                                                                                 |
| `QB_PASSWORD`       | —              | qBittorrent password.                                                                                                 |
| `SCAN_DIRS`         | —              | Comma-separated download directories to scan.                                                                         |
| `SCAN_DAYS`         | `7`            | Minimum file age (days) to be eligible for cleaning.                                                                  |
| `MEDIA_EXTENSIONS`  | built-in list  | Comma-separated media extensions (no dot).                                                                            |
| `CLEANUP_CRON`      | `0 4 * * *`    | Cron expression for the periodic scan-only job.                                                                       |
| `CORS_ORIGINS`      | localhost:PORT | Comma-separated allowed CORS origins (compose defaults to the frontend port).                                         |
| `PORT`              | `3000`         | Backend port.                                                                                                         |
| `FRONTEND_PORT`     | `8080`         | Host port the frontend is published on (docker compose).                                                              |

## Docker

```bash
cp .env.example .env   # edit, and set MEDIA_ROOT to your library root
docker compose up -d --build
```

Compose starts three services — **PostgreSQL**, the backend, and the frontend.
The backend waits for the database to be healthy, applies Prisma migrations on
startup (`migrate deploy`), then serves the API.

The database password is set **once** via `POSTGRES_PASSWORD` (a shared YAML
anchor feeds both the `db` container and the backend). The backend builds its
`DATABASE_URL` from `POSTGRES_*` at startup, so the password is never duplicated
across services. For a password with URL-reserved characters or an external
database, set `DATABASE_URL` on the backend explicitly and it is used as-is.

- Frontend: http://localhost:8080 (change with `FRONTEND_PORT`)
- Backend: http://localhost:3000/api

## CI / CD

Two GitHub Actions workflows:

- **[CI](.github/workflows/ci.yml)** — on every push/PR to `main`: install,
  `prisma generate`, format check, lint, unit + e2e tests, and build.
- **[Publish images](.github/workflows/publish.yml)** — on push to `main` and on
  `v*` tags: builds and pushes the backend and frontend images to the GitHub
  Container Registry (GHCR), tagged `latest`, the branch name, the short SHA,
  and the semver tag. No secrets required — it uses the built-in `GITHUB_TOKEN`.

Published images (linux/amd64):

- `ghcr.io/godwin42sh/cleanarr-backend`
- `ghcr.io/godwin42sh/cleanarr-frontend`

## Deploy on TrueNAS Scale

A ready-made compose file that pulls the published GHCR images (nothing is built
on the NAS) lives at [`deploy/truenas/docker-compose.yml`](deploy/truenas/docker-compose.yml).

1. In TrueNAS Scale (Electric Eel 24.10+): **Apps → Discover Apps → Custom App →
   Install via YAML**, and paste the file's contents (or run it with
   `docker compose` on the host).
2. Edit the values marked `CHANGE ME`: the two host dataset paths (Postgres data
   and your media dataset), the qBittorrent URL/credentials, and `SCAN_DIRS`.
3. Keep the media **host path == container path** so `SCAN_DIRS` and the
   qBittorrent content paths line up. Then open `http://<nas-ip>:30080`.

New releases: push a `v*` tag to rebuild the images, then re-pull on the NAS.

## License

MIT
