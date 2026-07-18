import assert from "node:assert/strict";
import test from "node:test";
import {
  activateCaptureSfxBus,
  createCaptureSfxBus,
  playCaptureSfx,
  registerCaptureSfxAudio,
  setCaptureSfxAmbientVolume,
  startCaptureSfxAmbient
} from "./captureSfxBus.js";

test("capture SFX bus decodes, plays, and updates ambient audio", async (t) => {
  const previousMediaElement = globalThis.HTMLMediaElement;
  globalThis.HTMLMediaElement = FakeMediaElement;
  t.after(() => {
    globalThis.HTMLMediaElement = previousMediaElement;
  });

  const bus = createCaptureSfxBus(FakeAudioContext, async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8)
  }));
  const effect = new FakeMediaElement("https://example.test/cannon.ogg");
  const ambience = new FakeMediaElement("https://example.test/wind.ogg");
  ambience.volume = 0.25;
  registerCaptureSfxAudio(bus, effect);
  registerCaptureSfxAudio(bus, ambience);

  const stream = await activateCaptureSfxBus(bus);
  assert.equal(stream, bus.destination.stream);
  assert.equal(bus.context.state, "running");

  assert.equal(playCaptureSfx(bus, effect, { volume: 0.7, playbackRate: 1.1 }), true);
  const effectSource = bus.context.sources.at(-1);
  assert.equal(effectSource.started, true);
  assert.equal(effectSource.playbackRate.value, 1.1);
  assert.equal(bus.context.gains.at(-1).gain.value, 0.7);

  assert.equal(startCaptureSfxAmbient(bus, ambience, { loop: true }), true);
  assert.equal(startCaptureSfxAmbient(bus, ambience, { loop: true }), false);
  assert.equal(bus.context.sources.at(-1).loop, true);
  assert.equal(setCaptureSfxAmbientVolume(bus, ambience, 0.4), true);
  assert.equal(bus.context.gains.at(-1).gain.value, 0.4);
});

test("capture SFX bus rejects duplicate and unregistered audio", async (t) => {
  const previousMediaElement = globalThis.HTMLMediaElement;
  globalThis.HTMLMediaElement = FakeMediaElement;
  t.after(() => {
    globalThis.HTMLMediaElement = previousMediaElement;
  });

  const bus = createCaptureSfxBus(FakeAudioContext, async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8)
  }));
  const registered = new FakeMediaElement("https://example.test/impact.ogg");
  registerCaptureSfxAudio(bus, registered);
  assert.throws(() => registerCaptureSfxAudio(bus, registered), /twice/);
  await activateCaptureSfxBus(bus);
  assert.throws(
    () => playCaptureSfx(bus, new FakeMediaElement("https://example.test/missing.ogg"), { volume: 1 }),
    /unregistered/
  );
});

class FakeMediaElement {
  constructor(src) {
    this.src = src;
    this.currentSrc = src;
    this.volume = 1;
    this.playbackRate = 1;
  }
}

class FakeAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 3;
    this.sources = [];
    this.gains = [];
  }

  createMediaStreamDestination() {
    return {
      stream: {
        getAudioTracks: () => [{}]
      }
    };
  }

  decodeAudioData() {
    return Promise.resolve({ decoded: true });
  }

  async resume() {
    this.state = "running";
  }

  createBufferSource() {
    const source = {
      buffer: null,
      loop: false,
      playbackRate: { value: 1 },
      started: false,
      connect() {},
      addEventListener() {},
      start() {
        this.started = true;
      }
    };
    this.sources.push(source);
    return source;
  }

  createGain() {
    const gain = {
      gain: {
        value: 1,
        setValueAtTime(value) {
          this.value = value;
        }
      },
      connect() {}
    };
    this.gains.push(gain);
    return gain;
  }
}
