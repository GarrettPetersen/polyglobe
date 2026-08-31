import {
  ABOARD_ROLE_CREWMATE,
  aboardCharacterHomePortCityId
} from "./aboardRoster.js";

const MINUTES_PER_DAY = 24 * 60;
export const CHARACTER_HOMECOMING_COOLDOWN_MINUTES = 30 * MINUTES_PER_DAY;

const SEAFARING_SKILLS = new Set([
  "able-seaman",
  "master-helmsman",
  "master-rigger",
  "navigator"
]);
const COMBAT_SKILLS = new Set([
  "gun-captain",
  "marine-officer",
  "master-gunner"
]);
const FORAGING_SKILLS = new Set([
  "expert-fisher",
  "master-fisher",
  "seasoned-forager",
  "skilled-fisher",
  "veteran-whaler"
]);
const TRADING_SKILLS = new Set([
  "master-negotiator",
  "skilled-negotiator"
]);
const CRAFT_SKILLS = new Set([
  "carpenter",
  "master-shipwright",
  "shipwright",
  "ships-surgeon"
]);

export function nextCharacterHomecoming({
  decisions,
  roster,
  cityId,
  cityName,
  currentMinute,
  historianHomePortCityId = null,
  variantSeed = 0
}) {
  assertHomecomingContext({ decisions, roster, cityId, cityName, currentMinute, variantSeed });
  const candidate = roster.named.find((entry) => {
    if (entry.role !== ABOARD_ROLE_CREWMATE) return false;
    const homePortCityId = aboardCharacterHomePortCityId(entry, { historianHomePortCityId });
    return homePortCityId === cityId && characterHomecomingIsReady(
      decisions,
      entry.character.id,
      currentMinute
    );
  });
  if (!candidate) return null;
  const dialogue = characterHomecomingDialogue(
    candidate.character,
    cityName,
    variantSeed
  );
  return Object.freeze({
    character: candidate.character,
    message: dialogue.message,
    expressionId: dialogue.expressionId
  });
}

export function recordCharacterHomecoming(decisions, characterId, currentMinute) {
  assertDecisions(decisions);
  assertCharacterId(characterId);
  assertMinute(currentMinute);
  decisions[characterHomecomingDecisionKey(characterId)] = currentMinute + 1;
}

export function characterHomecomingDialogue(character, cityName, variantSeed = 0) {
  assertCharacter(character);
  if (typeof cityName !== "string" || cityName.trim() === "") {
    throw new Error("Character homecoming dialogue requires a city name");
  }
  if (!Number.isInteger(variantSeed)) {
    throw new Error(`Invalid character homecoming dialogue variant: ${variantSeed}`);
  }
  const variants = characterHomecomingDialogues(character);
  return variants[Math.abs(variantSeed) % variants.length](cityName.trim());
}

function characterHomecomingIsReady(decisions, characterId, currentMinute) {
  assertDecisions(decisions);
  assertCharacterId(characterId);
  assertMinute(currentMinute);
  const storedMinute = decisions[characterHomecomingDecisionKey(characterId)];
  if (storedMinute === undefined) return true;
  if (!Number.isFinite(storedMinute) || storedMinute <= 0) {
    throw new Error(`Invalid character homecoming memory for ${characterId}: ${storedMinute}`);
  }
  const lastHomecomingMinute = storedMinute - 1;
  return currentMinute - lastHomecomingMinute >= CHARACTER_HOMECOMING_COOLDOWN_MINUTES;
}

function characterHomecomingDecisionKey(characterId) {
  return `crew.homecoming.${characterId}`;
}

function characterHomecomingDialogues(character) {
  if (character.role === "chef") {
    return [
      (cityName) => homecomingLine(
        `${cityName}! I have tasted half the world, captain, and still no kitchen smoke smells so much like supper.`,
        "happy"
      ),
      (cityName) => homecomingLine(
        `Home at last. The world's spices are splendid, but in ${cityName} I know which cook is lying about the stew.`,
        "pleased"
      ),
      (cityName) => homecomingLine(
        `There is ${cityName}. Give me one hour ashore and I will remember every recipe I claimed to improve.`,
        "happy"
      )
    ];
  }
  if (character.role === "historian") {
    return [
      (cityName) => homecomingLine(
        `${cityName} at last. I left to chase history and return with enough of it to empty a tavern.`,
        "pleased"
      ),
      (cityName) => homecomingLine(
        `Home waters, captain. They will not believe half our voyage, so I shall begin with the least impossible parts.`,
        "happy"
      ),
      (cityName) => homecomingLine(
        `I know this harbor by heart. Strange that ${cityName} looks smaller after half the world.`,
        "thoughtful"
      )
    ];
  }
  const skills = new Set(character.skillIds);
  if (hasAnySkill(skills, SEAFARING_SKILLS)) {
    return [
      () => homecomingLine(
        "Home waters. I have steered by strange stars for months, but this channel still sits in the hands.",
        "pleased"
      ),
      (cityName) => homecomingLine(
        `There is ${cityName}. I could find this harbor in fog, asleep, with the chart upside down.`,
        "happy"
      ),
      () => homecomingLine(
        "At last, a coast whose shoals know me by name.",
        "pleased"
      )
    ];
  }
  if (hasAnySkill(skills, COMBAT_SKILLS)) {
    return [
      (cityName) => homecomingLine(
        `${cityName}. I can finally tell our stories to people properly qualified to disbelieve them.`,
        "pleased"
      ),
      () => homecomingLine(
        "Home again. Let us enter quietly, captain, before my reputation arrives ahead of us.",
        "happy"
      ),
      () => homecomingLine(
        "I have faced strange guns across the world. Somehow the harbor watch here still makes me stand straighter.",
        "thoughtful"
      )
    ];
  }
  if (hasAnySkill(skills, FORAGING_SKILLS)) {
    return [
      () => homecomingLine(
        "Home waters, captain. Even the gulls sound as though they are insulting me personally.",
        "happy"
      ),
      (cityName) => homecomingLine(
        `There is ${cityName}. After every strange shore, I had nearly forgotten the color of home water.`,
        "thoughtful"
      ),
      () => homecomingLine(
        "I know what grows, swims, and bites around here. It is good to be somewhere the surprises have names.",
        "pleased"
      )
    ];
  }
  if (hasAnySkill(skills, TRADING_SKILLS)) {
    return [
      (cityName) => homecomingLine(
        `Home at last. I know exactly who in ${cityName} will buy me a drink, and who will pretend not to see me.`,
        "happy"
      ),
      (cityName) => homecomingLine(
        `There is ${cityName}. The world is wide, captain, but home is where everyone remembers what you owe.`,
        "pleased"
      ),
      () => homecomingLine(
        "I have bargained around the world. Here, at least, I know which smiles cost money.",
        "happy"
      )
    ];
  }
  if (hasAnySkill(skills, CRAFT_SKILLS)) {
    return [
      (cityName) => homecomingLine(
        `Home again. I have repaired this ship in half the world's harbors; perhaps ${cityName} can repair me.`,
        "thoughtful"
      ),
      (cityName) => homecomingLine(
        `There is ${cityName}. Let us dock before I notice three things ashore that need mending.`,
        "pleased"
      ),
      () => homecomingLine(
        "After all that ocean, these old quays look sturdier than I remember.",
        "happy"
      )
    ];
  }
  return [
    (cityName) => homecomingLine(
      `${cityName} at last. I had nearly forgotten how a familiar harbor sounds.`,
      "happy"
    ),
    (cityName) => homecomingLine(
      `Home again. The world is wider than I imagined, captain, and ${cityName} dearer than I remembered.`,
      "thoughtful"
    ),
    (cityName) => homecomingLine(
      `There is ${cityName}! Give me one evening ashore and I shall remember why I left.`,
      "pleased"
    )
  ];
}

function homecomingLine(message, expressionId) {
  return Object.freeze({ message, expressionId });
}

function hasAnySkill(characterSkills, soughtSkills) {
  return [...soughtSkills].some((skillId) => characterSkills.has(skillId));
}

function assertHomecomingContext({
  decisions,
  roster,
  cityId,
  cityName,
  currentMinute,
  variantSeed
}) {
  assertDecisions(decisions);
  if (!roster || !Array.isArray(roster.named)) {
    throw new Error("Character homecoming requires an aboard roster");
  }
  if (typeof cityId !== "string" || cityId === "") {
    throw new Error(`Invalid character homecoming city id: ${cityId}`);
  }
  if (typeof cityName !== "string" || cityName.trim() === "") {
    throw new Error("Character homecoming requires a city name");
  }
  assertMinute(currentMinute);
  if (!Number.isInteger(variantSeed)) {
    throw new Error(`Invalid character homecoming variant seed: ${variantSeed}`);
  }
}

function assertDecisions(decisions) {
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
    throw new Error("Character homecoming requires decision memory");
  }
}

function assertCharacter(character) {
  if (!character || typeof character !== "object") {
    throw new Error("Character homecoming dialogue requires a character");
  }
  assertCharacterId(character.id);
  if (!Array.isArray(character.skillIds) || character.skillIds.length === 0) {
    throw new Error(`${character.id} requires skills for homecoming dialogue`);
  }
}

function assertCharacterId(characterId) {
  if (typeof characterId !== "string" || characterId.trim() === "") {
    throw new Error("Character homecoming requires a character id");
  }
}

function assertMinute(currentMinute) {
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid character homecoming minute: ${currentMinute}`);
  }
}
