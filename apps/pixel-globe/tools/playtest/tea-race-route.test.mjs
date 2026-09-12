import test from "node:test";
import assert from "node:assert/strict";
import { createWorkerVoyage } from "./world-worker.mjs";
import { teaRaceCompetitorManifest } from "../../src/teaRaceQuest.js";
import { configureNpcRouteEncounter, npcShipSnapshotForId, updateNpcSeaRouteEvents,
  snapshotNpcSeaRouteSystem, restoreNpcSeaRouteSystem } from "../../src/npcSeaRoutes.js";

const DAY=1440;
test("Guangzhou tea racers sail to London on the game clock and survive mid-race restoration", () => {
  const voyage=createWorkerVoyage("tea-race-route");
  const routes=voyage.npcSeaRoutes;
  const start=74*DAY;
  const racers=teaRaceCompetitorManifest("tea-race-1522","guangzhou|china","london|united kingdom").map(spec =>
    configureNpcRouteEncounter(routes,{...spec,replaceOnSink:false,encounter:{kind:"tea-race",questId:"tea-race-1522",
      destinationCityId:spec.destinationCityId,holdAtDestination:true,holdProgress:spec.holdProgress}},start));
  for(const ship of racers){
    const days=(ship.plan.endMinute-start)/DAY;
    assert.ok(days>=31 && days<=41,`${ship.slug}: ${days} days`);
    const points=[0,10,20,30].map(days=>npcShipSnapshotForId(routes,ship.id,start+days*DAY).routeVector);
    for(let i=1;i<points.length;i++) assert.ok(points[i].some((v,j)=>Math.abs(v-points[i-1][j])>0.01),`${ship.id} stalled`);
    assert.equal(ship.plan.destination.cityId,"london|united kingdom");
    assert.ok(ship.plan.segments.some(segment=>segment.from?.id==="goodhope" || segment.to?.id==="goodhope"),"race must round Africa");
  }
  const before=racers.map(ship=>npcShipSnapshotForId(routes,ship.id,start+20*DAY));
  restoreNpcSeaRouteSystem(routes,snapshotNpcSeaRouteSystem(routes),{economy:voyage.worldEconomy});
  assert.deepEqual(racers.map(ship=>npcShipSnapshotForId(routes,ship.id,start+20*DAY)),before);
  const ids=racers.map(ship=>ship.id);
  updateNpcSeaRouteEvents(routes,start+42*DAY,ids,{maintenance:false});
  for(const id of ids){const ship=routes.shipById.get(id);assert.equal(ship.currentPort.cityId,"london|united kingdom");
    assert.ok(ship.encounter.arrivedAtMinute<=start+41*DAY);}
});

test("a frozen v10 tea racer migrates without moving and is not accelerated twice on reload", async () => {
  const { readFile } = await import("node:fs/promises");
  const fixture = JSON.parse(await readFile(new URL("../../src/test-fixtures/npc-routes/tea-racer-v10.json", import.meta.url)));
  const voyage = createWorkerVoyage("tea-route-legacy");
  const routes = voyage.npcSeaRoutes;
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  snapshot.version = fixture.version;
  snapshot.ships.push(fixture.ship);
  voyage.worldEconomy.lastMinute = fixture.clockMinute;
  // Install the original route without migration to observe its saved position.
  restoreNpcSeaRouteSystem(routes, { ...snapshot, version: 11 }, { economy: voyage.worldEconomy });
  const before = npcShipSnapshotForId(routes, fixture.ship.id, fixture.clockMinute).routeVector;
  restoreNpcSeaRouteSystem(routes, snapshot, { economy: voyage.worldEconomy });
  const migrated = routes.shipById.get(fixture.ship.id);
  const after = npcShipSnapshotForId(routes, fixture.ship.id, fixture.clockMinute).routeVector;
  assert.ok(after.every((value, index) => Math.abs(value - before[index]) < 1e-10));
  assert.ok(migrated.plan.endMinute < fixture.ship.plan.endMinute);
  const once = snapshotNpcSeaRouteSystem(routes);
  restoreNpcSeaRouteSystem(routes, once, { economy: voyage.worldEconomy });
  assert.deepEqual(snapshotNpcSeaRouteSystem(routes), once);
});
