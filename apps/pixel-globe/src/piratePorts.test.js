import assert from "node:assert/strict";
import test from "node:test";
import { buildPlayerPirateHideoutPorts } from "./piratePorts.js";
test("havens retain their independent canonical identity", () => {
 const city = { cityId: "pirate-haven-1", tileId: 7, city: "Black Gull Cove", factionId: "pirate", isPirateHideout: true };
 const [haven] = buildPlayerPirateHideoutPorts([city]);
 assert.equal(haven.cityId,city.cityId); assert.equal(haven.portAlias,city.city);
 assert.throws(()=>buildPlayerPirateHideoutPorts([city,city]),/duplicate/i);
 assert.throws(()=>buildPlayerPirateHideoutPorts([{...city,isPirateHideout:false}]),/pirate/i);
});
