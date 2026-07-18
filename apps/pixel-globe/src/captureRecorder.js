import { downloadBlob } from "./browserDownload.js";

export const CAPTURE_FRAME_RATE = 30;

export class CaptureRecorder {
  constructor({ canvas, scenario, maxSeconds, simMinute, onStateChange, now = () => performance.now() }) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Capture recorder needs a canvas");
    if (!scenario?.id) throw new Error("Capture recorder needs a scenario");
    if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) throw new Error("Invalid capture duration cap");
    if (typeof simMinute !== "function") throw new Error("Capture recorder needs a simulation clock");
    this.canvas = canvas;
    this.scenario = scenario;
    this.maxSeconds = maxSeconds;
    this.simMinute = simMinute;
    this.onStateChange = onStateChange || (() => {});
    this.now = now;
    this.state = "ready";
    this.events = [];
    this.startedAtMs = null;
    this.recorder = null;
    this.canvasStream = null;
    this.displayStream = null;
    this.sfxStream = null;
    this.captureMode = null;
    this.chunks = [];
    this.stopTimer = null;
  }

  async start() {
    return this.startWithMode("tab");
  }

  async startSfx(sfxStream) {
    return this.startWithMode("sfx", sfxStream);
  }

  async startWithMode(mode, sfxStream = null) {
    if (this.state !== "ready") throw new Error(`Cannot start capture while ${this.state}`);
    if (mode !== "tab" && mode !== "sfx") {
      throw new Error(`Unknown capture mode: ${mode}`);
    }
    if (mode === "tab" && !this.canvas.captureStream) {
      throw new Error("Canvas captureStream is unavailable in this browser");
    }
    if (mode === "tab" && !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Tab audio capture is unavailable in this browser");
    }
    if (mode === "sfx") validateSfxStream(sfxStream);
    this.state = "requesting";
    this.onStateChange(this.snapshot());
    try {
      if (mode === "tab") {
        const audioTracks = await this.requestTabAudioTracks();
        this.canvasStream = this.canvas.captureStream(CAPTURE_FRAME_RATE);
        const videoTracks = this.canvasStream.getVideoTracks();
        if (videoTracks.length !== 1) throw new Error(`Expected one canvas video track, got ${videoTracks.length}`);
        const combined = new MediaStream([videoTracks[0], ...audioTracks]);
        const mimeType = supportedCaptureMimeType();
        this.recorder = new MediaRecorder(combined, {
          mimeType,
          videoBitsPerSecond: 5_000_000,
          audioBitsPerSecond: 160_000
        });
      } else if (mode === "sfx") {
        this.sfxStream = sfxStream;
        this.recorder = new MediaRecorder(this.sfxStream, {
          mimeType: supportedAudioCaptureMimeType(),
          audioBitsPerSecond: 160_000
        });
      }
    } catch (error) {
      stopTracks(this.canvasStream);
      stopTracks(this.displayStream);
      stopTracks(this.sfxStream);
      this.canvasStream = null;
      this.displayStream = null;
      this.sfxStream = null;
      this.recorder = null;
      this.state = "ready";
      this.onStateChange(this.snapshot());
      throw error;
    }
    this.chunks = [];
    this.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
    this.recorder.addEventListener("error", (event) => {
      console.error("[capture] MediaRecorder failed", event.error || event);
    });
    this.startedAtMs = this.now();
    this.captureMode = mode;
    this.events = [];
    this.state = "recording";
    this.recordEvent("capture-start", {
      viewport: { width: this.canvas.width, height: this.canvas.height },
      frameRate: CAPTURE_FRAME_RATE
    });
    this.recorder.start(1000);
    this.stopTimer = setTimeout(() => void this.stop("time-limit"), this.maxSeconds * 1000);
    this.onStateChange(this.snapshot());
  }

  async requestTabAudioTracks() {
    this.displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "exclude"
    });
    const audioTracks = this.displayStream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error("No tab audio was shared. Choose this tab and enable Share tab audio.");
    }
    const displayVideoTrack = this.displayStream.getVideoTracks()[0];
    if (!displayVideoTrack) throw new Error("Display capture returned no permission-lifetime video track");
    displayVideoTrack.addEventListener("ended", () => {
      if (this.state === "recording") void this.stop("share-ended");
    }, { once: true });
    return audioTracks;
  }

  recordEvent(type, data = {}) {
    if (this.state !== "recording") return false;
    if (typeof type !== "string" || type.trim() === "") throw new Error("Capture event type is required");
    this.events.push({
      t: Math.max(0, Math.round(this.now() - this.startedAtMs)),
      simMinute: Math.round(this.simMinute() * 100) / 100,
      type,
      data: cloneJson(data)
    });
    return true;
  }

  async stop(reason = "manual") {
    if (this.state !== "recording") return false;
    this.recordEvent("capture-stop", { reason });
    this.state = "stopping";
    clearTimeout(this.stopTimer);
    this.stopTimer = null;
    this.onStateChange(this.snapshot());
    const stopped = new Promise((resolve) => this.recorder.addEventListener("stop", resolve, { once: true }));
    this.recorder.stop();
    await stopped;
    stopTracks(this.canvasStream);
    stopTracks(this.displayStream);
    stopTracks(this.sfxStream);
    const durationMs = Math.round(this.now() - this.startedAtMs);
    const baseName = `${timestampSlug()}-${this.scenario.id}`;
    const suffix = this.captureMode === "sfx" ? ".sfx.webm" : ".webm";
    downloadBlob(new Blob(this.chunks, { type: this.recorder.mimeType }), `${baseName}${suffix}`);
    downloadBlob(new Blob([JSON.stringify({
      version: 1,
      scenario: this.scenario,
      durationMs,
      events: this.events
    }, null, 2)], { type: "application/json" }), `${baseName}.events.json`);
    this.state = "complete";
    this.onStateChange(this.snapshot());
    return true;
  }

  snapshot() {
    return Object.freeze({
      state: this.state,
      elapsedMs: this.startedAtMs === null ? 0 : Math.max(0, this.now() - this.startedAtMs),
      maxSeconds: this.maxSeconds
    });
  }
}

export function supportedCaptureMimeType() {
  if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder is unavailable");
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  if (!supported) throw new Error("No supported WebM recording format was found");
  return supported;
}

export function supportedAudioCaptureMimeType() {
  if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder is unavailable");
  const supported = ["audio/webm;codecs=opus", "audio/webm"]
    .find((type) => MediaRecorder.isTypeSupported(type));
  if (!supported) throw new Error("No supported WebM audio recording format was found");
  return supported;
}

function validateSfxStream(stream) {
  if (!(stream instanceof MediaStream)) throw new Error("SFX capture requires a MediaStream");
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length !== 1) {
    throw new Error(`SFX capture requires exactly one mixed audio track, got ${audioTracks.length}`);
  }
  if (stream.getVideoTracks().length !== 0) {
    throw new Error("SFX capture stream must not contain video tracks");
  }
}

function stopTracks(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
