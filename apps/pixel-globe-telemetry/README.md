# Marque & Reprisal telemetry

This Cloudflare Worker accepts the game's optional pseudonymous telemetry and writes it
to Workers Analytics Engine. It stores no cookies, save files, account IDs, IP
addresses, or advertising identifiers.

Routine play analytics use a deterministic 1% installation cohort and carry a
sampling weight of 100. Consented crash reports use weight 1 and are sent for all
installations. Analytics Engine automatically removes data after three months.

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
npm run verify
npm run report
```

Run `configure-secret` once after the first deployment, and again only when rotating
the installation-hash secret. It generates the secret locally and never prints or
stores it.

The report command prints 30-day sessions, active playtime, voyage outcomes, broad
feature engagement, and grouped crashes. Cloudflare credentials are read from the
root `.env` without being printed.
