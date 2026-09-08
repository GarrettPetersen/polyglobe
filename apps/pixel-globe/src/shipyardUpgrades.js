export const SHIPYARD_UPGRADE_IDS = Object.freeze(["storage", "shipwright", "supply-ship"]);
export const MAX_SHIPYARD_STORAGE_LEVEL = 5;

export function createShipyardUpgrades() {
  return { storageLevel: 0, investmentCost: 0, expertFromBuildNumber: null, supplyCommission: null, supplyCandidateShipId: null, supplyCaptainIdentity: null, opportunities: Object.fromEntries(SHIPYARD_UPGRADE_IDS.map((id) => [id, { availableMinute: null, announced: false }])) };
}

export function validateShipyardUpgrades(upgrades) {
  if (!upgrades || !Number.isInteger(upgrades.investmentCost) || upgrades.investmentCost < 0 || !Number.isInteger(upgrades.storageLevel) || upgrades.storageLevel < 0 ||
      upgrades.storageLevel > MAX_SHIPYARD_STORAGE_LEVEL ||
      (upgrades.expertFromBuildNumber !== null &&
        (!Number.isInteger(upgrades.expertFromBuildNumber) || upgrades.expertFromBuildNumber < 1))) {
    throw new Error("Invalid shipyard upgrades");
  }
  for (const id of SHIPYARD_UPGRADE_IDS) {
    const opportunity = upgrades.opportunities?.[id];
    if (!opportunity || (opportunity.availableMinute !== null && !Number.isFinite(opportunity.availableMinute)) || typeof opportunity.announced !== "boolean") throw new Error(`Invalid shipyard opportunity: ${id}`);
  }
  if (upgrades.supplyCandidateShipId !== null && (typeof upgrades.supplyCandidateShipId !== "string" || upgrades.supplyCandidateShipId === "")) throw new Error("Invalid earmarked supply ship");
  const captain = upgrades.supplyCaptainIdentity;
  if (captain !== null && (!captain || typeof captain.id !== "string" || !captain.id ||
      typeof captain.name !== "string" || !captain.name)) throw new Error("Invalid shipyard supply captain identity");
  const commission = upgrades.supplyCommission;
  if (commission !== null && (!commission || !["active", "lost"].includes(commission.status) ||
      !Number.isFinite(commission.purchasedMinute) || commission.purchasedMinute < 0 ||
      (typeof commission.shipId !== "string" || commission.shipId === "") ||
      (commission.supplyGoodId !== null && (typeof commission.supplyGoodId !== "string" || commission.supplyGoodId === "")) ||
      (commission.status === "active" && upgrades.supplyCandidateShipId !== null) ||
      (commission.status === "lost" ? !Number.isFinite(commission.lostMinute) || commission.lostMinute < commission.purchasedMinute : commission.lostMinute !== null))) {
    throw new Error("Invalid shipyard supply commission");
  }
  return upgrades;
}

export function shipyardUpgradeOffers(yard, doubloons, minute) {
  if (!Number.isFinite(minute)) throw new Error("Shipyard offers require a clock minute");
  if (!yard?.playerBacking) throw new Error("Shipyard upgrades require a player-backed yard");
  if (!Number.isFinite(doubloons) || doubloons < 0) throw new Error("Invalid shipyard upgrade funds");
  const upgrades = validateShipyardUpgrades(yard.upgrades);
  const commission = upgrades.supplyCommission;
  return [
    { id: "storage", iconId: "good:timber", label: "Expanded storage",
      explanation: "A warehouse beside the yard is for sale. We can buy it to hold more of our building supplies.",
      description: "50% more supply storage per level.",
      cost: 5000,
      status: `Storage level ${upgrades.storageLevel}/${MAX_SHIPYARD_STORAGE_LEVEL}`,
      owned: upgrades.storageLevel === MAX_SHIPYARD_STORAGE_LEVEL },
    { id: "shipwright", iconId: "action:passenger", label: "Expert shipwright",
      explanation: "An accomplished shipwright is seeking a new berth. With him at the slips, we could build finer vessels.",
      description: "Larger, better ships; 25% faster construction from the next hull.",
      cost: 20000, status: upgrades.expertFromBuildNumber === null ? "Not hired" : "Employed",
      owned: upgrades.expertFromBuildNumber !== null },
    { id: "supply-ship", iconId: "action:shipyard", label: "Commissioned supply ship",
      explanation: "The merchants are taking commissions. We can retain a captain to keep our yard supplied, paying for his cargo as it arrives.",
      description: "Brings supplies by sea. One-time hire; cargo costs extra. Replace the commission if the ship is lost.",
      cost: 12000,
      status: commission === null ? "Not commissioned" : commission.status === "lost" ? "Supply ship lost. A new commission is required."
          : "Supply ship on commission.",
      owned: commission !== null && commission.status !== "lost" }
  ].map((offer) => {
    const opportunity = upgrades.opportunities[offer.id];
    const available = opportunity.availableMinute !== null && minute >= opportunity.availableMinute &&
      (offer.id !== "supply-ship" || upgrades.supplyCandidateShipId !== null);
    const visible = available || offer.owned || (offer.id === "storage" && upgrades.storageLevel > 0) ||
      (offer.id === "supply-ship" && commission !== null);
    return Object.freeze({ ...offer, available, visible, disabled: offer.owned || !available || doubloons < offer.cost });
  });
}

export function applyShipyardUpgradePurchase(yard, gameState, upgradeId, minute) {
  if (!Number.isFinite(minute)) throw new Error("Shipyard upgrade requires a clock minute");
  const offer = shipyardUpgradeOffers(yard, gameState.doubloons, minute).find((entry) => entry.id === upgradeId);
  if (!offer || offer.disabled) throw new Error(`Shipyard upgrade is unavailable: ${yard.portId}/${upgradeId}`);
  if (upgradeId === "storage") yard.upgrades.storageLevel++;
  else if (upgradeId === "shipwright") yard.upgrades.expertFromBuildNumber = yard.buildNumber + 2;
  else yard.upgrades.supplyCommission = {
    status: "active", purchasedMinute: minute, shipId: yard.upgrades.supplyCandidateShipId, lostMinute: null, supplyGoodId: null
  };
  if (upgradeId === "supply-ship") yard.upgrades.supplyCandidateShipId = null;
  const opportunity = yard.upgrades.opportunities[upgradeId];
  opportunity.announced = false;
  opportunity.availableMinute = upgradeId === "storage" && yard.upgrades.storageLevel < MAX_SHIPYARD_STORAGE_LEVEL
    ? minute + (60 + opportunityRoll(yard, `storage:${yard.upgrades.storageLevel}`) * 120) * 1440 : null;
  yard.upgrades.investmentCost += offer.cost;
  gameState.doubloons -= offer.cost;
  return offer;
}

// Commission ownership lives in the yard, so sinking a ship or restoring its
// ordinary merchant replacement cannot silently transfer the paid contract.
const commissionIndexes = new WeakMap();

export function invalidateSupplyCommissionIndex(shipyards) {
  commissionIndexes.delete(shipyards);
}

export function reservedSupplyShipyard(shipyards, shipId) {
  if (!commissionIndexes.has(shipyards)) {
    const index = new Map();
    for (const yard of shipyards.yards.values()) {
      const commission = yard.upgrades.supplyCommission;
      const reservedId = commission?.status === "active" ? commission.shipId : yard.upgrades.supplyCandidateShipId;
      if (reservedId === null) continue;
      if (index.has(reservedId)) throw new Error(`Ship has duplicate commissions: ${reservedId}`);
      index.set(reservedId, yard);
    }
    commissionIndexes.set(shipyards, index);
  }
  return commissionIndexes.get(shipyards).get(shipId) || null;
}

function opportunityRoll(yard, key) {
  let hash = 2166136261;
  for (const char of `${yard.seedKey}|${yard.portId}|${key}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967296;
}

export function scheduleInitialShipyardUpgrades(yard, minute) {
  for (const [index, id] of SHIPYARD_UPGRADE_IDS.entries()) {
    yard.upgrades.opportunities[id] = {
      availableMinute: minute + (30 + index * 60 + opportunityRoll(yard, id) * 60) * 1440,
      announced: false
    };
  }
}

export function unannouncedShipyardUpgrades(yard, minute) {
  if (!yard.playerBacking) return [];
  return shipyardUpgradeOffers(yard, 0, minute).filter((offer) =>
    offer.available && !offer.owned && !yard.upgrades.opportunities[offer.id].announced);
}

export function commissionedShipyard(shipyards, shipId) {
  const yard = reservedSupplyShipyard(shipyards, shipId);
  return yard?.upgrades.supplyCommission?.status === "active" && yard.upgrades.supplyCommission.shipId === shipId ? yard : null;
}
