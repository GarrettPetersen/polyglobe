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

## 5. Build the Short

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
