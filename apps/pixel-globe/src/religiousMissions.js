import {
  religionById,
  religionCandidatesForHome
} from "./characterReligion.js";
import { CANONICAL_PORTS, portMatchesCanonicalReference } from "./canonicalPorts.js";
import { greatCircleDistanceKm } from "./worldDistance.js";

export const RELIGIOUS_PASSENGER_SCENARIO_CHANCE = 0.45;
export const RELIGIOUS_PASSENGER_MIN_DISTANCE_KM = 250;
export const RELIGIOUS_PASSENGER_MAX_DISTANCE_KM = 8000;
export const SEPTEMBER_TESTAMENT_MISSION_ID = "september-testament";

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
    id: "franciscan-bound-west",
    title: "The Friar Bound West",
    passengerReligionIds: ["roman-catholic"],
    participantReligionIds: ["roman-catholic"],
    originPorts: [CANONICAL_PORTS.GENT],
    destinationPorts: [CANONICAL_PORTS.VERACRUZ],
    destinationReligionIds: null,
    roleLabel: "Franciscan friar",
    preferClergy: true,
    maximumDistanceKm: 12000,
    bonusDoubloons: 130,
    offer: ({ destinationName, reward }) =>
      `Our Franciscan province sends brothers west with grammars and medicine. I need an interpreter in ${destinationName} before I teach. Carry me for ${reward} db.`,
    underway: () =>
      "A sermon no one understands is only noise. I mean to learn the local tongue, keep no armed escort, and refuse any grant founded on forced labor.",
    arrival: ({ destinationName }) =>
      `At ${destinationName}, local interpreters and the friars' hosts wait beside the customs house. The mission can begin with lessons and a sickbed rather than a demand.`,
    participationLabel: "Help set the mission's rule",
    participation: "You witness the friar reject forced baptism and open the mission house to the sick. Catholic merchants thank you for making those terms public.",
    bonusLabel: "Franciscan patrons' gift"
  }),
  religiousMission({
    id: "dominican-testimony-hispaniola",
    title: "A Dominican's Testimony",
    passengerReligionIds: ["roman-catholic"],
    participantReligionIds: ["roman-catholic"],
    originPorts: [CANONICAL_PORTS.SEVILLE],
    destinationPorts: [CANONICAL_PORTS.SANTO_DOMINGO],
    destinationReligionIds: null,
    roleLabel: "Dominican friar",
    preferClergy: true,
    maximumDistanceKm: 11000,
    bonusDoubloons: 125,
    offer: ({ destinationName, reward }) =>
      `I carry testimony against forced labor and conversion to ${destinationName}. Encomienda men want these pages lost. Deliver me for ${reward} db.`,
    underway: () =>
      "A cross cannot excuse a chain. If our preaching depends upon terror, then it condemns the preacher before it persuades a single soul.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s Dominicans have called colonists, officials, and Indian witnesses to hear the testimony in public.`,
    participationLabel: "Witness the friars' protest",
    participation: "You confirm that the papers crossed safely as the Dominicans denounce forced labor and baptism. Sympathetic parishioners reward you.",
    bonusLabel: "Dominican supporters' purse"
  }),
  religiousMission({
    id: "franciscan-house-goa",
    title: "A Friar for Goa",
    passengerReligionIds: ["roman-catholic"],
    participantReligionIds: ["roman-catholic"],
    originPorts: [CANONICAL_PORTS.LISBON],
    destinationPorts: [CANONICAL_PORTS.GOA],
    destinationReligionIds: null,
    roleLabel: "Franciscan friar",
    preferClergy: true,
    maximumDistanceKm: 22000,
    bonusDoubloons: 140,
    offer: ({ destinationName, reward }) =>
      `The Franciscan house at ${destinationName} needs a brother to tend the sick and learn Konkani. I carry books and medicine, and can pay ${reward} db.`,
    underway: () =>
      "The factories speak as if conquest settled every question. A friar who cannot listen in the language of the coast will serve the governor better than the Gospel.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s friars, nurses, and local language teachers have come to divide the medicines and begin the new lessons.`,
    participationLabel: "Endow the language lessons",
    participation: "You help the friars and their Konkani teachers open a classroom. Catholic patrons reward the captain who made listening part of the mission.",
    bonusLabel: "Goa mission-house gift"
  }),
  religiousMission({
    id: "ethiopian-embassy-cleric",
    title: "Letters Between Two Churches",
    passengerReligionIds: ["roman-catholic", "ethiopian-orthodox"],
    participantReligionIds: ["roman-catholic", "ethiopian-orthodox"],
    originPorts: [CANONICAL_PORTS.LISBON, CANONICAL_PORTS.MASSAWA],
    destinationPorts: [CANONICAL_PORTS.LISBON, CANONICAL_PORTS.MASSAWA],
    destinationReligionIds: null,
    roleLabel: "embassy cleric",
    preferClergy: true,
    maximumDistanceKm: 22000,
    bonusDoubloons: 135,
    offer: ({ destinationName, reward }) =>
      `I carry letters between Lebna Dengel and King Joao. Ethiopia's church is ancient; this concerns alliance, doctrine, and safe travel. Take me to ${destinationName} for ${reward} db.`,
    underway: () =>
      "Each side arrived expecting an exotic mirror of itself. The letters matter because friendship must survive the moment both churches discover real differences.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s clergy and royal agents are ready to receive the letters together, so neither court can quietly rewrite the other's words.`,
    participationLabel: "Witness the churches' exchange",
    participation: "You witness the seals and chart the next envoys' route. The clergy reward a captain who treated the letters as diplomacy, not conquest.",
    bonusLabel: "Embassy churches' honorarium"
  }),
  religiousMission({
    id: "reformation-printing",
    title: "Words in the Vernacular",
    passengerReligionIds: ["lutheran"],
    participantReligionIds: PROTESTANT_RELIGIONS,
    destinationCityTypes: ["northern-european"],
    roleLabel: "preacher",
    preferClergy: true,
    challengesPapalAuthority: true,
    catholicContraband: true,
    bonusDoubloons: 90,
    offer: ({ destinationName, reward }) =>
      `Wittenberg's presses made every pulpit a frontier. I carry vernacular sermons and Scripture to ${destinationName}. Safe passage is worth ${reward} db.`,
    underway: ({ destinationName }) =>
      `Printers can make more copies than bishops can seize. If these sheets reach ${destinationName}, ordinary readers will judge the words themselves.`,
    arrival: ({ destinationName }) =>
      `${destinationName} has its readers—and its informers. I can move the bundles quietly from this quay.`,
    participationLabel: "Join the vernacular reading",
    participation: "Sailors and artisans read the new text in their own tongue. The gathering pays you to carry more between sympathetic ports.",
    bonusLabel: "Reformation reading"
  }),
  religiousMission({
    id: SEPTEMBER_TESTAMENT_MISSION_ID,
    title: "The September Testament",
    passengerReligionIds: ["lutheran"],
    participantReligionIds: PROTESTANT_RELIGIONS,
    originPorts: [CANONICAL_PORTS.HAMBURG, CANONICAL_PORTS.LUBECK, CANONICAL_PORTS.BREMEN],
    destinationCityTypes: ["northern-european"],
    destinationReligionIds: ["roman-catholic"],
    destinationFactorReligionId: "roman-catholic",
    deliveryStopCount: 3,
    preferredLegDistanceKm: 850,
    roleLabel: "bookseller",
    challengesPapalAuthority: true,
    catholicContraband: true,
    offersLutheranConversion: true,
    preferClergy: false,
    bonusDoubloons: 110,
    offer: ({ destinationName, reward }) =>
      `The September Testament puts the Gospel into German, but the Edict of Worms makes every chest dangerous. Carry me through three hidden ports, beginning with ${destinationName}, for ${reward} db.`,
    underway: ({ destinationName }) =>
      `The title pages are buried beneath honest account books. In a Catholic harbor, the customs men may seize the lot before we reach ${destinationName}.`,
    arrival: ({ destinationName }) =>
      `${destinationName}'s booksellers have shutters drawn and buyers waiting. The Testaments can pass hand to hand from here.`,
    participationLabel: "Help distribute the Testaments",
    participation: "You carry bundles from the quay while printers and readers divide the forbidden books among trusted households.",
    bonusLabel: "Booksellers' purse"
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
      `A monastery lost books and painted panels in a roof collapse. I carry the rescued icons and notes to ${destinationName}. Passage is ${reward} db.`,
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
      `Our pilgrims keep an ancient house in Jerusalem. I carry a Ge'ez service book and letters through ${destinationName}. Passage is worth ${reward} db.`,
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
      `A merchant endowed a fountain, school, and soup kitchen. This waqf deed must reach its witnesses in ${destinationName}. Carry me for ${reward} db.`,
    underway: () =>
      "The deed names every shop, field, beneficiary, and witness. Charity lasts only when its obligations are harder to steal than its coin.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s judge and trustees are ready to register the endowment and begin feeding travelers.`,
    participationLabel: "Witness the charitable endowment",
    participation: "You witness the deed and inspect stores for travelers and the poor. The trustees pay for testimony that can follow the endowment between ports.",
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
      `A shipwreck broke a merchant partnership, and our court found no answer. I carry the contracts to rabbis in ${destinationName}. Passage is worth ${reward} db.`,
    underway: () =>
      "Every clause has been copied twice, with the witnesses' names. A responsum can settle this quarrel here and guide another community years from now.",
    arrival: ({ destinationName }) =>
      `The scholars of ${destinationName} have assembled to hear the facts before drafting their responsum.`,
    participationLabel: "Sit with the responsum court",
    participation: "You explain freight, salvage, and shared risk from experience. The scholars use your testimony, and the merchants add a fee.",
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
    participation: "You present the donors' ledger and name every port that kept faith. The guild rewards your care with the offering.",
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
      `Merchants pledged repairs and food for pilgrims at Shatrunjaya. Carry their accounts to the caravan in ${destinationName} for ${reward} db.`,
    underway: () =>
      "No cargo in these rolls is taken by force or bought with slaughter. The donors mean commerce to leave a gentler mark than profit alone.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s Jain guild is ready to audit the rolls before the pilgrims and craftsmen go inland.`,
    participationLabel: "Audit the pilgrimage charity",
    participation: "You reconcile each port's pledge without favoring kin or partner. The guild records clean accounts and pays you.",
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
      `Guru Nanak's sangat gathers at Kartarpur to sing. I carry its hymns and news to friends near ${destinationName}. Take me for ${reward} db.`,
    underway: () =>
      "The hymns travel best in living voices. I repeat each measure at dawn so wind and fear cannot make me forget it.",
    arrival: ({ destinationName }) =>
      `The sangat at ${destinationName} has gathered. They ask to hear Kartarpur's hymns before any account is settled.`,
    participationLabel: "Sing with the sangat",
    participation: "Traders, farmers, and sailors pass the hymn from voice to voice. After the shared meal, the congregation gives you an additional gift.",
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
      `Our households are scattered between Iran and Gujarat. I carry prayers, questions, and family letters to ${destinationName}. Passage is worth ${reward} db.`,
    underway: () =>
      "The packets are small because every line matters. One answer may guide a household that has not seen another fire temple in a generation.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s elders are waiting to compare the letters and prepare replies for the return routes.`,
    participationLabel: "Join the community council",
    participation: "You greet the council as hamazor and describe communities along your route. They entrust you with replies and a substantial gift.",
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
      `Monks cross between Lanka and the mainland for study and ordination. I carry a monastic rule and lineage letters near ${destinationName}. Passage is ${reward} db.`,
    underway: () =>
      "A lineage lives through teachers, students, and careful conduct—not through a royal seal. Still, a dry manuscript helps.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s chapter has assembled to compare the text and hear news of monasteries across the sea.`,
    participationLabel: "Attend the merit dedication",
    participation: "The chapter receives the text and dedicates the voyage's merit. Lay patrons add provisions and coin for protecting the exchange.",
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
      `Our monastery and a Daoist abbey both claim the wharf they repaired. I carry both accounts to neutral elders in ${destinationName}. Take me for ${reward} db.`,
    underway: () =>
      "Buddhists and Daoists often share patrons and craftsmen; that makes a disputed wall or quay harder, not easier, to divide. The books must speak before tempers do.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s Buddhist, Daoist, and learned civic elders are seated together. They need a final maritime witness before dividing the wharf's upkeep and use.`,
    participationLabel: "Help reconcile the two temples",
    participation: "You show that neither account paid alone. The elders order shared upkeep and free landing in storms; both temples reward you.",
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
      `Our sutra lacks six leaves. A monastery near ${destinationName} will let me collate another copy. Carry me and the volume for ${reward} db.`,
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
      `A shrine and Buddhist temple share a storm-damaged approach near ${destinationName}. I carry plans to rebuild both. Passage is worth ${reward} db.`,
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
      `This quipu records cloth, maize, and labor promised to a huaca near ${destinationName}. I must reach its keepers. Carry me for ${reward} db.`,
    underway: () =>
      "Every knot binds a household to what it promised. If the cord is lost, memory becomes an argument between the coast and the high road.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s keepers and carriers are waiting to read the quipu against the offerings already received.`,
    participationLabel: "Witness the quipu accounting",
    participation: "You recount the voyage while keepers match knots to gifts. They recognize your care for their obligations with an additional reward.",
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
      `War scattered our painted day-counts. Keepers in ${destinationName} must compare this copy with remembered ceremonies. Passage is worth ${reward} db.`,
    underway: () =>
      "A calendar is not merely a number. It tells a community when to plant, remember the dead, and renew its promises.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s keepers have brought their own damaged books and oral counts to compare with mine.`,
    participationLabel: "Join the calendar comparison",
    participation: "Your voyage count helps reconcile painted signs with remembered ceremonies. The keepers reward you for preserving their time.",
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
      `Two lineages dispute a lost canoe and broken marriage pledge. I carry witness gifts and the elders' terms to ${destinationName}. Take me for ${reward} db.`,
    underway: () =>
      "Coin can replace a canoe. It cannot by itself repair the names of the living before their ancestors. Every witness matters.",
    arrival: ({ destinationName }) =>
      `${destinationName}'s elders have assembled both lineages and laid out the witness gifts without opening them.`,
    participationLabel: "Stand witness before the ancestors",
    participation: "You testify as the elders exchange gifts and obligations. Both lineages add to your payment for settling the grievance.",
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
      `Our islands remember kinship by voyaging it. I carry genealogy, an adze, and kava to renew an alliance at ${destinationName}. Passage is ${reward} db.`,
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
      `An ancestor cloth and marriage gifts must reach our allied house in ${destinationName} before the monsoon. Passage is worth ${reward} db.`,
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
  const excludedMissionIds = new Set(context.excludedReligiousMissionIds || []);
  const missions = (forcedMission ? [forcedMission] : RELIGIOUS_MISSION_CATALOG)
    .filter((mission) => !excludedMissionIds.has(mission.id))
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

export function religiousMissionByScenarioId(scenarioId) {
  if (typeof scenarioId !== "string" || scenarioId === "") return null;
  return RELIGIOUS_MISSION_CATALOG.find(({ scenario }) => scenario.id === scenarioId) || null;
}

export function isReligiousPassengerQuest(quest) {
  return quest?.kind === "passenger" && typeof quest.religiousMissionId === "string";
}

export function religiousMissionChallengesPapalAuthority(quest) {
  return isReligiousPassengerQuest(quest) &&
    religiousMissionById(quest.religiousMissionId).challengesPapalAuthority === true;
}

export function religiousMissionIsCatholicContraband(quest) {
  return isReligiousPassengerQuest(quest) &&
    religiousMissionById(quest.religiousMissionId).catholicContraband === true;
}

export function religiousMissionOffersLutheranConversion(quest) {
  return isReligiousPassengerQuest(quest) &&
    religiousMissionById(quest.religiousMissionId).offersLutheranConversion === true;
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
    .filter((port) => port.cityId !== origin.cityId)
    .filter((port) => Number.isFinite(port.lat) && Number.isFinite(port.lon))
    .filter((port) => portMatchesDestination(mission, port))
    .filter((port) => portMatchesDestinationFactor(mission, port, context))
    .map((port) => ({
      port,
      distanceKm: passengerTravelDistanceKm(origin, port, context)
    }))
    .filter(({ distanceKm }) => Number.isFinite(distanceKm) &&
      distanceKm >= mission.minimumDistanceKm &&
      distanceKm <= mission.maximumDistanceKm);
  const eligibleDestinations = context.destinationCityId === undefined || mission.deliveryStopCount > 1
    ? destinations
    : destinations.filter(({ port }) => port.cityId === context.destinationCityId);
  if (eligibleDestinations.length === 0) return null;
  const itinerary = missionItinerary(
    mission,
    origin,
    eligibleDestinations,
    context,
    rollKey
  );
  if (!itinerary) return null;
  const destination = itinerary[0];
  const passengerReligionId = originReligions.includes(playerReligionId)
    ? playerReligionId
    : originReligions[hashString32(`${rollKey}|${mission.id}|passenger-faith`) % originReligions.length];
  return Object.freeze({
    mission,
    destination: destination.port,
    distanceKm: itinerary.reduce((sum, stop) => sum + stop.legDistanceKm, 0),
    itinerary: Object.freeze(itinerary.map(({ port, legDistanceKm }) => Object.freeze({
      key: port.cityId,
      cityId: port.cityId,
      tileId: port.tileId,
      name: cityLabel(port),
      country: port.country || "",
      factionId: port.factionId || null,
      legDistanceKm: Math.round(legDistanceKm)
    }))),
    passengerReligionId,
    scenario: mission.scenario,
    religiousMissionId: mission.id,
    playerAligned: mission.participantReligionIds.includes(playerReligionId),
    score: hashString32(`${rollKey}|${mission.id}|mission-choice`) / 0x100000000
  });
}

function portMatchesOrigin(mission, port) {
  return optionalPortListMatches(mission.originPorts, port) &&
    optionalListMatches(mission.originCountries, port.country) &&
    optionalListMatches(mission.originCityTypes, port.cityType);
}

function portMatchesDestination(mission, port) {
  if (!optionalPortListMatches(mission.destinationPorts, port) ||
      !optionalListMatches(mission.destinationCountries, port.country) ||
      !optionalListMatches(mission.destinationCityTypes, port.cityType)) {
    return false;
  }
  if (mission.destinationReligionIds === null) return true;
  return religionIdsAtPort(port).some((religionId) => (
    mission.destinationReligionIds.includes(religionId)
  ));
}

function portMatchesDestinationFactor(mission, port, context) {
  if (!mission.destinationFactorReligionId || typeof context.portFactorReligionId !== "function") {
    return true;
  }
  return context.portFactorReligionId(port) === mission.destinationFactorReligionId;
}

function missionItinerary(mission, origin, destinations, context, rollKey) {
  const stopCount = mission.deliveryStopCount || 1;
  if (destinations.length < stopCount) return null;
  const remaining = [...destinations];
  const itinerary = [];
  let previous = origin;
  for (let index = 0; index < stopCount; index += 1) {
    const requiredFirstCityId = index === 0 ? context.destinationCityId : undefined;
    const candidates = remaining
      .filter(({ port }) => requiredFirstCityId === undefined || port.cityId === requiredFirstCityId)
      .map((candidate) => {
        const legDistanceKm = index === 0
          ? candidate.distanceKm
          : passengerTravelDistanceKm(previous, candidate.port, context);
        return {
          ...candidate,
          legDistanceKm,
          score: itineraryStopScore(mission, candidate.port, legDistanceKm, rollKey, index)
        };
      })
      .filter(({ legDistanceKm }) => Number.isFinite(legDistanceKm))
      .sort((left, right) => left.score - right.score || left.port.cityId.localeCompare(right.port.cityId));
    const selected = candidates[0];
    if (!selected) return null;
    itinerary.push(selected);
    previous = selected.port;
    remaining.splice(remaining.findIndex(({ port }) => port.cityId === selected.port.cityId), 1);
  }
  return itinerary;
}

function itineraryStopScore(mission, destination, distanceKm, rollKey, index) {
  const preferredDistanceKm = mission.preferredLegDistanceKm ||
    Math.min(2200, mission.maximumDistanceKm);
  const distancePenalty = Math.abs(distanceKm - preferredDistanceKm) /
    Math.max(preferredDistanceKm, 1);
  return seededFraction(`${rollKey}|${mission.id}|stop-${index}|${destination.cityId}`) +
    distancePenalty * 0.35;
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
  return seededFraction(`${rollKey}|${mission.id}|${destination.cityId}`) + distancePenalty * 0.35;
}

function forcedReligiousMission(context) {
  if (context.religiousMissionId !== undefined) {
    return religiousMissionById(context.religiousMissionId);
  }
  return religiousMissionByScenarioId(context.scenarioId);
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
  const deliveryStopCount = spec.deliveryStopCount || 1;
  if (!Number.isInteger(deliveryStopCount) || deliveryStopCount <= 0) {
    throw new Error(`Religious mission ${spec.id} has an invalid delivery stop count`);
  }
  if (spec.destinationFactorReligionId) religionById(spec.destinationFactorReligionId);
  if (spec.preferredLegDistanceKm !== undefined &&
      (!Number.isFinite(spec.preferredLegDistanceKm) || spec.preferredLegDistanceKm <= 0)) {
    throw new Error(`Religious mission ${spec.id} has an invalid preferred leg distance`);
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
    originPorts: freezeOptional(spec.originPorts),
    destinationPorts: freezeOptional(spec.destinationPorts),
    originCountries: freezeOptional(spec.originCountries),
    destinationCountries: freezeOptional(spec.destinationCountries),
    originCityTypes: freezeOptional(spec.originCityTypes),
    destinationCityTypes: freezeOptional(spec.destinationCityTypes),
    destinationFactorReligionId: spec.destinationFactorReligionId || null,
    deliveryStopCount,
    preferredLegDistanceKm: spec.preferredLegDistanceKm || null,
    minimumDistanceKm,
    maximumDistanceKm,
    reputationBonus: spec.reputationBonus || 3,
    challengesPapalAuthority: spec.challengesPapalAuthority === true,
    catholicContraband: spec.catholicContraband === true,
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

function optionalPortListMatches(references, port) {
  return references === null || references.some((reference) => (
    portMatchesCanonicalReference(port, reference)
  ));
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
