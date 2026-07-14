export const UNITY_FLEET_MODEL_CREDIT = Object.freeze({
  creator: "Palmov Island",
  sourceTitle: "Low Poly Cartoon Sailing Ships",
  license: "Standard Unity Asset Store EULA"
});

export const POLYNESIAN_CANOE_MODEL_CREDIT = Object.freeze({
  creator: "Hialda Alpizar",
  sourceTitle: "Polynesian Voyaging Canoe",
  license: "CC BY 4.0"
});

export const MESOAMERICAN_CANOE_MODEL_CREDIT = Object.freeze({
  creator: "irodatiii",
  sourceTitle: "Low Poly Canoe - Stylized Game Asset",
  license: "Sketchfab Free Standard"
});

export const MEDITERRANEAN_GALLEY_MODEL_CREDIT = Object.freeze({
  creator: "Museovirasto Museiverket Finnish Heritage Agency",
  sourceTitle: "Russian 22-bank Baltic galley",
  license: "CC BY 4.0"
});

export const JOSEON_TURTLE_SHIP_MODEL_CREDIT = Object.freeze({
  creator: "KargaEntiti",
  sourceTitle: "Geobukseon (Turtle Ship)",
  license: "CC BY 4.0"
});

export const JAPANESE_ATAKEBUNE_MODEL_CREDIT = Object.freeze({
  creator: "LukasSI",
  sourceTitle: "Atakebune Japanese Medieval Warship",
  license: "CC BY 4.0"
});

export const JOSEON_PANOKSEON_MODEL_CREDIT = Object.freeze({
  creator: "Heat Of Fusion, with JJakgwi",
  sourceTitle: "Panok ship (Panokseon) | 판옥선 | 板屋船",
  license: "CC BY 4.0"
});

export const NAO_VICTORIA_MODEL_CREDIT = Object.freeze({
  creator: "Javier López Cuadrado",
  sourceTitle: "Nao Victoria Galleon Ship",
  license: "CC BY 4.0"
});

export const PORTUGUESE_CARRACK_MODEL_CREDIT = Object.freeze({
  creator: "gogiart",
  sourceTitle: "Portuguese Carrack",
  license: "CC BY 4.0"
});

export const GOGIART_DHOW_MODEL_CREDIT = Object.freeze({
  creator: "gogiart",
  sourceTitle: "Dhow",
  license: "CC BY 4.0"
});

export const CYC3W_SAILING_SHIP_MODEL_CREDIT = Object.freeze({
  creator: "cyc3w",
  sourceTitle: "Sailing ship",
  license: "CC BY 4.0"
});

export const BOROBUDUR_SHIP_MODEL_CREDIT = Object.freeze({
  creator: "Nisa Nurul Azizah",
  sourceTitle: "Low Poly Borobudur Ship of Sriwijaya",
  license: "CC BY 4.0"
});

export const OTTOMAN_COASTAL_TRADER_MODEL_CREDIT = Object.freeze({
  creator: "Polygora",
  sourceTitle: "Ottoman Coastal Trade Tall Ship 3D Model",
  license: "CC BY 4.0"
});

export const MODEL_CREDITS = Object.freeze([
  UNITY_FLEET_MODEL_CREDIT,
  POLYNESIAN_CANOE_MODEL_CREDIT,
  MESOAMERICAN_CANOE_MODEL_CREDIT,
  MEDITERRANEAN_GALLEY_MODEL_CREDIT,
  JOSEON_TURTLE_SHIP_MODEL_CREDIT,
  JAPANESE_ATAKEBUNE_MODEL_CREDIT,
  JOSEON_PANOKSEON_MODEL_CREDIT,
  NAO_VICTORIA_MODEL_CREDIT,
  PORTUGUESE_CARRACK_MODEL_CREDIT,
  GOGIART_DHOW_MODEL_CREDIT,
  CYC3W_SAILING_SHIP_MODEL_CREDIT,
  BOROBUDUR_SHIP_MODEL_CREDIT,
  OTTOMAN_COASTAL_TRADER_MODEL_CREDIT
]);

export function modelCreditMarkdownLine({ creator, sourceTitle, license }) {
  return `- ${creator} - "${sourceTitle}" (${license})`;
}
