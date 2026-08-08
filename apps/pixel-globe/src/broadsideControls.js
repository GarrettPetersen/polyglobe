export function broadsideArcGeometry({
  screenWidth,
  screenHeight,
  heading,
  sideName,
  range,
  origin = null,
  start = 8,
  hullFootprint = null,
  halfAngle = Math.PI / 9
}) {
  if (sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown broadside arc: ${sideName}`);
  }
  const headingLength = Math.hypot(heading?.x || 0, heading?.y || 0);
  if (headingLength <= 0) throw new Error("Broadside arc requires a heading");
  if (!Number.isFinite(range) || range <= 0) throw new Error(`Invalid broadside range: ${range}`);
  if (!Number.isFinite(halfAngle) || halfAngle <= 0 || halfAngle >= Math.PI / 2) {
    throw new Error(`Invalid broadside half angle: ${halfAngle}`);
  }

  const normalizedHeading = { x: heading.x / headingLength, y: heading.y / headingLength };
  const starboard = { x: -normalizedHeading.y, y: normalizedHeading.x };
  const rawDirection = sideName === "starboard" ? starboard : { x: -starboard.x, y: -starboard.y };
  const direction = {
    x: Object.is(rawDirection.x, -0) ? 0 : rawDirection.x,
    y: Object.is(rawDirection.y, -0) ? 0 : rawDirection.y
  };
  const resolvedOrigin = origin || { x: screenWidth / 2, y: screenHeight / 2 };
  if (!Number.isFinite(resolvedOrigin.x) || !Number.isFinite(resolvedOrigin.y)) {
    throw new Error(`Invalid broadside origin: ${resolvedOrigin.x}, ${resolvedOrigin.y}`);
  }
  const resolvedStart = hullFootprint
    ? broadsideHullEdgeDistance(hullFootprint, resolvedOrigin, direction)
    : start;
  if (!Number.isFinite(resolvedStart) || resolvedStart < 0) {
    throw new Error(`Invalid broadside start: ${resolvedStart}`);
  }
  const centerAngle = Math.atan2(direction.y, direction.x);
  return {
    sideName,
    origin: { x: resolvedOrigin.x, y: resolvedOrigin.y },
    direction,
    heading: normalizedHeading,
    start: resolvedStart,
    length: range,
    innerRadius: resolvedStart,
    outerRadius: resolvedStart + range,
    halfAngle,
    startAngle: centerAngle - halfAngle,
    endAngle: centerAngle + halfAngle
  };
}

export function projectBroadsideFrameToScreen({ origin, hullFootprint, offset }) {
  if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
    throw new Error("Broadside screen projection requires a finite origin");
  }
  if (!offset || !Number.isFinite(offset.x) || !Number.isFinite(offset.y)) {
    throw new Error("Broadside screen projection requires a finite offset");
  }
  if (!Array.isArray(hullFootprint) || hullFootprint.length < 3) {
    throw new Error("Broadside screen projection requires a hull polygon");
  }
  const translate = (point) => {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
      throw new Error("Broadside screen projection received an invalid hull point");
    }
    return { x: point.x + offset.x, y: point.y + offset.y };
  };
  return {
    origin: translate(origin),
    hullFootprint: hullFootprint.map(translate)
  };
}

export function broadsideHullEdgeDistance(footprint, origin, direction) {
  if (!Array.isArray(footprint) || footprint.length < 3) {
    throw new Error("Broadside hull edge requires a polygon");
  }
  if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
    throw new Error("Broadside hull edge requires a finite origin");
  }
  const directionLength = Math.hypot(direction?.x || 0, direction?.y || 0);
  if (!Number.isFinite(directionLength) || directionLength <= 0) {
    throw new Error("Broadside hull edge requires a direction");
  }
  const directionX = direction.x / directionLength;
  const directionY = direction.y / directionLength;
  let edgeDistance = 0;
  for (const point of footprint) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
      throw new Error("Broadside hull edge received an invalid polygon point");
    }
    edgeDistance = Math.max(
      edgeDistance,
      (point.x - origin.x) * directionX + (point.y - origin.y) * directionY
    );
  }
  return edgeDistance;
}

export function pointInBroadsideArc(point, arc, padding = 0) {
  const dx = point.x - arc.origin.x;
  const dy = point.y - arc.origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance < Math.max(0, arc.innerRadius - padding) || distance > arc.outerRadius + padding) return false;
  if (distance <= 0) return false;
  const alignment = clamp((dx * arc.direction.x + dy * arc.direction.y) / distance, -1, 1);
  const angleFromBroadside = Math.acos(alignment);
  const angularPadding = Math.atan2(Math.max(0, padding), Math.max(1, distance));
  return angleFromBroadside <= arc.halfAngle + angularPadding;
}

export function broadsideReloadGeometry(arc, readyFraction) {
  if (!arc || !Number.isFinite(arc.innerRadius) || !Number.isFinite(arc.outerRadius)) {
    throw new Error("Broadside reload geometry requires a valid arc");
  }
  if (!Number.isFinite(readyFraction) || readyFraction < 0 || readyFraction > 1) {
    throw new Error(`Invalid broadside ready fraction: ${readyFraction}`);
  }
  return {
    readyFraction,
    fillOuterRadius: arc.innerRadius + (arc.outerRadius - arc.innerRadius) * readyFraction,
    reloading: readyFraction < 1
  };
}

export function hasBroadsideCannons(cannonCount) {
  if (!Number.isFinite(cannonCount)) throw new Error(`Invalid cannon count: ${cannonCount}`);
  return cannonCount > 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
