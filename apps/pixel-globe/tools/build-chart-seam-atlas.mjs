import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  baseIcosahedronGeometry,
  buildGeodesicGraph,
  normalize3
} from "../src/geodesic.js";
import { CHART_SEAM_ATLAS_VERSION } from "../src/chartSeamAtlas.js";
import { applyManualTerrainOverrides } from "../src/manualTerrainOverrides.js";
import { isWaterSurfaceRow } from "../src/terrainSurface.js";

const SUBDIVISIONS = 7;
const CLEARANCE_DEPTH = 12;
const FROZEN_SEAM_TERRAIN = new Set([
  "ice",
  "ice_cap",
  "tundra",
  "subarctic",
  "subarctic_dry_winter"
]);
const toolsRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolsRoot, "..");
const repoRoot = resolve(appRoot, "../..");
const earthPath = join(repoRoot, "examples/globe-demo/public/earth-globe-cache-7.json");
const outputPath = join(repoRoot, "examples/globe-demo/public/chart-seam-atlas-7.json");

const earth = JSON.parse(await readFile(earthPath, "utf8"));
if (earth.subdivisions !== SUBDIVISIONS) {
  throw new Error(`Expected Earth subdivisions ${SUBDIVISIONS}, got ${earth.subdivisions}`);
}
const graph = buildGeodesicGraph(SUBDIVISIONS);
const earthRows = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
if (graph.tileCount !== earthRows.length) {
  throw new Error(`Chart seam atlas tile mismatch: ${graph.tileCount}/${earthRows.length}`);
}

const waterMask = Uint8Array.from(earthRows, (row) => isWaterSurfaceRow(row) ? 1 : 0);
const waterClearance = waterClearanceFromLand(graph, waterMask, CLEARANCE_DEPTH);
const baseRegions = baseIcosahedronRegions();
const candidates = candidateRotations();
let best = null;
for (const rotation of candidates) {
  const centers = baseRegions.map((region) => rotateVector(region.center, rotation));
  const assignment = assignRegions(graph, centers);
  const score = scoreSeams(graph, assignment, earthRows, waterMask, waterClearance);
  if (!best || score.weightedCost < best.score.weightedCost) {
    best = { rotation, centers, assignment, score };
  }
}
if (!best) throw new Error("Chart seam atlas optimization produced no candidate");

const atlas = {
  version: CHART_SEAM_ATLAS_VERSION,
  subdivisions: SUBDIVISIONS,
  earthVersion: String(earth.version),
  regions: baseRegions.map((region, id) => ({
    id,
    center: best.centers[id].map((value) => Number(value.toFixed(12))),
    neighbors: region.neighbors
  })),
  bake: {
    generator: "tools/build-chart-seam-atlas.mjs",
    strategy: "rotated-icosahedral-orange-peel",
    candidateCount: candidates.length,
    rotationDeg: best.rotation.map((angle) => Number((angle * 180 / Math.PI).toFixed(3))),
    weightedCost: best.score.weightedCost,
    seamEdges: best.score.seamEdges,
    deepOceanSeamEdges: best.score.deepOceanSeamEdges,
    coastalSeamEdges: best.score.coastalSeamEdges,
    landSeamEdges: best.score.landSeamEdges,
    polarOrFrozenLandSeamEdges: best.score.polarOrFrozenLandSeamEdges,
    temperateLandSeamEdges: best.score.temperateLandSeamEdges,
    maximumRegionRadiusDeg: Number(maximumRegionRadiusDeg(graph, best.assignment, best.centers).toFixed(3))
  }
};

await writeFile(outputPath, `${JSON.stringify(atlas, null, 2)}\n`);
console.info(
  `[pixel-globe] chart seam atlas: ${atlas.regions.length} regions, ` +
  `${atlas.bake.seamEdges} seam edges, ${atlas.bake.deepOceanSeamEdges} deep-ocean, ` +
  `${atlas.bake.coastalSeamEdges} coastal, ${atlas.bake.landSeamEdges} land ` +
  `(${atlas.bake.polarOrFrozenLandSeamEdges} polar/frozen), ` +
  `${atlas.bake.maximumRegionRadiusDeg}deg max radius -> ${outputPath}`
);

function baseIcosahedronRegions() {
  const { vertices, faces } = baseIcosahedronGeometry();
  return faces.map((face, id) => {
    const center = normalize3(face.reduce((sum, vertexId) => {
      const vertex = vertices[vertexId];
      return [sum[0] + vertex[0], sum[1] + vertex[1], sum[2] + vertex[2]];
    }, [0, 0, 0]));
    const neighbors = [];
    for (let otherId = 0; otherId < faces.length; otherId++) {
      if (otherId === id) continue;
      const sharedVertices = face.filter((vertexId) => faces[otherId].includes(vertexId));
      if (sharedVertices.length === 2) neighbors.push(otherId);
    }
    if (neighbors.length !== 3) {
      throw new Error(`Base icosahedron face ${id} has ${neighbors.length} neighbors`);
    }
    return { id, center, neighbors };
  });
}

function candidateRotations() {
  const candidates = [];
  for (let yawDeg = 0; yawDeg < 360; yawDeg += 15) {
    for (const pitchDeg of [-24, -12, 0, 12, 24]) {
      for (const rollDeg of [0, 24, 48]) {
        candidates.push([
          yawDeg * Math.PI / 180,
          pitchDeg * Math.PI / 180,
          rollDeg * Math.PI / 180
        ]);
      }
    }
  }
  return candidates;
}

function rotateVector(vector, [yaw, pitch, roll]) {
  const yawed = rotateY(vector, yaw);
  const pitched = rotateX(yawed, pitch);
  return normalize3(rotateZ(pitched, roll));
}

function assignRegions(graph, centers) {
  const assignment = new Uint8Array(graph.tileCount);
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const offset = tileId * 3;
    const x = graph.centers[offset];
    const y = graph.centers[offset + 1];
    const z = graph.centers[offset + 2];
    let bestRegionId = 0;
    let bestDot = -Infinity;
    for (let regionId = 0; regionId < centers.length; regionId++) {
      const center = centers[regionId];
      const dot = x * center[0] + y * center[1] + z * center[2];
      if (dot <= bestDot) continue;
      bestDot = dot;
      bestRegionId = regionId;
    }
    assignment[tileId] = bestRegionId;
  }
  return assignment;
}

function scoreSeams(graph, assignment, earthRows, waterMask, waterClearance) {
  let weightedCost = 0;
  let seamEdges = 0;
  let deepOceanSeamEdges = 0;
  let coastalSeamEdges = 0;
  let landSeamEdges = 0;
  let polarOrFrozenLandSeamEdges = 0;
  let temperateLandSeamEdges = 0;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    for (const neighborId of graph.neighbors[tileId]) {
      if (neighborId < tileId || assignment[tileId] === assignment[neighborId]) continue;
      seamEdges++;
      if (!waterMask[tileId] || !waterMask[neighborId]) {
        landSeamEdges++;
        if (landSeamIsPolarOrFrozen(graph, earthRows, tileId, neighborId)) {
          polarOrFrozenLandSeamEdges++;
          weightedCost += 450;
        } else {
          temperateLandSeamEdges++;
          weightedCost += 6000;
        }
        continue;
      }
      const clearance = Math.min(waterClearance[tileId], waterClearance[neighborId]);
      if (clearance >= CLEARANCE_DEPTH) {
        deepOceanSeamEdges++;
        weightedCost += 1;
      } else {
        coastalSeamEdges++;
        weightedCost += 40 + (CLEARANCE_DEPTH - clearance) ** 2 * 8;
      }
    }
  }
  return {
    weightedCost,
    seamEdges,
    deepOceanSeamEdges,
    coastalSeamEdges,
    landSeamEdges,
    polarOrFrozenLandSeamEdges,
    temperateLandSeamEdges
  };
}

function landSeamIsPolarOrFrozen(graph, earthRows, tileId, neighborId) {
  const meanAbsoluteLatitude = (
    Math.abs(graph.latDeg[tileId]) + Math.abs(graph.latDeg[neighborId])
  ) / 2;
  if (meanAbsoluteLatitude >= 66) return true;
  return FROZEN_SEAM_TERRAIN.has(earthRows[tileId]?.t) &&
    FROZEN_SEAM_TERRAIN.has(earthRows[neighborId]?.t);
}

function waterClearanceFromLand(graph, waterMask, maximumDepth) {
  const distance = new Uint8Array(graph.tileCount);
  distance.fill(maximumDepth);
  const queue = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (waterMask[tileId]) continue;
    distance[tileId] = 0;
    queue.push(tileId);
  }
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    const nextDistance = distance[tileId] + 1;
    if (nextDistance >= maximumDepth) continue;
    for (const neighborId of graph.neighbors[tileId]) {
      if (distance[neighborId] <= nextDistance) continue;
      distance[neighborId] = nextDistance;
      queue.push(neighborId);
    }
  }
  return distance;
}

function maximumRegionRadiusDeg(graph, assignment, centers) {
  let maximum = 0;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const offset = tileId * 3;
    const center = centers[assignment[tileId]];
    const dot = Math.max(-1, Math.min(1,
      graph.centers[offset] * center[0] +
      graph.centers[offset + 1] * center[1] +
      graph.centers[offset + 2] * center[2]
    ));
    maximum = Math.max(maximum, Math.acos(dot) * 180 / Math.PI);
  }
  return maximum;
}

function rotateX([x, y, z], angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

function rotateY([x, y, z], angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

function rotateZ([x, y, z], angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - y * sin, x * sin + y * cos, z];
}
