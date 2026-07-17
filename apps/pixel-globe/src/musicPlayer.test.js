import assert from "node:assert/strict";
import test from "node:test";

import { SeamlessMusicPlayer } from "./musicPlayer.js";

const TRACK_SPECS = Object.freeze({
  ship: { intro: "/ship-intro.ogg", loop: "/ship-loop.ogg" },
  city: { intro: "/city-intro.ogg", loop: "/city-loop.ogg" },
  combat: { loop: "/combat-loop.ogg" }
});

test("schedules the intro and loop on one audio clock without a handoff gap", async () => {
  const context = new FakeAudioContext();
  const player = createPlayer(context);

  await player.request("ship");
  assert.equal(context.sources.length, 0);

  await player.activate();

  assert.equal(context.resumeCount, 1);
  assert.equal(context.sources.length, 2);
  const [intro, loop] = context.sources;
  assert.deepEqual(intro.starts, [10.05]);
  assert.deepEqual(loop.starts, [12.05]);
  assert.equal(loop.loop, true);
  assert.equal(loop.loopStart, 0);
  assert.equal(loop.loopEnd, 8);
  assert.equal(player.currentTrackKey, "ship");
});

test("keeps the current track playing until the replacement is loaded, then crossfades", async () => {
  const context = new FakeAudioContext();
  const pendingCityLoads = deferred();
  const player = createPlayer(context, async (url) => {
    if (url.includes("city")) await pendingCityLoads.promise;
    return fakeBufferForUrl(url);
  });
  await player.request("ship");
  await player.activate();
  const oldLoop = context.sources[1];
  const oldGain = context.gains[1];

  context.currentTime = 20;
  const transition = player.request("city", { crossfadeSeconds: 1.5 });
  assert.equal(player.currentTrackKey, "ship");
  assert.deepEqual(oldLoop.stops, []);

  pendingCityLoads.resolve();
  await transition;

  assert.equal(player.currentTrackKey, "city");
  assert.equal(context.sources.length, 4);
  assert.deepEqual(context.sources[2].starts, [20.05]);
  assert.deepEqual(context.sources[3].starts, [22.05]);
  assert.deepEqual(oldLoop.stops, [21.6]);
  assert.deepEqual(lastCurveEvent(oldGain.gain), { startAt: 20.05, duration: 1.5 });
  assert.deepEqual(lastCurveEvent(context.gains[2].gain), { startAt: 20.05, duration: 1.5 });
});

test("activation is idempotent and does not restart music on later input", async () => {
  const context = new FakeAudioContext();
  const player = createPlayer(context);
  await player.request("ship");
  await player.activate();

  await player.activate();

  assert.equal(context.resumeCount, 1);
  assert.equal(context.sources.length, 2);
  assert.equal(player.currentTrackKey, "ship");
});

test("a newer request cancels a replacement that is still loading", async () => {
  const context = new FakeAudioContext();
  const pendingCityLoads = deferred();
  const player = createPlayer(context, async (url) => {
    if (url.includes("city")) await pendingCityLoads.promise;
    return fakeBufferForUrl(url);
  });
  await player.request("ship");
  await player.activate();

  const cityTransition = player.request("city");
  await player.request("ship");
  pendingCityLoads.resolve();
  await cityTransition;

  assert.equal(player.currentTrackKey, "ship");
  assert.equal(player.requestedTrackKey, "ship");
  assert.equal(context.sources.length, 2);
});

test("an unexpectedly ended loop is recovered exactly once", async () => {
  const context = new FakeAudioContext();
  const player = createPlayer(context);
  await player.request("ship");
  await player.activate();

  context.currentTime = 20;
  context.sources[1].finish();
  assert.equal(player.currentTrackKey, null);

  const firstRecovery = player.ensureRequestedTrack();
  const secondRecovery = player.ensureRequestedTrack();
  assert.equal(firstRecovery, secondRecovery);
  await firstRecovery;

  assert.equal(player.currentTrackKey, "ship");
  assert.equal(context.sources.length, 4);
  assert.equal(player.transitionPending, false);
});

test("a rapid third transition retires the older crossfade instead of layering three tracks", async () => {
  const context = new FakeAudioContext();
  const player = createPlayer(context);
  await player.request("ship");
  await player.activate();
  const shipLoop = context.sources[1];

  context.currentTime = 20;
  await player.request("city", { crossfadeSeconds: 1.5 });
  assert.deepEqual(shipLoop.stops, [21.6]);

  context.currentTime = 20.2;
  await player.request("combat", { crossfadeSeconds: 1 });
  assert.deepEqual(shipLoop.stops, [21.6, 20.25]);
  assert.equal(player.currentTrackKey, "combat");
});

function createPlayer(context, bufferLoader = async (url) => fakeBufferForUrl(url)) {
  return new SeamlessMusicPlayer({
    trackSpecs: TRACK_SPECS,
    assetVersion: "test",
    context,
    bufferLoader,
    scheduleLeadSeconds: 0.05,
    initialFadeSeconds: 0.35,
    crossfadeSeconds: 1.6,
    cacheSize: 2
  });
}

function fakeBufferForUrl(url) {
  return { duration: url.includes("intro") ? 2 : 8 };
}

function lastCurveEvent(param) {
  const event = param.events.findLast((item) => item.type === "curve");
  return { startAt: event.startAt, duration: event.duration };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 10;
    this.state = "suspended";
    this.destination = {};
    this.resumeCount = 0;
    this.gains = [];
    this.sources = [];
  }

  createGain() {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }

  createBufferSource() {
    const source = new FakeBufferSourceNode();
    this.sources.push(source);
    return source;
  }

  async resume() {
    this.resumeCount += 1;
    this.state = "running";
  }
}

class FakeGainNode {
  constructor() {
    this.gain = new FakeAudioParam();
    this.connections = [];
    this.disconnected = false;
  }

  connect(target) {
    this.connections.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }
}

class FakeAudioParam {
  constructor() {
    this.value = 1;
    this.events = [];
  }

  cancelScheduledValues(time) {
    this.events.push({ type: "cancel", time });
  }

  setTargetAtTime(value, startAt, timeConstant) {
    this.events.push({ type: "target", value, startAt, timeConstant });
  }

  setValueAtTime(value, time) {
    this.events.push({ type: "value", value, time });
  }

  setValueCurveAtTime(curve, startAt, duration) {
    this.events.push({ type: "curve", curve, startAt, duration });
  }
}

class FakeBufferSourceNode {
  constructor() {
    this.buffer = null;
    this.loop = false;
    this.loopStart = 0;
    this.loopEnd = 0;
    this.starts = [];
    this.stops = [];
    this.connections = [];
    this.onended = null;
  }

  connect(target) {
    this.connections.push(target);
  }

  start(time) {
    this.starts.push(time);
  }

  stop(time) {
    this.stops.push(time);
  }

  finish() {
    this.onended?.();
  }
}
