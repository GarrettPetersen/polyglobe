// The ship docks starboard to the city: screen-right is landward and
// screen-left is across the water, independently of compass bearing.
export function citySceneLandwardAxis(cityDirection, waterDirection) {
  const [city, water] = [cityDirection, waterDirection].map(unitDirection);
  const dot = city.reduce((sum, value, index) => sum + value * water[index], 0);
  const landward = city.map((value, index) => value * dot - water[index]);
  return normalizedAxis(landward);
}

// A river port can occupy the channel tile itself. Its bank normal is
// perpendicular to the connected channel, not a direction from a tile to itself.
export function citySceneRiverLandwardAxis(channelDirection, connectedDirections) {
  const channel = unitDirection(channelDirection);
  if (!Array.isArray(connectedDirections) || connectedDirections.length === 0) {
    throw new Error("City scene river orientation requires connected channel tiles");
  }
  const neighbors = connectedDirections.map(unitDirection);
  let along = citySceneLandwardAxis(channel, neighbors[0]);
  let longestSpan = 0;
  for (let a = 0; a < neighbors.length; a++) {
    for (let b = a + 1; b < neighbors.length; b++) {
      const span = neighbors[a].map((value, index) => value - neighbors[b][index]);
      const length = Math.hypot(...span);
      if (length <= longestSpan) continue;
      longestSpan = length;
      along = span;
    }
  }
  const bank = normalizedAxis([
    channel[1] * along[2] - channel[2] * along[1],
    channel[2] * along[0] - channel[0] * along[2],
    channel[0] * along[1] - channel[1] * along[0]
  ]);
  // Either bank is valid for a river city. Stable graph-neighbor order fixes
  // the choice without depending on sub-tile placement or floating-point noise.
  return bank;
}

function unitDirection(direction) {
  if (!Array.isArray(direction) || direction.length !== 3 ||
      !direction.every(Number.isFinite) || Math.abs(Math.hypot(...direction) - 1) > 1e-6) {
    throw new Error("City scene bank orientation requires unit globe directions");
  }
  // Graph centers are stored as float32 and are only approximately unit length.
  const length = Math.hypot(...direction);
  return direction.map(value => value / length);
}

function normalizedAxis(axis) {
  const length = Math.hypot(...axis);
  if (length < 1e-10) throw new Error("City scene bank orientation requires a distinct water approach");
  return axis.map(value => value / length);
}
