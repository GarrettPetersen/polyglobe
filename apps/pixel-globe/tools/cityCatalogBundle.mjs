import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function cityCatalogBundlePlugin(appRoot) {
  const [csv, roads, sailing, scenes] = await Promise.all([
    readFile(resolve(appRoot, "../../examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"), "utf8"),
    readFile(resolve(appRoot, "public/assets/data/land-roads.json"), "utf8"),
    readFile(resolve(appRoot, "public/assets/data/port-sailing-distances.json"), "utf8"),
    readFile(resolve(appRoot, "city-visualizer/data/cities.json"), "utf8")
  ]);
  const contents = cityCatalogBundleSource({ csv, roads: JSON.parse(roads), sailing: JSON.parse(sailing), scenes: JSON.parse(scenes) });
  return {
    name: "city-catalog-release",
    setup(context) {
      context.onResolve({ filter: /(?:^|\/)cityCatalogAssets\.js$/ }, () => ({
        path: "cityCatalogAssets.js", namespace: "city-catalog-release"
      }));
      context.onLoad({ filter: /.*/, namespace: "city-catalog-release" }, () => ({ contents, loader: "js" }));
    }
  };
}

export function cityCatalogBundleSource({ csv, roads, sailing, scenes }) {
  return [
    `export async function loadCityCatalogCsv() { return ${JSON.stringify(csv)}; }`,
    `export async function loadLandRoadData() { return ${JSON.stringify(roads)}; }`,
    `export async function loadSailingDistanceData() { return ${JSON.stringify(sailing)}; }`,
    `export async function loadCitySceneCatalog() { return ${JSON.stringify(scenes)}; }`
  ].join("\n");
}
