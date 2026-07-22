# Marque & Reprisal website

Static marketing site and press kit for `marque-and-reprisal.com`.

The site deliberately lives beside the game rather than inside its `public`
directory, so website-only media never enters the Electron or HTML5 game
packages. Finished storefront art and captures are copied into this app as
explicit, reviewed website assets.

## Commands

From the repository root:

```sh
npm run marque-site:dev
npm run marque-site:check
npm run marque-site:deploy
```

The build is written to `apps/marque-and-reprisal-site/dist`. The build also
generates `downloads/marque-and-reprisal-press-kit.zip` from the fact sheet,
logos, full-resolution screenshots, gameplay trailer, and the aligned capsule
art layers and Aseprite source.

Deployment uses the ignored root `.env` credentials and maps
`PRODUCTION_CLOUDFLARE_ACCOUNT_ID` and `PRODUCTION_CLOUDFLARE_API_TOKEN` to the
environment variable names expected by Wrangler. No Cloudflare credential is
stored in this app.

## Cloudflare Pages

- Project: `marque-and-reprisal`
- Pages URL: `https://marque-and-reprisal.pages.dev`
- Production domains: `marque-and-reprisal.com` and
  `www.marque-and-reprisal.com`

Both production domains use proxied CNAME records targeting
`marque-and-reprisal.pages.dev`. The `www` hostname is redirected to the apex
domain by `src/_redirects`.
