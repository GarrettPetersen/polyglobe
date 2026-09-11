import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

export async function exerciseCommissionTroops(context, baseUrl) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/src/bootstrap.js*", async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + `
window.commissionReady = () => regularGameLoopStarted && worldFramePresented;
window.inspectCommission = async (profile) => {
  if (startMenu) await continueSavedVoyage();
  gameState.memory.campaignGoal.introSeen = true;
  if (playerIntroModal) closePlayerIntroModal();
  closeAboardMenu();
  const origin = [...cityById.values()].find(city => cityPopulationProfileId(city) === profile);
  if (!origin) throw new Error("No commission origin for " + profile);
  const target = [...cityById.values()].find(city => city.factionId !== origin.factionId && !city.pirateHavenId);
  if (!target) throw new Error("No enemy commission target");
  const quest = { id: "browser-company-" + profile, kind: "capture-port", stage: "capture",
    petitioned: false, originCityId: origin.cityId, originFactionId: origin.factionId, targetCityId: target.cityId, targetName: target.name };
  quest.commissionTroops = createCaptureCommissionTroops(quest, origin,
    { ...origin, population: 300000, isFactionCapital: true }, 0);
  gameState.memory.quests.captureActive = quest;
  const battery = ensureShoreBatteryState(target);
  battery.hitPoints = 0;
  battery.disabledUntilMinute = Math.floor(weatherClockMinutes) + 1000;
  // Inspect the real scenario without scheduling the expensive casualty forecast.
  pendingPortAssaultStart = { session: dialogueState };
  let assault;
  try {
    assault = playerPortConquestStatus(target);
    quest.targetCityId = origin.cityId;
    const elsewhere = playerPortConquestStatus(target);
    if (elsewhere.scenario?.attackers.some(t => t.auxiliary)) {
      throw new Error("Commission troops joined an unrelated assault");
    }
  } finally {
    quest.targetCityId = target.cityId;
    pendingPortAssaultStart = null;
  }
  if (!assault.canAttempt || assault.scenario.attackers.filter(t => t.auxiliary).length !== quest.commissionTroops.length) {
    throw new Error("Commissioned company missing from target assault");
  }
  window.finishCommissionInspection = () => {
    advanceCapturePortMissionAfterConquest(gameState, target, {
      cityId: target.cityId, newFactionId: origin.factionId, source: "player"
    }, Math.floor(weatherClockMinutes));
    return { aboard: currentCaptureCommissionTravelerPeople().length,
      ashore: commissionGarrisonTroops(gameState.memory.quests, { ...target, factionId: origin.factionId }).length };
  };
  const troops = currentCaptureCommissionTravelerPeople();
  const roster = currentAboardRoster();
  const manifest = roster.generic.filter(entry => entry.travelerPerson &&
    troops.some(troop => troop.id === entry.travelerPerson.id));
  if (manifest.length !== troops.length) throw new Error("Commission manifest lost soldiers");
  openAboardMenu();
  const first = manifest[0];
  aboardMenu.focusedEntryId = first.id;
  dirty = true;
  return { count: troops.length, appearances: troops.map(t => t.appearanceId),
    ids: troops.map(t => t.id), unrelated: captureCommissionTroopsForAssault(quest, "unrelated-city").length };
};` });
  });
  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.commissionReady?.(), null, { timeout: 180000 });
    mkdirSync(".playtest/commission-troops", { recursive: true });
    for (const profile of ["european", "japanese"]) {
      const result = await page.evaluate(profile => window.inspectCommission(profile), profile);
      assert.ok(result.count >= 3 && result.count <= 6);
      assert.equal(new Set(result.ids).size, result.count);
      assert.equal(result.unrelated, 0);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `.playtest/commission-troops/${profile}.png` });
      const stationed = await page.evaluate(() => window.finishCommissionInspection());
      assert.equal(stationed.aboard, 0);
      assert.equal(stationed.ashore, result.count);
      assert.deepEqual(errors, []);
      console.log(`Commission manifest ${profile}: ${result.count} soldiers (${result.appearances[0]})`);
    }
  } finally { await page.close(); }
}
