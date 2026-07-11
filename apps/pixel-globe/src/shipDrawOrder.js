export function compareShipDrawCalls(a, b) {
  const depthDifference = a.sortY - b.sortY;
  if (depthDifference !== 0) return depthDifference;
  return String(a.id).localeCompare(String(b.id));
}
