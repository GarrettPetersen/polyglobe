import { factionById } from "./factions.js";
import { IMPERIAL_CITY_REFERENCES, imperialEstateForFaction } from "./imperialEstates.js";
import { imperialMissionKind } from "./imperialMissions.js";
import { rulerAtMinute } from "./rulers.js";

export const IMPERIAL_ELECTION_ENVOY_QUEST_KIND = "imperial-election-envoy";

const ELECTORAL_COLLEGE_CITY_ID = IMPERIAL_CITY_REFERENCES.COLOGNE.id;

export function isImperialElectionEnvoyQuest(quest) {
  return quest?.kind === IMPERIAL_ELECTION_ENVOY_QUEST_KIND &&
    typeof quest.imperialElectionId === "string";
}

export function imperialElectionMissionPlanForCity(imperial, city, portCities, simMinute) {
  if (!imperial?.pendingElection || !city || !Array.isArray(portCities)) return null;
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Imperial election mission requires a valid minute: ${simMinute}`);
  }
  const pending = imperial.pendingElection;
  if (simMinute < pending.convenedMinute || simMinute >= pending.electionMinute) return null;
  const estate = imperialEstateForFaction(city.factionId);
  if (!estate?.electorId || estate.electorId !== city.factionId) return null;
  if (city.cityId !== estate.cityIds[0]) return null;
  const destinations = portCities.filter((port) => port.cityId === ELECTORAL_COLLEGE_CITY_ID);
  if (destinations.length !== 1) {
    throw new Error(
      `Imperial election mission requires exactly one canonical Cologne port; found ${destinations.length}`
    );
  }
  const destination = destinations[0];
  const ruler = rulerAtMinute(city.factionId, simMinute);
  if (!ruler) throw new Error(`Imperial elector has no ruler: ${city.factionId}`);
  return Object.freeze({
    id: `${IMPERIAL_ELECTION_ENVOY_QUEST_KIND}-${pending.id}-${city.factionId}`,
    electionId: pending.id,
    office: pending.office,
    electionMinute: pending.electionMinute,
    origin: city,
    destination,
    electorFactionId: city.factionId,
    electorName: factionById(city.factionId).shortName,
    ruler,
    missionKind: imperialMissionKind("election-instructions")
  });
}

export function imperialElectionMissionStillValid(imperial, quest) {
  if (!isImperialElectionEnvoyQuest(quest)) return true;
  return imperial?.pendingElection?.id === quest.imperialElectionId;
}

export function imperialElectionMissionDialogue(plan, reward) {
  const officeLabel = plan.office === "king-of-romans"
    ? "King of the Romans"
    : "Roman Emperor";
  const home = plan.origin.city;
  const destination = plan.destination.city;
  return Object.freeze({
    offer: `${plan.ruler.displayName} has sealed instructions for the election of a ${officeLabel}. Carry me to ${destination} and home for ${reward} db. My prince alone chooses; your duty is only our passage.`,
    underway: `My prince's instructions remain under seal. I shall present them at ${destination}; neither of us may change his vote.`,
    negotiationOpening: `I present my prince's letters of authority and sealed instructions. The captain brought me faithfully and has no voice in this council.`,
    negotiation: `The chancery has received the instructions and sealed its receipt. The electors will judge the candidates; carry me and the receipt home.`,
    returnUnderway: `The sealed receipt is safe. Set course for ${home}; the electoral college will decide without us.`,
    homecoming: `${plan.ruler.displayName} has received the chancery's sealed receipt. The treasury pays ${reward} db for your passage.`,
    intercession: `Hold your fire! I am an elector's accredited envoy carrying sealed instructions to the electoral college.`
  });
}
