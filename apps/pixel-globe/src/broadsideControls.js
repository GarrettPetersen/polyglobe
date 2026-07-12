export function broadsideLaneGeometry({
  screenWidth,
  screenHeight,
  heading,
  sideName,
  range,
  start = 13,
  halfWidth = 10
}) {
  if (sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown broadside lane: ${sideName}`);
  }
  const headingLength = Math.hypot(heading?.x || 0, heading?.y || 0);
  if (headingLength <= 0) throw new Error("Broadside lane requires a heading");
  const normalizedHeading = { x: heading.x / headingLength, y: heading.y / headingLength };
  const starboard = { x: -normalizedHeading.y, y: normalizedHeading.x };
  const rawDirection = sideName === "starboard" ? starboard : { x: -starboard.x, y: -starboard.y };
  const direction = {
    x: Object.is(rawDirection.x, -0) ? 0 : rawDirection.x,
    y: Object.is(rawDirection.y, -0) ? 0 : rawDirection.y
  };
  const origin = { x: screenWidth / 2, y: screenHeight / 2 };
  const corners = [
    lanePoint(origin, direction, normalizedHeading, start, -halfWidth),
    lanePoint(origin, direction, normalizedHeading, start + range, -halfWidth),
    lanePoint(origin, direction, normalizedHeading, start + range, halfWidth),
    lanePoint(origin, direction, normalizedHeading, start, halfWidth)
  ];
  return {
    sideName,
    origin,
    direction,
    heading: normalizedHeading,
    start,
    length: range,
    halfWidth,
    corners
  };
}

export function pointInBroadsideLane(point, lane, padding = 0) {
  const dx = point.x - lane.origin.x;
  const dy = point.y - lane.origin.y;
  const along = dx * lane.direction.x + dy * lane.direction.y;
  const across = dx * lane.heading.x + dy * lane.heading.y;
  return along >= lane.start - padding &&
    along <= lane.start + lane.length + padding &&
    Math.abs(across) <= lane.halfWidth + padding;
}

function lanePoint(origin, direction, heading, along, across) {
  return {
    x: origin.x + direction.x * along + heading.x * across,
    y: origin.y + direction.y * along + heading.y * across
  };
}
