# Torrentio Addon

Stremio addon that provides torrent streams from a database of scraped torrent providers, with optional debrid service integration (RealDebrid, Premiumize, AllDebrid, Put.io and others).

Based on [torrentio-scraper](https://github.com/TheBeastLT/torrentio-scraper) by TheBeastLT.

## How it works

The addon serves Stremio stream requests by querying a PostgreSQL database of torrents and their parsed files. Populating that database is the job of a separate scraper service, which is not part of this repository — the addon works with any database that follows the same schema (see `lib/repository.js` for the models).

If the scraper module is present next to the addon (`../scraper`), on-demand scraping is enabled automatically: when a requested IMDB ID has no results, scrapers are triggered in real time. Without it the addon runs standalone and simply serves what is in the database.

## Requirements

- Node.js 20+
- PostgreSQL (torrent storage)
- MongoDB (stream cache)

## Configuration

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URI` | PostgreSQL connection string | required |
| `MONGODB_URI` | MongoDB connection string for caching | in-memory cache |
| `PORT` | HTTP port | `7000` |
| `ENABLE_SYNC` | Sync database schema on startup (full deployment only) | off |
| `ENABLE_ON_DEMAND_SCRAPING` | Trigger scrapers for unknown IMDB IDs (requires scraper module) | `true` |
| `RESOLVER_HOST` | Public URL of this addon, used for debrid stream resolving | |
| `CACHE_MAX_AGE` | Stream cache TTL in seconds | `3600` |

## Running locally

```bash
npm ci
DATABASE_URI=postgresql://user:pass@localhost:5432/torrentio node index.js
```

Or with Docker (starts PostgreSQL, MongoDB and the addon):

```bash
docker compose up -d
```

## Production deployment

`docker-compose.prod.yml` contains a full production stack: Traefik with automatic Let's Encrypt certificates, PostgreSQL, MongoDB and the addon.

```bash
cp .env.example .env
# edit .env: set DOMAIN, ACME_EMAIL and POSTGRES_PASSWORD
docker compose -f docker-compose.prod.yml up -d
```

The addon becomes available at `https://<DOMAIN>/` — open it in a browser to configure and install in Stremio.

## License

Apache 2.0 — see [LICENSE](LICENSE). Original work by [TheBeastLT](https://github.com/TheBeastLT/torrentio-scraper).
