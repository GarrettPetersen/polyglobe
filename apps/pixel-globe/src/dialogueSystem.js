import {
  acceptQuest,
  buyGood,
  cargoFree,
  cargoRows,
  cargoUsed,
  cityLabel,
  completeQuest,
  portMemory,
  questStateForCity,
  sellGood
} from "./gameState.js";
import { portEconomySummary, portMarket, tradeGoodById } from "./economy.js";

export function createPortDialogueSession(city) {
  return {
    kind: "port",
    cityTileId: city.tileId,
    nodeId: "root",
    selectedIndex: 0,
    feedback: null
  };
}

export function createShipDialogueSession(ship) {
  return {
    kind: "ship",
    npcShipId: ship.id,
    selectedIndex: 0
  };
}

export function shipDialogueView(session, ship) {
  assertShipDialogueSubject(session, ship);
  const manifest = shipCargoManifest(ship.cargo);
  const voyage = ship.destinationName ? ` Bound for ${ship.destinationName}.` : "";
  const cargo = manifest ? ` We carry ${manifest}.` : " Running in ballast.";
  return {
    speaker: `${characterName(ship.character)}, ${ship.label} captain`,
    expressionId: "neutral",
    text: `Ahoy matey.${voyage}${cargo}`,
    feedback: null,
    options: [option("Leave", { type: "close" })]
  };
}

export function selectShipDialogueOption(session, ship, optionIndex = session.selectedIndex) {
  const view = shipDialogueView(session, ship);
  const selected = view.options[optionIndex];
  if (!selected) throw new Error(`Invalid ship dialogue option index: ${optionIndex}`);
  if (selected.action.type !== "close") {
    throw new Error(`Unknown ship dialogue action: ${selected.action.type}`);
  }
  return { closed: true };
}

function assertShipDialogueSubject(session, ship) {
  if (!session || session.kind !== "ship") throw new Error("Missing ship dialogue session");
  if (!ship || session.npcShipId !== ship.id) throw new Error("Dialogue ship does not match active session");
}

export function portDialogueView(session, city, gameState, economy, portCities) {
  if (!session || session.kind !== "port") throw new Error("Missing port dialogue session");
  if (session.cityTileId !== city.tileId) throw new Error("Dialogue city does not match active session");

  if (session.nodeId === "root") return rootView(session, city, gameState, economy);
  if (session.nodeId === "buy") return buyView(session, city, gameState, economy);
  if (session.nodeId === "sell") return sellView(session, city, gameState, economy);
  if (session.nodeId === "cargo") return cargoView(session, city, gameState);
  if (session.nodeId === "quest") return questView(session, city, gameState, portCities);
  throw new Error(`Unknown dialogue node: ${session.nodeId}`);
}

export function selectPortDialogueOption(session, city, gameState, economy, portCities, optionIndex = session.selectedIndex) {
  const view = portDialogueView(session, city, gameState, economy, portCities);
  const option = view.options[optionIndex];
  if (!option) throw new Error(`Invalid dialogue option index: ${optionIndex}`);
  if (option.disabled) {
    session.feedback = option.disabledReason || "That is not available.";
    return { closed: false };
  }

  const action = option.action;
  if (action.type === "close") return { closed: true };
  if (action.type === "node") {
    session.nodeId = action.nodeId;
    session.selectedIndex = 0;
    session.feedback = null;
    return { closed: false };
  }
  if (action.type === "buy") {
    const result = buyGood(gameState, economy, city, action.goodId);
    session.feedback = `Bought ${result.good.label} for ${result.price} db.`;
    return { closed: false };
  }
  if (action.type === "sell") {
    const result = sellGood(gameState, economy, city, action.goodId);
    session.feedback = `Sold ${result.good.label} for ${result.price} db.`;
    return { closed: false };
  }
  if (action.type === "accept-quest") {
    acceptQuest(gameState, action.quest);
    session.feedback = `Accepted delivery to ${action.quest.destinationName}.`;
    session.nodeId = "quest";
    session.selectedIndex = 0;
    return { closed: false };
  }
  if (action.type === "complete-quest") {
    const quest = completeQuest(gameState, city);
    session.feedback = `Delivered. Earned ${quest.reward} db.`;
    session.nodeId = "root";
    session.selectedIndex = 0;
    return { closed: false };
  }
  throw new Error(`Unknown dialogue action: ${action.type}`);
}

function rootView(session, city, gameState, economy) {
  const memory = portMemory(gameState, city);
  const market = portEconomySummary(economy, city);
  const greeting = memory.visits <= 1
    ? `Welcome to ${cityLabel(city)}. I keep accounts for captains who can keep their word.`
    : `Back in ${cityLabel(city)}, captain. Your ledger is still open.`;
  return {
    speaker: speakerName(city),
    expressionId: "neutral",
    text: `${greeting} ${portFlavor(city)} Market specie: ${market.specie} db.`,
    feedback: session.feedback,
    options: [
      option("Buy goods", { type: "node", nodeId: "buy" }),
      option("Sell cargo", { type: "node", nodeId: "sell" }),
      option("Ask about work", { type: "node", nodeId: "quest" }),
      option("Cargo ledger", { type: "node", nodeId: "cargo" }),
      option("Leave port", { type: "close" })
    ]
  };
}

function buyView(session, city, gameState, economy) {
  const rows = portMarket(economy, city)
    .filter((row) => row.listedForSale && row.stock > 0)
    .sort((a, b) => b.productionPerDay - a.productionPerDay || a.buyPrice - b.buyPrice)
    .slice(0, 5)
    .map((row) => {
      const totalSize = row.good.unitSize;
      return option(`Buy ${row.good.label}  ${row.buyPrice} db  x${row.stock}`, { type: "buy", goodId: row.good.id }, {
        disabled: gameState.doubloons < row.buyPrice || cargoFree(gameState) < totalSize,
        disabledReason: gameState.doubloons < row.buyPrice ? "Not enough doubloons." : "Cargo hold is full."
      });
    });
  rows.push(option("Back", { type: "node", nodeId: "root" }));
  return {
    speaker: speakerName(city),
    expressionId: "neutral",
    text: `${cityLabel(city)} market. Doubloons ${gameState.doubloons}. Cargo ${cargoUsed(gameState)}/${gameState.cargoCapacity}.`,
    feedback: session.feedback,
    options: rows
  };
}

function sellView(session, city, gameState, economy) {
  const market = new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
  const rows = cargoRows(gameState).map((cargo) => {
    const row = market.get(cargo.good.id);
    if (!row) throw new Error(`${cityLabel(city)} market has no quote for ${cargo.good.id}`);
    const price = row.sellPrice;
    return option(`Sell ${cargo.good.label} x${cargo.quantity}  ${price} db`, {
      type: "sell",
      goodId: cargo.good.id
    }, {
      disabled: row.portSpecie < price,
      disabledReason: "The market is out of specie."
    });
  });
  if (rows.length === 0) {
    rows.push(option("No cargo to sell", { type: "node", nodeId: "sell" }, {
      disabled: true,
      disabledReason: "The hold is empty."
    }));
  }
  rows.push(option("Back", { type: "node", nodeId: "root" }));
  return {
    speaker: speakerName(city),
    expressionId: "neutral",
    text: `Buyers here pay port rates. Cargo ${cargoUsed(gameState)}/${gameState.cargoCapacity}.`,
    feedback: session.feedback,
    options: rows
  };
}

function cargoView(session, city, gameState) {
  const rows = cargoRows(gameState);
  const cargoText = rows.length > 0
    ? rows.map((row) => `${row.good.label} x${row.quantity}`).join(", ")
    : "The hold is empty.";
  return {
    speaker: speakerName(city),
    expressionId: "neutral",
    text: `${cargoText} Doubloons ${gameState.doubloons}. Space ${cargoUsed(gameState)}/${gameState.cargoCapacity}.`,
    feedback: session.feedback,
    options: [
      option("Back", { type: "node", nodeId: "root" }),
      option("Leave port", { type: "close" })
    ]
  };
}

function questView(session, city, gameState, portCities) {
  const questState = questStateForCity(gameState, city, portCities);
  if (questState.kind === "ready-to-complete") {
    return {
      speaker: speakerName(city),
      expressionId: "neutral",
      text: `That packet bears our seal. Hand it over and I will pay ${questState.quest.reward} db.`,
      feedback: session.feedback,
      options: [
        option(`Complete delivery  ${questState.quest.reward} db`, { type: "complete-quest" }),
        option("Back", { type: "node", nodeId: "root" })
      ]
    };
  }
  if (questState.kind === "available") {
    return {
      speaker: speakerName(city),
      expressionId: "neutral",
      text: `A sealed packet needs passage to ${questState.quest.destinationName}. Payment is ${questState.quest.reward} db on delivery.`,
      feedback: session.feedback,
      options: [
        option(`Accept delivery to ${questState.quest.destinationName}`, {
          type: "accept-quest",
          quest: questState.quest
        }),
        option("Back", { type: "node", nodeId: "root" })
      ]
    };
  }
  if (questState.kind === "completed") {
    return {
      speaker: speakerName(city),
      expressionId: "neutral",
      text: "You already handled my packet. A clean account is rare enough that I remember it.",
      feedback: session.feedback,
      options: [
        option("Back", { type: "node", nodeId: "root" })
      ]
    };
  }
  const quest = questState.quest;
  return {
    speaker: speakerName(city),
    expressionId: "neutral",
    text: questState.kind === "in-progress-here"
      ? `The packet is bound for ${quest.destinationName}. Do not let it vanish into another captain's hold.`
      : `Finish your delivery from ${quest.originName} to ${quest.destinationName}; then I can talk work.`,
    feedback: session.feedback,
    options: [
      option("Back", { type: "node", nodeId: "root" })
    ]
  };
}

function option(label, action, details = {}) {
  return {
    label,
    action,
    disabled: !!details.disabled,
    disabledReason: details.disabledReason || null
  };
}

function shipCargoManifest(cargo) {
  const rows = Object.entries(cargo || {})
    .filter(([, quantity]) => quantity > 0)
    .map(([goodId, quantity]) => `${tradeGoodById(goodId).label} x${quantity}`);
  if (rows.length === 0) return "";
  if (rows.length <= 2) return rows.join(" and ");
  return `${rows.slice(0, 2).join(", ")}, and other goods`;
}

function speakerName(city) {
  return `${characterName(city.character)}, ${cityLabel(city)} factor`;
}

function characterName(character) {
  if (!character || typeof character.name !== "string" || character.name.trim() === "") {
    throw new Error("Dialogue character has no generated name");
  }
  return character.name;
}

function portFlavor(city) {
  const population = city.population || 0;
  if (population >= 150000) return "The quay is crowded enough to hide a dozen fortunes.";
  if (population >= 60000) return "There is steady trade if your hold has room.";
  return "Small harbors remember generous captains.";
}
