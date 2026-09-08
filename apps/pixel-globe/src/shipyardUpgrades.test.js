import { purchaseShipyardUpgrade } from "./shipyards.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorldShipyards, fundPlayerShipyard, generateShipyardListing,
  shipConstructionPrice, shipyardMaterialStockTargets, snapshotWorldShipyards,
  restoreWorldShipyards, advanceWorldShipyards, claimPlayerShipyardPayout,
  receiveCommissionedShipyardMaterials, shipbuildingMaterialRequirements,
  shipyardCurrentBuild, playerShipyardLedger
} from "./shipyards.js";
import { tradeGoodById } from "./economy.js";
import {
  shipyardUpgradeOffers, unannouncedShipyardUpgrades,
  validateShipyardUpgrades
} from "./shipyardUpgrades.js";

const LISBON = { cityId: "lisbon|portugal", tileId: 1, city: "Lisbon", cityType: "mediterranean",
  population: 100000, lat: 38.72, lon: -9.14, factionId: "portugal" };
const MATERIALS = { timber: 20, iron: 12, "naval-stores": 10 };
function fixture(seedKey = "upgrade-test") {
  const system = createWorldShipyards({ ports: [LISBON], startMinute: 0, seedKey });
  const yard = fundPlayerShipyard(system, LISBON, { investedMinute: 0, seedCapital: 100000,
    materialContributions: MATERIALS });
  return { system, yard, player: { doubloons: 1000000 } };
}

test("upgrade opportunities are staggered, deterministic, saved, and announced once", () => {
  const { system, yard } = fixture();
  assert.ok(shipyardUpgradeOffers(yard, 1000000, 0).every((offer) => offer.disabled));
  assert.deepEqual(yard.upgrades, fixture().yard.upgrades);
  assert.notDeepEqual(yard.upgrades.opportunities, fixture("different-voyage").yard.upgrades.opportunities);
  const offerMinute = yard.upgrades.opportunities.storage.availableMinute;
  assert.equal(unannouncedShipyardUpgrades(yard, offerMinute - 1).length, 0);
  assert.deepEqual(unannouncedShipyardUpgrades(yard, offerMinute).map((offer) => offer.id), ["storage"]);
  yard.upgrades.opportunities.storage.announced = true;
  assert.equal(unannouncedShipyardUpgrades(yard, offerMinute).length, 0);
  const snapshot = snapshotWorldShipyards(system);
  const restored = fixture().system;
  restoreWorldShipyards(restored, JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(snapshotWorldShipyards(restored), snapshot);
  assert.equal(unannouncedShipyardUpgrades(restored.yards.get(LISBON.cityId), offerMinute).length, 0);
});

test("storage expansions add capacity in levels and cannot be bought again before another offer", () => {
  const { yard, player } = fixture();
  const base = shipyardMaterialStockTargets(yard);
  for (let level = 1; level <= 5; level++) {
    const minute = yard.upgrades.opportunities.storage.availableMinute;
    const beforeFunds = player.doubloons;
    purchaseShipyardUpgrade(yard, player, "storage", minute);
    assert.equal(beforeFunds - player.doubloons, 15000 * level);
    const capacity = shipyardMaterialStockTargets(yard);
    for (const goodId of Object.keys(base)) {
      const originalTotal = base[goodId] + yard.materialConsumedForBuild[goodId];
      assert.ok(Math.abs(capacity[goodId] + yard.materialConsumedForBuild[goodId] - originalTotal * (1 + level * 0.5)) < 1e-9);
    }
    assert.throws(() => purchaseShipyardUpgrade(yard, player, "storage", minute), /unavailable/);
  }
  assert.equal(yard.upgrades.storageLevel, 5);
  assert.equal(yard.upgrades.opportunities.storage.availableMinute, null);
});

test("expert shipwright preserves the current hull and eliminates small future hulls", () => {
  const { yard, player } = fixture();
  const current = generateShipyardListing(yard, yard.buildNumber + 1, yard.nextBuildMinute);
  const baseline = Array.from({ length: 500 }, (_, i) => shipConstructionPrice(generateShipyardListing(yard, i + 2, 0).shipSlug));
  const minute = yard.upgrades.opportunities.shipwright.availableMinute;
  purchaseShipyardUpgrade(yard, player, "shipwright", minute);
  assert.deepEqual(generateShipyardListing(yard, yard.buildNumber + 1, yard.nextBuildMinute), current);
  const upgraded = baseline.map((_, i) => shipConstructionPrice(generateShipyardListing(yard, i + 2, 0).shipSlug));
  assert.ok(Math.min(...upgraded) > Math.min(...baseline));
  assert.ok(upgraded.reduce((a, b) => a + b) > baseline.reduce((a, b) => a + b));
  assert.throws(() => purchaseShipyardUpgrade(yard, player, "shipwright", minute), /unavailable/);
});

test("a commission cannot be sold without an earmarked ship or sufficient funds", () => {
  const { yard, player } = fixture();
  const minute = yard.upgrades.opportunities["supply-ship"].availableMinute;
  assert.throws(() => purchaseShipyardUpgrade(yard, player, "supply-ship", minute), /unavailable/);
  assert.equal(player.doubloons, 1000000);
  yard.upgrades.supplyCandidateShipId = "merchant:reserved";
  assert.throws(() => purchaseShipyardUpgrade(yard, { doubloons: 39999 }, "supply-ship", minute), /unavailable/);
  purchaseShipyardUpgrade(yard, player, "supply-ship", minute);
  assert.equal(yard.upgrades.supplyCommission.shipId, "merchant:reserved");
  assert.equal(yard.upgrades.supplyCommission.status, "active");
  assert.equal(yard.upgrades.supplyCandidateShipId, null);
  assert.throws(() => purchaseShipyardUpgrade(yard, player, "supply-ship", minute), /unavailable/);
  assert.throws(() => validateShipyardUpgrades({ ...yard.upgrades, storageLevel: -1 }), /Invalid/);
});

test("commission invoices replace budgeted materials instead of charging twice", () => {
  const { system, yard } = fixture();
  yard.listing = null;
  yard.buildStartedMinute = 0;
  yard.nextBuildMinute = 100;
  const hull = shipyardCurrentBuild(yard, 0).shipSlug;
  const requirements = shipbuildingMaterialRequirements(hull);
  for (const goodId of Object.keys(requirements)) {
    yard.materialInventory[goodId] = 0;
    yard.materialConsumedForBuild[goodId] = 0;
    yard.prepaidMaterialInventory[goodId] = 0;
    yard.prepaidMaterialsForBuild[goodId] = 0;
    if (requirements[goodId] > 0) receiveCommissionedShipyardMaterials(yard, {
      goodId, quantity: requirements[goodId], cost: 100, minute: 0
    });
  }
  const paid = yard.playerAccounts.constructionExpenses;
  const labor = playerShipyardLedger(yard, 0).currentBuild.costBreakdown.laborCost;
  advanceWorldShipyards(system, 100.000001);
  assert.equal(yard.buildNumber, 1);
  assert.equal(yard.playerAccounts.constructionExpenses, paid + labor);
  assert.ok(Object.values(yard.prepaidMaterialsForBuild).every((quantity) => quantity === 0));
});

test("well-supplied major-port yards repay capital and founding materials within five game years", () => {
  const initialInvestment = 100000 + Object.entries(MATERIALS).reduce((sum, [id, quantity]) =>
    sum + tradeGoodById(id).basePrice * quantity, 0);
  for (let seed = 0; seed < 12; seed++) {
    const { system, yard } = fixture(`profitability-${seed}`);
    for (let day = 30; day <= 365 * 5; day += 30) {
      advanceWorldShipyards(system, day * 1440, { available: () => 100000, consume() {} });
      claimPlayerShipyardPayout(system, LISBON);
    }
    assert.ok(yard.playerAccounts.playerPayouts >= initialInvestment,
      `${seed}: ${yard.playerAccounts.playerPayouts} repaid of ${initialInvestment}`);
    assert.ok(playerShipyardLedger(yard, system.lastMinute).accounts.cashBalance >= 0);
  }
});

test("every enabled upgrade-screen action satisfies its mutation preconditions", async () => {
  const { createWorldEconomy, fundWorldEconomyShipyard } = await import("./economy.js");
  const { createGameState } = await import("./gameState.js");
  const { createPortDialogueSession, portDialogueView, selectPortDialogueOption } = await import("./dialogueSystem.js");
  const { shipStatsForSlug } = await import("./shipStats.js");
  const city = { ...LISBON, displayCity: "Lisbon", country: "Portugal", settlementType: "city",
    character: { name: "Fernao da Cunha", role: "harbour-master" } };
  function scene(ready, balance, selection) {
    const stats = shipStatsForSlug("fishing-lugger");
    const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
    state.doubloons = balance;
    state.memory.shipyardInvestment.backedPortCityIds.push(city.cityId);
    const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
    const yard = fundWorldEconomyShipyard(economy, city, { investedMinute: 0,
      seedCapital: 100000, materialContributions: MATERIALS });
    if (ready) for (const opportunity of Object.values(yard.upgrades.opportunities)) opportunity.availableMinute = 0;
    const session = createPortDialogueSession(city, { initialNodeId: "shipyard", admittedToPort: true, shipyardLedgerTab: "upgrades" });
    session.shipyardUpgradeSelection = selection;
    return { state, economy, session, context: { shipyard: yard, shipStats: stats, simMinute: 0, portCities: [city] } };
  }
  for (const ready of [false, true]) for (const balance of [0, 200000]) for (const selection of ["storage", "shipwright", "supply-ship"]) {
    const baseline = scene(ready, balance, selection);
    const options = portDialogueView(baseline.session, city, baseline.state, baseline.economy, [city], baseline.context).options;
    for (let index = 0; index < options.length; index++) {
      const subject = scene(ready, balance, selection);
      const act = () => selectPortDialogueOption(subject.session, city, subject.state, subject.economy, [city], index, subject.context);
      if (options[index].disabled) {
        const before = structuredClone(subject.context.shipyard);
        const funds = subject.state.doubloons;
        act();
        assert.deepEqual(subject.context.shipyard, before);
        assert.equal(subject.state.doubloons, funds);
      } else assert.doesNotThrow(act, `${ready}/${balance}/${selection}/${options[index].action.type}`);
    }
  }
});

test("saved commission contracts reject invalid cargo and contradictory ownership", () => {
  const { system, yard, player } = fixture();
  const minute = yard.upgrades.opportunities["supply-ship"].availableMinute;
  yard.upgrades.supplyCandidateShipId = "merchant:reserved";
  purchaseShipyardUpgrade(yard, player, "supply-ship", minute);
  for (const mutate of [
    (upgrades) => { upgrades.supplyCommission.supplyGoodId = undefined; },
    (upgrades) => { upgrades.supplyCandidateShipId = "merchant:second"; },
    (upgrades) => { upgrades.supplyCommission.status = "lost"; upgrades.supplyCommission.lostMinute = minute - 1; }
  ]) {
    const invalid = structuredClone(yard.upgrades);
    mutate(invalid);
    assert.throws(() => validateShipyardUpgrades(invalid), /Invalid shipyard supply commission/);
  }
  const snapshot = snapshotWorldShipyards(system);
  snapshot.yards[0].upgrades.supplyCommission.supplyGoodId = "grain";
  assert.throws(() => restoreWorldShipyards(fixture().system, snapshot), /Invalid shipyard supply material/);
});

test("upgrade screens reveal only current offers and the owner's existing investments", () => {
  const { yard, player } = fixture();
  const visible = (minute) => shipyardUpgradeOffers(yard, player.doubloons, minute).filter((offer) => offer.visible).map((offer) => offer.id);
  assert.deepEqual(visible(0), []);
  const minute = yard.upgrades.opportunities.storage.availableMinute;
  assert.deepEqual(visible(minute), ["storage"]);
  purchaseShipyardUpgrade(yard, player, "storage", minute);
  assert.deepEqual(visible(minute), ["storage"], "owned storage stays visible while the next expansion is unavailable");
  yard.upgrades.supplyCommission = { status: "lost", purchasedMinute: 0, shipId: "merchant:lost", lostMinute: minute, supplyGoodId: null };
  assert.deepEqual(visible(minute), ["storage", "supply-ship"], "a lost commission remains visible so its loss is explained");
});
