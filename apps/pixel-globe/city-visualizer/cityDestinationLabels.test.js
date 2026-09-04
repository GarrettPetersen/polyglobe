import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_DESTINATION_LABEL_BOTTOM_PX,
  CITY_DESTINATION_LABEL_MARGIN_PX,
  CITY_DESTINATION_LABEL_TOP_PX,
  cityDestinationLabelContainsPoint,
  cityDestinationLeader,
  layoutCityDestinationLabels,
  retainAvailableCityDestinationLabelPin
} from "./cityDestinationLabels.js";

test("every city destination stays on a narrow screen without labels overlapping", () => {
  const entries = [
    entry("set-sail", "Set Sail", 52, { x: -350, y: 190 }),
    entry("shipyard", "Shipyard", 58, { x: 510, y: 155 }),
    entry("market", "Market", 46, { x: 320, y: 156 }),
    entry("equipment", "Smith", 40, { x: 355, y: 159 }),
    entry("inn", "Inn", 28, { x: 390, y: 162 }),
    entry("authority", "Port authority", 94, { x: 610, y: 160 }),
    entry("ship", "Your ship", 64, { x: 128, y: 158 }),
    entry("illicit", "Suspicious merchant", 124, { x: 174, y: 161 })
  ];
  const labels = layoutCityDestinationLabels({
    entries,
    viewportWidth: 256,
    viewportHeight: 256
  });

  assert.equal(labels.length, entries.length);
  for (const label of labels) {
    assert.ok(label.x >= CITY_DESTINATION_LABEL_MARGIN_PX);
    assert.ok(label.x + label.width <= 256 - CITY_DESTINATION_LABEL_MARGIN_PX);
    assert.ok(label.y >= CITY_DESTINATION_LABEL_TOP_PX);
    assert.ok(label.y + label.height <= 256 - CITY_DESTINATION_LABEL_BOTTOM_PX);
  }
  for (let leftIndex = 0; leftIndex < labels.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < labels.length; rightIndex++) {
      assert.equal(overlaps(labels[leftIndex], labels[rightIndex]), false);
    }
  }
});

test("labels follow visible anchors and become edge indicators for offscreen destinations", () => {
  const offscreen = layoutCityDestinationLabels({
    entries: [entry("market", "Market", 46, { x: 500, y: 140 })],
    viewportWidth: 256,
    viewportHeight: 256
  })[0];
  assert.equal(offscreen.x + offscreen.width, 252);
  assert.equal(offscreen.anchorVisible, false);
  assert.equal(cityDestinationLeader(offscreen, 256, 256).direction, "right");

  const visibleLeft = layoutCityDestinationLabels({
    entries: [entry("market", "Market", 46, { x: 60, y: 140 })],
    viewportWidth: 256,
    viewportHeight: 256
  })[0];
  const visibleRight = layoutCityDestinationLabels({
    entries: [entry("market", "Market", 46, { x: 120, y: 140 })],
    viewportWidth: 256,
    viewportHeight: 256
  })[0];
  assert.equal(visibleLeft.x, 37);
  assert.equal(visibleRight.x, 97);
  assert.equal(visibleLeft.anchorVisible, true);
  assert.equal(cityDestinationLeader(visibleLeft, 256, 256).direction, null);

  const beside = layoutCityDestinationLabels({
    entries: [{ ...entry("ship", "Your ship", 64, { x: 120, y: 160 }), preferredSide: "left" }],
    viewportWidth: 256,
    viewportHeight: 256
  })[0];
  assert.equal(beside.x + beside.width, 115);
  assert.equal(beside.y, 154);
});

test("city destination leaders use pixel-perfect orthogonal steps", () => {
  const label = layoutCityDestinationLabels({
    entries: [entry("inn", "Inn", 28, { x: -80, y: 190 })],
    viewportWidth: 256,
    viewportHeight: 256
  })[0];
  const leader = cityDestinationLeader(label, 256, 256);
  assert.deepEqual(leader.target, { x: 1, y: 190 });
  assert.equal(leader.direction, "left");
  assert.ok(leader.segments.length >= 1);
  assert.ok(leader.segments.every((segment) => (
    segment.x1 === segment.x2 || segment.y1 === segment.y2
  )));
});

test("label hit testing includes the plate and excludes its outer edge", () => {
  const label = layoutCityDestinationLabels({
    entries: [entry("shipyard", "Shipyard", 58, { x: 128, y: 140 })],
    viewportWidth: 256,
    viewportHeight: 256
  })[0];
  assert.equal(cityDestinationLabelContainsPoint(label, label.x, label.y), true);
  assert.equal(cityDestinationLabelContainsPoint(
    label,
    label.x + label.width - 1,
    label.y + label.height - 1
  ), true);
  assert.equal(cityDestinationLabelContainsPoint(label, label.x + label.width, label.y), false);
});

test("a hovered label stays under the pointer while other labels reflow around it", () => {
  const entries = [
    entry("market", "Market", 46, { x: 500, y: 140 }),
    entry("inn", "Inn", 28, { x: 510, y: 142 })
  ];
  const initial = layoutCityDestinationLabels({
    entries,
    viewportWidth: 256,
    viewportHeight: 256
  });
  const market = initial.find(({ id }) => id === "market");
  const moved = layoutCityDestinationLabels({
    entries: entries.map((candidate) => ({
      ...candidate,
      anchor: { x: candidate.anchor.x - 400, y: candidate.anchor.y }
    })),
    viewportWidth: 256,
    viewportHeight: 256,
    pinnedLabel: { id: market.id, x: market.x, y: market.y }
  });
  const pinnedMarket = moved.find(({ id }) => id === "market");
  const movedInn = moved.find(({ id }) => id === "inn");

  assert.deepEqual(
    { x: pinnedMarket.x, y: pinnedMarket.y },
    { x: market.x, y: market.y }
  );
  assert.equal(overlaps(pinnedMarket, movedInn), false);
  assert.deepEqual(moved.map(({ id }) => id), entries.map(({ id }) => id));
});

test("a pinned offscreen label is released when its in-world control replaces it", () => {
  const pin = { id: "set-sail", x: 4, y: 180 };
  assert.equal(
    retainAvailableCityDestinationLabelPin(pin, [
      entry("set-sail", "Set Sail", 52, { x: -350, y: 190 })
    ]),
    pin
  );
  assert.equal(
    retainAvailableCityDestinationLabelPin(pin, [
      entry("ship", "Your ship", 64, { x: 128, y: 158 })
    ]),
    null
  );
});

test("malformed and impossible destination label layouts fail loudly", () => {
  assert.throws(() => layoutCityDestinationLabels({
    entries: [entry("market", "Market", 46, { x: 20, y: 50 }), entry("market", "Market", 46, { x: 40, y: 70 })],
    viewportWidth: 256,
    viewportHeight: 256
  }), /Duplicate city destination label/);
  assert.throws(() => layoutCityDestinationLabels({
    entries: [entry("authority", "Port authority", 260, { x: 20, y: 50 })],
    viewportWidth: 256,
    viewportHeight: 256
  }), /exceeds the viewport/);
  assert.throws(() => layoutCityDestinationLabels({
    entries: [entry("market", "Market", 46, { x: 20, y: 50 })],
    viewportWidth: 256,
    viewportHeight: 256,
    pinnedLabel: { id: "missing", x: 4, y: 34 }
  }), /Pinned city destination label is unavailable/);
});

function entry(id, label, width, anchor) {
  return {
    id,
    label,
    font: "8px Silkscreen",
    textWidth: width - 8,
    width,
    height: 13,
    preferredSide: "above",
    anchor
  };
}

function overlaps(left, right) {
  return left.x < right.x + right.width && left.x + left.width > right.x &&
    left.y < right.y + right.height && left.y + left.height > right.y;
}
