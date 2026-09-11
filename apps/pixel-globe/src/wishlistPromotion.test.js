import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { wishlistPromotionEnabled, wishlistPulse, wishlistModalLayout, STEAM_WISHLIST_URL } from "./wishlistPromotion.js";

test("wishlist promotion is enabled on the web and every demo, but not full Steam", () => {
  for (const editionId of ["demo", "full"]) for (const platformId of ["browser", "steam"]) {
    assert.equal(wishlistPromotionEnabled({ editionId, platformId }), !(editionId === "full" && platformId === "steam"));
  }
  assert.throws(() => wishlistPromotionEnabled({ editionId: "unknown", platformId: "browser" }));
  assert.throws(() => wishlistPromotionEnabled({ editionId: "full", platformId: "unknown" }));
});

test("wishlist modal fits narrow logical viewports and reduced motion is stationary", () => {
  for (const [w,h] of [[446,261],[320,200],[256,320],[475,256]]) {
    const { panel, wishlist, back } = wishlistModalLayout(w,h);
    assert.ok(panel.x >= 0 && panel.y >= 0 && panel.x+panel.w <= w && panel.y+panel.h <= h);
    assert.ok(wishlist.y+wishlist.h < back.y && back.y+back.h < panel.y+panel.h);
  }
  assert.equal(wishlistPulse(0,true),wishlistPulse(1000,true));
  assert.notEqual(wishlistPulse(0,false),wishlistPulse(1000,false));
});

const source = readFileSync(new URL("./main.js",import.meta.url),"utf8");
function load(name, context) {
  const start=source.indexOf(`function ${name}(`);
  const next=source.indexOf("\nfunction ",start+1);
  vm.runInContext(source.slice(start,next<0?undefined:next),context);
}
test("endgame return shows the wishlist step once instead of prematurely reloading", () => {
  for (const enabled of [false,true]) {
    let reloads=0, clicks=0;
    const context=vm.createContext({ SHOW_WISHLIST_CTA:enabled, wishlistEndgamePrompt:false,
      wishlistEndgameSelection:0, dirty:false, window:{location:{reload:()=>reloads++}},
      openSteamWishlist:()=>clicks++ });
    load("restartAfterGameOver",context);
    load("activateWishlistEndgameChoice",context);
    context.restartAfterGameOver();
    assert.equal(reloads,enabled?0:1);
    assert.equal(context.wishlistEndgamePrompt,enabled);
    if(enabled) {
      context.activateWishlistEndgameChoice();
      assert.equal(clicks,1);
      assert.equal(reloads,0);
      context.wishlistEndgameSelection=1;
      context.activateWishlistEndgameChoice();
      assert.equal(reloads,1);
    }
  }
});
test("web wishlist opens the full game's store page in a separate tab", () => {
  const calls=[];
  const context=vm.createContext({ SHOW_WISHLIST_CTA:true, steamPlatformBridge:null, STEAM_WISHLIST_URL,
    window:{open:(...args)=>calls.push(args)} });
  load("openSteamWishlist",context);
  context.openSteamWishlist();
  assert.deepEqual(calls,[[STEAM_WISHLIST_URL,"_blank","noopener,noreferrer"]]);
  const host=readFileSync(new URL("../steam-host/main.cjs",import.meta.url),"utf8");
  assert.ok(host.includes(`shell.openExternal("${STEAM_WISHLIST_URL}")`));
});

test("start wishlist floats below the title and outside regular menu rows", async () => {
  const { startWishlistRect } = await import("./wishlistPromotion.js");
  for (const w of [224, 280, 320]) {
    const panel = { x: 8, y: 10, w, h: 236 };
    const rect = startWishlistRect(panel);
    assert.ok(rect.y > panel.y + 32);
    assert.ok(rect.y + rect.h < panel.y + 64);
    assert.ok(rect.x >= panel.x && rect.x + rect.w <= panel.x + panel.w);
  }
  const context = vm.createContext({ localSaveResult: {status:"missing"}, startMenu: {},
    uiText:key=>key, START_MENU_ACTION_NEW_GAME:"new", START_MENU_ACTION_LAKE_BATTLE:"battle",
    START_MENU_ACTION_HISTORICAL_BATTLE:"history", START_MENU_ACTION_PAST_VOYAGES:"past",
    START_MENU_ACTION_OPTIONS:"options", START_MENU_ACTION_CREDITS:"credits", START_MENU_ACTION_ACHIEVEMENTS:"achievements" });
  load("startMenuActions", context);
  assert.ok(context.startMenuActions().every(action=>action.id!=="wishlist"));
});

test("floating wishlist remains keyboard accessible without changing the menu action list", () => {
  let opened=0, activated=0;
  const context=vm.createContext({ SHOW_WISHLIST_CTA:true, dirty:false,
    startMenu:{selectedIndex:0,wishlistFocused:false}, startMenuActions:()=>[{},{}],
    stepMenuIndex:(i,d,n)=>(i+d+n)%n, openSteamWishlist:()=>opened++, activateStartMenuSelection:()=>activated++ });
  load("handleStartMenuKeyDown",context);
  const key=key=>context.handleStartMenuKeyDown({key,preventDefault(){}});
  key("ArrowUp"); assert.equal(context.startMenu.wishlistFocused,true);
  key("Enter"); assert.equal(opened,1); assert.equal(activated,0);
  key("ArrowDown"); assert.equal(context.startMenu.wishlistFocused,false);
  key("Enter"); assert.equal(activated,1);
});

test("wishlist label is black and uses the pixel icon atlas at every pulse phase", () => {
  const icons=[], labels=[];
  const context=vm.createContext({ wishlistPulse, wishlistReducedMotion:{matches:false},
    renderedUiText:value=>value, fitPixelText:value=>value, PIXEL_FONT_SMALL_8:{},
    measureRenderedPixelTextWidth:()=>100, ctx:{save(){},restore(){},fillRect(){}},
    drawGameIcon:(id)=>icons.push(id), drawOptionsText:(label,x,y,options)=>labels.push(options.color) });
  load("drawFloatingWishlist",context);
  for (const now of [0,500,1000]) context.drawFloatingWishlist({x:0,y:0,w:224,h:22},false,now);
  assert.deepEqual(icons,["platform:steam","platform:steam","platform:steam"]);
  assert.deepEqual(labels,["#000000","#000000","#000000"]);
});
