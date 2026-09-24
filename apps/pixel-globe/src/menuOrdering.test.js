import assert from "node:assert/strict";
import test from "node:test";

import {
  OPTIONS_MENU_ROW,
  optionsMenuRowIndex,
  optionsMenuRowOrder
} from "./menuOrdering.js";

test("desktop options put quit first and return to start last", () => {
  const order = optionsMenuRowOrder({ showWishlist: true, desktop: true });
  assert.equal(order[0], OPTIONS_MENU_ROW.QUIT);
  assert.equal(order[1], OPTIONS_MENU_ROW.WISHLIST);
  assert.equal(order.at(-1), OPTIONS_MENU_ROW.START_MENU);
  assert.equal(optionsMenuRowIndex(order, OPTIONS_MENU_ROW.QUIT), 0);
});

test("browser options omit quit without disturbing the ordinary first row", () => {
  const wishlisted = optionsMenuRowOrder({ showWishlist: true, desktop: false });
  assert.equal(wishlisted[0], OPTIONS_MENU_ROW.WISHLIST);
  assert.equal(optionsMenuRowIndex(wishlisted, OPTIONS_MENU_ROW.QUIT, { optional: true }), -1);

  const ordinary = optionsMenuRowOrder({ showWishlist: false, desktop: false });
  assert.equal(ordinary[0], OPTIONS_MENU_ROW.FULLSCREEN);
  assert.equal(
    ordinary.indexOf(OPTIONS_MENU_ROW.AUTO_ROW),
    ordinary.indexOf(OPTIONS_MENU_ROW.CONTROL_SCHEME) + 1
  );
  assert.equal(ordinary.at(-1), OPTIONS_MENU_ROW.START_MENU);
});

test("options menu ordering rejects malformed feature and row requests", () => {
  assert.throws(
    () => optionsMenuRowOrder({ showWishlist: "yes", desktop: false }),
    /boolean platform features/
  );
  assert.throws(
    () => optionsMenuRowIndex([], OPTIONS_MENU_ROW.QUIT),
    /non-empty order/
  );
  assert.throws(
    () => optionsMenuRowIndex(
      optionsMenuRowOrder({ showWishlist: false, desktop: false }),
      OPTIONS_MENU_ROW.QUIT
    ),
    /unavailable/
  );
});
