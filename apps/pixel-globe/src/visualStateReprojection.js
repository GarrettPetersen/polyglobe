export function partitionVisualStateReprojections(states, projectState) {
  if (!states || typeof states[Symbol.iterator] !== "function") {
    throw new Error("Visual state reprojection requires iterable states");
  }
  if (typeof projectState !== "function") {
    throw new Error("Visual state reprojection requires a projection function");
  }

  const projected = [];
  const outside = [];
  for (const state of states) {
    if (!state || typeof state.id !== "string" || state.id === "") {
      throw new Error("Visual state reprojection received an invalid state");
    }
    const point = projectState(state);
    if (point === null) {
      outside.push(state);
      continue;
    }
    if (
      !point ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      !Number.isInteger(point.tileId)
    ) {
      throw new Error(`Visual state reprojection produced an invalid point for ${state.id}`);
    }
    projected.push({ state, point });
  }
  return { projected, outside };
}
