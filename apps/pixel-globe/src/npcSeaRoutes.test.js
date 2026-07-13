import assert from "node:assert/strict";
import test from "node:test";

import { advanceWorldEconomy, createWorldEconomy, tradeGoodById } from "./economy.js";
import { createGameState } from "./gameState.js";
import {
  NPC_ROLE_FISHERMAN,
  NPC_ROLE_MERCHANT,
  NPC_ROLE_PIRATE,
  NPC_ROLE_WARSHIP,
  createNpcSeaRouteSystem,
  damageNpcShip,
  npcPortHasMajorProtection,
  npcShipHasCombatGrace,
  npcShipSnapshots,
  restoreNpcSeaRouteSystem,
  sinkNpcShip,
  snapshotNpcSeaRouteSystem,
  surrenderNpcShip,
  updateNpcPirateHideoutPlayerThreat,
  updateNpcSeaRouteSystem
} from "./npcSeaRoutes.js";
import { DIPLOMACY_WAR, PIRATE_FACTION_ID, diplomacyBetween } from "./factions.js";
import { shipStatsForSlug } from "./shipStats.js";
import { navalWeaponForShip } from "./navalWeapons.js";
import {
  fishingNetById,
  npcFishingNetExpectedHaul
} from "./fishingNets.js";

const PORTS = Object.freeze([
  port(1, "Lisbon", "Portugal", "mediterranean", 38.72, -9.14, 70000, "portugal"),
  port(2, "Seville", "Spain", "mediterranean", 37.39, -5.99, 90000, "spain"),
  port(3, "Genova", "Italy", "mediterranean", 44.41, 8.93, 70000, "genoa"),
  port(4, "Istanbul", "Turkey", "islamic-desert", 41.01, 28.98, 180000, "ottoman"),
  port(5, "Goa", "India", "south-asian", 15.3, 73.82, 60000, "portugal"),
  port(6, "Calicut", "India", "south-asian", 11.26, 75.78, 50000, "vijayanagara"),
  port(7, "Malacca", "Malaysia", "southeast-asian", 2.19, 102.25, 45000, "portugal"),
  port(8, "Guangzhou", "China", "east-asian", 23.13, 113.26, 120000, "ming"),
  port(9, "Nanjing", "China", "east-asian", 32.06, 118.79, 160000, "ming")
]);

const PACIFIC_PORTS = Object.freeze([
  port(20, "Fiji Village", "Fiji", "polynesian", -18.14, 178.44, 3500, "neutral"),
  port(21, "Tonga Village", "Tonga", "polynesian", -21.14, -175.2, 3000, "neutral"),
  port(22, "Samoa Village", "Samoa", "polynesian", -13.83, -171.75, 3000, "neutral"),
  port(23, "Tahiti Village", "French Polynesia", "polynesian", -17.55, -149.56, 3000, "neutral")
]);

const MESOAMERICAN_PORTS = Object.freeze([
  port(30, "Guanahani Village", "Bahamas", "mesoamerican", 24.06, -74.47, 1200, "neutral"),
  port(31, "Coroa Vermelha Village", "Brazil", "mesoamerican", -16.33, -39.01, 1600, "neutral")
]);

test("NPC merchants carry finite cargo and realize profits over repeated port calls", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });

  assert.ok(routes.ships.length > 0);
  assert.ok(routes.ships.some((ship) => cargoUnits(ship) > 0));
  for (const ship of routes.ships) {
    assert.ok(ship.specie >= 0);
    assert.ok(cargoUnits(ship) <= ship.cargoCapacity);
  }

  for (let day = 1; day <= 180; day++) {
    const minute = day * 24 * 60;
    advanceWorldEconomy(economy, minute);
    updateNpcSeaRouteSystem(routes, minute);
  }

  assert.ok(routes.ships.some((ship) => ship.lifetimeProfit > 0));
  for (const ship of routes.ships) {
    assert.ok(Number.isFinite(ship.lifetimeProfit));
    assert.ok(ship.specie >= 0);
    assert.ok(cargoUnits(ship) <= ship.cargoCapacity);
  }
});

test("NPC fleets favor merchants and inexpensive role-appropriate hulls", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const counts = { merchant: 0, fisherman: 0, warship: 0, pirate: 0 };
  let cheap = 0;
  let expensive = 0;
  const fishermanNetIds = new Set();

  for (const ship of routes.ships) {
    counts[ship.role] += 1;
    const stats = shipStatsForSlug(ship.slug);
    if (stats.mass <= 155) cheap += 1;
    if (stats.mass >= 260) expensive += 1;
    if (ship.role === NPC_ROLE_PIRATE) {
      assert.equal(ship.factionId, PIRATE_FACTION_ID);
      assert.match(ship.slug, /^pirate-/);
    } else if (ship.role === NPC_ROLE_WARSHIP) {
      assert.ok(navalWeaponForShip({ cultureType: ship.cultureType, cannons: stats.cannons }));
      assert.notEqual(ship.factionId, PIRATE_FACTION_ID);
    } else if (ship.role === NPC_ROLE_FISHERMAN) {
      assert.equal(stats.cannons <= 4, true);
      assert.notEqual(ship.factionId, PIRATE_FACTION_ID);
      fishingNetById(ship.fishingNetId);
      fishermanNetIds.add(ship.fishingNetId);
    } else {
      assert.equal(ship.role, NPC_ROLE_MERCHANT);
      assert.notEqual(ship.factionId, PIRATE_FACTION_ID);
    }
  }

  assert.ok(counts.merchant > counts.fisherman, JSON.stringify(counts));
  assert.ok(counts.merchant > counts.warship + counts.pirate, JSON.stringify(counts));
  assert.ok(counts.fisherman > 0, JSON.stringify(counts));
  assert.ok(fishermanNetIds.size >= 2, JSON.stringify([...fishermanNetIds]));
  assert.ok(counts.warship > counts.pirate, JSON.stringify(counts));
  assert.ok(counts.pirate / routes.ships.length <= 0.06, JSON.stringify(counts));
  assert.ok(cheap > expensive, JSON.stringify({ cheap, expensive }));
});

test("Pacific villages get a small regional fishing and trading fleet", () => {
  const ports = [...PORTS, ...PACIFIC_PORTS];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });
  const pacificShips = routes.ships.filter((ship) => ship.profileId === "pacific-islands");

  assert.ok(pacificShips.length > 0);
  assert.ok(pacificShips.length <= 6);
  assert.ok(pacificShips.every((ship) => ship.slug === "polynesian-voyaging-canoe"));
  assert.ok(pacificShips.every((ship) => ship.cultureType === "polynesian"));
  assert.ok(routes.ships.filter((ship) => ship.currentPort?.cityType === "polynesian").every((ship) => ship.profileId === "pacific-islands"));
  assert.ok(routes.ports.filter((port) => port.routeRegion === "polynesia").length >= PACIFIC_PORTS.length);
  assert.ok(pacificShips.some((ship) => ship.role === NPC_ROLE_FISHERMAN));
  assert.ok(pacificShips.some((ship) => ship.role === NPC_ROLE_MERCHANT));
});

test("Mesoamerican ports get a sparse coastal fishing and trading fleet", () => {
  const ports = [...PORTS, ...MESOAMERICAN_PORTS];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });
  const nativeShips = routes.ships.filter((ship) => ship.profileId === "mesoamerican-coast");

  assert.ok(nativeShips.length > 0);
  assert.ok(nativeShips.length <= 5);
  assert.ok(nativeShips.every((ship) => ship.slug === "mesoamerican-dugout-canoe"));
  assert.ok(nativeShips.every((ship) => ship.cultureType === "mesoamerican"));
  assert.ok(routes.ships.filter((ship) => ship.currentPort?.cityType === "mesoamerican").every((ship) => ship.profileId === "mesoamerican-coast"));
  assert.ok(nativeShips.some((ship) => ship.role === NPC_ROLE_FISHERMAN));
  assert.ok(nativeShips.some((ship) => ship.role === NPC_ROLE_MERCHANT));
  assert.ok(nativeShips.every((ship) => ship.role !== NPC_ROLE_PIRATE));
});

test("NPC route snapshots restore ships, plans, and replacement queues without caches", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const lost = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT);
  sinkNpcShip(routes, lost.id, 1000);
  routes.pirateHideoutDangerUntil.set(PORTS[0].tileId, 5555);
  const snapshot = snapshotNpcSeaRouteSystem(routes);

  updateNpcSeaRouteSystem(routes, 2000);
  routes.pirateHideoutDangerUntil.clear();
  routes.routeCache.set("discard-me", []);
  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  assert.deepEqual(routes.ships, snapshot.ships);
  assert.deepEqual(routes.replacementQueue, snapshot.replacementQueue);
  assert.equal(routes.pirateHideoutDangerUntil.get(PORTS[0].tileId), 5555);
  assert.equal(routes.routeCache.size, 0);
  assert.equal(routes.shipById.size, routes.ships.length);
});

test("NPC traders only plan trade calls at friendly or neutral ports", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });

  for (let day = 0; day <= 180; day++) {
    const minute = day * 24 * 60;
    if (day > 0) {
      advanceWorldEconomy(economy, minute);
      updateNpcSeaRouteSystem(routes, minute);
    }
    for (const ship of routes.ships.filter((item) => (
      item.role === NPC_ROLE_MERCHANT || item.role === NPC_ROLE_FISHERMAN
    ))) {
      const plannedPorts = [ship.plan?.destination, ship.finalDestination].filter(Boolean);
      for (const plannedPort of plannedPorts) {
        assert.notEqual(
          diplomacyBetween(ship.factionId, plannedPort.factionId),
          DIPLOMACY_WAR,
          `${ship.id} planned a hostile call at ${plannedPort.city}`
        );
      }
    }
  }
});

test("NPC fishermen choose generated fishing grounds and deplete them offscreen", () => {
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy, fishState });

  assert.ok(routes.fishingGrounds.length > 0);
  const fisherman = routes.ships.find((ship) => (
    ship.role === NPC_ROLE_FISHERMAN &&
    ship.plan?.destination?.isFishingGround
  ));
  assert.ok(fisherman, "expected at least one fisherman bound for a generated fishing ground");
  const ground = fisherman.plan.destination;
  const stockBefore = Object.values(fishState.memory.fish.stocks)
    .find((stock) => stock.tileId === ground.habitat.tileId)?.population ?? ground.initialPopulation;
  const harvestedBefore = Object.values(fishState.memory.fish.stocks)
    .find((stock) => stock.tileId === ground.habitat.tileId)?.harvested ?? 0;

  updateNpcSeaRouteSystem(routes, Math.ceil(fisherman.plan.endMinute + 1));

  assert.equal(fisherman.currentPort.isFishingGround, true);
  assert.ok((fisherman.cargo.fish || 0) > 0);
  assert.ok((fisherman.cargo.fish || 0) <= npcFishingNetExpectedHaul(fisherman.fishingNetId));
  const stockAfter = Object.values(fishState.memory.fish.stocks)
    .find((stock) => stock.tileId === ground.habitat.tileId);
  assert.ok(stockAfter.harvested > harvestedBefore);
  assert.ok(stockAfter.population < stockAfter.capacity);
  assert.ok(Number.isFinite(stockBefore));
  assert.equal(fisherman.plan.destination.isFishingGround, undefined);
});

test("surrender transfers stores and grants protection until a safe port", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const loser = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT && cargoUnits(ship) > 0);
  const winner = routes.ships.find((ship) => ship.id !== loser?.id && ship.role === NPC_ROLE_PIRATE);
  assert.ok(loser);
  assert.ok(winner);

  const damage = damageNpcShip(routes, loser.id, loser.maxHitPoints - 1);
  assert.equal(damage.shouldSurrender, true);
  const loot = surrenderNpcShip(routes, loser.id, winner.id);
  assert.ok(loot.specie > 0);
  assert.ok(Object.keys(loot.cargo).length > 0);
  assert.equal(loser.specie, 0);
  assert.deepEqual(loser.cargo, {});
  assert.equal(npcShipHasCombatGrace(routes, loser.id), true);

  for (let day = 1; day <= 120 && npcShipHasCombatGrace(routes, loser.id); day++) {
    updateNpcSeaRouteSystem(routes, day * 24 * 60);
  }
  assert.equal(npcShipHasCombatGrace(routes, loser.id), false);
  assert.equal(loser.hitPoints, loser.maxHitPoints);
  assert.ok(loser.currentPort.factionId === loser.factionId || loser.currentPort.factionId === "neutral");
});

test("voluntary surrender preserves an undamaged hull", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const loser = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT && cargoUnits(ship) > 0);
  assert.ok(loser);
  const hullBefore = loser.hitPoints;

  surrenderNpcShip(routes, loser.id, null, { preserveHull: true });

  assert.equal(loser.hitPoints, hullBefore);
  assert.equal(npcShipHasCombatGrace(routes, loser.id), true);
});

test("NPC hull damage preserves half-point arrow hits", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const target = routes.ships[0];
  const before = target.hitPoints;

  const damage = damageNpcShip(routes, target.id, 0.5);

  assert.equal(damage.hitPoints, before - 0.5);
  assert.equal(target.hitPoints, before - 0.5);
});

test("sunk NPC ships are replaced after a rare shipyard delay", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const originalCount = routes.ships.length;
  const lost = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT);
  assert.ok(lost);
  const originalRole = lost.role;
  const originalFaction = lost.factionId;

  const damage = damageNpcShip(routes, lost.id, lost.maxHitPoints);
  assert.equal(damage.sunk, true);
  assert.equal(damage.shouldSurrender, false);
  const sinking = sinkNpcShip(routes, lost.id, 1000);

  assert.equal(routes.ships.length, originalCount - 1);
  assert.equal(routes.shipById.has(lost.id), false);
  assert.equal(routes.replacementQueue.length, 1);
  assert.ok(sinking.delayDays >= 90);
  assert.ok(sinking.delayDays <= 700);

  const stepMinutes = 7 * 24 * 60;
  for (let minute = stepMinutes; minute < sinking.replacement.readyMinute; minute += stepMinutes) {
    updateNpcSeaRouteSystem(routes, minute);
  }
  updateNpcSeaRouteSystem(routes, sinking.replacement.readyMinute - 1);
  assert.equal(routes.shipById.has(lost.id), false);
  updateNpcSeaRouteSystem(routes, sinking.replacement.readyMinute);
  const replacement = routes.shipById.get(lost.id);
  assert.ok(replacement);
  assert.equal(routes.ships.length, originalCount);
  assert.equal(replacement.role, originalRole);
  assert.equal(replacement.factionId, originalFaction);
  assert.equal(replacement.hitPoints, replacement.maxHitPoints);
  assert.equal(routes.replacementQueue.length, 0);
});

test("pirate hideouts are a deterministic invisible subset of coastal ports", () => {
  const first = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy: createWorldEconomy({ ports: PORTS, startMinute: 0 })
  });
  const second = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy: createWorldEconomy({ ports: PORTS, startMinute: 0 })
  });
  const firstIds = first.pirateHideouts.map((port) => port.tileId);

  assert.deepEqual(firstIds, second.pirateHideouts.map((port) => port.tileId));
  assert.equal(firstIds.length, 2);
  assert.ok(firstIds.every((tileId) => first.ports.some((port) => port.tileId === tileId)));
  assert.ok(first.ports.every((port) => !("pirateHideout" in port)));
  assert.ok(first.pirateHideouts.every((port) => !npcPortHasMajorProtection(port)));
});

test("pirates keep their origins and planned calls away from major ports", () => {
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy: createWorldEconomy({ ports: PORTS, startMinute: 0 })
  });
  const pirates = routes.ships.filter((ship) => ship.role === NPC_ROLE_PIRATE);

  assert.ok(pirates.length > 0);
  for (const pirate of pirates) {
    assert.equal(npcPortHasMajorProtection(pirate.currentPort), false, pirate.id);
    assert.equal(npcPortHasMajorProtection(pirate.plan.destination), false, pirate.id);
  }
});

test("damaged pirates hide, remain concealed near threats, and reappear repaired", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const pirate = routes.ships.find((ship) => ship.role === NPC_ROLE_PIRATE && !ship.hiddenAtHideout);
  assert.ok(pirate);
  damageNpcShip(routes, pirate.id, pirate.maxHitPoints);

  let minute = 0;
  for (let day = 1; day <= 720 && !pirate.hiddenAtHideout; day++) {
    minute = day * 24 * 60;
    advanceWorldEconomy(economy, minute);
    updateNpcSeaRouteSystem(routes, minute);
  }
  assert.equal(pirate.hiddenAtHideout, true);
  assert.ok(routes.pirateHideouts.some((port) => port.tileId === pirate.currentPort.tileId));
  assert.equal(npcShipSnapshots(routes, minute).find((snapshot) => snapshot.id === pirate.id)?.hidden, true);

  minute = Math.max(minute, Math.ceil(pirate.hiddenUntilMinute + 1));
  updateNpcPirateHideoutPlayerThreat(routes, {
    lat: pirate.currentPort.lat,
    lon: pirate.currentPort.lon,
    clockMinutes: minute
  });
  updateNpcSeaRouteSystem(routes, minute);
  assert.equal(pirate.hiddenAtHideout, true);

  for (let day = 1; day <= 120 && pirate.hiddenAtHideout; day++) {
    minute += 24 * 60;
    advanceWorldEconomy(economy, minute);
    updateNpcSeaRouteSystem(routes, minute);
  }
  assert.equal(pirate.hiddenAtHideout, false);
  assert.equal(pirate.hitPoints, pirate.maxHitPoints);
  const emerged = npcShipSnapshots(routes, minute).find((snapshot) => snapshot.id === pirate.id);
  assert.ok(emerged && !emerged.hidden);
});

function cargoUnits(ship) {
  return Object.entries(ship.cargo).reduce((total, [goodId, quantity]) => (
    total + tradeGoodById(goodId).unitSize * quantity
  ), 0);
}

function port(tileId, city, country, cityType, lat, lon, population, factionId) {
  return {
    tileId,
    city,
    displayCity: city,
    country,
    cityType,
    lat,
    lon,
    population,
    factionId
  };
}
