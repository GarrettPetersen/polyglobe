# Busy-World Performance Benchmark

The busy-world benchmark loads a deterministic, disposable game state around
Shanghai. It deliberately crowds the viewport with ships, land carts, wakes,
weather, and terrain so renderer and simulation regressions are easier to spot.
It is available only through the benchmark query parameters and does not appear
in the normal game UI or saved voyages.

Run the desktop baseline from the repository root:

```sh
make pixel-globe-benchmark
```

Run the same scene with 4x browser CPU throttling as a rough Raspberry Pi proxy:

```sh
npm --prefix apps/pixel-globe run benchmark:busy:pi
```

Reports are written to:

```text
apps/pixel-globe/build/performance/busy-world-latest.json
```

Useful options can be passed after `--`:

```sh
npm run benchmark:busy -- --duration 15 --warmup 3 --min-fps 20
npm run benchmark:busy -- --base-url http://127.0.0.1:5184
```

`--min-fps` makes the command exit unsuccessfully below the requested sampled
frame rate, which is useful for CI or before/after optimization checks. Other
options are `--cpu-throttle`, `--headless`, `--output`, `--port`, `--profile`,
and `--timeout-ms`.

The report records sampled and rendered FPS, frame and main-loop CPU latency
distributions, long-frame counts, estimated skipped 60 Hz frames, scene counts,
and named stage timings for weather, chart rebuilding, NPC simulation, terrain,
effects, vessels, and final color grading. Compare reports produced on the same
machine and browser; absolute FPS across different devices is not directly
comparable.

The runner opens and closes a temporary browser window so the measurement uses
the same hardware-accelerated rendering path as normal play. `--headless` is
available for CI machines with accelerated headless Chromium; software-only
headless rendering is not representative of gameplay performance.

The browser cache is retained under `build/performance/browser-profile` so
repeat runs do not spend their time re-downloading the large world and sprite
asset set. Use `--profile path/to/profile` when an isolated cache is needed.
