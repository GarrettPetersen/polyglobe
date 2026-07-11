import {
  cargoCostBasis,
  cargoRows,
  cargoUsed,
  ledgerEntries,
  realizedTradePnl
} from "./gameState.js";
import { factionById } from "./factions.js";
import { SHIP_STATS, shipLabelForSlug, shipStatsForSlug } from "./shipStats.js";
import { WEATHER_DAYS, WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const SHIP_INFO_CARGO_ROWS_PER_PAGE = 8;
export const SHIP_LEDGER_ROWS_PER_PAGE = 10;
export const SHIP_PAPERS_ROWS_PER_PAGE = 8;

const LEDGER_START_YEAR = 1522;
const LEDGER_MONTHS = Object.freeze(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]);

const RATING_FIELDS = Object.freeze({
  speed: { key: "topSpeedRad", invert: false },
  acceleration: { key: "accelerationRad", invert: false },
  turning: { key: "turnRateRad", invert: false },
  windward: { key: "upwindStallAngleDeg", invert: true }
});

const RATING_RANGES = Object.freeze(Object.fromEntries(
  Object.entries(RATING_FIELDS).map(([name, field]) => {
    const values = SHIP_STATS.map((stats) => stats[field.key]);
    return [name, Object.freeze({ min: Math.min(...values), max: Math.max(...values), ...field })];
  })
));

export function createShipInfoView(ship, gameState) {
  if (!ship || typeof ship !== "object") throw new Error("Ship information requires the player ship");
  if (!gameState || typeof gameState !== "object") throw new Error("Ship information requires game state");
  const stats = shipStatsForSlug(ship.typeSlug);
  if (!Number.isFinite(ship.hitPoints) || !Number.isFinite(ship.maxHitPoints)) {
    throw new Error(`Ship ${ship.typeSlug} has invalid hull points`);
  }
  const used = cargoUsed(gameState);
  if (gameState.cargoCapacity !== stats.cargoCapacity) {
    throw new Error(
      `Ship ${ship.typeSlug} cargo capacity mismatch: state=${gameState.cargoCapacity} stats=${stats.cargoCapacity}`
    );
  }
  const manifest = cargoRows(gameState).map(({ good, quantity }) => {
    const basis = cargoCostBasis(gameState, good.id);
    return {
      id: good.id,
      label: good.label,
      quantity,
      space: good.unitSize * quantity,
      averageCost: basis.known ? basis.average : null,
      totalCost: basis.known ? basis.total : null
    };
  });
  return {
    slug: ship.typeSlug,
    label: shipLabelForSlug(ship.typeSlug),
    captainName: gameState.playerCharacter?.name || null,
    hull: Math.max(0, Math.round(ship.hitPoints)),
    maxHull: Math.round(ship.maxHitPoints),
    cannons: stats.cannons,
    doubloons: gameState.doubloons,
    realizedPnl: realizedTradePnl(gameState),
    cargoUsed: used,
    cargoCapacity: stats.cargoCapacity,
    upwindStallAngleDeg: stats.upwindStallAngleDeg,
    seaworthiness: stats.seaworthiness,
    ratings: Object.freeze({
      speed: shipPerformanceRating(stats, "speed"),
      acceleration: shipPerformanceRating(stats, "acceleration"),
      turning: shipPerformanceRating(stats, "turning"),
      windward: shipPerformanceRating(stats, "windward")
    }),
    cargo: manifest,
    papers: shipPapers(gameState)
  };
}

export function shipPerformanceRating(stats, ratingName) {
  const range = RATING_RANGES[ratingName];
  if (!range) throw new Error(`Unknown ship performance rating: ${ratingName}`);
  const value = stats[range.key];
  if (!Number.isFinite(value)) throw new Error(`Invalid ship ${range.key}: ${value}`);
  const fraction = range.max === range.min ? 1 : (value - range.min) / (range.max - range.min);
  const usefulFraction = range.invert ? 1 - fraction : fraction;
  return Math.max(1, Math.min(10, 1 + Math.round(usefulFraction * 9)));
}

export function shipInfoCargoPage(view, page) {
  if (!view || !Array.isArray(view.cargo)) throw new Error("Invalid ship information view");
  const pageCount = Math.max(1, Math.ceil(view.cargo.length / SHIP_INFO_CARGO_ROWS_PER_PAGE));
  if (!Number.isInteger(page)) throw new Error(`Invalid cargo page: ${page}`);
  const normalizedPage = ((page % pageCount) + pageCount) % pageCount;
  const start = normalizedPage * SHIP_INFO_CARGO_ROWS_PER_PAGE;
  return {
    page: normalizedPage,
    pageCount,
    rows: view.cargo.slice(start, start + SHIP_INFO_CARGO_ROWS_PER_PAGE)
  };
}

export function shipLedgerPage(gameState, page) {
  const rows = ledgerEntries(gameState).reverse();
  const pageCount = Math.max(1, Math.ceil(rows.length / SHIP_LEDGER_ROWS_PER_PAGE));
  if (!Number.isInteger(page)) throw new Error(`Invalid ship ledger page: ${page}`);
  const normalizedPage = ((page % pageCount) + pageCount) % pageCount;
  const start = normalizedPage * SHIP_LEDGER_ROWS_PER_PAGE;
  return {
    page: normalizedPage,
    pageCount,
    rows: rows.slice(start, start + SHIP_LEDGER_ROWS_PER_PAGE)
  };
}

export function shipPapersPage(view, page) {
  if (!view || !Array.isArray(view.papers)) throw new Error("Invalid ship papers view");
  const pageCount = Math.max(1, Math.ceil(view.papers.length / SHIP_PAPERS_ROWS_PER_PAGE));
  if (!Number.isInteger(page)) throw new Error(`Invalid ship papers page: ${page}`);
  const normalizedPage = ((page % pageCount) + pageCount) % pageCount;
  const start = normalizedPage * SHIP_PAPERS_ROWS_PER_PAGE;
  return {
    page: normalizedPage,
    pageCount,
    rows: view.papers.slice(start, start + SHIP_PAPERS_ROWS_PER_PAGE)
  };
}

export function shipLedgerDateLabel(simMinute) {
  if (!Number.isFinite(simMinute)) return "--";
  const wholeMinute = Math.floor(simMinute);
  const totalDay = Math.floor(wholeMinute / WEATHER_MINUTES_PER_DAY);
  const year = LEDGER_START_YEAR + Math.floor(totalDay / WEATHER_DAYS);
  const dayIndex = positiveModulo(totalDay, WEATHER_DAYS);
  const date = new Date(Date.UTC(2001, 0, 1 + dayIndex));
  return `${String(date.getUTCDate()).padStart(2, "0")} ${LEDGER_MONTHS[date.getUTCMonth()]} ${year}`;
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function shipPapers(gameState) {
  const papers = [];
  const activeQuest = gameState.memory.quests.active;
  if (activeQuest) papers.push(activeQuestPaper(activeQuest));
  papers.push(...letterOfMarquePapers(gameState.relations.lettersOfMarque));
  return papers;
}

function activeQuestPaper(quest) {
  const faction = quest.factionId ? factionById(quest.factionId) : null;
  const reward = Number.isFinite(quest.reward) ? `${Math.round(quest.reward)} DB` : "--";
  return {
    kind: quest.kind || "quest",
    title: quest.kind === "delivery" ? "Sealed delivery packet" : "Quest document",
    issuer: faction?.name || quest.originName || "Unknown issuer",
    route: `${quest.originName || "Unknown port"} -> ${quest.destinationName || "Unknown port"}`,
    detail: `Reward ${reward}`,
    simMinute: null
  };
}

function letterOfMarquePapers(lettersOfMarque) {
  return Object.entries(lettersOfMarque)
    .map(([factionId, letter]) => {
      const faction = factionById(factionId);
      return {
        kind: "marque",
        title: `${faction.adjective} letter of marque`,
        issuer: faction.name,
        route: "Privateering authority",
        detail: "Valid against war enemies",
        simMinute: Number.isFinite(letter?.simMinute) ? letter.simMinute : null
      };
    })
    .sort((a, b) => a.issuer.localeCompare(b.issuer));
}
