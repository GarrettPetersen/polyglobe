---
name: produce-pixel-globe-youtube-shorts
description: Plan, stage, record, transcribe, automatically edit, caption, upscale, and verify YouTube Shorts for Marque & Reprisal using the pixel-globe capture pipeline. Use when the user wants to highlight a game feature, prepare a disposable gameplay scenario, turn recorded narration and manual gameplay into a Short, revise an event-driven edit, or deliver an upload-ready vertical MP4 without using timeline editing software.
---

# Produce Pixel Globe YouTube Shorts

Own the production loop from idea through upload-ready MP4. Let the user provide the voice performance and manually play the staged game; handle scenario engineering, transcription, editing, captions, technical QA, and revisions.

## Establish The Feature

1. Inspect the current game implementation before proposing footage. Do not write a script around behavior that is absent or unverified.
2. Turn the chosen feature into a 30-90 second spoken outline:
   - Hook: one surprising or concrete claim in the first five seconds.
   - Mechanic: explain what the viewer should notice.
   - Payoff: show the consequence in gameplay.
   - Close: end on one clean thought; do not pad for length.
3. Specify the footage needed for each beat. Prefer a few readable actions over constant cuts.
4. Give the user a polished narration draft, but preserve their voice and let them improvise.

## Prepare The Scenario

Read these sources before changing capture behavior:

- `apps/pixel-globe/docs/youtube-shorts-pipeline.md`
- `apps/pixel-globe/src/captureScenarios.js`
- `apps/pixel-globe/src/captureRecorder.js`
- `apps/pixel-globe/tools/shorts/build_short.py`

Add a named, disposable scenario to `CAPTURE_SCENARIOS` when an existing one does not stage the requested feature. Configure the player ship, faction, location, heading, clock, time scale, diplomacy, and nearby encounters explicitly. Never read or write the normal voyage save in capture mode. A capture scenario may stage state and inputs, but it must not introduce capture-only rendering, layouts, dialogue presentation, or other visuals that differ from the real game.

Use a stable descriptive ID such as `turtle-ship-war`. Validate all referenced factions and ships at module load. Add focused tests to `captureScenarios.test.js` for any new validation or scenario behavior. Fail loudly for unknown or malformed scenario data; never fall back to a generic game.

Run:

```sh
npm --prefix apps/pixel-globe run check
```

Then launch:

```sh
make pixel-globe-capture PIXEL_GLOBE_CAPTURE_SCENARIO=<scenario-id>
```

Smoke-test the printed URL. Confirm the logical canvas is `270x480`, the named ship and encounter load, the game is frozen before recording, music is muted, and no fatal error appears. Give the URL to the user with one instruction: choose the current tab and enable **Share tab audio** before pressing `RECORD TAKE`.

## Transcribe Narration

Use the existing local environment. Set it up only when missing:

```sh
make pixel-globe-shorts-setup
```

Transcribe the user's WAV, M4A, or MP3:

```sh
make pixel-globe-transcribe \
  AUDIO=/absolute/path/narration.m4a \
  OUT=apps/pixel-globe/.captures/<short-id>
```

Read the timestamped transcript and correct obvious proper-name errors in the JSON, text, and SRT together. Do not rewrite the user's performance. Keep word and segment timing valid and monotonic.

## Build The First Cut

Find the matching capture WebM and `.events.json`; do not pair files solely by recency when multiple takes exist. Check the scenario ID and duration in the event sidecar.

Build the automatic event-matched edit:

```sh
make pixel-globe-short \
  VIDEO=/absolute/path/take.webm \
  EVENTS=/absolute/path/take.events.json \
  NARRATION=/absolute/path/narration.m4a \
  TRANSCRIPT=/absolute/path/narration.transcript.json \
  OUTPUT=apps/pixel-globe/.captures/<short-id>/final.mp4
```

The editor must use native real-time gameplay clips, quiet game SFX under narration, Dogica captions, nearest-neighbour 4x scaling, and no music. Preserve pixel edges. Never resize the native capture with interpolation. Keep the default narration treatment enabled; use `VOICE_PROCESSING=0` only to produce a loudness-matched A/B comparison.

## Review And Revise

Inspect the generated `final.edit.json` and rendered MP4. Use screenshots from the opening, middle, caption-heavy moments, major event payoffs, and final seconds. Listen for narration clarity, abrupt SFX, silence, and clipped audio.

Every shot must preserve the real game's normal presentation. Dialogue, menus, HUD elements, and their backgrounds must look exactly as they do during ordinary play; never substitute capture-only or editor-created visuals. If a capture looks different from the real game, reject it and recapture through the normal rendering path.

Revise the edit decision list when semantic matching chose a weak moment, a cut hides the action, or the same event is reused. Keep every source interval within the take and cover the narration continuously. Rebuild without changing source footage:

```sh
make pixel-globe-short \
  VIDEO=/absolute/path/take.webm \
  EVENTS=/absolute/path/take.events.json \
  NARRATION=/absolute/path/narration.m4a \
  TRANSCRIPT=/absolute/path/narration.transcript.json \
  OUTPUT=apps/pixel-globe/.captures/<short-id>/final.mp4 \
  PLAN=/absolute/path/revised.edit.json
```

Ask for another gameplay take only when the required action genuinely was not captured. Do not make the user re-record to solve an editing problem.

## Verify Delivery

Require all of the following before calling the Short complete:

- H.264 video, `1080x1920`, square pixels, `yuv420p`, 30 fps.
- AAC audio, 48 kHz, stereo.
- Duration matches the narration and contains no frozen tail.
- Captions are legible, pixel-sharp, correctly timed, and inside mobile-safe margins.
- Gameplay is never stretched, blurred, letterboxed, or obscured by capture controls.
- Narration is dominant; game SFX remain audible; music is absent.
- The first seconds visually support the hook and the ending feels intentional.

Use `ffprobe` for stream validation and inspect actual frames. Report the final absolute file link, duration, scenario, and any intentional editorial choices. Keep raw takes and generated media under `apps/pixel-globe/.captures/`; they are local artifacts and must remain ignored by git.

When pipeline code or scenarios changed, run `git diff --check` and the full pixel-globe check before handing off. Commit or push only when the user requests it.
