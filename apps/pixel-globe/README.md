# Marque & Reprisal Prototype

Standalone Canvas 2D prototype for **Marque & Reprisal**, a pixel-art sailing, trade, and exploration game set in 1522.

It deliberately does not render the 3D globe. The app:

- decodes a prebuilt subdivision-8 geodesic graph instead of constructing it at startup,
- loads the shared `examples/globe-demo/public/earth-globe-cache-8.json`,
- stamps copied Three Kingdoms terrain sprites as detached tile blobs,
- animates water with staggered two-frame Three Kingdoms shallow/deep sprites,
- blends generated intermediate water sprites across coast-distance bands for smoother dropoff,
- maps subdivision-6 annual weather and subdivision-7 runtime weather onto the finer terrain for clouds, rain, snow, sea ice, freshwater ice, and selected-hex wind,
- generates between-tile face polygons at runtime, including pentagon neighborhoods,
- moves a local tangent-plane camera over the spherical tile graph,
- renders a rolling local unwrap where tile pixel positions are fixed when they enter the viewport,
- draws a tiny Mercator minimap from averaged land/sea tile coverage.

Run from the repo root:

```sh
npm run pixel-globe:dev
```

Then open `http://127.0.0.1:5177/`.

Build the static Cloudflare Pages bundle from the repo root:

```sh
npm run pixel-globe:build
```

The build output is `apps/pixel-globe/dist`.

Deploy the full browser build to the existing Cloudflare Pages project with:

```sh
npm ci
npm --prefix examples/globe-demo ci
npm --prefix apps/pixel-globe ci
npm --prefix apps/pixel-globe run deploy
```

Deployment reads `PRODUCTION_CLOUDFLARE_ACCOUNT_ID` and
`PRODUCTION_CLOUDFLARE_API_TOKEN` from the environment or the ignored root
`.env` file. Pushes to `master` that change the game, its shared runtime data,
or the deployment workflow automatically test, build, and deploy the full game
through `.github/workflows/deploy-pixel-globe.yml`.

Deployment runs the fast reachability suite. It visits every port through the
real city-action contracts, completes a fleet engagement at Lepanto, restores
every supported frozen save, and frame-steps representative sailing, naval
combat, and port-assault scenarios in the production browser build:

```sh
npm run test:reachability:fast
```

For a short headless check while changing dialogue or player actions:

```sh
npm run test:actions
```

This runs the dialogue journeys, renderer contracts, action/icon and staff
catalogs, and generated player-action boundary cases. These also run in `npm test`
and the deployment gate:

- Every catalog hull is tested with small and full crews, empty and full holds,
  and insufficient, nearly sufficient, and sufficient reward-purchase money.
- Inn quests execute real deliveries, ship acquisition, and recruitment using
  the same domain transactions as the browser. Every enabled choice is selected
  on isolated state; every successor is validated and rendered. Disabled choices
  must leave the player and economy unchanged.
- Crew recruitment selects every offered candidate at berth and hold boundaries.
- Every pair of catalog hulls is checked: a permitted replacement must preserve
  the roster, fit the hold, and agree with the cargo preview. Rejected replacements
  must not mutate state.

The finite inn quest graphs require complete exploration. An unknown host action,
a skipped enabled choice, or an exhausted traversal budget fails the audit. Errors
include the scenario ID and the shortest sequence of option indices/action kinds
needed to reproduce them. The artillery journey renders each real delivery result.

`npm run test:reachability:contracts` adds the broader all-port audit: every
enabled option in each city location is executed on isolated state and its
successor view is validated, even when deeper traversal is skipped or its node
was already visited. Optional inn offers are spawned deterministically. Actions
handed to the browser host are checked through the dialogue handoff in this broad
navigation pass; the complete quest audits execute acquisition and recruitment.
Other host effects still need domain tests and production browser scenarios. The
one-step recruitment and bounded navigation audits report exploration boundaries;
they do not claim to enumerate every possible game state.

When adding an NPC, test both the initial conversation and its reachable quest
stages. When changing an action result, render the next view using the actual
result and exercise all offered choices, including insufficient resources and
full-capacity states. Add new finite journeys through `exploreReachableActionGraph`
with `requireComplete: true`, a key including all consequential state, state/view
validators, and real action executors. Catalog-generated cases automatically pick
up new hulls, and new enabled choices in an audited state are automatically tested.
Keep assertions active: tests should expose invalid transitions and incomplete
render contracts before release.

`.github/workflows/test-pixel-globe.yml` runs source tests, the all-port audit, and
production browser journeys on pull requests. Its nightly and manual runs use the
deeper release profile. These checks require no deployment credentials. Repository
branch protection can require this workflow's `test` job before merging.
Browser checks fail on uncaught exceptions, page crashes, the fatal-error screen,
and `console.error`, so catching and logging a broken action cannot make a test pass.

Ground assaults use four lanes with continuous movement between them. Combat
distance includes both forward and lateral separation; melee profile ranges give
spears and polearms more reach than swords. Living units occupy body space (larger
for cavalry), including during landing. Movement and knockback sweep that space;
blocked troops wait or cross to an open adjacent lane, and fallen troops release
their place. The renderer interpolates the same lane positions, with depth drawn
at half scale. These are transient battle states, not new save fields.

`portAssaultBattle.test.js` exercises all 441 combat-profile pairings and crowded
mixed formations on every dock kind, checking attack reach, body separation,
landing eligibility, and forecast/replay agreement. `portAssaultFormation.test.js`
checks advancing into gaps, diagonal crossings, knockback, and spatial-index
equivalence to full-roster collision checks. Both run in the default source suite.

Before a user-facing release, run the opt-in exhaustive profile. It follows
deeper port dialogue paths, runs the complete historical-battle suite, and
frame-steps the complete dedicated sailing, naval-combat, bombardment, and
fortified/unfortified port-assault test matrix:

```sh
npm run test:reachability:release
```

The much slower whole-world traversal remains separately opt-in with
`npm run test:world-traversal` for changes to globe layout or traversal code.

Build the unlimited HTML5 demo ZIP for itch.io:

```sh
make pixel-globe-demo-itch
```

The upload-ready archive is
`apps/pixel-globe/build/marque-and-reprisal-demo-itch.zip`. It contains
`index.html` at the ZIP root, uses relative runtime paths for itch.io's
subdirectory hosting, and validates itch.io's default file, path, and size
limits before packaging. The demo build keeps its large weather bake as one
browser-loaded file so the archive remains below itch.io's 1,000-file ceiling.

The demo has no voyage timer. It exposes all game features within the
Mediterranean, Black Sea, and their connected rivers; Gibraltar marks the edge
of the demo voyage.

Controls: arrow keys or WASD steer. Space or Enter activates the available interaction.

Standard gamepads are fully supported. The left stick or D-pad steers and navigates,
the south face button confirms or interacts, the east face button goes back, the west
face button anchors, and the north face button scavenges or releases a tethered whale.
Shoulders or triggers fire the corresponding broadside, Start opens the captain's chart
or pauses battle, and the right stick scrolls long panels.

Developer weather controls are available only with `?debugWeather=true`.
`[` / `]` step the annual weather day, `,` / `.` step the hour, and Backslash pauses/resumes the weather clock.

The default terrain variant is `resurrect-64`. Palette and start-location test URLs.
Available local terrain variants include
`full-color`, `vinik24`, `fantasy-24`, `resurrect-64`, `lost-century`,
and `apollo`.

```text
http://127.0.0.1:5177/?lat=31.2&lon=121.5
http://127.0.0.1:5177/?lat=70&lon=-135&day=20&hour=12
http://127.0.0.1:5177/?terrain=full-color&lat=31.2&lon=121.5
http://127.0.0.1:5177/?terrain=vinik24&lat=23.5&lon=13
```
