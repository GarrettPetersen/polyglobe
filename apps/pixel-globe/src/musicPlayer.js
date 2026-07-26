import { fetchStaticAsset } from "./staticAssetFetch.js";

const DEFAULT_CROSSFADE_SECONDS = 1.6;
const DEFAULT_INITIAL_FADE_SECONDS = 0.35;
const DEFAULT_SCHEDULE_LEAD_SECONDS = 0.05;
const DEFAULT_CACHE_SIZE = 2;
const GAIN_CURVE_SAMPLES = 64;

export class SeamlessMusicPlayer {
  constructor(options) {
    if (!options?.trackSpecs || typeof options.trackSpecs !== "object") {
      throw new Error("SeamlessMusicPlayer requires track specs");
    }
    this.trackSpecs = options.trackSpecs;
    this.assetVersion = options.assetVersion || "1";
    this.crossfadeSeconds = options.crossfadeSeconds ?? DEFAULT_CROSSFADE_SECONDS;
    this.initialFadeSeconds = options.initialFadeSeconds ?? DEFAULT_INITIAL_FADE_SECONDS;
    this.scheduleLeadSeconds = options.scheduleLeadSeconds ?? DEFAULT_SCHEDULE_LEAD_SECONDS;
    this.cacheSize = options.cacheSize ?? DEFAULT_CACHE_SIZE;
    this.context = options.context || createAudioContext();
    this.bufferLoader = options.bufferLoader || ((url, label) => this.loadAudioBuffer(url, label));
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.context.destination);
    this.trackBuffers = new Map();
    this.trackLoads = new Map();
    this.currentInstance = null;
    this.liveInstances = new Set();
    this.desiredTrackKey = null;
    this.requestSerial = 0;
    this.pendingTransition = null;
    this.activationPromise = null;
    this.activated = false;
  }

  get currentTrackKey() {
    return this.currentInstance?.key || null;
  }

  get requestedTrackKey() {
    return this.desiredTrackKey;
  }

  get transitionPending() {
    return Boolean(this.pendingTransition?.requestId === this.requestSerial &&
      this.pendingTransition.trackKey === this.desiredTrackKey);
  }

  setOutput(volume, muted) {
    const target = muted ? 0 : clamp01(volume);
    const now = this.context.currentTime;
    const gain = this.masterGain.gain;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(target, now, 0.015);
  }

  async activate() {
    if (this.activated) {
      if (this.context.state !== "running") await this.context.resume();
      return this.ensureRequestedTrack();
    }
    if (this.activationPromise) return this.activationPromise;
    this.activationPromise = (async () => {
      if (this.context.state !== "running") await this.context.resume();
      this.activated = true;
      if (!this.desiredTrackKey) return false;
      const requestId = ++this.requestSerial;
      return this.beginTransition(this.desiredTrackKey, requestId, {});
    })();
    try {
      return await this.activationPromise;
    } finally {
      this.activationPromise = null;
    }
  }

  preload(trackKey) {
    return this.loadTrackBuffers(trackKey);
  }

  request(trackKey, options = {}) {
    this.requiredTrackSpec(trackKey);
    const restart = Boolean(options.restart);
    const sameCurrent = this.currentTrackKey === trackKey;
    const sameDesired = this.desiredTrackKey === trackKey;
    if (!restart && sameCurrent && sameDesired) return Promise.resolve(false);

    this.desiredTrackKey = trackKey;
    const requestId = ++this.requestSerial;
    if (!this.activated) return this.preload(trackKey).then(() => false);
    if (!restart && sameCurrent) return Promise.resolve(false);
    return this.beginTransition(trackKey, requestId, options);
  }

  ensureRequestedTrack() {
    if (!this.desiredTrackKey || !this.activated || this.context.state !== "running") {
      return Promise.resolve(false);
    }
    if (this.currentInstance && !this.currentInstance.stopping &&
        this.currentInstance.key === this.desiredTrackKey) {
      return Promise.resolve(false);
    }
    if (this.pendingTransition?.requestId === this.requestSerial &&
        this.pendingTransition.trackKey === this.desiredTrackKey) {
      return this.pendingTransition.promise;
    }
    const requestId = ++this.requestSerial;
    return this.beginTransition(this.desiredTrackKey, requestId, { restart: true });
  }

  beginTransition(trackKey, requestId, options) {
    let trackedPromise;
    trackedPromise = this.transitionTo(trackKey, requestId, options).finally(() => {
      if (this.pendingTransition?.requestId === requestId) this.pendingTransition = null;
    });
    this.pendingTransition = { trackKey, requestId, promise: trackedPromise };
    return trackedPromise;
  }

  async transitionTo(trackKey, requestId, options) {
    const buffers = await this.loadTrackBuffers(trackKey);
    if (requestId !== this.requestSerial || trackKey !== this.desiredTrackKey) return false;

    const startAt = this.context.currentTime + this.scheduleLeadSeconds;
    const oldInstance = this.currentInstance;
    const fadeSeconds = Math.max(
      0.05,
      oldInstance ? (options.crossfadeSeconds ?? this.crossfadeSeconds) : this.initialFadeSeconds
    );
    const nextInstance = this.createTrackInstance(trackKey, buffers, startAt);
    this.stopRetiredInstances(oldInstance, nextInstance, startAt);
    scheduleFadeIn(nextInstance, startAt, fadeSeconds);
    if (oldInstance) this.fadeOutAndStop(oldInstance, startAt, fadeSeconds);

    this.currentInstance = nextInstance;
    this.touchTrackBuffers(trackKey, buffers);
    this.trimTrackCache();
    return true;
  }

  createTrackInstance(trackKey, buffers, startAt) {
    const gain = this.context.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);

    const instance = {
      key: trackKey,
      gain,
      introSource: null,
      loopSource: null,
      automation: { from: 0, to: 0, startAt, duration: 0 },
      stopping: false,
      ended: false
    };
    this.liveInstances.add(instance);

    if (buffers.intro) {
      const introSource = this.context.createBufferSource();
      introSource.buffer = buffers.intro;
      introSource.connect(gain);
      introSource.start(startAt);
      instance.introSource = introSource;
    }

    const loopSource = this.context.createBufferSource();
    loopSource.buffer = buffers.loop;
    loopSource.loop = true;
    loopSource.loopStart = 0;
    loopSource.loopEnd = buffers.loop.duration;
    loopSource.connect(gain);
    loopSource.start(startAt + (buffers.intro?.duration || 0));
    loopSource.onended = () => this.handleLoopEnded(instance);
    instance.loopSource = loopSource;
    return instance;
  }

  fadeOutAndStop(instance, startAt, fadeSeconds) {
    if (instance.stopping || instance.ended) return;
    const startGain = gainAtTime(instance.automation, startAt);
    const gain = instance.gain.gain;
    gain.cancelScheduledValues(startAt);
    gain.setValueAtTime(startGain, startAt);
    gain.setValueCurveAtTime(makeFadeOutCurve(startGain), startAt, fadeSeconds);
    instance.automation = { from: startGain, to: 0, startAt, duration: fadeSeconds };
    instance.stopping = true;
    const stopAt = startAt + fadeSeconds + 0.05;
    stopAudioSource(instance.introSource, stopAt);
    stopAudioSource(instance.loopSource, stopAt);
  }

  stopRetiredInstances(oldInstance, nextInstance, stopAt) {
    for (const instance of this.liveInstances) {
      if (instance === oldInstance || instance === nextInstance || instance.ended) continue;
      instance.stopping = true;
      const gain = instance.gain.gain;
      gain.cancelScheduledValues(stopAt);
      gain.setValueAtTime(0, stopAt);
      instance.automation = { from: 0, to: 0, startAt: stopAt, duration: 0 };
      stopAudioSource(instance.introSource, stopAt);
      stopAudioSource(instance.loopSource, stopAt);
    }
  }

  handleLoopEnded(instance) {
    if (instance.ended) return;
    instance.ended = true;
    this.liveInstances.delete(instance);
    instance.gain.disconnect();
    if (this.currentInstance === instance) this.currentInstance = null;
  }

  async loadTrackBuffers(trackKey) {
    const cached = this.trackBuffers.get(trackKey);
    if (cached) {
      this.touchTrackBuffers(trackKey, cached);
      return cached;
    }
    const existingLoad = this.trackLoads.get(trackKey);
    if (existingLoad) return existingLoad;

    const spec = this.requiredTrackSpec(trackKey);
    const load = Promise.all([
      spec.intro ? this.bufferLoader(versionedUrl(spec.intro, this.assetVersion), `${trackKey} intro`) : null,
      this.bufferLoader(versionedUrl(spec.loop, this.assetVersion), `${trackKey} loop`)
    ]).then(([intro, loop]) => {
      if (!loop) throw new Error(`Music track ${trackKey} decoded without a loop buffer`);
      const buffers = { intro, loop };
      this.touchTrackBuffers(trackKey, buffers);
      this.trimTrackCache();
      return buffers;
    }).finally(() => {
      this.trackLoads.delete(trackKey);
    });
    this.trackLoads.set(trackKey, load);
    return load;
  }

  async loadAudioBuffer(url, label) {
    const response = await fetchStaticAsset(url, { label });
    if (!response.ok) throw new Error(`Failed to load ${label}: HTTP ${response.status}`);
    try {
      return await this.context.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      throw new Error(`Failed to decode ${label}`, { cause: error });
    }
  }

  requiredTrackSpec(trackKey) {
    const spec = this.trackSpecs[trackKey];
    if (!spec?.loop) throw new Error(`Missing music track spec: ${trackKey}`);
    return spec;
  }

  touchTrackBuffers(trackKey, buffers) {
    this.trackBuffers.delete(trackKey);
    this.trackBuffers.set(trackKey, buffers);
  }

  trimTrackCache() {
    while (this.trackBuffers.size > this.cacheSize) {
      const removable = [...this.trackBuffers.keys()].find((key) => (
        key !== this.currentTrackKey && key !== this.desiredTrackKey
      ));
      if (!removable) return;
      this.trackBuffers.delete(removable);
    }
  }
}

function createAudioContext() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio API is unavailable");
  return new AudioContextClass({ latencyHint: "playback" });
}

function scheduleFadeIn(instance, startAt, fadeSeconds) {
  const gain = instance.gain.gain;
  gain.cancelScheduledValues(startAt);
  gain.setValueAtTime(0, startAt);
  gain.setValueCurveAtTime(makeFadeInCurve(), startAt, fadeSeconds);
  instance.automation = { from: 0, to: 1, startAt, duration: fadeSeconds };
}

function gainAtTime(automation, time) {
  if (!automation || automation.duration <= 0) return automation?.to ?? 1;
  const t = clamp01((time - automation.startAt) / automation.duration);
  const eased = Math.sin(t * Math.PI / 2);
  return automation.from + (automation.to - automation.from) * eased;
}

function makeFadeInCurve() {
  return Float32Array.from({ length: GAIN_CURVE_SAMPLES }, (_, index) => (
    Math.sin(index / (GAIN_CURVE_SAMPLES - 1) * Math.PI / 2)
  ));
}

function makeFadeOutCurve(startGain) {
  return Float32Array.from({ length: GAIN_CURVE_SAMPLES }, (_, index) => (
    startGain * Math.cos(index / (GAIN_CURVE_SAMPLES - 1) * Math.PI / 2)
  ));
}

function stopAudioSource(source, stopAt) {
  if (!source) return;
  try {
    source.stop(stopAt);
  } catch (error) {
    if (error?.name !== "InvalidStateError") throw error;
  }
}

function versionedUrl(url, version) {
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
