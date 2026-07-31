import assert from "node:assert/strict";
import test from "node:test";

import {
  assignRegionalCharacterIdentity,
  assignRegionalFamilyMemberName,
  assignRegionalCharacterName,
  charactersShareFamilyName,
  nameCultureCandidatesForSubject,
  nameCultureForSubject,
  reconcileRegionalCharacterNameForms
} from "./characterNames.js";

test("regional character names are deterministic and respect family-first cultures", () => {
  const city = { city: "Nanjing", country: "China", cityType: "east-asian" };
  const args = {
    identityKey: "Nanjing|China|12",
    city,
    sex: "male"
  };
  const first = assignRegionalCharacterName({ ...args, usedNames: new Set() });
  const second = assignRegionalCharacterName({ ...args, usedNames: new Set() });

  assert.deepEqual(first, second);
  assert.equal(first.nameCulture, "chinese");
  assert.equal(first.gender, "male");
  assert.equal(first.name, `${first.familyName} ${first.givenName}`);
});

test("explicit portrait sex selects the matching given-name pool", () => {
  const character = assignRegionalCharacterName({
    identityKey: "captain|ship-4",
    ship: { currentPort: { city: "Lisbon", country: "Portugal", cityType: "mediterranean" } },
    sex: "female",
    usedNames: new Set()
  });
  assert.equal(character.gender, "female");
  assert.equal(character.nameCulture, "portuguese");
});

test("character names reject missing portrait sex", () => {
  assert.throws(() => assignRegionalCharacterName({
    identityKey: "captain|ship-5",
    ship: { currentPort: { city: "Lisbon", country: "Portugal", cityType: "mediterranean" } },
    usedNames: new Set()
  }), /requires an explicit sex/);
});

test("a shared name registry prevents duplicate people", () => {
  const usedNames = new Set();
  const args = {
    identityKey: "same-key",
    city: { city: "London", country: "United Kingdom", factionId: "england" },
    sex: "male",
    usedNames
  };
  const first = assignRegionalCharacterName(args);
  const second = assignRegionalCharacterName(args);
  assert.notEqual(first.name, second.name);
  assert.equal(usedNames.size, 2);
});

test("England and Scotland use distinct naming cultures", () => {
  assert.equal(nameCultureForSubject({ city: "London", country: "United Kingdom", factionId: "england" }), "english");
  assert.equal(nameCultureForSubject({ city: "Edinburgh", country: "United Kingdom", factionId: "scotland" }), "scottish");
});

test("Iceland and Sweden use distinct local name cultures", () => {
  assert.equal(nameCultureForSubject({
    city: "Hafnarfjordur",
    country: "Iceland",
    factionId: "denmark-norway"
  }), "icelandic");
  assert.equal(nameCultureForSubject({
    city: "Soderkoping",
    country: "Sweden",
    factionId: "sweden"
  }), "nordic");
});

test("Icelandic patronymics use son and daughter forms", () => {
  const city = {
    city: "Hafnarfjordur",
    country: "Iceland",
    factionId: "neutral"
  };
  const male = assignRegionalCharacterName({
    identityKey: "icelandic-male",
    city,
    sex: "male",
    usedNames: new Set()
  });
  const female = assignRegionalCharacterName({
    identityKey: "icelandic-female",
    city,
    sex: "female",
    usedNames: new Set()
  });

  assert.equal(male.nameCulture, "icelandic");
  assert.equal(female.nameCulture, "icelandic");
  assert.match(male.familyName, /son$/);
  assert.match(female.familyName, /dottir$/);
});

test("Pacific island villages use the Polynesian naming culture", () => {
  const village = { city: "Fiji Village", country: "Fiji", cityType: "polynesian", factionId: "neutral" };
  assert.equal(nameCultureForSubject(village), "polynesian");
  const character = assignRegionalCharacterName({
    identityKey: "fiji-village-factor",
    city: village,
    sex: "male",
    usedNames: new Set()
  });
  assert.equal(character.nameCulture, "polynesian");
  assert.ok(character.name.includes(" "));
});

test("Indigenous American settlements use their local naming traditions", () => {
  const cases = [
    [{ city: "Yuquot Village", country: "Nuu-chah-nulth", cityType: "mesoamerican" }, "northwestCoast"],
    [{ city: "Ozette Village", country: "Makah", cityType: "mesoamerican" }, "northwestCoast"],
    [{ city: "Wendat Village", country: "Canada", cityType: "mesoamerican" }, "wendat"],
    [{ city: "Chillicothe", country: "United States of America", cityType: "mesoamerican" }, "shawnee"],
    [{ city: "Guanahani Village", country: "Bahamas", cityType: "mesoamerican" }, "taino"],
    [{ city: "Coroa Vermelha Village", country: "Brazil", cityType: "mesoamerican" }, "tupi"],
    [{ city: "Xicalango", country: "Mexico", cityType: "mesoamerican" }, "maya"],
    [{ city: "Chakan Putum", country: "Mexico", cityType: "mesoamerican" }, "maya"],
    [{ city: "Cuzamil", country: "Mexico", cityType: "mesoamerican" }, "maya"],
    [{ city: "Merida", displayCity: "Tiho", country: "Mexico", cityType: "mesoamerican" }, "maya"],
    [{ city: "Gumarcaj", country: "Guatemala", cityType: "mesoamerican" }, "maya"],
    [{ city: "Guatemala City", country: "Guatemala", cityType: "mesoamerican" }, "maya"],
    [{ city: "Tzintzuntzan", country: "Mexico", cityType: "mesoamerican" }, "purepecha"],
    [{ city: "Mexico City", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ city: "Texcoco", displayCity: "Tezcoco", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ city: "Cholula", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ city: "Tenayuca", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ city: "Zempoala", displayCity: "Cempoala", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ city: "Veracruz", country: "Mexico", cityType: "mediterranean", factionId: "spain" }, "spanish"]
  ];

  for (const [city, expectedCulture] of cases) {
    assert.equal(nameCultureForSubject(city), expectedCulture, city.city);
    for (const sex of ["female", "male"]) {
      const identity = assignRegionalCharacterName({
        identityKey: `${city.city}|${sex}`,
        city,
        sex,
        usedNames: new Set()
      });
      assert.equal(identity.nameCulture, expectedCulture);
      assert.ok(identity.givenName.length > 0);
      assert.ok(identity.familyName.length > 0);
    }
  }
});

test("ports across the Old World use specific local naming traditions", () => {
  const cases = [
    ["Dublin", "Ireland", "neutral", "irish"],
    ["Prague", "Czechia", "habsburg", "czech"],
    ["Turku", "Finland", "sweden", "finnish"],
    ["Bakhchiserai", "Ukraine", "crimea", "crimeanTatar"],
    ["Kazan", "Russian Federation", "neutral", "tatar"],
    ["Samarkand", "Uzbekistan", "neutral", "centralAsian"],
    ["Kashi", "China", "ming", "centralAsian"],
    ["Herat", "Afghanistan", "safavid", "persian"],
    ["Kilwa", "Tanzania", "neutral", "swahili"],
    ["Zanzibar", "Tanzania", "neutral", "swahili"],
    ["Mogadishu", "Somalia", "neutral", "somali"],
    ["Axum", "Ethiopia", "ethiopia", "ethiopian"],
    ["Zimbabwe", "Zimbabwe", "neutral", "shona"],
    ["Gao", "Mali", "songhai", "mande"],
    ["Oyo", "Nigeria", "neutral", "yoruba"],
    ["Kano", "Nigeria", "neutral", "hausa"],
    ["Nkazargamu", "Nigeria", "neutral", "kanuri"],
    ["M'banza-Congo", "Angola", "neutral", "kongo"],
    ["Mossel Bay Village", "South Africa", "neutral", "khoikhoi"],
    ["Bastia", "Italy", "genoa", "italian"],
    ["Ceuta", "Morocco", "portugal", "portuguese"],
    ["Ragusa", "Croatia", "neutral", "slavic"],
    ["Male", "Maldives", "neutral", "southAsian"],
    ["Maynila", "Philippines", "neutral", "southeastAsian"],
    ["Vijayanagar", "India", "vijayanagara", "southIndian"],
    ["Ahmedabad", "India", "gujarat", "gujarati"],
    ["Gauda", "India", "bengal", "bengali"],
    ["Calicut", "India", "neutral", "malayali"],
    ["Colombo", "Sri Lanka", "neutral", "sinhalese"],
    ["Malacca", "Malaysia", "portugal", "malay"],
    ["Gresik", "Indonesia", "neutral", "javanese"],
    ["Ternate", "Indonesia", "ternate", "malukan"],
    ["Mactan Village", "Philippines", "neutral", "cebuano"],
    ["Ayutthaya", "Thailand", "ayutthaya", "thai"],
    ["Pegu", "Myanmar", "neutral", "monBurmese"],
    ["Binh Dinh", "Vietnam", "neutral", "cham"],
    ["Luang Prabang", "Laos", "neutral", "lao"]
  ];

  for (const [city, country, factionId, expectedCulture] of cases) {
    const homePort = { city, country, factionId };
    assert.equal(nameCultureForSubject(homePort), expectedCulture, city);
    const candidates = nameCultureCandidatesForSubject(homePort);
    assert.equal(candidates[0], expectedCulture, city);
    const identity = assignRegionalCharacterName({
      identityKey: `regional-audit|${city}`,
      city: homePort,
      sex: "female",
      usedNames: new Set()
    });
    assert.ok(candidates.includes(identity.nameCulture), city);

    const completeIdentity = assignRegionalCharacterIdentity({
      identityKey: `regional-audit-with-faith|${city}`,
      city: homePort,
      character: { id: `portrait|${city}`, sex: "female" },
      usedNames: new Set()
    });
    assert.ok(completeIdentity.name.length > 0, city);
    assert.ok(completeIdentity.religionId.length > 0, city);
  }
});

test("faith-sensitive names remain grounded in the character's home region", () => {
  const lahore = { city: "Lahore", country: "India", factionId: "delhi" };
  const cases = [
    ["hinduism", "northIndian"],
    ["sunni-islam", "indoMuslim"],
    ["sikhism", "sikh"]
  ];
  for (const [religionId, expectedCulture] of cases) {
    const identity = assignRegionalCharacterName({
      identityKey: `lahore|${religionId}`,
      city: lahore,
      sex: "male",
      religionId,
      usedNames: new Set()
    });
    assert.equal(identity.nameCulture, expectedCulture);
  }

  const jewishIdentity = assignRegionalCharacterName({
    identityKey: "jerusalem|judaism",
    city: { city: "Jerusalem", country: "Israel", factionId: "ottoman" },
    sex: "female",
    religionId: "judaism",
    usedNames: new Set()
  });
  assert.equal(jewishIdentity.nameCulture, "jewish");
});

test("border and colonial cities mix local and ruling name cultures", () => {
  const sudak = {
    city: "Sudak",
    country: "Russian Federation",
    cityType: "mediterranean",
    factionId: "ottoman"
  };
  assert.equal(nameCultureForSubject(sudak), "crimeanTatar");
  assert.deepEqual(nameCultureCandidatesForSubject(sudak), ["crimeanTatar", "ottoman"]);

  const seen = new Set();
  for (let i = 0; i < 48; i++) {
    seen.add(assignRegionalCharacterName({
      identityKey: `sudak-captain-${i}`,
      city: sudak,
      sex: "male",
      usedNames: new Set()
    }).nameCulture);
  }
  assert.ok(seen.has("crimeanTatar"));
  assert.ok(seen.has("ottoman"));
});

test("eastern European home countries use precise local naming pools", () => {
  const cases = [
    ["Warsaw", "Poland", "polish"],
    ["Vilnius", "Lithuania", "lithuanian"],
    ["Moscow", "Russian Federation", "russian"],
    ["Kyiv", "Ukraine", "ruthenian"],
    ["Buda", "Hungary", "hungarian"],
    ["Durres", "Albania", "albanian"],
    ["Sofia", "Bulgaria", "bulgarian"],
    ["Bucharest", "Romania", "romanian"],
    ["Belgrade", "Serbia", "serbian"]
  ];
  for (const [city, country, expected] of cases) {
    assert.equal(nameCultureForSubject({ city, country, factionId: "neutral" }), expected);
  }
});

test("Russian, Bulgarian, and Polish surnames use feminine forms", () => {
  const cases = [
    {
      city: { city: "Moscow", country: "Russian Federation", factionId: "muscovy" },
      expectedCulture: "russian",
      assertForm: (identity) => assert.match(identity.familyName, /ova$|eva$/)
    },
    {
      city: { city: "Sofia", country: "Bulgaria", factionId: "neutral" },
      expectedCulture: "bulgarian",
      assertForm: (identity) => assert.match(identity.familyName, /ova$|eva$/)
    },
    {
      city: { city: "Warsaw", country: "Poland", factionId: "poland-lithuania" },
      expectedCulture: "polish",
      assertForm: (identity) => {
        assert.equal(/ski$/.test(identity.familyName), false);
        assert.match(identity.familyName, /ska$|Mazur$|Nowak$|Wojcik$/);
      }
    }
  ];

  for (const entry of cases) {
    for (let index = 0; index < 96; index += 1) {
      const identity = assignRegionalCharacterName({
        identityKey: `${entry.expectedCulture}-female-${index}`,
        city: entry.city,
        sex: "female",
        usedNames: new Set()
      });
      assert.equal(identity.nameCulture, entry.expectedCulture);
      entry.assertForm(identity);
    }
  }
});

test("Russian relatives share a family root while displaying sex-specific surnames", () => {
  const relative = {
    name: "Anna Ivanova",
    givenName: "Anna",
    familyName: "Ivanova",
    gender: "female",
    sex: "female",
    nameCulture: "russian"
  };
  const brother = assignRegionalFamilyMemberName({
    identityKey: "anna-ivanova-brother",
    relative,
    sex: "male",
    usedNames: new Set([relative.name])
  });

  assert.equal(brother.familyName, "Ivanov");
  assert.equal(charactersShareFamilyName(relative, brother), true);
});

test("saved female Slavic names are reconciled without replacing their identity", () => {
  const saved = {
    captain: {
      name: "Anna Ivanov",
      givenName: "Anna",
      familyName: "Ivanov",
      sex: "female",
      nameCulture: "russian"
    }
  };

  assert.equal(reconcileRegionalCharacterNameForms(saved), 1);
  assert.deepEqual(saved.captain, {
    name: "Anna Ivanova",
    givenName: "Anna",
    familyName: "Ivanova",
    sex: "female",
    nameCulture: "russian"
  });
  assert.equal(reconcileRegionalCharacterNameForms(saved), 0);
});

test("Belgrade identities couple religion, local culture, and portrait attire", () => {
  const belgrade = {
    city: "Belgrade",
    country: "Serbia",
    cityType: "mediterranean",
    factionId: "ottoman"
  };
  const culturesByReligion = new Map();
  let orthodoxCount = 0;
  let sunniCount = 0;
  let mehmedCount = 0;
  for (let index = 0; index < 256; index++) {
    const identity = assignRegionalCharacterIdentity({
      identityKey: `belgrade-captain-${index}`,
      city: belgrade,
      character: { id: `portrait-${index}`, sex: "male" },
      usedNames: new Set()
    });
    culturesByReligion.set(identity.religionId, identity.nameCulture);
    if (identity.religionId === "eastern-orthodox") orthodoxCount += 1;
    if (identity.religionId === "sunni-islam") {
      sunniCount += 1;
      if (identity.givenName === "Mehmed") mehmedCount += 1;
    }
    assert.notEqual(identity.familyName, "Kowalski");
  }
  assert.equal(culturesByReligion.get("eastern-orthodox"), "serbian");
  assert.equal(culturesByReligion.get("sunni-islam"), "ottoman");
  assert.ok(orthodoxCount > sunniCount * 2);
  assert.ok(sunniCount > 0);
  assert.ok(mehmedCount >= Math.floor(sunniCount / 8));

  const priest = assignRegionalCharacterIdentity({
    identityKey: "belgrade-priest",
    city: belgrade,
    character: {
      id: "belgrade-priest-portrait",
      sex: "male",
      requiredReligionFamily: "christian"
    },
    usedNames: new Set()
  });
  assert.equal(priest.religionId, "eastern-orthodox");
  assert.equal(priest.nameCulture, "serbian");
});
