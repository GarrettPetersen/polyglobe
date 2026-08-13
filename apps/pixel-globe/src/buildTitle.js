const GAME_TITLE = "Marque & Reprisal";

export function buildDocumentTitle({ edition, platformId = "browser" }) {
  if (edition !== "full" && edition !== "demo") {
    throw new Error(`Unknown document title edition: ${edition}`);
  }
  if (platformId === "steam") {
    return edition === "demo" ? `${GAME_TITLE} Demo` : GAME_TITLE;
  }
  if (platformId === "browser") {
    return edition === "demo"
      ? `${GAME_TITLE} | Demo`
      : `${GAME_TITLE} | Online Prototype`;
  }
  throw new Error(`Unknown document title platform: ${platformId}`);
}
