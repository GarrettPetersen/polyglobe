import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile(
  "main.js",
  readFileSync(new URL("./main.js", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true
);

function declaration(name) {
  const node = source.statements.find((statement) => (
    ts.isFunctionDeclaration(statement) && statement.name?.text === name
  ));
  assert.ok(node, `Missing function ${name}`);
  return node;
}

test("capture markets require a fully visible city scene behind their dialogue", () => {
  const context = createTradeCaptureContext();
  const stagedUpdate = runInNewContext(
    `${declaration("updateCaptureTrade").getText(source)};updateCaptureTrade`,
    context
  );
  const sequence = {
    cityId: "thessaloniki|greece",
    factorPortraitSourceId: "factor",
    variant: "sell",
    transactionCount: 5
  };

  context.activeCue = "enter-market-city";
  stagedUpdate(sequence);
  assert.equal(context.portCityView.cityId, sequence.cityId);

  context.activeCue = "open-market";
  stagedUpdate(sequence);
  assert.equal(context.dialogueState.nodeId, "market");

  const notReadyContext = createTradeCaptureContext();
  notReadyContext.portCityView = { cityId: sequence.cityId, sceneReady: true };
  notReadyContext.portCityTransition = { direction: "enter" };
  const notReadyUpdate = runInNewContext(
    `${declaration("updateCaptureTrade").getText(source)};updateCaptureTrade`,
    notReadyContext
  );
  assert.throws(() => notReadyUpdate(sequence), /market city backdrop is not ready/);
});

test("capture combat loadouts can stage a culturally specific assault crew", () => {
  let stagedCrew = null;
  const context = {
    gameState: {
      ship: { crewCapacity: 27, cannonCapacity: 12 },
      namedCrew: [],
      playerCharacter: { homePortCityId: "thessaloniki|greece" },
      voyageSeed: "capture-test"
    },
    weatherClockMinutes: 100,
    crewGenerationContextForHomePort: (cityId) => ({
      homePort: { cityId },
      appearances: [{ appearanceId: "sailor", crewTypeId: "sailor" }],
      identityForKey: () => ({})
    }),
    cityCrewTypeForAppearance: (appearanceId) => ({
      "islamicate-warrior-medium": "shieldman",
      "gunner-medium": "gunner"
    })[appearanceId],
    createMigratedCrewRoster: (options) => {
      stagedCrew = options;
      return Array.from({ length: options.count }, () => ({}));
    },
    validateCrewAggregate: () => {},
    syncShipCargoFromGameState: () => {}
  };
  const setCrew = runInNewContext(
    `${declaration("setScenarioCrewCount").getText(source)};setScenarioCrewCount`,
    context
  );
  const maximize = runInNewContext(
    `${declaration("maximizeCaptureCombatLoadout").getText(source)};maximizeCaptureCombatLoadout`,
    { ...context, setScenarioCrewCount: setCrew }
  );

  maximize({
    crewHomeCityId: "istanbul|turkey",
    crewAppearanceIds: ["islamicate-warrior-medium", "gunner-medium"]
  });

  assert.equal(stagedCrew.homePort.cityId, "istanbul|turkey");
  assert.equal(JSON.stringify(stagedCrew.appearances), JSON.stringify([
    { appearanceId: "islamicate-warrior-medium", crewTypeId: "shieldman" },
    { appearanceId: "gunner-medium", crewTypeId: "gunner" }
  ]));
  assert.match(
    declaration("stageCapturePillage").getText(source),
    /crewHomeCityId: sequence\.assaultCrewHomeCityId[\s\S]*crewAppearanceIds: sequence\.assaultCrewAppearanceIds/
  );
});

function createTradeCaptureContext() {
  const context = {
    activeCue: "open-market",
    portCityView: null,
    portCityTransition: null,
    dialogueState: null,
    dialogueLayout: null,
    dirty: false,
    PORT_CITY_STAFF_ROLE: { MERCHANT: "merchant" },
    captureCue: (name) => name === context.activeCue,
    capturePortCallById: (cityId) => ({ cityId }),
    activatePortCityView: (cityCall) => {
      context.portCityView = { cityId: cityCall.cityId, sceneReady: true };
      context.portCityTransition = null;
    },
    requirePortCityStaffMember: () => ({ sourceId: "factor" }),
    createPortDialogueSession: (_cityCall, options) => ({ nodeId: options.initialNodeId }),
    createDialogueLayoutState: () => ({}),
    stopShipForDialogue: () => {},
    ensureDialoguePortraitLoaded: () => {},
    emitCaptureEvent: () => {},
    captureChooseTradeGood: () => {},
    portCityStaffByCityId: new Map()
  };
  return context;
}
