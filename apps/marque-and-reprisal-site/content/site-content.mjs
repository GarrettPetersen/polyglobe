import { CAPSULE_TITLE_LOCALES } from "../../pixel-globe/tools/capsule-title-locales.mjs";

// A subdivision-7 icosphere has 10 × 4⁷ + 2 dual cells.
export const WORLD_MAP_CELL_COUNT = 163_842;

export const site = Object.freeze({
  title: "Marque & Reprisal",
  domain: "https://marque-and-reprisal.com",
  itchUrl: "https://garrettpetersen.itch.io/marque-and-reprisal",
  xUrl: "https://x.com/garrettpetersen",
  xHandle: "@garrettpetersen",
  developerUrl: "https://garrettpetersen.itch.io/",
  developer: "Garrett Petersen",
  publisher: "Garrett Petersen",
  release: "Coming soon",
  steamStatus: "Page coming soon",
  platforms: "Windows; macOS and Linux planned",
  genre: "Open-world sailing roguelike sandbox and historical simulation",
  tagline: "Explore. Trade. Fish. Whale. Colonize. Fight. Pillage. Survive.",
  shortDescription: "Explore. Trade. Fish. Whale. Colonize. Fight. Pillage. Survive. You are a sea captain in the year 1522, and the whole world is yours to discover in this roguelike sandbox historical sailing simulator.",
  aboutLead: "You are a sea captain in the year 1522, and the whole world is yours to discover in this roguelike sandbox historical sailing simulator."
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

export const features = Object.freeze([
  Object.freeze({
    id: "explore",
    title: "Explore",
    eyebrow: "A globe without edges",
    copy: `The world of Marque & Reprisal is a fully realized, ${WORLD_MAP_CELL_COUNT.toLocaleString("en-US")}-cell map of the entire Earth, complete with accurate geography, navigable rivers and lakes, mountains, a detailed weather simulation, and many ancient and natural wonders to discover.`,
    video: "/assets/video/explore.webm",
    poster: "/assets/press/screenshots/01-explore-the-pyramids.png"
  }),
  Object.freeze({
    id: "trade",
    title: "Trade",
    eyebrow: "Every port has a price",
    copy: "The cities and villages of the world buy and sell different goods at different prices, with supply and demand for goods and specie reacting dynamically to the actions of the player and the hundreds of NPC ships plying the trade routes in search of riches.",
    video: "/assets/video/trade.webm",
    poster: "/assets/press/screenshots/02-trade-in-ternate.png"
  }),
  Object.freeze({
    id: "fish",
    title: "Fish",
    eyebrow: "Work the water",
    copy: "Fish for many different species of fish! Upgrade your ship and your net to catch more fish, and sell them in the best markets to earn profits.",
    video: "/assets/video/fish.webm",
    poster: "/assets/press/screenshots/03-fish-the-reef.png"
  }),
  Object.freeze({
    id: "whale",
    title: "Whale",
    eyebrow: "Great and mysterious beasts",
    copy: "The ocean contains great and mysterious beasts! There are multiple different whale species in the game, with ecologically accurate ranges and behaviours. Whales breed and have babies, and you can often see a whale calf following its mother through the ocean. Kill a whale with your harpoon and collect its valuable blubber to sell!",
    video: "/assets/video/whale.webm",
    poster: "/assets/press/screenshots/04-hunt-a-whale.png"
  }),
  Object.freeze({
    id: "colonize",
    title: "Colonize",
    eyebrow: "Carry a settlement across the sea",
    copy: "Perhaps on your journey you will meet colonists seeking passage to the New World. Help them and you may found new cities together.",
    video: "/assets/video/colonize.webm",
    poster: "/assets/press/screenshots/05-found-a-colony.png"
  }),
  Object.freeze({
    id: "fight",
    title: "Fight",
    eyebrow: "Choose your broadside",
    copy: "Do battle with pirates and hostile nations! Or become a pirate yourself and set out in search of rich merchant ships to seize.",
    video: "/assets/video/fight.webm",
    poster: "/assets/press/screenshots/06-fight-off-iberia.png"
  }),
  Object.freeze({
    id: "pillage",
    title: "Pillage",
    eyebrow: "Take the port",
    copy: "With a large enough warship, you can bombard a hostile city to silence its shore batteries, then land marines to capture the port!",
    video: "/assets/video/pillage.webm",
    poster: "/assets/press/screenshots/07-pillage-havana.png"
  }),
  Object.freeze({
    id: "survive",
    title: "Survive",
    eyebrow: "One captain. One voyage.",
    copy: "If you die in Marque & Reprisal, there's no going back. You need to start a new voyage with a new captain. Death comes in many forms, from hunger and thirst to stormy seas and pirate attacks.",
    video: "/assets/video/survive.webm",
    poster: "/assets/press/screenshots/08-survive-a-storm.png"
  })
]);

export const screenshots = Object.freeze([
  Object.freeze({ file: "01-explore-the-pyramids.png", title: "Explore the Pyramids", alt: "A captain discovers the Nubian pyramids on the world map." }),
  Object.freeze({ file: "02-trade-in-ternate.png", title: "Trade in Ternate", alt: "The trading interface at Ternate shows goods, prices, cargo space, and local supply." }),
  Object.freeze({ file: "03-fish-the-reef.png", title: "Fish the Reef", alt: "A ship fishes near a tropical reef while a storm approaches." }),
  Object.freeze({ file: "04-hunt-a-whale.png", title: "Hunt a Whale", alt: "A ship is pulled through dark water by a harpooned whale." }),
  Object.freeze({ file: "05-found-a-colony.png", title: "Found a Colony", alt: "A newly founded colony at Port Royal appears on the globe." }),
  Object.freeze({ file: "06-fight-off-iberia.png", title: "Fight off Iberia", alt: "Several ships exchange cannon fire off the coast of Iberia." }),
  Object.freeze({ file: "07-pillage-havana.png", title: "Pillage Havana", alt: "Havana burns after a naval bombardment in bright Caribbean waters." }),
  Object.freeze({ file: "08-survive-a-storm.png", title: "Survive a Storm", alt: "A small ship takes hull damage while sailing through a violent Atlantic storm." })
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
