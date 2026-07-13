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

export const MODEL_CREDITS = Object.freeze([
  UNITY_FLEET_MODEL_CREDIT,
  POLYNESIAN_CANOE_MODEL_CREDIT,
  MESOAMERICAN_CANOE_MODEL_CREDIT,
  MEDITERRANEAN_GALLEY_MODEL_CREDIT
]);

export function modelCreditMarkdownLine({ creator, sourceTitle, license }) {
  return `- ${creator} - "${sourceTitle}" (${license})`;
}
