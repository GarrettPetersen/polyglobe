export function broadsideArcGeometry({
  screenWidth,
  screenHeight,
  heading,
  sideName,
  range,
  origin = null,
  start = 13,
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
  const centerAngle = Math.atan2(direction.y, direction.x);
  return {
    sideName,
    origin: { x: resolvedOrigin.x, y: resolvedOrigin.y },
    direction,
    heading: normalizedHeading,
    start,
    length: range,
    innerRadius: start,
    outerRadius: start + range,
    halfAngle,
    startAngle: centerAngle - halfAngle,
    endAngle: centerAngle + halfAngle
  };
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
