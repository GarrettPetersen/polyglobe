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
generated module. After navigation changes, regenerate sailing distances with
`npm run render:port-sailing-distances`. If settlement placement changes, update
the port catalog migration, regenerate `npm run city-visualizer:catalog`, and
exercise saved colonies through `npm run test:save-restore-runtime`.

The September 2026 scan repaired twelve reviewed delta and river openings and
the Long Island/Chesapeake geography. Its remaining candidates include inland
river discontinuities and misplaced Kazan, Soest, and Kholmogory; these require
separate geographic and settlement-policy review. A passing contract suite is
not a claim that the entire world map is geographically exact.
