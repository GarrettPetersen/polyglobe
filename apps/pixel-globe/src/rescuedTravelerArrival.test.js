import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as rescued from "./rescuedTravelerQuest.js";
import * as captive from "./pirateCaptiveQuest.js";
import { requireCityId } from "./entityIds.js";

// Execute the production arrival adapter with real quest transitions. Testing
// constructors alone missed the runtime caller still passing a tile as identity.
const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const functions = ["rescuedTravelerAtHome", "createRescuedTravelerHomecomingSession"]
  .map((name) => {
    const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name.text === name);
    assert.ok(declaration, name);
    return declaration.getText(source);
  }).join("\n");
const home = { cityId: "porto|portugal", tileId: 41, city: "Porto", country: "Portugal" };
const wanted = { cityId: "lisbon|portugal", tileId: 72, city: "Lisbon", country: "Portugal",
  factionId: "portugal", character: { id: "authority:lisbon", name: "Governor" } };
const character = { id: "rescued:traveler", name: "Brites Pereira", givenName: "Brites", familyName: "Pereira",
  sex: "female", age: 24, nameCulture: "portuguese", skillIds: ["able-seaman"],
  expressions: [{ id: "sad", src: "sad.png" }, { id: "happy", src: "happy.png" }] };

for (const type of ["pirate-captive", "castaway", "detained"]) {
  for (const familySurvivedRoll of [0.1, 0.8]) {
    test(`runtime ${type} arrival preserves canonical identity and resumes its homecoming`, () => {
      const memory = rescued.createRescuedTravelerQuestMemory();
      const options = { homePort: home, wantedPort: wanted, character,
        familyMember: familySurvivedRoll < 0.5 ? { ...character, id: "relative", name: "Joana Pereira", givenName: "Joana" } : null,
        distanceKm: 1000, familySurvivedRoll };
      const quest = type === "castaway"
        ? rescued.createRescuedTravelerQuest(memory, { ...options, rescueType: "castaway", sourceId: "wreck" })
        : captive.createPirateCaptiveQuest(memory, { ...options, pirateShipId: "pirate", sourceTileId: 12,
            captiveKindRoll: type === "detained" ? 0.05 : 0.9 });
      rescued.acceptRescuedTravelerQuest(memory, quest.id);
      if (type === "detained") {
        captive.warnPirateCaptive(quest, "witness");
        captive.confrontPirateCaptive(quest, { weaponItemId: "katana", currentMinute: 100 });
      }
      const createArrival = runInNewContext(`${functions}\ncreateRescuedTravelerHomecomingSession`, {
        ...rescued, ...captive, requireCityId, gameState: {},
        activeRescuedTravelers: () => [quest], rescuedTravelerMemoryForType: () => memory,
        prepareHighValueMissionPerkItem: () => null
      });
      const destination = type === "detained" ? wanted : home;
      const settings = { admittedToPort: true, continueToPortOnClose: true };
      assert.equal(createArrival({ ...destination, cityId: "wrong|port" }, settings), null);
      for (const tileId of [destination.tileId, destination.tileId + 1000]) {
        const session = createArrival({ ...destination, tileId }, settings);
        assert.equal(session.cityId, destination.cityId);
        assert.equal(Object.hasOwn(session, "cityTileId"), false);
        assert.equal(session.phase, type === "detained" ? "authority" : "homecoming");
        const view = type === "castaway" ? rescued.rescuedTravelerDialogueView(session, quest)
          : captive.pirateCaptiveDialogueView(session, quest);
        assert.ok(view.options.length > 0);
      }
    });
  }
}
