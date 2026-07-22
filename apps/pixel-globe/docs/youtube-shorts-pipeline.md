# YouTube Shorts Pipeline

This workflow records manual gameplay at the native `270x480` pixel canvas, logs semantic game events, transcribes narration, and builds a captioned `1080x1920` MP4 without a timeline editor.

## 1. Plan the feature

Write a short spoken outline before recording:

```text
Hook (0-5s): what is surprising?
Mechanic (5-35s): what should the footage prove?
Payoff (35-55s): what happens because of it?
Close (last 5s): one clean concluding thought.
```

Capture scenarios live in `src/captureScenarios.js`. They validate ship types, factions, positions, headings, weather, diplomacy, and nearby NPC encounters at startup. Invalid scenarios stop with an error instead of silently starting a generic game.

## 2. Record narration

Record one clean `30-90` second WAV, M4A, or MP3. Music should not be included.

## 3. Transcribe

One-time setup:

```sh
make pixel-globe-shorts-setup
```

Transcribe with word timestamps:

```sh
make pixel-globe-transcribe \
  AUDIO=/absolute/path/narration.m4a \
  OUT=apps/pixel-globe/.captures/turtle-ship-war
```

This writes JSON, plain text, and SRT. The first model run downloads the selected Whisper model.

## 4. Record manual gameplay

```sh
make pixel-globe-capture PIXEL_GLOBE_CAPTURE_SCENARIO=turtle-ship-war
```

Open the printed URL. The game:

- starts the named scenario without reading or writing the real voyage save;
- locks the logical canvas to exact 9:16 `270x480`;
- remains frozen until `RECORD TAKE` succeeds;
- records canvas video at 30 fps and current-tab SFX;
- forces music output to zero;
- stops after ten minutes;
- downloads a WebM take and matching `.events.json` sidecar.

When the browser asks what to share, choose the current tab and enable **Share tab audio**. The recorder fails loudly if no tab-audio track is provided.

The event sidecar records simulation time and elapsed milliseconds for positions, dialogue interactions, discoveries, weapons, hits, sinking, storms, and lightning.

## 5. Record scripted trailer clips

Keep the Pixel Globe dev server running, then record the complete unattended trailer roster:

```sh
make pixel-globe-trailer-clips
```

The twenty-four `trailer-*` scenarios provide two clips apiece for exploration, trade, fishing, whaling, fighting, pillaging, colonization, and survival, plus eight distinct ships sailing at speed on a beam reach. The player ship follows an authored goal with the normal sailing and combat systems; exact trailer beats such as a lightning strike, successful colony landing, or verified 90-degree reach are deterministic.

Automated recording never reads or writes the normal voyage save. The game clock advances by exactly one thirtieth of a simulated second, renders one native canvas frame, and waits until Playwright has saved that frame before advancing again. One-shot SFX are recorded as timestamped events and rebuilt into an audio stem with FFmpeg after the frame pass; music is excluded. Trade captures perform six rapid transactions and verify six matching coin cues. Cannon, whale-kill, and trade cues are validated against their scripted actions, while sailing-montage captures deliberately produce silent SFX stems. Each scenario emits a lossless native WebM, a nearest-neighbour `1080x1920` MP4, and a separate `.sfx.ogg` stem. The capture fails if frames are skipped, a required cue is absent, an unintended sailing cue appears, or the delivery video lacks audio. Outputs and `manifest.json` are written to `apps/pixel-globe/.captures/trailer-clips/`. Pass `--ids trailer-fish-cod,trailer-whale-right` to `npm run capture:trailer --` to record a subset, or `--jobs 1` to reduce parallel memory use.

For a Steam trailer, record the same scenarios on the native `480x270` landscape canvas and export nearest-neighbour `1920x1080` clips:

```sh
make pixel-globe-steam-trailer-clips
```

These clips are written to `apps/pixel-globe/.captures/trailer-clips-steam/`. Both capture formats validate their native frame size, sidecar viewport, output dimensions, frame rate, and audio stream before completing.

Build the final Steam trailer after all twenty-four landscape clips have been captured:

```bash
make pixel-globe-steam-trailer
```

The tracked edit plan, Pirata One end-card font, and builder live in `tools/trailer/`. The builder keeps feature actions readable without adding chapter headings, inserts two silent four-ship beam-reach montages on the score's 108 BPM and 85 BPM pulses, validates that the audible edit windows retain their required cannon, whale-kill, and trade cues, and aligns the Fight cut with matching attacks at the sailing-to-combat crossfade midpoint. The final storm footage continues in slow motion while the gameplay eases into Gaussian blur and the capsule-art title-and-ship lockup performs two rebounds before settling exactly. The builder writes `apps/pixel-globe/.captures/trailer/marque-and-reprisal-steam-trailer-v7.mp4`.

Build the looping feature banners for Steam's About This Game description from the same landscape captures:

```sh
make pixel-globe-steam-inline-videos
```

[Steam's extra-asset guidance](https://partner.steamgames.com/doc/store/page/assets) recommends a width of `1170px`, accepts WebM, and limits animations to 12 seconds. The tracked plan produces eight silent, 8.5-second VP9 WebMs at `1170x270` with BT.709 metadata. Each video takes the native canvas's central `390x90` band and scales it exactly 3x, preserving the pixel grid while leaving its Pirata One feature heading fixed at the left. Outputs and their manifest are written to `apps/pixel-globe/.captures/steam-inline-videos/`.

## 6. Build the Short

```sh
make pixel-globe-short \
  VIDEO=/absolute/path/take.webm \
  EVENTS=/absolute/path/take.events.json \
  NARRATION=/absolute/path/narration.m4a \
  TRANSCRIPT=/absolute/path/narration.transcript.json \
  OUTPUT=apps/pixel-globe/.captures/turtle-ship-war/final.mp4
```

The editor matches narration language to semantic events, cuts native footage around those moments, scales by nearest neighbour to `1080x1920`, keeps game SFX quietly under narration, burns Dogica captions, and exports H.264/AAC at 30 fps. Narration receives a restrained voice treatment: rumble removal, a low-mid warmth lift, a small upper-mid cut, light de-essing, and gentle compression. The completed mix is normalized to `-16 LUFS` with a `-1.5 dBTP` ceiling.

For an A/B comparison, render the untreated narration with `VOICE_PROCESSING=0`. Loudness normalization still runs so the comparison is not biased by volume:

```sh
make pixel-globe-short \
  VIDEO=/absolute/path/take.webm \
  EVENTS=/absolute/path/take.events.json \
  NARRATION=/absolute/path/narration.m4a \
  TRANSCRIPT=/absolute/path/narration.transcript.json \
  OUTPUT=apps/pixel-globe/.captures/example/final-untreated.mp4 \
  VOICE_PROCESSING=0
```

The builder also writes `final.edit.json`, the exact edit decision list. Codex can revise that file and rerun with `PLAN=/absolute/path/final.edit.json` without opening editing software.

Raw takes, narration, transcripts, and final videos belong in `apps/pixel-globe/.captures/`, which is ignored by git.
