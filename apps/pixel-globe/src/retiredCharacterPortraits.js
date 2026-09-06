// Explicit asset retirements for supported saves. Never substitute an unknown ID.
// Keep these mappings while saves containing portrait-authored-sprites-22 are supported.
// Costume judgments are documented in docs/portrait-pack-audit.md.
export const RETIRED_CHARACTER_PORTRAITS = Object.freeze({
  "viking-men-portrait-pack-by-captainskeleto-viking-portrait-male-3": Object.freeze({
    "replacementSourceId": "viking-men-portrait-pack-by-captainskeleto-viking-portrait-male-1",
    "sex": "male",
    "reason": "Animal ears on the gray-haired Viking."
  }),
  "viking-men-portrait-pack-by-captainskeleto-viking-portrait-male-5": Object.freeze({
    "replacementSourceId": "viking-men-portrait-pack-by-captainskeleto-viking-portrait-male-2",
    "sex": "male",
    "reason": "Animal-head hood with prominent ears."
  }),
  "women-peasant-pack-by-captainskeleto-women-peasant": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-herbalist-women-portrait-herbalist-women-portrait",
    "sex": "female",
    "reason": "Flowered picture hat and later blouse silhouette."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-00": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-seamstress-women-portrait-women-seamstress-portrait",
    "sex": "female",
    "reason": "Fedora and modern tailored clothing."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-01": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-22",
    "sex": "female",
    "reason": "Ribboned picture hat and later pinafore silhouette."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-02": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-33",
    "sex": "female",
    "reason": "Pointed elf ears."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-03": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-54",
    "sex": "female",
    "reason": "Pointed elf ears and fantasy costume."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-04": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-noblewomen-noblewomen-portrait",
    "sex": "female",
    "reason": "Pointed elf ears and visible magical flame."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-10": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-seamstress-women-portrait-women-seamstress-portrait",
    "sex": "female",
    "reason": "Fedora and modern tailored clothing."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-11": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-22",
    "sex": "female",
    "reason": "Ribboned picture hat and later pinafore silhouette."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-12": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-33",
    "sex": "female",
    "reason": "Pointed elf ears."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-13": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-seamstress-women-portrait-women-seamstress-portrait",
    "sex": "female",
    "reason": "Visible magical orb."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-14": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-54",
    "sex": "female",
    "reason": "Pointed elf ears and fantasy costume."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-20": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-seamstress-women-portrait-women-seamstress-portrait",
    "sex": "female",
    "reason": "Fedora and modern tailored clothing."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-21": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-22",
    "sex": "female",
    "reason": "Ribboned picture hat and later pinafore silhouette."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-24": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-women-baker-women-baker-portrait",
    "sex": "female",
    "reason": "Later feathered or buckled fashion hat."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-30": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-33",
    "sex": "female",
    "reason": "Pointed elf ears."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-31": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-22",
    "sex": "female",
    "reason": "Ribboned picture hat and later pinafore silhouette."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-32": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-women-baker-women-baker-portrait",
    "sex": "female",
    "reason": "Later frilled maid costume."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-34": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-women-baker-women-baker-portrait",
    "sex": "female",
    "reason": "Later feathered or buckled fashion hat."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-40": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-noblewomen-noblewomen-portrait",
    "sex": "female",
    "reason": "Later high-collared dress with ornamental neckwear."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-41": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-women-baker-women-baker-portrait",
    "sex": "female",
    "reason": "Later frilled maid costume."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-42": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-women-baker-women-baker-portrait",
    "sex": "female",
    "reason": "Later frilled maid costume."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-43": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-noblewomen-noblewomen-portrait",
    "sex": "female",
    "reason": "Later high-collared dress with ornamental neckwear."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-44": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-noblewomen-noblewomen-portrait",
    "sex": "female",
    "reason": "Later high-collared dress with ornamental neckwear."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-50": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-noblewomen-noblewomen-portrait",
    "sex": "female",
    "reason": "Later high-collared dress with ornamental neckwear."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-51": Object.freeze({
    "replacementSourceId": "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-54",
    "sex": "female",
    "reason": "Pointed elf ears and fantasy costume."
  }),
  "women-portrait-pack-by-captainskeleto-women-portrait-women-portrait-53": Object.freeze({
    "replacementSourceId": "ultimate-portrait-pack-v1-0-women-baker-women-baker-portrait",
    "sex": "female",
    "reason": "Later frilled maid costume."
  })
});

export function retiredCharacterPortrait(sourceId) {
  return Object.hasOwn(RETIRED_CHARACTER_PORTRAITS, sourceId)
    ? RETIRED_CHARACTER_PORTRAITS[sourceId]
    : null;
}
