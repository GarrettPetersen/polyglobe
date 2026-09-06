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
- Placement diagnostics reject settlements more than 45 km from their intended
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
it regenerates map corrections, sailing distances, roads, and city scenes in dependency order,
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

## Completed September review

The review covers every catalog settlement and colonization site. Each canonical
city ID must be assigned to a reviewed landmass in `settlementGeographyData.js`.
Placement checks that identity and searches only within 45 km of the authored
coordinates. It does not inspect navigation when placing a city. Missing
coastlines and river approaches must be repaired in the authoring data; capital
status can never pull a city to a convenient shore. New cities with no reviewed
landmass fail immediately. Island IDs no longer depend on catalog order.

Corrections include Copenhagen on Zealand, Kalmar on the Swedish mainland,
Gresik on Java, and explicit small-island identities for Hormuz, Diu, Kilwa,
Roanoke, Manhattan and Montreal. The Caspian Sea is restored as closed basin 39;
Lake Taupo is 47. A Greenland inland water component incorrectly labeled ocean
beach is classified as lake 48 rather than given an invented sea outlet.

River corrections follow the checked-in Natural Earth centerlines. They repair
Columbia and Jinsha discontinuities, Angara/Yenisey connections, Rhine/Main
approaches, and river docks formerly hidden by settlement relocation. Old
Sanggan/Wei/Fen spurs crossing drainage divides and the false Chorokhi route
toward Ararat are removed. The Lena cannot drain into Baikal. Ararat therefore
no longer has the fictional Black Sea approach that previously made it visible.
The game still abstracts river depth and vessel draft: a functional river
capital does not imply that an ocean galleon historically sailed its entire river.

`reviewedCoastalWaterCorridors.js` records explicit corrections following source
water through narrow bays and fjords, including Sognefjord, Hamilton Inlet,
Arctic inlets, Patagonia, Halmahera, and the St Lawrence/Xingu approaches.
The Ninglick channel is independently documented in the
[US Army Corps of Engineers Newtok assessment](https://www.poa.usace.army.mil/Portals/34/docs/civilworks/reports/Newtok%20Evacuation%20Center%20EA%20%26%20FONSI%20July%2008.pdf).
The runtime does not search for or carve an outlet automatically.

The audit now fails for any river network with no water outlet or any marine
inlet without ocean navigation. Real closed basins must have their proper lake
classification. Independent bounded route tests check downstream bodies of
water and barriers; reaching an ocean somewhere is insufficient. The coast
report can still list surface-isolated waters connected by explicitly modeled
narrow channels, such as Marmara. Coastal headwater candidates are diagnostic:
being near another coast does not justify a shortcut through a watershed.

## True seats and functional sea capitals

`FACTION_SEA_CAPITALS_1522` names the playable capital separately from its
`trueCapital` historical seat. Historical seats are metadata records with stable
city IDs; they need not all be represented in the economic city catalog.
Spain and Ethiopia have itinerant courts, and the Ainu polity represents local
councils, so these cases do not invent a fixed historical capital. See the
[University of Teramo's account of Charles V's court](https://digitalhistory.unite.it/en/territorios/itinerarios-urbanos/valladolid/iglesia-de-san-pablo/corte/)
and [The Wandering Capitals of Ethiopia](https://www.cambridge.org/core/journals/journal-of-african-history/article/abs/wandering-capitals-of-ethiopia/BE9AC2F5F278FADD48BBB4702DBE7C1F).

Every active sovereign faction must have exactly one sea capital in its own
port roster, with an ocean-reachable approach on the actual corrected graph.
The test also removes all navigation and capital annotations and verifies that
city placement stays identical. Broken access fails the build; there is no
"move capital to coast" policy.

Campaign tests also open Politics at every conquest phase. Cuzco's fall ends
the Inca government immediately if it has no surviving port, independently of
the later reward date. Unoccupied inland remnants become independent until the
columns arrive; a later player conquest is preserved. If divergent history left
another functioning Inca port, the government retreats to that existing city.
Ownership synchronization repairs older saves stranded between the capital's
fall and the reward without moving cities or changing their scheduled dates.

Wesel serves Cleves-Mark while Cleves remains its historical seat. Dresden
serves Ducal Saxony; Soest and Leipzig remain at their inland locations.
Crimea uses Kezlev as its sea capital, with the court at Salachik (the stable
Bakhchiserai city ID). The [Encyclopedia of Ukraine](https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CY%5CE%5CYevpatoriia.htm)
records Kezlev passing from direct Ottoman administration to the khanate in 1485.
New settlement populations are gameplay estimates.

The landlocked Kazan settlement remains independent and Tatar. No game event
grants the khanate ocean access. [Kazan's official history](https://culture.kzn.ru/o-kazani/istoriya-kazani/?lang=en)
records Muscovy's conquest in 1552. Its earlier fictional White Sea dock is
removed. Save schema 102 retires sovereign offices and papers while preserving
characters, other reputations and divergent conquest ownership. Recalled
commissions cannot relocate to unrelated independent villages.

Port catalog version 5 preserves every previously released endpoint through
explicit mappings, including inland sailing gateways. Kazan's former White Sea
voyages remain deliverable at Kholmogory; this is legacy recovery, not a claim
of a Volga–White Sea route. Tests distinguish old York from old Hull when their
historical tile numbers collide. All released catalog and game-state fixtures
remain frozen and are checked by the release pipeline.

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
