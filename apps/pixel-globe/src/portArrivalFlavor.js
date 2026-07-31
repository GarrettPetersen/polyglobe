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

export function portArrivalFlavor({
  city,
  playerShipSlug = null,
  playerShipLabel = "vessel",
  returning = false
}) {
  if (!city || typeof city !== "object") throw new Error("Port arrival flavor requires a city");
  if (city.population !== undefined &&
      (!Number.isFinite(city.population) || city.population < 0)) {
    throw new Error(`Port arrival flavor received invalid population for ${city.city || "unknown city"}`);
  }
  if (typeof playerShipLabel !== "string" || playerShipLabel.trim() === "") {
    throw new Error("Port arrival flavor requires a ship label");
  }
  if (typeof returning !== "boolean") throw new Error("Port arrival flavor requires a return-visit flag");

  const shipLabel = playerShipLabel.toLowerCase();
  const localHull = locallyFamiliarHull(city.cityType, playerShipSlug);
  if (city.manualRegion === "pacific-islands") {
    if (returning) {
      return localHull
        ? "The headland watch knew your canoe's sail before you reached the reef. News of your return is already crossing the village."
        : `The headland watch remembered your ${shipLabel}. People were gathering on the beach before you crossed the reef.`;
    }
    return localHull
      ? "Your canoe carries the cut of distant islands. The elders are already asking which winds and stars brought you here."
      : `That ${shipLabel} is unlike anything that works this lagoon. The whole village has come to the beach to watch it cross the reef.`;
  }

  if (city.manualRegion === "spice-islands" && city.settlementType === "village") {
    return localHull
      ? "Sails move constantly among these islands, but every crew still asks who has cloves, nutmeg, or news to trade."
      : `A foreign ${shipLabel} draws notice here. By sunset every island trader will know your flag and what your hold might buy.`;
  }

  if (city.settlementType === "village") {
    if (returning) {
      return localHull
        ? "Your sail was recognized offshore. The landing already has news and cargo waiting for you."
        : `They recognized your ${shipLabel} beyond the harbor mouth. Word of your return has brought people down to the water.`;
    }
    if (!localHull) {
      return city.islandSettlement
        ? `Few ships like your ${shipLabel} find this island. The landing has emptied to see what crossed the horizon.`
        : `Your ${shipLabel} is unlike the craft that usually work this shore. Traders and children alike have come to stare.`;
    }
    return regionalLine(city.cityType, "ordinary");
  }

  return regionalLine(city.cityType, (city.population || 0) >= 100000 ? "major" : "ordinary");
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
