export const CITY_CLOUD_SPECS = Object.freeze([
  cloudSpec({
    layer: "Cloud 1",
    x: 835,
    y: 218,
    z: 0.5,
    depth: 0.08,
    driftScale: 0.52,
    bobPhase: 0.4
  }),
  cloudSpec({
    layer: "Cloud 2",
    x: 205,
    y: 185,
    z: 4,
    depth: 0.13,
    driftScale: 0.74,
    bobPhase: 2.2
  }),
  cloudSpec({
    layer: "Cloud 3",
    x: 1190,
    y: 274,
    z: 6,
    depth: 0.2,
    driftScale: 1,
    bobPhase: 4.1
  })
]);

export const CITY_CLOUD_LAYERS = Object.freeze(CITY_CLOUD_SPECS.map(({ layer }) => layer));

const CLOUD_DRIFT_PX_PER_SECOND = 4.2;

const SPEC_BY_LAYER = new Map(CITY_CLOUD_SPECS.map((spec) => [spec.layer, spec]));

export function cityCloudSpec(layerName) {
  return SPEC_BY_LAYER.get(layerName) || null;
}

export function cityCloudDrawPositions({ spec, frame, timeMs, wind, sceneWidth, driftX = 0 }) {
  requireCloudInputs({ spec, frame, timeMs, wind, sceneWidth, driftX });
  const span = sceneWidth + frame.frame.w;
  const wrappedX = positiveModulo(spec.x + driftX + frame.frame.w, span) - frame.frame.w;
  const breezeLift = wind.flowY * wind.strength * 5;
  const bob = Math.sin(timeMs * 0.00012 + spec.bobPhase) * 2;
  const y = Math.round(spec.y + breezeLift + bob);
  return Object.freeze([-span, 0, span].map((cycleOffset) => Object.freeze({
    x: Math.round(wrappedX + cycleOffset),
    y
  })));
}

export function advanceCityCloudDrift({ current, elapsedMs, wind, spec }) {
  if (!Number.isFinite(current)) throw new Error(`Invalid city cloud drift: ${current}`);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error(`Invalid city cloud elapsed time: ${elapsedMs}`);
  }
  if (!CITY_CLOUD_SPECS.includes(spec)) throw new Error("Unknown city cloud specification");
  if (
    !Number.isFinite(wind?.strength) || wind.strength < 0 ||
    !Number.isFinite(wind?.flowX)
  ) {
    throw new Error("City cloud requires a valid wind vector");
  }
  return current + elapsedMs / 1000 * CLOUD_DRIFT_PX_PER_SECOND * spec.driftScale *
    wind.strength * wind.flowX;
}

function cloudSpec(spec) {
  if (
    typeof spec.layer !== "string" ||
    ![spec.x, spec.y, spec.z, spec.depth, spec.driftScale, spec.bobPhase].every(Number.isFinite) ||
    spec.depth < 0 || spec.depth > 1 || spec.driftScale <= 0
  ) {
    throw new Error(`Invalid city cloud specification: ${spec.layer}`);
  }
  return Object.freeze(spec);
}

function requireCloudInputs({ spec, frame, timeMs, wind, sceneWidth, driftX }) {
  if (!CITY_CLOUD_SPECS.includes(spec)) throw new Error("Unknown city cloud specification");
  if (!Number.isInteger(frame?.frame?.w) || frame.frame.w <= 0) {
    throw new Error("City cloud requires a positive frame width");
  }
  if (!Number.isFinite(timeMs) || timeMs < 0) throw new Error(`Invalid city cloud time: ${timeMs}`);
  if (!Number.isInteger(sceneWidth) || sceneWidth <= 0) {
    throw new Error(`Invalid city cloud scene width: ${sceneWidth}`);
  }
  if (!Number.isFinite(driftX)) throw new Error(`Invalid city cloud drift: ${driftX}`);
  if (
    !Number.isFinite(wind?.strength) || wind.strength < 0 ||
    !Number.isFinite(wind?.flowX) || !Number.isFinite(wind?.flowY)
  ) {
    throw new Error("City cloud requires a valid wind vector");
  }
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
