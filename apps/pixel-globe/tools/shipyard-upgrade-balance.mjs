// Paired counterfactual yards isolate upgrade earnings from the base business.
// Storage: port supplies arrive every six months. Commission: one paid material
// shipment per month, cycling through all four goods; no free materials or sales.
import { pathToFileURL } from "node:url";
import { createWorldShipyards, fundPlayerShipyard, advanceWorldShipyards,
  claimPlayerShipyardPayout, purchaseShipyardUpgrade, shipyardMaterialStockTargets,
  receiveCommissionedShipyardMaterials } from "../src/shipyards.js";
import { shipyardUpgradeOffers } from "../src/shipyardUpgrades.js";
import { tradeGoodById } from "../src/economy.js";
const CITY = { cityId: "lisbon|portugal", tileId: 1, city: "Lisbon", cityType: "mediterranean",
  population: 100000, lat: 38.72, lon: -9.14, factionId: "portugal" };
export function shipyardUpgradeBalance(upgradeId, { years = 5, seeds = 12 } = {}) {
  const differences = [];
  let price;
  for (let seed = 0; seed < seeds; seed++) {
    const earnings = [];
    for (const upgraded of [false, true]) {
      const system = createWorldShipyards({ ports: [CITY], startMinute: 0, seedKey: `upgrade-roi-${seed}` });
      const yard = fundPlayerShipyard(system, CITY, { investedMinute: 0, seedCapital: 100000,
        materialContributions: { timber: 20, iron: 12, "naval-stores": 10 } });
      price = shipyardUpgradeOffers(yard, 1000000, 0).find(offer => offer.id === upgradeId).cost;
      if (upgraded) {
        yard.upgrades.opportunities[upgradeId].availableMinute = 0;
        if (upgradeId === "supply-ship") yard.upgrades.supplyCandidateShipId = "balance:merchant";
        purchaseShipyardUpgrade(yard, { doubloons: 1000000 }, upgradeId, 0);
      }
      for (let month = 1; month <= years * 12; month++) {
        const minute = month * 30 * 1440;
        advanceWorldShipyards(system, minute, {
          available: () => upgradeId === "shipwright" || month % 6 === 0 ? 100000 : 0,
          consume() {}
        });
        if (upgraded && upgradeId === "supply-ship") {
          const targets = shipyardMaterialStockTargets(yard);
          const goodId = Object.keys(targets)[(month - 1) % 4];
          const quantity = Math.max(0, Math.floor(targets[goodId] - yard.materialInventory[goodId]));
          if (quantity > 0) receiveCommissionedShipyardMaterials(yard, {
            goodId, quantity, cost: quantity * tradeGoodById(goodId).basePrice, minute
          });
        }
        claimPlayerShipyardPayout(system, CITY);
      }
      earnings.push(yard.playerAccounts.playerPayouts);
    }
    differences.push(earnings[1] - earnings[0]);
  }
  return { upgradeId, years, seeds, price, minAdditionalDividends: Math.min(...differences),
    meanAdditionalDividends: Math.round(differences.reduce((sum, value) => sum + value, 0) / seeds),
    maxAdditionalDividends: Math.max(...differences) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const upgradeId of ["storage", "shipwright", "supply-ship"]) console.log(JSON.stringify(shipyardUpgradeBalance(upgradeId)));
}
