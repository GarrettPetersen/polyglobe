import {
  religionById,
  religionCandidatesForHome
} from "./characterReligion.js";
import { greatCircleDistanceKm } from "./worldDistance.js";

export const RELIGIOUS_PASSENGER_SCENARIO_CHANCE = 0.45;
export const RELIGIOUS_PASSENGER_MIN_DISTANCE_KM = 250;
export const RELIGIOUS_PASSENGER_MAX_DISTANCE_KM = 8000;

const PROTESTANT_RELIGIONS = Object.freeze([
  "lutheran",
  "reformed-protestant"
]);
const MUSLIM_RELIGIONS = Object.freeze(["sunni-islam", "shia-islam", "ibadi-islam"]);
const BUDDHIST_RELIGIONS = Object.freeze([
  "theravada-buddhism",
  "mahayana-buddhism",
  "tibetan-buddhism",
  "kami-buddhist"
]);

// These are voyage-scale expressions of documented religious networks around 1522:
// printed Reformation texts, responsa, endowment deeds, itinerant monks, temple
// patronage, Guru Nanak's new Kartarpur community, and oceanic ritual diplomacy.
export const RELIGIOUS_MISSION_CATALOG = Object.freeze([
  religiousMission({
    id: "reformation-printing",
    title: "Words in the Vernacular",
    passengerReligionIds: ["lutheran"],
    participantReligionIds: PROTESTANT_RELIGIONS,
    destinationCityTypes: ["northern-european"],
    roleLabel: "preacher",
    preferClergy: true,
    bonusDoubloons: 90,
    offer: ({ destinationName, reward }) =>
      `Wittenberg's presses have made every pulpit a frontier. I carry vernacular sermons and newly printed Scripture for readers in ${destinationName}. Give me safe passage and I can pay ${reward} db.`,
    underway: ({ destinationName }) =>
      `Printers can make more copies than bishops can seize. If these sheets reach ${destinationName}, ordinary readers will judge the words themselves.`,
    arrival: ({ destinationName }) =>
      `${destinationName} has its readers—and its informers. I can move the bundles quietly from this quay.`,
    participationLabel: "Join the vernacular reading",
    participation: "You read beside the reformer while sailors and artisans follow the words in their own tongue. The gathering entrusts you with offerings for carrying more texts between sympathetic ports.",
    bonusLabel: "Reformation reading"
  }),
  religiousMission({
    id: "orthodox-icon-restoration",
    title: "Icons After the Storm",
    passengerReligionIds: ["eastern-orthodox"],
    participantReligionIds: ["eastern-orthodox", "ethiopian-orthodox"],
    roleLabel: "monk",
    preferClergy: true,
    bonusDoubloons: 85,
    offer: ({ destinationName, reward }) =>
      `A coastal monastery lost books and painted panels when its storehouse roof failed. I have gathered the rescued icons and copyists' notes for brethren in ${destinationName}. Carry me there for ${reward} db.`,
    underway: () =>
      "Salt has touched the cases, but not the painted faces. Keep them dry and the monastery's memory will survive the storm.",
    arrival: ({ destinationName }) =>
      `The brethren of ${destinationName} are waiting with clean linen, wax, and a careful hand for every damaged panel.`,
    participationLabel: "Join the icons' reception",
    participation: "You stand with the monks as each rescued icon is received and named. Your knowledge of the old prayers reassures the donors, who add to your fare for preserving the collection.",
    bonusLabel: "Monastery restoration"
  }),
  religiousMission({
    id: "ethiopian-pilgrim-manuscript",
    title: "A Ge'ez Book for Jerusalem",
    passengerReligionIds: ["ethiopian-orthodox"],
    participantReligionIds: ["ethiopian-orthodox"],
    destinationCountries: ["Saudi Arabia"],
    destinationReligionIds: null,
    roleLabel: "debtera",
    preferClergy: true,
    bonusDoubloons: 100,
    offer: ({ destinationName, reward }) =>
      `Our pilgrims keep an ancient house in Jerusalem, but the road begins at the sea. I carry a Ge'ez service book and letters for the faithful gathering through ${destinationName}. Passage is worth ${reward} db.`,
    underway: () =>
      "The book is wrapped against spray and the letters name every household that contributed. They have crossed harder country than this sea.",
    arrival: ({ destinationName }) =>
      `From ${destinationName}, the manuscript can join the caravan toward Jerusalem and the Ethiopian house there.`,
    participationLabel: "Join the Ge'ez thanksgiving",
    participation: "You answer the old Ge'ez prayers with the debtera before the manuscript begins its inland journey. The pilgrims honor a captain who shares their church and their burden.",
    bonusLabel: "Pilgrims' thanksgiving"
  }),
  religiousMission({
    id: "islamic-waqf-deed",
    title: "A Deed of Endowment",
    passengerReligionIds: MUSLIM_RELIGIONS,
    participantReligionIds: MUSLIM_RELIGIONS,
    roleLabel: "waqf steward",
    bonusDoubloons: 90,
    offer: ({ destinationName, reward }) =>
      `A merchant has endowed rents for a fountain, school, and soup kitchen. The signed waqf deed must reach its witnesses in ${destinationName} before the first accounts are opened. Carry me for ${reward} db.`,
    underway: () =>
      "The deed names every shop, field, beneficiary, and witness. Charity lasts only when its obligations are harder to steal than its coin.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s judge and trustees are ready to register the endowment and begin feeding travelers.`,
    participationLabel: "Witness the charitable endowment",
    participation: "You witness the deed with the trustees and inspect the first stores set aside for travelers and the poor. They pay an additional honorarium for a Muslim captain whose testimony can follow the endowment from port to port.",
    bonusLabel: "Waqf witness fee"
  }),
  religiousMission({
    id: "jewish-responsum",
    title: "A Question for the Rabbis",
    passengerReligionIds: ["judaism"],
    participantReligionIds: ["judaism"],
    roleLabel: "community messenger",
    bonusDoubloons: 100,
    offer: ({ destinationName, reward }) =>
      `Our merchants dispute a partnership broken by shipwreck, and the local court found no settled answer. I carry the contracts and their question to learned rabbis in ${destinationName}. Safe passage is worth ${reward} db.`,
    underway: () =>
      "Every clause has been copied twice, with the witnesses' names. A responsum can settle this quarrel here and guide another community years from now.",
    arrival: ({ destinationName }) =>
      `The scholars of ${destinationName} have assembled to hear the facts before drafting their responsum.`,
    participationLabel: "Sit with the responsum court",
    participation: "You explain the hazards of freight, salvage, and shared risk from a captain's experience. The scholars incorporate that testimony and the merchants add a fee for helping the ruling fit the sea as well as the page.",
    bonusLabel: "Responsum testimony"
  }),
  religiousMission({
    id: "hindu-temple-endowment",
    title: "A Merchant's Temple Gift",
    passengerReligionIds: ["hinduism"],
    participantReligionIds: ["hinduism"],
    roleLabel: "temple steward",
    bonusDoubloons: 85,
    offer: ({ destinationName, reward }) =>
      `A guild has promised lamps, food, and repairs to a coastal temple near ${destinationName}. I carry its accounts and the donors' sealed pledges. Deliver me for ${reward} db.`,
    underway: () =>
      "A gift is more than coin. Oil must arrive for the lamps, grain for visitors, and craftsmen when the monsoon has loosened the roof tiles.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s guild elders are ready to count the pledges and release the first stores to the temple.`,
    participationLabel: "Present the guild's offering",
    participation: "You present the donors' ledger before the temple stewards and name the ports that kept faith with the voyage. The guild rewards a Hindu captain who made the offering part of their own duty.",
    bonusLabel: "Temple guild honorarium"
  }),
  religiousMission({
    id: "jain-pilgrimage-endowment",
    title: "Steps to Shatrunjaya",
    passengerReligionIds: ["jainism"],
    participantReligionIds: ["jainism"],
    roleLabel: "Jain lay steward",
    bonusDoubloons: 95,
    offer: ({ destinationName, reward }) =>
      `Merchants have subscribed repairs and food for pilgrims climbing Shatrunjaya. Their accounts must meet the caravan assembling through ${destinationName}. Carry me and the donation rolls for ${reward} db.`,
    underway: () =>
      "No cargo in these rolls is taken by force or bought with slaughter. The donors mean commerce to leave a gentler mark than profit alone.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s Jain guild is ready to audit the rolls before the pilgrims and craftsmen go inland.`,
    participationLabel: "Audit the pilgrimage charity",
    participation: "You help reconcile each port's pledge without favoring kin or partner. The guild records the accounts as clean and pays you for serving the pilgrimage without compromising its principles.",
    bonusLabel: "Pilgrimage charity audit"
  }),
  religiousMission({
    id: "sikh-sangat-hymns",
    title: "Songs from Kartarpur",
    passengerReligionIds: ["sikhism"],
    participantReligionIds: ["sikhism"],
    roleLabel: "sangat singer",
    minimumDistanceKm: 100,
    bonusDoubloons: 110,
    offer: ({ destinationName, reward }) =>
      `Guru Nanak has settled at Kartarpur, where the sangat gathers morning and evening to sing. I carry remembered hymns and news of the community to friends near ${destinationName}. Take me there for ${reward} db.`,
    underway: () =>
      "The hymns travel best in living voices. I repeat each measure at dawn so wind and fear cannot make me forget it.",
    arrival: ({ destinationName }) =>
      `The sangat at ${destinationName} has gathered. They ask to hear Kartarpur's hymns before any account is settled.`,
    participationLabel: "Sing with the sangat",
    participation: "You sit among traders, farmers, and sailors as the hymn passes from one voice to the next. After the shared meal, the congregation contributes an additional gift for your service to the new community.",
    bonusLabel: "Sangat's gift"
  }),
  religiousMission({
    id: "zoroastrian-correspondence",
    title: "Letters Between Two Fires",
    passengerReligionIds: ["zoroastrianism"],
    participantReligionIds: ["zoroastrianism"],
    roleLabel: "community emissary",
    bonusDoubloons: 105,
    offer: ({ destinationName, reward }) =>
      `Our households are few and scattered between Iran and Gujarat. I carry ritual questions, family letters, and copies of prayers to the community in ${destinationName}. Passage is worth ${reward} db.`,
    underway: () =>
      "The packets are small because every line matters. One answer may guide a household that has not seen another fire temple in a generation.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s elders are waiting to compare the letters and prepare replies for the return routes.`,
    participationLabel: "Join the community council",
    participation: "You greet the council as hamazor and describe the faithful communities along your route. Their replies now have a trusted carrier, and they add a substantial gift to support your next crossing.",
    bonusLabel: "Community correspondence"
  }),
  religiousMission({
    id: "theravada-monastic-lineage",
    title: "The Lanka Lineage",
    passengerReligionIds: ["theravada-buddhism"],
    participantReligionIds: ["theravada-buddhism"],
    roleLabel: "bhikkhu",
    preferClergy: true,
    bonusDoubloons: 100,
    offer: ({ destinationName, reward }) =>
      `Monks have crossed between Lanka and the mainland for ordination, study, and Pali texts. I carry a copied monastic rule and letters of lineage to a monastery near ${destinationName}. Passage is worth ${reward} db.`,
    underway: () =>
      "A lineage lives through teachers, students, and careful conduct—not through a royal seal. Still, a dry manuscript helps.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s chapter has assembled to compare the text and hear news of monasteries across the sea.`,
    participationLabel: "Attend the merit dedication",
    participation: "You attend while the chapter receives the text and dedicates the merit of the voyage. Lay patrons add provisions and coin for a Buddhist captain who protected the monastic exchange.",
    bonusLabel: "Monastic patrons' gift"
  }),
  religiousMission({
    id: "ming-three-teachings-mediation",
    title: "Two Temples, One Harbor",
    passengerReligionIds: ["mahayana-buddhism"],
    participantReligionIds: ["mahayana-buddhism", "daoism", "chinese-traditional"],
    originCountries: ["China"],
    destinationCountries: ["China"],
    destinationReligionIds: null,
    roleLabel: "Buddhist monk",
    preferClergy: true,
    bonusDoubloons: 120,
    offer: ({ destinationName, reward }) =>
      `Our monastery and a Daoist abbey both repaired the storm wharf, and now each claims its tolls and storehouse. I carry both account books to neutral elders in ${destinationName}. Take me there for ${reward} db.`,
    underway: () =>
      "Buddhists and Daoists often share patrons and craftsmen; that makes a disputed wall or quay harder, not easier, to divide. The books must speak before tempers do.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s Buddhist, Daoist, and learned civic elders are seated together. They need a final maritime witness before dividing the wharf's upkeep and use.`,
    participationLabel: "Help reconcile the two temples",
    participation: "You show that neither account paid for the wharf alone. The elders establish shared upkeep, alternating festival access, and free landing for storm-struck vessels. Both temples reward the captain who made coexistence more useful than victory.",
    bonusLabel: "Three Teachings mediation"
  }),
  religiousMission({
    id: "east-asian-sutra-collation",
    title: "A Sutra Without Missing Leaves",
    passengerReligionIds: ["mahayana-buddhism", "tibetan-buddhism"],
    participantReligionIds: BUDDHIST_RELIGIONS,
    destinationReligionIds: BUDDHIST_RELIGIONS,
    roleLabel: "monk",
    preferClergy: true,
    bonusDoubloons: 90,
    offer: ({ destinationName, reward }) =>
      `Our sutra copy lacks six leaves. A monastery near ${destinationName} owns another recension and will let me collate the missing lines. Carry me and the wrapped volume for ${reward} db.`,
    underway: () =>
      "A copyist can preserve an error for centuries as easily as a teaching. We will compare every doubtful character before filling the gaps.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s copyists have laid out brushes, paper, and their own worn volume for comparison.`,
    participationLabel: "Join the sutra dedication",
    participation: "You sit through the collation and add your name to the dedication of the repaired copy. The monastery's lay patrons honor the Buddhist captain who reunited the scattered leaves.",
    bonusLabel: "Sutra patrons' gift"
  }),
  religiousMission({
    id: "kami-buddhist-shrine-repair",
    title: "Shrine and Temple Together",
    passengerReligionIds: ["kami-buddhist"],
    participantReligionIds: ["kami-buddhist"],
    originCountries: ["Japan"],
    destinationCountries: ["Japan"],
    destinationReligionIds: null,
    roleLabel: "shrine-temple steward",
    bonusDoubloons: 85,
    offer: ({ destinationName, reward }) =>
      `A shrine and its Buddhist temple share a storm-damaged approach near ${destinationName}. I carry donor lists and plans for rebuilding both without slighting either. Passage is worth ${reward} db.`,
    underway: () =>
      "The kami's gate and the temple hall stand on the same road. Repairing only one would leave the whole precinct broken.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s shrine families, monks, and carpenters are ready to divide the work and begin together.`,
    participationLabel: "Present the joint rebuilding plan",
    participation: "You present the plan before shrine and temple representatives, then join the dedication of timber and labor. The donors add a gift for honoring the whole sacred precinct.",
    bonusLabel: "Shrine-temple donors' gift"
  }),
  religiousMission({
    id: "andean-huaca-record",
    title: "Offerings for the Huaca",
    passengerReligionIds: ["andean-traditional"],
    participantReligionIds: ["andean-traditional"],
    roleLabel: "shrine keeper",
    maximumDistanceKm: 22000,
    bonusDoubloons: 80,
    offer: ({ destinationName, reward }) =>
      `Families entrusted me with a quipu recording cloth, maize, and labor promised to a huaca near ${destinationName}. I must place the record before its keepers. Carry me for ${reward} db.`,
    underway: () =>
      "Every knot binds a household to what it promised. If the cord is lost, memory becomes an argument between the coast and the high road.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s keepers and carriers are waiting to read the quipu against the offerings already received.`,
    participationLabel: "Witness the quipu accounting",
    participation: "You recount the ports and weather of the journey while the keepers match knots to gifts. They recognize your shared obligations to land, ancestors, and sacred places with an additional reward.",
    bonusLabel: "Huaca accounting"
  }),
  religiousMission({
    id: "mesoamerican-calendar-keepers",
    title: "The Count of Days",
    passengerReligionIds: ["mesoamerican-traditional"],
    participantReligionIds: ["mesoamerican-traditional"],
    roleLabel: "calendar keeper",
    bonusDoubloons: 80,
    offer: ({ destinationName, reward }) =>
      `War and conquest scattered our painted day-counts. I carry a surviving copy so keepers in ${destinationName} can compare ceremonies, planting days, and remembered names. Passage is worth ${reward} db.`,
    underway: () =>
      "A calendar is not merely a number. It tells a community when to plant, remember the dead, and renew its promises.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s keepers have brought their own damaged books and oral counts to compare with mine.`,
    participationLabel: "Join the calendar comparison",
    participation: "You provide the voyage's day count while the keepers reconcile painted signs with remembered ceremonies. They reward a captain who understands that preserving time can preserve a people.",
    bonusLabel: "Calendar keepers' gift"
  }),
  religiousMission({
    id: "african-ancestor-settlement",
    title: "An Oath Between Lineages",
    passengerReligionIds: ["african-traditional"],
    participantReligionIds: ["african-traditional"],
    roleLabel: "lineage emissary",
    bonusDoubloons: 85,
    offer: ({ destinationName, reward }) =>
      `Two trading lineages blame each other for a lost canoe and a broken marriage pledge. I carry witness gifts and the elders' terms to their kin in ${destinationName}. Take me there for ${reward} db.`,
    underway: () =>
      "Coin can replace a canoe. It cannot by itself repair the names of the living before their ancestors. Every witness matters.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s elders have assembled both lineages and laid out the witness gifts without opening them.`,
    participationLabel: "Stand witness before the ancestors",
    participation: "You testify to the voyage and stand with the elders as gifts and obligations are exchanged. Both lineages add to your payment for helping turn a dangerous grievance into a remembered settlement.",
    bonusLabel: "Lineage settlement"
  }),
  religiousMission({
    id: "polynesian-sacred-voyage",
    title: "Renew the Sea Road",
    passengerReligionIds: ["polynesian-traditional"],
    participantReligionIds: ["polynesian-traditional"],
    roleLabel: "wayfinding priest",
    bonusDoubloons: 95,
    offer: ({ destinationName, reward }) =>
      `Our islands remember kinship by voyaging it. I carry genealogy, a carved adze, and kava for the chiefs at ${destinationName}, where an old sea alliance must be renewed. Passage is worth ${reward} db.`,
    underway: () =>
      "The stars and swells hold the road, but names hold the reason for sailing it. I repeat both before sleep.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s navigators and chiefs have gathered to hear the genealogy before the alliance gifts are exchanged.`,
    participationLabel: "Recite the voyage with the navigators",
    participation: "You recount winds, stars, currents, and landfalls beside the local navigators. The chiefs accept the sea road as living once more and add a navigator's gift to your fare.",
    bonusLabel: "Sea-road renewal"
  }),
  religiousMission({
    id: "austronesian-ancestor-alliance",
    title: "The Ancestors' Cloth",
    passengerReligionIds: ["austronesian-traditional"],
    participantReligionIds: ["austronesian-traditional"],
    roleLabel: "ritual envoy",
    bonusDoubloons: 85,
    offer: ({ destinationName, reward }) =>
      `A woven ancestor cloth and marriage gifts must reach our allied house in ${destinationName} before the monsoon closes the route. I am charged to speak the names that travel with them. Passage is worth ${reward} db.`,
    underway: () =>
      "The cloth has crossed this water before in stories. If it returns safely, two houses will still call each other kin.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s elders are waiting to receive the cloth, gifts, and names as one obligation.`,
    participationLabel: "Join the ancestor exchange",
    participation: "You name the sea route and its dangers before the allied houses exchange gifts. They honor your shared reverence for ancestors with a further payment from both families.",
    bonusLabel: "Ancestor-alliance gift"
  })
]);

const MISSIONS_BY_ID = new Map(RELIGIOUS_MISSION_CATALOG.map((mission) => [mission.id, mission]));
if (MISSIONS_BY_ID.size !== RELIGIOUS_MISSION_CATALOG.length) {
  throw new Error("Religious mission catalog contains duplicate ids");
}

export function religiousPassengerPlan(state, origin, portCities, context, rollKey) {
  const forcedMission = forcedReligiousMission(context);
  if (context.scenarioId && !forcedMission) return null;
  const chance = normalizedChance(
    context.religiousScenarioChance,
    RELIGIOUS_PASSENGER_SCENARIO_CHANCE
  );
  if (!forcedMission && chance < 1 && seededFraction(`${rollKey}|religious-mission`) >= chance) {
    return null;
  }
  const playerReligionId = state?.playerCharacter?.religionId || null;
  const missions = (forcedMission ? [forcedMission] : RELIGIOUS_MISSION_CATALOG)
    .map((mission) => buildMissionPlan(
      mission,
      origin,
      portCities,
      context,
      rollKey,
      playerReligionId
    ))
    .filter(Boolean)
    .sort((left, right) => (
      Number(right.playerAligned) - Number(left.playerAligned) ||
      left.score - right.score ||
      left.mission.id.localeCompare(right.mission.id)
    ));
  return missions[0] || null;
}

export function religiousMissionById(missionId) {
  const mission = MISSIONS_BY_ID.get(missionId);
  if (!mission) throw new Error(`Unknown religious mission: ${missionId}`);
  return mission;
}

export function isReligiousPassengerQuest(quest) {
  return quest?.kind === "passenger" && typeof quest.religiousMissionId === "string";
}

export function religiousMissionRoleLabel(quest) {
  return isReligiousPassengerQuest(quest)
    ? religiousMissionById(quest.religiousMissionId).roleLabel
    : null;
}

export function religiousMissionTitle(quest) {
  return isReligiousPassengerQuest(quest)
    ? religiousMissionById(quest.religiousMissionId).title
    : null;
}

export function religiousMissionIconId(quest) {
  if (!isReligiousPassengerQuest(quest)) return null;
  return religionById(quest.passengerReligionId).iconId;
}

export function captainCanParticipateInReligiousMission(gameState, quest) {
  if (!isReligiousPassengerQuest(quest)) return false;
  const religionId = gameState?.playerCharacter?.religionId || null;
  return Boolean(
    religionId &&
    religiousMissionById(quest.religiousMissionId).participantReligionIds.includes(religionId)
  );
}

export function religiousMissionParticipation(quest) {
  if (!isReligiousPassengerQuest(quest)) {
    throw new Error("Religious participation requires a religious passenger quest");
  }
  const mission = religiousMissionById(quest.religiousMissionId);
  return Object.freeze({
    missionId: mission.id,
    title: mission.title,
    label: mission.participationLabel,
    text: mission.participation,
    bonusDoubloons: mission.bonusDoubloons,
    bonusLabel: mission.bonusLabel,
    reputationBonus: mission.reputationBonus
  });
}

export function religiousMissionDialogueText(missionId, origin, destination, reward) {
  const mission = religiousMissionById(missionId);
  const values = {
    originName: cityLabel(origin),
    destinationName: cityLabel(destination),
    reward
  };
  return Object.freeze({
    offer: mission.offer(values),
    underway: mission.underway(values),
    arrival: mission.arrival(values)
  });
}

export function religiousPassengerDistanceIsAllowed(distanceKm, missionId = null) {
  const mission = missionId === null ? null : religiousMissionById(missionId);
  return Number.isFinite(distanceKm) &&
    distanceKm >= (mission?.minimumDistanceKm || RELIGIOUS_PASSENGER_MIN_DISTANCE_KM) &&
    distanceKm <= (mission?.maximumDistanceKm || RELIGIOUS_PASSENGER_MAX_DISTANCE_KM);
}

function buildMissionPlan(mission, origin, portCities, context, rollKey, playerReligionId) {
  if (!portMatchesOrigin(mission, origin)) return null;
  const originReligions = religionIdsAtPort(origin)
    .filter((religionId) => mission.passengerReligionIds.includes(religionId));
  if (originReligions.length === 0) return null;
  const destinations = portCities
    .filter((port) => port.tileId !== origin.tileId)
    .filter((port) => Number.isFinite(port.lat) && Number.isFinite(port.lon))
    .filter((port) => portMatchesDestination(mission, port))
    .map((port) => ({
      port,
      distanceKm: passengerTravelDistanceKm(origin, port, context)
    }))
    .filter(({ distanceKm }) => Number.isFinite(distanceKm) &&
      distanceKm >= mission.minimumDistanceKm &&
      distanceKm <= mission.maximumDistanceKm);
  const eligibleDestinations = context.destinationTileId === undefined
    ? destinations
    : destinations.filter(({ port }) => port.tileId === context.destinationTileId);
  if (eligibleDestinations.length === 0) return null;
  const destination = eligibleDestinations
    .map((candidate) => ({
      ...candidate,
      score: destinationScore(mission, candidate.port, candidate.distanceKm, rollKey)
    }))
    .sort((left, right) => left.score - right.score || left.port.tileId - right.port.tileId)[0];
  const passengerReligionId = originReligions.includes(playerReligionId)
    ? playerReligionId
    : originReligions[hashString32(`${rollKey}|${mission.id}|passenger-faith`) % originReligions.length];
  return Object.freeze({
    mission,
    destination: destination.port,
    distanceKm: destination.distanceKm,
    passengerReligionId,
    scenario: mission.scenario,
    religiousMissionId: mission.id,
    playerAligned: mission.participantReligionIds.includes(playerReligionId),
    score: hashString32(`${rollKey}|${mission.id}|mission-choice`) / 0x100000000
  });
}

function portMatchesOrigin(mission, port) {
  return optionalListMatches(mission.originCountries, port.country) &&
    optionalListMatches(mission.originCityTypes, port.cityType);
}

function portMatchesDestination(mission, port) {
  if (!optionalListMatches(mission.destinationCountries, port.country) ||
      !optionalListMatches(mission.destinationCityTypes, port.cityType)) {
    return false;
  }
  if (mission.destinationReligionIds === null) return true;
  return religionIdsAtPort(port).some((religionId) => (
    mission.destinationReligionIds.includes(religionId)
  ));
}

function optionalListMatches(values, candidate) {
  return values === null || values.includes(candidate);
}

function religionIdsAtPort(port) {
  try {
    return religionCandidatesForHome(port).map(({ id }) => id);
  } catch {
    return [];
  }
}

function passengerTravelDistanceKm(origin, destination, context) {
  if (typeof context.sailingDistanceKm === "function") {
    return context.sailingDistanceKm(origin, destination);
  }
  return greatCircleDistanceKm(origin, destination);
}

function destinationScore(mission, destination, distanceKm, rollKey) {
  const preferredDistanceKm = Math.min(2200, mission.maximumDistanceKm);
  const distancePenalty = Math.abs(distanceKm - preferredDistanceKm) /
    Math.max(preferredDistanceKm, 1);
  return seededFraction(`${rollKey}|${mission.id}|${destination.tileId}`) + distancePenalty * 0.35;
}

function forcedReligiousMission(context) {
  if (context.religiousMissionId !== undefined) {
    return religiousMissionById(context.religiousMissionId);
  }
  if (typeof context.scenarioId !== "string") return null;
  return RELIGIOUS_MISSION_CATALOG.find(({ scenario }) => scenario.id === context.scenarioId) || null;
}

function religiousMission(spec) {
  for (const religionId of [...spec.passengerReligionIds, ...spec.participantReligionIds]) {
    religionById(religionId);
  }
  const destinationReligionIds = spec.destinationReligionIds === undefined
    ? spec.passengerReligionIds
    : spec.destinationReligionIds;
  if (destinationReligionIds !== null) {
    for (const religionId of destinationReligionIds) religionById(religionId);
  }
  if (!Number.isInteger(spec.bonusDoubloons) || spec.bonusDoubloons <= 0) {
    throw new Error(`Religious mission ${spec.id} needs a participation bonus`);
  }
  const minimumDistanceKm = spec.minimumDistanceKm || RELIGIOUS_PASSENGER_MIN_DISTANCE_KM;
  const maximumDistanceKm = spec.maximumDistanceKm || RELIGIOUS_PASSENGER_MAX_DISTANCE_KM;
  return Object.freeze({
    ...spec,
    passengerReligionIds: Object.freeze([...spec.passengerReligionIds]),
    participantReligionIds: Object.freeze([...spec.participantReligionIds]),
    destinationReligionIds: destinationReligionIds === null
      ? null
      : Object.freeze([...destinationReligionIds]),
    originCountries: freezeOptional(spec.originCountries),
    destinationCountries: freezeOptional(spec.destinationCountries),
    originCityTypes: freezeOptional(spec.originCityTypes),
    destinationCityTypes: freezeOptional(spec.destinationCityTypes),
    minimumDistanceKm,
    maximumDistanceKm,
    reputationBonus: spec.reputationBonus || 3,
    scenario: Object.freeze({
      id: `religious-${spec.id}`,
      expressionId: spec.preferClergy ? "attentive" : "neutral",
      namePort: "origin",
      preferClergy: spec.preferClergy === true
    })
  });
}

function freezeOptional(values) {
  return values === undefined ? null : Object.freeze([...values]);
}

function normalizedChance(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function seededFraction(value) {
  return hashString32(value) / 0x100000000;
}

function cityLabel(city) {
  return city?.displayCity || city?.city || "the destination";
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
