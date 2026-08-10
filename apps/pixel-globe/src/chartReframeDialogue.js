export const CHART_REFRAME_DIALOGUE_MEMORY_VERSION = 1;
export const CHART_REFRAME_DIALOGUE_COOLDOWN_MINUTES = 21 * 24 * 60;
export const CHART_REFRAME_DIALOGUE_CATASTROPHIC_COOLDOWN_MINUTES = 3 * 24 * 60;
export const CHART_REFRAME_DIALOGUE_CONFIRMATION_MS = 20_000;
export const CHART_REFRAME_DIALOGUE_CATASTROPHIC_CONFIRMATION_MS = 6_000;

export function chartReframeDialoguePortraitStage({ captain, counterpart = null, speaker }) {
  for (const [label, character] of Object.entries({ captain, speaker })) {
    if (!character || typeof character.id !== "string" || character.id.length === 0) {
      throw new Error(`Chart reframe dialogue requires a valid ${label}`);
    }
  }
  if (counterpart === null) {
    if (speaker.id !== captain.id) {
      throw new Error(`Chart reframe dialogue speaker ${speaker.id} has no counterpart`);
    }
    return Object.freeze({
      leftCharacter: speaker,
      rightCharacter: null,
      speakerCharacter: speaker
    });
  }
  if (typeof counterpart.id !== "string" || counterpart.id.length === 0) {
    throw new Error("Chart reframe dialogue requires a valid counterpart");
  }
  if (counterpart.id === captain.id) {
    throw new Error(`Chart reframe dialogue participants must be distinct: ${captain.id}`);
  }
  if (![captain.id, counterpart.id].includes(speaker.id)) {
    throw new Error(`Chart reframe dialogue speaker ${speaker.id} is outside the staged pair`);
  }
  return Object.freeze({
    leftCharacter: captain,
    rightCharacter: counterpart,
    speakerCharacter: speaker
  });
}

const RECENT_DIALOGUE_LIMIT = 12;
const RECENT_CATEGORY_LIMIT = 4;
const RECENT_PORT_LIMIT = 4;

const CAMPAIGN_GOAL_EXPLORER = "explorer";
const CAMPAIGN_GOAL_FAMILY_DEBT = "family-debt";
const CAMPAIGN_GOAL_WHITE_WHALE = "white-whale-revenge";
const CAMPAIGN_GOAL_TREASURE = "pirate-treasure";

const TINY_SHIP_SLUGS = new Set([
  "dhow", "sampan", "felucca", "fusta", "japanese-kuribune",
  "mesoamerican-dugout-canoe", "nusantaran-outrigger"
]);
const LARGE_SHIP_SLUGS = new Set([
  "large-junk", "javanese-jong", "galleass", "galleon", "ship-of-the-line",
  "spanish-nao", "portuguese-carrack", "carrack"
]);
const OARED_SHIP_SLUGS = new Set([
  "fusta", "mediterranean-galley", "galleass", "viking-longship", "joseon-hyeopseon",
  "joseon-panokseon", "joseon-turtle-ship", "japanese-kuribune", "japanese-kobaya",
  "japanese-sekibune", "japanese-atakebune", "sampan", "mesoamerican-dugout-canoe",
  "nusantaran-outrigger", "kelulus", "penjajap", "lancaran", "royal-lancaran"
]);

export function createChartReframeDialogueMemory() {
  return {
    version: CHART_REFRAME_DIALOGUE_MEMORY_VERSION,
    shownIds: [],
    recentIds: [],
    recentCategories: [],
    recentPortTileIds: [],
    lastShownMinute: null,
    shownCount: 0
  };
}

export function migrateChartReframeDialogueMemory(memory) {
  if (!memory) return createChartReframeDialogueMemory();
  validateChartReframeDialogueMemory(memory);
  return memory;
}

export function validateChartReframeDialogueMemory(memory) {
  if (!memory || memory.version !== CHART_REFRAME_DIALOGUE_MEMORY_VERSION) {
    throw new Error(`Unsupported chart reframe dialogue memory: ${memory?.version ?? "missing"}`);
  }
  validateStringArray(memory.shownIds, "shown ids", CHART_REFRAME_DIALOGUES.length);
  validateStringArray(memory.recentIds, "recent ids", RECENT_DIALOGUE_LIMIT);
  validateStringArray(memory.recentCategories, "recent categories", RECENT_CATEGORY_LIMIT);
  if (!Array.isArray(memory.recentPortTileIds) ||
      memory.recentPortTileIds.length > RECENT_PORT_LIMIT ||
      memory.recentPortTileIds.some((id) => !Number.isInteger(id))) {
    throw new Error("Chart reframe dialogue has invalid recent ports");
  }
  if (memory.lastShownMinute !== null &&
      (!Number.isFinite(memory.lastShownMinute) || memory.lastShownMinute < 0)) {
    throw new Error(`Chart reframe dialogue has invalid last shown minute: ${memory.lastShownMinute}`);
  }
  if (!Number.isInteger(memory.shownCount) || memory.shownCount < 0) {
    throw new Error(`Chart reframe dialogue has invalid shown count: ${memory.shownCount}`);
  }
  for (const id of [...memory.shownIds, ...memory.recentIds]) requiredDialogue(id);
  return memory;
}

export function recordChartReframePortVisit(memory, tileId) {
  validateChartReframeDialogueMemory(memory);
  if (!Number.isInteger(tileId)) throw new Error(`Chart reframe port visit requires a tile id: ${tileId}`);
  memory.recentPortTileIds = [
    tileId,
    ...memory.recentPortTileIds.filter((id) => id !== tileId)
  ].slice(0, RECENT_PORT_LIMIT);
  return memory.recentPortTileIds;
}

export function createChartReframeDialogueTrigger() {
  return { key: null, sinceMs: null };
}

export function advanceChartReframeDialogueTrigger(trigger, { drift, terrainTear, nowMs }) {
  validateTrigger(trigger);
  validateFaultMetrics(drift, terrainTear, nowMs);
  const severity = chartReframeDialogueFaultSeverity(drift, terrainTear);
  if (severity === "none") return Object.freeze({ trigger: createChartReframeDialogueTrigger(), ready: false, severity });
  const key = severity;
  const sinceMs = trigger.key === key && trigger.sinceMs !== null ? trigger.sinceMs : nowMs;
  const next = { key, sinceMs };
  const confirmationMs = severity === "catastrophic"
    ? CHART_REFRAME_DIALOGUE_CATASTROPHIC_CONFIRMATION_MS
    : CHART_REFRAME_DIALOGUE_CONFIRMATION_MS;
  return Object.freeze({
    trigger: next,
    ready: nowMs - sinceMs >= confirmationMs,
    severity
  });
}

export function chartReframeDialogueFaultSeverity(drift, terrainTear) {
  validateFaultMetrics(drift, terrainTear, 0);
  if (
    Math.abs(drift.rotationDeg) >= 14 ||
    drift.rmsDistortionPx >= 24 ||
    drift.maxDistortionPx >= 45 ||
    terrainTear.extraPx >= 32
  ) return "catastrophic";
  if (
    Math.abs(drift.rotationDeg) >= 8 ||
    drift.rmsDistortionPx >= 12 ||
    drift.maxDistortionPx >= 26 ||
    terrainTear.extraPx >= 18
  ) return "severe";
  return "none";
}

export function chartReframeDialogueCooldownElapsed(memory, currentMinute, severity = "severe") {
  validateChartReframeDialogueMemory(memory);
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Chart reframe dialogue requires a valid minute: ${currentMinute}`);
  }
  if (!["severe", "catastrophic"].includes(severity)) {
    throw new Error(`Chart reframe dialogue has invalid severity: ${severity}`);
  }
  if (memory.lastShownMinute === null) return true;
  const cooldown = severity === "catastrophic"
    ? CHART_REFRAME_DIALOGUE_CATASTROPHIC_COOLDOWN_MINUTES
    : CHART_REFRAME_DIALOGUE_COOLDOWN_MINUTES;
  return currentMinute - memory.lastShownMinute >= cooldown;
}

export function chartDialogueRegionTags({ latitudeDeg, longitudeDeg, raining = false }) {
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90 ||
      !Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180 ||
      typeof raining !== "boolean") {
    throw new Error("Chart dialogue region tags require valid coordinates and rain state");
  }
  const tags = new Set();
  const absLat = Math.abs(latitudeDeg);
  if (latitudeDeg >= 58) tags.add("polar-north");
  if (latitudeDeg <= -52) tags.add("polar-south");
  if (absLat <= 22) tags.add("tropical");
  if (latitudeDeg >= 28 && latitudeDeg <= 47 && longitudeDeg >= -12 && longitudeDeg <= 42) {
    tags.add("mediterranean");
  }
  if (latitudeDeg >= 12 && latitudeDeg <= 35 && longitudeDeg >= -20 && longitudeDeg <= 62) {
    tags.add("hot-dry");
  }
  if (longitudeDeg >= 35 && longitudeDeg <= 120 && latitudeDeg >= -42 && latitudeDeg <= 30) {
    tags.add("indian-ocean");
  }
  if (longitudeDeg >= 100 && longitudeDeg <= 150 && latitudeDeg >= 15 && latitudeDeg <= 55) {
    tags.add("east-asia");
  }
  if (longitudeDeg >= -80 && longitudeDeg <= 20 && latitudeDeg >= -55 && latitudeDeg <= 65) {
    tags.add("atlantic");
  }
  if ((longitudeDeg <= -80 || longitudeDeg >= 120) && latitudeDeg >= -55 && latitudeDeg <= 58) {
    tags.add("pacific");
  }
  if (raining && absLat <= 30) tags.add("humid");
  return Object.freeze([...tags]);
}

export function selectChartReframeDialogue(memory, context, randomUnit = Math.random()) {
  validateChartReframeDialogueMemory(memory);
  validateDialogueContext(context);
  if (!Number.isFinite(randomUnit) || randomUnit < 0 || randomUnit >= 1) {
    throw new Error(`Chart reframe dialogue random unit is invalid: ${randomUnit}`);
  }
  let eligible = CHART_REFRAME_DIALOGUES.filter((entry) => entry.eligible(context));
  const withoutRecent = eligible.filter((entry) => !memory.recentIds.includes(entry.id));
  if (withoutRecent.length > 0) eligible = withoutRecent;
  const unseen = eligible.filter((entry) => !memory.shownIds.includes(entry.id));
  if (unseen.length > 0) eligible = unseen;
  const freshCategories = eligible.filter((entry) => !memory.recentCategories.includes(entry.category));
  if (freshCategories.length > 0) eligible = freshCategories;
  if (eligible.length === 0) throw new Error("No chart reframe dialogue is eligible");

  const maximumSpecificity = Math.max(...eligible.map((entry) => entry.specificity));
  const pool = eligible.filter((entry) => entry.specificity === maximumSpecificity);
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = randomUnit * totalWeight;
  let selected = pool[pool.length - 1];
  for (const entry of pool) {
    cursor -= entry.weight;
    if (cursor < 0) {
      selected = entry;
      break;
    }
  }
  return Object.freeze({
    id: selected.id,
    category: selected.category,
    steps: Object.freeze(selected.steps.map((step) => Object.freeze({ ...step })))
  });
}

export function recordChartReframeDialogue(memory, selection, currentMinute) {
  validateChartReframeDialogueMemory(memory);
  const entry = requiredDialogue(selection?.id);
  if (entry.category !== selection.category) {
    throw new Error(`Chart reframe dialogue category mismatch: ${selection?.id}`);
  }
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Chart reframe dialogue requires a valid minute: ${currentMinute}`);
  }
  if (!memory.shownIds.includes(entry.id)) memory.shownIds.push(entry.id);
  memory.recentIds = [entry.id, ...memory.recentIds.filter((id) => id !== entry.id)]
    .slice(0, RECENT_DIALOGUE_LIMIT);
  memory.recentCategories = [entry.category, ...memory.recentCategories.filter((id) => id !== entry.category)]
    .slice(0, RECENT_CATEGORY_LIMIT);
  memory.lastShownMinute = currentMinute;
  memory.shownCount += 1;
  return memory;
}

export function formatChartReframeDialogueMessage(message, replacements = []) {
  if (typeof message !== "string" || message.trim() === "" || !Array.isArray(replacements)) {
    throw new Error("Chart reframe dialogue formatting requires text and replacements");
  }
  return message.replace(/\{(\d+)\}/g, (_token, rawIndex) => {
    const replacement = replacements[Number(rawIndex)];
    if (replacement === undefined) throw new Error(`Missing chart dialogue replacement ${rawIndex}: ${message}`);
    return String(replacement);
  });
}

export const CHART_REFRAME_DIALOGUES = Object.freeze([
  dialogue("aurora-watch", "region", 5, (c) => c.regions.includes("polar-north") && c.hasCrew, [
    dialogueLine("crew", "Look north, Captain. The lights are sailing across the sky.", "surprised"),
    dialogueLine("captain", "Then let the helmsman have one glance before we lose the channel.", "amused")
  ]),
  dialogue("northern-cold", "region", 4, (c) => c.regions.includes("polar-north"), [
    dialogueLine("captain", "The ink is freezing in the logbook. Beat some life back into your hands.", "concerned")
  ]),
  dialogue("southern-ice", "region", 4, (c) => c.regions.includes("polar-south"), [
    dialogueLine("captain", "Ice to every quarter, and not a chimney in the world. Keep a sharp watch.", "attentive")
  ]),
  dialogue("tropical-humidity", "region", 4, (c) => c.regions.includes("humid") && c.hasCrew, [
    dialogueLine("crew", "My shirt has been wet for three days, and none of it came from the sea.", "annoyed"),
    dialogueLine("captain", "Call it tropical tailoring and keep your watch.", "amused")
  ]),
  dialogue("desert-heat", "region", 4, (c) => c.regions.includes("hot-dry"), [
    dialogueLine("captain", "Even the sea feels baked along this coast. Shade the water casks.", "concerned")
  ]),
  dialogue("mediterranean-air", "region", 4, (c) => c.regions.includes("mediterranean") && c.hasCrew, [
    dialogueLine("crew", "Warm stone, pine smoke, and somebody's supper on the wind. The Mediterranean again.", "happy")
  ]),
  dialogue("atlantic-swell", "region", 4, (c) => c.regions.includes("atlantic") && !c.isRiver, [
    dialogueLine("captain", "That long Atlantic swell has found us. Loose knees, steady hands.", "attentive")
  ]),
  dialogue("pacific-vastness", "region", 4, (c) => c.regions.includes("pacific") && !c.isRiver, [
    dialogueLine("captain", "A sea this wide makes every compass mark feel like a promise.", "thoughtful")
  ]),
  dialogue("indian-ocean-wind", "region", 4, (c) => c.regions.includes("indian-ocean") && c.hasCrew, [
    dialogueLine("crew", "The wind smells of rain and spice. It knows the Indian Ocean better than we do.", "attentive")
  ]),
  dialogue("east-asian-mist", "region", 4, (c) => c.regions.includes("east-asia"), [
    dialogueLine("captain", "Mist ahead. Mark every headland twice and trust no pale shape at first glance.", "attentive")
  ]),
  dialogue("river-current", "region", 5, (c) => c.isRiver && c.hasCrew, [
    dialogueLine("crew", "The current is writing its own course beneath us.", "thoughtful"),
    dialogueLine("captain", "Read it, then. A river punishes captains who only watch the banks.", "attentive")
  ]),
  dialogue("captain-alone-log", "company", 4, (c) => !c.hasCrew, [
    dialogueLine("captain", "Captain's log: the crew is quiet because the crew is me. An efficient meeting.", "amused")
  ]),
  dialogue("small-company", "company", 3, (c) => c.namedPeopleCount === 2, [
    dialogueLine("crew", "It is strange how large the sea sounds with so few voices aboard.", "thoughtful"),
    dialogueLine("captain", "Then we had better make our two voices carry.", "happy")
  ]),
  dialogue("crowded-company", "company", 4, (c) => c.peopleAboard >= Math.max(16, c.crewCapacity), [
    dialogueLine("crew", "There is nowhere left to sit that is not a coil of rope or somebody else's boot.", "annoyed"),
    dialogueLine("captain", "Luxury. On my first berth, the rope complained about me.", "amused")
  ]),
  dialogue("panda-compass", "animal", 6, (c) => c.companionIds.includes("panda") && c.hasCrew, [
    dialogueLine("crew", "The panda has been sitting on the compass for half an hour.", "concerned"),
    dialogueLine("captain", "Then we are steering by a very stubborn north.", "amused")
  ]),
  dialogue("panda-watch", "animal", 5, (c) => c.companionIds.includes("panda"), [
    dialogueLine("animal:panda", "Meee-eh!", "happy", "bleat"),
    dialogueLine("captain", "No, sleeping through the watch does not count as standing it.", "amused")
  ]),
  dialogue("penguin-fish", "animal", 6, (c) => c.companionIds.includes("penguin") && c.cargoGoodIds.includes("fish"), [
    dialogueLine("animal:penguin", "Honk-hraaa!", "attentive", "bray"),
    dialogueLine("captain", "The penguin has audited the fish again. Apparently we are one short.", "amused")
  ]),
  dialogue("raccoon-biscuits", "animal", 6, (c) => c.companionIds.includes("raccoon") && c.hasCrew, [
    dialogueLine("captain", "The raccoon has learned how the biscuit locker opens. Hand over the key.", "annoyed"),
    dialogueLine("animal:raccoon", "Chrrr-chrrr-chrrr!", "mischievous", "chitter")
  ]),
  dialogue("raccoon-instruments", "animal", 6, (c) => c.companionIds.includes("raccoon") && c.itemIds.includes("pilots-instruments"), [
    dialogueLine("captain", "Put down the cross-staff. You are not the pilot.", "annoyed"),
    dialogueLine("animal:raccoon", "Chrrrp.", "mischievous", "chitter")
  ]),
  dialogue("animal-council", "animal", 7, (c) => c.companionIds.length >= 2 && c.hasCrew, [
    dialogueLine("crew", "The animals are holding another council by the mast.", "amused"),
    dialogueLine("captain", "If they alter course, wake me before they promote themselves.", "happy")
  ]),
  dialogue("wine-tasting", "cargo", 5, (c) => c.cargoGoodIds.includes("wine") && c.hasCrew, [
    dialogueLine("crew", "One cask of wine has begun leaking. We may need to test whether it has spoiled.", "hopeful"),
    dialogueLine("captain", "With a cup, not the bucket you are hiding behind your back.", "amused")
  ]),
  dialogue("fish-smell", "cargo", 4, (c) => c.cargoGoodIds.includes("fish") && c.hasCrew, [
    dialogueLine("crew", "Do you think the fish smell us coming, or have they gone mercifully numb?", "annoyed")
  ]),
  dialogue("tea-brew", "cargo", 5, (c) => c.cargoGoodIds.includes("tea") && c.hasCrew, [
    dialogueLine("crew", "A pinch of the tea would improve this watch beyond recognition.", "hopeful"),
    dialogueLine("captain", "A pinch. The rest still belongs to our buyer.", "attentive")
  ]),
  dialogue("spice-sneeze", "cargo", 5, (c) => c.cargoGoodIds.some((id) => ["pepper", "cinnamon", "cloves", "nutmeg", "ginger"].includes(id)), [
    dialogueLine("captain", "Seal those spice bales. Half the crew is sneezing us off course.", "annoyed")
  ]),
  dialogue("fur-fashion", "cargo", 5, (c) => c.cargoGoodIds.includes("furs") && c.hasCrew, [
    dialogueLine("crew", "How do I look in these furs?", "happy"),
    dialogueLine("captain", "Expensive. Take them off before the merchant charges us for wearing the cargo.", "amused")
  ]),
  dialogue("silk-fashion", "cargo", 5, (c) => c.cargoGoodIds.some((id) => ["silk", "silk-cloth"].includes(id)) && c.hasCrew, [
    dialogueLine("crew", "This silk makes even a salt-stiff sailor look fit for court.", "happy"),
    dialogueLine("captain", "Court can have it. I need you fit for the next watch.", "amused")
  ]),
  dialogue("porcelain-rattle", "cargo", 5, (c) => c.cargoGoodIds.includes("porcelain"), [
    dialogueLine("captain", "Something in the porcelain crate rattled. Lash it again before profit becomes crockery.", "concerned")
  ]),
  dialogue("gold-watch", "cargo", 5, (c) => c.cargoGoodIds.some((id) => ["gold", "silver"].includes(id)) && c.hasCrew, [
    dialogueLine("captain", "Double the watch by the precious metal. Greed swims farther than any pirate.", "attentive")
  ]),
  dialogue("recent-port-admirer", "recent-port", 6, (c) => c.recentPortNames.length > 0 && c.hasMaleCrew, [
    dialogueLine("male-crew", "I wonder whether the girl I met in {0} still watches the harbor.", "thoughtful", null, ["recentPort"]),
    dialogueLine("captain", "Steer well enough to return, and perhaps you can ask her.", "amused")
  ]),
  dialogue("recent-port-market", "recent-port", 5, (c) => c.recentPortNames.length > 0 && c.hasCrew, [
    dialogueLine("crew", "The market at {0} already feels a world away.", "thoughtful", null, ["recentPort"]),
    dialogueLine("captain", "That is the sea's favorite trick.", "attentive")
  ]),
  dialogue("home-port-memory", "home", 5, (c) => Boolean(c.homePortName) && c.hasCrew, [
    dialogueLine("crew", "Is the weather always this contrary back in {0}?", "annoyed", null, ["homePort"]),
    dialogueLine("captain", "In {0}, it at least has the decency to be familiar.", "amused", null, ["homePort"])
  ]),
  dialogue("family-debt", "mission", 6, (c) => c.campaignGoalType === CAMPAIGN_GOAL_FAMILY_DEBT, [
    dialogueLine("captain", "Every league must bring us closer to clearing the family debt. I will not return to {0} empty-handed.", "determined", null, ["homePort"])
  ]),
  dialogue("explorer-goal", "mission", 6, (c) => c.campaignGoalType === CAMPAIGN_GOAL_EXPLORER, [
    dialogueLine("captain", "There are still wonders beyond this horizon. The patron's book will not fill itself.", "determined")
  ]),
  dialogue("white-whale-goal", "mission", 6, (c) => c.campaignGoalType === CAMPAIGN_GOAL_WHITE_WHALE, [
    dialogueLine("captain", "Somewhere beyond this water, the white whale still breathes. So do I.", "determined")
  ]),
  dialogue("treasure-goal", "mission", 6, (c) => c.campaignGoalType === CAMPAIGN_GOAL_TREASURE, [
    dialogueLine("captain", "A scrap of the old captain's map is worth more than a hold of guesses. Keep watch for pirate colors.", "determined")
  ]),
  dialogue("damaged-hull", "damage", 7, (c) => c.damageRatio >= 0.25 && c.hasCrew, [
    dialogueLine("crew", "That patch is sweating again, Captain.", "concerned"),
    dialogueLine("captain", "Then brace it and mind the pumps. This hull reaches port with us.", "determined")
  ]),
  dialogue("badly-damaged-hull", "damage", 8, (c) => c.damageRatio >= 0.55, [
    dialogueLine("captain", "The ship has taken worse than I care to count. Easy helm until the timbers forgive us.", "concerned")
  ]),
  dialogue("tiny-ship", "ship", 6, (c) => TINY_SHIP_SLUGS.has(c.shipSlug) && c.hasCrew, [
    dialogueLine("crew", "If I breathe in, someone else has to breathe out. This vessel is all elbows.", "annoyed"),
    dialogueLine("captain", "Small hull, small target. Think grateful thoughts.", "amused")
  ]),
  dialogue("large-ship", "ship", 6, (c) => LARGE_SHIP_SLUGS.has(c.shipSlug) && c.hasCrew, [
    dialogueLine("crew", "I shouted an order aft and heard it echo back as a rumor.", "amused"),
    dialogueLine("captain", "Then this great ship may finally be large enough for the crew's gossip.", "happy")
  ]),
  dialogue("turtle-ship", "ship", 8, (c) => c.shipSlug === "joseon-turtle-ship", [
    dialogueLine("captain", "A floating turtle, iron-backed and stubborn. I begin to understand the name.", "proud")
  ]),
  dialogue("viking-longship", "ship", 8, (c) => c.shipSlug === "viking-longship" && c.hasCrew, [
    dialogueLine("crew", "These oar benches have outlived kingdoms. My back may not outlive the watch.", "annoyed"),
    dialogueLine("captain", "Row like a saga is watching.", "amused")
  ]),
  dialogue("oared-ship", "ship", 5, (c) => OARED_SHIP_SLUGS.has(c.shipSlug) && c.hasCrew, [
    dialogueLine("crew", "The oars have found their rhythm. Even the hull sounds more certain.", "happy")
  ]),
  dialogue("pilots-instruments", "item", 7, (c) => c.itemIds.includes("pilots-instruments") && c.hasCrew, [
    dialogueLine("crew", "Cross-staff, compass, tables. With all these instruments, surely one can tell us where breakfast went.", "amused"),
    dialogueLine("captain", "The compass points to duty. Try that first.", "attentive")
  ]),
  dialogue("surgeons-chest", "item", 7, (c) => c.itemIds.includes("surgeons-chest") && c.hasCrew, [
    dialogueLine("crew", "The surgeon says the chest is for emergencies, not splinters.", "annoyed"),
    dialogueLine("captain", "On this ship, splinters submit a petition and wait their turn.", "amused")
  ]),
  dialogue("fine-sailcloth", "item", 7, (c) => c.itemIds.some((id) => ["flemish-sailcloth", "lateen-sailcloth"].includes(id)) && c.hasCrew, [
    dialogueLine("crew", "That fine canvas draws cleanly. You can feel it in the deck.", "happy"),
    dialogueLine("captain", "Treat it kindly. It cost enough to have opinions.", "amused")
  ]),
  dialogue("bronze-hooks", "item", 7, (c) => c.itemIds.includes("bronze-fish-hooks") && c.hasCrew, [
    dialogueLine("crew", "The bronze hooks are polished, counted, and eager for work.", "happy"),
    dialogueLine("captain", "Unlike half this watch. Set an example for them.", "amused")
  ]),
  dialogue("low-food", "supplies", 7, (c) => c.foodDays <= 3, [
    dialogueLine("captain", "Three days of food or less. Count every ration, then count it again.", "concerned")
  ]),
  dialogue("low-water", "supplies", 8, (c) => c.waterDays <= 3, [
    dialogueLine("captain", "The casks are nearly dry. No wasted cup, no wasted hour.", "concerned")
  ]),
  dialogue("night-stars", "weather", 3, (c) => c.localHour >= 20 || c.localHour < 4, [
    dialogueLine("captain", "A clear star, a steady bearing, and another mile made good. That is enough for tonight.", "thoughtful")
  ]),
  dialogue("dawn-watch", "weather", 3, (c) => c.localHour >= 4 && c.localHour < 7, [
    dialogueLine("captain", "Dawn watch. The sea changes color before it changes its mind.", "attentive")
  ]),
  dialogue("ordinary-watch", "watch", 1, () => true, [
    dialogueLine("captain", "Hold this course a moment. I want the bearings checked against the log.", "attentive")
  ])
]);

const DIALOGUE_BY_ID = new Map(CHART_REFRAME_DIALOGUES.map((entry) => [entry.id, entry]));
if (DIALOGUE_BY_ID.size !== CHART_REFRAME_DIALOGUES.length) {
  throw new Error("Chart reframe dialogue catalog contains duplicate ids");
}

function dialogue(id, category, specificity, eligible, steps, weight = 1) {
  if (typeof id !== "string" || id === "" || typeof category !== "string" || category === "" ||
      !Number.isInteger(specificity) || specificity < 1 || typeof eligible !== "function" ||
      !Array.isArray(steps) || steps.length === 0 || !Number.isFinite(weight) || weight <= 0) {
    throw new Error(`Invalid chart reframe dialogue: ${id}`);
  }
  return Object.freeze({
    id,
    category,
    specificity,
    eligible,
    weight,
    steps: Object.freeze(steps)
  });
}

function dialogueLine(speaker, message, expressionId = "neutral", animalSoundKind = null, replacements = []) {
  if (typeof speaker !== "string" || speaker === "" || typeof message !== "string" || message === "") {
    throw new Error("Invalid chart reframe dialogue step");
  }
  return Object.freeze({
    speaker,
    message,
    expressionId,
    animalSoundKind,
    replacements: Object.freeze(replacements)
  });
}

function requiredDialogue(id) {
  const entry = DIALOGUE_BY_ID.get(id);
  if (!entry) throw new Error(`Unknown chart reframe dialogue: ${id}`);
  return entry;
}

function validateStringArray(value, label, maximumLength) {
  if (!Array.isArray(value) || value.length > maximumLength ||
      value.some((entry) => typeof entry !== "string" || entry === "")) {
    throw new Error(`Chart reframe dialogue has invalid ${label}`);
  }
}

function validateTrigger(trigger) {
  if (!trigger || ![null, "severe", "catastrophic"].includes(trigger.key) ||
      (trigger.sinceMs !== null && (!Number.isFinite(trigger.sinceMs) || trigger.sinceMs < 0))) {
    throw new Error("Chart reframe dialogue has invalid trigger state");
  }
}

function validateFaultMetrics(drift, terrainTear, nowMs) {
  if (!drift || !terrainTear || !Number.isFinite(nowMs) || nowMs < 0 ||
      !Number.isFinite(drift.rotationDeg) || !Number.isFinite(drift.rmsDistortionPx) ||
      !Number.isFinite(drift.maxDistortionPx) || !Number.isFinite(terrainTear.extraPx)) {
    throw new Error("Chart reframe dialogue requires finite fault metrics");
  }
}

function validateDialogueContext(context) {
  if (!context || !Array.isArray(context.regions) || !Array.isArray(context.companionIds) ||
      !Array.isArray(context.cargoGoodIds) || !Array.isArray(context.itemIds) ||
      !Array.isArray(context.recentPortNames) || typeof context.hasCrew !== "boolean" ||
      typeof context.hasMaleCrew !== "boolean" || typeof context.isRiver !== "boolean" ||
      !Number.isInteger(context.namedPeopleCount) || !Number.isInteger(context.peopleAboard) ||
      !Number.isInteger(context.crewCapacity) || !Number.isFinite(context.damageRatio) ||
      !Number.isFinite(context.foodDays) || !Number.isFinite(context.waterDays) ||
      !Number.isFinite(context.localHour) || typeof context.shipSlug !== "string") {
    throw new Error("Chart reframe dialogue requires complete voyage context");
  }
}
