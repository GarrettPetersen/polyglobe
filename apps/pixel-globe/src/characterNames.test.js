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
  const city = { cityId: "nanjing|china", city: "Nanjing", country: "China", cityType: "east-asian" };
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
    ship: { currentPort: { cityId: "lisbon|portugal", city: "Lisbon", country: "Portugal", cityType: "mediterranean" } },
    sex: "female",
    usedNames: new Set()
  });
  assert.equal(character.gender, "female");
  assert.equal(character.nameCulture, "portuguese");
});

test("character names reject missing portrait sex", () => {
  assert.throws(() => assignRegionalCharacterName({
    identityKey: "captain|ship-5",
    ship: { currentPort: { cityId: "lisbon|portugal", city: "Lisbon", country: "Portugal", cityType: "mediterranean" } },
    usedNames: new Set()
  }), /requires an explicit sex/);
});

test("a shared name registry prevents duplicate people", () => {
  const usedNames = new Set();
  const args = {
    identityKey: "same-key",
    city: { cityId: "london|united kingdom", city: "London", country: "United Kingdom", factionId: "england" },
    sex: "male",
    usedNames
  };
  const first = assignRegionalCharacterName(args);
  const second = assignRegionalCharacterName(args);
  assert.notEqual(first.name, second.name);
  assert.equal(usedNames.size, 2);
});

test("England and Scotland use distinct naming cultures", () => {
  assert.equal(nameCultureForSubject({ cityId: "london|united kingdom", city: "London", country: "United Kingdom", factionId: "england" }), "english");
  assert.equal(nameCultureForSubject({ cityId: "edinburgh|united kingdom", city: "Edinburgh", country: "United Kingdom", factionId: "scotland" }), "scottish");
});

test("Iceland and Sweden use distinct local name cultures", () => {
  assert.equal(nameCultureForSubject({
    cityId: "hafnarfjordur|iceland",
    city: "Hafnarfjordur",
    country: "Iceland",
    factionId: "denmark-norway"
  }), "icelandic");
  assert.equal(nameCultureForSubject({
    cityId: "soderkoping|sweden",
    city: "Soderkoping",
    country: "Sweden",
    factionId: "sweden"
  }), "nordic");
});

test("Icelandic patronymics use son and daughter forms", () => {
  const city = {
    cityId: "hafnarfjordur|iceland",
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
  const village = { cityId: "fiji village|fiji", city: "Fiji Village", country: "Fiji", cityType: "polynesian", factionId: "neutral" };
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
    [{ cityId: "yuquot village|nuu-chah-nulth", city: "Yuquot Village", country: "Nuu-chah-nulth", cityType: "mesoamerican" }, "northwestCoast"],
    [{ cityId: "ozette village|makah", city: "Ozette Village", country: "Makah", cityType: "mesoamerican" }, "northwestCoast"],
    [{ cityId: "wendat village|canada", city: "Wendat Village", country: "Canada", cityType: "mesoamerican" }, "wendat"],
    [{ cityId: "chillicothe|united states of america", city: "Chillicothe", country: "United States of America", cityType: "mesoamerican" }, "shawnee"],
    [{ cityId: "guanahani village|bahamas", city: "Guanahani Village", country: "Bahamas", cityType: "mesoamerican" }, "taino"],
    [{ cityId: "coroa vermelha village|brazil", city: "Coroa Vermelha Village", country: "Brazil", cityType: "mesoamerican" }, "tupi"],
    [{ cityId: "xicalango|mexico", city: "Xicalango", country: "Mexico", cityType: "mesoamerican" }, "maya"],
    [{ cityId: "chakan putum|mexico", city: "Chakan Putum", country: "Mexico", cityType: "mesoamerican" }, "maya"],
    [{ cityId: "cuzamil|mexico", city: "Cuzamil", country: "Mexico", cityType: "mesoamerican" }, "maya"],
    [{ cityId: "merida|mexico", city: "Merida", displayCity: "Tiho", country: "Mexico", cityType: "mesoamerican" }, "maya"],
    [{ cityId: "gumarcaj|guatemala", city: "Gumarcaj", country: "Guatemala", cityType: "mesoamerican" }, "maya"],
    [{ cityId: "guatemala city|guatemala", city: "Guatemala City", country: "Guatemala", cityType: "mesoamerican" }, "maya"],
    [{ cityId: "tzintzuntzan|mexico", city: "Tzintzuntzan", country: "Mexico", cityType: "mesoamerican" }, "purepecha"],
    [{ cityId: "mexico city|mexico", city: "Mexico City", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ cityId: "texcoco|mexico", city: "Texcoco", displayCity: "Tezcoco", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ cityId: "cholula|mexico", city: "Cholula", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ cityId: "tenayuca|mexico", city: "Tenayuca", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ cityId: "zempoala|mexico", city: "Zempoala", displayCity: "Cempoala", country: "Mexico", cityType: "mesoamerican" }, "nahua"],
    [{ cityId: "veracruz|mexico", city: "Veracruz", country: "Mexico", cityType: "mediterranean", factionId: "spain" }, "spanish"]
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
    ["Baghdad", "Iraq", "safavid", "arabic"],
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
    ["Tidore", "Indonesia", "tidore", "malukan"],
    ["Mactan Village", "Philippines", "neutral", "cebuano"],
    ["Ayutthaya", "Thailand", "ayutthaya", "thai"],
    ["Pegu", "Myanmar", "neutral", "monBurmese"],
    ["Binh Dinh", "Vietnam", "neutral", "cham"],
    ["Luang Prabang", "Lao People's Democratic Republic", "neutral", "lao"]
  ];

  for (const [city, country, factionId, expectedCulture] of cases) {
    const cityId = city === "Prague"
      ? "prague|austria"
      : `${city.toLowerCase()}|${country.toLowerCase()}`;
    const homePort = { cityId, city, country, factionId };
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

test("Japanese ports draw surnames from their local clan networks", () => {
  const cases = [
    [{ cityId: "kyoto|japan", city: "Kyoto", country: "Japan", factionId: "japan" }, ["Ashikaga", "Hino", "Ise", "Konoe", "Sanjo", "Yamana"]],
    [{ cityId: "edo|japan", city: "Edo", country: "Japan", factionId: "japan" }, ["Hojo", "Ota", "Chiba", "Toyoshima", "Uesugi", "Satomi"]],
    [{ cityId: "sakai|japan", city: "Sakai", country: "Japan", factionId: "hosokawa" }, ["Hosokawa", "Miyoshi", "Kagawa", "Kozai", "Atagi", "Yasumi"]],
    [{ cityId: "yamaguchi|japan", city: "Yamaguchi", country: "Japan", factionId: "ouchi" }, ["Ouchi", "Sue", "Naito", "Sugi", "Hironaka", "Yoshimi"]],
    [{ cityId: "fukuoka|japan", city: "Fukuoka", displayCity: "Hakata", country: "Japan", factionId: "ouchi" }, ["Ouchi", "Sue", "Naito", "Sugi", "Hironaka", "Yoshimi"]],
    [{ cityId: "kagoshima|japan", city: "Kagoshima", country: "Japan", factionId: "shimazu" }, ["Shimazu", "Niiro", "Ijuin", "Machida", "Kawakami", "Kabayama"]],
    [{ cityId: "tsushima fuchu|japan", city: "Tsushima Fuchu", country: "Japan", factionId: "so" }, ["So", "Yanagawa", "Hata", "Kono", "Harada"]],
    [{ cityId: "nagasaki|japan", city: "Nagasaki", country: "Japan", factionId: "shoni" }, ["Shoni", "Ryuzoji", "Omura", "Arima", "Matsuura", "Goto"]],
    [{ cityId: "naoetsu|japan", city: "Naoetsu", country: "Japan", factionId: "nagao" }, ["Nagao", "Uesugi", "Honjo", "Irobe", "Yasuda", "Nakajo"]],
    [{ cityId: "tsuchizaki minato|japan", city: "Tsuchizaki Minato", country: "Japan", factionId: "ando" }, ["Ando", "Asari", "Nanbu", "Tozawa", "Onodera", "Oura"]],
    [{ cityId: "kaminokuni|japan", city: "Kaminokuni", country: "Japan", factionId: "kakizaki" }, ["Kakizaki", "Takeda", "Kudo", "Ando", "Shimokuni"]]
  ];
  const formerCelebrityGivenNames = new Set([
    "Dosan", "Harunobu", "Hideyoshi", "Hisahide", "Ieyasu", "Kenshin",
    "Motonari", "Nobunaga", "Shingen", "Takakage", "Yoshihiro", "Yukimura"
  ]);

  for (const [city, expectedFamilies] of cases) {
    const allowedFamilies = new Set(expectedFamilies);
    for (let index = 0; index < 96; index++) {
      const identity = assignRegionalCharacterName({
        identityKey: `japanese-clan-audit|${city.city}|${index}`,
        city,
        sex: index % 2 === 0 ? "female" : "male",
        usedNames: new Set()
      });
      assert.equal(identity.nameCulture, "japanese", city.city);
      assert.ok(allowedFamilies.has(identity.familyName), `${city.city}: ${identity.familyName}`);
      assert.ok(!formerCelebrityGivenNames.has(identity.givenName), `${city.city}: ${identity.name}`);
      if (city.city !== "Kaminokuni") assert.notEqual(identity.familyName, "Takeda", city.city);
    }
  }
});

test("Malukan characters use their home locative before regional fallbacks", () => {
  const cases = [
    [{ cityId: "ternate|indonesia", city: "Ternate", country: "Indonesia", factionId: "ternate" }, "Ternate", "Tidore"],
    [{ cityId: "tidore|indonesia", city: "Tidore", country: "Indonesia", factionId: "tidore" }, "Tidore", "Ternate"],
    [{ cityId: "banda village|indonesia", city: "Banda Village", country: "Indonesia", factionId: "neutral" }, "Banda", null],
    [{ cityId: "buru village|indonesia", city: "Buru Village", country: "Indonesia", factionId: "tidore" }, "Buru", null]
  ];

  for (const [city, expectedLocative, forbiddenLocative] of cases) {
    for (const sex of ["female", "male"]) {
      for (let index = 0; index < 64; index++) {
        const identity = assignRegionalCharacterName({
          identityKey: `${city.city}|${sex}|${index}`,
          city,
          sex,
          usedNames: new Set()
        });
        assert.equal(identity.familyName, expectedLocative, `${city.city} ${sex} ${index}`);
        if (forbiddenLocative) assert.notEqual(identity.familyName, forbiddenLocative);
      }
    }
  }
});

test("Malukan name exhaustion never falls back to the rival capital", () => {
  for (const [city, forbiddenLocative] of [
    [{ cityId: "ternate|indonesia", city: "Ternate", country: "Indonesia", factionId: "ternate" }, "Tidore"],
    [{ cityId: "tidore|indonesia", city: "Tidore", country: "Indonesia", factionId: "tidore" }, "Ternate"]
  ]) {
    const usedNames = new Set();
    const identities = [];
    for (let index = 0; index < 18; index++) {
      identities.push(assignRegionalCharacterName({
        identityKey: `${city.city}|shared|${index}`,
        city,
        sex: "male",
        usedNames
      }));
    }
    assert.equal(identities.some((identity) => identity.familyName === forbiddenLocative), false);
  }
});

test("faith-sensitive names remain grounded in the character's home region", () => {
  const lahore = { cityId: "lahore|india", city: "Lahore", country: "India", factionId: "delhi" };
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
    city: { cityId: "jerusalem|israel", city: "Jerusalem", country: "Israel", factionId: "ottoman" },
    sex: "female",
    religionId: "judaism",
    usedNames: new Set()
  });
  assert.equal(jewishIdentity.nameCulture, "jewish");
});

test("border and colonial cities mix local and ruling name cultures", () => {
  const sudak = {
    cityId: "sudak|russian federation",
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
    assert.equal(nameCultureForSubject({
      cityId: `${city.toLowerCase()}|${country.toLowerCase()}`,
      city,
      country,
      factionId: "neutral"
    }), expected);
  }
});

test("Russian, Bulgarian, and Polish surnames use feminine forms", () => {
  const cases = [
    {
      city: { cityId: "moscow|russian federation", city: "Moscow", country: "Russian Federation", factionId: "muscovy" },
      expectedCulture: "russian",
      assertForm: (identity) => assert.match(identity.familyName, /ova$|eva$/)
    },
    {
      city: { cityId: "sofia|bulgaria", city: "Sofia", country: "Bulgaria", factionId: "neutral" },
      expectedCulture: "bulgarian",
      assertForm: (identity) => assert.match(identity.familyName, /ova$|eva$/)
    },
    {
      city: { cityId: "warsaw|poland", city: "Warsaw", country: "Poland", factionId: "poland-lithuania" },
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
    cityId: "belgrade|serbia",
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
