# 🧹 Cleanarr

Cleanarr scans your media download directories for **unused** files — media files
that are old enough and no longer hardlinked anywhere in your library — matches
them to their **qBittorrent** torrents (grouping cross-seed duplicates), and lets
you clean them from a simple web UI or automatically on a schedule.

It is the productionised successor to a small shell script that listed media
files older than N days with a hardlink count of 1.

## How it works

1. **Scan** — walk the configured download directories and collect media files
   whose age exceeds `SCAN_DAYS` and whose hardlink count is exactly `1`
   (nothing in the library references them anymore).
2. **Link** — query the qBittorrent WebUI API and match each unused file to the
   torrent(s) whose content path owns it. Several torrents on the same content
   are surfaced together as a **cross-seed** group.
3. **Clean** — remove the matched torrents from qBittorrent (with their data by
   default). Files that match no torrent are deleted directly from disk.

A NestJS cron runs the scan periodically and can optionally auto-clean.

## Monorepo layout

```
Cleanarr/
├── packages/
│   ├── backend/    NestJS + TypeScript API (scanner, qBittorrent client, cron)
│   └── frontend/   React + Vite + TypeScript UI
├── docker-compose.yml
└── .env.example
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`corepack enable`)
- A reachable qBittorrent WebUI

## Setup

```bash
pnpm install
cp .env.example .env   # then edit values
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

| Method | Path                | Body                                    | Description                                   |
| ------ | ------------------- | --------------------------------------- | --------------------------------------------- |
| `GET`  | `/api/files/unused` | —                                       | List cleanup candidates (grouped cross-seed). |
| `POST` | `/api/files/clean`  | `{ "files": string[], "deleteFiles"? }` | Clean the given files' torrents/data.         |
| `GET`  | `/api/health`       | —                                       | Health check.                                 |

## Configuration

All configuration is via environment variables — see [`.env.example`](.env.example).

| Variable           | Default        | Description                                          |
| ------------------ | -------------- | ---------------------------------------------------- |
| `QB_URL`           | —              | qBittorrent WebUI base URL.                          |
| `QB_USERNAME`      | —              | qBittorrent username.                                |
| `QB_PASSWORD`      | —              | qBittorrent password.                                |
| `SCAN_DIRS`        | —              | Comma-separated download directories to scan.        |
| `SCAN_DAYS`        | `7`            | Minimum file age (days) to be eligible for cleaning. |
| `MEDIA_EXTENSIONS` | built-in list  | Comma-separated media extensions (no dot).           |
| `CLEANUP_CRON`     | `0 4 * * *`    | Cron expression for the periodic scan.               |
| `CLEANUP_AUTO`     | `false`        | Auto-clean every candidate on each cron run.         |
| `CORS_ORIGINS`     | localhost:5173 | Comma-separated allowed CORS origins.                |
| `PORT`             | `3000`         | Backend port.                                        |

## Docker

```bash
cp .env.example .env   # edit, and set MEDIA_ROOT to your library root
docker compose up -d --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:3000/api

## License

MIT
