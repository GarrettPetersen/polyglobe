export function createCaptureSfxBus(
  AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext,
  fetchAudio = globalThis.fetch?.bind(globalThis)
) {
  if (typeof AudioContextClass !== "function") {
    throw new Error("Automatic SFX capture requires Web Audio");
  }
  if (typeof fetchAudio !== "function") {
    throw new Error("Automatic SFX capture requires fetch");
  }
  const context = new AudioContextClass();
  const destination = context.createMediaStreamDestination();
  if (!destination?.stream || destination.stream.getAudioTracks().length !== 1) {
    throw new Error("Automatic SFX capture could not create a mixed audio stream");
  }
  return {
    context,
    destination,
    fetchAudio,
    registered: new WeakSet(),
    decodedByAudio: new WeakMap(),
    decodeByUrl: new Map(),
    ambientByAudio: new WeakMap()
  };
}

export function registerCaptureSfxAudio(bus, audio) {
  if (!bus) return false;
  if (!(audio instanceof HTMLMediaElement)) {
    throw new Error("Only HTML media elements can be registered with the capture SFX bus");
  }
  if (bus.registered.has(audio)) {
    throw new Error("Audio element was registered with the capture SFX bus twice");
  }
  const url = audio.currentSrc || audio.src;
  if (!url) throw new Error("Capture SFX audio element has no source URL");
  let decode = bus.decodeByUrl.get(url);
  if (!decode) {
    decode = decodeCaptureAudio(bus, url);
    bus.decodeByUrl.set(url, decode);
  }
  decode.then((buffer) => bus.decodedByAudio.set(audio, buffer));
  bus.registered.add(audio);
  return true;
}

export async function activateCaptureSfxBus(bus) {
  if (!bus) throw new Error("Automatic SFX capture bus is not configured");
  if (bus.context.state === "closed") throw new Error("Automatic SFX capture bus is closed");
  await Promise.all(bus.decodeByUrl.values());
  await bus.context.resume();
  if (bus.context.state !== "running") {
    throw new Error(`Automatic SFX capture audio context is ${bus.context.state}`);
  }
  return bus.destination.stream;
}

export function playCaptureSfx(bus, audio, { volume, playbackRate = 1 } = {}) {
  if (!bus) return false;
  const buffer = captureAudioBuffer(bus, audio);
  const source = bus.context.createBufferSource();
  const gain = bus.context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = finitePositive(playbackRate, "playback rate");
  gain.gain.value = captureVolume(volume);
  source.connect(gain);
  gain.connect(bus.destination);
  source.start();
  return true;
}

export function startCaptureSfxAmbient(bus, audio, { loop } = {}) {
  if (!bus) return false;
  if (bus.ambientByAudio.has(audio)) return false;
  const source = bus.context.createBufferSource();
  const gain = bus.context.createGain();
  source.buffer = captureAudioBuffer(bus, audio);
  source.loop = loop === true;
  source.playbackRate.value = finitePositive(audio.playbackRate || 1, "ambient playback rate");
  gain.gain.value = captureVolume(audio.volume);
  source.connect(gain);
  gain.connect(bus.destination);
  const state = { source, gain };
  bus.ambientByAudio.set(audio, state);
  source.addEventListener("ended", () => {
    if (bus.ambientByAudio.get(audio) === state) bus.ambientByAudio.delete(audio);
  }, { once: true });
  source.start();
  return true;
}

export function setCaptureSfxAmbientVolume(bus, audio, volume) {
  if (!bus) return false;
  const state = bus.ambientByAudio.get(audio);
  if (!state) return false;
  state.gain.gain.setValueAtTime(captureVolume(volume), bus.context.currentTime);
  return true;
}

async function decodeCaptureAudio(bus, url) {
  const response = await bus.fetchAudio(url);
  if (!response.ok) throw new Error(`Capture SFX failed to load ${url}: HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  try {
    return await bus.context.decodeAudioData(bytes);
  } catch (error) {
    throw new Error(`Capture SFX failed to decode ${url}: ${error.message}`);
  }
}

function captureAudioBuffer(bus, audio) {
  if (!bus.registered.has(audio)) throw new Error("Capture tried to play unregistered SFX audio");
  const buffer = bus.decodedByAudio.get(audio);
  if (!buffer) throw new Error(`Capture SFX was not decoded before playback: ${audio.src}`);
  return buffer;
}

function captureVolume(value) {
  if (!Number.isFinite(value)) throw new Error(`Invalid capture SFX volume: ${value}`);
  return Math.max(0, Math.min(1, value));
}

function finitePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid capture SFX ${label}: ${value}`);
  return value;
}
