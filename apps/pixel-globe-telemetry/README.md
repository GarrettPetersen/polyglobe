# Marque & Reprisal telemetry

This Cloudflare Worker accepts the game's optional pseudonymous telemetry and writes it
to Workers Analytics Engine. It stores no cookies, save files, account IDs, IP
addresses, or advertising identifiers.

Routine play analytics and crash reports use unit event weights and are sent for
all consenting installations. A fresh voyage records its quest, origin faction and
port, starting ship and loadout, and bounded captain demographics; it never sends
the generated captain name, exact coordinates, or save data. Analytics Engine
automatically removes data after three months.

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
npm run crashes:new
npm run crashes:mark-fixed
npm run performance:new
npm run performance:mark-fixed
npm run map-integrity
```

Run `configure-secret` once after the first deployment, and again only when rotating
the installation-hash secret. It generates the secret locally and never prints or
stores it.

The report command prints 30-day sessions, active playtime, voyage starts and
outcomes, broad feature engagement, and grouped crashes. Cloudflare credentials
are read from the root `.env` without being printed.

The crash command retrieves every grouped crash context in a bounded lookback window,
including the build revision, channel, platform, screen, redacted stack, report count,
affected-installation count, and first/last observation times. It defaults to 24 hours.
Use `--format json` for scheduled diagnosis or another machine-readable workflow:

From the repository root:

```sh
npm run --silent pixel-globe-telemetry:crashes -- --hours 48 --format json
```

For normal crash-fixing passes, read only reports observed after the shared
"all fixed" cursor:

```sh
npm run --silent pixel-globe-telemetry:crashes:new
```

That command remembers the report's read timestamp locally. After every reported
failure has been addressed, advance the shared cursor to that exact timestamp:

```sh
npm run --silent pixel-globe-telemetry:crashes:mark-fixed
```

Crashes arriving while fixes are underway remain after the cursor and appear in the
next pass. The dashboard keeps post-cursor reports open and moves reports at or before
the cursor into a collapsed history section.

Performance incidents use an independent cursor with the same read-then-advance
discipline. Read unresolved low-frame-rate and foreground-freeze reports with
`npm run performance:new`, address or classify every returned incident, then run
`npm run performance:mark-fixed`. The dashboard keeps earlier performance reports
in their own collapsed history so old builds do not obscure new regressions.

Map integrity diagnostics have their own dashboard feed. Run `npm run map-integrity`
to retrieve persistent tilt, distortion, terrain-spacing, and viewport-coverage
incidents together with older chart assertions, newest first.

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
