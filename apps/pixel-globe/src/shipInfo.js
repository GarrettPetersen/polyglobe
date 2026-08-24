import {
  cargoCostBasis,
  cargoHoldStatus,
  cargoQuantityLabel,
  cargoRows,
  isEnvoyQuest,
  ledgerEntries,
  realizedTradePnl,
  shipItemRows,
  survivalStatus
} from "./gameState.js";
import { factionById } from "./factions.js";
import {
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  SHIP_STATS,
  shipLabelForSlug,
  shipStatsForSlug
} from "./shipStats.js";
import { WEATHER_DAYS, WEATHER_MINUTES_PER_DAY } from "./weather.js";
import { clampMenuIndex } from "./menuNavigation.js";
import { effectivePlayerShipStats } from "./playerPerks.js";
import { sovereignTradePolicyById } from "./sovereignTradeAccess.js";
import { isTreatyOfMadridQuest } from "./treatyOfMadridMission.js";

export const SHIP_INFO_CARGO_ROWS_PER_PAGE = 8;
export const SHIP_LEDGER_ROWS_PER_PAGE = 10;
export const SHIP_PAPERS_ROWS_PER_PAGE = 7;
export const SHIP_PAPER_ROW_CONTENT_INSET = 6;

export function shipCargoRowsPerPageForPanel({
  width,
  height,
  pagerHeight = 24
}) {
  for (const [label, value] of Object.entries({ width, height, pagerHeight })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Ship cargo panel ${label} must be positive: ${value}`);
    }
  }
  if (width >= 400) {
    const firstRowTop = 174;
    const rowHeight = 17;
    const pagerTop = height - pagerHeight - 5;
    const rowsPerColumn = Math.max(1, Math.min(4, Math.floor((pagerTop - firstRowTop) / rowHeight)));
    return rowsPerColumn * 2;
  }
  if (height < 300) {
    const firstRowTop = 175;
    const rowHeight = 17;
    const pagerTop = height - pagerHeight - 5;
    return Math.max(1, Math.floor((pagerTop - firstRowTop) / rowHeight));
  }
  const firstRowTop = 299;
  const rowHeight = 17;
  const pagerTop = height - pagerHeight - 5;
  return Math.max(1, Math.floor((pagerTop - firstRowTop) / rowHeight));
}

export function shipLedgerRowsPerPageForPanel({
  width,
  height,
  tallMetrics = false,
  lineHeight = 9,
  pagerHeight = 24
}) {
  for (const [label, value] of Object.entries({ width, height, lineHeight, pagerHeight })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Ship ledger panel ${label} must be positive: ${value}`);
    }
  }
  if (typeof tallMetrics !== "boolean") {
    throw new Error(`Ship ledger panel tallMetrics must be boolean: ${tallMetrics}`);
  }
  const compact = width < 400;
  const firstRowTop = compact ? 55 : 63;
  const rowHeight = compact
    ? Math.max(lineHeight * 2 + 2, 20)
    : tallMetrics
      ? Math.max(lineHeight + 4, 18)
      : 15;
  const pagerTop = height - pagerHeight - 5;
  const availableHeight = pagerTop - firstRowTop - 2;
  return Math.max(1, Math.min(
    SHIP_LEDGER_ROWS_PER_PAGE,
    Math.floor(availableHeight / rowHeight)
  ));
}

export function shipPapersRowsPerPageForPanel({
  width,
  height,
  tallMetrics = false,
  lineHeight = 9,
  pagerHeight = 24
}) {
  for (const [label, value] of Object.entries({ width, height, lineHeight, pagerHeight })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Ship inventory panel ${label} must be positive: ${value}`);
    }
  }
  if (typeof tallMetrics !== "boolean") {
    throw new Error(`Ship inventory panel tallMetrics must be boolean: ${tallMetrics}`);
  }
  const compact = width < 400;
  const firstRowTop = compact ? 56 : 63;
  const rowHeight = compact ? Math.max(lineHeight * 3 + 4, 31) : tallMetrics ? 28 : 21;
  const pagerTop = height - pagerHeight - 5;
  const availableHeight = pagerTop - firstRowTop - 2;
  return Math.max(1, Math.min(
    tallMetrics ? 5 : SHIP_PAPERS_ROWS_PER_PAGE,
    Math.floor(availableHeight / rowHeight)
  ));
}

export function compactShipMeterLayout({
  labelX,
  valueX,
  labelWidth,
  valueWidth,
  gap = 4,
  minWidth = 20
}) {
  for (const [name, value] of Object.entries({
    labelX,
    valueX,
    labelWidth,
    valueWidth,
    gap,
    minWidth
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Compact ship meter ${name} must be a non-negative number: ${value}`);
    }
  }
  const x = Math.ceil(labelX + labelWidth + gap);
  const valueLeft = Math.floor(valueX - valueWidth);
  const width = valueLeft - gap - x;
  if (width < minWidth) {
    throw new Error(`Compact ship meter cannot fit between label and value: ${width} < ${minWidth}`);
  }
  return Object.freeze({ x, width, valueLeft });
}

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

export function shipRatingCellCount(rating) {
  if (!Number.isFinite(rating) || rating < 0) {
    throw new Error(`Ship rating requires a non-negative finite value: ${rating}`);
  }
  return Math.max(10, Math.ceil(rating));
}

export function createShipInfoView(ship, gameState, { ownedShipyards = [] } = {}) {
  if (!ship || typeof ship !== "object") throw new Error("Ship information requires the player ship");
  if (!gameState || typeof gameState !== "object") throw new Error("Ship information requires game state");
  const baseStats = shipStatsForSlug(ship.typeSlug);
  const stats = gameState.ship ? effectivePlayerShipStats(gameState, baseStats) : baseStats;
  if (!Number.isFinite(ship.hitPoints) || !Number.isFinite(ship.maxHitPoints)) {
    throw new Error(`Ship ${ship.typeSlug} has invalid hull points`);
  }
  const hold = cargoHoldStatus(gameState);
  if (gameState.ship && gameState.ship.baseCargoCapacity !== baseStats.cargoCapacity) {
    throw new Error(
      `Ship ${ship.typeSlug} base cargo capacity mismatch: state=${gameState.ship?.baseCargoCapacity} stats=${baseStats.cargoCapacity}`
    );
  }
  if (!gameState.ship && gameState.cargoCapacity !== baseStats.cargoCapacity) {
    throw new Error(
      `Ship ${ship.typeSlug} cargo capacity mismatch: state=${gameState.cargoCapacity} stats=${baseStats.cargoCapacity}`
    );
  }
  const manifest = cargoRows(gameState).map(({ good, quantity }) => {
    const basis = cargoCostBasis(gameState, good.id);
    return {
      id: good.id,
      label: good.label,
      quantity,
      quantityLabel: cargoQuantityLabel(good, quantity),
      space: good.unitSize * quantity,
      averageCost: basis.known ? basis.average : null,
      totalCost: basis.known ? basis.total : null
    };
  });
  const activeCannons = gameState.ship?.cannons ?? stats.cannons;
  const activeCrew = gameState.ship?.crew ?? stats.crewCapacity;
  const armament = shipArmamentSummary(stats, activeCannons);
  return {
    slug: ship.typeSlug,
    label: shipLabelForSlug(ship.typeSlug),
    captainName: gameState.playerCharacter?.name || null,
    hull: Math.max(0, Math.round(ship.hitPoints)),
    maxHull: Math.round(ship.maxHitPoints),
    cannons: activeCannons,
    maxCannons: baseStats.cannons,
    armamentLabel: armament.label,
    armamentSummary: armament.summary,
    crew: activeCrew,
    crewCapacity: baseStats.crewCapacity,
    loadoutId: gameState.ship?.loadoutId || null,
    doubloons: gameState.doubloons,
    realizedPnl: realizedTradePnl(gameState),
    cargoUsed: hold.physicalUsed,
    cargoUsedLabel: String(hold.physicalWholeUnits),
    cargoPhysicalUsed: hold.physicalUsed,
    cargoReservedForLoadout: hold.reservedForLoadout,
    cargoCapacity: gameState.cargoCapacity,
    upwindStallAngleDeg: stats.upwindStallAngleDeg,
    propulsion: stats.propulsion,
    propulsionSummary: shipPropulsionSummary(stats),
    armor: stats.armor,
    crewProtection: stats.crewProtection,
    seaworthiness: stats.seaworthiness,
    survival: survivalStatus(gameState),
    ratings: Object.freeze({
      speed: shipPerformanceRating(stats, "speed"),
      acceleration: shipPerformanceRating(stats, "acceleration"),
      turning: shipPerformanceRating(stats, "turning"),
      windward: shipPerformanceRating(stats, "windward")
    }),
    cargo: manifest,
    papers: shipPapers(gameState, ownedShipyards)
  };
}

export function createShipyardShipView(slug) {
  const stats = shipStatsForSlug(slug);
  const armament = shipArmamentSummary(stats, stats.cannons);
  return {
    slug,
    label: shipLabelForSlug(slug),
    hull: stats.hitPoints,
    maxHull: stats.hitPoints,
    cannons: stats.cannons,
    maxCannons: stats.cannons,
    armamentLabel: armament.label,
    armamentSummary: armament.summary,
    crew: stats.crewCapacity,
    crewCapacity: stats.crewCapacity,
    cargoUsed: 0,
    cargoCapacity: stats.cargoCapacity,
    upwindStallAngleDeg: stats.upwindStallAngleDeg,
    propulsion: stats.propulsion,
    propulsionSummary: shipPropulsionSummary(stats),
    armor: stats.armor,
    crewProtection: stats.crewProtection,
    seaworthiness: stats.seaworthiness,
    ratings: Object.freeze({
      speed: shipPerformanceRating(stats, "speed"),
      acceleration: shipPerformanceRating(stats, "acceleration"),
      turning: shipPerformanceRating(stats, "turning"),
      windward: shipPerformanceRating(stats, "windward")
    })
  };
}

export function createShipComparisonView(currentSlug, candidateSlug) {
  const current = createShipyardShipView(currentSlug);
  const candidate = createShipyardShipView(candidateSlug);
  return Object.freeze({
    current,
    candidate,
    metrics: Object.freeze([
      comparisonMetric("hull", "HULL", current.maxHull, candidate.maxHull),
      comparisonMetric("armor", "ARMOR", current.armor, candidate.armor),
      comparisonMetric("crew-protection", "COVER", current.crewProtection, candidate.crewProtection),
      comparisonMetric("crew", "CREW", current.crewCapacity, candidate.crewCapacity),
      comparisonMetric("cargo", "CARGO", current.cargoCapacity, candidate.cargoCapacity),
      comparisonMetric("speed", "SPEED", current.ratings.speed, candidate.ratings.speed),
      comparisonMetric("acceleration", "ACCEL", current.ratings.acceleration, candidate.ratings.acceleration),
      comparisonMetric("turning", "TURNING", current.ratings.turning, candidate.ratings.turning),
      comparisonMetric("windward", "WINDWARD", current.ratings.windward, candidate.ratings.windward),
      comparisonMetric("seaworthiness", "SEAWORTHY", current.seaworthiness, candidate.seaworthiness)
    ])
  });
}

export function shipComparisonDifferenceLabel(difference) {
  if (!Number.isFinite(difference)) {
    throw new Error(`Invalid ship comparison difference: ${difference}`);
  }
  return difference > 0 ? `+${difference}` : String(difference);
}

export function shipComparisonArmamentRow(comparison) {
  if (!comparison?.current || !comparison?.candidate) {
    throw new Error("Ship armament comparison requires current and candidate vessels");
  }
  const { current, candidate } = comparison;
  const bothUseGuns = current.armamentLabel === "GUNS" && candidate.armamentLabel === "GUNS";
  return Object.freeze({
    label: bothUseGuns ? "GUNS" : "WEAPON",
    candidate: bothUseGuns ? String(candidate.maxCannons) : conciseArmamentText(candidate),
    current: bothUseGuns ? String(current.maxCannons) : conciseArmamentText(current),
    difference: candidate.maxCannons - current.maxCannons
  });
}

function comparisonMetric(id, label, current, candidate) {
  return Object.freeze({
    id,
    label,
    current,
    candidate,
    difference: candidate - current
  });
}

function conciseArmamentText(shipView) {
  if (shipView.armamentLabel !== "GUNS" || !Number.isInteger(shipView.maxCannons)) {
    throw new Error(`Invalid ship comparison armament: ${shipView.armamentLabel}`);
  }
  if (shipView.maxCannons === 0) return "NONE";
  return `${shipView.maxCannons} ${shipView.maxCannons === 1 ? "GUN" : "GUNS"}`;
}

export function shipArmamentSummary(stats, activeCannons) {
  if (!stats || typeof stats !== "object") throw new Error("Ship armament summary requires ship stats");
  if (!Number.isInteger(activeCannons) || activeCannons < 0 || activeCannons > stats.cannons) {
    throw new Error(`Invalid active cannon count for ${stats.slug}: ${activeCannons}`);
  }
  return Object.freeze({ label: "GUNS", summary: `${activeCannons}/${stats.cannons}` });
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

export function shipPropulsionSummary(stats) {
  if (!stats || typeof stats !== "object") throw new Error("Ship propulsion summary requires ship stats");
  if (stats.propulsion === SHIP_PROPULSION_OAR) return "OAR / NO DEAD ZONE";
  if (stats.propulsion === SHIP_PROPULSION_OAR_SAIL) return "OAR + SAIL / ROW TO BOOST";
  return `SAIL / ${stats.upwindStallAngleDeg} DEG`;
}

export function shipInfoCargoPage(view, page, rowsPerPage = SHIP_INFO_CARGO_ROWS_PER_PAGE) {
  if (!view || !Array.isArray(view.cargo)) throw new Error("Invalid ship information view");
  assertRowsPerPage(rowsPerPage, "ship cargo manifest");
  const pageCount = Math.max(1, Math.ceil(view.cargo.length / rowsPerPage));
  if (!Number.isInteger(page)) throw new Error(`Invalid cargo page: ${page}`);
  const normalizedPage = clampMenuIndex(page, pageCount);
  const start = normalizedPage * rowsPerPage;
  return {
    page: normalizedPage,
    pageCount,
    rows: view.cargo.slice(start, start + rowsPerPage)
  };
}

export function shipLedgerPage(gameState, page, rowsPerPage = SHIP_LEDGER_ROWS_PER_PAGE) {
  assertRowsPerPage(rowsPerPage, "ship ledger");
  const rows = ledgerEntries(gameState).reverse();
  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  if (!Number.isInteger(page)) throw new Error(`Invalid ship ledger page: ${page}`);
  const normalizedPage = clampMenuIndex(page, pageCount);
  const start = normalizedPage * rowsPerPage;
  return {
    page: normalizedPage,
    pageCount,
    rows: rows.slice(start, start + rowsPerPage)
  };
}

export function shipPapersPage(view, page, rowsPerPage = SHIP_PAPERS_ROWS_PER_PAGE) {
  assertRowsPerPage(rowsPerPage, "ship papers");
  if (!view || !Array.isArray(view.papers)) throw new Error("Invalid ship papers view");
  const pageCount = Math.max(1, Math.ceil(view.papers.length / rowsPerPage));
  if (!Number.isInteger(page)) throw new Error(`Invalid ship papers page: ${page}`);
  const normalizedPage = clampMenuIndex(page, pageCount);
  const start = normalizedPage * rowsPerPage;
  return {
    page: normalizedPage,
    pageCount,
    rows: view.papers.slice(start, start + rowsPerPage)
  };
}

export function stepShipPaperSelectionIndex({ currentIndex, direction, minIndex, maxIndex, active }) {
  if (!Number.isInteger(currentIndex)) throw new Error(`Invalid ship paper selection index: ${currentIndex}`);
  if (!Number.isInteger(direction) || direction === 0) {
    throw new Error(`Invalid ship paper selection direction: ${direction}`);
  }
  if (!Number.isInteger(minIndex) || !Number.isInteger(maxIndex) || minIndex < 0 || maxIndex < minIndex) {
    throw new Error(`Invalid ship paper selection bounds: ${minIndex}-${maxIndex}`);
  }
  if (typeof active !== "boolean") throw new Error(`Invalid ship paper selection state: ${active}`);
  if (!active) return direction > 0 ? minIndex : maxIndex;
  if (currentIndex < minIndex || currentIndex > maxIndex) {
    throw new Error(`Ship paper selection ${currentIndex} is outside ${minIndex}-${maxIndex}`);
  }
  return Math.max(minIndex, Math.min(maxIndex, currentIndex + Math.sign(direction)));
}

function assertRowsPerPage(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} requires a positive rows-per-page value: ${value}`);
  }
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

export function shipLocalDateLabel(simMinute, longitudeDeg) {
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid ship local date minute: ${simMinute}`);
  if (!Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) {
    throw new Error(`Invalid ship local date longitude: ${longitudeDeg}`);
  }
  return shipLedgerDateLabel(simMinute + longitudeDeg * 4);
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function shipPapers(gameState, ownedShipyards) {
  if (!Array.isArray(ownedShipyards)) throw new Error("Owned shipyards must be an array");
  const papers = [];
  const activeQuest = gameState.memory.quests.active;
  if (activeQuest) papers.push(activeQuestPaper(activeQuest));
  const activePassenger = gameState.memory.quests.passengerActive;
  if (activePassenger) papers.push(activeQuestPaper(activePassenger));
  papers.push(...shipItemPapers(shipItemRows(gameState)));
  papers.push(...personalTradePassPapers(gameState.relations.personalTradePasses));
  papers.push(...letterOfMarquePapers(gameState.relations.lettersOfMarque));
  papers.push(...ownedShipyards
    .map((yard) => {
      if (!yard?.playerBacking || typeof yard.portName !== "string" || yard.portName === "") {
        throw new Error("Shipyard ownership papers require a player-backed named yard");
      }
      return {
        kind: "shipyard-ownership",
        title: `${yard.portName} shipyard partnership`,
        issuer: `${yard.portName} master shipwrights`,
        route: "Ownership",
        detail: "Partnership indenture; dividends payable at the yard.",
        effect: null,
        simMinute: yard.playerBacking.investedMinute
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title)));
  return papers;
}

function shipItemPapers(items) {
  return items.map((item) => ({
    kind: "item",
    title: item.label,
    issuer: item.issuer || "Ship stores",
    route: item.route || "Equipment",
    detail: item.quantity > 1 ? `${item.detail} x${item.quantity}` : item.detail,
    effect: item.effect || null,
    simMinute: item.simMinute ?? null
  }));
}

function activeQuestPaper(quest) {
  const faction = quest.factionId ? factionById(quest.factionId) : null;
  const reward = Number.isFinite(quest.reward) ? `${Math.round(quest.reward)} DB` : "--";
  if (quest.kind === "passenger") {
    const passengerName = quest.passenger?.name || quest.passengerName || "Passenger";
    return {
      kind: "passenger",
      title: `Passenger: ${passengerName}`,
      issuer: passengerName,
      route: `${quest.originName || "Unknown port"} -> ${quest.destinationName || "Unknown port"}`,
      detail: `Fare ${reward}`,
      simMinute: null
    };
  }
  if (isEnvoyQuest(quest)) {
    const envoyName = quest.passenger?.name || quest.passengerName || "Envoy";
    return {
      kind: quest.kind,
      title: isTreatyOfMadridQuest(quest)
        ? `Treaty of Madrid: ${envoyName}`
        : `${quest.kind === "friendly-envoy" ? "Friendly" : "Hostile"} envoy: ${envoyName}`,
      issuer: factionById(quest.originFactionId).name,
      route: quest.stage === "return"
        ? `${quest.targetName || "Foreign court"} -> ${quest.originName || "Home court"}`
        : `${quest.originName || "Home court"} -> ${quest.targetName || "Foreign court"}`,
      detail: `Round-trip reward ${reward}`,
      simMinute: null
    };
  }
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

function personalTradePassPapers(personalTradePasses) {
  return Object.entries(personalTradePasses)
    .map(([policyId, pass]) => {
      const policy = sovereignTradePolicyById(policyId);
      const issuer = factionById(policy.hostFactionId);
      return {
        kind: "permit",
        title: policy.permitLabel,
        issuer: issuer.name,
        route: policy.appliesTo,
        detail: policy.permitPaperDetail,
        simMinute: pass.simMinute
      };
    })
    .sort((a, b) => a.issuer.localeCompare(b.issuer));
}
