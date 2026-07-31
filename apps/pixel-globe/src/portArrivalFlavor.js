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
    "mediterranean-galley"
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
    major: "Barges crowd the river stairs, and the warehouse clerks are already arguing over the next tide's cargo.",
    ordinary: "The quay watches every arriving sail closely; foreign cargo can change a season's prices here."
  }),
  "south-asian": Object.freeze({
    major: "Brokers from inland markets crowd the waterfront, each waiting to learn what this tide has brought.",
    ordinary: "Caravans meet the boats at this quay, so news of a useful cargo travels inland quickly."
  }),
  "southeast-asian": Object.freeze({
    major: "Pilots, brokers, and sailors from several seas fill the roadstead; no cargo remains a secret for long.",
    ordinary: "The harbor lives by the monsoon routes, and every new sail starts fresh bargaining on the quay."
  }),
  "islamic-desert": Object.freeze({
    major: "River craft, caravans, and sea-going merchants meet here, filling the customs house with a dozen languages.",
    ordinary: "The quay is the hinge between caravan roads and the sea; useful cargo will find a buyer."
  }),
  mediterranean: Object.freeze({
    major: "Galleys, coasters, and deep-water merchants crowd the harbor, each carrying news from another shore.",
    ordinary: "Coasters call with every change of wind, but an unusual cargo can still stir the whole market."
  }),
  "northern-european": Object.freeze({
    major: "Warehouses line the water and the cranes seldom rest; merchants here measure news by arriving sails.",
    ordinary: "The harbor lives on coasting trade, and the quay is already judging what your hold might contain."
  }),
  "sub-saharan": Object.freeze({
    major: "Gold, ivory, cloth, and provisions pass between inland traders and ocean-going captains on this waterfront.",
    ordinary: "The shore traders know the inland roads and the sea lanes alike; they are already studying your cargo."
  }),
  mesoamerican: Object.freeze({
    major: "Canoes bring produce from along the coast while market runners carry news inland.",
    ordinary: "The landing is busy with canoes, fishers, and traders eager to learn what came over the horizon."
  }),
  andean: Object.freeze({
    major: "Runners and coastal craft carry news from this landing toward the high country.",
    ordinary: "The landing joins the sea road to settlements inland, and every unfamiliar sail draws attention."
  }),
  polynesian: Object.freeze({
    major: "Canoes from neighboring islands lie along the beach, their crews trading news as eagerly as cargo.",
    ordinary: "The beach is busy with canoes, and every crew wants to know what winds carried you here."
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
  navigation = null
}) {
  validateArrivalOptions({ city, playerShipLabel, returning, navigation });
  const shipLabel = playerShipLabel.toLowerCase();
  const localHull = locallyFamiliarHull(city.cityType, playerShipSlug);
  const namedLine = namedRemotePortLine(city, shipLabel, localHull, returning);
  if (namedLine) return presentation(namedLine, !returning);

  if (city.manualRegion === "pacific-islands") {
    if (returning) {
      return presentation(localHull
        ? "The headland watch knew your canoe's sail before you reached the reef. News of your return is already crossing the village."
        : `The headland watch remembered your ${shipLabel}. People were gathering on the beach before you crossed the reef.`);
    }
    return presentation(localHull
      ? "Your canoe carries the cut of distant islands. The elders are already asking which winds and stars brought you here."
      : `That ${shipLabel} is unlike anything that works this lagoon. The whole village has come to the beach to watch it cross the reef.`, true);
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
    return presentation(regionalLine(city.cityType, "ordinary"));
  }

  return presentation(regionalLine(city.cityType, (city.population || 0) >= 100000 ? "major" : "ordinary"));
}

export function portArrivalFlavor(options) {
  return portArrivalPresentation(options).text;
}

function validateArrivalOptions({ city, playerShipLabel, returning, navigation }) {
  if (!city || typeof city !== "object") throw new Error("Port arrival flavor requires a city");
  if (city.population !== undefined &&
      (!Number.isFinite(city.population) || city.population < 0)) {
    throw new Error(`Port arrival flavor received invalid population for ${city.city || "unknown city"}`);
  }
  if (typeof playerShipLabel !== "string" || playerShipLabel.trim() === "") {
    throw new Error("Port arrival flavor requires a ship label");
  }
  if (typeof returning !== "boolean") throw new Error("Port arrival flavor requires a return-visit flag");
  if (navigation !== null) {
    if (!PORT_APPROACH_KINDS.has(navigation?.approachKind) || typeof navigation.remote !== "boolean") {
      throw new Error(`Port arrival flavor received invalid navigation for ${city.city || "unknown city"}`);
    }
  }
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

function regionalLine(cityType, scale) {
  const regional = REGIONAL_PORT_LINES[cityType];
  if (regional) return regional[scale];
  return scale === "major"
    ? "Ships, carts, and warehouse crews crowd the waterfront; every arrival changes some merchant's plans."
    : "The waterfront is watching the new arrivals closely, weighing news, cargo, and opportunity together.";
}
