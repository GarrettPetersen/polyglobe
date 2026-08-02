import assert from "node:assert/strict";
import test from "node:test";

import {
  localizeCharacterProperName,
  localizeProperNouns,
  registerCharacterProperName,
  registerPlaceProperNames
} from "./properNounLocalization.js";

const CHINESE_CHARACTER = Object.freeze({
  name: "Wang Ming",
  givenName: "Ming",
  familyName: "Wang",
  nameCulture: "chinese"
});
const JAPANESE_CHARACTER = Object.freeze({
  name: "Tokugawa Ieyasu",
  givenName: "Ieyasu",
  familyName: "Tokugawa",
  nameCulture: "japanese"
});
const KOREAN_CHARACTER = Object.freeze({
  name: "Kim Min",
  givenName: "Min",
  familyName: "Kim",
  nameCulture: "korean"
});
const PORTUGUESE_CHARACTER = Object.freeze({
  name: "Joao Pereira",
  givenName: "Joao",
  familyName: "Pereira",
  nameCulture: "portuguese"
});

registerPlaceProperNames(["Port Royal", "Yuquot Village", "Guatemala City"]);
for (const character of [
  CHINESE_CHARACTER,
  JAPANESE_CHARACTER,
  KOREAN_CHARACTER,
  PORTUGUESE_CHARACTER
]) {
  registerCharacterProperName(character);
}

test("native East Asian character names use their native scripts and order", () => {
  assert.equal(localizeCharacterProperName("zh-Hans", CHINESE_CHARACTER), "王明");
  assert.equal(localizeCharacterProperName("zh-Hant", CHINESE_CHARACTER), "王明");
  assert.equal(localizeCharacterProperName("ja", JAPANESE_CHARACTER), "徳川 家康");
  assert.equal(localizeCharacterProperName("ko", KOREAN_CHARACTER), "김민");
});

test("foreign character names transliterate in non-Latin interfaces", () => {
  const russian = localizeCharacterProperName("ru", PORTUGUESE_CHARACTER);
  const japanese = localizeCharacterProperName("ja", PORTUGUESE_CHARACTER);
  const korean = localizeCharacterProperName("ko", PORTUGUESE_CHARACTER);
  const chinese = localizeCharacterProperName("zh-Hans", PORTUGUESE_CHARACTER);
  assert.match(russian, /^[\p{Script=Cyrillic} -]+$/u);
  assert.match(japanese, /^[\p{Script=Katakana}\p{Script=Hiragana}ー・ ]+$/u);
  assert.match(korean, /^[\p{Script=Hangul} -]+$/u);
  assert.match(chinese, /^[\p{Script=Han}·]+$/u);
});

test("generated settlement stages localize their descriptor and word order", () => {
  assert.equal(localizeProperNouns("es", "Port Royal Colony"), "Colonia de Puerto Real");
  assert.equal(localizeProperNouns("fr", "Port Royal Colony Site"), "Site de la colonie de Port-Royal");
  assert.equal(localizeProperNouns("de", "Port Royal Ruins"), "Ruinen von Port Royal");
  assert.equal(localizeProperNouns("zh-Hans", "Port Royal Colony"), "皇家港殖民地");
  assert.equal(localizeProperNouns("ja", "Port Royal Colony Site"), "ポートロイヤル植民地予定地");
  assert.equal(localizeProperNouns("ko", "Port Royal Ruins"), "포트 로얄 폐허");
});

test("registered villages and city descriptors localize inside longer UI text", () => {
  assert.equal(
    localizeProperNouns("es", "Set a heading from Yuquot Village to Guatemala City"),
    "Set a heading from Aldea de Yuquot to Ciudad de Guatemala"
  );
  assert.equal(
    localizeProperNouns("ru", "Set a heading from Yuquot Village to Guatemala City"),
    "Set a heading from Деревня Юквот to Город Гватемала"
  );
});

test("registered character names localize when embedded in dialogue", () => {
  assert.equal(
    localizeProperNouns("zh-Hans", "Wang Ming, factor of Port Royal Colony"),
    "王明, factor of 皇家港殖民地"
  );
  assert.match(
    localizeProperNouns("ru", "Joao Pereira joined the crew"),
    /^Жуан Перейра joined the crew$/
  );
});

test("proper-noun localization never mutates canonical character records", () => {
  const before = structuredClone(PORTUGUESE_CHARACTER);
  localizeCharacterProperName("ru", PORTUGUESE_CHARACTER);
  localizeProperNouns("ja", PORTUGUESE_CHARACTER.name);
  assert.deepEqual(PORTUGUESE_CHARACTER, before);
  assert.equal(localizeProperNouns("en", "Port Royal Colony"), "Port Royal Colony");
  assert.equal(localizeCharacterProperName("de", PORTUGUESE_CHARACTER), "Joao Pereira");
});

test("invalid localization inputs fail loudly", () => {
  assert.throws(() => registerPlaceProperNames("Port Royal"), /requires an array/);
  assert.throws(() => localizeProperNouns("ja", null), /must be a string/);
  assert.throws(() => localizeCharacterProperName("ja", null), /requires a character/);
});
