const FAMILIES = Object.freeze(["grass", "forest", "desert", "rocky"]);
const REGIONS = Object.freeze(["left", "right", "leftDistant", "rightDistant"]);

export function sampledCityTerrain(scores) {
  for (const region of REGIONS) {
    for (const family of FAMILIES) {
      const weight = scores?.[region]?.[family];
      if (!Number.isFinite(weight) || weight < 0) {
        throw new Error(`Invalid city terrain sample weight: ${region}/${family}`);
      }
    }
  }
  const neighborhood = Object.fromEntries(FAMILIES.map(family => [
    family, scores.left[family] + scores.right[family]
  ]));
  if (!hasSamples(neighborhood)) throw new Error("City terrain neighborhood contains no land samples");
  return Object.fromEntries(REGIONS.map(region => {
    // A coarse coastal cell can leave one bank entirely unsampled. Infer it
    // from observed local land, never from an alphabetical tie between zeros.
    const observed = hasSamples(scores[region]) ? scores[region] : neighborhood;
    const family = [...FAMILIES].sort((a, b) => observed[b] - observed[a] || a.localeCompare(b))[0];
    return [region, family];
  }));
}

function hasSamples(scores) {
  return FAMILIES.some(family => scores[family] > 0);
}
