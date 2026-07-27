import assert from "node:assert/strict";
import test from "node:test";

import {
  RELIGION_CATALOG,
  inferCharacterReligion,
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

test("distinctive 1522 religious contexts remain explicit", () => {
  const cases = [
    [{ city: "Rome", country: "Italy", cityType: "mediterranean", factionId: "papal-states" }, "roman-catholic"],
    [{ city: "Rhodes", country: "Greece", cityType: "mediterranean", factionId: "hospitallers" }, "roman-catholic"],
    [{ city: "Moscow", country: "Russian Federation", cityType: "northern-european", factionId: "muscovy" }, "eastern-orthodox"],
    [{ city: "Tabriz", country: "Iran", cityType: "islamic-desert", factionId: "safavid" }, "shia-islam"],
    [{ city: "Muscat", country: "Oman", cityType: "islamic-desert", factionId: "portugal" }, "ibadi-islam"],
    [{ city: "Kyoto", country: "Japan", cityType: "east-asian", factionId: "japan" }, "kami-buddhist"],
    [{ city: "Ayutthaya", country: "Thailand", cityType: "southeast-asian", factionId: "ayutthaya" }, "theravada-buddhism"],
    [{ city: "Cuzco", country: "Peru", cityType: "andean", factionId: "inca" }, "andean-traditional"],
    [{ city: "Hawaii Village", country: "Hawaii", cityType: "polynesian", factionId: "neutral" }, "polynesian-traditional"]
  ];
  for (const [homePort, expected] of cases) {
    assert.equal(religionCandidatesForHome(homePort)[0].id, expected, homePort.city);
  }
  assert.deepEqual(
    religionCandidatesForHome({
      city: "Rhodes",
      country: "Greece",
      cityType: "mediterranean",
      factionId: "hospitallers"
    }).map(({ id }) => id),
    ["roman-catholic", "eastern-orthodox"]
  );
});

test("new minority affiliations stay confined to plausible 1522 regions", () => {
  const lahore = religionCandidatesForHome({
    city: "Lahore",
    country: "Pakistan",
    cityType: "south-asian",
    factionId: "delhi"
  });
  assert.ok(lahore.some(({ id }) => id === "sikhism"));

  const cambay = religionCandidatesForHome({
    city: "Cambay",
    country: "India",
    cityType: "south-asian",
    factionId: "gujarat"
  });
  assert.ok(cambay.some(({ id }) => id === "zoroastrianism"));

  const rome = religionCandidatesForHome({
    city: "Rome",
    country: "Italy",
    cityType: "mediterranean",
    factionId: "papal-states"
  });
  assert.ok(rome.every(({ id }) => id !== "sikhism" && id !== "zoroastrianism"));
});

test("a character receives one deterministic affiliation that persists when supplied", () => {
  const homePort = {
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
    homePort: { city: "Rome", country: "Italy", cityType: "mediterranean", factionId: "papal-states" },
    character: { religionId: first.id }
  }).id, first.id);
});

test("clerical attire constrains religion without moving Buddhist monks out of Asia", () => {
  const christianInGoa = religionCandidatesForCharacter({
    id: "western-monk",
    requiredReligionFamily: "christian"
  }, {
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
  for (const companionId of ["panda", "penguin"]) {
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
