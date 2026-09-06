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

Browser runs require a current `npm run build`. The browser suite has a 30-minute
process timeout. Reports, replay saves, minimized failures, checkpoints and browser
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

Each cycle alternates fresh starts with continuation from the preceding cycle's
checkpoints. Checkpoint storage is bounded to one save per starting scenario.
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
survival. The dialogue fixture uses deterministic fixed domain random draws;
seeds vary choices and economy initialization. Browser scenarios are fixed
journeys, not extensions of the domain voyage. Their combat and scene state is
not fed back into that voyage. Host actions without domain executors are listed
as boundaries; unexpected host effects fail instead of being ignored.

Passing this suite does not mean every combination is covered. In particular,
long continuous browser journeys across combat, diplomacy and missions remain
a coverage gap. Do not label domain port visits as sailing or browser coverage.

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
