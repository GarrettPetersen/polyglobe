import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildGeodesicGraph } from "../src/geodesic.js";
import { encodeGeodesicGraphBake } from "../src/geodesicBake.js";

const subdivisions = Number(process.argv[2] || 8);
if (!Number.isInteger(subdivisions) || subdivisions < 0 || subdivisions > 8) {
  throw new Error(`Invalid geodesic bake subdivision: ${process.argv[2]}`);
}
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(appRoot, `../../examples/globe-demo/public/geodesic-graph-${subdivisions}.bin`);
const startedAt = performance.now();
const graph = buildGeodesicGraph(subdivisions);
const builtAt = performance.now();
const buffer = encodeGeodesicGraphBake(graph);
await writeFile(output, new Uint8Array(buffer));
const memory = process.memoryUsage();
console.log(JSON.stringify({
  output,
  subdivisions,
  tileCount: graph.tileCount,
  bytes: buffer.byteLength,
  buildMs: Math.round(builtAt - startedAt),
  totalMs: Math.round(performance.now() - startedAt),
  rssBytes: memory.rss,
  heapUsedBytes: memory.heapUsed
}, null, 2));
