# Automated playtesting

The release gate now runs seeded, persistent journeys through real port dialogue
and domain transitions, alongside the existing catalog audits and browser tests.
No game exception is caught and treated as successful gameplay.

From `apps/pixel-globe`:

```sh
npm run test:playtest
npm run playtest:soak
npm run playtest:replay -- --replay=.playtest/failure-minimized.json
```

`test:playtest` checks the harness itself and runs four 100-action journeys. It is
part of `check:deploy` and pull-request CI. Existing nightly/manual CI also runs
longer journeys with a rotating seed. CI retains reports and replays for 14 days. `playtest:soak` builds the game, then runs approximately
three hours of rotating seeds, 500-action journeys and the real-browser release
scenario suite. It finishes its current cycle before stopping. To choose a budget:

```sh
node tools/playtest/run.mjs --seed=42 --steps=500 --hours=2 --browser=true
```

The release gate also runs one continuous browser journey per cycle. Browser runs
require a current `npm run build`. The exhaustive release matrix runs once per soak,
with a two-hour aggregate timeout and ten-minute per-scenario timeouts; recurring
browser journey and checklist lanes each have a one-hour timeout. Reports, replay
saves, minimized failures, checkpoints and browser
logs go to ignored `.playtest/`, or a directory passed with `--output=...`.
`report.json` describes the latest run; failure files from older runs are retained
until another failure replaces them. A failed command exits nonzero.

## What runs

Journeys start in London, Lisbon, Istanbul and Iceland, using the complete city
catalog, a real ship and crew, initialized markets and a captain with a canonical
home port. The bot chooses among enabled actions, preferring action categories
it has exercised less often. It can change loadouts, recruit and dismiss crew,
buy and sell, undo market transactions, accept and deliver missions, visit city
services and encounter policies at other ports. Cargo, money, crew, reservations,
quests and the entire economy persist across actions and visits.

Each cycle continues the preceding cycle's checkpoints, retaining the entire
player history for the duration of the soak. Checkpoint storage is bounded to one save per starting scenario.
The report lists actual action coverage, visited cities and observed host-action
boundaries. Action identities use canonical entity IDs, not translated labels
or option positions. Each replay resolves the action against the current view.

After transitions the runner checks:

- Runtime state and dialogue contracts, plus the politics view.
- Disabled buttons cannot mutate state or request host actions.
- Trade money and cargo accounting, including unrelated goods.
- Completed missions cannot pay again through a stale call.
- JSON save/restore preserves player consequences and market stocks/specie.
- Incremental economy serialization agrees with synchronous serialization.
- Progress: 32 consecutive no-op actions or 128 actions without reaching a new
  state fail with a replay, so a potential soft lock is actionable.

A world-aging action advances politics and markets around the existing voyage,
then reconciles quest ownership assumptions. This tests interactions between
historical events and player-created history.

The browser suite separately exercises sailing, naval combat, city assault,
colonist landing, whale towing, the chef feast, castaway homecoming, Roanoke's
clue, and frozen/interrupted save restoration. Its simulation uses the existing
normal-step gameplay capture machinery; this runner does not enlarge physics dt.

## Limits that must remain visible

Domain travel is a scenario seam: it materializes the next port, including active
mission destinations. It does not prove navigability, docking admission, hunger,
or continuous sailing. World aging is another setup seam, not a month of player
survival. Domain random outcomes now use a seeded stream stored with each checkpoint,
so continuing or replaying a save resumes its random cursor. Browser randomness
is seeded per page load. Sailing replays the destination intent with a bounded
48000-frame budget, allowing asynchronous worker timing to vary while retaining
normal docking preconditions. The fixed browser scenarios remain separate probes,
while an additional continuous journey exports an actual naval battle voyage,
restores it through the normal save loader, sails to Lisbon, trades, accepts a
mission, sails to its destination, completes it, inspects crew and politics, and
reloads again to check the resulting cargo, money, crew and mission history.
The pilot plans over the production navigability graph and submits directional
input at normal 60 Hz physics steps. Wind, collisions, weather, survival and
docking admission remain active. It never teleports the ship after the battle. Host actions without domain executors are listed
as boundaries; unexpected host effects fail instead of being ignored.

Passing this suite does not mean every combination is covered. The continuous
browser journey currently begins with one Portuguese battle fixture; it is not
a universal combat strategist or an exhaustive mission solver. Separate city
assault and quest-scene probes still supply coverage outside that journey.
Host boundaries in the domain report remain explicit rather than being counted
as executed browser actions. Do not label domain port visits as sailing.

## Reproduction and extension

A failure stores its initial save, seed, build revision, ordered action IDs and
invariant diagnostic. The minimizer removes action chunks only if the same
invariant still fails; unavailable actions do not count as reproductions. It
makes at most 24 replay attempts in the CLI. Replay on the original revision for
exact reproduction; cross-revision replay is useful for checking a fix and emits
a warning. Artifacts mark whether the checkout had uncommitted changes.

`journey.mjs` accepts adapters with `initial`, `restore`, `snapshot`, `actions`,
`execute`, `check` and `key`. `boundaries` is optional. Use real constructors and
public transitions in new adapters. Register meaningful behavior oracles: a bot
that only checks for exceptions will miss reputation, reward and accounting bugs.
Keep unsupported host work explicit. Add a named regression test for every real
bug the bot discovers; random exploration supplements those tests.

Browser traces include real action IDs, sailing destinations, menu commands and
save/reload boundaries. Replay a browser failure (or a successful trace) with:

```sh
node tools/playtest/browser.mjs --replay=.playtest/browser-journey/failure.json
```

Browser failures retain the starting post-combat save and last observation.
Browser traces are not minimized; asynchronous browser/worker timing can vary,
so they are reproductions to inspect rather than a promise of bit-exact replay.
Domain traces retain deterministic minimization. Each browser process has a
30-minute timeout in the soak and a 400-action mission budget; failure to reach its objectives
fails the run, including pilot limitations, instead of silently skipping the case.

The release browser matrix opens all four owned-shipyard tabs (ships, stores,
accounts, upgrades), uses keyboard and wheel navigation on each, and exercises
available, purchased, reserved and lost supply-ship upgrade states. Normal dialogue
tests also select every ledger tab and validate its generic navigation rows. The
matrix reveals Valencia's pirate cove through mercy and saves/reloads beside it.
For a focused browser regression without a soak, after building run:

```sh
PIXEL_GLOBE_SMOKE_FOCUS=port-regressions node tools/run-save-restore-smoke.mjs
```

Regression tests also advance the coupled economy and NPC fleet through ten
years and 120 save/load cycles. Compact-save tests verify that retained
surrendered hulls prevent reconstructed shipyards from selling their IDs again.

## Worker lifecycle and accumulated history

Every soak cycle also continues `worker-campaign/checkpoint.json` for another
30 game days. It runs the shipped worker message handler in a Node worker thread,
with authored settlement metadata, the generated road network, real economies,
NPC fleets, fisheries and a frozen older player-shipyard investment. Strategic
catch-up is bounded to six hours per request; this does not alter physics dt.
Every second month captures a merchant and trades the prize into the backed
Lisbon yard, exercising replacement queues and subsequent secondhand resales. Monthly
JSON round trips must preserve the complete economy, fleet and land trade state.
Every worker commit checks sale/listing IDs against both live and queued ships.
The checkpoint carries across cycles, rather than alternating back to a fresh
world. Failure artifacts retain the last checkpoint and the failing month.

Run or resume this lane independently:

```sh
node tools/playtest/worker-campaign.mjs --months=12 --output=.playtest/worker-campaign
node --test src/workerVoyageInterruption.test.js
```

The interruption regression runs a real worker purchase, then snapshots at every
incremental main-thread snapshot, comparison and restore boundary. It executes
the production apply functions extracted from `main.js`, with real incremental
restore plans; rendering callbacks are excluded. Both durable player-yard books
and optional world snapshots must belong to the same completed generation.
Separate resale tests cover NPC upgrades, player trade-ins, captures, repeated
reloads and the frozen v11 counter corruption produced by the released loader.

Browser journeys now enable diagnostic mode: chart reframes and excessive
sailing-position corrections fail the run even when FPS remains high.

This still does not reproduce an arbitrary player's history without their save.
Worker campaigns use live diplomacy and sovereign trade access, including
changes after war, grants, and save restoration. Fishing-ground navigability
remains a setup seam; they do not replace browser combat, geographic
navigation tests, or hardware performance benchmarks. The process reports these
lanes separately rather than adding worker ticks to player-action counts.

Browser-enabled cycles also run a 15-second busy-world benchmark after warmup,
with 4× CPU throttling in headed Chromium and an isolated temporary browser
profile. Headless animation-frame cadence is deliberately excluded because the
browser can suppress it independently of game CPU work. The gate fails below 10
rendered FPS or above a 500 ms maximum frame gap. It checks rendered frames
separately from update-loop FPS, retains the measured report, and catches runtime
errors as failures. These are broad release regression limits, not hardware
certification or evidence that every weather/port combination is fast.

## Mandatory recent-crash regressions

Every cycle runs `telemetry-regressions.mjs` before the persistent world campaign.
It runs the shipyard identity/reconstruction and resale tests, the production
worker interruption test at every incremental apply/save boundary, and naval
routing regressions including the frozen detached Inca reserve save. A separate
policy contract proves war and trade grants reach both live NPC routing and worker
messages before and after reload. Required test files must exist; subprocess
failures stop the soak. The report names the covered telemetry fingerprints.

The reserve campaign then forces abolition and capital loss for four realms and
worker updates in mature historical worlds, independent of random selection.
This explicitly covers both crash fingerprints seen through 7 September 2026;
it does not claim exhaustive coverage of every future political combination.

The September 7 follow-up adds a frozen mixed-generation Istanbul stock/fleet
save and checks its versioned migration before a real worker advance. Current
snapshots with the same collision must fail validation. It also runs the actual
storm sweep and rescue functions, saving airborne and swimming individual crew;
obsolete anonymous-crew fixtures no longer stand in for production sailors.


## Persistent browser checklist player

Browser-enabled cycles additionally run a seeded, shuffled checklist in one
voyage. Run it directly after building:

```sh
node tools/playtest/browser.mjs --checklist=true --seed=42 --output=.playtest/checklist
```

The initial objectives are buying and selling cargo, recruiting a sailor,
inspecting crew, equipment, shipyard and inn menus, completing a delivery,
opening politics, saving/reloading, sailing to a port and teleporting to a port.
Menu inspection is reported as inspection, not an equipment or ship purchase.
The planner chooses offered, enabled action IDs and checks the actual resulting
state. A dialogue with exactly one option advances automatically only if that
option is enabled. Repeated choices still consume the bounded action budget;
an unhandled dialogue or unfinished objective fails with the pending checklist.

Every completed objective crosses a save/page-reload boundary. Later objectives
inherit the voyage's cargo, crew, quests, damage, economy and politics. At least
one leg must sail with normal physics, weather and worker updates. Teleport
legs are reported separately: a local-only test command moves the ship through
a full voyage snapshot/restore, then the player must dock normally. It does not
advance time or create new resources. The report records actual sailing frames,
travel legs, action types, shuffled order and completion evidence.

Pass `--initial=/absolute/path/to/save.json` to start with a saved voyage rather
than the initial naval-battle fixture. This does not guarantee the current
planner can satisfy its checklist from every possible starting situation:
lack of money, unavailable recruitment or unsupported missions fail explicitly.
The first implementation has no autonomous naval/city combat, colony,
whale-hunt or ship-purchase strategy. The separate scenario probes remain
necessary. Recorded commands can be replayed, but a planner dead end requires
inspection of the last state and pending checklist; replaying successful prior
commands alone does not reproduce the planner's failure to choose its next one.

## Destroyed-port entry

Every randomized browser checklist includes `destroyed-port`. It applies the real
shore-battery damage transition to Chillicothe on the existing voyage (a test-only
battle-outcome setup), then uses ordinary docking and dialogue actions. The check
requires a rendered recovery scene with services closed. It takes the sole
departure option, saves and reloads, and docks again to verify that closure
survives persistence. It then applies a capture outcome through the real conquest
completion handler and requires the still-burning, now-admitted city scene to
expose only Set Sail. Both visits and the post-capture scene are recorded in
checklist evidence and replay.
This is mandatory in each browser soak cycle; it does not depend on the bot
happening to win an assault or randomly finding a ruined port.

For a focused browser regression after building:

```sh
node tools/playtest/browser.mjs --checklist=destroyed-port --seed=42
```

The setup does not yet make the checklist an autonomous city-assault strategist.
The separate assault fixtures still exercise combat itself.

## Runtime transitions and seasonal colony access

Each cycle requires the player/world transaction tests (in-flight, queued,
comparison and partial worker restore phases), staged-save interruption tests,
dialogue exit/effect tests, and settlement-access tests. These supplement the
browser's canal stages, colony restoration, destroyed-port visits and persistent
checklist; they deliberately force timing boundaries a random journey may miss.

The seasonal-access regressions cover sea and river ice, downstream chokepoints,
alternate open routes, year wraparound and invalid geography. Production dialogue
tests check every relevant quest stage. Every browser-enabled cycle additionally
renders expedition offers and colony/origin resupply dialogue for every currently
icebound colony and an ice-free control, before and after saving and restoring.
The browser asserts both the warning and the matching city scene. This is a
materialized quest scenario, not a claim that the bot sailed through winter ice.

The assault-forecast regression uses the real worker and checks seeded results
against the synchronous battle model. Browser cycles require the pending attack
button to become enabled with odds and reject entry stalls over 500 ms. Worker
errors and stale/replaced requests are tested explicitly; no odds are fabricated
while the calculation is pending.

## Pirate haven coverage

The browser release matrix visits every authored haven, opens its service and
commission menus, lands in its ruins, and restores the resulting save. It accepts
both commission types through live dialogue. The revenge test invokes the real
prize-loot transition for the named merchant; the suppression test simulates a real
ground assault and settles its casualty report and reward. This is bounded fixture
coverage, not a claim that the bot independently navigates and wins naval combat.

The persistent worker campaign also accepts revenge commissions against its real
merchant hulls, captures them, returns the heirloom, and destroys a haven every
eight months. Its subsequent world advances check that pirates do not hide or
resupply there during the six-month rebuilding period. These states cross worker
messages and save/restore boundaries alongside politics and shipyard activity.

For a short browser check after building:
`PIXEL_GLOBE_SMOKE_FOCUS=pirate-havens node tools/run-save-restore-smoke.mjs`.
All browser tests use disposable storage; they do not overwrite a player's save.
