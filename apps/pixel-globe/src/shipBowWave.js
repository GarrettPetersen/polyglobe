export function shipBowWaveStyle({ speedPx, minimumWakeSpeedPx, elapsedSeconds }) {
  for (const [label, value] of Object.entries({ speedPx, minimumWakeSpeedPx, elapsedSeconds })) {
    if (!Number.isFinite(value)) throw new Error(`Ship bow wave requires finite ${label}`);
  }
  if (minimumWakeSpeedPx <= 0) throw new Error("Ship bow wave minimum speed must be positive");
  const speed = Math.abs(speedPx);
  if (speed < minimumWakeSpeedPx) return null;
  const speedRatio = clamp((speed - minimumWakeSpeedPx) / (minimumWakeSpeedPx * 1.8), 0, 1);
  const slowPulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(elapsedSeconds * Math.PI * 1.35));
  const strength = mix(slowPulse, 1, speedRatio);
  return Object.freeze({
    alpha: Number((0.26 + strength * 0.34).toFixed(3)),
    outwardPixels: speedRatio >= 0.38 ? 1 : 0
  });
}

export function shipBowWavePixels({ port, starboard, side, style }) {
  for (const [label, point] of Object.entries({ port, starboard, side })) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(`Ship bow wave requires a finite ${label} point`);
    }
  }
  if (!style || !Number.isFinite(style.alpha) || !Number.isInteger(style.outwardPixels) ||
      style.outwardPixels < 0) {
    throw new Error("Ship bow wave requires a valid style");
  }
  const pixels = [rounded(port), rounded(starboard)];
  if (style.outwardPixels > 0) {
    pixels.push(rounded({ x: port.x + side.x, y: port.y + side.y }));
    pixels.push(rounded({ x: starboard.x - side.x, y: starboard.y - side.y }));
  }
  return Object.freeze(pixels.map((point) => Object.freeze({ ...point, alpha: style.alpha })));
}

function rounded(point) {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
