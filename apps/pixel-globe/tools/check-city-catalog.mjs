import { verifyCityCatalogRelease } from "./cityCatalogRelease.mjs";

const catalog = await verifyCityCatalogRelease();
console.log(`City catalog v${catalog.version} verified: inputs, generated assets, ${catalog.ports.length} saved endpoints and migration history.`);
