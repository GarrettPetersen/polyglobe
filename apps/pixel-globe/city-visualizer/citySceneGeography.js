// The ship docks starboard to the city: screen-right is landward and
// screen-left is across the water, independently of compass bearing.
export function citySceneLandwardAxis(cityDirection, waterDirection) {
  for (const direction of [cityDirection, waterDirection]) {
    if (!Array.isArray(direction) || direction.length !== 3 ||
        !direction.every(Number.isFinite) || Math.abs(Math.hypot(...direction) - 1) > 1e-6) {
      throw new Error("City scene bank orientation requires unit globe directions");
    }
  }
  const dot = cityDirection.reduce((sum, value, index) => sum + value * waterDirection[index], 0);
  const landward = cityDirection.map((value, index) => value * dot - waterDirection[index]);
  const length = Math.hypot(...landward);
  if (length < 1e-10) throw new Error("City scene bank orientation requires a distinct water approach");
  return landward.map(value => value / length);
}
