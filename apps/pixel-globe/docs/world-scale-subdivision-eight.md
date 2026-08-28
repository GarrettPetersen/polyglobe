# Subdivision-8 World Prototype

The playable world now uses subdivision 8: 655,362 geodesic cells, four times the
subdivision-7 count. This is a useful scale for the game. It gives coasts, rivers,
straits, and local sailing substantially more room while reducing how much of the
globe's curvature a single viewport must flatten.

This is a prototype-quality integration, not a recommendation to advance to
subdivision 9. The land mask is detailed enough for subdivision 8, but elevation
and hydrography are already near their useful limit.

## Source fidelity

| Input | Resolution | Consequence at subdivision 8 |
| --- | --- | --- |
| Geodesic terrain | 655,362 cells | Mean neighboring-center spacing is about 30 km. |
| Land raster | 7200×3600, 0.05 degrees | About 5.6 km per pixel at the equator; adequate to resolve the finer cells. |
| Elevation DEM | 1440×720, 0.25 degrees | About 28 km per sample at the equator; approximately tile-scale and now the limiting terrain input. |
| Lakes and marine polygons | Natural Earth 110m | Useful globally, but narrow waterways still require authored corrections. |
| Named mountains | Natural Earth 10m/50m points | Adequate for named landmark placement, subject to navigable-view checks. |

Subdivision 8 therefore improves coastline fidelity from the existing sources.
A further subdivision should wait for higher-resolution elevation and hydrography.

## Runtime architecture

- Terrain and navigation use subdivision 8.
- The geodesic graph is decoded from `geodesic-graph-8.bin`. Building that graph
  at startup took about 5.8 seconds and roughly 1.6 GB in the build process;
  decoding the packed graph takes about 0.4 seconds.
- Discrete annual weather is baked at subdivision 6 and mapped to the fine cells.
  Its 14 MB bake replaces a 58 MB subdivision-7 bake for this purpose.
- Dynamic weather uses subdivision 7 and is mapped to subdivision 8 only when a
  visible or simulated tile asks for it. Ice and snow masks remain at their
  climate resolutions; there is no daily full-world mask expansion. Weather thus
  moves in coherent regional chunks without independent fine-cell state.
- Terrain rendering is 2.5 times the former pixels-per-radian scale. Ship angular
  speed is scaled to 0.48 of its old value, yielding 1.2 times the apparent
  on-screen speed while making a real-world passage about 2.08 times longer.
- A game day is 32 real seconds instead of 24. Combined with the larger world,
  the same passage consumes about 1.56 times as much in-game time.

Representative passages use the baked navigable-water distances rather than
great-circle distance. For a stock galleon, continuous ideal propulsion is a
lower bound; 70% effective propulsion is a useful favorable-wind estimate.

| Passage | Baked distance | Ideal | Favorable wind (70%) | Former favorable-wind time |
| --- | ---: | ---: | ---: | ---: |
| Lisbon–Havana | 7,360 km | 2.4 game days / 77 real seconds | 3.4 game days / 109 real seconds | 2.2 game days / 52 real seconds |
| Manila–Panama City | 17,766 km | 5.8 game days / 185 real seconds | 8.2 game days / 264 real seconds | 5.2 game days / 124 real seconds |

Variable wind, tacking, combat, and stops make actual voyages longer. The new
Atlantic estimate is 58% longer in game time and 110% longer in play time than
the former globe; the Pacific estimate is 59% and 113% longer respectively.

The main startup phases measured about 2.6 seconds in isolation on the development
machine. Terrain parsing, graph decoding, fine-to-coarse weather maps, freshwater,
navigation topology, and chart protection were included in that measurement.

Recurring simulation work does not traverse the 655,362 terrain cells. Daily ice
and snow refreshes update two subdivision-7 masks and one subdivision-6 mask in
place; fine terrain cells translate to those masks only when queried. This removes
three daily 655,362-cell expansion passes. Treasure ambushes and colony defenders
walk bounded neighborhoods, whale population seeding samples the subdivision-6
ecology grid once, and ocean-rumor recovery allocates only its local search frontier.

Whole-world traversal remains in one-time geography construction, spatial indexes,
minimap initialization, and cartography restoration from a save. Those systems
actually describe or restore every terrain cell; frame, minute, hourly politics,
and daily weather paths do not.

## Authored geography and drainage

Subdivision-specific correction data is generated rather than falling back to
stale subdivision-7 tile IDs. The subdivision-8 catalogue carries forward land,
island, shallow-water, river-mouth, blocked-edge, and manually authored river
corrections. It also restores approaches that the finer raster exposed as broken,
including the Niger, Yamuna, Rhine-adjacent European routes, Lake Malawi/Shire,
and several historic Asian and European river ports.

Automated world invariants cover:

- open Gibraltar, Bosporus, Dardanelles, Hormuz, Bab-el-Mandeb, Malacca, Sunda,
  Cook Strait, Mozambique Channel, the Lake Malawi/Shire route, and Magellan;
- closed Panama, Suez, and Corinth land barriers;
- canonical coastal and river ports, plus settlements that must remain inland;
- every discovery's approach from navigable water within the viewport;
- preservation of the old Yunnan drainage divide: Lancang/Mekong does not join
  Jinsha/Yangtze;
- a second explicit guard that the Pearl and Yangtze drainage networks do not
  join.

The drainage checks traverse reciprocal river edges, so sharing a nearby terrain
tile is not enough to pass accidentally. A future correction that reconnects
either basin fails the test.

## Saves

Saves now record `worldSubdivisions`. Saves without it are identified as the old
subdivision-7 world. Their stored unit direction is projected onto the nearest
subdivision-8 tile; old tile identifiers are never reused as if they belonged to
the new topology. Derived economy, land-trade, and NPC-route state is rebuilt,
while game history and divergent player-created history are retained.

## Building the data

From `apps/pixel-globe`:

```sh
npm run render:geodesic-graph -- 8
node tools/build-subdivision-eight-map-data.mjs
npm run render:port-sailing-distances
npm run render:land-roads
```

From `examples/globe-demo`:

```sh
NODE_OPTIONS=--max-old-space-size=12288 npm run build-earth-globe-cache -- 8 --skip-weather --skip-runtime
npm run build-earth-globe-cache -- 6 --skip-runtime
```

## Benchmark result and remaining decision

The busy-world chart held 919 tiles (263 rendered, 2,634 faces) and the Patagonia
chart held 1,010 tiles (275 rendered, 2,896 faces). Neither run rebuilt the chart,
requested a visual repair, or reported a terrain or water tear. Maximum measured
projection drift was 0.64 px and 1.06 px respectively. An earlier subdivision-7
busy scene held 1,417 chart tiles, 394 rendered tiles, and 4,096 faces, so the
larger globe reduced the flat chart's visible workload as intended.

Absolute frame-rate measurements from this pass are not valid: a trailer capture
was running on the same device, and each benchmark sampled only four frames after
very long startup contention. Re-run the busy-world and Patagonia benchmarks on
the same idle machine before treating subdivision 8 as ready to ship. The geometry,
projection-integrity, startup, and asset-size results are still useful.
