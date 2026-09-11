import { portIndustrialInputNeeds, portMarket, tradeGoodById } from "./economy.js";

export function createWorkshopSupplyOffer(economy, city, portCities, {offerPeriod, sailingDistanceKm}) {
  const needs = portIndustrialInputNeeds(economy, city);
  const sources = portCities.filter(port => port.cityId !== city.cityId && !port.isPirateHideout)
    .map(port => ({port, distanceKm: sailingDistanceKm(city, port)}))
    .filter(entry => entry.distanceKm !== null && entry.distanceKm > 0 && entry.distanceKm <= 1500)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.port.cityId.localeCompare(b.port.cityId));
  for (const {port, distanceKm} of sources) {
    const market = portMarket(economy, port);
    for (const need of needs) {
      const good = tradeGoodById(need.goodId);
      const quantity = Math.min(need.missing, Math.max(1, Math.floor(12 / good.unitSize)));
      const row = market.find(row => row.good.id === good.id);
      if (!row?.listedForSale || row.stock < quantity) continue;
      const outputGoodId = need.outputGoodIds[0];
      const output = tradeGoodById(outputGoodId);
      const local = portMarket(economy, city).find(row => row.good.id === good.id);
      const reward = Math.ceil(quantity * Math.max(row.buyPrice * 1.5, local.sellPrice * 1.2));
      if (economy.portStates.get(city.cityId).specie < reward) continue;
      const cityName = city.displayCity || city.city;
      const sourceName = port.displayCity || port.city;
      return {
        id: `workshop-supply:${city.cityId}:${offerPeriod}:${good.id}`, kind: "delivery",
        scenarioId: "workshop-supply", passenger: null, onboarding: false, offerPeriod,
        originKey: city.cityId, originCityId: city.cityId, originTileId: city.tileId,
        originName: cityName, originCountry: city.country || "", factionId: city.factionId,
        destinationKey: city.cityId, destinationCityId: city.cityId, destinationTileId: city.tileId,
        destinationName: cityName, destinationCountry: city.country || "", distanceKm: 0, reward,
        cargoLabel: `${good.label.toLowerCase()} x${quantity}`,
        procurement: {goodId: good.id, quantity, outputGoodId, sourceCityId: port.cityId},
        offerText: `My workshop makes ${output.label.toLowerCase()}, but we are short of ${good.label.toLowerCase()}. ` +
          `Bring me ${quantity} measures and I will pay ${reward} doubloons, above the usual price. ` +
          `Try ${sourceName}, about ${Math.round(distanceKm)} km by sea. Buy elsewhere if you prefer; it is the material I need.`,
        completionText: `Good. With this, my people can get back to making ${output.label.toLowerCase()}.`
      };
    }
  }
  return null;
}

export function validateWorkshopSupplyQuest(quest) {
  if (!quest?.procurement) return;
  const order = quest.procurement;
  if (quest.kind !== "delivery" || quest.scenarioId !== "workshop-supply" ||
      quest.originCityId !== quest.destinationCityId ||
      !Number.isInteger(order.quantity) || order.quantity <= 0 ||
      typeof order.sourceCityId !== "string" || !order.sourceCityId ||
      !Number.isInteger(quest.reward) || quest.reward <= 0) throw new Error(`Invalid workshop order: ${quest.id}`);
  tradeGoodById(order.goodId);
  tradeGoodById(order.outputGoodId);
}

export function workshopSupplyReady(state, quest) {
  validateWorkshopSupplyQuest(quest);
  return (state.cargo[quest.procurement.goodId] || 0) >= quest.procurement.quantity;
}
