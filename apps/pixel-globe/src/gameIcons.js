import { SHIP_STATS } from "./shipStats.js";

export const GAME_ICON_SIZE = 16;
export const GAME_ICON_ATLAS_COLUMNS = 16;
export const GAME_ICON_ASSET_VERSION = "resurrect-icons-49";

const ICON_COLOR = Object.freeze({
  achievementStatus: "#966c6c",
  danger: "#6e2727",
  dialogue: "#4d65b4",
  gold: "#9e4539",
  navigation: "#484a77",
  parchment: "#676633",
  purple: "#6b3e75",
  sea: "#0b5e65",
  steel: "#625565",
  success: "#547e64",
  timber: "#4c3e24",
  warm: "#694f62"
});

export const GAME_ICON_PACKS = Object.freeze({
  pirate: iconPack({
    creator: "Free Game Assets",
    title: "Free Pirate Stuff Icons",
    sourceUrl: "https://free-game-assets.itch.io/free-pirate-stuff-pixel-art-icons",
    license: "CraftPix Freebie License",
    archive: "free-pirate-stuff-pixel-art-icons.zip"
  }),
  lethe: iconPack({
    creator: "LetheDiana",
    title: "Pixel Items_300+",
    sourceUrl: "https://lethediana.itch.io/pixel-items",
    license: "LetheDiana itch.io asset license",
    archive: "Pixel_Items_16x16_free.zip"
  }),
  glionox: iconPack({
    creator: "Glionox",
    title: "Items pack (x16)",
    sourceUrl: "https://glionox.itch.io/items16",
    license: "Glionox itch.io asset license",
    archive: "items.zip"
  }),
  alex: iconPack({
    creator: "alexkovacsart",
    title: "100 Free Pixel Art Foods!",
    sourceUrl: "https://alexkovacsart.itch.io/free-pixel-art-foods",
    license: "CC BY 4.0",
    archive: "Free_pixel_food_16x16.zip",
    repoArchive: "vendor/icon-packs/alexkovacsart-free-pixel-art-foods.zip"
  }),
  keifoo: iconPack({
    creator: "KeifooPX",
    title: "99 various ingredients +",
    sourceUrl: "https://keifoopx.itch.io/99-various-ingredients",
    license: "KeifooPX itch.io asset license",
    archive: "99_ingredients.zip"
  }),
  nikoichu: iconPack({
    creator: "Nikoichu",
    title: "1-bit Pixel Icons",
    sourceUrl: "https://nikoichu.itch.io/pixel-icons",
    license: "CC0 1.0",
    archive: "1-bit_Pixel_Icons.zip",
    repoArchive: "vendor/icon-packs/nikoichu-1-bit-pixel-icons-v1.2.zip"
  })
});

export const SHIP_MENU_ICON_IDS = Object.freeze(Object.fromEntries(
  SHIP_STATS.map(({ slug }) => [slug, `ship:${slug}`])
));

const SHIP_MENU_ICON_SOURCES = Object.freeze(Object.fromEntries(
  SHIP_STATS.map(({ slug }) => [
    SHIP_MENU_ICON_IDS[slug],
    projectAsset(`public/assets/ui/ship-icons/${slug}.png`)
  ])
));

export const GAME_ICON_SOURCES = Object.freeze({
  "good:hardtack": alex("pastry_bread.png"),
  "good:fresh-water": nikoichu("Weather_Water_Droplet_Liquid_Rain_Element_Big.png", ICON_COLOR.dialogue),
  "good:foraged-food": alex("fruit_apple.png"),
  "good:grain": paperOutlined(keifoo("grains_png/wheat.png")),
  "good:rice": paperOutlined(keifoo("grains_png/rice.png")),
  "good:fish": generatedIcon("herring"),
  "good:whale-blubber": pirate(9),
  "good:beaver-pelts": generatedIcon("beaver-pelt"),
  "good:hides": glionox(211),
  "good:cheese": alex("cheese_gouda.png"),
  "good:wine": pirate(43),
  "good:olive-oil": glionox(378),
  "good:salt": paperOutlined(lethe(1, 7)),
  "good:sugar": paperOutlined(lethe(2, 7)),
  "good:timber": glionox(991),
  "good:wool": glionox(780),
  "good:cotton": glionox(1121),
  "good:flax": glionox(1010),
  "good:iron": glionox(562),
  "good:copper": glionox(564),
  "good:tin": glionox(566),
  "good:amber": glionox(559),
  "good:furs": glionox(233),
  "good:beeswax": glionox(678),
  "good:naval-stores": glionox(680),
  "good:sulfur": glionox(721),
  "good:arms": pirate(6),
  "good:linen-cloth": paperOutlined(glionox(785)),
  "good:wool-cloth": glionox(581),
  "good:cotton-cloth": glionox(582),
  "good:paper": lethe(5, 14),
  "good:printed-books": lethe(9, 14),
  "good:silk": glionox(580),
  "good:silk-cloth": glionox(592),
  "good:lacquerware": glionox(806),
  "good:ginseng": glionox(819),
  "good:pepper": keifoo("spices_png/pepper.png"),
  "good:cinnamon": generatedIcon("cinnamon-sticks"),
  "good:cloves": keifoo("spices_png/cloves.png"),
  "good:nutmeg": keifoo("spices_png/nutmeg.png"),
  "good:ginger": alex("vegetable_ginger.png"),
  "good:tea": alex("coffee_greentea.png"),
  "good:coffee": alex("coffee_darkroast.png"),
  "good:cacao": glionox(395),
  "good:dyes": lethe(10, 7),
  "good:indigo": lethe(1, 1),
  "good:porcelain": glionox(810),
  "good:glassware": keifoo("water_png/water_glass.png"),
  "good:carpets": glionox(660),
  "good:artwork": lethe(4, 14),
  "good:perfume": lethe(12, 2),
  "good:ivory": glionox(1164),
  "good:silver": glionox(570),
  "good:gold": glionox(567),

  "menu:continue": nikoichu("Arrows_Media_Controls_Play_Triangle.png", ICON_COLOR.success),
  "menu:new-game": nikoichu("Travel_Ship_Medieval_Caravel.png", ICON_COLOR.sea),
  "menu:lake-battle": nikoichu("RPG_Crossed_Swords_Duel_PvP_Combat_Battle_War.png", ICON_COLOR.danger),
  "menu:past-voyages": nikoichu("Map_Markers_Treasure_Map_Paper_Parchment.png", ICON_COLOR.parchment),
  "menu:achievements": nikoichu("Sports_Winner_Award_Cup_Achievement_Trophy.png", ICON_COLOR.gold),
  "menu:options": nikoichu("Software_Options_Settings_Sliders_Knobs_Audio.png", ICON_COLOR.purple),
  "menu:credits": nikoichu("Software_Text_Document_Credits_Roll_Attributions.png", ICON_COLOR.dialogue),
  "menu:map": nikoichu("Map_Markers_Travel_Map_Folded.png", ICON_COLOR.navigation),
  "menu:captain": nikoichu("Travel_Person_Player_Character_Single.png", ICON_COLOR.warm),
  "menu:ship": nikoichu("Travel_Ship_Sailing_Boat.png", ICON_COLOR.sea),
  "menu:politics": nikoichu("Map_Markers_Flagpole_Triangle_Minesweeper.png", ICON_COLOR.gold),
  "menu:discoveries": nikoichu("Media_Eyeball_Vision_Shown.png", ICON_COLOR.navigation),

  "achievement:magellan": nikoichu("Software_Planet_Geography_Localization_Global_Language_Translation_2.png", ICON_COLOR.sea),
  "achievement:founder": nikoichu("Map_Markers_Building_Home_House.png", ICON_COLOR.warm),
  "achievement:expansionist": nikoichu("Map_Markers_Flagpole.png", ICON_COLOR.gold),
  "achievement:colonist": nikoichu("Map_Markers_Buildings_Houses_Homes_Village_Town.png", ICON_COLOR.success),
  "achievement:hawaii": nikoichu("Map_Markers_Tree_Forest_Palm_Beach.png", ICON_COLOR.success),
  "achievement:married": nikoichu("Boardgames_Suit_Hearts.png", ICON_COLOR.danger),
  "achievement:lightning": nikoichu("Alchemy_Potion_Vial_Bottle_Lightning_Bolt_Zap_Speed_Full.png", ICON_COLOR.gold),
  "status:achievement-locked": nikoichu("Tools_Crafting_Padlock_Locked.png", ICON_COLOR.achievementStatus),
  "status:achievement-unlocked": nikoichu("Tools_Crafting_Padlock_Unlocked_1.png", ICON_COLOR.achievementStatus),

  "religion:christian": nikoichu("Misc_Religion_Christianity_Cross.png", ICON_COLOR.danger),
  "religion:orthodox": projectAsset("public/assets/misc/orthodox_cross.png", null, {
    lightMonotone: ICON_COLOR.danger
  }),
  "religion:islam": nikoichu("Misc_Religion_Islam_Crescent_Star_1.png", ICON_COLOR.sea),
  "religion:judaism": nikoichu("Misc_Religion_Judaism_Jewish_David_Star.png", ICON_COLOR.dialogue),
  "religion:hindu": projectAsset("public/assets/misc/om.png", null, {
    lightMonotone: ICON_COLOR.gold
  }),
  "religion:jain": projectAsset("public/assets/misc/jain.png", null, {
    lightMonotone: ICON_COLOR.success
  }),
  "religion:sikh": projectAsset("public/assets/misc/ik_onkar.png", null, {
    lightMonotone: ICON_COLOR.warm
  }),
  "religion:zoroastrian": projectAsset("public/assets/misc/faravahar.png", null, {
    lightMonotone: ICON_COLOR.gold
  }),
  "religion:buddhist": nikoichu("Misc_Religion_Buddha_Buddhism_Meditation.png", ICON_COLOR.gold),
  "religion:daoist": nikoichu("Misc_Yin_Yang_Balance_Big.png", ICON_COLOR.sea),
  "religion:confucian": projectAsset("public/assets/misc/confucian.png", null, {
    lightMonotone: ICON_COLOR.purple
  }),
  "religion:shinto": projectAsset("public/assets/misc/shinto.png", null, {
    lightMonotone: ICON_COLOR.warm
  }),
  "religion:andean-traditional": nikoichu("Alchemy_Gold_Sol_Sun.png", ICON_COLOR.gold),
  "religion:mesoamerican-traditional": nikoichu("Weather_Sun_Holy_Light_Rays_Summer_Season.png", ICON_COLOR.warm),
  "religion:north-american-traditional": nikoichu("Tools_Crafting_Writing_Pen_Quill_Feather.png", ICON_COLOR.success),
  "religion:african-traditional": nikoichu("Map_Markers_Tree_Forest_Decidous_1.png", ICON_COLOR.timber),
  "religion:polynesian-traditional": nikoichu("Map_Markers_Tree_Forest_Palm_Beach.png", ICON_COLOR.sea),
  "religion:austronesian-traditional": nikoichu("Weather_Nature_Leaf_Autumn_Fall_Element.png", ICON_COLOR.success),
  "religion:ainu-traditional": nikoichu("Weather_Nature_Leaf_Autumn_Fall_Element.png", ICON_COLOR.timber),

  ...SHIP_MENU_ICON_SOURCES,

  "action:dock": nikoichu("Travel_Ship_Dock.png", ICON_COLOR.sea),
  "action:anchor": projectAsset("public/assets/ui/anchor.png", null, {
    lightMonotone: ICON_COLOR.sea
  }),
  "action:hail": nikoichu("Software_Speech_Bubble_Three_Dots_Dialogue.png", ICON_COLOR.dialogue),
  "action:fish": nikoichu("Tools_Crafting_Fishing_Rod.png", ICON_COLOR.navigation),
  "action:harpoon": nikoichu("Tools_Crafting_Fishing_Harpoon_Spear.png", ICON_COLOR.steel),
  "action:scavenge": nikoichu("Travel_Backpack_Bag_Bedroll.png", ICON_COLOR.timber),
  "action:buy": nikoichu("Software_Shopping_Basket.png", ICON_COLOR.success),
  "action:sell": nikoichu("Arrows_Media_Controls_Loop_Reload_Refresh.png", ICON_COLOR.gold),
  "action:back": nikoichu("Arrows_Go_Back_Return_Previous.png", ICON_COLOR.steel),
  "action:leave": nikoichu("Software_Exit_Quit_Doorway_Button.png", ICON_COLOR.warm),
  "action:quest": nikoichu("Software_Speech_Bubble_Exclaimation_Mark_Quest_New.png", ICON_COLOR.gold),
  "action:talk": nikoichu("Software_Speech_Bubble_Three_Dots_Dialogue.png", ICON_COLOR.dialogue),
  "action:wait": nikoichu("Software_Clock_Time_Wait_1.png", ICON_COLOR.steel),
  "action:attack": nikoichu("Warfare_Medieval_Siege_Engine_Cannon_Gunpowder.png", ICON_COLOR.danger),
  "action:loadout": nikoichu("Software_Clipboard_Todo_Tasks_Done_Checkmark.png", ICON_COLOR.navigation),
  "action:shipyard": nikoichu("Travel_Ship_Medieval_Galleon.png", ICON_COLOR.sea),
  "action:letter": nikoichu("Tools_Crafting_Writing_Parchment_Scroll_Document_Sealed.png", ICON_COLOR.parchment),
  "action:disguise": nikoichu("Hats_Domino_Mask_Incognito_Private_Privacy.png", ICON_COLOR.purple),
  "action:surrender": nikoichu("Map_Markers_Flagpole.png", ICON_COLOR.steel),
  "action:passenger": nikoichu("Travel_Person_People_Two.png", ICON_COLOR.sea),
  "action:viking": nikoichu("Hats_Viking_Helmet_Armor.png", ICON_COLOR.steel),
  "action:inventory": nikoichu("Tools_Crafting_Chest_Locked_Loot_2.png", ICON_COLOR.timber),
  "action:resume": nikoichu("Arrows_Media_Controls_Play_Triangle.png", ICON_COLOR.success),
  "action:restart": nikoichu("Arrows_Reload_Refresh_Rotate_Clockwise.png", ICON_COLOR.timber),
  "action:choose-ships": nikoichu("Travel_Ship_Sailing_Boat.png", ICON_COLOR.sea),
  "action:start-menu": nikoichu("Map_Markers_Building_Home_House.png", ICON_COLOR.warm),
  "action:navigation": nikoichu("Map_Markers_Compass_Rose_1.png", ICON_COLOR.navigation),
  "action:discover": nikoichu("Media_Eyeball_Vision_Shown.png", ICON_COLOR.navigation),

  "input:xbox:a": nikoichu("Controller_Button_A.png", ICON_COLOR.success),
  "input:xbox:b": nikoichu("Controller_Button_B.png", ICON_COLOR.danger),
  "input:xbox:x": nikoichu("Controller_Button_X.png", ICON_COLOR.dialogue),
  "input:xbox:y": nikoichu("Controller_Button_Y.png", ICON_COLOR.gold),
  "input:xbox:lt": nikoichu("Controller_Buttons_Left_Trigger_LT.png", ICON_COLOR.timber),
  "input:xbox:rt": nikoichu("Controller_Buttons_Right_Trigger_RT.png", ICON_COLOR.timber),
  "input:playstation:cross": nikoichu("Controller_Button_Cross.png", ICON_COLOR.dialogue),
  "input:playstation:circle": nikoichu("Controller_Button_Circle.png", ICON_COLOR.danger),
  "input:playstation:square": nikoichu("Controller_Button_Square.png", ICON_COLOR.purple),
  "input:playstation:triangle": nikoichu("Controller_Button_Triangle.png", ICON_COLOR.success),
  "input:playstation:l2": nikoichu("Controller_Buttons_Left_Trigger_L2.png", ICON_COLOR.timber),
  "input:playstation:r2": nikoichu("Controller_Buttons_Right_Trigger_R2.png", ICON_COLOR.timber),
  "input:nintendo:a": nikoichu("Controller_Face_Buttons_Nintendo_A.png", ICON_COLOR.timber),
  "input:nintendo:b": nikoichu("Controller_Face_Buttons_Nintendo_B.png", ICON_COLOR.timber),
  "input:nintendo:x": nikoichu("Controller_Face_Buttons_Nintendo_X.png", ICON_COLOR.timber),
  "input:nintendo:y": nikoichu("Controller_Face_Buttons_Nintendo_Y.png", ICON_COLOR.timber),
  "input:nintendo:zl": generatedIcon("nintendo-zl"),
  "input:nintendo:zr": generatedIcon("nintendo-zr"),
  "input:generic:south": nikoichu("Controller_Face_Buttons_Blank_Down.png", ICON_COLOR.timber),
  "input:generic:east": nikoichu("Controller_Face_Buttons_Blank_Right.png", ICON_COLOR.timber),
  "input:generic:west": nikoichu("Controller_Face_Buttons_Blank_Left.png", ICON_COLOR.timber),
  "input:generic:north": nikoichu("Controller_Face_Buttons_Blank_Up.png", ICON_COLOR.timber),
  "input:generic:left-trigger": nikoichu("Controller_Buttons_Left_Trigger_LT.png", ICON_COLOR.timber),
  "input:generic:right-trigger": nikoichu("Controller_Buttons_Right_Trigger_RT.png", ICON_COLOR.timber),
  "input:common:view": nikoichu("Controller_Buttons_View_Window_Cast.png", ICON_COLOR.steel),
  "input:common:menu": nikoichu("Controller_Buttons_Menu_Options_Settings.png", ICON_COLOR.steel),
  "input:common:left-stick": nikoichu("Controller_Stick_L_Center.png", ICON_COLOR.steel),
  "input:common:right-stick": nikoichu("Controller_Stick_R_Center.png", ICON_COLOR.steel),

  "item:sturdy-barrels": nikoichu("Travel_Petrol_Oil_Barrel_Fuel.png", ICON_COLOR.timber),
  "item:shore-party-kit": nikoichu("Travel_Backpack_Bag_Bedroll.png", ICON_COLOR.timber),
  "item:tarred-hemp-rigging": nikoichu("Software_Network_Cable_Internet_Connection_Ethernet_RJ45.png", ICON_COLOR.timber),
  "item:coir-cordage": nikoichu("Software_Hardware_USB_Cable_Connector.png", ICON_COLOR.warm),
  "item:flemish-sailcloth": nikoichu("Tools_Crafting_Tailoring_Cloth_Sewing_Materials.png", ICON_COLOR.sea),
  "item:lateen-sailcloth": nikoichu("RPG_Item_Accessory_Armor_Equipment_Slot_Cape_Cloak_Clothing.png", ICON_COLOR.gold),
  "item:lead-sheathing": nikoichu("RPG_Item_Stat_Shield_Defense_Armor.png", ICON_COLOR.steel),
  "item:surgeons-chest": nikoichu("Misc_Stethoscope_Doctor_Medic_Tool.png", ICON_COLOR.danger),
  "item:pilots-instruments": nikoichu("Map_Markers_Compass_Rose_2.png", ICON_COLOR.navigation),
  "item:longsword": nikoichu("RPG_Item_Weapon_Sword_Attack_Melee_Slashing_Damage.png", ICON_COLOR.steel),
  "item:tulwar": nikoichu("RPG_Item_Weapon_Shortsword_Melee.png", ICON_COLOR.gold),
  "item:katana": nikoichu("RPG_Skill_Strike_Attack_Sword_Slash_Cleave.png", ICON_COLOR.danger),
  "item:wheellock-pistol": nikoichu("RPG_Item_Weapon_Pistol_Gun_Ranged.png", ICON_COLOR.danger),
  "item:mariners-bows": nikoichu("RPG_Item_Weapon_Bow_Ranged_Shooting.png", ICON_COLOR.timber),
  "item:english-longbows": nikoichu("RPG_Item_Weapon_Bow_Drawn_Ranged_Shooting.png", ICON_COLOR.timber),
  "item:composite-recurve-bows": nikoichu("RPG_Item_Weapon_Bow_Ranged_Shooting.png", ICON_COLOR.gold),
  "item:yumi": nikoichu("RPG_Item_Weapon_Bow_Drawn_Ranged_Shooting.png", ICON_COLOR.danger),
  "item:viking-bows": nikoichu("Tools_Crafting_Profession_Hunting_Bow_Meat_Game.png", ICON_COLOR.warm),
  "item:crossbows": nikoichu("RPG_Item_Weapon_Crossbow_Ranged_Damage.png", ICON_COLOR.steel),
  "item:matchlock-arquebuses": nikoichu("Warfare_Weapon_Pistol_Gun_Sidearm.png", ICON_COLOR.danger),
  "item:swivel-gun": nikoichu("Warfare_Medieval_Siege_Engine_Cannon_Gunpowder.png", ICON_COLOR.steel),
  "item:incendiary-arrows": nikoichu("RPG_Skill_Flaming_Shot_Fire_Arrow.png", ICON_COLOR.danger),
  "item:bronze-fish-hooks": nikoichu("Tools_Crafting_Fishing_Rod_Hook.png", ICON_COLOR.gold),
  "item:zamzam-flask": nikoichu("Weather_Water_Droplet_Liquid_Rain_Element_Big.png", ICON_COLOR.dialogue),

  "good:gunpowder": pirate(42),
  "good:matchlocks": pirate(45),
  "good:coal": glionox(574)
});

const GAME_ICON_IDS = Object.freeze(Object.keys(GAME_ICON_SOURCES));
const GAME_ICON_INDEX = new Map(GAME_ICON_IDS.map((id, index) => [id, index]));
if (GAME_ICON_INDEX.size !== GAME_ICON_IDS.length) throw new Error("Game icon registry contains duplicate ids");

export const TRADE_GOOD_ICON_IDS = Object.freeze(Object.fromEntries(
  GAME_ICON_IDS
    .filter((id) => id.startsWith("good:"))
    .map((id) => [id.slice("good:".length), id])
));

const START_MENU_ICON_IDS = Object.freeze({
  continue: "menu:continue",
  "new-game": "menu:new-game",
  "lake-battle": "menu:lake-battle",
  "historical-battle": "action:attack",
  "past-voyages": "menu:past-voyages",
  achievements: "menu:achievements",
  options: "menu:options",
  credits: "menu:credits"
});

const MENU_LABEL_ICON_IDS = Object.freeze({
  RESUME: "action:resume",
  RESTART: "action:restart",
  REMATCH: "action:attack",
  "WATCH REPLAY": "action:resume",
  "CHOOSE SHIPS": "action:choose-ships",
  "CHOOSE BATTLE": "menu:map",
  OPTIONS: "menu:options",
  "START MENU": "action:start-menu",
  BACK: "action:back",
  BATTLE: "action:attack"
});

const DIALOGUE_NODE_ICON_IDS = Object.freeze({
  greeting: "action:talk",
  "drunk-factor": "action:talk",
  root: "action:back",
  barred: "action:back",
  buy: "action:buy",
  equipment: "action:inventory",
  "equipment-nets": "action:fish",
  "equipment-cannons": "action:attack",
  "equipment-harpoons": "action:harpoon",
  loadout: "action:loadout",
  shipyard: "action:shipyard",
  "shipyard-investment-offer": "action:shipyard",
  "shipyard-investment": "action:shipyard",
  "shipyard-dividend-arrival": "action:shipyard",
  sell: "action:sell",
  quest: "action:quest",
  "viking-longship": "action:viking",
  "japanese-matchlocks": "good:matchlocks",
  "caribbean-ginger": "good:ginger",
  "chef-quest": "action:talk",
  colonization: "action:quest",
  conquistador: "action:attack",
  marque: "action:letter",
  "trade-pass": "action:letter",
  "portuguese-cartaz": "action:letter",
  "city-attack": "action:attack",
  cargo: "action:inventory"
});

const DIALOGUE_ACTION_ICON_IDS = Object.freeze({
  close: "action:leave",
  "wait-in-port": "action:wait",
  "leave-buy": "action:back",
  "leave-sell": "action:back",
  "undo-market": "action:back",
  "buy-max": "action:buy",
  "sell-all": "action:sell",
  "sell-shipyard-material": "action:sell",
  "set-port-heading": "action:navigation",
  "open-port": "action:dock",
  "open-passenger": "action:passenger",
  "complete-quest": "action:quest",
  "attempt-disguise": "action:disguise",
  "land-marines": "action:attack",
  "attack-city": "action:attack",
  "begin-ningbo-battle": "action:attack",
  "choose-east-asian-outcome": "action:talk",
  "answer-ningbo-bribe": "action:talk",
  "refuse-tsushima-vouch": "action:talk",
  "attempt-restricted-illicit-trade": "action:disguise",
  attack: "action:attack",
  threaten: "action:attack",
  surrender: "action:surrender",
  "accept-damage-surrender": "action:surrender",
  "release-damage-surrender": "action:leave",
  "review-surrendered-prize": "action:shipyard",
  "inspect-surrendered-ship": "action:shipyard",
  "capture-surrendered-ship": "action:surrender",
  sell: "action:sell",
  "open-custom-loadout": "action:loadout",
  "select-custom-loadout": "action:loadout",
  "select-loadout": "action:loadout",
  "request-marque": "action:letter",
  "open-trade-pass": "action:letter",
  "request-trade-pass": "action:letter",
  "purchase-safe-passage": "action:buy",
  "purchase-portuguese-cartaz": "action:letter",
  "decline-portuguese-cartaz-market": "action:back",
  "continue-portuguese-cartaz-market": "action:buy",
  "attempt-portuguese-cartaz-illicit-market": "action:disguise",
  "pay-cartaz-fine": "action:buy",
  "surrender-cartaz-cargo": "action:surrender",
  "evade-cartaz-inspection": "action:attack",
  "pay-illicit-trade-fine": "action:buy",
  "surrender-illicit-trade-cargo": "action:surrender",
  "evade-illicit-trade-inspection": "action:attack",
  "refuse-safe-passage": "action:leave",
  "purchase-viking-longship": "action:viking",
  "accept-viking-longship-reward": "action:viking",
  "decline-viking-longship-reward": "action:leave",
  "inspect-shipyard-listing": "action:shipyard",
  "confirm-ship-purchase": "action:shipyard",
  "cancel-ship-purchase": "action:back",
  "purchase-ship": "action:shipyard",
  "begin-shipyard-investment": "action:shipyard",
  "pay-shipyard-investment": "action:buy",
  "deliver-shipyard-material": "action:quest",
  "open-player-shipyard": "action:shipyard",
  "fund-player-shipyard": "action:shipyard",
  "shipyard-ledger-tab": "action:letter",
  "shipyard-ledger-page": "action:navigation",
  "deliver-viking-material": "action:quest",
  "deliver-japanese-matchlock-material": "action:quest",
  "deliver-caribbean-ginger": "good:ginger",
  "deliver-chef-ingredients": "action:quest",
  "recruit-chef": "action:passenger",
  "deliver-colonization-material": "action:quest",
  "accept-conquistador-expedition": "action:quest",
  "deliver-conquistador-material": "action:quest",
  "begin-conquistador-expedition": "action:attack",
  "replenish-conquistador-company": "action:passenger",
  "claim-conquistador-reward": "action:buy",
  "advance-colony-negotiation": "action:talk",
  "grant-colony-permission": "action:letter",
  "finish-colony-negotiation": "action:talk",
  "embark-colonists": "action:passenger",
  "land-colonists": "action:dock",
  "deliver-colony-resupply": "action:quest",
  "report-colony-defense": "action:quest",
  "confirm-piracy": "action:attack",
  "receive-aid": "good:fresh-water",
  "complete-passenger": "action:passenger",
  "begin-hajj": "religion:islam",
  "complete-hajj": "religion:islam",
  "participate-religious-mission": "action:talk",
  "complete-religious-mission": "action:quest",
  "resolve-bible-faith": "religion:christian",
  "deliver-religious-itinerary-leg": "action:quest",
  "deliver-east-asian-itinerary-leg": "action:quest",
  "surrender-bible-contraband": "action:leave",
  "evade-bible-inspection": "action:attack",
  "negotiate-envoy": "action:letter",
  "envoy-negotiated": "action:letter",
  "finish-envoy-negotiation": "action:letter",
  "acknowledge-quest-journey-dialogue": "action:talk",
  "continue-campaign": "action:talk",
  "campaign-intro-complete": "action:talk",
  "campaign-victory": "action:quest",
  "continue-historical-battle-dialogue": "action:talk",
  "begin-historical-battle": "action:attack",
  "show-historical-battle-result": "action:quest",
  "campaign-retire": "action:leave",
  "campaign-keep-sailing": "action:resume",
  "buy-net": "action:fish",
  "buy-cannon-equipment": "action:attack",
  "buy-whale-harpoon": "action:harpoon",
  "buy-perk-item": "action:inventory",
  "decline-special-equipment": "action:back",
  "buy-equipment-factor-pitch": "action:inventory",
  "decline-equipment-factor-pitch": "action:back",
  "accept-marque-factor-offer": "action:letter",
  "decline-marque-factor-offer": "action:back",
  "decline-quest-cargo-tip": "action:back",
  "confirm-tribute-theft": "action:sell",
  "cancel-tribute-theft": "action:back",
  "confirm-quest-cargo-sale": "action:sell",
  "cancel-quest-cargo-sale": "action:back",
  buy: "action:buy",
  "accept-quest": "action:quest",
  "accept-passenger": "action:passenger",
  "decline-passenger": "action:back",
  "accept-rescued-traveler": "action:passenger",
  "decline-rescued-traveler": "action:leave",
  "finish-rescued-traveler-offer": "action:quest",
  "continue-rescued-traveler-homecoming": "action:talk",
  "complete-rescued-traveler-reunion": "action:passenger",
  "recruit-rescued-traveler": "action:passenger",
  "complete-pirate-captive-handover": "action:surrender"
});

export function gameIconIds() {
  return GAME_ICON_IDS;
}

export function gameIconAtlasDimensions() {
  return {
    width: GAME_ICON_ATLAS_COLUMNS * GAME_ICON_SIZE,
    height: Math.ceil(GAME_ICON_IDS.length / GAME_ICON_ATLAS_COLUMNS) * GAME_ICON_SIZE
  };
}

export function gameIconAtlasRect(iconId) {
  const index = GAME_ICON_INDEX.get(iconId);
  if (index === undefined) throw new Error(`Unknown game icon: ${iconId}`);
  return {
    x: (index % GAME_ICON_ATLAS_COLUMNS) * GAME_ICON_SIZE,
    y: Math.floor(index / GAME_ICON_ATLAS_COLUMNS) * GAME_ICON_SIZE,
    w: GAME_ICON_SIZE,
    h: GAME_ICON_SIZE
  };
}

export function gameIconDrawRect(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Invalid game icon position: ${x},${y}`);
  }
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: GAME_ICON_SIZE,
    h: GAME_ICON_SIZE
  };
}

export function tradeGoodIconId(goodId) {
  const iconId = TRADE_GOOD_ICON_IDS[goodId];
  if (!iconId) throw new Error(`Trade good has no icon: ${goodId}`);
  return iconId;
}

export function startMenuIconId(actionId) {
  const iconId = START_MENU_ICON_IDS[actionId];
  if (!iconId) throw new Error(`Start menu action has no icon: ${actionId}`);
  return iconId;
}

export function shipMenuIconId(shipSlug) {
  const iconId = SHIP_MENU_ICON_IDS[shipSlug];
  if (!iconId) throw new Error(`Ship has no menu icon: ${shipSlug}`);
  return iconId;
}

export function achievementStatusIconId(unlocked) {
  if (typeof unlocked !== "boolean") {
    throw new Error(`Achievement status requires a boolean: ${unlocked}`);
  }
  return unlocked ? "status:achievement-unlocked" : "status:achievement-locked";
}

export function menuLabelIconId(label) {
  const iconId = MENU_LABEL_ICON_IDS[label];
  if (!iconId) throw new Error(`Menu label has no icon: ${label}`);
  return iconId;
}

export function dialogueOptionIconId(option) {
  if (!option?.action?.type) throw new Error("Dialogue option has no action type");
  if (option.iconId) {
    if (!GAME_ICON_INDEX.has(option.iconId)) {
      throw new Error(`Dialogue option has unknown icon override: ${option.iconId}`);
    }
    return option.iconId;
  }
  if (option.action.type === "buy-equipment-factor-pitch") {
    if (option.action.kind === "fishing-net") return "action:fish";
    if (option.action.kind === "cannon") return "action:attack";
    if (option.action.kind === "whale-harpoon") return "action:harpoon";
    if (option.action.kind === "perk-item") return perkItemIconId(option.action.itemId);
  }
  if (option.action.goodId) return tradeGoodIconId(option.action.goodId);
  if (option.action.itemId) return perkItemIconId(option.action.itemId);
  if (option.action.type === "node" || (
    (option.action.type === "leave-buy" || option.action.type === "leave-sell") && option.action.nodeId
  )) {
    const iconId = DIALOGUE_NODE_ICON_IDS[option.action.nodeId];
    if (!iconId) throw new Error(`Dialogue node has no icon: ${option.action.nodeId}`);
    return iconId;
  }
  const iconId = DIALOGUE_ACTION_ICON_IDS[option.action.type];
  if (!iconId) throw new Error(`Dialogue action has no icon: ${option.action.type}`);
  return iconId;
}

export function perkItemIconId(itemId) {
  const iconId = `item:${itemId}`;
  if (!GAME_ICON_INDEX.has(iconId)) throw new Error(`Perk item has no icon: ${itemId}`);
  return iconId;
}

function iconPack(pack) {
  return Object.freeze(pack);
}

function iconSource(packId, entry, crop = null, options = {}) {
  if (!GAME_ICON_PACKS[packId]) throw new Error(`Unknown game icon pack: ${packId}`);
  return Object.freeze({ packId, entry, crop, ...options });
}

function projectAsset(assetPath, crop = null, options = {}) {
  if (typeof assetPath !== "string" || !assetPath.startsWith("public/assets/")) {
    throw new Error(`Invalid project icon asset: ${assetPath}`);
  }
  return Object.freeze({ packId: null, assetPath, crop, ...options });
}

function generatedIcon(generatedId) {
  if (typeof generatedId !== "string" || generatedId === "") {
    throw new Error("Generated game icon requires an id");
  }
  return Object.freeze({ packId: null, generatedId });
}

function paperOutlined(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("Paper-outlined game icon requires a source");
  }
  return Object.freeze({ ...source, paperOutline: true });
}

function pirate(number) {
  return iconSource("pirate", `PNG/Transperent/Icon${number}.png`);
}

function lethe(cellX, cellY) {
  return iconSource("lethe", "Pixel_Items_16x16_free/items.png", { x: cellX * 16, y: cellY * 16, w: 16, h: 16 });
}

function glionox(number) {
  return iconSource("glionox", `item${number}.png`);
}

function alex(filename) {
  return iconSource("alex", `Free_pixel_food_16x16/Icons/${filename}`);
}

function keifoo(path) {
  return iconSource("keifoo", `99_ingredients/ingredients_png/${path}`);
}

function nikoichu(filename, color) {
  return iconSource("nikoichu", `Sprites/${filename}`, null, {
    lightMonotone: color
  });
}
