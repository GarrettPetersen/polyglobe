import assert from "node:assert/strict";
import test from "node:test";
import { questOfferDirections } from "./questOfferDirections.js";

const origin = { lat: 0, lon: 0 };
const citiesById = new Map([["east", { lat: 0, lon: 10 }], ["north", { lat: 10, lon: 0 }]]);
for (const type of ["accept-quest", "open-passenger", "accept-passenger"]) {
  test(`${type} displays a heading without replacing sailing distance or eligibility`, () => {
    const quest = { id: "mission", destinationCityId: "east" };
    const option = { action: { type, quest }, detail: "1300 km / 400 DB", disabled: true, disabledReason: "Hold full" };
    const result = questOfferDirections({ options: [option] }, { origin, citiesById, passengerQuest: quest });
    assert.equal(result.options[0].detail, "1300 km / 400 DB / E 90°");
    assert.equal(result.options[0].disabledReason, "Hold full");
    assert.equal(option.detail, "1300 km / 400 DB");
  });
}
test("capture destinations, date-line bearings and local tasks are handled explicitly", () => {
  const view = { options: [{ action: { type: "accept-quest", quest: { id: "capture", targetCityId: "north" } } }] };
  assert.equal(questOfferDirections(view, { origin, citiesById }).options[0].detail, "N 0°");
  const local = { options: [{ action: { type: "accept-quest", quest: { id: "local" } } }] };
  assert.equal(questOfferDirections(local, { origin, citiesById }).options[0], local.options[0]);
  assert.throws(() => questOfferDirections(view, { origin, citiesById: new Map() }), /no destination city/);
  assert.equal(questOfferDirections(view, { origin: {lat:0,lon:179}, citiesById:new Map([["north",{lat:0,lon:-179}]]) }).options[0].detail,"E 90°");
});
