export const REMOTE_OCEAN_APPROACH_DISTANCE_KM = 1200;
export const ISOLATED_VILLAGE_NEIGHBOR_DISTANCE_KM = 900;

const PORT_APPROACH_KINDS = new Set(["ocean", "river", "lake"]);

const LOCAL_SHIP_SLUGS_BY_CITY_TYPE = Object.freeze({
  "east-asian": new Set([
    "sampan",
    "small-junk",
    "medium-junk",
    "large-junk",
    "joseon-turtle-ship",
    "joseon-panokseon",
    "japanese-kuribune",
    "japanese-kobaya",
    "japanese-sekibune",
    "japanese-atakebune"
  ]),
  "south-asian": new Set(["dhow", "ocean-dhow"]),
  "southeast-asian": new Set([
    "dhow",
    "ocean-dhow",
    "sampan",
    "small-junk",
    "nusantaran-outrigger",
    "kelulus",
    "penjajap",
    "lancaran",
    "royal-lancaran"
  ]),
  polynesian: new Set(["polynesian-voyaging-canoe"]),
  mesoamerican: new Set(["mesoamerican-dugout-canoe"]),
  andean: new Set(["mesoamerican-dugout-canoe"]),
  "islamic-desert": new Set(["dhow", "ocean-dhow", "felucca", "ketch", "xebec"]),
  mediterranean: new Set([
    "fishing-lugger",
    "small-cog",
    "felucca",
    "cutter",
    "ketch",
    "xebec",
    "mediterranean-galley",
    "galleass"
  ]),
  "northern-european": new Set([
    "fishing-lugger",
    "small-cog",
    "cutter",
    "caravel",
    "square-rigged-caravel",
    "brigantine",
    "fluyt",
    "carrack"
  ]),
  "sub-saharan": new Set(["dhow", "ocean-dhow", "felucca", "mesoamerican-dugout-canoe"])
});

const REGIONAL_PORT_LINES = Object.freeze({
  "east-asian": Object.freeze({
    major: Object.freeze([
      "Barges crowd the river stairs, and the warehouse clerks are already arguing over the next tide's cargo.",
      "Porters move between river barges and sea-going hulls while brokers compare cargo lists beneath the customs awnings."
    ]),
    ordinary: Object.freeze([
      "The quay watches every arriving sail closely; foreign cargo can change a season's prices here.",
      "Boatmen are sounding the channel while merchants at the landing study each new flag and cargo."
    ])
  }),
  "south-asian": Object.freeze({
    major: Object.freeze([
      "Brokers from inland markets crowd the waterfront, each waiting to learn what this tide has brought.",
      "Warehouse agents, money changers, and caravan masters meet each arriving boat before its cargo reaches the quay."
    ]),
    ordinary: Object.freeze([
      "Caravans meet the boats at this quay, so news of a useful cargo travels inland quickly.",
      "Ox carts wait beyond the landing; anything unloaded here will be quoted in inland markets before sunset."
    ])
  }),
  "southeast-asian": Object.freeze({
    major: Object.freeze([
      "Pilots, brokers, and sailors from several seas fill the roadstead; no cargo remains a secret for long.",
      "Junks, dhows, and island craft share the anchorage while interpreters carry offers from ship to ship."
    ]),
    ordinary: Object.freeze([
      "The harbor lives by the monsoon routes, and every new sail starts fresh bargaining on the quay.",
      "The beach pilots know every reef and seasonal wind; they are already asking which passage brought you in."
    ])
  }),
  "islamic-desert": Object.freeze({
    major: Object.freeze([
      "River craft, caravans, and sea-going merchants meet here, filling the customs house with a dozen languages.",
      "Camel trains halt beside the warehouses as sailors carry manifests from the anchorage to the customs court."
    ]),
    ordinary: Object.freeze([
      "The quay is the hinge between caravan roads and the sea; useful cargo will find a buyer.",
      "Dust from the caravan road settles on the landing, where merchants weigh news from inland against news from the sea."
    ])
  }),
  mediterranean: Object.freeze({
    major: Object.freeze([
      "Galleys, coasters, and deep-water merchants crowd the harbor, each carrying news from another shore.",
      "Harbor boats weave among galleys and merchantmen while clerks bargain over berths, cargo, and the next convoy."
    ]),
    ordinary: Object.freeze([
      "Coasters call with every change of wind, but an unusual cargo can still stir the whole market.",
      "The quay knows the sails of every nearby coast, so an unfamiliar rig draws merchants before its anchor settles."
    ])
  }),
  "northern-european": Object.freeze({
    major: Object.freeze([
      "Warehouses line the water and the cranes seldom rest; merchants here measure news by arriving sails.",
      "Cranes swing over the crowded wharf while guild clerks tally barrels, bales, and ships waiting on the tide."
    ]),
    ordinary: Object.freeze([
      "The harbor lives on coasting trade, and the quay is already judging what your hold might contain.",
      "Fishing boats and coastal traders share the harbor; every crew pauses long enough to inspect a new arrival."
    ])
  }),
  "sub-saharan": Object.freeze({
    major: Object.freeze([
      "Gold, ivory, cloth, and provisions pass between inland traders and ocean-going captains on this waterfront.",
      "Caravan brokers and coastal pilots bargain beneath the storehouses, linking distant inland markets to the sea."
    ]),
    ordinary: Object.freeze([
      "The shore traders know the inland roads and the sea lanes alike; they are already studying your cargo.",
      "Canoes work between the beach and anchorage while inland merchants wait to hear what your voyage has brought."
    ])
  }),
  mesoamerican: Object.freeze({
    major: Object.freeze([
      "Canoes bring produce from along the coast while market runners carry news inland.",
      "Porters unload coastal canoes as runners leave the market with news of every unfamiliar sail."
    ]),
    ordinary: Object.freeze([
      "The landing is busy with canoes, fishers, and traders eager to learn what came over the horizon.",
      "Fishers draw their canoes above the tide while families gather to see what your vessel carried across the sea."
    ])
  }),
  andean: Object.freeze({
    major: Object.freeze([
      "Runners and coastal craft carry news from this landing toward the high country.",
      "Knotted records pass from the landing to waiting runners as coastal cargo begins its journey inland."
    ]),
    ordinary: Object.freeze([
      "The landing joins the sea road to settlements inland, and every unfamiliar sail draws attention.",
      "Fishing rafts line the shore, and word of your arrival is already moving toward the settlements above."
    ])
  }),
  polynesian: Object.freeze({
    major: Object.freeze([
      "Canoes from neighboring islands lie along the beach, their crews trading news as eagerly as cargo.",
      "Navigators from several islands are comparing swells, stars, and distant news beneath the meeting house."
    ]),
    ordinary: Object.freeze([
      "The beach is busy with canoes, and every crew wants to know what winds carried you here.",
      "Outrigger canoes rest above the tide while the shore watch studies your sail and the weather behind it."
    ])
  })
});

export function buildPortArrivalNavigation({ ports, sailingDistanceKm, approachKindForPort }) {
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new Error("Port arrival navigation requires a non-empty port list");
  }
  if (typeof sailingDistanceKm !== "function") {
    throw new Error("Port arrival navigation requires a sailing-distance function");
  }
  if (typeof approachKindForPort !== "function") {
    throw new Error("Port arrival navigation requires an approach-kind function");
  }

  const seenTileIds = new Set();
  const classified = ports.map((port) => {
    if (!Number.isInteger(port?.tileId) || seenTileIds.has(port.tileId)) {
      throw new Error(`Port arrival navigation received invalid or duplicate tile: ${port?.tileId}`);
    }
    seenTileIds.add(port.tileId);
    const approachKind = approachKindForPort(port);
    if (!PORT_APPROACH_KINDS.has(approachKind)) {
      throw new Error(`Invalid port approach kind for ${port.city}: ${approachKind}`);
    }
    return Object.freeze({ port, approachKind });
  });
  const oceanPorts = classified.filter((entry) => entry.approachKind === "ocean");
  if (oceanPorts.length === 0) throw new Error("Port arrival navigation requires at least one ocean port");

  return new Map(classified.map(({ port, approachKind }) => {
    const nearestPortDistanceKm = shortestDistance(
      port,
      classified.filter((entry) => entry.port.tileId !== port.tileId).map((entry) => entry.port),
      sailingDistanceKm
    );
    const oceanAccessDistanceKm = approachKind === "ocean"
      ? 0
      : shortestDistance(port, oceanPorts.map((entry) => entry.port), sailingDistanceKm);
    const remote = (
      approachKind !== "ocean" &&
      (oceanAccessDistanceKm === null || oceanAccessDistanceKm >= REMOTE_OCEAN_APPROACH_DISTANCE_KM)
    ) || (
      port.settlementType === "village" &&
      (nearestPortDistanceKm === null || nearestPortDistanceKm >= ISOLATED_VILLAGE_NEIGHBOR_DISTANCE_KM)
    );
    return [port.tileId, Object.freeze({
      approachKind,
      nearestPortDistanceKm,
      oceanAccessDistanceKm,
      remote
    })];
  }));
}

export function portArrivalPresentation({
  city,
  playerShipSlug = null,
  playerShipLabel = "vessel",
  returning = false,
  navigation = null,
  variationKey = ""
}) {
  validateArrivalOptions({ city, playerShipLabel, returning, navigation, variationKey });
  const shipLabel = playerShipLabel.toLowerCase();
  const localHull = locallyFamiliarHull(city.cityType, playerShipSlug);
  const namedLine = namedRemotePortLine(city, shipLabel, localHull, returning);
  if (namedLine) return presentation(namedLine, !returning);

  if (city.manualRegion === "pacific-islands") {
    return presentation(
      pacificIslandArrivalLine(city, shipLabel, localHull, returning, variationKey),
      !returning && !localHull
    );
  }

  const americanLine = americanVillageLine(city, shipLabel, localHull, returning);
  if (americanLine) return presentation(americanLine, !returning);

  if (city.manualRegion === "spice-islands" && city.settlementType === "village") {
    return presentation(localHull
      ? "Sails move constantly among these islands, but every crew still asks who has cloves, nutmeg, or news to trade."
      : `A foreign ${shipLabel} draws notice here. By sunset every island trader will know your flag and what your hold might buy.`,
    !returning && !localHull);
  }

  if (navigation?.remote) {
    return presentation(remoteApproachLine(navigation.approachKind, shipLabel, localHull, returning), !returning);
  }

  if (city.settlementType === "village") {
    if (returning) {
      return presentation(localHull
        ? "Your sail was recognized offshore. The landing already has news and cargo waiting for you."
        : `They recognized your ${shipLabel} beyond the harbor mouth. Word of your return has brought people down to the water.`);
    }
    if (!localHull) {
      return presentation(city.islandSettlement
        ? `Few ships like your ${shipLabel} find this island. The landing has emptied to see what crossed the horizon.`
        : `Your ${shipLabel} is unlike the craft that usually work this shore. Traders and children alike have come to stare.`, true);
    }
    return presentation(regionalLine(city, "ordinary", variationKey));
  }

  return presentation(regionalLine(
    city,
    (city.population || 0) >= 100000 ? "major" : "ordinary",
    variationKey
  ));
}

export function portArrivalFlavor(options) {
  return portArrivalPresentation(options).text;
}

function validateArrivalOptions({ city, playerShipLabel, returning, navigation, variationKey }) {
  if (!city || typeof city !== "object") throw new Error("Port arrival flavor requires a city");
  if (city.population !== undefined &&
      (!Number.isFinite(city.population) || city.population < 0)) {
    throw new Error(`Port arrival flavor received invalid population for ${city.city || "unknown city"}`);
  }
  if (typeof playerShipLabel !== "string" || playerShipLabel.trim() === "") {
    throw new Error("Port arrival flavor requires a ship label");
  }
  if (typeof returning !== "boolean") throw new Error("Port arrival flavor requires a return-visit flag");
  if (typeof variationKey !== "string") {
    throw new Error(`Port arrival flavor requires a string variation key: ${variationKey}`);
  }
  if (navigation !== null) {
    if (!PORT_APPROACH_KINDS.has(navigation?.approachKind) || typeof navigation.remote !== "boolean") {
      throw new Error(`Port arrival flavor received invalid navigation for ${city.city || "unknown city"}`);
    }
  }
}

function pacificIslandArrivalLine(city, shipLabel, localHull, returning, variationKey) {
  if (returning && localHull) {
    return arrivalVariant(city, `pacific-return-local|${variationKey}`, [
      "The headland watch knew your canoe's sail before you reached the reef. News of your return is already crossing the village.",
      "Your canoe was recognized from the lookout hill. By the time you cross the reef, friends are already waiting on the beach.",
      "A conch sounds from the headland when your sail appears. The village knows which voyager has returned."
    ]);
  }
  if (returning) {
    return arrivalVariant(city, `pacific-return-foreign|${shipLabel}|${variationKey}`, [
      `The headland watch remembered your ${shipLabel}. People were gathering on the beach before you crossed the reef.`,
      `Your ${shipLabel} is known here now. Canoes come out through the reef to guide you toward the old anchorage.`,
      `The lookout calls your ${shipLabel} by name. Children are racing its shadow along the beach as you enter the lagoon.`
    ]);
  }
  if (localHull) {
    return arrivalVariant(city, `pacific-first-local|${variationKey}`, [
      "Your canoe carries the cut of distant islands. The elders are already asking which winds and stars brought you here.",
      "The canoe is familiar, but its sail and lashings speak of another island chain. Navigators gather to hear your route.",
      "People know at once that your canoe has crossed open ocean. The first questions are about swell, birds, and stars."
    ]);
  }
  return arrivalVariant(city, `pacific-first-foreign|${shipLabel}|${variationKey}`, [
    `That ${shipLabel} is unlike anything that works this lagoon. The whole village has come to the beach to watch it cross the reef.`,
    `The reef fishers have stopped paddling to stare at your ${shipLabel}. A crowd follows its progress from the headland to the beach.`,
    `No one here has seen a ${shipLabel} cross the reef. Canoes keep a cautious distance while the village gathers at the water's edge.`
  ]);
}

function namedRemotePortLine(city, shipLabel, localHull, returning) {
  const name = String(city.displayCity || city.city || "").toLowerCase();
  if (name === "dongola") {
    if (returning) return "Your sail is known at Dongola now. Word of your return is already moving between the Nile landing and the market.";
    return localHull
      ? "The Nile carries barges and lateen craft this far, but every new arrival becomes market news before its ropes are tied."
      : `Your ${shipLabel} has come farther up the Nile than most sea-going captains dare. Boatmen have left the river stairs to inspect her rig.`;
  }
  if (name === "tombouctou" || name === "timbuktu") {
    if (returning) return "The boatmen at Kabara remember your sail. Runners are already carrying word of your return inland to Timbuktu.";
    return localHull
      ? "Kabara's river landing is busy with salt, gold, manuscripts, and news bound for Timbuktu beyond the dunes."
      : `Your ${shipLabel} has reached Kabara by the Niger, where sea-going rigs are rare. Salt merchants and scholars from Timbuktu have sent runners to inspect the arrival.`;
  }
  if (name === "gao") {
    if (returning) return "Your sail is known at Gao now. Niger boatmen have already carried word of your return along the landing.";
    return localHull
      ? "Niger boats, salt caravans, and court messengers crowd Gao's landing; news of every arrival moves quickly through the market."
      : `A ${shipLabel} from the outer ocean has reached Gao. Niger boatmen and court merchants are crowding the landing to learn what route brought you here.`;
  }
  return null;
}

function americanVillageLine(city, shipLabel, localHull, returning) {
  if (city.settlementType !== "village") return null;
  if (city.manualRegion === "northwest-coast") {
    if (returning) return "Cedar-canoe crews recognized your sail beyond the headland. News of your return has already run along the shore.";
    return localHull
      ? "Cedar canoes crowd the landing, and their crews are comparing your route with the winds and currents they know."
      : `No hull rigged like your ${shipLabel} is expected among these cedar canoes. The beach has filled with people studying its masts and sail.`;
  }
  if (city.manualRegion === "great-lakes") {
    if (returning) return "Your sail has become a story along these freshwater shores. Canoes were coming out to meet you before you reached the landing.";
    return localHull
      ? "Fishing and trading canoes work these freshwater shores, carrying news between villages across the lakes."
      : `A ${shipLabel} is an astonishing sight this deep in freshwater country. Canoes are gathering around the landing to see how it came so far inland.`;
  }
  if (city.manualRegion === "mesoamerican-villages") {
    if (returning) return "Coastal canoe crews recognized your sail offshore. Market runners are already spreading word of your return.";
    return localHull
      ? "Fishing and trading canoes line the landing while market runners carry news inland."
      : `Your ${shipLabel} towers over the coastal canoes here. Traders have left the market to see what kind of ship crossed the horizon.`;
  }
  if (city.manualRegion === "explorer-encounters") {
    if (returning) return "The village recognized your sail offshore. People were waiting at the landing before your anchor fell.";
    return localHull
      ? "Canoes are already coming alongside, their crews eager to trade news about the coast ahead."
      : `Few vessels like your ${shipLabel} have ever called here. The whole settlement has come down to watch the unfamiliar sail.`;
  }
  return null;
}

function remoteApproachLine(approachKind, shipLabel, localHull, returning) {
  if (approachKind === "river") {
    if (returning) return "Your sail is known this far upriver now. Boatmen were carrying news of your return before you reached the landing.";
    return localHull
      ? "River craft reach this far, but arrivals are uncommon enough that the market knows your cargo before the ropes are tied."
      : `No ${shipLabel} like yours is expected this far upriver. Boatmen, traders, and children have crowded the landing to inspect it.`;
  }
  if (approachKind === "lake") {
    if (returning) return "Your sail has become familiar on these inland waters. Fishing boats are already coming out to meet you.";
    return localHull
      ? "Boats trade across these inland waters, though every distant sail still becomes news along the shore."
      : `Your ${shipLabel} is a rare sight on this inland water. Fishing boats have turned from their work to follow you into the landing.`;
  }
  if (returning) return "The lookout recognized your sail far offshore. The settlement is already preparing for your return.";
  return localHull
    ? "This isolated landing measures distance in arriving sails, and yours has already set the whole waterfront talking."
    : `Few vessels like your ${shipLabel} reach this isolated shore. The waterfront has emptied to see what crossed the horizon.`;
}

function shortestDistance(origin, destinations, sailingDistanceKm) {
  let shortest = Infinity;
  for (const destination of destinations) {
    const distance = sailingDistanceKm(origin, destination);
    if (distance === null) continue;
    if (!Number.isFinite(distance) || distance < 0) {
      throw new Error(`Invalid sailing distance from ${origin.city} to ${destination.city}: ${distance}`);
    }
    shortest = Math.min(shortest, distance);
  }
  return Number.isFinite(shortest) ? shortest : null;
}

function presentation(text, notable = false) {
  return Object.freeze({ text, notable });
}

function locallyFamiliarHull(cityType, shipSlug) {
  if (shipSlug === null) return true;
  if (typeof shipSlug !== "string" || shipSlug.length === 0) {
    throw new Error(`Port arrival flavor received invalid ship slug: ${shipSlug}`);
  }
  return LOCAL_SHIP_SLUGS_BY_CITY_TYPE[cityType]?.has(shipSlug) === true;
}

function regionalLine(city, scale, variationKey) {
  const regional = REGIONAL_PORT_LINES[city.cityType];
  const lines = regional?.[scale] || (scale === "major"
    ? [
        "Ships, carts, and warehouse crews crowd the waterfront; every arrival changes some merchant's plans.",
        "Porters and brokers move between the road and anchorage, watching each new cargo for an opportunity."
      ]
    : [
        "The waterfront is watching the new arrivals closely, weighing news, cargo, and opportunity together.",
        "The landing pauses to inspect your vessel, then returns to the daily bargaining over cargo and news."
      ]);
  return arrivalVariant(city, `regional-${scale}|${variationKey}`, lines);
}

function arrivalVariant(city, key, lines) {
  if (!Array.isArray(lines) || lines.length === 0 || lines.some((line) => typeof line !== "string")) {
    throw new Error(`Port arrival variant requires non-empty text for ${city.city || "unknown city"}`);
  }
  const cityIdentity = `${city.tileId ?? "no-tile"}|${city.displayCity || city.city || "unknown city"}`;
  return lines[hashString32(`${cityIdentity}|${key}`) % lines.length];
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
