import { colonizationWorldRecords } from "./colonizationQuest.js";
import { factionById, isJapanesePolityFaction } from "./factions.js";
import { requireCityId } from "./entityIds.js";

const MINUTES_PER_DAY = 24 * 60;
const MAJOR_PORT_POPULATION = 75_000;
const MAGNATE_DOUBLOONS = 250_000;
const GREAT_MAGNATE_DOUBLOONS = 1_000_000;

const PORT_RECOGNITION_VOICE = Object.freeze({
  AFRICAN: "african",
  AMERICAN: "american",
  CHINESE: "chinese",
  EUROPEAN_CROWN: "european-crown",
  EUROPEAN_REPUBLIC: "european-republic",
  EUROPEAN_STATE: "european-state",
  INDIAN_OCEAN: "indian-ocean",
  ISLAMIC: "islamic",
  JAPANESE: "japanese",
  MARITIME: "maritime"
});

const CHINESE_FACTION_IDS = new Set(["ming", "joseon"]);
const ISLAMIC_FACTION_IDS = new Set([
  "ottoman", "safavid", "hormuz", "hejaz", "morocco", "songhai", "gujarat",
  "bengal", "delhi", "mughal", "ternate", "tidore", "crimea"
]);
const INDIAN_OCEAN_FACTION_IDS = new Set(["vijayanagara", "ayutthaya"]);
const AFRICAN_FACTION_IDS = new Set(["ethiopia"]);
const AMERICAN_FACTION_IDS = new Set(["inca", "ainu"]);
const EUROPEAN_CULTURE_IDS = new Set([
  "english", "scottish", "french", "spanish", "basque", "portuguese", "italian",
  "germanic", "nordic", "icelandic", "slavic", "polish", "lithuanian", "russian",
  "ruthenian", "hungarian", "albanian", "bulgarian", "romanian", "serbian", "greek",
  "irish", "czech", "finnish"
]);
const REPUBLICAN_FACTION_KINDS = new Set(["republic", "free-imperial-city"]);
const CROWN_FACTION_KINDS = new Set(["kingdom", "monarchy"]);

export function portFactorRecognitionForCaptain({
  gameState,
  city,
  cities,
  personalityId,
  visitCount,
  dayIndex,
  simMinute
}) {
  assertRecognitionContext({ gameState, city, cities, personalityId, visitCount, dayIndex, simMinute });
  const candidates = captainRecognitionCandidates(gameState, city, cities, simMinute);
  if (candidates.length === 0) return null;
  candidates.sort((left, right) => right.weight - left.weight || left.kind.localeCompare(right.kind));
  const highestWeight = candidates[0].weight;
  const distinguished = candidates.filter((candidate) => candidate.weight >= highestWeight - 22);
  const seed = `${requireCityId(city, "Port factor recognition city")}|${visitCount}|${dayIndex}|${personalityId}`;
  const selected = distinguished[hashString32(`${seed}|deed`) % distinguished.length];
  const variant = hashString32(`${seed}|${selected.kind}|line`) % 2;
  return Object.freeze({
    kind: selected.kind,
    expressionId: recognitionExpression(selected.kind, personalityId),
    text: recognitionText(selected, variant, recognitionVoiceForCity(city))
  });
}

export function playerPirateVictoryCount(gameState) {
  const decisions = gameState?.memory?.decisions;
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
    throw new Error("Captain recognition requires decision memory");
  }
  const recorded = positiveCount(decisions["combat.victory.pirate"]);
  const captiveRescues = positiveCount(
    gameState.memory.quests?.pirateCaptive?.completedCount
  );
  const treasureGoal = gameState.memory.campaignGoal;
  const treasureDefeats = treasureGoal && typeof treasureGoal === "object"
    ? (Array.isArray(treasureGoal.acquiredMapPiecePirateIds)
        ? treasureGoal.acquiredMapPiecePirateIds.length
        : 0) +
      (Array.isArray(treasureGoal.ambushDefeatedPirateIds)
        ? treasureGoal.ambushDefeatedPirateIds.length
        : 0)
    : 0;
  return Math.max(recorded, captiveRescues + treasureDefeats);
}

function captainRecognitionCandidates(gameState, city, cities, simMinute) {
  const conquest = gameState.memory?.conquest;
  if (!conquest || !Array.isArray(conquest.events) || !Array.isArray(conquest.treaties)) {
    throw new Error("Captain recognition requires conquest history");
  }
  const cityById = new Map(cities.map((entry) => [entry.cityId, entry]));
  const playerCaptures = conquest.events.filter((event) => (
    event?.source === "player" &&
    typeof event.cityId === "string" &&
    typeof event.newFactionId === "string"
  ));
  const localMajorCaptures = playerCaptures
    .filter((event) => event.newFactionId === city.factionId)
    .filter((event) => {
      const capturedCity = cityById.get(event.cityId);
      return Boolean(event.capitalCapturedFactionId) ||
        Number(capturedCity?.population || 0) >= MAJOR_PORT_POPULATION;
    })
    .sort((left, right) => (
      Number(Boolean(right.capitalCapturedFactionId)) - Number(Boolean(left.capitalCapturedFactionId)) ||
      Number(cityById.get(right.cityId)?.population || 0) -
        Number(cityById.get(left.cityId)?.population || 0) ||
      right.simMinute - left.simMinute
    ));
  const candidates = [];
  if (localMajorCaptures[0]) {
    const capturedCity = cityById.get(localMajorCaptures[0].cityId);
    if (!capturedCity) {
      throw new Error(`Captain recognition cannot resolve captured city ${localMajorCaptures[0].cityId}`);
    }
    candidates.push({
      kind: "hero-of-port",
      portName: capturedCity.displayCity || capturedCity.city,
      weight: 112 + recencyWeight(localMajorCaptures[0].simMinute, simMinute)
    });
  }

  const playerTreaties = conquest.treaties
    .filter((treaty) => treaty?.source === "player" && treaty.winnerFactionId === city.factionId)
    .sort((left, right) => right.simMinute - left.simMinute);
  if (playerTreaties[0]) {
    candidates.push({
      kind: "peacemaker",
      loserName: factionById(playerTreaties[0].loserFactionId).name,
      weight: 101 + recencyWeight(playerTreaties[0].simMinute, simMinute)
    });
  }

  if (playerCaptures.length >= 4) {
    candidates.push({
      kind: "conqueror",
      count: playerCaptures.length,
      weight: 88 + Math.min(18, playerCaptures.length * 2)
    });
  }

  if (gameState.doubloons >= MAGNATE_DOUBLOONS) {
    candidates.push({
      kind: "magnate",
      weight: gameState.doubloons >= GREAT_MAGNATE_DOUBLOONS ? 113 : 86
    });
  }

  const foundedColonies = colonizationWorldRecords(gameState.memory.colonization)
    .filter((record) => record.playerFoundedColony === true).length;
  if (foundedColonies >= 3) {
    candidates.push({
      kind: "colonial-founder",
      count: foundedColonies,
      weight: 84 + Math.min(14, foundedColonies * 2)
    });
  }

  const pirateVictories = playerPirateVictoryCount(gameState);
  if (pirateVictories >= 3) {
    candidates.push({
      kind: "pirate-scourge",
      count: pirateVictories,
      weight: 82 + Math.min(16, pirateVictories * 2)
    });
  }

  const discoveries = Array.isArray(gameState.memory.discoveryOrder)
    ? gameState.memory.discoveryOrder.length
    : 0;
  if (discoveries >= 10) {
    candidates.push({
      kind: "discoverer",
      count: discoveries,
      weight: 76 + Math.min(14, discoveries)
    });
  }
  return candidates;
}

function recognitionText(candidate, variant, voiceId) {
  if (candidate.kind === "hero-of-port") {
    return variant === 0
      ? `Welcome, Hero of ${candidate.portName}. The tale reached our quay before your topsails.`
      : `They call you the Hero of ${candidate.portName}, captain. A berth is waiting for you.`;
  }
  if (candidate.kind === "peacemaker") {
    return variant === 0
      ? `The peace you wrung from ${candidate.loserName} has quieted more waters than ten admirals.`
      : `Merchants bless the treaty you forced upon ${candidate.loserName}. Open seas are better than brave speeches.`;
  }
  if (candidate.kind === "conqueror") {
    return variant === 0
      ? `${candidate.count} captured ports stand in your wake. No factor mistakes you for an ordinary captain now.`
      : `You have opened ${candidate.count} city gates by force. Even admirals count your victories carefully.`;
  }
  if (candidate.kind === "magnate") {
    return variant === 0
      ? "Traders carry word of your wealth farther than any ship. Your business shall have first hearing."
      : "Your purse could fit out a fleet, captain. I shall not trouble you with small courtesies.";
  }
  if (candidate.kind === "colonial-founder") {
    return variant === 0
      ? `${candidate.count} new harbors owe their first roofs and storehouses to your voyages. Few captains leave such marks upon the map.`
      : `Word comes from ${candidate.count} settlements founded in your wake. Their factors already reckon by your name.`;
  }
  if (candidate.kind === "pirate-scourge") {
    return variant === 0
      ? "Pirates curse your name from here to the ocean sea. Honest masters drink to it."
      : pirateScourgeLine(voiceId);
  }
  if (candidate.kind === "discoverer") {
    return variant === 0
      ? `${candidate.count} discoveries are entered beside your name. Chartmakers quarrel over who may copy your bearings.`
      : "Your charts have made old maps look like children's guesses. Every pilot in port wants a sight of them.";
  }
  throw new Error(`Unknown captain recognition: ${candidate.kind}`);
}

function pirateScourgeLine(voiceId) {
  if (voiceId === PORT_RECOGNITION_VOICE.CHINESE) {
    return "The sea bandits know your sail, captain. Even the coastal patrols speak of it with respect.";
  }
  if (voiceId === PORT_RECOGNITION_VOICE.JAPANESE) {
    return "The pirate bands know your sail, captain. The war boats of these shores could ask no better ally.";
  }
  if (voiceId === PORT_RECOGNITION_VOICE.ISLAMIC) {
    return "The sea raiders know your sail, captain. Harbour navigators speak your name as protection against them.";
  }
  if (voiceId === PORT_RECOGNITION_VOICE.INDIAN_OCEAN) {
    return "The sea raiders know your sail, captain. Trading fleets take heart when they see it.";
  }
  if (voiceId === PORT_RECOGNITION_VOICE.AFRICAN) {
    return "The raiders know your sail, captain. Coastal navigators carry your name from harbour to harbour.";
  }
  if (voiceId === PORT_RECOGNITION_VOICE.AMERICAN) {
    return "The sea raiders know your sail, captain. Every fishing canoe on this coast welcomes the sight of it.";
  }
  if (voiceId === PORT_RECOGNITION_VOICE.EUROPEAN_CROWN) {
    return "The black flags have learned your sail, captain. They flee it sooner than the king's colors.";
  }
  if (voiceId === PORT_RECOGNITION_VOICE.EUROPEAN_REPUBLIC) {
    return "The black flags have learned your sail, captain. They turn from it sooner than from our war galleys.";
  }
  if (voiceId === PORT_RECOGNITION_VOICE.EUROPEAN_STATE) {
    return "The black flags have learned your sail, captain. They turn from it sooner than from our naval squadrons.";
  }
  if (voiceId === PORT_RECOGNITION_VOICE.MARITIME) {
    return "The black flags have learned your sail, captain. They flee from it sooner than from our patrols.";
  }
  throw new Error(`Unknown port recognition voice: ${voiceId}`);
}

function recognitionVoiceForCity(city) {
  const factionId = city.factionId;
  if (CHINESE_FACTION_IDS.has(factionId)) return PORT_RECOGNITION_VOICE.CHINESE;
  if (isJapanesePolityFaction(factionId) || factionId === "ryukyu") {
    return PORT_RECOGNITION_VOICE.JAPANESE;
  }
  if (ISLAMIC_FACTION_IDS.has(factionId)) return PORT_RECOGNITION_VOICE.ISLAMIC;
  if (INDIAN_OCEAN_FACTION_IDS.has(factionId)) return PORT_RECOGNITION_VOICE.INDIAN_OCEAN;
  if (AFRICAN_FACTION_IDS.has(factionId)) return PORT_RECOGNITION_VOICE.AFRICAN;
  if (AMERICAN_FACTION_IDS.has(factionId)) return PORT_RECOGNITION_VOICE.AMERICAN;

  const faction = factionById(factionId);
  const cultureId = city.character?.nameCulture;
  if (EUROPEAN_CULTURE_IDS.has(cultureId)) {
    if (CROWN_FACTION_KINDS.has(faction.kind)) return PORT_RECOGNITION_VOICE.EUROPEAN_CROWN;
    if (REPUBLICAN_FACTION_KINDS.has(faction.kind)) return PORT_RECOGNITION_VOICE.EUROPEAN_REPUBLIC;
    return PORT_RECOGNITION_VOICE.EUROPEAN_STATE;
  }
  if (city.cityType === "east-asian") return PORT_RECOGNITION_VOICE.CHINESE;
  if (city.cityType === "south-asian" || city.cityType === "southeast-asian") {
    return PORT_RECOGNITION_VOICE.INDIAN_OCEAN;
  }
  if (city.cityType === "islamic-desert") return PORT_RECOGNITION_VOICE.ISLAMIC;
  if (city.cityType === "sub-saharan") return PORT_RECOGNITION_VOICE.AFRICAN;
  if (["andean", "mesoamerican", "meso-american", "polynesian"].includes(city.cityType)) {
    return PORT_RECOGNITION_VOICE.AMERICAN;
  }
  return PORT_RECOGNITION_VOICE.MARITIME;
}

function recognitionExpression(kind, personalityId) {
  if (kind === "hero-of-port" || kind === "pirate-scourge" || kind === "conqueror") {
    return personalityId === "austere" ? "attentive" : "pleased";
  }
  if (kind === "peacemaker" || kind === "discoverer") return "thoughtful";
  return personalityId === "cordial" ? "happy" : "attentive";
}

function recencyWeight(eventMinute, simMinute) {
  if (!Number.isFinite(eventMinute) || eventMinute < 0 || eventMinute > simMinute) return 0;
  const daysAgo = (simMinute - eventMinute) / MINUTES_PER_DAY;
  return Math.max(0, 18 - Math.floor(daysAgo / 60));
}

function positiveCount(value) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function assertRecognitionContext({
  gameState,
  city,
  cities,
  personalityId,
  visitCount,
  dayIndex,
  simMinute
}) {
  if (!gameState?.memory || !Number.isFinite(gameState.doubloons)) {
    throw new Error("Captain recognition requires game state");
  }
  if (!city || !Number.isInteger(city.tileId) || typeof city.factionId !== "string") {
    throw new Error("Captain recognition requires a sovereign port");
  }
  if (!Array.isArray(cities) || cities.some((entry) => !Number.isInteger(entry?.tileId))) {
    throw new Error("Captain recognition requires canonical cities");
  }
  if (typeof personalityId !== "string" || personalityId === "") {
    throw new Error("Captain recognition requires a factor personality");
  }
  if (!Number.isInteger(visitCount) || visitCount < 0 || !Number.isInteger(dayIndex) || dayIndex < 0) {
    throw new Error("Captain recognition requires visit and day counts");
  }
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error("Captain recognition requires a simulation minute");
  }
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
