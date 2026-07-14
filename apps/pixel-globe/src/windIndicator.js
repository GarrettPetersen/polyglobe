const MAX_DISPLAY_WIND_STRENGTH = 1.25;
const MIN_ARM_LENGTH_PX = 6;
const ARM_LENGTH_PER_WIND_STRENGTH_PX = 12;
const APEX_ARM_OFFSET_RATIO = 0.7;

export function windVOpacity(windStrength, stallWarning = 0, pulse = 0) {
  for (const [label, value] of Object.entries({ windStrength, stallWarning, pulse })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid wind V ${label}: ${value}`);
  }
  return clamp(0.56 + Math.min(MAX_DISPLAY_WIND_STRENGTH, Math.max(0, windStrength)) * 0.34 +
    clamp(stallWarning, 0, 1) * clamp(pulse, 0, 1) * 0.1, 0, 1);
}

export function windVArmLengthPx(windStrength) {
  if (!Number.isFinite(windStrength) || windStrength < 0) {
    throw new Error(`Invalid wind strength: ${windStrength}`);
  }
  return MIN_ARM_LENGTH_PX + Math.round(
    Math.min(MAX_DISPLAY_WIND_STRENGTH, windStrength) * ARM_LENGTH_PER_WIND_STRENGTH_PX
  );
}

export function windVFlowDirectionForScreenVector(flowX, flowY) {
  if (!Number.isFinite(flowX) || !Number.isFinite(flowY)) {
    throw new Error(`Invalid wind V screen flow: ${flowX}, ${flowY}`);
  }
  if (Math.hypot(flowX, flowY) <= 1e-6) {
    throw new Error("Wind V screen flow cannot be zero length");
  }
  return Math.atan2(-flowY, flowX);
}

export function windVGeometry({
  centerX,
  centerY,
  flowDirectionRad,
  deadZoneHalfAngleRad,
  windStrength,
  radiusPx
}) {
  for (const [label, value] of Object.entries({ centerX, centerY, flowDirectionRad, radiusPx })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid wind V ${label}: ${value}`);
  }
  if (!Number.isFinite(deadZoneHalfAngleRad) || deadZoneHalfAngleRad < 0 || deadZoneHalfAngleRad >= Math.PI / 2) {
    throw new Error(`Invalid wind V dead-zone angle: ${deadZoneHalfAngleRad}`);
  }
  if (radiusPx < 0) throw new Error(`Invalid wind V radius: ${radiusPx}`);

  const armLengthPx = windVArmLengthPx(windStrength);
  const flow = {
    x: Math.cos(flowDirectionRad),
    y: -Math.sin(flowDirectionRad)
  };
  const upwind = { x: -flow.x, y: -flow.y };
  const apexDistance = radiusPx + armLengthPx * APEX_ARM_OFFSET_RATIO;
  const apex = {
    x: centerX + upwind.x * apexDistance,
    y: centerY + upwind.y * apexDistance
  };
  const portBoundary = rotateScreenVector(upwind, -deadZoneHalfAngleRad);
  const starboardBoundary = rotateScreenVector(upwind, deadZoneHalfAngleRad);

  return {
    armLengthPx,
    apex: roundPoint(apex),
    port: roundPoint({
      x: apex.x + portBoundary.x * armLengthPx,
      y: apex.y + portBoundary.y * armLengthPx
    }),
    starboard: roundPoint({
      x: apex.x + starboardBoundary.x * armLengthPx,
      y: apex.y + starboardBoundary.y * armLengthPx
    }),
    portBoundary,
    starboardBoundary
  };
}

function rotateScreenVector(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos
  };
}

function roundPoint(point) {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
