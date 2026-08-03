import { readFileSync } from "node:fs";
import {
  SHIP_STATS,
  shipLabelForSlug
} from "../../pixel-globe/src/shipStats.js";
import { shipHandoverHistoryForSlug } from "../../pixel-globe/src/shipHandoverDialogue.js";
import { CAPSULE_TITLE_LOCALES } from "../../pixel-globe/tools/capsule-title-locales.mjs";
import {
  STEAM_SCREENSHOT_LANGUAGES,
  STEAM_SCREENSHOT_SHOTS,
  steamScreenshotFileName
} from "../../pixel-globe/tools/steam-screenshot-catalog.mjs";

// A subdivision-7 icosphere has 10 × 4⁷ + 2 dual cells.
export const WORLD_MAP_CELL_COUNT = 163_842;

export const site = Object.freeze({
  title: "Marque & Reprisal",
  domain: "https://marque-and-reprisal.com",
  steamUrl: "https://store.steampowered.com/app/4516500/Marque__Reprisal",
  itchUrl: "https://garrettpetersen.itch.io/marque-and-reprisal",
  xUrl: "https://x.com/garrettpetersen",
  xHandle: "@garrettpetersen",
  creatorUrl: "https://garrettpetersen.itch.io/",
  creator: "Garrett Petersen",
  developer: "Iron Pagoda",
  publisher: "Iron Pagoda",
  copyrightHolder: "Garrett Petersen",
  release: "Coming soon",
  platforms: "Windows, macOS, and Linux",
  genre: "Open-world sailing roguelike sandbox and historical simulation",
  tagline: "Explore. Trade. Fish. Whale. Colonize. Fight. Pillage. Survive.",
  shortDescription: "Explore. Trade. Fish. Whale. Colonize. Fight. Pillage. Survive. You are a sea captain in the year 1522, and the whole world is yours to discover in this roguelike sandbox historical sailing simulator.",
  aboutLead: "You are a sea captain in the year 1522, and the whole world is yours to discover in this roguelike sandbox historical sailing simulator."
});

const MYSTERY_SHIP_SLUG = "viking-longship";
const SHIP_ROSTER_ASSET_VERSION = "2026-08-03-rotation-anchor-rebake";
const SHIP_ROSTER_LIGHTING_AZIMUTH = 2;
const SHIP_ROSTER_LIGHTING_ELEVATION = 1;
const shipSpriteManifest = JSON.parse(readFileSync(new URL(
  "../../pixel-globe/public/assets/vehicles/unity-ships/manifest.json",
  import.meta.url
), "utf8"));
const shipSprites = new Map(shipSpriteManifest.ships.map((entry) => [entry.slug, entry]));

export const shipRoster = Object.freeze(SHIP_STATS
  .filter(({ slug }) => slug !== MYSTERY_SHIP_SLUG)
  .map((stats) => {
    const sprite = shipSprites.get(stats.slug);
    if (!sprite) throw new Error(`Website ship roster needs a game sprite: ${stats.slug}`);
    if (
      sprite.headings !== 32 || sprite.sheetCols !== 8 || sprite.frameSize !== 47 ||
      sprite.shadowFrameSize !== 95 || sprite.lightAzimuthBins !== 16 ||
      sprite.lightElevationBins !== 2
    ) {
      throw new Error(`Website ship roster has an unsupported sprite atlas: ${stats.slug}`);
    }
    const { x: turntableAnchorX, y: turntableAnchorY } = sprite.turntableAnchor ?? {};
    if (
      !Number.isFinite(turntableAnchorX) || !Number.isFinite(turntableAnchorY) ||
      turntableAnchorX < 0 || turntableAnchorX >= sprite.frameSize ||
      turntableAnchorY < 0 || turntableAnchorY >= sprite.frameSize
    ) {
      throw new Error(`Website ship roster needs a registered turntable anchor: ${stats.slug}`);
    }
    return Object.freeze({
      slug: stats.slug,
      label: shipLabelForSlug(stats.slug),
      description: shipHandoverHistoryForSlug(stats.slug),
      spriteSheet: versionedShipSprite(stats.slug),
      lightSheet: versionedShipSprite(stats.slug, "-light"),
      shadeSheet: versionedShipSprite(stats.slug, "-shade"),
      shadowSheet: versionedShipSprite(stats.slug, "-shadow"),
      frameSize: sprite.frameSize,
      shadowFrameSize: sprite.shadowFrameSize,
      headings: sprite.headings,
      sheetCols: sprite.sheetCols,
      turntableAnchorX,
      turntableAnchorY,
      lightAzimuth: SHIP_ROSTER_LIGHTING_AZIMUTH,
      lightElevation: SHIP_ROSTER_LIGHTING_ELEVATION,
      cargoCapacity: stats.cargoCapacity,
      cannons: stats.cannons,
      crewCapacity: stats.crewCapacity,
      propulsion: stats.propulsion
    });
  })
  .sort((left, right) => left.label.localeCompare(right.label, "en")));

function versionedShipSprite(slug, suffix = "") {
  return `/assets/ships/${slug}-32-headings${suffix}.png?v=${SHIP_ROSTER_ASSET_VERSION}`;
}

export const mysteryShip = Object.freeze({
  label: "Mystery extra ship",
  mark: "?",
  description: "One more vessel waits beyond the ordinary shipyard roster. Its design, history, and means of discovery remain a mystery."
});

export const LOCALIZED_CAPSULE_ASSET_NAMES = Object.freeze([
  "capsule_header",
  "capsule_main",
  "capsule_small",
  "capsule_title",
  "capsule_title_with_ship",
  "capsule_vertical",
  "event_cover",
  "event_header",
  "itchio_cover",
  "library_capsule",
  "library_header",
  "library_logo",
  "social_share"
]);

export const localizedCapsules = Object.freeze(CAPSULE_TITLE_LOCALES.map((locale) => {
  const label = locale.appLocale === "es" ? "Spanish (Spain)" : locale.label;
  return Object.freeze({
    appLocale: locale.appLocale,
    steamCode: locale.steamCode,
    label,
    title: `${locale.upperWord} & ${locale.lowerWord}`,
    previewFile: `capsule_main_${locale.steamCode}.png`,
    archiveFile: `marque-and-reprisal-capsules-${locale.steamCode}.zip`
  });
}));

export const languages = Object.freeze(localizedCapsules.map(({ label }) => label));

export const screenshotLocales = Object.freeze(STEAM_SCREENSHOT_LANGUAGES.map((locale) => {
  const capsuleLocale = localizedCapsules.find(({ appLocale }) => appLocale === locale.id);
  if (!capsuleLocale) {
    throw new Error(`Screenshot locale has no matching website language: ${locale.id}`);
  }
  return Object.freeze({
    appLocale: locale.id,
    steamCode: locale.steamCode,
    label: capsuleLocale.label,
    nativeLabel: locale.nativeLabel,
    archiveFile: `marque-and-reprisal-screenshots-${locale.steamCode}.zip`
  });
}));

const SCREENSHOT_ALT_TEXT = Object.freeze({
  "explore-pyramids": "A captain reports the discovery of the Nubian pyramids while sailing the Nile.",
  "trade-cloves": "The Ternate market offers cloves, fish, and timber with prices, duties, stock, and cargo space.",
  "fish-grand-banks": "A sailing ship casts its net into a dense school of cod on the Grand Banks.",
  "whale-hunt": "A harpooned right whale tows a ship through dark water as the line holds.",
  "fight-carrack-broadside": "Carracks exchange cannon fire off Iberia with broadside arcs visible on the water.",
  "pillage-havana": "Havana burns after its shore battery is disabled by a naval bombardment.",
  "colonize-port-royal": "The governor of Port Royal asks the captain to resupply the new colony with grain.",
  "survive-lightning": "Lightning strikes a ship during a violent storm and damages its hull.",
  "meet-panda": "A captain decides whether to let an unexpected panda remain aboard the ship."
});

export const screenshots = Object.freeze(STEAM_SCREENSHOT_SHOTS.map((shot) => {
  const alt = SCREENSHOT_ALT_TEXT[shot.id];
  if (!alt) throw new Error(`Website screenshot needs alt text: ${shot.id}`);
  return Object.freeze({
    id: shot.id,
    order: shot.order,
    title: shot.title,
    alt,
    prefix: `${String(shot.order).padStart(2, "0")}_${shot.id}`,
    files: Object.freeze(Object.fromEntries(screenshotLocales.map((locale) => [
      locale.steamCode,
      steamScreenshotFileName(shot, locale)
    ])))
  });
}));

function screenshotUrl(id, steamCode = "english") {
  const shot = screenshots.find((candidate) => candidate.id === id);
  if (!shot) throw new Error(`Unknown website screenshot: ${id}`);
  const file = shot.files[steamCode];
  if (!file) throw new Error(`Screenshot ${id} has no ${steamCode} file`);
  return `/assets/press/screenshots/${file}`;
}

export const features = Object.freeze([
  Object.freeze({
    id: "explore",
    title: "Explore",
    eyebrow: "A globe without edges",
    copy: `The world of Marque & Reprisal is a fully realized, ${WORLD_MAP_CELL_COUNT.toLocaleString("en-US")}-cell map of the entire Earth, complete with accurate geography, navigable rivers and lakes, mountains, a detailed weather simulation, and many ancient and natural wonders to discover.`,
    video: "/assets/video/explore.webm",
    poster: screenshotUrl("explore-pyramids")
  }),
  Object.freeze({
    id: "trade",
    title: "Trade",
    eyebrow: "Every port has a price",
    copy: "The cities and villages of the world buy and sell different goods at different prices, with supply and demand for goods and specie reacting dynamically to the actions of the player and the hundreds of NPC ships plying the trade routes in search of riches.",
    video: "/assets/video/trade.webm",
    poster: screenshotUrl("trade-cloves")
  }),
  Object.freeze({
    id: "fish",
    title: "Fish",
    eyebrow: "Work the water",
    copy: "Fish for many different species of fish! Upgrade your ship and your net to catch more fish, and sell them in the best markets to earn profits.",
    video: "/assets/video/fish.webm",
    poster: screenshotUrl("fish-grand-banks")
  }),
  Object.freeze({
    id: "whale",
    title: "Whale",
    eyebrow: "Great and mysterious beasts",
    copy: "The ocean contains great and mysterious beasts! There are multiple different whale species in the game, with ecologically accurate ranges and behaviours. Whales breed and have babies, and you can often see a whale calf following its mother through the ocean. Kill a whale with your harpoon and collect its valuable blubber to sell!",
    video: "/assets/video/whale.webm",
    poster: screenshotUrl("whale-hunt")
  }),
  Object.freeze({
    id: "colonize",
    title: "Colonize",
    eyebrow: "Carry a settlement across the sea",
    copy: "Perhaps on your journey you will meet colonists seeking passage to the New World. Help them and you may found new cities together.",
    video: "/assets/video/colonize.webm",
    poster: screenshotUrl("colonize-port-royal")
  }),
  Object.freeze({
    id: "fight",
    title: "Fight",
    eyebrow: "Choose your broadside",
    copy: "Do battle with pirates and hostile nations! Or become a pirate yourself and set out in search of rich merchant ships to seize.",
    video: "/assets/video/fight.webm",
    poster: screenshotUrl("fight-carrack-broadside")
  }),
  Object.freeze({
    id: "pillage",
    title: "Pillage",
    eyebrow: "Take the port",
    copy: "With a large enough warship, you can bombard a hostile city to silence its shore batteries, then land marines to capture the port!",
    video: "/assets/video/pillage.webm",
    poster: screenshotUrl("pillage-havana")
  }),
  Object.freeze({
    id: "survive",
    title: "Survive",
    eyebrow: "One captain. One voyage.",
    copy: "If you die in Marque & Reprisal, there's no going back. You need to start a new voyage with a new captain. Death comes in many forms, from hunger and thirst to stormy seas and pirate attacks.",
    video: "/assets/video/survive.webm",
    poster: screenshotUrl("survive-lightning")
  })
]);

export const qAndA = Object.freeze([
  Object.freeze({
    question: "What kind of game is Marque & Reprisal?",
    answer: Object.freeze([
      `Marque & Reprisal is a roguelike sandbox game about being a sea captain in 1522. The player starts with a small ship and an overarching goal, like paying off a family debt or hunting a white whale to the ends of the earth. You win the run if you can complete your goal and return home without dying. While working up to that goal, you will need money. And you can get money in various ways. My favourite way is to sail to the Spice Islands, load up my ship with cloves and nutmeg, and then sail around the Cape of Good Hope to sell the spices in Europe for a massive profit. Alternatively, you can try harpooning a whale to sell its valuable blubber. If you can earn enough money, you can buy a bigger, better ship. More hold space means your trade runs will be more profitable. More cannons let you become a pirate or privateer, exchanging broadsides with other ships for glory and plunder.`
    ])
  }),
  Object.freeze({
    question: "Why 1522?",
    answer: Object.freeze([
      `Because that's when my favourite SNES game, Uncharted Waters II: New Horizons was set. I wanted to make a modern homage to that game, so I borrowed its start date. 1522 comes right after a bunch of world-changing events in 1521: Martin Luther escalated the Protestant Reformation by refusing to recant at the Diet of Worms, and a Spanish-led coalition under Hernán Cortés captured the Aztec capital at the Siege of Tenochtitlan. The Portuguese have established bases around the Indian Ocean, but the global colonial order that follows is still taking shape.`
    ])
  }),
  Object.freeze({
    question: "What happens when your captain dies? Does anything carry over into the next run?",
    answer: Object.freeze([
      `Your run stats are recorded, and count towards achievements. But currently there is no carry-over. You just start with a new sea captain, potentially in another part of the world.`
    ])
  }),
  Object.freeze({
    question: "How historically accurate is Marque & Reprisal, and where do you deliberately depart from history?",
    answer: Object.freeze([
      `I try to model as much history as possible in the starting conditions. I have a huge matrix of the political relationships between all of the 30+ factions in the game. The Ming dynasty's maritime trade restrictions are in it, for instance.`,
      `I depart from history in a few places: First, it's a game about sailing, so waterways are more navigable than they are in real life. You can sail straight up the Nile to Lake Victoria and discover it, because that's more fun than blocking you at the First Cataract. Second, player actions are free to depart from history, including through side quests that bring later historical events to the 1520s. For instance, the Portuguese didn't establish a trade presence in Nagasaki until the 1570s, but the player can do a side quest where they make that happen right away. A lot of colonization side quests establish colonial settlements that were historically created later than the dates in the game (though there's no time cap on games, so you could theoretically play for a very long time and do each of the quests when they are historically supposed to happen). If the player wants to do other ahistorical things like conquer Istanbul and topple the Ottoman Empire 400 years early, they can do it.`
    ])
  }),
  Object.freeze({
    question: "Do you have to return home to win a run?",
    answer: Object.freeze([
      `Yes, you currently have to return home to complete the run. I might add quest lines that have the captain end somewhere besides home, but currently you need to go home. You need a place to retire after your adventure.`
    ])
  }),
  Object.freeze({
    question: "How large is the game's world, and how closely does its geography match the real Earth?",
    answer: Object.freeze([
      `The world is a Goldberg polyhedron with 163,830 hexes and 12 pentagons. You can think of it like a big soccer ball: the 12 pentagons allow the mostly hexagonal tiling to loop around and connect back with itself, rather than tiling the plane.`,
      `The world geography is based on real geography from public mapping datasets, including coastlines, rivers, biomes, and human settlements. Precipitation, wind, and seasonal polar sea ice are all pre-baked into an annual loop based on real climate data and procedural simulation.`,
      `To make the geography work, I had to make some manual tweaks. For instance, the Gibraltar hex is mostly land, and some hexes in Panama are mostly sea, but making Gibraltar closed and Panama open would have dramatic implications for navigation, so those are manually adjusted to keep the topology of the world's landmasses accurate. Many small Pacific islands are expanded to hex size rather than being absorbed into the ocean, even if they ought to be too small to appear. Some coastal ports ended up falling one hex away from the coast and needing to be rescued, either by bumping the city or adjusting the coastline.`
    ])
  }),
  Object.freeze({
    question: "How do wind and weather affect sailing, and can the player predict them?",
    answer: Object.freeze([
      `Your sailing ship works like a real sailing ship. It will stall if you try to go directly upwind. You have to do what's called "tacking," which is zig-zagging across the wind to get somewhere upwind of you. The fastest way to sail is on a beam reach, with the wind coming in sideways. Hit that perfect beam reach and your ship glides in an extremely satisfying way. Trying to get to a port directly upwind is slightly frustrating, even anxiety-inducing if you're low on supplies and need to get there fast. Some ships, like Mediterranean galleys and Joseon turtle ships, have oars, and those let you travel directly upwind.`,
      `I think the sailing is a really strong micro-loop that adds a tiny bit of challenge to the moment-to-moment play.`,
      `Wind directions and speeds are procedurally simulated based on real-world wind patterns, so with a bit of knowledge of prevailing wind patterns, you can perfectly time that slingshot around Africa to get to the Indian Ocean, just like the real Vasco da Gama did.`
    ])
  }),
  Object.freeze({
    question: "How do food, water, storms, and other dangers turn a voyage into a survival game?",
    answer: Object.freeze([
      `Just like in real life, you die if you go too long without food and water, or if your ship gets struck by lightning in a storm and blows apart, leaving you floating stranded in the middle of the Atlantic. No savescumming. You have choices about how to provision your ship: play it safe and bring extra food and water, or leave extra space in the hold to fill with trade goods or fish or whale blubber.`
    ])
  }),
  Object.freeze({
    question: "Do you have to fight and become a pirate, or can you complete a run through peaceful activities like trading, fishing, and exploration?",
    answer: Object.freeze([
      `Fighting is optional! You can be a trader, fisherman, or explorer if you like. If you see a hostile ship on the horizon, you can try to sail the other way.`
    ])
  }),
  Object.freeze({
    question: "What changes from one run to the next?",
    answer: Object.freeze([
      `Every run randomly spawns you into the world as a new procedurally generated character. You could be a Polish-Lithuanian fisherman trying to pay off a large family debt, or a Japanese whaler seeking revenge against a white whale (my original concept; nobody has ever written a story about revenge against a white whale before), or an Ottoman explorer trying to find all the wonders of the world.`
    ])
  })
]);

export const pressLogos = Object.freeze([
  Object.freeze({ file: "marque-and-reprisal-logo.png", title: "Transparent title logo", detail: "1280 × 720 PNG" }),
  Object.freeze({ file: "marque-and-reprisal-header.png", title: "Store header", detail: "920 × 430 PNG" }),
  Object.freeze({ file: "marque-and-reprisal-icon.png", title: "Square icon", detail: "256 × 256 PNG" })
]);

export const pressCapsuleArt = Object.freeze([
  Object.freeze({
    file: "complete-capsule.png",
    title: "Complete capsule",
    detail: "1232 × 706 PNG · all layers",
    alt: "Complete Marque & Reprisal capsule art with the ship crossing the title at sunset."
  }),
  Object.freeze({
    file: "title-with-ship.png",
    title: "Title + ship lockup",
    detail: "1232 × 706 transparent PNG",
    alt: "Transparent Marque & Reprisal title and ship lockup with interleaved lettering.",
    transparent: true
  }),
  Object.freeze({
    file: "title.png",
    title: "Title",
    detail: "1232 × 706 transparent PNG",
    alt: "Transparent Marque & Reprisal title lettering.",
    transparent: true
  }),
  Object.freeze({
    file: "background.png",
    title: "Sunset background",
    detail: "1232 × 706 PNG · aligned base",
    alt: "Pixel-art sunset ocean background without the ship or title."
  }),
  Object.freeze({
    file: "ship.png",
    title: "Ship",
    detail: "1232 × 706 transparent PNG",
    alt: "Transparent pixel-art sailing ship layer.",
    transparent: true
  }),
  Object.freeze({
    file: "reflection.png",
    title: "Ship reflection",
    detail: "1232 × 706 transparent PNG",
    alt: "Transparent pixel-art ship reflection layer.",
    transparent: true
  }),
  Object.freeze({
    file: "title-upper.png",
    title: "Upper title layer",
    detail: "1232 × 706 transparent PNG",
    alt: "Transparent upper Marque & Reprisal title layer intended to sit behind the ship.",
    transparent: true
  }),
  Object.freeze({
    file: "title-lower.png",
    title: "Lower title layer",
    detail: "1232 × 706 transparent PNG",
    alt: "Transparent lower Marque & Reprisal title layer intended to sit in front of the ship.",
    transparent: true
  })
]);
