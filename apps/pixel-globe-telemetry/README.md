# Marque & Reprisal telemetry

This Cloudflare Worker accepts the game's optional pseudonymous telemetry and writes it
to Workers Analytics Engine. It stores no cookies, save files, account IDs, IP
addresses, or advertising identifiers.

Routine play analytics and crash reports use unit event weights and are sent for
all consenting installations. Analytics Engine automatically removes data after
three months.

## Operations

The root `.env` must provide:

```text
PRODUCTION_CLOUDFLARE_ACCOUNT_ID=
PRODUCTION_CLOUDFLARE_API_TOKEN=
```

Deployments also require the Worker secret `INSTALL_HASH_PEPPER`. It is never stored
in git.

```sh
npm install
npm run check
npm run deploy
npm run configure-secret
npm run configure-dashboard
npm run verify-dashboard
npm run verify
npm run report
npm run crashes -- --hours 24
npm run crashes -- --days 7 --format json
```

Run `configure-secret` once after the first deployment, and again only when rotating
the installation-hash secret. It generates the secret locally and never prints or
stores it.

The report command prints 30-day sessions, active playtime, voyage outcomes, broad
feature engagement, and grouped crashes. Cloudflare credentials are read from the
root `.env` without being printed.

The crash command retrieves every grouped crash context in a bounded lookback window,
including the build revision, channel, platform, screen, redacted stack, report count,
affected-installation count, and first/last observation times. It defaults to 24 hours.
Use `--format json` for scheduled diagnosis or another machine-readable workflow:

From the repository root:

```sh
npm run --silent pixel-globe-telemetry:crashes -- --hours 48 --format json
```

## Dashboard

The same Worker serves the aggregate operations dashboard at:

```text
https://dashboard.marque-and-reprisal.com
```

Run `npm run configure-dashboard` after the first dashboard deployment. It configures
the Analytics Engine account and read token as encrypted Worker secrets. The browser
receives only aggregated query results; Cloudflare credentials, installation hashes,
event IDs, and raw stacks never leave the Worker.

The dashboard supports 24-hour, 7-day, 30-day, and 90-day views. Analytics responses
are cached at the Worker edge for five minutes to keep the dashboard inexpensive.
Run `npm run verify-dashboard` after deploying or rotating its secrets.
