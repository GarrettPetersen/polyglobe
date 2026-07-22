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
logos, full-resolution screenshots, and the aligned capsule art layers and
Aseprite source.

## Social sharing

`src/assets/art/social-share.png` is the authored capsule art cropped to
1200 × 630 for large social cards. Every page references it through Open Graph
and X card metadata; the site tests verify both the PNG dimensions and tags.

Deployment uses the ignored root `.env` credentials and maps
`PRODUCTION_CLOUDFLARE_ACCOUNT_ID` and `PRODUCTION_CLOUDFLARE_API_TOKEN` to the
environment variable names expected by Wrangler. No Cloudflare credential is
stored in this app.

Pushes to `master` that change this app automatically run
`.github/workflows/deploy-marque-site.yml`. The workflow checks and builds the
site, then deploys it to the existing Cloudflare Pages project. It reads the
same two credential names from encrypted GitHub Actions secrets; the local
`.env` remains the fallback for manual deployments.

## Cloudflare Pages

- Project: `marque-and-reprisal`
- Pages URL: `https://marque-and-reprisal.pages.dev`
- Production domains: `marque-and-reprisal.com` and
  `www.marque-and-reprisal.com`

Both production domains use proxied CNAME records targeting
`marque-and-reprisal.pages.dev`. The `www` hostname is redirected to the apex
domain by `src/_redirects`.

### Manual domain setup

1. Add `marque-and-reprisal.com` as a Cloudflare zone. If the registrar is not
   Cloudflare, replace the registrar's nameservers with the two nameservers
   assigned by Cloudflare and wait for the zone to become active.
2. In **Workers & Pages → marque-and-reprisal → Custom domains**, associate
   `marque-and-reprisal.com` and `www.marque-and-reprisal.com` with the Pages
   project before creating the DNS records manually.
3. In the zone's **DNS → Records** screen, create these records with proxying
   enabled (orange cloud) and TTL set to Auto:

   | Type | Name | Target |
   | --- | --- | --- |
   | CNAME | `@` | `marque-and-reprisal.pages.dev` |
   | CNAME | `www` | `marque-and-reprisal.pages.dev` |

4. Wait for both custom domains and their certificates to show as active, then
   verify that the apex loads and `www` redirects to it. If DNSSEC was disabled
   while changing nameservers, re-enable it through Cloudflare after activation.
