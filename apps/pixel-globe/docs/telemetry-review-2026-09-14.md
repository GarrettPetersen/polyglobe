# Telemetry review — 14 September 2026

Read at 18:44:32 UTC using the independent crash, performance, and map-integrity
cursors. No report in this snapshot came from the three recent gameplay fixes or
the new conquest-strategy revision (`4738de42`). Build age alone is not evidence
that an incident has been fixed.

## Crashes: addressed before this review

Three reports, two fingerprints, one affected installation:

- `93d26462258a`: two “Attack cannot be piracy and authorized by Utrecht” reports.
  `68b79637` corrected home-port privateering legality and presentation. The
  dialogue and reputation regression suites exercise the corrected contract.
- `b32cc1988c04`: one missing Utrecht capital-reserve ship during a combat hail.
  `ad09596f` preserves displaced reserve ships and removes stale combat references.
  The route, reserve, and runtime regressions cover that lifecycle.

The crash cursor can advance to this review's read timestamp after verification.
This does not close any reports arriving while this review is underway.

## Chart integrity: classified as expected recoveries

Two `chart-stitch-recovered` diagnostics (builds `b32cc1988c04` and
`c48234748253`) report proposed edge errors of 9.13 and 8.68 pixels against an
8.10-pixel limit. The admission code rejects the temporary corrected geometry and
retries in the retained frame. It does not install the invalid geometry or weaken
the threshold. Neither report has a corresponding fatal chart-stitch crash in the
crash feed read for this review.

Existing `localLayoutAdmission` tests verify temporary-state isolation, successful
retained-frame recovery, and strict failure when recovery is declined. There is
insufficient route history in these two diagnostic messages to reconstruct their
exact voyages. Classify these as successful guard/recovery notifications, rather
than changing the geometry solver on the evidence of the messages alone. The map
cursor can advance after that classification and verification.

## Performance: keep open

The performance cursor returns 51 grouped incidents: 11 low-frame-rate groups and
40 freeze groups. They include rendering/world presentation, terrain generation,
city/dialogue rasterization, NPC simulation, chart admission, politics/objectives,
and gaps with a substantial scheduler-delay component. Many reports describe
two-core browsers. Some sustained rendering reports have zero visible NPCs, so
NPC population alone cannot explain this feed.

The snapshot does not contain a save, full frame trace, or GPU execution timings.
A broad measured stage is not proof that its own code, rather than a nested call
or driver wait, caused the stall. Do not mark these performance incidents fixed.

A concrete diagnostic defect was reproduced and fixed: `recordMainThreadWork`
inferred nesting from dotted names. `render.world.end` is actually inside
`render.gradeAndStorm`; the latter could overwrite the more informative inner
measurement. Conversely, a previous `render.city.raster` could incorrectly hide
a later, unrelated `render` interval. Attribution now requires interval containment
and retains a child when it accounts for at least half of its
parent. The measuring wrapper uses one completion timestamp for both duration and
interval end. Three deterministic regressions fail before this fix and pass after.

The local busy-world benchmark, with 4× CPU throttling, measured 25.3 ms p95 frame
work and a 199.7 ms maximum frame interval before this diagnostic-only change. It
did not reproduce the reported one-to-three-second freezes. Its sampled scene had
906 terrain tiles, 14 carts, and zero visible NPCs; it cannot validate combat-heavy
reports or reproduce the players' hardware. No gameplay speedup is claimed.

The cloud-cover browser benchmark also completed at 4× CPU throttling: 22 ms p95
frame work, 158.4 ms maximum frame interval, six visible NPCs, and 1,002 terrain
tiles. Neither local run emitted a chart-integrity incident.

The next affected-build reports should identify actual nested work more reliably.
Keep the performance cursor unchanged so the unresolved evidence remains visible.

## Verification

All 6,571 source tests pass, including the three new regressions. Source safety,
catalog verification, contract type checks, and the full production build pass.
