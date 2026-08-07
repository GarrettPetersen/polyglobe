import assert from "node:assert/strict";
import test from "node:test";

import {
  WHALE_TETHER_CURVE_SEGMENTS,
  drawWhaleTetherCurve
} from "./whaleTetherCurve.js";

function recordingPainter() {
  const lines = [];
  return {
    lines,
    painter: {
      line(x0, y0, x1, y1, color) {
        lines.push({ x0, y0, x1, y1, color });
      }
    }
  };
}

test("a slack whale tether follows a contiguous quadratic curve", () => {
  const recording = recordingPainter();
  const count = drawWhaleTetherCurve(
    0,
    0,
    16,
    0,
    4,
    recording.painter,
    "#rope"
  );

  assert.equal(count, WHALE_TETHER_CURVE_SEGMENTS);
  assert.deepEqual(recording.lines[0], {
    x0: 0,
    y0: 0,
    x1: 2,
    y1: 2,
    color: "#rope"
  });
  assert.deepEqual(recording.lines.at(-1), {
    x0: 14,
    y0: 2,
    x1: 16,
    y1: 0,
    color: "#rope"
  });
  assert.ok(recording.lines.some(({ x1, y1 }) => x1 === 8 && y1 === 4));
  for (let index = 1; index < recording.lines.length; index++) {
    assert.equal(recording.lines[index].x0, recording.lines[index - 1].x1);
    assert.equal(recording.lines[index].y0, recording.lines[index - 1].y1);
  }
});

test("a taut whale tether uses one straight GPU line", () => {
  const recording = recordingPainter();
  assert.equal(
    drawWhaleTetherCurve(1.2, 2.2, 12.8, 7.8, 0, recording.painter, "#rope"),
    1
  );
  assert.deepEqual(recording.lines, [{
    x0: 1,
    y0: 2,
    x1: 13,
    y1: 8,
    color: "#rope"
  }]);
});

test("whale tether curves reject malformed render inputs", () => {
  const recording = recordingPainter();
  assert.throws(
    () => drawWhaleTetherCurve(NaN, 0, 1, 1, 2, recording.painter, "#rope"),
    /start must be finite/
  );
  assert.throws(
    () => drawWhaleTetherCurve(0, 0, 1, 1, -1, recording.painter, "#rope"),
    /bend must be a non-negative finite number/
  );
  assert.throws(
    () => drawWhaleTetherCurve(0, 0, 1, 1, 1, null, "#rope"),
    /requires a line painter/
  );
});
