# Geography checks

Run `npm run audit:geography` from `apps/pixel-globe` after changing terrain,
river routes, the world resolution, or city placement. It reads the same corrected
terrain and navigation graph as the game and emits a JSON report.

- Geographic waterway and isthmus contracts fail the command if a route closes
  or an inappropriate crossing opens. Endpoints can move at most one hex to
  accommodate the grid; bay and sound checks require their exact sampled tiles
  and full surface water, so river shortcuts cannot conceal land bridges.
- The river scan examines every river network and counts actual outlets into
  water. It reports coastal dead ends, including individual delta branches when
  another branch still works, and river networks with no outlet at all.
- The coast scan reports surface-water regions classified as coastal ocean
  that have no continuous surface-water connection to open ocean.
- Placement diagnostics flag settlements more than 75 km from their intended
  coordinates, respecting explicitly authored harbor coordinates.

Candidate reports require geographic review. Headwaters can lie near a different
coast, lagoons can be enclosed, straits can use narrow navigable channels, and
endorheic rivers must not be connected to the sea. Compare with the checked-in
Natural Earth river centerlines and coastline before authoring a correction.
The audit never modifies terrain or relocates settlements.

`src/worldMapInvariants.test.js` runs the reviewed contracts in the regular test
suite, verifies Long Island's separation, checks every reviewed river outlet,
and deliberately restores the original Chesapeake and Long Island barriers to
prove that the tests detect them. `src/worldGeographyAudit.test.js` exercises the
scan's positive and negative cases.

Corrections belong in `tools/build-subdivision-eight-map-data.mjs`. Regenerate
with `node tools/build-subdivision-eight-map-data.mjs`; do not hand-edit its
generated module. Then run `npm run catalog:update` for any catalog, navigation,
terrain, or placement change. This is the complete catalog release workflow:
it regenerates sailing distances, roads, and city scenes in dependency order,
validates their endpoints against live world placement, checks all frozen
catalog migrations, and runs geography, road, sailing, quest, and migration
regressions before writing the release manifest.

If the canonical sailing endpoint set or any existing endpoint changes,
increment `PORT_CATALOG_VERSION` and author the required old-to-new mappings
in `portCatalogMigration.js` (and the subdivision-seven map where applicable).
The update command refuses to replace an existing frozen release. It adds a new
fixture only after proving every older released reference still resolves to its
canonical city or explicitly authored gateway.

`npm run check:catalog` checks hashes of all producer modules and their imported
policies, the external geography inputs, and each generated artifact. Source
checks, both production builds, and deployment require it. Low-level individual
bake commands do not certify a release. Deployment also rejects a built artifact
whose catalog manifest differs from the current validated source release.

Production embeds the CSV and the three generated catalogs in the JavaScript
bundle. Cached code therefore retains its matching catalog generation when a
later deployment moves a settlement. Browser startup and save/load tests block
the mutable catalog URLs to enforce this. The HTML requests a revision-tagged
bootstrap so returning players do not reuse an earlier startup bundle.

The September 2026 scan repaired twelve reviewed delta and river openings and
the Long Island/Chesapeake geography. Its remaining candidates include inland
river discontinuities and misplaced Kazan, Soest, and Kholmogory; these require
separate geographic and settlement-policy review. A passing contract suite is
not a claim that the entire world map is geographically exact.

## Djenne and the Senegal coast

The imported Chandler record calls the city "Dienne", lists the alias "Jenne",
and places it in Senegal. It represents Djenné, the historic city in Mali's
Bani/Niger floodplain ([UNESCO](https://whc.unesco.org/en/list/116/)). The game
applies the correction at catalog import through `cityGeographyCorrections.js`,
before assigning territory, faction, or routes. Its released `dienne|senegal`
ID remains stable; the ID's old suffix no longer determines its territory.
The displayed name is "Djenne" in every font, avoiding inconsistent accent
transliteration between map labels, city titles, dialogue, and journal text.

Rufisque is a separate coastal village near present-day Dakar. Senegal's
[heritage submission](https://whc.unesco.org/fr/listesindicatives/2081/)
describes the fishing settlement and its sixteenth-century name. Its population
of 1,500 is a gameplay estimate. European trade does not make it a Portuguese
possession. The terrain contracts require an Atlantic surface-water approach
to Rufisque and a river approach to Djenne, each within 20 km of its location.

Port catalog version 4 migrates Dienne's former subdivision-eight tile to the
corrected city. The original subdivision-seven endpoint also resolves there.
Jobs already redirected to Timbuktu by earlier releases remain there: restoring
the city's geography must not rewrite those completed migrations or player history.
