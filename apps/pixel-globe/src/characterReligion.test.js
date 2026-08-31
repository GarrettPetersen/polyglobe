import assert from "node:assert/strict";
import test from "node:test";

import {
  RELIGION_CATALOG,
  inferCharacterReligion,
  isChristianReligion,
  isIslamicReligion,
  islamicReligionForHome,
  religionCandidatesForCharacter,
  religionCandidatesForHome
} from "./characterReligion.js";
import { gameIconIds } from "./gameIcons.js";

test("every religion has a display label and a registered native-size icon", () => {
  const iconIds = new Set(gameIconIds());
  for (const religion of RELIGION_CATALOG) {
    assert.ok(religion.label.length > 0, religion.id);
    assert.ok(iconIds.has(religion.iconId), `${religion.id}: ${religion.iconId}`);
  }
});

test("religion follows the home city rather than merely the ruling faction", () => {
  const ottomanGreek = religionCandidatesForHome({
    cityId: "athens|greece",
    city: "Athens",
    country: "Greece",
    cityType: "mediterranean",
    factionId: "ottoman"
  });
  assert.deepEqual(
    ottomanGreek.map(({ id }) => id),
    ["eastern-orthodox", "sunni-islam"]
  );

  const portugueseGoa = religionCandidatesForHome({
    cityId: "goa|india",
    city: "Goa",
    country: "India",
    cityType: "south-asian",
    factionId: "portugal"
  });
  assert.deepEqual(
    portugueseGoa.map(({ id }) => id),
    ["hinduism", "sunni-islam", "roman-catholic", "jainism"]
  );
});

test("Catholic settler colonies retain their founding faith", () => {
  assert.deepEqual(
    religionCandidatesForHome({
      cityId: "st. augustine|united states of america",
      city: "St. Augustine",
      country: "United States of America",
      cityType: "mediterranean",
      factionId: "spain",
      colonialFoundingType: "settler-colony"
    }).map(({ id }) => id),
    ["roman-catholic"]
  );
});

test("distinctive 1522 religious contexts remain explicit", () => {
  const cases = [
    [{ cityId: "rome|italy", city: "Rome", country: "Italy", cityType: "mediterranean", factionId: "papal-states" }, "roman-catholic"],
    [{ cityId: "rhodes|greece", city: "Rhodes", country: "Greece", cityType: "mediterranean", factionId: "hospitallers" }, "roman-catholic"],
    [{ cityId: "moscow|russian federation", city: "Moscow", country: "Russian Federation", cityType: "northern-european", factionId: "muscovy" }, "eastern-orthodox"],
    [{ cityId: "tabriz|iran", city: "Tabriz", country: "Iran", cityType: "islamic-desert", factionId: "safavid" }, "shia-islam"],
    [{ cityId: "baghdad|iraq", city: "Baghdad", country: "Iraq", cityType: "islamic-desert", factionId: "safavid" }, "sunni-islam"],
    [{ cityId: "muscat|oman", city: "Muscat", country: "Oman", cityType: "islamic-desert", factionId: "portugal" }, "ibadi-islam"],
    [{ cityId: "kyoto|japan", city: "Kyoto", country: "Japan", cityType: "east-asian", factionId: "japan" }, "kami-buddhist"],
    [{ cityId: "ayutthaya|thailand", city: "Ayutthaya", country: "Thailand", cityType: "southeast-asian", factionId: "ayutthaya" }, "theravada-buddhism"],
    [{ cityId: "male|maldives", city: "Male", country: "Maldives", cityType: "south-asian", factionId: "neutral" }, "sunni-islam"],
    [{ cityId: "cuzco|peru", city: "Cuzco", country: "Peru", cityType: "andean", factionId: "inca" }, "andean-traditional"],
    [{ cityId: "hawaii village|hawaii", city: "Hawaii Village", country: "Hawaii", cityType: "polynesian", factionId: "neutral" }, "polynesian-traditional"]
  ];
  for (const [homePort, expected] of cases) {
    assert.equal(religionCandidatesForHome(homePort)[0].id, expected, homePort.city);
  }
  assert.deepEqual(
    religionCandidatesForHome({
      cityId: "baghdad|iraq",
      city: "Baghdad",
      country: "Iraq",
      cityType: "islamic-desert",
      factionId: "safavid"
    }).map(({ id }) => id),
    ["sunni-islam", "shia-islam", "judaism"]
  );
  assert.deepEqual(
    religionCandidatesForHome({
      cityId: "rhodes|greece",
      city: "Rhodes",
      country: "Greece",
      cityType: "mediterranean",
      factionId: "hospitallers"
    }).map(({ id }) => id),
    ["roman-catholic", "eastern-orthodox"]
  );
  assert.deepEqual(
    religionCandidatesForHome({
      cityId: "nanjing|china",
      city: "Nanjing",
      country: "China",
      cityType: "east-asian",
      factionId: "ming"
    }).map(({ id }) => id),
    ["chinese-traditional", "daoism", "mahayana-buddhism"]
  );
});

test("Islamic communities provide a locally appropriate Hajj pilgrim religion", () => {
  assert.equal(isIslamicReligion("sunni-islam"), true);
  assert.equal(isIslamicReligion("shia-islam"), true);
  assert.equal(isIslamicReligion("ibadi-islam"), true);
  assert.equal(isIslamicReligion("roman-catholic"), false);
  assert.equal(islamicReligionForHome({
    cityId: "muscat|oman",
    city: "Muscat",
    country: "Oman",
    cityType: "islamic-desert",
    factionId: "portugal"
  }, "hajj-muscat"), "ibadi-islam");
  assert.equal(islamicReligionForHome({
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal"
  }, "hajj-lisbon"), null);
});

test("Christian landmark detection includes western and orthodox traditions", () => {
  assert.equal(isChristianReligion("roman-catholic"), true);
  assert.equal(isChristianReligion("lutheran"), true);
  assert.equal(isChristianReligion("eastern-orthodox"), true);
  assert.equal(isChristianReligion("ethiopian-orthodox"), true);
  assert.equal(isChristianReligion("sunni-islam"), false);
  assert.equal(isChristianReligion("mahayana-buddhism"), false);
});

test("new minority affiliations stay confined to plausible 1522 regions", () => {
  const lahore = religionCandidatesForHome({
    cityId: "lahore|pakistan",
    city: "Lahore",
    country: "Pakistan",
    cityType: "south-asian",
    factionId: "delhi"
  });
  assert.ok(lahore.some(({ id }) => id === "sikhism"));

  const cambay = religionCandidatesForHome({
    cityId: "cambay|india",
    city: "Cambay",
    country: "India",
    cityType: "south-asian",
    factionId: "gujarat"
  });
  assert.ok(cambay.some(({ id }) => id === "zoroastrianism"));

  const rome = religionCandidatesForHome({
    cityId: "rome|italy",
    city: "Rome",
    country: "Italy",
    cityType: "mediterranean",
    factionId: "papal-states"
  });
  assert.ok(rome.every(({ id }) => id !== "sikhism" && id !== "zoroastrianism"));
});

test("a character receives one deterministic affiliation that persists when supplied", () => {
  const homePort = {
    cityId: "jerusalem|israel",
    city: "Jerusalem",
    country: "Israel",
    cityType: "islamic-desert",
    factionId: "neutral"
  };
  const first = inferCharacterReligion({
    identityKey: "traveler|jerusalem|1",
    homePort,
    character: { id: "traveler-1" }
  });
  const repeated = inferCharacterReligion({
    identityKey: "traveler|jerusalem|1",
    homePort,
    character: { id: "traveler-1" }
  });
  assert.equal(repeated.id, first.id);
  assert.equal(inferCharacterReligion({
    identityKey: "changed-key",
    homePort: { cityId: "rome|italy", city: "Rome", country: "Italy", cityType: "mediterranean", factionId: "papal-states" },
    character: { religionId: first.id }
  }).id, first.id);
});

test("clerical attire constrains religion without moving Buddhist monks out of Asia", () => {
  const christianInGoa = religionCandidatesForCharacter({
    id: "western-monk",
    requiredReligionFamily: "christian"
  }, {
    cityId: "goa|india",
    city: "Goa",
    country: "India",
    cityType: "south-asian",
    factionId: "portugal"
  });
  assert.deepEqual(christianInGoa.map(({ id }) => id), ["roman-catholic"]);

  const christianInJapan = religionCandidatesForCharacter({
    id: "western-monk",
    requiredReligionFamily: "christian"
  }, {
    cityId: "kyoto|japan",
    city: "Kyoto",
    country: "Japan",
    cityType: "east-asian",
    factionId: "japan"
  });
  assert.deepEqual(christianInJapan.map(({ id }) => id), ["roman-catholic"]);

  const buddhistInBeijing = religionCandidatesForCharacter({
    id: "buddhist-monk",
    requiredReligionFamily: "buddhist"
  }, {
    cityId: "beijing|china",
    city: "Beijing",
    country: "China",
    cityType: "east-asian",
    factionId: "ming"
  });
  assert.deepEqual(buddhistInBeijing.map(({ id }) => id), ["mahayana-buddhism"]);

  assert.throws(() => inferCharacterReligion({
    identityKey: "western-monk|bad-save",
    character: {
      religionId: "sunni-islam",
      requiredReligionFamily: "christian"
    }
  }), /violates its christian attire/);
});

test("animal companions choose from every religion with exactly equal weight", () => {
  for (const companionId of ["panda", "penguin", "raccoon"]) {
    const candidates = religionCandidatesForCharacter({
      id: `companion:${companionId}`,
      role: "ship-animal-companion"
    });
    assert.deepEqual(
      candidates.map(({ id }) => id),
      RELIGION_CATALOG.map(({ id }) => id)
    );
    assert.ok(candidates.every(({ weight }) => weight === 1));

    const first = inferCharacterReligion({
      identityKey: `companion:${companionId}|voyage-17`,
      character: { role: "ship-animal-companion" }
    });
    assert.equal(inferCharacterReligion({
      identityKey: `companion:${companionId}|voyage-17`,
      character: { role: "ship-animal-companion", religionId: first.id }
    }).id, first.id);
  }
});
