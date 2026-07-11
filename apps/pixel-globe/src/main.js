import {
  buildGeodesicGraph,
  clamp,
  createDirectionIndex,
  cross3,
  dot3,
  findNearestTileId,
  graphCenter,
  normalize3
} from "./geodesic.js";
import {
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS
} from "./manualRiverHexChains.js";
import {
  TILE_DAY_RAIN,
  TILE_DAY_SNOW_FALL,
  TILE_DAY_SNOW_GROUND,
  TILE_DAY_WET_SOIL,
  WEATHER_DAYS,
  WEATHER_MINUTES_PER_DAY,
  dateToSubsolarLatDeg,
  decodeDiscreteWeatherYearBakeFile,
  decodePixelRuntimeWeatherBakeFile,
  discreteWeatherFlagsForTile,
  fillIceMaskForDay,
  weatherClockParts,
  windAtLatLonDeg
} from "./weather.js";
import {
  DEFAULT_PLAYER_SHIP_SLUG,
  SHIP_STATS,
  SHIP_STATS_BY_SLUG,
  shipLabelForSlug,
  shipStatsForSlug
} from "./shipStats.js";
import {
  assignNpcShipCaptains,
  assignPortCityCharacters,
  characterExpression,
  loadCharacterPortraitManifest,
  playerCharacterPortraitSummary,
  recolorPortraitImage
} from "./characterPortraits.js";
import {
  generatePlayerStartingProfile,
  resolvePlayerCharacterIdentityKey
} from "./playerCharacter.js";
import { SeamlessMusicPlayer } from "./musicPlayer.js";
import {
  cargoUsed,
  createGameState,
  discoveredEntries,
  hasPrivateeringAuthorityAgainst,
  hasDiscovery,
  receiveSurrenderedLoot,
  recordAttackAgainstFaction,
  recordDiscovery,
  recordPiracyAgainstFaction,
  setCargoCapacity,
  updateCircumnavigationProgress,
  visitPort
} from "./gameState.js";
import {
  buildMountainLandmarks,
  loadNamedMountains
} from "./mountainLandmarks.js";
import {
  CIRCUMNAVIGATION_DISCOVERY,
  WORLD_DISCOVERY_SPRITE_KEYS,
  buildWorldDiscoveries,
  mountainDiscovery,
  restrictMountainsToNavigableView
} from "./discoveries.js";
import {
  createPortDialogueSession,
  createShipDialogueSession,
  portDialogueView,
  selectPortDialogueOption,
  selectShipDialogueOption,
  shipDialogueView
} from "./dialogueSystem.js";
import {
  NPC_ROLE_MERCHANT,
  NPC_ROLE_PIRATE,
  NPC_ROLE_WARSHIP,
  NPC_SHIP_SLUGS,
  createNpcSeaRouteSystem,
  damageNpcShip,
  npcRoleLabel,
  npcShipSnapshots,
  releaseNpcShipVisualNavigation,
  setNpcShipVisualNavigation,
  surrenderNpcShip,
  updateNpcPirateHideoutPlayerThreat,
  updateNpcSeaRouteSystem
} from "./npcSeaRoutes.js";
import {
  SAILING_WIND_CONTEXT_DESERT,
  SAILING_WIND_CONTEXT_GENERAL,
  SAILING_WIND_CONTEXT_WINTER,
  createSailingAudioState,
  sailingStallWarningStrength,
  updateSailingAudioState
} from "./sailingAudio.js";
import {
  RIVER_GATEWAY_SEARCH_RADIUS_PX,
  advanceRiverCenterline,
  blendRiverNavigationDirections,
  chooseRiverChannelDirection,
  findRiverGatewayDirection,
  steerAlongRiverCenterline
} from "./riverNavigation.js";
import {
  chooseNpcEscapeDirection,
  chooseNpcSailingDirection
} from "./npcVisualNavigation.js";
import { compareShipDrawCalls } from "./shipDrawOrder.js";
import { shipLightStrengthsForSunAltitude } from "./shipLighting.js";
import {
  STORM_ACTIVE_INTENSITY,
  STORM_DAMAGE_INTENSITY,
  createStormSystem,
  nearestStormShelterTile,
  nextStormShelterTile,
  stormDamageForHour,
  stormIntensityAtTile,
  stormWindStrength
} from "./stormSystem.js";
import {
  compareTerrainDrawCalls,
  terrainSpriteDrawLayer
} from "./terrainDrawOrder.js";
import { canvasDisplayLayout } from "./displayScaling.js";
import { flagWaveColumnOffsets } from "./flagAnimation.js";
import {
  COMBAT_MODE_ATTACK,
  COMBAT_MODE_FLEE,
  PLAYER_COMBAT_ID,
  createShipCombatState,
  engagementKey,
  forceShipEngagement,
  npcShouldOfferSurrender,
  playerCombatAllegiance,
  updateShipCombatState
} from "./shipCombat.js";
import {
  resolveShipCollision,
  separateTouchingShips,
  shipCollisionRadius
} from "./shipCollision.js";
import {
  DIPLOMACY_ALLY,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTION_CAPITALS_1522,
  FACTIONS,
  PIRATE_FACTION_ID,
  factionById,
  factionCapitalCityRecords1522,
  factionCapitalForCity,
  factionIdForCity1522,
  markFactionCapitalsOnPorts
} from "./factions.js";
import {
  createPoliticsView,
  politicsRowsPage
} from "./politics.js";
import {
  advanceWorldEconomy,
  createWorldEconomy
} from "./economy.js";
import {
  waterDepthIndexForSpriteKey,
  waterLatitudeBand,
  waterPaletteHexForSourceHex
} from "./waterLatitudePalette.js";
import { applyDayNightPaletteGrade } from "./dayNightPalette.js";
import {
  createShipInfoView,
  shipInfoCargoPage,
  shipLedgerDateLabel,
  shipLedgerPage,
  shipPapersPage
} from "./shipInfo.js";

const SCREEN_W = 455;
const SCREEN_H = 256;
const SUBDIVISIONS = 7;
const PIXELS_PER_RADIAN = 2450;
const TILE_RADIUS_PX = 10;
const TILE_ART_SIZE = 36;
const TILE_ART_HALF = TILE_ART_SIZE / 2;
const FACE_HALF_WIDTH = 7;
const BEACH_SPECKLE_COUNT = 5;
const BEACH_LIGHT_SPECKLE_COLOR = "rgba(255, 236, 151, 0.46)";
const BEACH_DARK_SPECKLE_COLOR = "rgba(218, 184, 92, 0.26)";
const BEACH_LAND_EDGE_JAG_COUNT = 4;
const BEACH_WAVE_PERIOD_MS = 3600;
const BEACH_WAVE_ADVANCE_RATIO = 0.44;
const BEACH_WAVE_RECEDE_RATIO = 0.38;
const BEACH_WAVE_MIN_REACH = 0.16;
const BEACH_WAVE_MAX_REACH = 0.78;
const BEACH_WAVE_WATER_ALPHA = 0.58;
const BEACH_WAVE_EDGE_RECESS = 0.2;
const FRONT_FACE_OVERLAP_PX = 4;
const FRONT_FACE_MIN_DY = 2;
const MOUNTAIN_FOOT_REACH = 0.36;
const MOUNTAIN_FOOT_TIP_HALF_WIDTH = 1;
const RIVER_ARM_LENGTH_PX = 15;
const RIVER_MOUTH_ARM_LENGTH_PX = 17;
const RIVER_CURVE_BEND_PX = 4;
const RIVER_BODY_RADIUS_PX = 2;
const RIVER_CONNECTOR_RADIUS_PX = 3;
const RIVER_MOUTH_RADIUS_PX = 7;
const RIVER_MOUTH_FLARE_START = 0.18;
const RIVER_JOIN_MIN_LENGTH_PX = 5;
const RIVER_SPRITE_CACHE_LIMIT = 4096;
const VIEW_MARGIN = 58;
const CHART_REBUILD_RADIUS_PX = 28;
const CHART_LOOKAHEAD_MARGIN = 96;
const CHART_MARGIN = VIEW_MARGIN + CHART_REBUILD_RADIUS_PX + TILE_ART_SIZE + CHART_LOOKAHEAD_MARGIN;
const MAX_CHART_TILES = 5200;
const START_LAT_DEG = 41.98;
const START_LON_DEG = 18.91;
const SHIP_SHEET_FRAME_SIZE = 36;
const SHIP_SHEET_COLS = 4;
const SHIP_HEADING_COUNT = 16;
const SHIP_LIGHT_AZIMUTH_BINS = 16;
const SHIP_LIGHT_ELEVATION_BINS = 2;
const SHIP_LIGHT_BIN_COUNT = SHIP_LIGHT_AZIMUTH_BINS * SHIP_LIGHT_ELEVATION_BINS;
const SHIP_LIGHT_HIGH_ALTITUDE = 0.5;
const SHIP_LIGHT_HIGHLIGHT_ALPHA = 0.3;
const SHIP_LIGHT_SHADE_ALPHA = 0.28;
const SHIP_LIGHT_SHADOW_ALPHA = 0.22;
const SHIP_SHADOW_FRAME_SIZE = 72;
const SHIP_SHADOW_HALF = SHIP_SHADOW_FRAME_SIZE / 2;
const SHIP_DRAG_PER_SECOND = 0.62;
const SHIP_NO_GO_DRAG_MULTIPLIER = 1.35;
const SHIP_MIN_POWERED_SPEED_RAD = 0.006;
const SHIP_MIN_SLIDE_SPEED_RAD = 0.0015;
const SHIP_COLLISION_SLIDE_SPEED_KEEP = 0.96;
const SHIP_COLLISION_MIN_TANGENT_RATIO = 0.05;
const SHIP_COLLISION_SLIDE_SEARCH_MIN_ALIGN = -0.08;
const SHIP_COLLISION_SLIDE_SEARCH_SIDE_KEEP = 0.9;
const SHIP_STOP_DAMPING = 0.15;
const SHIP_COLLISION_RADIUS_PX = 5;
const SHIP_RIVER_COLLISION_RADIUS_PX = 1.5;
const SHIP_RIVER_CHANNEL_TOLERANCE_PX = 0.75;
const SHIP_RIVER_HAUL_ACCEL_RAD = 0.0045;
const SHIP_RIVER_HAUL_MAX_SPEED_RAD = 0.0075;
const SHIP_COLLISION_SAMPLE_STEP_PX = 2;
const SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX = 48;
const SHIP_RIVER_HEADING_ALIGN_DOT = Math.cos(Math.PI / 3);
const SHIP_RIVER_TARGET_ALIGN_DOT = Math.cos(80 * Math.PI / 180);
const SAIL_CLOSE_HAULED_ANGLE_RANGE_RAD = Math.PI / 12;
const SAIL_CLOSE_HAULED_EFFICIENCY = 0.34;
const KELVIN_WAKE_HALF_ANGLE_RAD = Math.asin(1 / 3);
const SHIP_WAKE_MIN_SPEED_PX = 2.5;
const SHIP_WAKE_STERN_BUBBLE_SPEED_RATIO = 1.45;
const SHIP_WAKE_EMIT_DISTANCE_PX = 2.25;
const SHIP_WAKE_RESET_DISTANCE_PX = 26;
const SHIP_WAKE_TTL_SECONDS = 3.8;
const SHIP_WAKE_SIDE_SPEED_RATIO = Math.tan(KELVIN_WAKE_HALF_ANGLE_RAD);
const SHIP_WAKE_MAX_PARTICLES = 260;
const SHIP_WAKE_FOAM_KEEP_YOUNG = 0.78;
const SHIP_WAKE_FOAM_KEEP_OLD = 0.42;
const SHIP_WAKE_FOAM_EXTRA_CHANCE = 0.18;
const SHIP_COLLISION_SLIDE_SEARCH_ANGLES_RAD = [
  0, 10, -10, 20, -20, 35, -35, 50, -50, 70, -70, 90, -90
].map((degrees) => degrees * Math.PI / 180);
const SHIP_COLLISION_SLIDE_OUTWARD_BIASES = [0.18, 0.36, 0.58];
const NPC_VISUAL_AUTHORITY_MARGIN_PX = 96;
const NPC_VISUAL_RELEASE_MARGIN_PX = 132;
const NPC_VISUAL_ACTIVATION_SEARCH_PX = 48;
const NPC_VISUAL_RECOVERY_SEARCH_PX = 96;
const NPC_VISUAL_ACTIVATION_ANGLE_COUNT = 16;
const NPC_VISUAL_CATCHUP_SPEED_PX = 4;
const NPC_VISUAL_TARGET_TOLERANCE_PX = 1;
const NPC_VISUAL_MAX_STEP_PX = 3;
const NPC_VISUAL_ESCAPE_COMMIT_PX = 54;
const NPC_VISUAL_ESCAPE_REJOIN_AFTER_PX = 18;
const NPC_VISUAL_ESCAPE_REJOIN_CLEAR_PX = 36;
const NPC_VISUAL_TACK_LEG_PX = 42;
const NPC_STORM_RELEASE_INTENSITY = STORM_ACTIVE_INTENSITY * 0.62;
const NPC_STORM_MIN_ANCHOR_MINUTES = 6 * 60;
const NPC_STORM_SHELTER_SPEED_PX = 7;
const NPC_STORM_FAR_TARGET_PX = 120;
const NPC_RIVER_CONVEYOR_CENTERING_SPEED_PX = 9;
const NPC_VISUAL_ESCAPE_PROBE_DISTANCES_PX = [6, 12, 24, 36, 54];
const NPC_VISUAL_ESCAPE_ANGLES_RAD = [
  105, -105, 120, -120, 135, -135, 150, -150, 165, -165, 180
].map((degrees) => degrees * Math.PI / 180);
const NPC_VISUAL_UPDATE_INTERVAL_SECONDS = 1 / 30;
const NPC_COMBAT_RESPONSE_SPEED_PX = 8;
const NPC_COMBAT_NAV_TARGET_PX = 110;
const NPC_COMBAT_ORBIT_RANGE_PX = 38;
const NPC_COMBAT_FIRE_RANGE_PX = 64;
const NPC_COMBAT_BROADSIDE_DOT = 0.78;
const NPC_COMBAT_COOLDOWN_SECONDS = 3.8;
const NPC_COMBAT_PROJECTILE_HIT_RADIUS_PX = 7;
const NPC_COMBAT_MAX_PROJECTILES = 180;
const SHIP_COLLISION_DAMAGE_COOLDOWN_SECONDS = 0.72;
const SHIP_COMBAT_ENTRY_COLLISION_GRACE_SECONDS = 1.2;
const SHIP_COMBAT_ENTRY_SEPARATION_PX = 3;
const NPC_COLLISION_VELOCITY_DAMPING = 2.6;
const NPC_COLLISION_VELOCITY_MIN_PX = 0.12;
const NPC_SHIP_FLAG_W = 10;
const NPC_SHIP_FLAG_H = 6;
const NPC_VISUAL_MAX_ACCUMULATED_SECONDS = 0.15;
const NPC_HAIL_RADIUS_PX = 28;
const NPC_HAIL_CLICK_PAD_PX = 4;
const WAKE_WATER_BUCKET_PX = 24;
const WAKE_WATER_SEARCH_RADIUS_PX = 26;
const WAKE_RIVER_RADIUS_PX = RIVER_MOUTH_RADIUS_PX + 2;
const CANNON_BROADSIDE_COOLDOWN_SECONDS = 1.15;
const CANNON_MUZZLE_SIDE_OFFSET_PX = 8;
const CANNON_MUZZLE_FORE_AFT_SPAN_PX = 13;
const CANNON_RANGE_PX = 74;
const CANNON_RANGE_JITTER_PX = 15;
const CANNON_SPEED_PX = 88;
const CANNON_AIM_SPREAD_RAD = 0.18;
const CANNON_ARC_HEIGHT_PX = 13;
const CANNON_TRAIL_MAX_PX = 3;
const CANNON_SPLASH_TTL_SECONDS = 0.46;
const CANNON_SPLASH_DROP_COUNT = 6;
const CANNON_MAX_BALLS = 160;
const CANNON_MAX_SPLASHES = 128;
const WIND_INDICATOR_RADIUS_PX = 20;
const WIND_INDICATOR_DIRECTION_COUNT = 16;
const WIND_INDICATOR_DIRECTION_STABLE_FRAMES = 3;
const WIND_INDICATOR_TURN_RATE_RAD = Math.PI * 1.35;
const WIND_INDICATOR_STRENGTH_LERP_PER_SECOND = 2.4;
const WIND_INDICATOR_WARNING_LERP_PER_SECOND = 8;
const WIND_INDICATOR_STALL_PULSE_MS = 900;
const WATER_FRAME_MS = 2000;
const WATER_REDRAW_MS = 250;
const WATER_DEPTH_GRADATION_COUNT = 4;
const WEATHER_REDRAW_MS = 250;
const PRECIP_PARTICLE_REDRAW_MS = 80;
const RAIN_PARTICLE_LIMIT = 340;
const SNOW_PARTICLE_LIMIT = 240;
const RAIN_PARTICLES_PER_TILE = 3;
const SNOW_PARTICLES_PER_TILE = 2;
const PRECIP_PARTICLE_VIEW_MARGIN = 30;
const WEATHER_DEFAULT_TIME_SCALE = 3600;
const WEATHER_WIND_SEED = 90210;
const DAY_NIGHT_DAY_ALT = 0.34;
const DAY_NIGHT_NIGHT_ALT = -0.34;
const DAY_NIGHT_SUNSET_START_ALT = -0.3;
const DAY_NIGHT_SUNSET_END_ALT = 0.3;
const CLOUD_LIFESPAN_MINUTES = 14 * 60;
const CLOUD_DRIFT_PX = 30;
const CLOUD_FADE_RATIO = 0.22;
const CLOUD_ANCHOR_JITTER_PX = 3;
const MAX_LOCAL_WEATHER_CLOUDS = 36;
const TERRAIN_ASSET_VERSION = "grassy-hills-1";
const WORLD_DISCOVERY_ASSET_VERSION = "world-wonders-1";
const VEHICLE_ASSET_VERSION = "ship-edge-shading-1";
const SHIP_WAKE_ANCHORS_URL = `/assets/vehicles/unity-ships/wake-anchors.json?v=${VEHICLE_ASSET_VERSION}`;
const CITY_ASSET_VERSION = "city-types-1";
const FACTION_FLAG_ASSET_VERSION = "faction-flags-1522-1";
const FACTION_FLAG_SOURCE_W = 32;
const FACTION_FLAG_SOURCE_H = 20;
const CITY_FLAG_W = 14;
const CITY_FLAG_H = 9;
const CITY_FLAG_FRAME_MS = 125;
const CITY_FLAG_WAVE_SPEED_RAD_PER_MS = 0.002;
const DIALOGUE_FLAG_W = FACTION_FLAG_SOURCE_W;
const DIALOGUE_FLAG_H = FACTION_FLAG_SOURCE_H;
const DIALOGUE_FACTION_BLOCK_W = 128;
const CITY_DATA_YEAR = 1522;
const CITY_MAX_COUNT = 420;
const CITY_PORT_ACCESS_RING_DISTANCE = 2;
const CITY_DATA_URL = "/shared/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv";
const CITY_DISPLAY_NAME_OVERRIDES = new Map([
  ["mexico city|mexico", [{ throughYear: 1522, displayCity: "Tenochtitlan" }]],
  ["texcoco|mexico", [{ throughYear: 1522, displayCity: "Tezcoco" }]],
  ["merida|mexico", [{ throughYear: 1541, displayCity: "Tiho" }]],
  ["zempoala|mexico", [{ throughYear: 1522, displayCity: "Cempoala" }]]
]);
const CITY_TYPE_KEYS = Object.freeze([
  "northern-european",
  "mediterranean",
  "islamic-desert",
  "east-asian",
  "south-asian",
  "southeast-asian",
  "mesoamerican",
  "andean",
  "sub-saharan"
]);
const CITY_TYPE_KEY_SET = new Set(CITY_TYPE_KEYS);
const CITY_TYPE_EAST_ASIAN_COUNTRIES = new Set([
  "China",
  "Dem. People's Republic of Korea",
  "Japan",
  "Republic of Korea"
]);
const CITY_TYPE_SOUTH_ASIAN_COUNTRIES = new Set([
  "India",
  "Nepal",
  "Pakistan",
  "Sri Lanka"
]);
const CITY_TYPE_SOUTHEAST_ASIAN_COUNTRIES = new Set([
  "Brunei",
  "Cambodia",
  "Indonesia",
  "Lao People's Democratic Republic",
  "Myanmar",
  "Thailand",
  "Vietnam"
]);
const CITY_TYPE_ANDEAN_COUNTRIES = new Set([
  "Bolivia",
  "Columbia",
  "Ecuador",
  "Peru"
]);
const CITY_TYPE_MESOAMERICAN_COUNTRIES = new Set([
  "Guatemala",
  "Mexico",
  "United States of America"
]);
const CITY_TYPE_MEDITERRANEAN_COUNTRIES = new Set([
  "Albania",
  "Bulgaria",
  "Cyprus",
  "Greece",
  "Italy",
  "Portugal",
  "Romania",
  "Serbia",
  "Spain"
]);
const CITY_TYPE_NORTHERN_EUROPEAN_COUNTRIES = new Set([
  "Austria",
  "Belgium",
  "Denmark",
  "France",
  "Germany",
  "Hungary",
  "Ireland",
  "Lithuania",
  "Netherlands",
  "Norway",
  "Poland",
  "Russian Federation",
  "Sweden",
  "Ukraine",
  "United Kingdom"
]);
const CITY_TYPE_ISLAMIC_DESERT_COUNTRIES = new Set([
  "Afghanistan",
  "Algeria",
  "Armenia",
  "Egypt",
  "Georgia",
  "Iran",
  "Iraq",
  "Israel",
  "Kyrgyzstan",
  "Lebanon",
  "Libya",
  "Mauritania",
  "Morocco",
  "Saudi Arabia",
  "Sudan",
  "Sumer",
  "Syria",
  "Syria/Turkey",
  "Tunisia",
  "Turkey",
  "Turkey/Syria",
  "Turkmenistan",
  "Uzbekistan",
  "Yemen"
]);
const CITY_TYPE_SUB_SAHARAN_COUNTRIES = new Set([
  "Angola",
  "Ethiopia",
  "Guinea",
  "Mali",
  "Nigeria",
  "Senegal",
  "Tanzania",
  "Zimbabwe"
]);
const CITY_SPRITE_W = TILE_ART_SIZE;
const CITY_SPRITE_H = TILE_ART_SIZE;
const CITY_LABEL_H = 8;
const CITY_LABEL_PAD_X = 2;
const CITY_LABEL_PAD_Y = 1;
const CITY_LABEL_GAP_PX = 2;
const PORT_INTERACTION_RADIUS_PX = 34;
const PORT_CITY_CLICK_PAD_PX = 3;
const INTERACTION_BUTTON_W = 110;
const INTERACTION_BUTTON_H = 13;
const INTERACTION_BUTTON_X = Math.floor((SCREEN_W - INTERACTION_BUTTON_W) / 2);
const INTERACTION_BUTTON_Y = SCREEN_H - 18;
const ANCHOR_BUTTON_W = 76;
const ANCHOR_BUTTON_H = INTERACTION_BUTTON_H;
const ANCHOR_BUTTON_X = INTERACTION_BUTTON_X - ANCHOR_BUTTON_W - 4;
const ANCHOR_BUTTON_Y = INTERACTION_BUTTON_Y;
const ANCHOR_SHORE_MAX_PX = 36;
const MOUNTAIN_DISCOVERY_RADIUS_PX = 120;
const MOUNTAIN_DISCOVERY_NOTICE_MS = 4600;
const MOUNTAIN_DISCOVERY_PANEL_W = 230;
const MOUNTAIN_DISCOVERY_PANEL_H = 24;
const MOUNTAIN_DISCOVERY_PANEL_X = Math.floor((SCREEN_W - MOUNTAIN_DISCOVERY_PANEL_W) / 2);
const MOUNTAIN_DISCOVERY_PANEL_Y = 5;
const DISCOVERIES_BUTTON_SIZE = 13;
const DISCOVERIES_PANEL_W = 300;
const DISCOVERIES_PANEL_H = 214;
const DISCOVERIES_PAGE_SIZE = 9;
const SHIP_INFO_BUTTON_SIZE = 13;
const POLITICS_BUTTON_SIZE = 13;
const SHIP_INFO_PANEL_X = 10;
const SHIP_INFO_PANEL_Y = 8;
const SHIP_INFO_PANEL_W = SCREEN_W - SHIP_INFO_PANEL_X * 2;
const SHIP_INFO_PANEL_H = SCREEN_H - SHIP_INFO_PANEL_Y * 2;
const POLITICS_PANEL_X = 8;
const POLITICS_PANEL_Y = 8;
const POLITICS_PANEL_W = SCREEN_W - POLITICS_PANEL_X * 2;
const POLITICS_PANEL_H = SCREEN_H - POLITICS_PANEL_Y * 2;
const POLITICS_ROWS_PER_PAGE = 20;
const POLITICS_MATRIX_CELL_W = 7;
const POLITICS_MATRIX_ROW_H = 8;
const SHIP_INFO_SIDE_VIEW_W = 192;
const SHIP_INFO_SIDE_VIEW_H = 104;
const DIALOGUE_PANEL_X = 6;
const DIALOGUE_PANEL_Y = 78;
const DIALOGUE_PANEL_W = SCREEN_W - 12;
const DIALOGUE_PANEL_H = SCREEN_H - DIALOGUE_PANEL_Y - 7;
const DIALOGUE_PORTRAIT_SIZE = 64;
const DIALOGUE_PORTRAIT_X = DIALOGUE_PANEL_X + 16;
const DIALOGUE_PORTRAIT_Y = DIALOGUE_PANEL_Y - DIALOGUE_PORTRAIT_SIZE + 8;
const DIALOGUE_OPTION_H = 12;
const PLAYER_INTRO_PANEL_W = 326;
const PLAYER_INTRO_PANEL_H = 178;
const PLAYER_INTRO_PANEL_X = Math.floor((SCREEN_W - PLAYER_INTRO_PANEL_W) / 2);
const PLAYER_INTRO_PANEL_Y = Math.floor((SCREEN_H - PLAYER_INTRO_PANEL_H) / 2);
const PLAYER_INTRO_BUTTON_W = 116;
const PLAYER_INTRO_BUTTON_H = 16;
const POINTER_STEERING_DEADZONE_PX = 6;
const PIXEL_FONT_BODY = "\"Tiny5\", \"zpix\", monospace";
const PIXEL_FONT_UI = "\"Silkscreen\", \"Tiny5\", \"zpix\", monospace";
const PIXEL_FONT_MONO = "\"Dogica\", \"zpix\", monospace";
const PIXEL_FONT_BODY_8 = `8px ${PIXEL_FONT_BODY}`;
const PIXEL_FONT_UI_8 = `8px ${PIXEL_FONT_UI}`;
const PIXEL_FONT_MONO_8 = `8px ${PIXEL_FONT_MONO}`;
const LOCAL_LAYOUT_CULL_MARGIN = 520;
const MINIMAP_W = 80;
const MINIMAP_H = 26;
const MINIMAP_CENTER_X = Math.floor(MINIMAP_W / 2);
const MINIMAP_MAX_LAT_DEG = 72;
const MINIMAP_MAX_MERCATOR = mercatorYForLatDeg(MINIMAP_MAX_LAT_DEG);
const MINIMAP_X = SCREEN_W - MINIMAP_W - 5;
const MINIMAP_Y = SCREEN_H - MINIMAP_H - 5;
const MINIMAP_TILE_OUT_OF_RANGE = 0xffff;
const MINIMAP_UNKNOWN_COLOR = [74, 66, 55];
const MINIMAP_WATER_COLOR = [184, 151, 95];
const MINIMAP_LAND_COLOR = [92, 59, 31];
const MINIMAP_PARTIAL_LAND_FLOOR = 0.18;
const MINIMAP_PARTIAL_LAND_GAMMA = 0.62;
const MINIMAP_PARTIAL_DITHER = 0.08;
const OPTIONS_BUTTON_SIZE = 13;
const OPTIONS_BUTTON_X = SCREEN_W - OPTIONS_BUTTON_SIZE - 5;
const OPTIONS_BUTTON_Y = 5;
const DISCOVERIES_BUTTON_X = OPTIONS_BUTTON_X - DISCOVERIES_BUTTON_SIZE - 3;
const DISCOVERIES_BUTTON_Y = OPTIONS_BUTTON_Y;
const SHIP_INFO_BUTTON_X = DISCOVERIES_BUTTON_X - SHIP_INFO_BUTTON_SIZE - 3;
const SHIP_INFO_BUTTON_Y = OPTIONS_BUTTON_Y;
const POLITICS_BUTTON_X = SHIP_INFO_BUTTON_X - POLITICS_BUTTON_SIZE - 3;
const POLITICS_BUTTON_Y = OPTIONS_BUTTON_Y;
const OPTIONS_PANEL_W = 196;
const OPTIONS_PANEL_H = 166;
const OPTIONS_ROW_H = 22;
const OPTIONS_ROW_COUNT = 5;
const OPTIONS_ROW_FULLSCREEN = 0;
const OPTIONS_ROW_MUSIC = 1;
const OPTIONS_ROW_SFX = 2;
const OPTIONS_ROW_MUTE = 3;
const OPTIONS_ROW_SHIP = 4;
const UI_ASSET_VERSION = "discoveries-menu-1";
const SHIP_INFO_ASSET_VERSION = "side-view-resurrect-1";
const MUSIC_ASSET_VERSION = "storm-theme-1";
const SFX_ASSET_VERSION = "normalized-ogg-1";
const ANIMAL_ASSET_VERSION = "seagulls-1";
const MUSIC_DEFAULT_VOLUME = 0.5;
const SFX_DEFAULT_VOLUME = 0.5;
const MUSIC_CROSSFADE_SECONDS = 1.6;
const MUSIC_COMBAT_CROSSFADE_SECONDS = 0.7;
const MUSIC_RETURN_CROSSFADE_SECONDS = 1.25;
const MUSIC_DECODED_TRACK_CACHE_SIZE = 2;
const MUSIC_VOLUME_STORAGE_KEY = "pixel_globe_music_volume";
const SFX_VOLUME_STORAGE_KEY = "pixel_globe_sfx_volume";
const AUDIO_MUTED_STORAGE_KEY = "pixel_globe_audio_muted";
const MUSIC_TRACK_SPECS = Object.freeze({
  ship: {
    intro: "/assets/music/ship-theme-intro.ogg",
    loop: "/assets/music/ship-theme-loop.ogg"
  },
  cityNorthernEuropean: {
    intro: "/assets/music/city-northern-european-intro.ogg",
    loop: "/assets/music/city-northern-european-loop.ogg"
  },
  cityMediterranean: {
    intro: "/assets/music/city-mediterranean-intro.ogg",
    loop: "/assets/music/city-mediterranean-loop.ogg"
  },
  cityDesert: {
    intro: "/assets/music/city-desert-intro.ogg",
    loop: "/assets/music/city-desert-loop.ogg"
  },
  cityEastAsian: {
    intro: "/assets/music/city-east-asian-intro.ogg",
    loop: "/assets/music/city-east-asian-loop.ogg"
  },
  cityTropical: {
    loop: "/assets/music/city-tropical-loop.ogg"
  },
  cityAndean: {
    intro: "/assets/music/city-andean-intro.ogg",
    loop: "/assets/music/city-andean-loop.ogg"
  },
  combat: {
    intro: "/assets/music/combat-theme-intro.ogg",
    loop: "/assets/music/combat-theme-loop.ogg"
  },
  combatSmall: {
    intro: "/assets/music/combat-small-intro.ogg",
    loop: "/assets/music/combat-small-loop.ogg"
  },
  combatBig: {
    intro: "/assets/music/combat-big-intro.ogg",
    loop: "/assets/music/combat-big-loop.ogg"
  },
  gameOverSad: {
    loop: "/assets/music/game-over-sad-loop.ogg"
  },
  victory: {
    intro: "/assets/music/victory-intro.ogg",
    loop: "/assets/music/victory-loop.ogg"
  },
  storm: {
    intro: "/assets/music/storm-theme-intro.ogg",
    loop: "/assets/music/storm-theme-loop.ogg"
  }
});
const CITY_TYPE_MUSIC_TRACK_KEYS = Object.freeze({
  "northern-european": "cityNorthernEuropean",
  mediterranean: "cityMediterranean",
  "islamic-desert": "cityDesert",
  "east-asian": "cityEastAsian",
  "south-asian": "cityDesert",
  "southeast-asian": "cityTropical",
  mesoamerican: "cityTropical",
  andean: "cityAndean",
  "sub-saharan": "cityTropical"
});
const COMBAT_MUSIC_HOLD_MS = 18000;
const COMBAT_BIG_BROADSIDE_MIN_CANNONS = 10;
const COMBAT_NOTICE_MS = 4200;
const SFX_CANNON_URL = "/assets/sfx/universfield-cannon-shot-352459.ogg";
const SFX_HARBOUR_URL = "/assets/sfx/freesound_community-harboursoundsanno1811-24015.ogg";
const SFX_IMPACT_URL = "/assets/sfx/dragon-studio-boulder-impact-487673.ogg";
const SFX_SEAGULLS_URL = "/assets/sfx/dragon-studio-seagull-calls-339723.ogg";
const SFX_SHORE_GULLS_URL = "/assets/sfx/freesound_community-sea-and-seagull-wave-5932.ogg";
const SFX_HARSH_WIND_URL = "/assets/sfx/dragon-studio-harsh-wind-515272.ogg";
const SFX_WINTER_WIND_URL = "/assets/sfx/dragon-studio-winter-wind-402331.ogg";
const SFX_DESERT_WIND_URL = "/assets/sfx/tanweraman-desert-wind-1-350398.ogg";
const SFX_STORM_URL = "/assets/sfx/u_7hpxkdroz2-storm-461601.mp3";
const SFX_SAIL_FLAP_URL = "/assets/sfx/freesound_community-flag-6367.ogg";
const SFX_UNDERWAY_URL = "/assets/sfx/freesound_community-sailboat-underway-48728.ogg";
const SFX_SAIL_DEPLOY_URL = "/assets/sfx/freesound_community-saildeploy-99393.ogg";
const SFX_DISCOVERY_SUCCESS_URL = "/assets/sfx/freesound_community-short-success-sound-glockenspiel-treasure-video-game-6346.mp3";
const SFX_COIN_CLINK_URL = "/assets/sfx/floraphonic-coin-and-money-bag-3-185264.mp3";
const SFX_CANNON_POOL_SIZE = 8;
const SFX_IMPACT_POOL_SIZE = 6;
const SFX_SAIL_DEPLOY_POOL_SIZE = 2;
const SFX_DISCOVERY_SUCCESS_POOL_SIZE = 3;
const SFX_COIN_CLINK_POOL_SIZE = 4;
const SFX_CANNON_VOLUME = 0.76;
const SFX_IMPACT_VOLUME = 0.64;
const SFX_SAIL_DEPLOY_VOLUME = 0.22;
const SFX_DISCOVERY_SUCCESS_VOLUME = 0.72;
const SFX_COIN_CLINK_VOLUME = 0.58;
const SFX_HARBOUR_MAX_VOLUME = 0.08;
const SFX_SEAGULLS_MAX_VOLUME = 0.1;
const SFX_SHORE_GULLS_MAX_VOLUME = 0.16;
const SFX_HARSH_WIND_MAX_VOLUME = 0.12;
const SFX_WINTER_WIND_MAX_VOLUME = 0.11;
const SFX_DESERT_WIND_MAX_VOLUME = 0.1;
const SFX_STORM_MAX_VOLUME = 0.42;
const SFX_SAIL_FLAP_MAX_VOLUME = 0.52;
const SFX_UNDERWAY_MAX_VOLUME = 0.065;
const SFX_HARBOUR_NEAR_PX = 42;
const SFX_HARBOUR_FAR_PX = 170;
const SFX_AMBIENT_FADE_PER_SECOND = 1.35;
const SFX_WIND_FADE_PER_SECOND = 0.035;
const SFX_STORM_FADE_PER_SECOND = 0.35;
const SFX_SAIL_FLAP_FADE_PER_SECOND = 2.4;
const SFX_UNDERWAY_FADE_PER_SECOND = 0.018;
const SFX_WIND_TERRAIN_RADIUS_PX = 150;
const STORM_MUSIC_ENTER_INTENSITY = STORM_ACTIVE_INTENSITY;
const STORM_MUSIC_EXIT_INTENSITY = STORM_ACTIVE_INTENSITY * 0.72;
const STORM_DAMAGE_NOTICE_MS = 3600;
const SEAGULL_FLIGHT_URL = "/assets/animals/seagull-Sheet.png";
const SEAGULL_STANDING_URL = "/assets/animals/seagull_standing.png";
const SEAGULL_FRAME_SIZE = 9;
const SEAGULL_FLIGHT_FRAMES = 6;
const SEAGULL_MAX_FLYING = 14;
const SEAGULL_LANDED_FULL_PRESENCE = 26;
const SEAGULL_SPAWN_CHECK_MS = 900;
const SEAGULL_SPAWN_MARGIN_PX = 22;
const SEAGULL_DESPAWN_MARGIN_PX = 38;
const SEAGULL_OFFSCREEN_PADDING_PX = 2;
const SEAGULL_MIN_SPEED_PX = 6;
const SEAGULL_SPEED_SPREAD_PX = 8;
const SEAGULL_GLIDE_MIN_MS = 1800;
const SEAGULL_GLIDE_SPREAD_MS = 2600;
const SEAGULL_FLAP_MIN_MS = 330;
const SEAGULL_FLAP_SPREAD_MS = 260;
const WORLD_NORTH = [0, 1, 0];
const TERRAIN_VARIANT = terrainVariantFromLocation();
const START_POSITION_OVERRIDE = startPositionOverrideFromLocation();
const START_WEATHER = startWeatherFromLocation();
const START_SHIP_SLUG_OVERRIDE = shipSlugOverrideFromLocation();
const START_SHIP_SLUG = START_SHIP_SLUG_OVERRIDE || DEFAULT_PLAYER_SHIP_SLUG;
const SHIP_MENU_SLUGS = SHIP_STATS.map((entry) => entry.slug);
const DEBUG_STATUS_ENABLED = debugStatusFromLocation();

const terrainAssets = [
  "water_deep_01_01", "water_deep_01_02", "water_shallow_01", "water_shallow_02",
  "water_depth_01_01", "water_depth_01_02", "water_depth_02_01", "water_depth_02_02",
  "water_depth_03_01", "water_depth_03_02", "water_depth_04_01", "water_depth_04_02",
  "sand_01", "sand_02", "sand_03", "sand_04", "sand_05",
  "grass_01", "grass_02", "grass_03", "grass_04", "grass_flowers",
  "forest_broadleaf_01", "forest_broadleaf_02", "forest_broadleaf_03",
  "pine_forest_01", "pine_forest_snow_01",
  "jungle_dense_01", "jungle_dense_02", "jungle_dense_03",
  "jungle_palm_01", "jungle_palm_02", "jungle_palm_03",
  "earth_rocky", "earth_stone", "earth_cracked",
  "mud_01", "mud_02", "mud_03", "mud_04",
  "mountain_stone_01", "mountain_stone_02", "mountain_stone_03",
  "mountain_snowy_01", "mountain_snowy_02",
  "snow_01", "ice_01",
  ...(TERRAIN_VARIANT === "resurrect-64" ? ["grassy_hill"] : [])
];

const SNOWY_TERRAIN_REPLACEMENTS = new Map([
  ["grass_01", "snow_01"],
  ["grass_02", "snow_01"],
  ["grass_03", "snow_01"],
  ["grass_04", "snow_01"],
  ["grass_flowers", "snow_01"],
  ["pine_forest_01", "pine_forest_snow_01"],
  ["pine_forest_snow_01", "pine_forest_snow_01"],
  ["mountain_stone_01", "mountain_snowy_01"],
  ["mountain_stone_02", "mountain_snowy_02"],
  ["mountain_stone_03", "mountain_snowy_01"],
  ["mountain_snowy_01", "mountain_snowy_01"],
  ["mountain_snowy_02", "mountain_snowy_02"],
  ["snow_01", "snow_01"],
  ["ice_01", "ice_01"]
]);
const SNOW_GENERATED_COLORS = [
  { r: 248, g: 255, b: 247 },
  { r: 229, g: 239, b: 233 },
  { r: 209, g: 224, b: 219 }
];
const SNOW_GENERATED_SALT = 0x534e4f57;

const canvas = document.getElementById("view");
const shell = document.querySelector(".shell");
if (!(canvas instanceof HTMLCanvasElement) || !(shell instanceof HTMLElement)) {
  throw new Error("Pixel Globe requires its shell and 455x256 canvas");
}
const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
if (!ctx) throw new Error("Pixel Globe could not create its 2D canvas context");
ctx.imageSmoothingEnabled = false;
const shipOutlineCanvas = document.createElement("canvas");
shipOutlineCanvas.width = SHIP_SHEET_FRAME_SIZE;
shipOutlineCanvas.height = SHIP_SHEET_FRAME_SIZE;
const shipOutlineCtx = shipOutlineCanvas.getContext("2d");
if (!shipOutlineCtx) throw new Error("Pixel Globe could not create its ship outline context");
shipOutlineCtx.imageSmoothingEnabled = false;
const reducedMotionPreferred = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

const keys = new Set();
const pointerSteering = {
  active: false,
  pointerId: null,
  point: null
};
let graph;
let directionIndex;
let earthRows;
let earthById;
let mountainLandmarks;
let worldDiscoveries = [];
let discoveryCatalog = [];
let discoveryNotice = null;
const discoveryNoticeQueue = [];
let images;
let shipImage;
let shipWakeAnchors;
let shipWakeAnchorsBySlug;
let shipLighting;
const shipInfoImages = new Map();
const shipInfoImagePromises = new Map();
let settingsMenuIcon;
let discoveriesMenuIcon;
let worldDiscoveryImages;
let cityImages;
let factionFlagImages;
let animalImages;
let cityCatalog;
let cityByTileId;
let npcShipImages;
let npcSeaRoutes;
let worldEconomy;
let npcShipCaptains;
const npcVisualShips = new Map();
const shipCombatState = createShipCombatState();
const shipCollisionCooldowns = new Map();
const shipCombatEntryCollisionGrace = new Map();
let npcCombatProjectiles = [];
let npcCombatSplashes = [];
let npcVisualUpdateAccumulator = 0;
let characterPortraitManifest;
let portCityCharacters;
let portCitiesByTileId;
let portCities = [];
let factionCapitalPorts;
const terrainAlphaMasks = new WeakMap();
let spriteColors;
let waterLatitudeImages;
let waterLatitudeSpriteColors;
let waterLatitudePixelColors;
let snowyTerrainImages;
let snowySpriteColors;
let riverColors;
let riverMasks;
let riverToWaterMasks;
let oceanReachableNavigationMask;
let stormSystem;
let riverSpriteCache = new Map();
let waterDepthBands;
let weatherBake;
let runtimeWeather;
let seaIceMask;
let freshwaterIceMask;
let snowGroundMask;
let cloudSprites;
let weatherClockMinutes = START_WEATHER.clockMinutes;
let weatherTimeScale = START_WEATHER.timeScale;
let pausedWeatherTimeScale = START_WEATHER.timeScale || WEATHER_DEFAULT_TIME_SCALE;
let weatherParts = weatherClockParts(weatherClockMinutes);
let weatherMaskDayIndex = -1;
let weatherDrawTick = -1;
let ship;
let camera;
let chart;
let localLayout;
let minimap;
let themeMusic = null;
let soundEffects = null;
const sailingAudioState = createSailingAudioState();
let backgroundMusicTrackKey = "ship";
let combatMusicUntilMs = 0;
let gameAudioActivationAllowed = false;
let gameState = null;
let dialogueState = null;
let dialogueLayout = createDialogueLayoutState();
let playerIntroModal = null;
let interactionButtonRect = null;
let interactionButtonTarget = null;
let anchorButtonRect = null;
let anchored = false;
let stormMusicActive = false;
let stormDamageNotice = null;
let combatNotice = null;
let gameOverReason = null;
const portraitCanvasCache = new Map();
const portraitPromiseCache = new Map();
let centerTileId = 0;
let windIndicatorState = null;
let shipSelectionRequestId = 0;
let dirty = true;
let lastFrameMs = performance.now();
let lastStatusMs = 0;
let lastOverlayMs = 0;
let cityFlagAnimationTick = -1;
let waterAnimationClockMs = 0;
let waterAnimationDrawTick = -1;
let precipParticleDrawTick = -1;
let precipParticles = [];
let precipParticleSerial = 1;
let visiblePrecipitationLastRender = false;
let seagulls = [];
let seagullNextSpawnMs = 0;
let seagullSerial = 1;
const optionsMenu = createOptionsMenuState();
const discoveriesMenu = createDiscoveriesMenuState();
const shipInfoMenu = createShipInfoMenuState();
const politicsMenu = createPoliticsMenuState();

fitCanvasToDisplay();
window.addEventListener("resize", fitCanvasToDisplay);
window.visualViewport?.addEventListener("resize", fitCanvasToDisplay);
document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("visibilitychange", handleFullscreenVisibilityChange);
screen.orientation?.addEventListener?.("change", fitCanvasToDisplay);
window.addEventListener("pagehide", unlockOrientationIfPossible);

window.addEventListener("keydown", (event) => {
  ensureGameAudioStarted(true);
  if (playerIntroModal) {
    handlePlayerIntroKeyDown(event);
    return;
  }
  if (shipInfoMenu.isOpen) {
    handleShipInfoKeyDown(event);
    return;
  }
  if (politicsMenu.isOpen) {
    handlePoliticsKeyDown(event);
    return;
  }
  if (discoveriesMenu.isOpen) {
    handleDiscoveriesKeyDown(event);
    return;
  }
  if (optionsMenu.isOpen) {
    handleOptionsKeyDown(event);
    return;
  }
  if (dialogueState) {
    handleDialogueKeyDown(event);
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    openOptionsMenu();
    return;
  }
  if (event.key === "i" || event.key === "I") {
    event.preventDefault();
    openShipInfoMenu();
    return;
  }
  if (event.key === "p" || event.key === "P") {
    event.preventDefault();
    openPoliticsMenu();
    return;
  }
  if (isWeatherControlKey(event.key)) {
    event.preventDefault();
    handleWeatherControlKey(event.key);
    return;
  }
  if (isCannonKey(event.key)) {
    event.preventDefault();
    if (!event.repeat) fireBroadside(cannonSideForKey(event.key));
    return;
  }
  if (isInteractionKey(event.key)) {
    if (openActiveInteractionDialogue()) event.preventDefault();
    return;
  }
  if (isControlKey(event.key)) {
    event.preventDefault();
    keys.add(event.key);
  }
});

window.addEventListener("keyup", (event) => {
  if (isControlKey(event.key)) {
    event.preventDefault();
    keys.delete(event.key);
  }
});

canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", handlePointerUp);
window.addEventListener("pointercancel", handlePointerUp);

main().catch((err) => {
  console.error(err);
  drawFatalError(err);
});

async function main() {
  await loadPixelFonts();
  drawLoading();
  const shipSpriteKey = vehicleSpriteKeyForShipSlug(START_SHIP_SLUG);
  const [
    loadedImages,
    loadedShipImage,
    loadedShipWakeAnchors,
    loadedShipLighting,
    loadedNpcShipImages,
    loadedSettingsMenuIcon,
    loadedDiscoveriesMenuIcon,
    loadedWorldDiscoveryImages,
    loadedCityImages,
    loadedFactionFlagImages,
    loadedAnimalImages,
    loadedCityCatalog,
    loadedCharacterPortraitManifest,
    loadedNamedMountains,
    earth,
    discreteWeatherBuffer,
    runtimeWeatherBuffer
  ] = await Promise.all([
    loadTerrainImages(),
    START_SHIP_SLUG_OVERRIDE
      ? loadVehicleImage(`${shipSpriteKey}-16-headings`)
      : Promise.resolve(null),
    loadShipWakeAnchors(),
    START_SHIP_SLUG_OVERRIDE
      ? loadShipLightingBake(shipSpriteKey)
      : Promise.resolve(null),
    loadNpcShipImages(),
    loadUiImage("settings_menu_icon"),
    loadUiImage("discoveries_menu_icon"),
    loadWorldDiscoveryImages(),
    loadCityImages(),
    loadFactionFlagImages(),
    loadAnimalImages(),
    loadCityCatalog(CITY_DATA_YEAR),
    loadCharacterPortraitManifest(),
    loadNamedMountains(),
    fetchEarthCache(),
    fetchBinary("/shared/discrete-weather-bake-7.bin", "discrete weather bake"),
    fetchBinary("/shared/globe-runtime-bake-7.bin", "globe runtime bake")
  ]);
  images = loadedImages;
  shipImage = loadedShipImage;
  shipWakeAnchorsBySlug = loadedShipWakeAnchors;
  shipWakeAnchors = requiredShipWakeAnchors(START_SHIP_SLUG);
  shipLighting = loadedShipLighting;
  npcShipImages = loadedNpcShipImages;
  settingsMenuIcon = loadedSettingsMenuIcon;
  discoveriesMenuIcon = loadedDiscoveriesMenuIcon;
  worldDiscoveryImages = loadedWorldDiscoveryImages;
  cityImages = loadedCityImages;
  factionFlagImages = loadedFactionFlagImages;
  animalImages = loadedAnimalImages;
  cityCatalog = loadedCityCatalog;
  earthRows = earth.tiles;
  if (earth.subdivisions !== SUBDIVISIONS) {
    throw new Error(`Expected Earth cache subdivision ${SUBDIVISIONS}, got ${earth.subdivisions}`);
  }

  graph = buildGeodesicGraph(SUBDIVISIONS);
  if (graph.tileCount !== earth.tileCount || graph.tileCount !== earthRows.length) {
    throw new Error(`Tile count mismatch: graph=${graph.tileCount}, cache=${earth.tileCount}, rows=${earthRows.length}`);
  }
  const globeTileIds = earthRows.map((row) => row.id);
  weatherBake = decodeDiscreteWeatherYearBakeFile(
    discreteWeatherBuffer,
    globeTileIds,
    earth.version,
    SUBDIVISIONS
  );
  runtimeWeather = decodePixelRuntimeWeatherBakeFile(
    runtimeWeatherBuffer,
    earth.version,
    SUBDIVISIONS,
    graph.tileCount
  );
  directionIndex = createDirectionIndex(graph);
  earthById = earthRows;
  mountainLandmarks = buildMountainLandmarks(loadedNamedMountains, graph, directionIndex, earth.peaks);
  spriteColors = buildSpriteDominantColors(images);
  waterLatitudeImages = new Map();
  waterLatitudeSpriteColors = new Map();
  waterLatitudePixelColors = new Map();
  snowyTerrainImages = new Map();
  snowySpriteColors = new Map();
  riverColors = buildRiverColors(images);
  const riverData = buildRiverMasksFromCache(earth);
  riverMasks = riverData.masks;
  riverToWaterMasks = riverData.toWaterMasks;
  oceanReachableNavigationMask = buildOceanReachableNavigationMask();
  cityByTileId = placeCityCatalog(cityCatalog);
  waterDepthBands = buildWaterDepthBands();
  stormSystem = createStormSystem({
    neighbors: graph.neighbors,
    latDeg: graph.latDeg,
    lonDeg: graph.lonDeg,
    waterMask: Uint8Array.from(earthRows, (row) => isWaterSurfaceRow(row) ? 1 : 0),
    oceanMask: oceanReachableNavigationMask,
    seed: WEATHER_WIND_SEED ^ 0x53544f52
  });
  mountainLandmarks = restrictMountainsToNavigableView(
    mountainLandmarks,
    graph,
    oceanReachableNavigationMask,
    MOUNTAIN_DISCOVERY_RADIUS_PX / PIXELS_PER_RADIAN
  );
  worldDiscoveries = buildWorldDiscoveries(graph, directionIndex, {
    landMask: Uint8Array.from(earthRows, (row) => isWaterSurfaceRow(row) ? 0 : 1),
    cityTileIds: cityByTileId.keys(),
    riverMasks,
    riverToWaterMasks,
    navigationMask: oceanReachableNavigationMask,
    pixelsPerRadian: PIXELS_PER_RADIAN
  });
  discoveryCatalog = [
    ...mountainLandmarks.famous.map(mountainDiscovery),
    ...worldDiscoveries,
    CIRCUMNAVIGATION_DISCOVERY
  ];
  console.info(
    `[pixel-globe] mountains: ${mountainLandmarks.all.length} named peaks, ` +
    `${mountainLandmarks.peakTileIds.size} peak tiles, ` +
    `${mountainLandmarks.famous.length} navigable discoveries, ` +
    `${mountainLandmarks.inaccessibleFamous.length} inaccessible discoveries removed`
  );
  if (mountainLandmarks.inaccessibleFamous.length > 0) {
    console.info(
      `[pixel-globe] inaccessible mountain discoveries removed: ` +
      mountainLandmarks.inaccessibleFamous.map((mountain) => mountain.displayName).join(", ")
    );
  }
  characterPortraitManifest = loadedCharacterPortraitManifest;
  portCities = portCitiesForCharacters();
  factionCapitalPorts = markFactionCapitalsOnPorts(portCities);
  portCitiesByTileId = new Map(portCities.map((city) => [city.tileId, city]));
  worldEconomy = createWorldEconomy({
    ports: portCities,
    startMinute: weatherClockMinutes
  });
  const usedCharacterNames = new Set();
  const playerPortraitSummary = playerCharacterPortraitSummary(characterPortraitManifest);
  const playerProfile = generatePlayerStartingProfile({
    identityKey: playerCharacterIdentityKey(),
    ports: portCities,
    manifest: characterPortraitManifest,
    usedNames: usedCharacterNames
  });
  const playerCharacter = playerProfile.character;
  const playerShipSlug = START_SHIP_SLUG_OVERRIDE || playerProfile.starterShipSlug;
  const playerStartPosition = START_POSITION_OVERRIDE || {
    lat: playerProfile.homePort.lat,
    lon: playerProfile.homePort.lon
  };
  if (!shipImage || !shipLighting || playerShipSlug !== START_SHIP_SLUG) {
    const playerShipAssets = await loadShipAssetSet(playerShipSlug);
    shipImage = playerShipAssets.image;
    shipLighting = playerShipAssets.lighting;
    shipWakeAnchors = requiredShipWakeAnchors(playerShipSlug);
  }
  optionsMenu.shipSlug = playerShipSlug;
  portCityCharacters = assignPortCityCharacters(portCities, characterPortraitManifest, usedCharacterNames);
  console.info(
    `[pixel-globe] character portraits: ${portCityCharacters.size} port cities, ` +
    `${characterPortraitManifest.sourceCharacters.length} source portraits, ` +
    `${characterPortraitManifest.skinTones.length} skin tones, ` +
    `${characterPortraitManifest.hairTones.length} hair tones, ` +
    `${characterPortraitManifest.outfitPalettes.length} outfit palettes`
  );
  console.info(
    `[pixel-globe] player portraits: ${playerPortraitSummary.multipleExpressions} multi-expression sources, ` +
    `${playerPortraitSummary.eligibleCaptains} captain eligible`
  );
  console.info(
    `[pixel-globe] player captain: ${playerCharacter.name}, ${playerCharacter.nationalityAdjective}, ` +
    `born ${playerCharacter.birthDateLabel}, ${playerCharacter.expressions.length} expressions, ` +
    `home port ${playerCharacter.homePortName}, starter ${shipLabelForSlug(playerShipSlug)}`
  );
  console.info(`[pixel-globe] faction capitals: ${factionCapitalPorts.size} water-accessible capitals`);
  npcSeaRoutes = createNpcSeaRouteSystem({
    ports: portCities,
    startMinute: weatherClockMinutes,
    economy: worldEconomy
  });
  npcShipCaptains = assignNpcShipCaptains(npcSeaRoutes.ships, characterPortraitManifest, usedCharacterNames);
  console.info(`[pixel-globe] NPC sea routes: ${npcSeaRoutes.ships.length} ships`);
  console.info(`[pixel-globe] NPC ship captains: ${npcShipCaptains.size} assigned portraits`);
  console.info(`[pixel-globe] named characters: ${usedCharacterNames.size} unique people`);
  seaIceMask = new Uint8Array(graph.tileCount);
  freshwaterIceMask = new Uint8Array(graph.tileCount);
  snowGroundMask = new Uint8Array(graph.tileCount);
  cloudSprites = buildCloudSprites();
  refreshWeatherState(true);
  minimap = buildMinimap();
  ship = createShip(
    playerStartPosition.lat,
    playerStartPosition.lon,
    playerShipSlug,
    playerCharacter.nationalityId
  );
  gameState = createGameState({
    cargoCapacity: ship.cargoCapacity,
    startMinute: weatherClockMinutes,
    playerCharacter
  });
  playerIntroModal = createPlayerIntroModal(playerCharacter);
  await ensureCharacterPortraitLoaded(playerCharacter, characterExpression(playerCharacter));
  syncShipCargoFromGameState();
  camera = northUpCamera(ship.position);
  centerTileId = ship.tileId;
  localLayout = createLocalLayout(centerTileId);
  chart = buildChart(camera);
  setupThemeMusic();
  setupSoundEffects();
  requestAnimationFrame(loop);
  ensureGameAudioStarted();
}

async function fetchEarthCache() {
  const res = await fetch("/shared/earth-globe-cache-7.json");
  if (!res.ok) throw new Error(`Failed to load Earth cache: HTTP ${res.status}`);
  return res.json();
}

async function fetchBinary(path, label) {
  const chunked = await fetchChunkedBinary(path, label);
  if (chunked) return chunked;

  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${label}: HTTP ${res.status}`);
  return res.arrayBuffer();
}

async function fetchChunkedBinary(path, label) {
  const manifestPath = `${path}.chunks.json`;
  const manifestRes = await fetch(manifestPath);
  if (manifestRes.status === 404) return null;
  if (!manifestRes.ok) {
    throw new Error(`Failed to load ${label} chunk manifest: HTTP ${manifestRes.status}`);
  }
  const manifestContentType = manifestRes.headers.get("content-type") || "";
  if (!manifestContentType.toLowerCase().includes("json")) return null;

  const manifest = await manifestRes.json();
  if (!Number.isSafeInteger(manifest.byteLength) || manifest.byteLength < 0) {
    throw new Error(`Malformed ${label} chunk manifest: invalid byteLength`);
  }
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) {
    throw new Error(`Malformed ${label} chunk manifest: missing chunks`);
  }

  const out = new Uint8Array(manifest.byteLength);
  let offset = 0;
  for (let i = 0; i < manifest.chunks.length; i++) {
    const chunkSpec = manifest.chunks[i];
    if (!chunkSpec || typeof chunkSpec.path !== "string" || !Number.isSafeInteger(chunkSpec.byteLength)) {
      throw new Error(`Malformed ${label} chunk manifest entry ${i}`);
    }
    const chunkUrl = new URL(chunkSpec.path, new URL(manifestPath, window.location.href)).toString();
    const chunkRes = await fetch(chunkUrl);
    if (!chunkRes.ok) throw new Error(`Failed to load ${label} chunk ${i}: HTTP ${chunkRes.status}`);
    const chunk = new Uint8Array(await chunkRes.arrayBuffer());
    if (chunk.byteLength !== chunkSpec.byteLength) {
      throw new Error(`Malformed ${label} chunk ${i}: expected ${chunkSpec.byteLength} bytes, got ${chunk.byteLength}`);
    }
    if (offset + chunk.byteLength > out.byteLength) {
      throw new Error(`Malformed ${label} chunks: total bytes exceed manifest byteLength`);
    }
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (offset !== out.byteLength) {
    throw new Error(`Malformed ${label} chunks: expected ${out.byteLength} bytes, got ${offset}`);
  }
  return out.buffer;
}

async function fetchText(path, label) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${label}: HTTP ${res.status}`);
  return res.text();
}

async function loadPixelFonts() {
  if (!document.fonts) {
    throw new Error("Cannot guarantee pixel font rendering: FontFaceSet API is unavailable");
  }

  const requiredFonts = [
    { label: "Tiny5", font: "8px \"Tiny5\"" },
    { label: "Silkscreen", font: "8px \"Silkscreen\"" },
    { label: "Dogica", font: "8px \"Dogica\"" },
    { label: "zpix", font: "12px \"zpix\"" }
  ];
  await Promise.all(requiredFonts.map(({ font }) => document.fonts.load(font)));
  await document.fonts.ready;

  for (const { label, font } of requiredFonts) {
    if (!document.fonts.check(font)) {
      throw new Error(`Pixel font failed to load: ${label}`);
    }
  }
}

function loadTerrainImages() {
  return Promise.all(terrainAssets.map((key) => loadImage(key))).then((entries) => {
    const map = new Map(entries);
    for (const required of ["grass_01", "water_deep_01_01", "sand_01", "mountain_stone_01"]) {
      if (!map.has(required)) throw new Error(`Missing terrain image: ${required}`);
    }
    return map;
  });
}

async function loadWorldDiscoveryImages() {
  const entries = await Promise.all(WORLD_DISCOVERY_SPRITE_KEYS.map(async (spriteKey) => {
    const image = await loadAssetImage(
      `/assets/terrain/resurrect-64/${spriteKey}.png?v=${WORLD_DISCOVERY_ASSET_VERSION}`,
      `world discovery image: ${spriteKey}`
    );
    validateImageDimensions(image, `World discovery image: ${spriteKey}`, TILE_ART_SIZE, TILE_ART_SIZE);
    return [spriteKey, image];
  }));
  return new Map(entries);
}

function loadImage(key) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve([key, img]);
    img.onerror = () => reject(new Error(`Failed to load ${TERRAIN_VARIANT} terrain image: ${key}`));
    img.src = `/assets/terrain/${TERRAIN_VARIANT}/${key}.png?v=${TERRAIN_ASSET_VERSION}`;
  });
}

function loadVehicleImage(key) {
  return loadAssetImage(`/assets/vehicles/${key}.png?v=${VEHICLE_ASSET_VERSION}`, `vehicle image: ${key}`);
}

async function loadNpcShipImages() {
  const entries = await Promise.all(NPC_SHIP_SLUGS.map(async (slug) => {
    const key = `${vehicleSpriteKeyForShipSlug(slug)}-16-headings`;
    const img = await loadVehicleImage(key);
    validateShipSpriteSheet(img, `NPC ship image: ${slug}`);
    return [slug, img];
  }));
  return new Map(entries);
}

function validateShipSpriteSheet(img, label) {
  const rows = Math.ceil(SHIP_HEADING_COUNT / SHIP_SHEET_COLS);
  const expectedWidth = SHIP_SHEET_FRAME_SIZE * SHIP_SHEET_COLS;
  const expectedHeight = SHIP_SHEET_FRAME_SIZE * rows;
  validateImageDimensions(img, label, expectedWidth, expectedHeight);
}

async function loadShipWakeAnchors() {
  const res = await fetch(SHIP_WAKE_ANCHORS_URL);
  if (!res.ok) throw new Error(`Failed to load ship wake anchors: HTTP ${res.status}`);
  const bake = await res.json();
  if (!bake || bake.frameSize !== SHIP_SHEET_FRAME_SIZE || bake.headings !== SHIP_HEADING_COUNT) {
    throw new Error("Ship wake anchor bake has incompatible dimensions");
  }
  if (!bake.ships || typeof bake.ships !== "object" || Array.isArray(bake.ships)) {
    throw new Error("Ship wake anchor bake is missing its ships object");
  }

  const anchorsBySlug = new Map();
  for (const [slug, anchors] of Object.entries(bake.ships)) {
    if (!SHIP_STATS_BY_SLUG.has(slug)) throw new Error(`Ship wake anchor bake contains unknown ship: ${slug}`);
    anchorsBySlug.set(slug, validateShipWakeAnchors(slug, anchors));
  }
  for (const slug of SHIP_MENU_SLUGS) {
    if (!anchorsBySlug.has(slug)) throw new Error(`Ship manifest is missing wake anchors for: ${slug}`);
  }
  return anchorsBySlug;
}

function validateShipWakeAnchors(slug, anchors) {
  if (!Array.isArray(anchors) || anchors.length !== SHIP_HEADING_COUNT) {
    throw new Error(`Ship ${slug} must have ${SHIP_HEADING_COUNT} wake anchor frames`);
  }
  return anchors.map((anchor, frame) => {
    if (!anchor || typeof anchor !== "object") throw new Error(`Ship ${slug} has an invalid wake anchor at frame ${frame}`);
    return {
      stern: validateShipWakePoint(slug, frame, "stern", anchor.stern),
      positiveShoulder: validateShipWakePoint(slug, frame, "positive shoulder", anchor.positiveShoulder),
      negativeShoulder: validateShipWakePoint(slug, frame, "negative shoulder", anchor.negativeShoulder)
    };
  });
}

function validateShipWakePoint(slug, frame, label, point) {
  if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`Ship ${slug} frame ${frame} has an invalid ${label} wake point`);
  }
  const maxOffset = SHIP_SHEET_FRAME_SIZE / 2 + 2;
  if (Math.abs(point.x) > maxOffset || Math.abs(point.y) > maxOffset) {
    throw new Error(`Ship ${slug} frame ${frame} ${label} wake point is outside the sprite: ${point.x},${point.y}`);
  }
  return { x: point.x, y: point.y };
}

function requiredShipWakeAnchors(slug) {
  const anchors = shipWakeAnchorsBySlug?.get(slug);
  if (!anchors) throw new Error(`Missing baked wake anchors for ship: ${slug}`);
  return anchors;
}

function loadUiImage(key) {
  return loadAssetImage(`/assets/ui/${key}.png?v=${UI_ASSET_VERSION}`, `UI image: ${key}`);
}

async function loadAnimalImages() {
  const [seagullFlight, seagullStanding] = await Promise.all([
    loadAssetImage(`${SEAGULL_FLIGHT_URL}?v=${ANIMAL_ASSET_VERSION}`, "seagull flight sheet"),
    loadAssetImage(`${SEAGULL_STANDING_URL}?v=${ANIMAL_ASSET_VERSION}`, "standing seagull image")
  ]);
  validateImageDimensions(
    seagullFlight,
    "seagull flight sheet",
    SEAGULL_FRAME_SIZE * SEAGULL_FLIGHT_FRAMES,
    SEAGULL_FRAME_SIZE
  );
  validateImageDimensions(seagullStanding, "standing seagull image", SEAGULL_FRAME_SIZE, SEAGULL_FRAME_SIZE);
  return { seagullFlight, seagullStanding };
}

function validateImageDimensions(img, label, expectedWidth, expectedHeight) {
  if (img.width !== expectedWidth || img.height !== expectedHeight) {
    throw new Error(`${label} has ${img.width}x${img.height}; expected ${expectedWidth}x${expectedHeight}`);
  }
}

async function loadCityImages() {
  const entries = await Promise.all(CITY_TYPE_KEYS.map(loadCityTypeImage));
  return new Map(entries);
}

async function loadCityTypeImage(cityType) {
  const img = await loadAssetImage(
    `/assets/buildings/city-types/city-${cityType}.png?v=${CITY_ASSET_VERSION}`,
    `city type image: ${cityType}`
  );
  if (img.width !== CITY_SPRITE_W || img.height !== CITY_SPRITE_H) {
    throw new Error(`City type image ${cityType} must be ${CITY_SPRITE_W}x${CITY_SPRITE_H}, got ${img.width}x${img.height}`);
  }
  return [cityType, img];
}

async function loadFactionFlagImages() {
  const entries = await Promise.all(FACTIONS.map(async (faction) => {
    const image = await loadAssetImage(
      `/assets/factions/flags/${faction.id}.png?v=${FACTION_FLAG_ASSET_VERSION}`,
      `faction flag: ${faction.id}`
    );
    validateImageDimensions(
      image,
      `Faction flag: ${faction.id}`,
      FACTION_FLAG_SOURCE_W,
      FACTION_FLAG_SOURCE_H
    );
    return [faction.id, image];
  }));
  return new Map(entries);
}

function loadAssetImage(src, label) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${label}`));
    img.src = src;
  });
}

async function loadCityCatalog(targetYear) {
  if (targetYear !== CITY_DATA_YEAR) {
    throw new Error(`No city faction map is defined for ${targetYear}; expected ${CITY_DATA_YEAR}`);
  }
  const csv = await fetchText(CITY_DATA_URL, `${targetYear} city dataset`);
  const rows = parseCsvRows(csv);
  if (rows.length < 2) throw new Error(`City dataset has no city rows: ${CITY_DATA_URL}`);

  const header = rows[0];
  const cityIndex = requiredCsvIndex(header, "city");
  const countryIndex = requiredCsvIndex(header, "country");
  const latIndex = requiredCsvIndex(header, "latitude");
  const lonIndex = requiredCsvIndex(header, "longitude");
  const yearIndex = requiredCsvIndex(header, "year");
  const populationIndex = requiredCsvIndex(header, "population");
  const bestByCity = new Map();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 1 && row[0] === "") continue;
    const city = requiredCsvCell(row, cityIndex, rowIndex, "city").trim();
    const country = requiredCsvCell(row, countryIndex, rowIndex, "country").trim();
    const lat = requiredCsvNumber(row, latIndex, rowIndex, "latitude");
    const lon = requiredCsvNumber(row, lonIndex, rowIndex, "longitude");
    const year = requiredCsvInteger(row, yearIndex, rowIndex, "year");
    const population = requiredCsvNumber(row, populationIndex, rowIndex, "population");
    if (population <= 0 || year > targetYear) continue;

    const cityId = normalizeCityKey(city, country);
    const prev = bestByCity.get(cityId);
    if (!prev || year > prev.year || (year === prev.year && population > prev.population)) {
      const cityRecord = {
        cityId,
        city,
        displayCity: cityDisplayName(city, country, targetYear),
        country,
        lat,
        lon,
        cityType: cityTypeForCity(country, lat, lon),
        year,
        population: Math.round(population)
      };
      const capitalSpec = factionCapitalForCity(cityRecord);
      bestByCity.set(cityId, {
        ...cityRecord,
        factionId: factionIdForCity1522(cityRecord),
        declaredCapitalFactionId: capitalSpec?.factionId || null
      });
    }
  }

  ensureFactionCapitalCityRecords(bestByCity, targetYear);

  const cities = [...bestByCity.values()]
    .sort((a, b) => b.population - a.population || cityLabelText(a).localeCompare(cityLabelText(b)))
    .slice(0, CITY_MAX_COUNT);
  ensureFactionCapitalsInCityCatalog(cities, bestByCity);
  if (cities.length === 0) throw new Error(`City dataset produced no cities for year ${targetYear}`);
  return cities;
}

function ensureFactionCapitalCityRecords(bestByCity, targetYear) {
  for (const capitalSpec of factionCapitalCityRecords1522()) {
    const cityId = normalizeCityKey(capitalSpec.city, capitalSpec.country);
    if (bestByCity.has(cityId)) continue;
    const cityRecord = {
      cityId,
      city: capitalSpec.city,
      displayCity: cityDisplayName(capitalSpec.city, capitalSpec.country, targetYear),
      country: capitalSpec.country,
      lat: capitalSpec.lat,
      lon: capitalSpec.lon,
      cityType: cityTypeForCity(capitalSpec.country, capitalSpec.lat, capitalSpec.lon),
      year: targetYear,
      population: capitalSpec.population
    };
    bestByCity.set(cityId, {
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec.factionId,
      requiredFactionCapital: true
    });
  }
}

function ensureFactionCapitalsInCityCatalog(cities, bestByCity) {
  const included = new Set(cities.map((city) => city.cityId));
  for (const capitalSpec of FACTION_CAPITALS_1522) {
    const cityId = normalizeCityKey(capitalSpec.city, capitalSpec.country);
    if (included.has(cityId)) continue;
    const city = bestByCity.get(cityId);
    if (!city) {
      throw new Error(`No city catalog record for faction capital: ${capitalSpec.city}, ${capitalSpec.country}`);
    }
    if (city.factionId !== capitalSpec.factionId) {
      throw new Error(
        `Faction capital ${capitalSpec.city}, ${capitalSpec.country} belongs to ${city.factionId}, not ${capitalSpec.factionId}`
      );
    }
    cities.push(city);
    included.add(cityId);
  }
}

function parseCsvRows(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === "\"") {
        if (csv[i + 1] === "\"") {
          cell += "\"";
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === "\"") {
      if (cell.length !== 0) throw new Error("Malformed city CSV: quote inside unquoted cell");
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (quoted) throw new Error("Malformed city CSV: unterminated quoted cell");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function requiredCsvIndex(header, name) {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`City dataset is missing required column: ${name}`);
  return index;
}

function requiredCsvCell(row, index, rowIndex, name) {
  const value = row[index];
  if (value == null || value.trim() === "") {
    throw new Error(`City dataset row ${rowIndex + 1} is missing ${name}`);
  }
  return value;
}

function requiredCsvNumber(row, index, rowIndex, name) {
  const value = Number(requiredCsvCell(row, index, rowIndex, name));
  if (!Number.isFinite(value)) {
    throw new Error(`City dataset row ${rowIndex + 1} has invalid ${name}`);
  }
  return value;
}

function requiredCsvInteger(row, index, rowIndex, name) {
  const value = Number(requiredCsvCell(row, index, rowIndex, name));
  if (!Number.isInteger(value)) {
    throw new Error(`City dataset row ${rowIndex + 1} has invalid ${name}`);
  }
  return value;
}

function normalizeCityKey(city, country) {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

function cityDisplayName(city, country, targetYear) {
  const rules = CITY_DISPLAY_NAME_OVERRIDES.get(normalizeCityKey(city, country));
  if (!rules) return city;
  const rule = rules.find((item) => targetYear <= item.throughYear);
  return rule?.displayCity || city;
}

function cityTypeForCity(country, lat, lon) {
  if (CITY_TYPE_EAST_ASIAN_COUNTRIES.has(country)) return "east-asian";
  if (CITY_TYPE_SOUTH_ASIAN_COUNTRIES.has(country)) return "south-asian";
  if (CITY_TYPE_SOUTHEAST_ASIAN_COUNTRIES.has(country)) return "southeast-asian";
  if (CITY_TYPE_ANDEAN_COUNTRIES.has(country)) return "andean";
  if (CITY_TYPE_MESOAMERICAN_COUNTRIES.has(country)) return "mesoamerican";
  if (country === "France" && isMediterraneanFrance(lat, lon)) return "mediterranean";
  if (country === "Mali" && lat < 14) return "sub-saharan";
  if (country === "Russian Federation" && lat < 47 && lon > 30) return "mediterranean";
  if (country === "Ukraine" && lat < 46 && lon > 30) return "mediterranean";
  if (CITY_TYPE_MEDITERRANEAN_COUNTRIES.has(country)) return "mediterranean";
  if (CITY_TYPE_NORTHERN_EUROPEAN_COUNTRIES.has(country)) return "northern-european";
  if (CITY_TYPE_ISLAMIC_DESERT_COUNTRIES.has(country)) return "islamic-desert";
  if (CITY_TYPE_SUB_SAHARAN_COUNTRIES.has(country)) return "sub-saharan";
  throw new Error(`No city type art bucket for city country: ${country}`);
}

function isMediterraneanFrance(lat, lon) {
  return lat < 45.5 && lon > 2;
}

function cityLabelText(city) {
  return city.displayCity || city.city;
}

async function loadShipLightingBake(shipSpriteKey) {
  const [lightImage, shadeImage, shadowImage] = await Promise.all([
    loadVehicleImage(`${shipSpriteKey}-16-headings-light`),
    loadVehicleImage(`${shipSpriteKey}-16-headings-shade`),
    loadVehicleImage(`${shipSpriteKey}-16-headings-shadow`)
  ]);
  return {
    light: decodeShipLightingMask(lightImage, SHIP_SHEET_FRAME_SIZE, "ship light mask"),
    shade: decodeShipLightingMask(shadeImage, SHIP_SHEET_FRAME_SIZE, "ship shade mask"),
    shadow: decodeShipLightingMask(shadowImage, SHIP_SHADOW_FRAME_SIZE, "ship water shadow mask")
  };
}

function decodeShipLightingMask(img, frameSize, label) {
  const rows = Math.ceil(SHIP_HEADING_COUNT / SHIP_SHEET_COLS);
  const expectedWidth = frameSize * SHIP_SHEET_COLS;
  const expectedHeight = frameSize * rows * SHIP_LIGHT_ELEVATION_BINS;
  if (img.width !== expectedWidth || img.height !== expectedHeight) {
    throw new Error(`${label} has ${img.width}x${img.height}; expected ${expectedWidth}x${expectedHeight}`);
  }

  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = img.width;
  sampleCanvas.height = img.height;
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) throw new Error(`Could not create canvas for ${label}`);
  sampleCtx.imageSmoothingEnabled = false;
  sampleCtx.drawImage(img, 0, 0);
  const data = sampleCtx.getImageData(0, 0, img.width, img.height).data;
  const masks = Array.from({ length: SHIP_HEADING_COUNT }, () => (
    Array.from({ length: SHIP_LIGHT_BIN_COUNT }, () => [])
  ));

  for (let elevation = 0; elevation < SHIP_LIGHT_ELEVATION_BINS; elevation++) {
    const elevationY = elevation * rows * frameSize;
    for (let frame = 0; frame < SHIP_HEADING_COUNT; frame++) {
      const cellX = (frame % SHIP_SHEET_COLS) * frameSize;
      const cellY = elevationY + Math.floor(frame / SHIP_SHEET_COLS) * frameSize;
      for (let y = 0; y < frameSize; y++) {
        for (let x = 0; x < frameSize; x++) {
          const offset = (cellX + x + (cellY + y) * img.width) * 4;
          for (let azimuth = 0; azimuth < SHIP_LIGHT_AZIMUTH_BINS; azimuth++) {
            const channel = azimuth < 8 ? 0 : 1;
            if ((data[offset + channel] & (1 << (azimuth & 7))) === 0) continue;
            masks[frame][elevation * SHIP_LIGHT_AZIMUTH_BINS + azimuth].push(x | (y << 8));
          }
        }
      }
    }
  }

  return masks;
}

function terrainVariantFromLocation() {
  const requested = new URLSearchParams(window.location.search).get("terrain") || "resurrect-64";
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(requested)) {
    throw new Error(`Invalid terrain variant: ${requested}`);
  }
  return requested;
}

function startPositionOverrideFromLocation() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("lat") && !params.has("lon")) return null;
  return {
    lat: numericQueryParam(params, "lat", START_LAT_DEG, -89.999, 89.999),
    lon: numericQueryParam(params, "lon", START_LON_DEG, -180, 180)
  };
}

function startWeatherFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const dayParam = params.has("doy") ? "doy" : "day";
  const dayNumber = numericQueryParam(params, dayParam, 80, 1, WEATHER_DAYS);
  const hour = numericQueryParam(params, "hour", 12, 0, 23);
  const minute = numericQueryParam(params, "minute", 0, 0, 59);
  const speedParam = params.has("timeScale") ? "timeScale" : "autoTimeSpeed";
  const timeScale = numericQueryParam(params, speedParam, WEATHER_DEFAULT_TIME_SCALE, 0, 86400);
  return {
    clockMinutes: (Math.floor(dayNumber) - 1) * WEATHER_MINUTES_PER_DAY +
      Math.floor(hour) * 60 +
      Math.floor(minute),
    timeScale
  };
}

function shipSlugOverrideFromLocation() {
  const requested = new URLSearchParams(window.location.search).get("ship");
  if (!requested) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(requested)) {
    throw new Error(`Invalid ship type: ${requested}`);
  }
  if (!SHIP_STATS_BY_SLUG.has(requested)) {
    throw new Error(`Unknown ship type: ${requested}`);
  }
  return requested;
}

function vehicleSpriteKeyForShipSlug(slug) {
  shipStatsForSlug(slug);
  return `unity-ships/${slug}`;
}

function debugStatusFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return booleanQueryParam(params, "debugStatus", false);
}

function numericQueryParam(params, name, fallback, min, max) {
  const raw = params.get(name);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid ${name} query param: ${raw}. Expected ${min}..${max}`);
  }
  return value;
}

function booleanQueryParam(params, name, fallback) {
  const raw = params.get(name);
  if (raw === null || raw === "") return fallback;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`Invalid ${name} query param: ${raw}. Expected true/false`);
}

function buildSpriteDominantColors(imageMap) {
  const colors = new Map();
  const sampleCanvas = document.createElement("canvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) throw new Error("Could not create terrain sprite sampling canvas");
  sampleCtx.imageSmoothingEnabled = false;

  for (const [key, img] of imageMap.entries()) {
    sampleCanvas.width = img.width;
    sampleCanvas.height = img.height;
    sampleCtx.clearRect(0, 0, img.width, img.height);
    sampleCtx.drawImage(img, 0, 0);
    colors.set(key, mostCommonOpaqueColor(key, sampleCtx.getImageData(0, 0, img.width, img.height)));
  }

  return colors;
}

function buildRiverColors(imageMap) {
  const frame1 = riverColorFrame("water_shallow_01", imageMap.get("water_shallow_01"));
  const frame2 = riverColorFrame("water_shallow_02", imageMap.get("water_shallow_02"));
  if (!frame1.main || !frame1.light || !frame2.main || !frame2.light) {
    throw new Error("Could not derive river colors from loaded terrain sprites");
  }
  return {
    base: frame1.main,
    frames: [frame1, frame2]
  };
}

function riverColorFrame(key, img) {
  const ranked = rankedImageColors(key, img, 10);
  const main = ranked[0];
  const mainBrightness = colorBrightness(main);
  const light = ranked
    .filter((c) => colorBrightness(c) > mainBrightness + 18)
    .reduce((best, c) => (colorBrightness(c) > colorBrightness(best) ? c : best), main);

  return {
    main: rgbToHex(main.r, main.g, main.b),
    light: rgbToHex(light.r, light.g, light.b)
  };
}

function rankedImageColors(key, img, limit) {
  if (!img) throw new Error(`Missing terrain image for color sampling: ${key}`);
  const sampleCanvas = document.createElement("canvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) throw new Error("Could not create river color sampling canvas");
  sampleCanvas.width = img.width;
  sampleCanvas.height = img.height;
  sampleCtx.clearRect(0, 0, img.width, img.height);
  sampleCtx.drawImage(img, 0, 0);
  const ranked = rankOpaqueColors(sampleCtx.getImageData(0, 0, img.width, img.height), limit);
  if (ranked.length === 0) throw new Error(`Terrain sprite has no opaque pixels: ${key}`);
  return ranked;
}

function colorBrightness(color) {
  return color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
}

function buildRiverMasksFromCache(earth) {
  if (!earth.riverEdges || typeof earth.riverEdges !== "object") {
    throw new Error("Earth cache is missing riverEdges; rebuild examples/globe-demo/public/earth-globe-cache-7.json");
  }

  const masks = new Uint8Array(graph.tileCount);
  const toWaterMasks = new Uint8Array(graph.tileCount);
  for (const [rawId, edges] of Object.entries(earth.riverEdges)) {
    const tileId = Number(rawId);
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
      throw new Error(`Invalid river tile id in Earth cache: ${rawId}`);
    }
    if (!Array.isArray(edges)) {
      throw new Error(`Invalid river edge list for tile ${tileId}`);
    }
    for (const edge of edges) {
      addRiverEdgeMask(masks, tileId, edge, `Earth cache tile ${tileId}`);
    }
  }

  if (earth.riverEdgeToWater != null) {
    if (typeof earth.riverEdgeToWater !== "object") {
      throw new Error("Earth cache riverEdgeToWater must be an object when present");
    }
    for (const [rawId, edges] of Object.entries(earth.riverEdgeToWater)) {
      const tileId = Number(rawId);
      if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
        throw new Error(`Invalid river-to-water tile id in Earth cache: ${rawId}`);
      }
      if (!Array.isArray(edges)) {
        throw new Error(`Invalid river-to-water edge list for tile ${tileId}`);
      }
      for (const edge of edges) {
        addRiverEdgeMask(toWaterMasks, tileId, edge, `Earth cache river-to-water tile ${tileId}`);
      }
    }
  }

  const added = mergeManualRiverChainsIntoMasks(masks);
  const manualMouthEdges = mergeManualRiverMouthEdgesIntoMasks(masks, toWaterMasks);
  const mouthEdges = markRiverEdgesOpeningToWater(masks, toWaterMasks);
  console.info(
    `[pixel-globe] river masks loaded: ${countRiverTiles(masks)} tiles, ${added} manual half-edge additions, ${manualMouthEdges} manual mouth half-edges, ${mouthEdges} derived coastal mouth half-edges`
  );
  return { masks, toWaterMasks };
}

function buildOceanReachableNavigationMask() {
  const reachable = new Uint8Array(graph.tileCount);
  const queue = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (!isOceanNavigationSeedTile(tileId)) continue;
    reachable[tileId] = 1;
    queue.push(tileId);
  }

  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of graph.neighbors[tileId]) {
      if (reachable[neighborId]) continue;
      if (!canTraverseOceanReachability(tileId, neighborId)) continue;
      reachable[neighborId] = 1;
      queue.push(neighborId);
    }
  }

  let navigableCount = 0;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (isOceanReachableNavigableTile(reachable, tileId)) navigableCount++;
  }
  console.info(`[pixel-globe] ocean-reachable navigation: ${navigableCount} water/river tiles`);
  return reachable;
}

function isOceanNavigationSeedTile(tileId) {
  const t = earthById[tileId]?.t || "";
  return t === "water" || isCoastalWaterRow(earthById[tileId]);
}

function canTraverseOceanReachability(fromTileId, toTileId) {
  const fromWater = isWaterSurfaceRow(earthById[fromTileId]);
  const toWater = isWaterSurfaceRow(earthById[toTileId]);
  if (fromWater && toWater) return true;

  const edgeA = edgeIndexTowardNeighbor(fromTileId, toTileId);
  const edgeB = edgeIndexTowardNeighbor(toTileId, fromTileId);
  if (edgeA === undefined || edgeB === undefined) return false;

  const fromRiver = (riverMasks?.[fromTileId] || 0) !== 0;
  const toRiver = (riverMasks?.[toTileId] || 0) !== 0;
  if (fromWater && toRiver) {
    return riverEdgeSet(riverMasks, toTileId, edgeB) || riverEdgeSet(riverToWaterMasks, toTileId, edgeB);
  }
  if (fromRiver && toWater) {
    return riverEdgeSet(riverMasks, fromTileId, edgeA) || riverEdgeSet(riverToWaterMasks, fromTileId, edgeA);
  }
  if (fromRiver && toRiver) {
    return riverEdgeSet(riverMasks, fromTileId, edgeA) && riverEdgeSet(riverMasks, toTileId, edgeB);
  }
  return false;
}

function isOceanReachableNavigableTile(reachable, tileId) {
  if (!reachable?.[tileId]) return false;
  return isWaterSurfaceRow(earthById[tileId]) || (riverMasks?.[tileId] || 0) !== 0;
}

function markRiverEdgesOpeningToWater(masks, toWaterMasks) {
  let added = 0;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const mask = masks[tileId];
    if (mask === 0 || isWaterSurfaceRow(earthById[tileId])) continue;
    const edgeCount = graph.edgeCount[tileId];
    for (let edge = 0; edge < edgeCount; edge++) {
      if ((mask & (1 << edge)) === 0) continue;
      const neighborId = graph.edgeNeighbors[tileId]?.[edge];
      if (neighborId === undefined) {
        throw new Error(`River edge ${edge} on tile ${tileId} has no edge neighbor`);
      }
      if (isWaterSurfaceRow(earthById[neighborId])) {
        added += addRiverEdgeMask(toWaterMasks, tileId, edge, `derived river-to-water tile ${tileId}`);
      }
    }
  }
  return added;
}

function mergeManualRiverChainsIntoMasks(masks) {
  const chains = MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[SUBDIVISIONS] || [];
  let added = 0;
  for (const chain of chains) {
    for (let i = 0; i < chain.length - 1; i++) {
      added += addRiverEdgeBetween(masks, chain[i], chain[i + 1], "manual river chain");
    }
  }
  return added;
}

function mergeManualRiverMouthEdgesIntoMasks(masks, toWaterMasks) {
  const mouths = MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS] || [];
  let added = 0;
  for (const mouth of mouths) {
    const { tile, edge } = mouth;
    const neighborId = graph.edgeNeighbors[tile]?.[edge];
    if (neighborId === undefined) {
      throw new Error(`manual river mouth: tile ${tile} has no edge ${edge}`);
    }
    if (!isWaterSurfaceRow(earthById[neighborId])) {
      throw new Error(`manual river mouth: tile ${tile} edge ${edge} does not touch water`);
    }
    added += addRiverEdgeMask(masks, tile, edge, `manual river mouth tile ${tile}`);
    addRiverEdgeMask(toWaterMasks, tile, edge, `manual river mouth tile ${tile}`);
  }
  return added;
}

function addRiverEdgeBetween(masks, a, b, source) {
  const edgeA = edgeIndexTowardNeighbor(a, b);
  const edgeB = edgeIndexTowardNeighbor(b, a);
  if (edgeA === undefined || edgeB === undefined) {
    throw new Error(`${source}: tiles ${a} and ${b} are not adjacent`);
  }
  let added = 0;
  added += addRiverEdgeMask(masks, a, edgeA, `${source} ${a}->${b}`);
  added += addRiverEdgeMask(masks, b, edgeB, `${source} ${b}->${a}`);
  return added;
}

function addRiverEdgeMask(masks, tileId, edge, source) {
  const edgeCount = graph.edgeCount[tileId];
  if (!Number.isInteger(edge) || edge < 0 || edge >= edgeCount) {
    throw new Error(`${source}: invalid edge ${edge}; tile ${tileId} has ${edgeCount} edges`);
  }
  const bit = 1 << edge;
  if ((masks[tileId] & bit) !== 0) return 0;
  masks[tileId] |= bit;
  return 1;
}

function edgeIndexTowardNeighbor(tileId, neighborId) {
  const edgeNeighbors = graph.edgeNeighbors[tileId];
  if (!edgeNeighbors) return undefined;
  const edge = edgeNeighbors.indexOf(neighborId);
  return edge >= 0 ? edge : undefined;
}

function countRiverTiles(masks) {
  let count = 0;
  for (const mask of masks) {
    if (mask !== 0) count++;
  }
  return count;
}

function buildWaterDepthBands() {
  const deepBand = WATER_DEPTH_GRADATION_COUNT + 1;
  const bands = new Uint8Array(graph.tileCount);
  bands.fill(deepBand);

  const queue = [];
  for (let id = 0; id < graph.tileCount; id++) {
    if (!isOceanWaterRow(earthById[id])) continue;
    for (const neighborId of graph.neighbors[id]) {
      if (isOceanWaterRow(earthById[neighborId])) continue;
      bands[id] = 1;
      queue.push(id);
      break;
    }
  }

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const nextBand = bands[id] + 1;
    if (nextBand > WATER_DEPTH_GRADATION_COUNT) continue;
    for (const neighborId of graph.neighbors[id]) {
      if (!isOceanWaterRow(earthById[neighborId])) continue;
      if (bands[neighborId] <= nextBand) continue;
      bands[neighborId] = nextBand;
      queue.push(neighborId);
    }
  }

  console.info(`[pixel-globe] water depth bands: ${queue.length} coastal/intermediate ocean tiles`);
  return bands;
}

function isOceanWaterRow(row) {
  return row?.t === "water";
}

function mostCommonOpaqueColor(key, imageData) {
  const ranked = rankOpaqueColors(imageData, 1);
  if (ranked.length === 0) throw new Error(`Terrain sprite has no opaque pixels: ${key}`);
  const color = ranked[0];
  return rgbToHex(color.r, color.g, color.b);
}

function rankOpaqueColors(imageData, limit) {
  const counts = new Map();
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 50) continue;
    const colorKey = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    counts.set(colorKey, (counts.get(colorKey) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([colorKey, count]) => {
      const [r, g, b] = colorKey.split(",").map(Number);
      return { r, g, b, count };
    });
}

function rgbToHex(r, g, b) {
  const parts = [r, g, b].map((v) => clamp(v, 0, 255).toString(16).padStart(2, "0"));
  return `#${parts.join("")}`;
}

function parseHexColor(hex) {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error(`Expected 6-digit hex color, got: ${hex}`);
  const n = Number.parseInt(clean, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function rgbaFromHex(hex, alpha) {
  const { r, g, b } = parseHexColor(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function easeInOut(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function loop(nowMs) {
  try {
    runFrame(nowMs);
  } catch (error) {
    console.error(error);
    drawFatalError(error, "Prototype runtime failure");
  }
}

function runFrame(nowMs) {
  const dt = Math.min(0.05, (nowMs - lastFrameMs) / 1000);
  lastFrameMs = nowMs;
  if (!menusAreOpen() && !dialogueState && !playerIntroModal) {
    if (!anchored && !gameOverReason && updateSailing(dt)) dirty = true;
    if (!gameOverReason && updateCannons(dt)) dirty = true;
    if (updateWaterAnimation(nowMs)) dirty = true;
    if (updateWeather(dt, nowMs)) dirty = true;
    ensureChart();
    if (updateDiscoveries(nowMs)) dirty = true;
    if (updateNpcShips(dt)) dirty = true;
    if (updateSeagulls(dt, nowMs)) dirty = true;
    if (updateWindIndicator(dt)) dirty = true;
    if (updatePrecipitationAnimation(nowMs)) dirty = true;
  }
  updateAmbientAudio(dt);
  updateMusicContext(nowMs);
  if (updateCityFlagAnimation(nowMs)) dirty = true;
  if (dirty || menusAreOpen() || dialogueState || nowMs - lastStatusMs > 1000) {
    render(nowMs);
    dirty = false;
    lastStatusMs = nowMs;
    lastOverlayMs = nowMs;
  } else if (!playerIntroModal && nowMs - lastOverlayMs > 250) {
    drawMinimap(nowMs);
    drawShipInfoButton();
    drawPoliticsButton();
    drawDiscoveriesButton();
    drawOptionsButton();
    lastOverlayMs = nowMs;
  }
  requestAnimationFrame(loop);
}

function updateCityFlagAnimation(nowMs) {
  const tick = Math.floor(nowMs / CITY_FLAG_FRAME_MS);
  if (tick === cityFlagAnimationTick) return false;
  cityFlagAnimationTick = tick;
  return true;
}

function createOptionsMenuState() {
  return {
    isOpen: false,
    musicVolume: loadStoredVolume(MUSIC_VOLUME_STORAGE_KEY, MUSIC_DEFAULT_VOLUME),
    sfxVolume: loadStoredVolume(SFX_VOLUME_STORAGE_KEY, SFX_DEFAULT_VOLUME),
    muted: loadStoredAudioMuted(),
    shipSlug: START_SHIP_SLUG,
    shipLoadingSlug: null,
    shipError: null,
    fullscreenError: null,
    selectedIndex: 0,
    activeSliderKey: null,
    hoverPoint: null,
    buttonRect: null,
    panelRect: null,
    closeButtonRect: null,
    rowRects: [],
    sliderRects: {},
    sliderHitRects: {},
    muteRect: null,
    shipPrevRect: null,
    shipNextRect: null
  };
}

function createPlayerIntroModal(character) {
  return {
    character,
    hovered: false,
    buttonRect: {
      x: Math.floor((SCREEN_W - PLAYER_INTRO_BUTTON_W) / 2),
      y: PLAYER_INTRO_PANEL_Y + PLAYER_INTRO_PANEL_H - PLAYER_INTRO_BUTTON_H - 9,
      w: PLAYER_INTRO_BUTTON_W,
      h: PLAYER_INTRO_BUTTON_H
    }
  };
}

function handlePlayerIntroKeyDown(event) {
  event.preventDefault();
  if (event.key === "Enter" || event.key === " ") closePlayerIntroModal();
}

function handlePlayerIntroPointerDown(point) {
  if (pointInRect(point, playerIntroModal?.buttonRect)) closePlayerIntroModal();
}

function closePlayerIntroModal() {
  playerIntroModal = null;
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function createDiscoveriesMenuState() {
  return {
    isOpen: false,
    page: 0,
    buttonRect: null,
    panelRect: null,
    closeButtonRect: null,
    previousPageRect: null,
    nextPageRect: null
  };
}

function createShipInfoMenuState() {
  return {
    isOpen: false,
    view: "vessel",
    cargoPage: 0,
    ledgerPage: 0,
    papersPage: 0,
    loadingSlug: null,
    error: null,
    buttonRect: null,
    closeButtonRect: null,
    vesselTabRect: null,
    ledgerTabRect: null,
    papersTabRect: null,
    previousPageRect: null,
    nextPageRect: null
  };
}

function createPoliticsMenuState() {
  return {
    isOpen: false,
    page: 0,
    buttonRect: null,
    panelRect: null,
    closeButtonRect: null,
    previousPageRect: null,
    nextPageRect: null
  };
}

function menusAreOpen() {
  return optionsMenu.isOpen || discoveriesMenu.isOpen || shipInfoMenu.isOpen || politicsMenu.isOpen;
}

function setupThemeMusic() {
  if (themeMusic) return;
  themeMusic = new SeamlessMusicPlayer({
    trackSpecs: MUSIC_TRACK_SPECS,
    assetVersion: MUSIC_ASSET_VERSION,
    crossfadeSeconds: MUSIC_CROSSFADE_SECONDS,
    cacheSize: MUSIC_DECODED_TRACK_CACHE_SIZE
  });
  applyThemeAudioSettings();
  themeMusic.request("ship").catch(reportThemeMusicFailure);
}

function setupSoundEffects() {
  if (soundEffects) return;
  soundEffects = {
    cannon: createSoundPool(SFX_CANNON_URL, SFX_CANNON_POOL_SIZE, "cannon shot"),
    impact: createSoundPool(SFX_IMPACT_URL, SFX_IMPACT_POOL_SIZE, "impact thud"),
    sailDeploy: createSoundPool(SFX_SAIL_DEPLOY_URL, SFX_SAIL_DEPLOY_POOL_SIZE, "sail deployment"),
    discoverySuccess: createSoundPool(SFX_DISCOVERY_SUCCESS_URL, SFX_DISCOVERY_SUCCESS_POOL_SIZE, "discovery success"),
    coinClink: createSoundPool(SFX_COIN_CLINK_URL, SFX_COIN_CLINK_POOL_SIZE, "coin clink"),
    harbour: createAmbientLoop(SFX_HARBOUR_URL, "harbour ambience"),
    seagulls: createAmbientLoop(SFX_SEAGULLS_URL, "seagull calls"),
    shoreGulls: createAmbientLoop(SFX_SHORE_GULLS_URL, "shore gulls and waves"),
    harshWind: createAmbientLoop(SFX_HARSH_WIND_URL, "open-water wind"),
    winterWind: createAmbientLoop(SFX_WINTER_WIND_URL, "winter wind"),
    desertWind: createAmbientLoop(SFX_DESERT_WIND_URL, "desert wind"),
    storm: createAmbientLoop(SFX_STORM_URL, "storm"),
    sailFlap: createAmbientLoop(SFX_SAIL_FLAP_URL, "upwind sail flapping"),
    underway: createAmbientLoop(SFX_UNDERWAY_URL, "ship underway")
  };
  applyThemeAudioSettings();
}

function createSoundPool(url, count, label) {
  return Array.from({ length: count }, () => {
    const audio = new Audio(`${url}?v=${SFX_ASSET_VERSION}`);
    audio.preload = "auto";
    audio.addEventListener("error", () => console.warn(`[pixel-globe] ${label} failed to load`));
    return audio;
  });
}

function createAmbientLoop(url, label) {
  const audio = new Audio(`${url}?v=${SFX_ASSET_VERSION}`);
  audio.preload = "auto";
  audio.loop = true;
  audio.volume = 0;
  audio.addEventListener("error", () => console.warn(`[pixel-globe] ${label} failed to load`));
  return {
    audio,
    label,
    currentVolume: 0,
    targetVolume: 0,
    started: false,
    startAttempting: false
  };
}

function ensureGameAudioStarted(fromUserGesture = false) {
  if (fromUserGesture) gameAudioActivationAllowed = true;
  if (!gameAudioActivationAllowed) return;
  ensureThemeMusicStarted();
  ensureActiveAmbientLoopsStarted();
}

function ensureThemeMusicStarted() {
  if (!gameAudioActivationAllowed) return;
  if (!themeMusic) return;
  themeMusic.activate().catch(reportThemeMusicFailure);
}

function playMusicTrack(trackKey, options = {}) {
  if (!themeMusic) return;
  const nextTrackKey = MUSIC_TRACK_SPECS[trackKey] ? trackKey : "ship";
  themeMusic.request(nextTrackKey, options).catch(reportThemeMusicFailure);
}

function reportThemeMusicFailure(error) {
  console.error("[pixel-globe] music playback failure", error);
}

function setBackgroundMusicTrack(trackKey, options = {}) {
  const nextTrackKey = MUSIC_TRACK_SPECS[trackKey] ? trackKey : "ship";
  backgroundMusicTrackKey = nextTrackKey;
  if (combatMusicIsActive(lastFrameMs) && !options.force) return;
  playMusicTrack(nextTrackKey, options);
}

function musicTrackForCity(city) {
  return CITY_TYPE_MUSIC_TRACK_KEYS[city?.cityType] || "ship";
}

function startCombatMusicForThreat() {
  const trackKey = "combat";
  combatMusicUntilMs = Math.max(combatMusicUntilMs, lastFrameMs + COMBAT_MUSIC_HOLD_MS);
  playMusicTrack(trackKey, { crossfadeSeconds: MUSIC_COMBAT_CROSSFADE_SECONDS });
}

function combatMusicIsActive(nowMs) {
  return nowMs < combatMusicUntilMs;
}

function isCombatMusicTrack(trackKey) {
  return trackKey === "combat" || trackKey === "combatSmall" || trackKey === "combatBig";
}

function updateMusicContext(nowMs) {
  if (!themeMusic) return;
  if (gameOverReason || dialogueState) return;
  if (combatMusicIsActive(nowMs)) return;
  const stormIntensity = playerStormIntensity();
  if (!stormMusicActive && stormIntensity >= STORM_MUSIC_ENTER_INTENSITY) {
    stormMusicActive = true;
  } else if (stormMusicActive && stormIntensity < STORM_MUSIC_EXIT_INTENSITY) {
    stormMusicActive = false;
  }
  if (stormMusicActive) {
    if (themeMusic.currentTrackKey !== "storm" && themeMusic.requestedTrackKey !== "storm") {
      playMusicTrack("storm", { crossfadeSeconds: MUSIC_COMBAT_CROSSFADE_SECONDS });
    }
    return;
  }
  if (
    isCombatMusicTrack(themeMusic.currentTrackKey)
    || isCombatMusicTrack(themeMusic.requestedTrackKey)
    || themeMusic.currentTrackKey === "storm"
    || themeMusic.requestedTrackKey === "storm"
  ) {
    playMusicTrack(backgroundMusicTrackKey || "ship", {
      crossfadeSeconds: MUSIC_RETURN_CROSSFADE_SECONDS
    });
  }
}

function ensureActiveAmbientLoopsStarted() {
  for (const loop of ambientSoundLoops()) {
    if (loop.targetVolume > 0.001) ensureAmbientLoopStarted(loop);
  }
}

function ensureAmbientLoopStarted(loop) {
  if (!gameAudioActivationAllowed) return;
  if (!loop || loop.started || loop.startAttempting) return;
  loop.started = true;
  loop.startAttempting = true;
  loop.audio.currentTime = 0;
  applyThemeAudioSettings();
  const playPromise = loop.audio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise
      .catch(() => {
        loop.started = false;
      })
      .finally(() => {
        loop.startAttempting = false;
      });
  } else {
    loop.startAttempting = false;
  }
}

function applyThemeAudioSettings() {
  const musicVolume = clamp(optionsMenu.musicVolume, 0, 1);
  const sfxVolume = clamp(optionsMenu.sfxVolume, 0, 1);
  if (themeMusic) themeMusic.setOutput(musicVolume, optionsMenu.muted);
  if (soundEffects) {
    for (const audio of [
      ...soundEffects.cannon,
      ...soundEffects.impact,
      ...soundEffects.sailDeploy,
      ...soundEffects.discoverySuccess,
      ...soundEffects.coinClink
    ]) {
      audio.muted = optionsMenu.muted;
    }
    for (const loop of ambientSoundLoops()) {
      loop.audio.muted = optionsMenu.muted;
      loop.audio.volume = optionsMenu.muted ? 0 : sfxVolume * loop.currentVolume;
    }
  }
}

function playSoundEffect(pool, volume, playbackRate = 1) {
  if (!pool || pool.length === 0 || optionsMenu.muted || optionsMenu.sfxVolume <= 0) return;
  const audio = pool.find((item) => item.paused || item.ended) || pool[0];
  audio.pause();
  audio.currentTime = 0;
  audio.playbackRate = clamp(playbackRate, 0.75, 1.25);
  audio.volume = clamp(optionsMenu.sfxVolume * volume, 0, 1);
  audio.muted = optionsMenu.muted;
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
}

function playCannonShotSound(broadsideCount) {
  const countGain = 0.72 + Math.min(0.28, Math.max(0, broadsideCount - 1) * 0.025);
  playSoundEffect(soundEffects?.cannon, SFX_CANNON_VOLUME * countGain, 0.94 + Math.random() * 0.1);
}

function playCannonImpactSound(distancePx = 0) {
  const distanceGain = clamp(1 - distancePx / CANNON_RANGE_PX, 0.35, 1);
  playSoundEffect(soundEffects?.impact, SFX_IMPACT_VOLUME * distanceGain, 0.9 + Math.random() * 0.12);
}

function playSailDeploySound() {
  playSoundEffect(soundEffects?.sailDeploy, SFX_SAIL_DEPLOY_VOLUME, 0.98 + Math.random() * 0.04);
}

function playDiscoverySuccessSound() {
  playSoundEffect(soundEffects?.discoverySuccess, SFX_DISCOVERY_SUCCESS_VOLUME, 0.98 + Math.random() * 0.04);
}

function playCoinClinkSound() {
  playSoundEffect(soundEffects?.coinClink, SFX_COIN_CLINK_VOLUME, 0.98 + Math.random() * 0.04);
}

function updateAmbientAudio(dt) {
  if (!soundEffects) return;
  const shore = shoreProximity();
  const sailing = sailingAmbientTargets(dt);
  let changed = false;
  changed = updateAmbientLoop(
    soundEffects.harbour,
    dialogueState ? SFX_HARBOUR_MAX_VOLUME : 0,
    SFX_HARBOUR_MAX_VOLUME,
    dt
  ) || changed;
  changed = updateAmbientLoop(
    soundEffects.seagulls,
    seagullAmbientPresence(shore) * SFX_SEAGULLS_MAX_VOLUME,
    SFX_SEAGULLS_MAX_VOLUME,
    dt
  ) || changed;
  changed = updateAmbientLoop(
    soundEffects.shoreGulls,
    shore * SFX_SHORE_GULLS_MAX_VOLUME,
    SFX_SHORE_GULLS_MAX_VOLUME,
    dt
  ) || changed;
  changed = updateAmbientLoop(
    soundEffects.harshWind,
    sailing.harshWind * SFX_HARSH_WIND_MAX_VOLUME,
    SFX_HARSH_WIND_MAX_VOLUME,
    dt,
    SFX_WIND_FADE_PER_SECOND
  ) || changed;
  changed = updateAmbientLoop(
    soundEffects.winterWind,
    sailing.winterWind * SFX_WINTER_WIND_MAX_VOLUME,
    SFX_WINTER_WIND_MAX_VOLUME,
    dt,
    SFX_WIND_FADE_PER_SECOND
  ) || changed;
  changed = updateAmbientLoop(
    soundEffects.desertWind,
    sailing.desertWind * SFX_DESERT_WIND_MAX_VOLUME,
    SFX_DESERT_WIND_MAX_VOLUME,
    dt,
    SFX_WIND_FADE_PER_SECOND
  ) || changed;
  const stormIntensity = playerStormIntensity();
  changed = updateAmbientLoop(
    soundEffects.storm,
    stormIntensity * SFX_STORM_MAX_VOLUME,
    SFX_STORM_MAX_VOLUME,
    dt,
    SFX_STORM_FADE_PER_SECOND
  ) || changed;
  changed = updateAmbientLoop(
    soundEffects.sailFlap,
    sailing.sailFlap * SFX_SAIL_FLAP_MAX_VOLUME,
    SFX_SAIL_FLAP_MAX_VOLUME,
    dt,
    SFX_SAIL_FLAP_FADE_PER_SECOND
  ) || changed;
  changed = updateAmbientLoop(
    soundEffects.underway,
    sailing.underway * SFX_UNDERWAY_MAX_VOLUME,
    SFX_UNDERWAY_MAX_VOLUME,
    dt,
    SFX_UNDERWAY_FADE_PER_SECOND
  ) || changed;
  if (changed) applyThemeAudioSettings();
}

function updateAmbientLoop(loop, targetVolume, maxVolume, dt, fadePerSecond = SFX_AMBIENT_FADE_PER_SECOND) {
  if (!loop) return false;
  loop.targetVolume = clamp(targetVolume, 0, maxVolume);
  if (loop.targetVolume > 0.001) ensureAmbientLoopStarted(loop);
  const maxStep = fadePerSecond * dt;
  const delta = clamp(loop.targetVolume - loop.currentVolume, -maxStep, maxStep);
  let changed = false;
  if (Math.abs(delta) > 0.0005) {
    loop.currentVolume = clamp(loop.currentVolume + delta, 0, maxVolume);
    changed = true;
  }
  if (loop.currentVolume <= 0.0005 && loop.started && loop.targetVolume <= 0.0005) {
    loop.audio.pause();
    loop.started = false;
    changed = true;
  }
  return changed;
}

function ambientSoundLoops() {
  if (!soundEffects) return [];
  return [
    soundEffects.harbour,
    soundEffects.seagulls,
    soundEffects.shoreGulls,
    soundEffects.harshWind,
    soundEffects.winterWind,
    soundEffects.desertWind,
    soundEffects.storm,
    soundEffects.sailFlap,
    soundEffects.underway
  ].filter(Boolean);
}

function sailingAmbientTargets(dt) {
  if (!ship || !graph) {
    throw new Error("Cannot update sailing ambience before the ship and globe are initialized");
  }
  const wind = windForTile(ship.tileId);
  const windFlow = windFlowVectorAtShip(wind);
  const alignment = clamp(dot3(ship.heading, windFlow), -1, 1);
  const angleFromWindRad = Math.acos(clamp(-alignment, -1, 1));
  const targets = updateSailingAudioState(sailingAudioState, {
    dt,
    paused: Boolean(dialogueState || menusAreOpen() || gameOverReason),
    heading: ship.heading,
    speedPx: vectorLength(ship.velocity) * PIXELS_PER_RADIAN,
    isRiver: shipIsInRiverWater(),
    windStrength: wind.strength,
    windContext: sailingWindContext(),
    angleFromWindRad,
    stallAngleRad: ship.stats.upwindStallAngleRad
  });
  if (!anchored) return targets;
  return {
    ...targets,
    sailFlap: 0,
    underway: 0
  };
}

function sailingWindContext() {
  const tileId = ship.tileId;
  const flags = weatherFlagsForTile(tileId);
  if (seaIceMask?.[tileId] || freshwaterIceMask?.[tileId] || (flags & TILE_DAY_SNOW_FALL) !== 0) {
    return SAILING_WIND_CONTEXT_WINTER;
  }

  const nearbyLand = nearestLandForWindContext();
  if (nearbyLand) {
    const terrain = nearbyLand.row.t || "";
    if (snowGroundMask?.[nearbyLand.id] || terrain.includes("ice") || terrain.includes("snow") || terrain.includes("tundra") || terrain.includes("cold")) {
      return SAILING_WIND_CONTEXT_WINTER;
    }
    if (terrain.includes("desert") || terrain.includes("steppe")) {
      return SAILING_WIND_CONTEXT_DESERT;
    }
  }
  if (Math.abs(graph.latDeg[tileId]) >= 58) return SAILING_WIND_CONTEXT_WINTER;
  return SAILING_WIND_CONTEXT_GENERAL;
}

function nearestLandForWindContext() {
  if (!chart || !localLayout) return null;
  const maxDistance = SFX_WIND_TERRAIN_RADIUS_PX * SFX_WIND_TERRAIN_RADIUS_PX;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const call of chart.tileCalls) {
    if (isWaterSurfaceRow(call.row)) continue;
    const distance = distance2(localLayout.viewX, localLayout.viewY, call.x, call.y);
    if (distance > maxDistance || distance >= nearestDistance) continue;
    nearest = call;
    nearestDistance = distance;
  }
  return nearest;
}

function seagullAmbientPresence(shore) {
  const flying = Math.min(1, seagulls.length / Math.max(1, SEAGULL_MAX_FLYING));
  const landed = chart ? Math.min(1, landedSeagullCalls(chart).length / SEAGULL_LANDED_FULL_PRESENCE) : 0;
  return clamp(Math.max(shore * 0.72, flying * 0.5, landed * 0.42), 0, 1);
}

function shoreProximity() {
  if (!chart || !localLayout || !ship) return 0;
  const origin = { x: localLayout.viewX, y: localLayout.viewY };
  let nearest = Infinity;

  for (const call of chart.tileCalls) {
    if (isWaterSurfaceRow(call.row)) continue;
    nearest = Math.min(nearest, distance2(origin.x, origin.y, call.x, call.y));
  }
  for (const call of chart.cityCalls || []) {
    nearest = Math.min(nearest, distance2(origin.x, origin.y, call.x, call.y) * 0.72);
  }

  if (!Number.isFinite(nearest)) return 0;
  const distance = Math.sqrt(nearest);
  if (distance <= SFX_HARBOUR_NEAR_PX) return 1;
  if (distance >= SFX_HARBOUR_FAR_PX) return 0;
  const t = (distance - SFX_HARBOUR_NEAR_PX) / (SFX_HARBOUR_FAR_PX - SFX_HARBOUR_NEAR_PX);
  return 1 - easeInOut(t);
}

function distance2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function loadStoredVolume(storageKey, defaultVolume) {
  const raw = readLocalStorage(storageKey);
  if (raw === null) return defaultVolume;
  const value = Number(raw);
  return Number.isFinite(value) ? clamp(value, 0, 1) : defaultVolume;
}

function loadStoredAudioMuted() {
  return readLocalStorage(AUDIO_MUTED_STORAGE_KEY) === "true";
}

function readLocalStorage(key) {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function writeLocalStorage(key, value) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch (_) {
    // Storage can be disabled in private or embedded browsing contexts.
  }
}

function playerCharacterIdentityKey() {
  const querySeed = new URLSearchParams(window.location.search).get("captainSeed");
  return resolvePlayerCharacterIdentityKey({
    querySeed,
    generatedSeed: randomPlayerCharacterIdentitySeed()
  });
}

function randomPlayerCharacterIdentitySeed() {
  const values = new Uint32Array(3);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < values.length; i++) {
      values[i] = Math.floor(Math.random() * 0x100000000) >>> 0;
    }
  }
  return Array.from(values, (value) => value.toString(36)).join("-");
}

function setMusicVolume(value) {
  optionsMenu.musicVolume = Math.round(clamp(value, 0, 1) * 100) / 100;
  writeLocalStorage(MUSIC_VOLUME_STORAGE_KEY, String(optionsMenu.musicVolume));
  applyThemeAudioSettings();
  ensureGameAudioStarted();
  dirty = true;
}

function setSfxVolume(value) {
  optionsMenu.sfxVolume = Math.round(clamp(value, 0, 1) * 100) / 100;
  writeLocalStorage(SFX_VOLUME_STORAGE_KEY, String(optionsMenu.sfxVolume));
  applyThemeAudioSettings();
  ensureGameAudioStarted();
  dirty = true;
}

function setAudioMuted(muted) {
  optionsMenu.muted = !!muted;
  writeLocalStorage(AUDIO_MUTED_STORAGE_KEY, String(optionsMenu.muted));
  applyThemeAudioSettings();
  ensureGameAudioStarted();
  dirty = true;
}

function toggleAudioMuted() {
  setAudioMuted(!optionsMenu.muted);
}

function requestShipMenuStep(offset) {
  const currentIndex = shipMenuIndex(optionsMenu.shipSlug);
  const nextIndex = (currentIndex + offset + SHIP_MENU_SLUGS.length) % SHIP_MENU_SLUGS.length;
  setPlayerShipType(SHIP_MENU_SLUGS[nextIndex]);
}

function shipMenuIndex(slug) {
  const index = SHIP_MENU_SLUGS.indexOf(slug);
  if (index < 0) throw new Error(`Ship type is not in menu: ${slug}`);
  return index;
}

async function setPlayerShipType(slug) {
  const stats = shipStatsForSlug(slug);
  if (ship?.typeSlug === slug && !optionsMenu.shipLoadingSlug) {
    optionsMenu.shipSlug = slug;
    optionsMenu.shipError = null;
    dirty = true;
    return;
  }

  const requestId = ++shipSelectionRequestId;
  optionsMenu.shipSlug = slug;
  optionsMenu.shipLoadingSlug = slug;
  optionsMenu.shipError = null;
  dirty = true;

  try {
    const assets = await loadShipAssetSet(slug);
    if (requestId !== shipSelectionRequestId) return;
    applyPlayerShipType(slug, stats, assets);
  } catch (error) {
    if (requestId !== shipSelectionRequestId) return;
    const label = shipLabelForSlug(slug);
    console.error(new Error(`Failed to load ship type ${label} (${slug})`, { cause: error }));
    optionsMenu.shipSlug = ship?.typeSlug || START_SHIP_SLUG;
    optionsMenu.shipLoadingSlug = null;
    optionsMenu.shipError = `ERR ${label}`;
    dirty = true;
  }
}

async function loadShipAssetSet(slug) {
  const shipSpriteKey = vehicleSpriteKeyForShipSlug(slug);
  const [loadedShipImage, loadedShipLighting] = await Promise.all([
    loadVehicleImage(`${shipSpriteKey}-16-headings`),
    loadShipLightingBake(shipSpriteKey)
  ]);
  return {
    image: loadedShipImage,
    lighting: loadedShipLighting
  };
}

function applyPlayerShipType(slug, stats, assets) {
  shipImage = assets.image;
  shipWakeAnchors = requiredShipWakeAnchors(slug);
  shipLighting = assets.lighting;
  if (ship) {
    if (gameState) setCargoCapacity(gameState, stats.cargoCapacity);
    ship.typeSlug = slug;
    ship.stats = stats;
    ship.hitPoints = stats.hitPoints;
    ship.maxHitPoints = stats.hitPoints;
    ship.cargoCapacity = gameState?.cargoCapacity || stats.cargoCapacity;
    ship.cargoUsed = gameState ? cargoUsed(gameState) : Math.min(ship.cargoUsed || 0, stats.cargoCapacity);
    ship.wakeParticles = [];
    ship.lastWakeEmit = null;
    ship.cannonballs = [];
    ship.cannonSplashes = [];
    ship.cannonCooldowns = {
      port: 0,
      starboard: 0
    };
  }
  optionsMenu.shipSlug = slug;
  optionsMenu.shipLoadingSlug = null;
  optionsMenu.shipError = null;
  syncShipSlugToLocation(slug);
  dirty = true;
}

function syncShipSlugToLocation(slug) {
  const url = new URL(window.location.href);
  url.searchParams.set("ship", slug);
  window.history.replaceState(null, "", url);
}

function loadShipInfoImage(slug) {
  const cached = shipInfoImages.get(slug);
  if (cached) return Promise.resolve(cached);
  const pending = shipInfoImagePromises.get(slug);
  if (pending) return pending;
  shipStatsForSlug(slug);
  const promise = loadAssetImage(
    `/assets/vehicles/unity-ships/side-views/${slug}.png?v=${SHIP_INFO_ASSET_VERSION}`,
    `ship side view: ${slug}`
  ).then((image) => {
    validateImageDimensions(
      image,
      `Ship side view: ${slug}`,
      SHIP_INFO_SIDE_VIEW_W,
      SHIP_INFO_SIDE_VIEW_H
    );
    shipInfoImages.set(slug, image);
    shipInfoImagePromises.delete(slug);
    return image;
  }).catch((error) => {
    shipInfoImagePromises.delete(slug);
    throw error;
  });
  shipInfoImagePromises.set(slug, promise);
  return promise;
}

function openShipInfoMenu() {
  if (!ship || !gameState) throw new Error("Cannot open ship information before the game is ready");
  closeOptionsMenu();
  closeDiscoveriesMenu();
  closePoliticsMenu();
  shipInfoMenu.isOpen = true;
  shipInfoMenu.view = "vessel";
  shipInfoMenu.cargoPage = 0;
  shipInfoMenu.ledgerPage = 0;
  shipInfoMenu.papersPage = 0;
  shipInfoMenu.error = null;
  keys.clear();
  clearPointerSteering();
  const slug = ship.typeSlug;
  if (!shipInfoImages.has(slug)) {
    shipInfoMenu.loadingSlug = slug;
    void loadShipInfoImage(slug).then(() => {
      if (shipInfoMenu.loadingSlug === slug) shipInfoMenu.loadingSlug = null;
      dirty = true;
    }).catch((error) => {
      console.error(new Error(`Failed to load ${shipLabelForSlug(slug)} side view`, { cause: error }));
      if (shipInfoMenu.loadingSlug === slug) shipInfoMenu.loadingSlug = null;
      shipInfoMenu.error = `MISSING SHIP ART: ${shipLabelForSlug(slug)}`;
      dirty = true;
    });
  }
  dirty = true;
}

function closeShipInfoMenu() {
  shipInfoMenu.isOpen = false;
  shipInfoMenu.closeButtonRect = null;
  shipInfoMenu.vesselTabRect = null;
  shipInfoMenu.ledgerTabRect = null;
  shipInfoMenu.papersTabRect = null;
  shipInfoMenu.previousPageRect = null;
  shipInfoMenu.nextPageRect = null;
  dirty = true;
}

function handleShipInfoKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape" || event.key === "i" || event.key === "I") {
    closeShipInfoMenu();
    return;
  }
  if (event.key === "Tab") {
    const views = ["vessel", "ledger", "papers"];
    const index = views.indexOf(shipInfoMenu.view);
    shipInfoMenu.view = views[(index + 1) % views.length];
    dirty = true;
    return;
  }
  if (event.key === "l" || event.key === "L") {
    shipInfoMenu.view = "ledger";
    dirty = true;
    return;
  }
  if (event.key === "v" || event.key === "V") {
    shipInfoMenu.view = "vessel";
    dirty = true;
    return;
  }
  if (event.key === "p" || event.key === "P") {
    shipInfoMenu.view = "papers";
    dirty = true;
    return;
  }
  if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
    stepShipInfoPage(-1);
  } else if (["ArrowRight", "ArrowDown", "PageDown"].includes(event.key)) {
    stepShipInfoPage(1);
  }
}

function stepShipInfoPage(direction) {
  if (shipInfoMenu.view === "ledger") {
    const page = shipLedgerPage(gameState, shipInfoMenu.ledgerPage + direction);
    shipInfoMenu.ledgerPage = page.page;
    dirty = true;
    return;
  }
  const view = createShipInfoView(ship, gameState);
  if (shipInfoMenu.view === "papers") {
    const page = shipPapersPage(view, shipInfoMenu.papersPage + direction);
    shipInfoMenu.papersPage = page.page;
    dirty = true;
    return;
  }
  const page = shipInfoCargoPage(view, shipInfoMenu.cargoPage + direction);
  shipInfoMenu.cargoPage = page.page;
  dirty = true;
}

function openOptionsMenu() {
  closeDiscoveriesMenu();
  closeShipInfoMenu();
  closePoliticsMenu();
  optionsMenu.isOpen = true;
  optionsMenu.selectedIndex = 0;
  optionsMenu.activeSliderKey = null;
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function openDiscoveriesMenu() {
  closeOptionsMenu();
  closeShipInfoMenu();
  closePoliticsMenu();
  discoveriesMenu.isOpen = true;
  discoveriesMenu.page = 0;
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function closeDiscoveriesMenu() {
  discoveriesMenu.isOpen = false;
  discoveriesMenu.panelRect = null;
  discoveriesMenu.closeButtonRect = null;
  discoveriesMenu.previousPageRect = null;
  discoveriesMenu.nextPageRect = null;
  dirty = true;
}

function openPoliticsMenu() {
  if (!gameState) throw new Error("Cannot open politics before the game is ready");
  closeOptionsMenu();
  closeDiscoveriesMenu();
  closeShipInfoMenu();
  politicsMenu.isOpen = true;
  politicsMenu.page = 0;
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function closePoliticsMenu() {
  politicsMenu.isOpen = false;
  politicsMenu.panelRect = null;
  politicsMenu.closeButtonRect = null;
  politicsMenu.previousPageRect = null;
  politicsMenu.nextPageRect = null;
  dirty = true;
}

function handlePoliticsKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape" || event.key === "p" || event.key === "P") {
    closePoliticsMenu();
    return;
  }
  if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
    stepPoliticsPage(-1);
  } else if (["ArrowRight", "ArrowDown", "PageDown", "Enter", " "].includes(event.key)) {
    stepPoliticsPage(1);
  }
}

function handleDiscoveriesKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape") {
    closeDiscoveriesMenu();
    return;
  }
  if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
    stepDiscoveriesPage(-1);
  } else if (["ArrowRight", "ArrowDown", "PageDown", "Enter", " "].includes(event.key)) {
    stepDiscoveriesPage(1);
  }
}

function closeOptionsMenu() {
  optionsMenu.isOpen = false;
  optionsMenu.activeSliderKey = null;
  optionsMenu.panelRect = null;
  optionsMenu.closeButtonRect = null;
  optionsMenu.rowRects = [];
  optionsMenu.sliderRects = {};
  optionsMenu.sliderHitRects = {};
  optionsMenu.muteRect = null;
  optionsMenu.shipPrevRect = null;
  optionsMenu.shipNextRect = null;
  dirty = true;
}

function handleOptionsKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape") {
    closeOptionsMenu();
    return;
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    const direction = event.key === "ArrowDown" ? 1 : -1;
    optionsMenu.selectedIndex = (optionsMenu.selectedIndex + direction + OPTIONS_ROW_COUNT) % OPTIONS_ROW_COUNT;
    dirty = true;
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    const direction = event.key === "ArrowRight" ? 1 : -1;
    if (optionsMenu.selectedIndex === OPTIONS_ROW_MUSIC) {
      setMusicVolume(optionsMenu.musicVolume + direction * 0.05);
    } else if (optionsMenu.selectedIndex === OPTIONS_ROW_SFX) {
      setSfxVolume(optionsMenu.sfxVolume + direction * 0.05);
    } else if (optionsMenu.selectedIndex === OPTIONS_ROW_SHIP) {
      requestShipMenuStep(direction);
    }
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    if (optionsMenu.selectedIndex === OPTIONS_ROW_FULLSCREEN) void toggleFullscreenMode();
    if (optionsMenu.selectedIndex === OPTIONS_ROW_MUTE) toggleAudioMuted();
    if (optionsMenu.selectedIndex === OPTIONS_ROW_SHIP) requestShipMenuStep(1);
    return;
  }
  if (event.key === "m" || event.key === "M") {
    toggleAudioMuted();
  }
}

function handlePointerDown(event) {
  const point = canvasPointFromEvent(event);
  optionsMenu.hoverPoint = point;
  ensureGameAudioStarted(true);
  if (playerIntroModal) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    handlePlayerIntroPointerDown(point);
    return;
  }
  if (shipInfoMenu.isOpen) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    handleShipInfoPointerDown(point);
    return;
  }
  if (politicsMenu.isOpen) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    handlePoliticsPointerDown(point);
    return;
  }
  if (discoveriesMenu.isOpen) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    handleDiscoveriesPointerDown(point);
    return;
  }
  if (optionsMenu.isOpen) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    handleOptionsPointerDown(point);
    return;
  }
  if (pointInRect(point, getShipInfoButtonRect())) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openShipInfoMenu();
    return;
  }
  if (pointInRect(point, getPoliticsButtonRect())) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openPoliticsMenu();
    return;
  }
  if (pointInRect(point, getDiscoveriesButtonRect())) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openDiscoveriesMenu();
    return;
  }
  if (pointInRect(point, getOptionsButtonRect())) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openOptionsMenu();
    return;
  }
  if (!dialogueState && pointInRect(point, anchorButtonRect)) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    toggleAnchor();
    return;
  }
  if (dialogueState) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    handleDialoguePointerDown(point);
    return;
  }
  if (pointInRect(point, interactionButtonRect)) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openActiveInteractionDialogue();
    return;
  }
  const clickedShip = npcShipCallAtPoint(point);
  if (clickedShip) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openShipDialogue(clickedShip);
    return;
  }
  const clickedPort = portCallAtPoint(point);
  if (clickedPort) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openPortDialogue(clickedPort);
    return;
  }
  event.preventDefault();
  beginPointerSteering(event.pointerId, point);
}

function handlePointerMove(event) {
  const point = canvasPointFromEvent(event);
  optionsMenu.hoverPoint = point;
  if (playerIntroModal) {
    playerIntroModal.hovered = pointInRect(point, playerIntroModal.buttonRect);
    dirty = true;
    return;
  }
  if (shipInfoMenu.isOpen) {
    dirty = true;
    return;
  }
  if (politicsMenu.isOpen) {
    dirty = true;
    return;
  }
  if (discoveriesMenu.isOpen) {
    dirty = true;
    return;
  }
  if (optionsMenu.isOpen) {
    updateOptionsSelectionFromPoint(point);
    if (optionsMenu.activeSliderKey) setOptionsVolumeFromPoint(optionsMenu.activeSliderKey, point);
    else dirty = true;
    return;
  }
  if (dialogueState) {
    updateDialogueSelectionFromPoint(point);
    dirty = true;
    return;
  }
  if (pointerSteering.active && pointerSteering.pointerId === event.pointerId) {
    event.preventDefault();
    updatePointerSteering(point);
    return;
  }
  dirty = true;
}

function handlePointerUp(event) {
  if (typeof canvas.releasePointerCapture === "function" && event?.pointerId !== undefined) {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (_) {
      // Ignore pointer capture releases from other targets.
    }
  }
  endPointerSteering(event?.pointerId);
  if (optionsMenu.activeSliderKey) {
    optionsMenu.activeSliderKey = null;
    dirty = true;
  }
}

function beginPointerSteering(pointerId, point) {
  pointerSteering.active = true;
  pointerSteering.pointerId = pointerId;
  pointerSteering.point = point;
  if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(pointerId);
  dirty = true;
}

function updatePointerSteering(point) {
  pointerSteering.point = point;
  dirty = true;
}

function endPointerSteering(pointerId) {
  if (!pointerSteering.active) return;
  if (pointerId !== undefined && pointerSteering.pointerId !== pointerId) return;
  clearPointerSteering();
}

function clearPointerSteering() {
  pointerSteering.active = false;
  pointerSteering.pointerId = null;
  pointerSteering.point = null;
  dirty = true;
}

function handleOptionsPointerDown(point) {
  updateOptionsSelectionFromPoint(point);
  if (pointInRect(point, optionsMenu.closeButtonRect)) {
    closeOptionsMenu();
    return;
  }
  if (pointInRect(point, optionsMenu.rowRects[OPTIONS_ROW_FULLSCREEN])) {
    optionsMenu.selectedIndex = OPTIONS_ROW_FULLSCREEN;
    void toggleFullscreenMode();
    return;
  }
  for (const sliderKey of ["music", "sfx"]) {
    if (!pointInRect(point, optionsMenu.sliderHitRects[sliderKey])) continue;
    optionsMenu.activeSliderKey = sliderKey;
    setOptionsVolumeFromPoint(sliderKey, point);
    return;
  }
  if (pointInRect(point, optionsMenu.muteRect) || pointInRect(point, optionsMenu.rowRects[OPTIONS_ROW_MUTE])) {
    optionsMenu.selectedIndex = OPTIONS_ROW_MUTE;
    toggleAudioMuted();
    return;
  }
  if (pointInRect(point, optionsMenu.shipPrevRect)) {
    optionsMenu.selectedIndex = OPTIONS_ROW_SHIP;
    requestShipMenuStep(-1);
    return;
  }
  if (pointInRect(point, optionsMenu.shipNextRect)) {
    optionsMenu.selectedIndex = OPTIONS_ROW_SHIP;
    requestShipMenuStep(1);
  }
}

function handleDiscoveriesPointerDown(point) {
  if (pointInRect(point, discoveriesMenu.closeButtonRect)) {
    closeDiscoveriesMenu();
    return;
  }
  if (pointInRect(point, discoveriesMenu.previousPageRect)) {
    stepDiscoveriesPage(-1);
    return;
  }
  if (pointInRect(point, discoveriesMenu.nextPageRect)) stepDiscoveriesPage(1);
}

function handlePoliticsPointerDown(point) {
  if (pointInRect(point, politicsMenu.closeButtonRect)) {
    closePoliticsMenu();
    return;
  }
  if (pointInRect(point, politicsMenu.previousPageRect)) {
    stepPoliticsPage(-1);
    return;
  }
  if (pointInRect(point, politicsMenu.nextPageRect)) stepPoliticsPage(1);
}

function handleShipInfoPointerDown(point) {
  if (pointInRect(point, shipInfoMenu.closeButtonRect)) {
    closeShipInfoMenu();
    return;
  }
  if (pointInRect(point, shipInfoMenu.vesselTabRect)) {
    shipInfoMenu.view = "vessel";
    dirty = true;
    return;
  }
  if (pointInRect(point, shipInfoMenu.ledgerTabRect)) {
    shipInfoMenu.view = "ledger";
    dirty = true;
    return;
  }
  if (pointInRect(point, shipInfoMenu.papersTabRect)) {
    shipInfoMenu.view = "papers";
    dirty = true;
    return;
  }
  if (pointInRect(point, shipInfoMenu.previousPageRect)) {
    stepShipInfoPage(-1);
    return;
  }
  if (pointInRect(point, shipInfoMenu.nextPageRect)) stepShipInfoPage(1);
}

function stepDiscoveriesPage(direction) {
  const count = discoveredEntries(gameState).length;
  const pageCount = Math.max(1, Math.ceil(count / DISCOVERIES_PAGE_SIZE));
  discoveriesMenu.page = (discoveriesMenu.page + direction + pageCount) % pageCount;
  dirty = true;
}

function stepPoliticsPage(direction) {
  const view = createPoliticsView(gameState);
  const page = politicsRowsPage(view, politicsMenu.page + direction, POLITICS_ROWS_PER_PAGE);
  politicsMenu.page = page.page;
  dirty = true;
}

function updateOptionsSelectionFromPoint(point) {
  for (let i = 0; i < optionsMenu.rowRects.length; i++) {
    if (pointInRect(point, optionsMenu.rowRects[i])) {
      optionsMenu.selectedIndex = i;
      return;
    }
  }
}

function setOptionsVolumeFromPoint(sliderKey, point) {
  const rect = optionsMenu.sliderRects[sliderKey];
  if (!rect) return;
  const value = (point.x - rect.x) / rect.w;
  if (sliderKey === "music") {
    setMusicVolume(value);
  } else if (sliderKey === "sfx") {
    setSfxVolume(value);
  } else {
    throw new Error(`Unknown options volume slider: ${sliderKey}`);
  }
}

function createDialogueLayoutState() {
  return {
    optionRects: []
  };
}

function handleDialogueKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape") {
    closeDialogue();
    return;
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    const view = currentDialogueView();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    dialogueState.selectedIndex = (dialogueState.selectedIndex + direction + view.options.length) % view.options.length;
    dirty = true;
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    chooseDialogueOption(dialogueState.selectedIndex);
    return;
  }
  if (event.key === "ArrowLeft") {
    if (dialogueState.kind === "ship") {
      closeDialogue();
      return;
    }
    dialogueState.nodeId = "root";
    dialogueState.selectedIndex = 0;
    dialogueState.feedback = null;
    dirty = true;
  }
}

function handleDialoguePointerDown(point) {
  updateDialogueSelectionFromPoint(point);
  for (let i = 0; i < dialogueLayout.optionRects.length; i++) {
    if (!pointInRect(point, dialogueLayout.optionRects[i])) continue;
    chooseDialogueOption(i);
    return;
  }
}

function updateDialogueSelectionFromPoint(point) {
  for (let i = 0; i < dialogueLayout.optionRects.length; i++) {
    if (!pointInRect(point, dialogueLayout.optionRects[i])) continue;
    dialogueState.selectedIndex = i;
    return;
  }
}

function openActiveInteractionDialogue() {
  const promptTarget = interactionTargetIsUsable(interactionButtonTarget) ? interactionButtonTarget : null;
  const target = promptTarget || activeInteractionTarget();
  if (!target) return false;
  if (target.kind === "port") openPortDialogue(target.call);
  else openShipDialogue(target.call);
  return true;
}

function openPortDialogue(cityCall) {
  if (!gameState) throw new Error("Cannot open port dialogue before game state is ready");
  if (!cityCall.character) throw new Error(`Cannot open dialogue for non-port city: ${cityLabelText(cityCall)}`);
  combatMusicUntilMs = 0;
  setBackgroundMusicTrack(musicTrackForCity(cityCall), { restart: true, force: true });
  dialogueState = createPortDialogueSession(cityCall);
  dialogueLayout = createDialogueLayoutState();
  visitPort(gameState, cityCall);
  stopShipForDialogue();
  ensureDialoguePortraitLoaded();
  dirty = true;
}

function openShipDialogue(shipCall, options = {}) {
  if (!shipCall.character) throw new Error(`Cannot hail NPC ship without a captain: ${shipCall.id}`);
  dialogueState = createShipDialogueSession(shipCall, options);
  dialogueLayout = createDialogueLayoutState();
  stopShipForDialogue();
  ensureDialoguePortraitLoaded();
  dirty = true;
}

function stopShipForDialogue() {
  if (!ship) return;
  ship.velocity = [0, 0, 0];
  ship.targetHeading = ship.heading.slice();
  ship.wakeParticles = [];
  ship.lastWakeEmit = null;
  clearPointerSteering();
  keys.clear();
}

function toggleAnchor() {
  if (!ship || gameOverReason) return false;
  if (anchored) {
    anchored = false;
    keys.clear();
    clearPointerSteering();
    playSailDeploySound();
    dirty = true;
    return true;
  }
  if (!canAnchorAtCurrentShore()) return false;
  anchored = true;
  stopShipForDialogue();
  dirty = true;
  return true;
}

function canAnchorAtCurrentShore() {
  if (!ship || !chart || !localLayout || gameOverReason) return false;
  if (!isShipNavigableTile(ship.tileId)) return false;
  const maxDistance2 = ANCHOR_SHORE_MAX_PX * ANCHOR_SHORE_MAX_PX;
  for (const call of chart.tileCalls) {
    if (isWaterSurfaceRow(call.row)) continue;
    if (distance2(localLayout.viewX, localLayout.viewY, call.x, call.y) <= maxDistance2) return true;
  }
  return false;
}

function closeDialogue() {
  const wasPortDialogue = dialogueState?.kind === "port";
  dialogueState = null;
  dialogueLayout = createDialogueLayoutState();
  if (wasPortDialogue) {
    combatMusicUntilMs = 0;
    setBackgroundMusicTrack("ship", { force: true });
    playSailDeploySound();
  }
  dirty = true;
}

function chooseDialogueOption(optionIndex) {
  let result;
  let dialogueNpcShipId = null;
  if (dialogueState.kind === "port") {
    const doubloonsBefore = gameState.doubloons;
    result = selectPortDialogueOption(
      dialogueState,
      currentDialogueCity(),
      gameState,
      worldEconomy,
      portCities,
      optionIndex,
      portDialogueContext()
    );
    syncShipCargoFromGameState();
    if (gameState.doubloons !== doubloonsBefore) playCoinClinkSound();
  } else if (dialogueState.kind === "ship") {
    dialogueNpcShipId = dialogueState.npcShipId;
    result = selectShipDialogueOption(dialogueState, currentDialogueShip(), optionIndex);
  } else {
    throw new Error(`Unknown dialogue session kind: ${dialogueState.kind}`);
  }
  if (result.action && dialogueNpcShipId) applyShipDialogueAction(dialogueNpcShipId, result.action);
  if (result.closed) {
    closeDialogue();
    return;
  }
  clampDialogueSelection();
  ensureDialoguePortraitLoaded();
  dirty = true;
}

function applyShipDialogueAction(npcShipId, action) {
  if (action.type === "surrender") {
    handleNpcSurrender(npcShipId, PLAYER_COMBAT_ID, { preserveHull: true });
    return;
  }
  if (action.type === "attack") {
    beginPlayerInitiatedCombat(npcShipId);
    return;
  }
  throw new Error(`Unknown ship dialogue result action: ${action.type}`);
}

function beginPlayerInitiatedCombat(npcShipId) {
  const state = npcVisualShips.get(npcShipId);
  if (!state) throw new Error(`Cannot attack NPC ship that is no longer visible: ${npcShipId}`);
  if (state.combatGrace) throw new Error(`Cannot attack protected NPC ship: ${npcShipId}`);
  if (!forceShipEngagement(shipCombatState, PLAYER_COMBAT_ID, npcShipId)) return;
  recordPlayerAttackConsequences(npcShipId);
  shipCombatEntryCollisionGrace.set(PLAYER_COMBAT_ID, SHIP_COMBAT_ENTRY_COLLISION_GRACE_SECONDS);
  shipCombatEntryCollisionGrace.set(npcShipId, SHIP_COMBAT_ENTRY_COLLISION_GRACE_SECONDS);
  const cannons = shipStatsForSlug(state.slug).cannons;
  startCombatMusicForThreat(cannons >= COMBAT_BIG_BROADSIDE_MIN_CANNONS ? "big" : "small");
}

function recordPlayerAttackConsequences(npcShipId, fallbackFactionId = null) {
  if (!gameState) return;
  const state = npcVisualShips.get(npcShipId);
  const factionId = state?.factionId || npcSeaRoutes?.shipById?.get(npcShipId)?.factionId || fallbackFactionId;
  if (!factionId || factionId === PIRATE_FACTION_ID) return;
  if (!state?.playerAttackRecorded) {
    recordAttackAgainstFaction(gameState, factionId);
    if (state) state.playerAttackRecorded = true;
  }
  if (hasPrivateeringAuthorityAgainst(gameState, factionId)) return;
  if (!state?.playerPiracyRecorded) {
    recordPiracyAgainstFaction(gameState, factionId, { includeVictim: false });
    if (state) state.playerPiracyRecorded = true;
  }
}

function clampDialogueSelection() {
  const view = currentDialogueView();
  dialogueState.selectedIndex = clamp(dialogueState.selectedIndex, 0, Math.max(0, view.options.length - 1));
}

function currentDialogueCity() {
  if (!dialogueState) throw new Error("No active dialogue session");
  const city = cityByTileId.get(dialogueState.cityTileId);
  if (!city) throw new Error(`Dialogue city is no longer placed: ${dialogueState.cityTileId}`);
  const character = portCityCharacters?.get(city.tileId);
  if (!character) throw new Error(`Dialogue city has no port character: ${cityLabelText(city)}`);
  return {
    ...city,
    character,
    portrait: characterExpression(character)
  };
}

function currentDialogueView() {
  if (dialogueState.kind === "port") {
    return portDialogueView(dialogueState, currentDialogueCity(), gameState, worldEconomy, portCities, portDialogueContext());
  }
  if (dialogueState.kind === "ship") {
    return shipDialogueView(dialogueState, currentDialogueShip());
  }
  throw new Error(`Unknown dialogue session kind: ${dialogueState.kind}`);
}

function portDialogueContext() {
  return {
    simMinute: Math.floor(weatherClockMinutes),
    shipPower: playerShipPrivateeringPower()
  };
}

function playerShipPrivateeringPower() {
  if (!ship) return 0;
  return Math.round((ship.stats?.cannons || 0) + (ship.maxHitPoints || ship.stats?.hitPoints || 0));
}

function currentDialogueShip() {
  if (!dialogueState || dialogueState.kind !== "ship") throw new Error("No active ship dialogue session");
  const npcShip = npcSeaRoutes?.shipById?.get(dialogueState.npcShipId);
  if (!npcShip) throw new Error(`Dialogue NPC ship no longer exists: ${dialogueState.npcShipId}`);
  const character = npcShipCaptains?.get(npcShip.id);
  if (!character) throw new Error(`Dialogue NPC ship has no captain: ${npcShip.id}`);
  const visualState = npcVisualShips.get(npcShip.id);
  if (!visualState) throw new Error(`Dialogue NPC ship is no longer visible: ${npcShip.id}`);
  const combatGrace = npcShip.graceUntilPortVisit > npcShip.portVisits;
  const inCombatWithPlayer = shipCombatState.engagements.has(engagementKey(PLAYER_COMBAT_ID, npcShip.id));
  const playerAttackIsPiracy = npcShip.factionId !== PIRATE_FACTION_ID &&
    !hasPrivateeringAuthorityAgainst(gameState, npcShip.factionId);
  const stormStatus = visualState?.stormMode === "anchored"
    ? "We are anchored until the storm passes."
    : visualState?.stormMode === "seeking"
      ? "We are making for shelter."
      : combatGrace
        ? "We have struck our colors and are making for port."
        : null;
  return {
    id: npcShip.id,
    slug: npcShip.slug,
    label: shipLabelForSlug(npcShip.slug),
    role: npcShip.role,
    roleLabel: npcRoleLabel(npcShip.role),
    faction: factionById(npcShip.factionId),
    cargo: { ...npcShip.cargo },
    specie: Math.floor(npcShip.specie),
    destinationName: npcShip.plan?.destination
      ? cityLabelText(npcShip.plan.destination)
      : null,
    stormStatus,
    combatGrace,
    inCombatWithPlayer,
    playerAttackIsPiracy,
    willOfferSurrender: npcShouldOfferSurrender(npcCombatEntity(visualState), playerCombatEntity()),
    character
  };
}

function currentDialogueSubject() {
  return dialogueState?.kind === "ship" ? currentDialogueShip() : currentDialogueCity();
}

function activeInteractionTarget() {
  const port = activePortCall();
  if (port) return { kind: "port", call: port };
  const npcShip = activeNpcShipCall();
  return npcShip ? { kind: "ship", call: npcShip } : null;
}

function activePortCall() {
  if (!chart || !localLayout) return null;
  const currentCity = cityByTileId.get(ship?.tileId ?? centerTileId);
  const currentCharacter = currentCity ? portCityCharacters?.get(currentCity.tileId) : null;
  if (currentCity && currentCharacter) {
    return {
      ...currentCity,
      character: currentCharacter,
      portrait: characterExpression(currentCharacter)
    };
  }
  let best = null;
  let bestDistance = Infinity;
  for (const call of chart.cityCalls || []) {
    if (!portCallInInteractionRange(call)) continue;
    const distance = distance2(localLayout.viewX, localLayout.viewY, call.x, call.y);
    if (distance >= bestDistance) continue;
    best = call;
    bestDistance = distance;
  }
  return best;
}

function activeNpcShipCall() {
  if (!localLayout || !npcShipCaptains) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const state of npcVisualShips.values()) {
    const distance = distance2(localLayout.viewX, localLayout.viewY, state.x, state.y);
    if (distance > NPC_HAIL_RADIUS_PX * NPC_HAIL_RADIUS_PX || distance >= bestDistance) continue;
    best = npcShipInteractionCall(state);
    bestDistance = distance;
  }
  return best;
}

function npcShipCallAtPoint(point) {
  if (!point || !chart || !localLayout || !npcShipCaptains) return null;
  const offset = chartOffsetPixels(chart);
  let best = null;
  let bestDistance = Infinity;
  for (const state of npcVisualShips.values()) {
    if (!npcShipInHailRange(state)) continue;
    const screenX = state.x + offset.x;
    const screenY = state.y + offset.y;
    const rect = expandedRect({
      x: screenX - SHIP_SHEET_FRAME_SIZE / 2,
      y: screenY - SHIP_SHEET_FRAME_SIZE / 2,
      w: SHIP_SHEET_FRAME_SIZE,
      h: SHIP_SHEET_FRAME_SIZE
    }, NPC_HAIL_CLICK_PAD_PX);
    if (!pointInRect(point, rect)) continue;
    const distance = distance2(point.x, point.y, screenX, screenY);
    if (distance >= bestDistance) continue;
    best = npcShipInteractionCall(state);
    bestDistance = distance;
  }
  return best;
}

function npcShipInteractionCall(state) {
  const character = npcShipCaptains?.get(state.id);
  if (!character) throw new Error(`NPC ship ${state.id} has no assigned captain`);
  return {
    id: state.id,
    slug: state.slug,
    label: shipLabelForSlug(state.slug),
    character,
    x: state.x,
    y: state.y
  };
}

function npcShipInHailRange(state) {
  if (!state || !localLayout) return false;
  return distance2(localLayout.viewX, localLayout.viewY, state.x, state.y) <= NPC_HAIL_RADIUS_PX * NPC_HAIL_RADIUS_PX;
}

function portCallAtPoint(point) {
  if (!chart || !localLayout || !point) return null;
  const offset = chartOffsetPixels(chart);
  let best = null;
  let bestDistance = Infinity;

  const consider = (call) => {
    const distance = distance2(point.x, point.y, call.x + offset.x, call.y + offset.y);
    if (distance >= bestDistance) return;
    best = call;
    bestDistance = distance;
  };

  for (const call of chart.cityCalls || []) {
    if (!portCallInInteractionRange(call)) continue;
    if (pointHitsPortCitySprite(point, call, offset)) consider(call);
  }

  for (const { call, box } of cityLabelBoxes(chart.cityCalls || [], chart)) {
    if (!portCallInInteractionRange(call)) continue;
    if (pointInRect(point, chartRectToScreenRect(box, offset))) consider(call);
  }

  return best;
}

function portCallInInteractionRange(call) {
  if (!call?.character || !Number.isFinite(call.x) || !Number.isFinite(call.y)) return false;
  return distance2(localLayout.viewX, localLayout.viewY, call.x, call.y) <= PORT_INTERACTION_RADIUS_PX * PORT_INTERACTION_RADIUS_PX;
}

function portInteractionCallIsUsable(call) {
  if (!call?.character) return false;
  if (!Number.isFinite(call.x) || !Number.isFinite(call.y)) return true;
  if (!localLayout) return false;
  return portCallInInteractionRange(call);
}

function interactionTargetIsUsable(target) {
  if (!target) return false;
  if (target.kind === "port") return portInteractionCallIsUsable(target.call);
  if (target.kind === "ship") {
    const state = npcVisualShips.get(target.call?.id);
    return npcShipInHailRange(state);
  }
  throw new Error(`Unknown interaction target kind: ${target.kind}`);
}

function pointHitsPortCitySprite(point, call, offset) {
  return pointInRect(point, expandedRect(cityScreenRect(call, offset), PORT_CITY_CLICK_PAD_PX));
}

function chartRectToScreenRect(rect, offset) {
  return {
    x: rect.x + offset.x,
    y: rect.y + offset.y,
    w: rect.w,
    h: rect.h
  };
}

function expandedRect(rect, amount) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    w: rect.w + amount * 2,
    h: rect.h + amount * 2
  };
}

function syncShipCargoFromGameState() {
  if (!ship || !gameState) return;
  ship.cargoCapacity = gameState.cargoCapacity;
  ship.cargoUsed = cargoUsed(gameState);
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) * (SCREEN_W / rect.width), 0, SCREEN_W),
    y: clamp((event.clientY - rect.top) * (SCREEN_H / rect.height), 0, SCREEN_H)
  };
}

function pointInRect(point, rect) {
  return !!point && !!rect &&
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h;
}

function createLocalLayout(centerId) {
  return {
    viewX: 0,
    viewY: 0,
    positions: new Map([[centerId, { x: 0, y: 0 }]])
  };
}

function placeCityCatalog(cities) {
  const placed = new Map();
  for (const city of cities) {
    const startId = findNearestTileId(graph, directionIndex, latLonToDirection(city.lat, city.lon));
    const placementPredicate = cityPlacementPredicate(city);
    let tileId = placementPredicate(startId) ? startId : nearestTileMatching(startId, placementPredicate);
    if (tileId === undefined) {
      throw new Error(`Could not place city on drawable land tile: ${city.city}, ${city.country}`);
    }
    if (placed.has(tileId)) {
      if (!city.declaredCapitalFactionId) continue;
      const alternateTileId = nearestTileMatching(tileId, (id) => placementPredicate(id) && !placed.has(id));
      if (alternateTileId === undefined) {
        throw new Error(`Could not place faction capital on an unoccupied land tile: ${city.city}, ${city.country}`);
      }
      tileId = alternateTileId;
    }
    placed.set(tileId, { ...city, tileId });
  }
  return placed;
}

function cityPlacementPredicate(city) {
  if (!city.declaredCapitalFactionId) return isCityDrawableTile;
  return (tileId) => isCityDrawableTile(tileId) && cityHasPortAccess(tileId);
}

function portCitiesForCharacters() {
  const ports = [...cityByTileId.values()].filter((city) => cityHasPortAccess(city.tileId));
  if (ports.length === 0) throw new Error("No port cities found for character portrait assignments");
  return ports;
}

function cityHasPortAccess(tileId) {
  const visited = new Set([tileId]);
  const queue = [{ tileId, distance: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (isCityPortAccessTile(current.tileId)) return true;
    if (current.distance >= CITY_PORT_ACCESS_RING_DISTANCE) continue;

    for (const neighborId of graph.neighbors[current.tileId] || []) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ tileId: neighborId, distance: current.distance + 1 });
    }
  }
  return false;
}

function isCityPortAccessTile(tileId) {
  if (!oceanReachableNavigationMask?.[tileId]) return false;
  return isWaterSurfaceRow(earthById[tileId]) || (riverMasks?.[tileId] || 0) !== 0;
}

function isCityDrawableTile(tileId) {
  return !isWaterSurfaceRow(earthById[tileId]);
}

function createShip(latDeg, lonDeg, shipSlug, factionId) {
  const requested = latLonToDirection(latDeg, lonDeg);
  const tileId = nearestShipStartTile(requested);
  const position = tileCenterVector(tileId);
  const heading = initialShipHeading(position);
  const stats = shipStatsForSlug(shipSlug);
  factionById(factionId);
  return {
    factionId,
    typeSlug: shipSlug,
    stats,
    position,
    tileId,
    heading,
    targetHeading: heading.slice(),
    velocity: [0, 0, 0],
    hitPoints: stats.hitPoints,
    maxHitPoints: stats.hitPoints,
    cargoUsed: 0,
    cargoCapacity: stats.cargoCapacity,
    wakeParticles: [],
    wakeSeedCounter: 0,
    lastWakeEmit: null,
    cannonballs: [],
    cannonSplashes: [],
    cannonSequence: 0,
    cannonCooldowns: {
      port: 0,
      starboard: 0
    }
  };
}

function nearestShipStartTile(direction) {
  const startId = findNearestTileId(graph, directionIndex, direction);
  if (isShipNavigableTile(startId)) return startId;
  const oceanId = nearestTileMatching(startId, isShipOceanTile);
  if (oceanId !== undefined) return oceanId;
  const openWaterId = nearestTileMatching(startId, isShipOpenWaterTile);
  if (openWaterId !== undefined) return openWaterId;
  const navigableId = nearestTileMatching(startId, isShipNavigableTile);
  if (navigableId !== undefined) return navigableId;
  throw new Error("Could not find a navigable start tile for the ship");
}

function nearestTileMatching(startId, predicate) {
  const seen = new Set([startId]);
  const q = [startId];
  let qi = 0;
  while (qi < q.length) {
    const id = q[qi++];
    if (predicate(id)) return id;
    for (const nid of graph.neighbors[id]) {
      if (seen.has(nid)) continue;
      seen.add(nid);
      q.push(nid);
    }
  }
  return undefined;
}

function initialShipHeading(position) {
  return normalizeTangentOrFallback(WORLD_NORTH, position, [1, 0, 0]);
}

function updateSailing(dt) {
  if (!ship || !camera) return false;
  const inputHeading = inputHeadingForShip();

  const previousHeading = ship.heading;
  if (inputHeading) {
    ship.targetHeading = inputHeading;
    ship.heading = rotateTangentToward(
      ship.heading,
      ship.targetHeading,
      ship.position,
      ship.stats.turnRateRad * dt
    );
  } else {
    ship.targetHeading = ship.heading;
  }

  applyWindAcceleration(dt);
  applyRiverHaulAcceleration(dt, inputHeading);
  const moveResult = moveShipWithCollision(dt);
  const wakeChanged = updateShipWake(dt);
  const headingChanged = dot3(previousHeading, ship.heading) < 0.9995;
  return moveResult.moved || moveResult.collided || headingChanged || wakeChanged || vectorLength(ship.velocity) > 0.0001;
}

function inputHeadingForShip() {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy += 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy -= 1;
  const pointerVector = pointerSteeringInputVector();
  if (pointerVector) {
    dx += pointerVector.dx;
    dy += pointerVector.dy;
  }
  if (dx === 0 && dy === 0) return null;

  return normalizeTangentOrFallback([
    camera.right[0] * dx + camera.up[0] * dy,
    camera.right[1] * dx + camera.up[1] * dy,
    camera.right[2] * dx + camera.up[2] * dy
  ], ship.position, ship.heading);
}

function pointerSteeringInputVector() {
  if (!pointerSteering.active || !pointerSteering.point) return null;
  const dx = pointerSteering.point.x - SCREEN_W / 2;
  const dy = SCREEN_H / 2 - pointerSteering.point.y;
  const length = Math.hypot(dx, dy);
  if (length < POINTER_STEERING_DEADZONE_PX) return null;
  return {
    dx: dx / length,
    dy: dy / length
  };
}

function applyWindAcceleration(dt) {
  const wind = windForTile(ship.tileId);
  const windFlow = windFlowVectorAtShip(wind);
  const efficiency = sailingEfficiency(ship.heading, windFlow);
  const sailAccel = ship.stats.accelerationRad * wind.strength * efficiency;

  ship.velocity = [
    ship.velocity[0] + ship.heading[0] * sailAccel * dt,
    ship.velocity[1] + ship.heading[1] * sailAccel * dt,
    ship.velocity[2] + ship.heading[2] * sailAccel * dt
  ];
  ship.velocity = projectTangentVector(ship.velocity, ship.position);
  const drag = SHIP_DRAG_PER_SECOND * (efficiency > 0 ? 1 : SHIP_NO_GO_DRAG_MULTIPLIER);
  ship.velocity = scaleVector(ship.velocity, Math.exp(-drag * dt));
  limitShipSpeed(poweredShipMaxSpeed(wind.strength, efficiency));
}

function applyRiverHaulAcceleration(dt, inputHeading) {
  if (!inputHeading || !shipIsInRiverWater()) return;
  const direction = normalizeOrNull(projectTangentVector(inputHeading, ship.position));
  if (!direction) return;

  const currentSpeedTowardInput = dot3(ship.velocity, direction);
  if (currentSpeedTowardInput >= SHIP_RIVER_HAUL_MAX_SPEED_RAD) return;

  const addSpeed = Math.min(
    SHIP_RIVER_HAUL_ACCEL_RAD * dt,
    SHIP_RIVER_HAUL_MAX_SPEED_RAD - currentSpeedTowardInput
  );
  ship.velocity = projectTangentVector([
    ship.velocity[0] + direction[0] * addSpeed,
    ship.velocity[1] + direction[1] * addSpeed,
    ship.velocity[2] + direction[2] * addSpeed
  ], ship.position);
}

function shipIsInRiverWater() {
  if (!localLayout || !chart) return false;
  const nav = shipNavigabilityAtLocalPoint(localLayout.viewX, localLayout.viewY, ship.tileId, ship.position);
  return nav.ok && nav.kind === "river";
}

function sailingEfficiency(heading, windFlow) {
  const alignment = clamp(dot3(heading, windFlow), -1, 1);
  const angleFromWind = Math.acos(clamp(-alignment, -1, 1));
  const stallAngle = ship.stats.upwindStallAngleRad;
  const closeHauledAngle = Math.min(Math.PI / 2 - 0.01, stallAngle + SAIL_CLOSE_HAULED_ANGLE_RANGE_RAD);
  if (angleFromWind <= stallAngle) return 0;

  if (angleFromWind <= closeHauledAngle) {
    const t = easeInOut((angleFromWind - stallAngle) / (closeHauledAngle - stallAngle));
    return SAIL_CLOSE_HAULED_EFFICIENCY * t;
  }
  if (angleFromWind <= Math.PI / 2) {
    const t = easeInOut((angleFromWind - closeHauledAngle) / (Math.PI / 2 - closeHauledAngle));
    return SAIL_CLOSE_HAULED_EFFICIENCY + (1 - SAIL_CLOSE_HAULED_EFFICIENCY) * t;
  }
  if (angleFromWind <= Math.PI * 0.75) {
    const t = (angleFromWind - Math.PI / 2) / (Math.PI * 0.25);
    return 1 - t * 0.15;
  }

  const t = (angleFromWind - Math.PI * 0.75) / (Math.PI * 0.25);
  return 0.85 - t * 0.3;
}

function poweredShipMaxSpeed(windStrength, efficiency) {
  if (efficiency <= 0) return Infinity;
  const windFactor = 0.28 + windStrength * 0.72;
  return SHIP_MIN_POWERED_SPEED_RAD + (ship.stats.topSpeedRad - SHIP_MIN_POWERED_SPEED_RAD) * windFactor * efficiency;
}

function windFlowVectorAtShip(wind) {
  const flowDir = wind.directionRad + Math.PI;
  return normalizeTangentOrFallback([
    camera.right[0] * Math.cos(flowDir) + camera.up[0] * Math.sin(flowDir),
    camera.right[1] * Math.cos(flowDir) + camera.up[1] * Math.sin(flowDir),
    camera.right[2] * Math.cos(flowDir) + camera.up[2] * Math.sin(flowDir)
  ], ship.position, ship.heading);
}

function limitShipSpeed(maxSpeed) {
  if (!Number.isFinite(maxSpeed)) return;
  const speed = vectorLength(ship.velocity);
  if (speed <= maxSpeed) return;
  ship.velocity = scaleVector(ship.velocity, maxSpeed / speed);
}

function moveShipWithCollision(dt) {
  const step = scaleVector(ship.velocity, dt);
  if (vectorLength(step) < 1e-8) return { moved: false, collided: false };

  for (const assistedVelocity of playerRiverGatewayVelocities()) {
    const assisted = attemptShipStep(ship.position, ship.tileId, scaleVector(assistedVelocity, dt));
    if (!assisted.ok) continue;
    ship.velocity = projectTangentVector(assistedVelocity, assisted.position);
    applyShipMove(assisted.position, assisted.tileId);
    return { moved: true, collided: false };
  }

  const direct = attemptShipStep(ship.position, ship.tileId, step);
  if (direct.ok) {
    applyShipMove(direct.position, direct.tileId);
    return { moved: true, collided: false };
  }

  const normal = direct.normal || shipCollisionNormal(ship.position, direct.blockedTileId, step);
  const slide = findShipSlideMove(normal, dt);
  if (slide) {
    ship.velocity = projectTangentVector(slide.velocity, slide.position);
    applyShipMove(slide.position, slide.tileId);
    return { moved: true, collided: true };
  }

  ship.velocity = scaleVector(projectTangentVector(ship.velocity, ship.position), SHIP_STOP_DAMPING);
  if (vectorLength(ship.velocity) < SHIP_MIN_SLIDE_SPEED_RAD) ship.velocity = [0, 0, 0];
  return { moved: false, collided: true };
}

function playerRiverGatewayVelocities() {
  const speed = vectorLength(ship.velocity);
  if (speed < SHIP_MIN_SLIDE_SPEED_RAD || !localLayout || !chart || !camera) return [];
  const travelDirection = tangentToScreenDirection(ship.velocity);
  const bowDirection = tangentToScreenDirection(ship.heading);
  if (!travelDirection || !bowDirection) return [];
  const currentNav = shipNavigabilityAtLocalPoint(
    localLayout.viewX,
    localLayout.viewY,
    ship.tileId,
    ship.position
  );
  if (!currentNav.ok) return [];
  const gateway = riverGatewayDirectionAtLocalPoint(
    localLayout.viewX,
    localLayout.viewY,
    currentNav.kind,
    bowDirection
  );
  if (!gateway) return [];

  const candidates = [];
  for (const amount of [0.25, 0.45, 0.7, 1]) {
    const direction = blendRiverNavigationDirections(travelDirection, gateway, amount);
    if (!direction) continue;
    const tangent = screenDirectionToTangent(direction, ship.position, ship.velocity);
    candidates.push(scaleVector(tangent, speed));
  }
  return candidates;
}

function findShipSlideMove(normal, dt) {
  for (const velocity of shipSlideVelocityCandidates(normal)) {
    if (vectorLength(velocity) < SHIP_MIN_SLIDE_SPEED_RAD) continue;
    const slide = attemptShipStep(ship.position, ship.tileId, scaleVector(velocity, dt));
    if (!slide.ok) continue;
    return {
      velocity,
      position: slide.position,
      tileId: slide.tileId
    };
  }
  return null;
}

function shipSlideVelocityCandidates(normal) {
  const speed = vectorLength(ship.velocity);
  if (speed <= 1e-9) return [];

  const originalDirection = normalizeOrNull(projectTangentVector(ship.velocity, ship.position));
  if (!originalDirection) return [];

  const candidates = [];
  addShipSlideVelocityCandidate(candidates, shipBoundarySlideVelocity(normal), originalDirection, speed);

  const tangent = shipBoundarySlideDirection(normal, originalDirection);
  if (tangent) {
    addShipSlideVelocityCandidate(
      candidates,
      scaleVector(tangent, speed * SHIP_COLLISION_SLIDE_SPEED_KEEP),
      originalDirection,
      speed
    );
    for (const bias of SHIP_COLLISION_SLIDE_OUTWARD_BIASES) {
      addBiasedShipSlideVelocityCandidates(candidates, tangent, normal, originalDirection, speed, bias);
    }
  }

  for (const angle of SHIP_COLLISION_SLIDE_SEARCH_ANGLES_RAD) {
    const direction = rotateTangentDirection(originalDirection, ship.position, angle);
    if (Math.abs(angle) > 1e-6) {
      addShipSlideVelocityCandidate(
        candidates,
        scaleVector(direction, speed * SHIP_COLLISION_SLIDE_SEARCH_SIDE_KEEP),
        originalDirection,
        speed
      );
    }
    for (const bias of SHIP_COLLISION_SLIDE_OUTWARD_BIASES) {
      addBiasedShipSlideVelocityCandidates(candidates, direction, normal, originalDirection, speed, bias);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.map((candidate) => candidate.velocity);
}

function addBiasedShipSlideVelocityCandidates(candidates, direction, normal, originalDirection, speed, bias) {
  if (!normal) return;
  const away = scaleVector(normal, -1);
  const biased = normalizeOrNull(projectTangentVector([
    direction[0] + away[0] * bias,
    direction[1] + away[1] * bias,
    direction[2] + away[2] * bias
  ], ship.position));
  if (!biased) return;
  addShipSlideVelocityCandidate(
    candidates,
    scaleVector(biased, speed * SHIP_COLLISION_SLIDE_SEARCH_SIDE_KEEP),
    originalDirection,
    speed
  );
}

function addShipSlideVelocityCandidate(candidates, velocity, originalDirection, speed) {
  const direction = normalizeOrNull(projectTangentVector(velocity, ship.position));
  if (!direction) return;
  const align = dot3(direction, originalDirection);
  if (align < SHIP_COLLISION_SLIDE_SEARCH_MIN_ALIGN) return;
  const candidateSpeed = vectorLength(velocity);
  if (candidateSpeed < SHIP_MIN_SLIDE_SPEED_RAD) return;
  const key = `${Math.round(direction[0] * 1000)},${Math.round(direction[1] * 1000)},${Math.round(direction[2] * 1000)}`;
  if (candidates.some((candidate) => candidate.key === key)) return;
  const speedScore = Math.min(candidateSpeed / Math.max(speed, 1e-9), 1);
  candidates.push({
    key,
    velocity,
    score: align * 2 + speedScore
  });
}

function shipBoundarySlideVelocity(normal) {
  const speed = vectorLength(ship.velocity);
  if (speed <= 1e-9) return [0, 0, 0];
  const direction = shipBoundarySlideDirection(normal, ship.velocity);
  if (!direction) return [0, 0, 0];
  return scaleVector(direction, speed * SHIP_COLLISION_SLIDE_SPEED_KEEP);
}

function shipBoundarySlideDirection(normal, direction) {
  if (!normal) return null;
  const speed = vectorLength(direction);
  if (speed <= 1e-9) return null;
  const into = Math.max(0, dot3(direction, normal));
  const tangent = projectTangentVector([
    direction[0] - normal[0] * into,
    direction[1] - normal[1] * into,
    direction[2] - normal[2] * into
  ], ship.position);
  const tangentSpeed = vectorLength(tangent);
  if (tangentSpeed / speed < SHIP_COLLISION_MIN_TANGENT_RATIO) return null;
  return scaleVector(tangent, 1 / tangentSpeed);
}

function rotateTangentDirection(direction, axis, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cross = cross3(axis, direction);
  return normalizeOrNull(projectTangentVector([
    direction[0] * cos + cross[0] * sin,
    direction[1] * cos + cross[1] * sin,
    direction[2] * cos + cross[2] * sin
  ], axis)) || direction;
}

function attemptShipStep(fromPosition, fromTileId, step) {
  const segments = Math.max(1, Math.ceil(vectorLength(step) * PIXELS_PER_RADIAN / SHIP_COLLISION_SAMPLE_STEP_PX));
  const movementDirection = normalizeOrNull(step);
  const startNav = shipNavigabilityAtLocalPoint(localLayout.viewX, localLayout.viewY, fromTileId, fromPosition);
  let previousNavKind = startNav?.kind || null;
  let previousTileId = fromTileId;
  let position = fromPosition;

  for (let i = 1; i <= segments; i++) {
    position = normalize3([
      fromPosition[0] + step[0] * (i / segments),
      fromPosition[1] + step[1] * (i / segments),
      fromPosition[2] + step[2] * (i / segments)
    ]);
    const localPoint = localCollisionPointForPosition(fromPosition, position);
    const tileId = localCollisionTileIdAtPoint(localPoint.x, localPoint.y, "ship center");
    const centerNav = shipNavigabilityAtLocalPoint(localPoint.x, localPoint.y, tileId, position);
    if (!centerNav.ok) {
      return {
        ok: false,
        blockedTileId: centerNav.blockedTileId,
        normal: centerNav.normal
      };
    }
    if (!movementCanUseDrawnNavigation(previousTileId, tileId, previousNavKind, centerNav.kind, movementDirection)) {
      return { ok: false, blockedTileId: tileId };
    }
    const occupancy = shipOccupancyAtPosition(position, tileId, localPoint, centerNav);
    if (!occupancy.ok) {
      return {
        ok: false,
        blockedTileId: occupancy.blockedTileId,
        normal: occupancy.normal
      };
    }
    previousTileId = tileId;
    previousNavKind = centerNav.kind;
  }

  return { ok: true, position, tileId: previousTileId };
}

function movementCanUseDrawnNavigation(fromTileId, toTileId, fromNavKind, toNavKind, movementDirection) {
  if (fromNavKind === "river" || toNavKind === "river") return true;
  return canShipMoveBetween(fromTileId, toTileId, movementDirection);
}

function shipOccupancyAtPosition(position, tileId, localPoint, centerNav) {
  return vesselOccupancyAtPosition(position, tileId, localPoint, centerNav, ship.heading);
}

function vesselOccupancyAtPosition(position, tileId, localPoint, centerNav, heading) {
  const sampleRadiusPx = centerNav.kind === "river" ? SHIP_RIVER_COLLISION_RADIUS_PX : SHIP_COLLISION_RADIUS_PX;
  const forward = normalizeTangentOrFallback(heading, position, WORLD_NORTH);
  const side = normalizeOrNull(cross3(position, forward));
  const sampleVectors = side
    ? [forward, side, scaleVector(side, -1)]
    : [forward];

  for (const sampleVector of sampleVectors) {
    const samplePoint = localShipCollisionSamplePoint(sampleVector, sampleRadiusPx, localPoint);
    const sampleTileId = localCollisionTileIdAtPoint(samplePoint.x, samplePoint.y, "ship collision sample");
    const sampleNav = shipNavigabilityAtLocalPoint(samplePoint.x, samplePoint.y, sampleTileId, position);
    if (!sampleNav.ok) return sampleNav;
  }
  return { ok: true };
}

function shipNavigabilityAtLocalPoint(x, y, tileId, position) {
  if (isShipOpenWaterTile(tileId)) return { ok: true, kind: "openWater" };

  const riverInfo = riverWaterInfoAtLocalPoint(x, y, chart);
  if (riverInfo?.ok) return { ok: true, kind: "river" };

  const normal = riverInfo?.normal
    ? localNormalToTangent(riverInfo.normal, position)
    : localCollisionNormalForTile(tileId, position);
  return {
    ok: false,
    blockedTileId: riverInfo?.tileId ?? tileId,
    normal
  };
}

function localCollisionPointForPosition(fromPosition, position) {
  if (!localLayout || !camera) throw new Error("Cannot compute local ship collision without a local layout and camera");
  const delta = [
    position[0] - fromPosition[0],
    position[1] - fromPosition[1],
    position[2] - fromPosition[2]
  ];
  return {
    x: localLayout.viewX + dot3(delta, camera.right) * PIXELS_PER_RADIAN,
    y: localLayout.viewY - dot3(delta, camera.up) * PIXELS_PER_RADIAN
  };
}

function localShipCollisionSamplePoint(sampleVector, distancePx, localPoint) {
  if (!localLayout || !camera) throw new Error("Cannot sample rendered ship collision without a local layout and camera");
  const sampleX = localPoint.x + dot3(sampleVector, camera.right) * distancePx;
  const sampleY = localPoint.y - dot3(sampleVector, camera.up) * distancePx;
  return { x: sampleX, y: sampleY };
}

function localCollisionTileIdAtPoint(x, y, label) {
  if (!localLayout || !chart?.waterIndex) throw new Error(`Cannot resolve ${label} without an indexed local chart`);
  const nearest = nearestLocalCollisionTileAtPoint(x, y);
  if (!nearest) throw new Error(`Could not resolve ${label}; indexed chart has no nearby tiles`);
  if (nearest.distancePx > SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX) {
    throw new Error(`Could not resolve ${label}; nearest drawn tile was ${nearest.distancePx.toFixed(1)}px away`);
  }
  return nearest.tileId;
}

function nearestLocalCollisionTileAtPoint(x, y) {
  if (!localLayout || !chart?.waterIndex) return null;
  let bestId;
  let bestD2 = Infinity;

  for (const entry of wakeWaterCandidatesForPoint(x, y, chart.waterIndex)) {
    if (entry.kind !== "tile") continue;
    const dx = entry.call.x - x;
    const dy = entry.call.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= bestD2) continue;
    bestD2 = d2;
    bestId = entry.call.id;
  }

  if (bestId === undefined) return null;
  return { tileId: bestId, distancePx: Math.sqrt(bestD2) };
}

function globePositionForLocalPoint(tileId, x, y) {
  if (!localLayout || !camera) throw new Error("Cannot resolve a globe position without a local layout and camera");
  const layout = localLayout.positions.get(tileId);
  if (!layout) throw new Error(`Cannot resolve globe position for missing local tile: ${tileId}`);

  const center = tileCenterVector(tileId);
  const dx = (x - layout.x) / PIXELS_PER_RADIAN;
  const dy = -(y - layout.y) / PIXELS_PER_RADIAN;
  const tangentOffset = [
    camera.right[0] * dx + camera.up[0] * dy,
    camera.right[1] * dx + camera.up[1] * dy,
    camera.right[2] * dx + camera.up[2] * dy
  ];
  return normalize3([
    center[0] + tangentOffset[0],
    center[1] + tangentOffset[1],
    center[2] + tangentOffset[2]
  ]);
}

function applyShipMove(position, tileId) {
  const previousPosition = ship.position;
  const delta = [
    position[0] - previousPosition[0],
    position[1] - previousPosition[1],
    position[2] - previousPosition[2]
  ];
  const dx = dot3(delta, camera.right);
  const dy = dot3(delta, camera.up);

  moveLocalView(dx, dy);
  const drawnTileId = localCollisionTileIdAtPoint(localLayout.viewX, localLayout.viewY, "ship center after move");
  const drawnNav = shipNavigabilityAtLocalPoint(localLayout.viewX, localLayout.viewY, drawnTileId, position);
  if (!drawnNav.ok) {
    throw new Error(`Ship local movement resolved outside drawn navigation: ${tileId} -> ${drawnTileId}`);
  }
  if (drawnTileId !== tileId && drawnNav.kind !== "river" && !canShipMoveBetween(tileId, drawnTileId, ship.heading)) {
    throw new Error(`Ship local movement resolved to an unexpected tile: ${tileId} -> ${drawnTileId}`);
  }

  ship.tileId = drawnTileId;
  ship.position = globePositionForLocalPoint(ship.tileId, localLayout.viewX, localLayout.viewY);
  ship.heading = normalizeTangentOrFallback(ship.heading, ship.position, WORLD_NORTH);
  ship.targetHeading = normalizeTangentOrFallback(ship.targetHeading, ship.position, ship.heading);
  ship.velocity = projectTangentVector(ship.velocity, ship.position);
  camera = northUpCamera(ship.position, camera.right);
  centerTileId = ship.tileId;
}

function shipCollisionNormal(position, blockedTileId, fallbackStep) {
  if (blockedTileId !== undefined) {
    const localNormal = localCollisionNormalForTile(blockedTileId, position);
    if (localNormal) return localNormal;
    const towardTile = projectTangentVector(tileCenterVector(blockedTileId), position);
    const normal = normalizeOrNull(towardTile);
    if (normal) return normal;
  }
  const fallback = normalizeOrNull(projectTangentVector(fallbackStep, position));
  return fallback || ship.heading;
}

function localCollisionNormalForTile(tileId, position) {
  const layout = localLayout?.positions.get(tileId);
  if (!layout || !camera) return null;
  const dx = layout.x - localLayout.viewX;
  const dy = layout.y - localLayout.viewY;
  if (Math.hypot(dx, dy) < 1e-6) return null;
  return normalizeOrNull(projectTangentVector([
    camera.right[0] * dx - camera.up[0] * dy,
    camera.right[1] * dx - camera.up[1] * dy,
    camera.right[2] * dx - camera.up[2] * dy
  ], position));
}

function localNormalToTangent(normal, position) {
  if (!normal || !camera) return null;
  return normalizeOrNull(projectTangentVector([
    camera.right[0] * normal.x - camera.up[0] * normal.y,
    camera.right[1] * normal.x - camera.up[1] * normal.y,
    camera.right[2] * normal.x - camera.up[2] * normal.y
  ], position));
}

function canShipMoveBetween(fromTileId, toTileId, movementDirection = null) {
  if (!isShipNavigableTile(toTileId)) return false;
  if (fromTileId === toTileId) return true;

  const edgeA = edgeIndexTowardNeighbor(fromTileId, toTileId);
  const edgeB = edgeIndexTowardNeighbor(toTileId, fromTileId);
  if (edgeA === undefined || edgeB === undefined) return false;

  const fromWater = isShipOpenWaterTile(fromTileId);
  const toWater = isShipOpenWaterTile(toTileId);
  if (fromWater && toWater) return true;

  const fromRiver = shipTileHasRiver(fromTileId);
  const toRiver = shipTileHasRiver(toTileId);
  if (fromWater && toRiver) {
    if (riverEdgeSet(riverMasks, toTileId, edgeB) || riverEdgeSet(riverToWaterMasks, toTileId, edgeB)) return true;
    return canFollowRiverGenerously(fromTileId, toTileId, movementDirection);
  }
  if (fromRiver && toWater) {
    if (riverEdgeSet(riverMasks, fromTileId, edgeA) || riverEdgeSet(riverToWaterMasks, fromTileId, edgeA)) return true;
    return canFollowRiverGenerously(fromTileId, toTileId, movementDirection);
  }
  if (fromRiver && toRiver) {
    if (riverEdgeSet(riverMasks, fromTileId, edgeA) && riverEdgeSet(riverMasks, toTileId, edgeB)) return true;
    return canFollowRiverGenerously(fromTileId, toTileId, movementDirection);
  }
  return false;
}

function canFollowRiverGenerously(fromTileId, toTileId, movementDirection) {
  if (!movementDirection) return false;
  const fromRiver = shipTileHasRiver(fromTileId);
  const toRiver = shipTileHasRiver(toTileId);
  if (!fromRiver && !toRiver) return false;

  const fromCenter = tileCenterVector(fromTileId);
  const movement = normalizeOrNull(projectTangentVector(movementDirection, fromCenter));
  const targetDirection = riverNeighborDirection(fromTileId, toTileId, fromCenter);
  if (!movement || !targetDirection || dot3(movement, targetDirection) < SHIP_RIVER_TARGET_ALIGN_DOT) return false;

  if (fromRiver && riverTraversalHeadingMatches(fromTileId, movement, fromCenter)) return true;
  if (toRiver && riverTraversalHeadingMatches(toTileId, movementDirection, tileCenterVector(toTileId))) return true;
  return false;
}

function riverTraversalHeadingMatches(tileId, direction, atPosition) {
  if (!shipTileHasRiver(tileId)) return false;
  const movement = normalizeOrNull(projectTangentVector(direction, atPosition));
  if (!movement) return false;

  const mask = (riverMasks?.[tileId] || 0) | (riverToWaterMasks?.[tileId] || 0);
  const edgeCount = graph.edgeCount[tileId];
  for (let edge = 0; edge < edgeCount; edge++) {
    if ((mask & (1 << edge)) === 0) continue;
    const axis = riverEdgeTangent(tileId, edge, atPosition);
    if (axis && Math.abs(dot3(movement, axis)) >= SHIP_RIVER_HEADING_ALIGN_DOT) return true;
  }
  return false;
}

function riverNeighborDirection(tileId, neighborId, atPosition) {
  const edge = edgeIndexTowardNeighbor(tileId, neighborId);
  if (edge === undefined) return null;
  return riverEdgeTangent(tileId, edge, atPosition);
}

function riverEdgeTangent(tileId, edge, atPosition) {
  const neighborId = graph.edgeNeighbors[tileId]?.[edge];
  if (neighborId === undefined) return null;
  return normalizeOrNull(projectTangentVector(tileCenterVector(neighborId), atPosition));
}

function isShipNavigableTile(tileId) {
  return isShipOpenWaterTile(tileId) || shipTileHasRiver(tileId);
}

function isShipOpenWaterTile(tileId) {
  return isWaterSurfaceRow(earthById[tileId]) && !isShipBlockedByIceTile(tileId);
}

function isShipOceanTile(tileId) {
  return earthById[tileId]?.t === "water" && !isShipBlockedByIceTile(tileId);
}

function isShipBlockedByIceTile(tileId) {
  if (!isWaterSurfaceRow(earthById[tileId])) return false;
  return Boolean(seaIceMask?.[tileId] || freshwaterIceMask?.[tileId]);
}

function shipTileHasRiver(tileId) {
  return (riverMasks?.[tileId] || 0) !== 0;
}

function moveLocalView(dx, dy) {
  localLayout.viewX += dx * PIXELS_PER_RADIAN;
  localLayout.viewY -= dy * PIXELS_PER_RADIAN;
}

function updateShipWake(dt) {
  if (!ship) return false;
  let changed = false;
  if (ship.wakeParticles.length > 0) {
    const kept = [];
    for (const particle of ship.wakeParticles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.age < particle.ttl) kept.push(particle);
    }
    changed = kept.length !== ship.wakeParticles.length;
    ship.wakeParticles = kept;
    changed = true;
  }

  const speedPx = vectorLength(ship.velocity) * PIXELS_PER_RADIAN;
  if (speedPx < SHIP_WAKE_MIN_SPEED_PX) {
    ship.lastWakeEmit = null;
    return changed;
  }

  const source = shipWakeSourcePoint();
  const last = ship.lastWakeEmit;
  if (!last || last.frame !== source.frame || Math.hypot(source.x - last.x, source.y - last.y) > SHIP_WAKE_RESET_DISTANCE_PX) {
    emitShipWake(source, speedPx);
    ship.lastWakeEmit = source;
    return true;
  }

  const distance = Math.hypot(source.x - last.x, source.y - last.y);
  if (distance < SHIP_WAKE_EMIT_DISTANCE_PX) return changed;

  const steps = Math.max(1, Math.floor(distance / SHIP_WAKE_EMIT_DISTANCE_PX));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    emitShipWake(interpolateShipWakeSource(last, source, t), speedPx);
  }
  ship.lastWakeEmit = source;
  return true;
}

function shipWakeSourcePoint() {
  const frame = shipHeadingFrame();
  const anchor = shipWakeAnchors?.[frame];
  if (!anchor) throw new Error(`Missing ship wake anchor for frame ${frame}`);
  const positiveShoulder = translateWakeAnchor(anchor.positiveShoulder);
  const negativeShoulder = translateWakeAnchor(anchor.negativeShoulder);
  const stern = translateWakeAnchor(anchor.stern);
  return {
    x: (positiveShoulder.x + negativeShoulder.x) / 2,
    y: (positiveShoulder.y + negativeShoulder.y) / 2,
    positiveShoulder,
    negativeShoulder,
    stern,
    frame,
    heading: shipFrameScreenHeading(frame)
  };
}

function translateWakeAnchor(point) {
  return {
    x: localLayout.viewX + point.x,
    y: localLayout.viewY + point.y
  };
}

function interpolateShipWakeSource(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    positiveShoulder: interpolateWakePoint(a.positiveShoulder, b.positiveShoulder, t),
    negativeShoulder: interpolateWakePoint(a.negativeShoulder, b.negativeShoulder, t),
    stern: interpolateWakePoint(a.stern, b.stern, t),
    frame: b.frame,
    heading: b.heading
  };
}

function interpolateWakePoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function emitShipWake(source, speedPx) {
  if (!source.heading) throw new Error("Cannot emit ship wake without a frame heading");
  const heading = source.heading;
  const side = { x: -heading.y, y: heading.x };
  const sideDriftPx = speedPx * SHIP_WAKE_SIDE_SPEED_RATIO;

  emitWakeParticle(source.positiveShoulder, side, sideDriftPx, "bow");
  emitWakeParticle(source.negativeShoulder, scale2(side, -1), sideDriftPx, "bow");
  if (speedPx > SHIP_WAKE_MIN_SPEED_PX * SHIP_WAKE_STERN_BUBBLE_SPEED_RATIO) {
    emitWakeParticle(source.stern, { x: 0, y: 0 }, 0, "stern");
  }

  if (ship.wakeParticles.length > SHIP_WAKE_MAX_PARTICLES) {
    ship.wakeParticles.splice(0, ship.wakeParticles.length - SHIP_WAKE_MAX_PARTICLES);
  }
}

function emitWakeParticle(sourcePoint, direction, driftPxPerSecond, kind) {
  const sequence = ship.wakeSeedCounter;
  ship.wakeSeedCounter = (ship.wakeSeedCounter + 1) >>> 0;
  ship.wakeParticles.push({
    x: sourcePoint.x,
    y: sourcePoint.y,
    vx: direction.x * driftPxPerSecond,
    vy: direction.y * driftPxPerSecond,
    age: 0,
    ttl: wakeParticleTtl(kind),
    kind,
    seed: wakeParticleSeed(sourcePoint, sequence, kind)
  });
}

function wakeParticleTtl(kind) {
  if (kind === "stern") return SHIP_WAKE_TTL_SECONDS * 0.42;
  if (kind === "bow") return SHIP_WAKE_TTL_SECONDS;
  throw new Error(`Unknown wake particle kind: ${kind}`);
}

function wakeParticleSeed(sourcePoint, sequence, kind) {
  const x = Math.round(sourcePoint.x * 4);
  const y = Math.round(sourcePoint.y * 4);
  const kindSalt = wakeParticleKindSalt(kind);
  return hashInt(x ^ Math.imul(y, 0x45d9f3b) ^ Math.imul(sequence, 0x9e3779b1) ^ kindSalt);
}

function wakeParticleKindSalt(kind) {
  if (kind === "bow") return 0x8d701f53;
  if (kind === "stern") return 0x4f1bbcdc;
  throw new Error(`Unknown wake particle kind: ${kind}`);
}

function scale2(direction, scale) {
  return {
    x: direction.x * scale,
    y: direction.y * scale
  };
}

function fireBroadside(sideName) {
  if (!ship || !camera || !localLayout) return;
  if (sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown cannon broadside: ${sideName}`);
  }
  const broadsideCount = shipBroadsideCannonCount();
  if (broadsideCount <= 0) return;
  if (ship.cannonCooldowns[sideName] > 0) return;

  ship.cannonCooldowns[sideName] = CANNON_BROADSIDE_COOLDOWN_SECONDS;
  startCombatMusicForThreat(broadsideCount >= COMBAT_BIG_BROADSIDE_MIN_CANNONS ? "big" : "small");
  playCannonShotSound(broadsideCount);

  const heading = shipScreenHeading();
  const starboard = { x: -heading.y, y: heading.x };
  const side = sideName === "starboard" ? starboard : scale2(starboard, -1);
  const origin = { x: localLayout.viewX, y: localLayout.viewY };
  const sequenceBase = ++ship.cannonSequence;
  const sideSalt = sideName === "starboard" ? 0x51a7b04d : 0x704f1b23;
  const muzzleSpan = cannonMuzzleForeAftSpan(broadsideCount);

  for (let i = 0; i < broadsideCount; i++) {
    const lineT = broadsideCount === 1
      ? 0
      : i / (broadsideCount - 1) - 0.5;
    const seed = cannonSeed(sequenceBase, i, sideSalt, origin);
    const spread = (cannonUnit(seed, 1) * 2 - 1) * CANNON_AIM_SPREAD_RAD;
    const range = CANNON_RANGE_PX + (cannonUnit(seed, 2) * 2 - 1) * CANNON_RANGE_JITTER_PX;
    const sideJitter = (cannonUnit(seed, 3) * 2 - 1) * 0.75;
    const aim = rotate2(side, spread);
    const startX = origin.x +
      heading.x * lineT * muzzleSpan +
      side.x * (CANNON_MUZZLE_SIDE_OFFSET_PX + sideJitter);
    const startY = origin.y +
      heading.y * lineT * muzzleSpan +
      side.y * (CANNON_MUZZLE_SIDE_OFFSET_PX + sideJitter);
    const targetX = startX + aim.x * range;
    const targetY = startY + aim.y * range;
    ship.cannonballs.push({
      startX,
      startY,
      targetX,
      targetY,
      age: 0,
      duration: range / CANNON_SPEED_PX,
      arcHeight: CANNON_ARC_HEIGHT_PX + cannonUnit(seed, 4) * 4,
      damage: 1,
      seed
    });
  }

  if (ship.cannonballs.length > CANNON_MAX_BALLS) {
    ship.cannonballs.splice(0, ship.cannonballs.length - CANNON_MAX_BALLS);
  }
  dirty = true;
}

function shipBroadsideCannonCount() {
  return Math.ceil(ship.stats.cannons / 2);
}

function cannonMuzzleForeAftSpan(broadsideCount) {
  return CANNON_MUZZLE_FORE_AFT_SPAN_PX + Math.min(9, Math.max(0, broadsideCount - 7) * 0.38);
}

function updateCannons(dt) {
  if (!ship) return false;
  ship.cannonCooldowns.port = Math.max(0, ship.cannonCooldowns.port - dt);
  ship.cannonCooldowns.starboard = Math.max(0, ship.cannonCooldowns.starboard - dt);

  let changed = false;
  if (ship.cannonballs.length > 0) {
    const keptBalls = [];
    for (const ball of ship.cannonballs) {
      ball.age += dt;
      if (ball.age >= ball.duration) {
        if (resolvePlayerCannonImpact(ball)) continue;
        if (wakeMapPointIsWater(Math.round(ball.targetX), Math.round(ball.targetY), chart)) {
          addCannonSplash(ball);
        } else {
          playCannonImpactSound(Math.hypot(ball.targetX - ball.startX, ball.targetY - ball.startY));
        }
        continue;
      }
      keptBalls.push(ball);
    }
    ship.cannonballs = keptBalls;
    changed = true;
  }

  if (ship.cannonSplashes.length > 0) {
    const keptSplashes = [];
    for (const splash of ship.cannonSplashes) {
      splash.age += dt;
      if (splash.age < splash.ttl) keptSplashes.push(splash);
    }
    ship.cannonSplashes = keptSplashes;
    changed = true;
  }

  return changed;
}

function resolvePlayerCannonImpact(ball) {
  let target = null;
  let bestDistance = Infinity;
  for (const state of npcVisualShips.values()) {
    if (!shipCombatState.engagements.has(engagementKey(PLAYER_COMBAT_ID, state.id))) continue;
    const distance = Math.hypot(state.x - ball.targetX, state.y - ball.targetY);
    if (distance > NPC_COMBAT_PROJECTILE_HIT_RADIUS_PX || distance >= bestDistance) continue;
    target = state;
    bestDistance = distance;
  }
  if (!target) return false;

  playCannonImpactSound(Math.hypot(ball.targetX - ball.startX, ball.targetY - ball.startY));
  const damage = damageNpcShip(npcSeaRoutes, target.id, ball.damage);
  target.hitPoints = damage.hitPoints;
  if (damage.shouldSurrender) handleNpcSurrender(target.id, PLAYER_COMBAT_ID);
  return true;
}

function addCannonSplash(ball) {
  ship.cannonSplashes.push({
    x: Math.round(ball.targetX),
    y: Math.round(ball.targetY),
    age: 0,
    ttl: CANNON_SPLASH_TTL_SECONDS,
    seed: ball.seed
  });
  if (ship.cannonSplashes.length > CANNON_MAX_SPLASHES) {
    ship.cannonSplashes.splice(0, ship.cannonSplashes.length - CANNON_MAX_SPLASHES);
  }
}

function drawCannonEffects(activeChart) {
  if (!ship) return;
  drawCannonSplashes(activeChart);
  drawCannonBalls();
  drawNpcCombatSplashes(activeChart);
  drawNpcCombatProjectiles();
}

function drawNpcCombatProjectiles() {
  for (const ball of npcCombatProjectiles) {
    const point = cannonBallPoint(ball, ball.age);
    drawCannonTrail(ball);
    ctx.fillStyle = "rgba(18, 14, 12, 0.95)";
    ctx.fillRect(Math.round(point.x), Math.round(point.y - point.z), 1, 1);
  }
}

function drawNpcCombatSplashes(activeChart) {
  for (const splash of npcCombatSplashes) {
    if (!wakeMapPointIsWater(splash.x, splash.y, activeChart)) continue;
    const life = clamp(splash.age / splash.ttl, 0, 1);
    const alpha = Math.pow(1 - life, 1.2);
    ctx.fillStyle = `rgba(255, 253, 231, ${(0.72 * alpha).toFixed(3)})`;
    ctx.fillRect(splash.x, splash.y, 2, 1);
    ctx.fillRect(splash.x, splash.y - 1, 1, 3);
  }
}

function drawCannonBalls() {
  if (!ship.cannonballs.length) return;
  for (const ball of ship.cannonballs) {
    const point = cannonBallPoint(ball, ball.age);
    drawCannonTrail(ball);
    ctx.fillStyle = "rgba(18, 14, 12, 0.95)";
    ctx.fillRect(Math.round(point.x), Math.round(point.y - point.z), 1, 1);
  }
}

function drawCannonTrail(ball) {
  const dx = ball.targetX - ball.startX;
  const dy = ball.targetY - ball.startY;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-6) return;
  const speedPx = length / ball.duration;
  const trailLength = clamp(Math.round(speedPx / 42), 1, CANNON_TRAIL_MAX_PX);
  for (let i = trailLength; i >= 1; i--) {
    const trailAge = Math.max(0, ball.age - i / Math.max(speedPx, 1));
    const trailPoint = cannonBallPoint(ball, trailAge);
    const alpha = 0.08 + (trailLength - i) / trailLength * 0.18;
    ctx.fillStyle = `rgba(18, 14, 12, ${alpha.toFixed(3)})`;
    ctx.fillRect(Math.round(trailPoint.x), Math.round(trailPoint.y - trailPoint.z), 1, 1);
  }
}

function drawCannonSplashes(activeChart) {
  if (!ship.cannonSplashes.length) return;
  for (const splash of ship.cannonSplashes) {
    if (!wakeMapPointIsWater(splash.x, splash.y, activeChart)) continue;
    const life = clamp(splash.age / splash.ttl, 0, 1);
    const alpha = Math.pow(1 - life, 1.2);
    ctx.fillStyle = `rgba(255, 253, 231, ${(0.72 * alpha).toFixed(3)})`;
    ctx.fillRect(splash.x, splash.y, 1, 1);

    for (let i = 0; i < CANNON_SPLASH_DROP_COUNT; i++) {
      const hash = hashInt(splash.seed ^ Math.imul(i + 17, 0x9e3779b1));
      const angle = cannonUnit(hash, 5) * Math.PI * 2;
      const spread = 1 + cannonUnit(hash, 6) * (1.5 + life * 2.5);
      const rise = Math.sin(life * Math.PI) * (1 + cannonUnit(hash, 7) * 3);
      const x = Math.round(splash.x + Math.cos(angle) * spread);
      const y = Math.round(splash.y + Math.sin(angle) * spread - rise);
      ctx.fillStyle = `rgba(255, 253, 231, ${(0.54 * alpha).toFixed(3)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function cannonBallPoint(ball, age) {
  const t = clamp(age / ball.duration, 0, 1);
  return {
    x: ball.startX + (ball.targetX - ball.startX) * t,
    y: ball.startY + (ball.targetY - ball.startY) * t,
    z: Math.sin(Math.PI * t) * ball.arcHeight
  };
}

function cannonSeed(sequence, index, sideSalt, origin) {
  const ox = Math.round(origin.x * 8);
  const oy = Math.round(origin.y * 8);
  return hashInt(
    Math.imul(sequence, 0x9e3779b1) ^
    Math.imul(index + 1, 0x85ebca6b) ^
    Math.imul(ox, 0x45d9f3b) ^
    Math.imul(oy, 0x27d4eb2d) ^
    sideSalt
  );
}

function cannonUnit(seed, salt) {
  return (hashInt(seed ^ Math.imul(salt + 1, 0x7f4a7c15)) & 0xffff) / 0xffff;
}

function rotate2(direction, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: direction.x * c - direction.y * s,
    y: direction.x * s + direction.y * c
  };
}

function updateWaterAnimation(nowMs) {
  const tick = Math.floor(nowMs / WATER_REDRAW_MS);
  if (tick === waterAnimationDrawTick) return false;
  waterAnimationDrawTick = tick;
  waterAnimationClockMs = tick * WATER_REDRAW_MS;
  return true;
}

function updateWeather(dt, nowMs) {
  if (!runtimeWeather || !weatherBake) return false;
  let stormDamageChanged = false;
  if (weatherTimeScale > 0) {
    const previousClockMinutes = weatherClockMinutes;
    weatherClockMinutes += dt * weatherTimeScale / 60;
    stormDamageChanged = updateStormDamage(previousClockMinutes, weatherClockMinutes);
  }

  const dayChanged = refreshWeatherState(false);
  const tick = Math.floor(nowMs / WEATHER_REDRAW_MS);
  if (tick !== weatherDrawTick) {
    weatherDrawTick = tick;
    return weatherTimeScale > 0 || dayChanged || stormDamageChanged;
  }
  return dayChanged || stormDamageChanged;
}

function updateStormDamage(previousMinute, currentMinute) {
  if (!ship || !stormSystem || anchored || gameOverReason || currentMinute <= previousMinute) return false;
  const firstHour = Math.floor(previousMinute / 60) + 1;
  const lastHour = Math.floor(currentMinute / 60);
  let totalDamage = 0;
  let strongestIntensity = 0;
  for (let hour = firstHour; hour <= lastHour; hour++) {
    const intensity = stormIntensityAtTile(stormSystem, ship.tileId, hour * 60);
    strongestIntensity = Math.max(strongestIntensity, intensity);
    totalDamage += stormDamageForHour({
      intensity,
      seaworthiness: ship.stats.seaworthiness,
      maxHull: ship.maxHitPoints,
      hourIndex: hour,
      seed: hashInt(ship.tileId ^ Math.imul(ship.typeSlug.length + 1, 0x9e3779b1))
    });
  }
  if (totalDamage <= 0) return false;

  ship.hitPoints = Math.max(0, ship.hitPoints - totalDamage);
  stormDamageNotice = {
    damage: totalDamage,
    intensity: strongestIntensity,
    expiresAtMs: lastFrameMs + STORM_DAMAGE_NOTICE_MS
  };
  playCannonImpactSound(0);
  if (ship.hitPoints <= 0) sinkPlayerShip("Your ship foundered in the storm.");
  return true;
}

function sinkPlayerShip(reason) {
  if (gameOverReason) return;
  gameOverReason = reason;
  anchored = false;
  ship.velocity = [0, 0, 0];
  ship.wakeParticles = [];
  keys.clear();
  clearPointerSteering();
  combatMusicUntilMs = 0;
  stormMusicActive = false;
  playMusicTrack("gameOverSad", { crossfadeSeconds: MUSIC_COMBAT_CROSSFADE_SECONDS, restart: true });
}

function updateNpcShips(dt) {
  if (!npcSeaRoutes) return false;
  const economyChanged = advanceWorldEconomy(worldEconomy, weatherClockMinutes);
  const hideoutDangerChanged = updateNpcPirateHideoutPlayerThreat(npcSeaRoutes, {
    lat: latitudeDegForDirection(ship.position),
    lon: longitudeDegForDirection(ship.position),
    clockMinutes: weatherClockMinutes
  });
  const strategicChanged = updateNpcSeaRouteSystem(npcSeaRoutes, weatherClockMinutes);
  npcVisualUpdateAccumulator = Math.min(
    NPC_VISUAL_MAX_ACCUMULATED_SECONDS,
    npcVisualUpdateAccumulator + dt
  );
  if (npcVisualUpdateAccumulator < NPC_VISUAL_UPDATE_INTERVAL_SECONDS) {
    return strategicChanged || economyChanged || hideoutDangerChanged;
  }
  const visualDt = npcVisualUpdateAccumulator;
  npcVisualUpdateAccumulator = 0;
  const visualChanged = updateNpcVisualShips(visualDt);
  return strategicChanged || economyChanged || hideoutDangerChanged || visualChanged;
}

function updateNpcVisualShips(dt) {
  if (!chart || !localLayout || !camera || !directionIndex) return false;
  const snapshots = npcShipSnapshots(npcSeaRoutes, weatherClockMinutes);
  const snapshotIds = new Set();
  const offset = chartOffsetPixels(chart);
  for (const snapshot of snapshots) {
    const state = npcVisualShips.get(snapshot.id);
    if (snapshot.hidden) {
      if (state) releaseNpcVisualState(state);
      continue;
    }
    if (state) syncNpcVisualStateFromSnapshot(state, snapshot);
  }
  let changed = updateNpcCombat(dt);

  for (const snapshot of snapshots) {
    snapshotIds.add(snapshot.id);
    if (snapshot.hidden) continue;
    const routePoint = localPointForGlobeVector(snapshot.routeVector);
    let state = npcVisualShips.get(snapshot.id);
    if (!routePoint) {
      if (state && npcVisualStateIsOutside(state, offset, NPC_VISUAL_RELEASE_MARGIN_PX)) {
        releaseNpcVisualState(state);
        changed = true;
      }
      continue;
    }

    const routeScreen = { x: routePoint.x + offset.x, y: routePoint.y + offset.y };
    if (state && npcVisualStateIsOutside(state, offset, NPC_VISUAL_RELEASE_MARGIN_PX) &&
        !pointNearScreen(routeScreen, NPC_VISUAL_AUTHORITY_MARGIN_PX)) {
      releaseNpcVisualState(state);
      state = null;
      changed = true;
    }
    if (!state) {
      if (!pointNearScreen(routeScreen, NPC_VISUAL_AUTHORITY_MARGIN_PX)) continue;
      state = createNpcVisualState(snapshot, routePoint);
      if (!state) continue;
      npcVisualShips.set(snapshot.id, state);
      changed = true;
    }
    syncNpcVisualStateFromSnapshot(state, snapshot);

    const placement = nearestNpcNavigableVisualPoint(
      { x: state.x, y: state.y },
      state.heading,
      NPC_VISUAL_RECOVERY_SEARCH_PX
    ) || nearestNpcNavigableVisualPoint(
      routePoint,
      snapshot.routeHeading,
      NPC_VISUAL_RECOVERY_SEARCH_PX
    );
    if (!placement) {
      releaseNpcVisualState(state);
      changed = true;
      continue;
    }
    if (applyNpcVisualPlacement(state, placement)) changed = true;
    if (advanceNpcVisualState(state, snapshot, routePoint, dt)) changed = true;
    setNpcShipVisualNavigation(npcSeaRoutes, state.id, state.vector, state.heading);
  }

  for (const state of [...npcVisualShips.values()]) {
    if (snapshotIds.has(state.id)) continue;
    if (!npcVisualStateIsOutside(state, offset, NPC_VISUAL_RELEASE_MARGIN_PX)) continue;
    releaseNpcVisualState(state);
    changed = true;
  }
  if (updateCombatShipCollisions(dt)) changed = true;
  if (updateNpcCombatProjectiles(dt)) changed = true;
  return changed;
}

function createNpcVisualState(snapshot, routePoint) {
  const initial = nearestNpcNavigableVisualPoint(routePoint, snapshot.routeHeading);
  if (!initial) return null;
  const state = {
    id: snapshot.id,
    slug: snapshot.slug,
    factionId: snapshot.factionId,
    role: snapshot.role,
    hitPoints: snapshot.hitPoints,
    maxHitPoints: snapshot.maxHitPoints,
    combatGrace: snapshot.combatGrace,
    x: initial.x,
    y: initial.y,
    tileId: initial.tileId,
    vector: initial.vector,
    heading: initial.heading,
    routeKey: snapshot.routeKey,
    lastRouteVector: snapshot.routeVector.slice(),
    escapeDirection: null,
    escapeRemainingPx: 0,
    escapeSide: 0,
    tackSide: 0,
    tackRemainingPx: 0,
    combatMode: null,
    combatTargetId: null,
    combatEnemyIds: [],
    cannonCooldown: 0,
    cannonSequence: 0,
    collisionVelocityX: 0,
    collisionVelocityY: 0,
    stormMode: null,
    stormShelterTileId: null,
    stormReferenceTileId: null,
    stormAnchorUntilMinute: 0
  };
  setNpcShipVisualNavigation(npcSeaRoutes, state.id, state.vector, state.heading);
  return state;
}

function syncNpcVisualStateFromSnapshot(state, snapshot) {
  state.slug = snapshot.slug;
  state.factionId = snapshot.factionId;
  state.role = snapshot.role;
  state.hitPoints = snapshot.hitPoints;
  state.maxHitPoints = snapshot.maxHitPoints;
  state.combatGrace = snapshot.combatGrace;
}

function updateNpcCombat(dt) {
  if (!ship || gameOverReason) return false;
  const playerWasInCombat = playerHasCombatEngagement();
  const participantsBefore = combatParticipantIds();
  const entities = [playerCombatEntity(), ...[...npcVisualShips.values()].map(npcCombatEntity)];
  const result = updateShipCombatState(shipCombatState, entities);
  for (const id of combatParticipantIds()) {
    if (!participantsBefore.has(id)) {
      shipCombatEntryCollisionGrace.set(id, SHIP_COMBAT_ENTRY_COLLISION_GRACE_SECONDS);
    }
  }
  let changed = result.changed;
  const firstPlayerEngagement = !playerWasInCombat
    ? result.startedEngagements.find((engagement) => (
        engagement.aId === PLAYER_COMBAT_ID || engagement.bId === PLAYER_COMBAT_ID
      ))
    : null;
  const initiatingNpcId = firstPlayerEngagement
    ? (firstPlayerEngagement.aId === PLAYER_COMBAT_ID ? firstPlayerEngagement.bId : firstPlayerEngagement.aId)
    : null;
  const combatHailOpened = initiatingNpcId ? openNpcCombatHail(initiatingNpcId) : false;

  for (const state of npcVisualShips.values()) {
    state.cannonCooldown = Math.max(0, state.cannonCooldown - dt);
    const intent = result.intents.get(state.id) || null;
    const nextMode = intent?.mode || null;
    const nextTargetId = intent?.targetId || null;
    const nextEnemyIds = intent?.enemyIds || [];
    if (
      state.combatMode !== nextMode ||
      state.combatTargetId !== nextTargetId ||
      state.combatEnemyIds.join("|") !== nextEnemyIds.join("|")
    ) changed = true;
    state.combatMode = nextMode;
    state.combatTargetId = nextTargetId;
    state.combatEnemyIds = nextEnemyIds;
    if (!combatHailOpened && intent?.mode === COMBAT_MODE_ATTACK && fireNpcBroadsideAtTarget(state, intent.targetId)) {
      changed = true;
    }
  }

  if (result.intents.has(PLAYER_COMBAT_ID)) {
    const hostileCannons = Math.max(0, ...[...npcVisualShips.values()]
      .filter((state) => state.combatEnemyIds.includes(PLAYER_COMBAT_ID))
      .map((state) => shipStatsForSlug(state.slug).cannons));
    startCombatMusicForThreat(hostileCannons >= COMBAT_BIG_BROADSIDE_MIN_CANNONS ? "big" : "small");
  }
  return changed;
}

function playerHasCombatEngagement() {
  for (const engagement of shipCombatState.engagements.values()) {
    if (engagement.aId === PLAYER_COMBAT_ID || engagement.bId === PLAYER_COMBAT_ID) return true;
  }
  return false;
}

function combatParticipantIds() {
  const ids = new Set();
  for (const engagement of shipCombatState.engagements.values()) {
    ids.add(engagement.aId);
    ids.add(engagement.bId);
  }
  return ids;
}

function openNpcCombatHail(npcShipId) {
  const state = npcVisualShips.get(npcShipId);
  const character = npcShipCaptains?.get(npcShipId);
  if (!state || !character) throw new Error(`Cannot open combat hail for NPC ship ${npcShipId}`);
  openShipDialogue({ id: npcShipId, character }, { attackReason: npcCombatAttackReason(state) });
  return true;
}

function npcCombatAttackReason(state) {
  if (state.role === NPC_ROLE_PIRATE) {
    return "Your cargo and coin are ours. Heave to, or we open fire!";
  }
  if (state.role === NPC_ROLE_MERCHANT) {
    return ship.factionId === PIRATE_FACTION_ID
      ? "You sail under pirate colors. Keep away, or we will defend ourselves!"
      : "Your flag is hostile to ours. Keep away, or we will defend ourselves!";
  }
  if (ship.factionId === PIRATE_FACTION_ID) {
    return "You sail under pirate colors. Strike them, or we open fire!";
  }
  const faction = factionById(state.factionId);
  return `${faction.name} is at war with your flag. Heave to, or we open fire!`;
}

function playerCombatEntity() {
  return {
    id: PLAYER_COMBAT_ID,
    factionId: ship.factionId,
    role: NPC_ROLE_PIRATE,
    x: localLayout.viewX,
    y: localLayout.viewY,
    hitPoints: Math.max(1, ship.hitPoints),
    maxHitPoints: ship.maxHitPoints,
    cannons: ship.stats.cannons,
    topSpeedRad: ship.stats.topSpeedRad,
    combatGrace: false
  };
}

function npcCombatEntity(state) {
  const stats = shipStatsForSlug(state.slug);
  return {
    id: state.id,
    factionId: state.factionId,
    role: state.role,
    x: state.x,
    y: state.y,
    hitPoints: state.hitPoints,
    maxHitPoints: state.maxHitPoints,
    cannons: stats.cannons,
    topSpeedRad: stats.topSpeedRad,
    combatGrace: state.combatGrace
  };
}

function combatEntityPoint(entityId) {
  if (entityId === PLAYER_COMBAT_ID) {
    return ship && localLayout ? { x: localLayout.viewX, y: localLayout.viewY } : null;
  }
  const state = npcVisualShips.get(entityId);
  return state ? { x: state.x, y: state.y } : null;
}

function npcCombatNavigation(state) {
  if (!state.combatMode || state.combatGrace) return null;
  if (state.combatMode === COMBAT_MODE_FLEE) {
    let awayX = 0;
    let awayY = 0;
    for (const enemyId of state.combatEnemyIds) {
      const point = combatEntityPoint(enemyId);
      if (!point) continue;
      const dx = state.x - point.x;
      const dy = state.y - point.y;
      const length = Math.hypot(dx, dy) || 1;
      awayX += dx / length;
      awayY += dy / length;
    }
    const length = Math.hypot(awayX, awayY);
    if (length <= 1e-6) return null;
    return {
      routePoint: {
        x: state.x + awayX / length * NPC_COMBAT_NAV_TARGET_PX,
        y: state.y + awayY / length * NPC_COMBAT_NAV_TARGET_PX
      }
    };
  }

  const target = combatEntityPoint(state.combatTargetId);
  if (!target) return null;
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 1e-6) return null;
  if (distance > NPC_COMBAT_ORBIT_RANGE_PX * 1.35) return { routePoint: target };

  const direct = { x: dx / distance, y: dy / distance };
  const orbitSide = (hashInt(state.id.length * 0x45d9f3b) & 1) === 0 ? -1 : 1;
  const radialCorrection = clamp((distance - NPC_COMBAT_ORBIT_RANGE_PX) / 16, -0.8, 0.8);
  const orbit = {
    x: -direct.y * orbitSide + direct.x * radialCorrection,
    y: direct.x * orbitSide + direct.y * radialCorrection
  };
  const orbitLength = Math.hypot(orbit.x, orbit.y) || 1;
  return {
    routePoint: {
      x: state.x + orbit.x / orbitLength * NPC_COMBAT_NAV_TARGET_PX,
      y: state.y + orbit.y / orbitLength * NPC_COMBAT_NAV_TARGET_PX
    }
  };
}

function fireNpcBroadsideAtTarget(state, targetId) {
  if (state.cannonCooldown > 0 || state.combatGrace) return false;
  const target = combatEntityPoint(targetId);
  if (!target) return false;
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const distance = Math.hypot(dx, dy);
  if (distance > NPC_COMBAT_FIRE_RANGE_PX || distance <= 1e-6) return false;
  const heading = tangentToScreenDirection(state.heading);
  if (!heading) return false;
  const direct = { x: dx / distance, y: dy / distance };
  if (Math.abs(heading.x * direct.x + heading.y * direct.y) > NPC_COMBAT_BROADSIDE_DOT) return false;

  const stats = shipStatsForSlug(state.slug);
  if (stats.cannons <= 0) return false;
  const volleyCount = Math.min(4, Math.max(1, Math.ceil(stats.cannons / 10)));
  state.cannonCooldown = NPC_COMBAT_COOLDOWN_SECONDS;
  state.cannonSequence += 1;
  playCannonShotSound(Math.ceil(stats.cannons / 2));
  startCombatMusicForThreat(stats.cannons >= COMBAT_BIG_BROADSIDE_MIN_CANNONS ? "big" : "small");

  for (let index = 0; index < volleyCount; index++) {
    const seed = cannonSeed(state.cannonSequence, index, state.id.length * 0x51a7, state);
    const jitterX = (cannonUnit(seed, 1) * 2 - 1) * 7;
    const jitterY = (cannonUnit(seed, 2) * 2 - 1) * 7;
    const targetX = target.x + jitterX;
    const targetY = target.y + jitterY;
    const range = Math.hypot(targetX - state.x, targetY - state.y);
    npcCombatProjectiles.push({
      ownerId: state.id,
      targetId,
      startX: state.x,
      startY: state.y,
      targetX,
      targetY,
      age: 0,
      duration: range / CANNON_SPEED_PX,
      arcHeight: CANNON_ARC_HEIGHT_PX + cannonUnit(seed, 3) * 3,
      damage: 1,
      seed
    });
  }
  if (npcCombatProjectiles.length > NPC_COMBAT_MAX_PROJECTILES) {
    npcCombatProjectiles.splice(0, npcCombatProjectiles.length - NPC_COMBAT_MAX_PROJECTILES);
  }
  return true;
}

function updateNpcCombatProjectiles(dt) {
  let changed = false;
  const kept = [];
  for (const ball of npcCombatProjectiles) {
    ball.age += dt;
    if (ball.age < ball.duration) {
      kept.push(ball);
      changed = true;
      continue;
    }
    resolveNpcCombatImpact(ball);
    changed = true;
  }
  npcCombatProjectiles = kept;

  const splashes = [];
  for (const splash of npcCombatSplashes) {
    splash.age += dt;
    if (splash.age < splash.ttl) splashes.push(splash);
  }
  if (splashes.length !== npcCombatSplashes.length || splashes.length > 0) changed = true;
  npcCombatSplashes = splashes;
  return changed;
}

function resolveNpcCombatImpact(ball) {
  const target = combatEntityPoint(ball.targetId);
  const active = shipCombatState.engagements.has(engagementKey(ball.ownerId, ball.targetId));
  if (
    !target ||
    !active ||
    Math.hypot(target.x - ball.targetX, target.y - ball.targetY) > NPC_COMBAT_PROJECTILE_HIT_RADIUS_PX
  ) {
    addNpcCombatSplash(ball);
    return;
  }

  playCannonImpactSound(Math.hypot(ball.targetX - ball.startX, ball.targetY - ball.startY));
  if (ball.targetId === PLAYER_COMBAT_ID) {
    ship.hitPoints = Math.max(0, ship.hitPoints - ball.damage);
    if (ship.hitPoints <= 0) sinkPlayerShip("Your ship was sunk in battle.");
    return;
  }

  const damage = damageNpcShip(npcSeaRoutes, ball.targetId, ball.damage);
  const state = npcVisualShips.get(ball.targetId);
  if (state) state.hitPoints = damage.hitPoints;
  if (damage.shouldSurrender) handleNpcSurrender(ball.targetId, ball.ownerId);
}

function addNpcCombatSplash(ball) {
  npcCombatSplashes.push({
    x: Math.round(ball.targetX),
    y: Math.round(ball.targetY),
    age: 0,
    ttl: CANNON_SPLASH_TTL_SECONDS,
    seed: ball.seed
  });
}

function handleNpcSurrender(loserId, winnerId, options = {}) {
  const npcWinnerId = winnerId === PLAYER_COMBAT_ID ? null : winnerId;
  const loserFactionId =
    npcSeaRoutes.shipById.get(loserId)?.factionId ||
    npcVisualShips.get(loserId)?.factionId ||
    null;
  const loot = surrenderNpcShip(npcSeaRoutes, loserId, npcWinnerId, options);
  if (winnerId === PLAYER_COMBAT_ID) {
    const received = receiveSurrenderedLoot(gameState, loot, { simMinute: weatherClockMinutes });
    if (loserFactionId) recordPlayerAttackConsequences(loserId, loserFactionId);
    syncShipCargoFromGameState();
    if (loot.specie > 0) playCoinClinkSound();
    const cargoQuantity = Object.values(received.cargo).reduce((sum, quantity) => sum + quantity, 0);
    combatNotice = {
      text: `SHIP SURRENDERED  +${received.specie} DB${cargoQuantity > 0 ? `  +${cargoQuantity} CARGO` : ""}`,
      expiresAtMs: lastFrameMs + COMBAT_NOTICE_MS
    };
  }
  clearCombatForShip(loserId);
  const state = npcVisualShips.get(loserId);
  if (state) {
    const strategic = npcSeaRoutes.shipById.get(loserId);
    state.hitPoints = strategic.hitPoints;
    state.combatGrace = true;
    state.combatMode = null;
    state.combatTargetId = null;
    state.combatEnemyIds = [];
  }
  npcCombatProjectiles = npcCombatProjectiles.filter((ball) => ball.ownerId !== loserId && ball.targetId !== loserId);
}

function clearCombatForShip(shipId) {
  for (const [key, engagement] of [...shipCombatState.engagements.entries()]) {
    if (engagement.aId === shipId || engagement.bId === shipId) shipCombatState.engagements.delete(key);
  }
}

function updateCombatShipCollisions(dt) {
  updateShipCollisionCooldowns(dt);
  updateShipCombatEntryCollisionGrace(dt);
  if (!ship || gameOverReason || shipCombatState.engagements.size === 0) return false;
  const ids = [...combatParticipantIds()];
  let changed = false;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = combatCollisionBody(ids[i]);
      const b = combatCollisionBody(ids[j]);
      if (!a || !b) continue;
      if (shipCombatEntryCollisionGrace.has(a.id) || shipCombatEntryCollisionGrace.has(b.id)) {
        const separation = separateTouchingShips(a, b, SHIP_COMBAT_ENTRY_SEPARATION_PX);
        if (separation) {
          applyCombatCollisionSeparation(a.id, b.id, separation);
          changed = true;
        }
        continue;
      }
      const collision = resolveShipCollision(a, b);
      if (!collision) continue;
      applyCombatCollisionSeparation(a.id, b.id, collision);
      applyCombatCollisionVelocity(a.id, collision.a.vx, collision.a.vy);
      applyCombatCollisionVelocity(b.id, collision.b.vx, collision.b.vy);
      const key = engagementKey(a.id, b.id);
      if ((shipCollisionCooldowns.get(key) || 0) <= 0 && (collision.a.damage > 0 || collision.b.damage > 0)) {
        applyCombatCollisionDamage(a.id, collision.a.damage, b.id);
        applyCombatCollisionDamage(b.id, collision.b.damage, a.id);
        shipCollisionCooldowns.set(key, SHIP_COLLISION_DAMAGE_COOLDOWN_SECONDS);
        playCannonImpactSound(0);
      }
      changed = true;
      if (gameOverReason) return true;
    }
  }
  return changed;
}

function updateShipCombatEntryCollisionGrace(dt) {
  for (const [id, remaining] of [...shipCombatEntryCollisionGrace.entries()]) {
    const next = remaining - dt;
    if (next <= 0) shipCombatEntryCollisionGrace.delete(id);
    else shipCombatEntryCollisionGrace.set(id, next);
  }
}

function updateShipCollisionCooldowns(dt) {
  for (const [key, remaining] of [...shipCollisionCooldowns.entries()]) {
    const next = remaining - dt;
    if (next <= 0) shipCollisionCooldowns.delete(key);
    else shipCollisionCooldowns.set(key, next);
  }
}

function combatCollisionBody(id) {
  if (id === PLAYER_COMBAT_ID) {
    if (!localLayout || !camera) return null;
    const heading = shipScreenHeading();
    return {
      id,
      x: localLayout.viewX,
      y: localLayout.viewY,
      vx: dot3(ship.velocity, camera.right) * PIXELS_PER_RADIAN,
      vy: -dot3(ship.velocity, camera.up) * PIXELS_PER_RADIAN,
      headingX: heading.x,
      headingY: heading.y,
      mass: ship.stats.mass,
      radius: shipCollisionRadius(ship.stats.mass)
    };
  }
  const state = npcVisualShips.get(id);
  if (!state || state.combatGrace) return null;
  const stats = shipStatsForSlug(state.slug);
  const heading = npcShipScreenHeading(state.heading);
  const baseVelocity = npcCollisionBaseVelocity(state, heading);
  return {
    id,
    x: state.x,
    y: state.y,
    vx: baseVelocity.x + state.collisionVelocityX,
    vy: baseVelocity.y + state.collisionVelocityY,
    headingX: heading.x,
    headingY: heading.y,
    mass: stats.mass,
    radius: shipCollisionRadius(stats.mass)
  };
}

function npcCollisionBaseVelocity(state, heading = npcShipScreenHeading(state.heading)) {
  const speed = state.combatMode ? NPC_COMBAT_RESPONSE_SPEED_PX : 0;
  return { x: heading.x * speed, y: heading.y * speed };
}

function applyCombatCollisionVelocity(id, vx, vy) {
  if (id === PLAYER_COMBAT_ID) {
    const scale = 1 / PIXELS_PER_RADIAN;
    ship.velocity = projectTangentVector([
      camera.right[0] * vx * scale - camera.up[0] * vy * scale,
      camera.right[1] * vx * scale - camera.up[1] * vy * scale,
      camera.right[2] * vx * scale - camera.up[2] * vy * scale
    ], ship.position);
    return;
  }
  const state = npcVisualShips.get(id);
  if (!state) return;
  const baseVelocity = npcCollisionBaseVelocity(state);
  state.collisionVelocityX = vx - baseVelocity.x;
  state.collisionVelocityY = vy - baseVelocity.y;
}

function applyCombatCollisionSeparation(aId, bId, collision) {
  if (aId === PLAYER_COMBAT_ID) {
    applyNpcCollisionCorrection(
      bId,
      collision.b.correctionX - collision.a.correctionX,
      collision.b.correctionY - collision.a.correctionY
    );
    return;
  }
  if (bId === PLAYER_COMBAT_ID) {
    applyNpcCollisionCorrection(
      aId,
      collision.a.correctionX - collision.b.correctionX,
      collision.a.correctionY - collision.b.correctionY
    );
    return;
  }
  applyNpcCollisionCorrection(aId, collision.a.correctionX, collision.a.correctionY);
  applyNpcCollisionCorrection(bId, collision.b.correctionX, collision.b.correctionY);
}

function applyNpcCollisionCorrection(id, dx, dy) {
  const state = npcVisualShips.get(id);
  const distance = Math.hypot(dx, dy);
  if (!state || distance <= 1e-4) return false;
  const move = attemptNpcVisualStep(
    state,
    { x: dx / distance, y: dy / distance },
    Math.min(distance, NPC_VISUAL_MAX_STEP_PX),
    state.heading
  );
  return move?.ok ? applyNpcVisualPlacement(state, move) : false;
}

function applyCombatCollisionDamage(id, amount, otherId) {
  if (amount <= 0) return;
  if (id === PLAYER_COMBAT_ID) {
    ship.hitPoints = Math.max(0, ship.hitPoints - amount);
    combatNotice = {
      text: `COLLISION  -${amount} HULL`,
      expiresAtMs: lastFrameMs + COMBAT_NOTICE_MS
    };
    if (ship.hitPoints <= 0) sinkPlayerShip("Your ship was sunk in a collision.");
    return;
  }
  const damage = damageNpcShip(npcSeaRoutes, id, amount);
  const state = npcVisualShips.get(id);
  if (state) state.hitPoints = damage.hitPoints;
  if (!damage.shouldSurrender || !state) return;
  const directEnemy = shipCombatState.engagements.has(engagementKey(id, otherId));
  const winnerId = directEnemy ? otherId : state.combatTargetId;
  if (winnerId) handleNpcSurrender(id, winnerId);
}

function applyNpcVisualPlacement(state, placement) {
  const changed = state.x !== placement.x ||
    state.y !== placement.y ||
    state.tileId !== placement.tileId ||
    vectorArcDistance(state.vector, placement.vector) > 1e-8;
  state.x = placement.x;
  state.y = placement.y;
  state.tileId = placement.tileId;
  state.vector = placement.vector;
  state.heading = placement.heading;
  return changed;
}

function advanceNpcVisualState(state, snapshot, routePoint, dt) {
  const collisionChanged = applyNpcCollisionDrift(state, dt);
  const routeChanged = state.routeKey !== snapshot.routeKey;
  const routeAdvancePx = state.routeKey === snapshot.routeKey
    ? vectorArcDistance(state.lastRouteVector, snapshot.routeVector) * PIXELS_PER_RADIAN
    : 0;
  state.routeKey = snapshot.routeKey;
  state.lastRouteVector = snapshot.routeVector.slice();
  if (routeChanged) {
    clearNpcEscapeManeuver(state, true);
    clearNpcTackManeuver(state);
  }

  const stormNavigation = npcStormNavigation(state);
  if (stormNavigation?.anchored) return collisionChanged;
  const combatNavigation = stormNavigation ? null : npcCombatNavigation(state);
  const navigationPoint = stormNavigation?.routePoint || combatNavigation?.routePoint || routePoint;

  const dx = navigationPoint.x - state.x;
  const dy = navigationPoint.y - state.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= NPC_VISUAL_TARGET_TOLERANCE_PX) return collisionChanged;

  const catchupPx = Math.min(
    Math.max(0, distance - NPC_VISUAL_TARGET_TOLERANCE_PX),
    NPC_VISUAL_CATCHUP_SPEED_PX * dt
  );
  const stormResponsePx = state.stormMode === "seeking"
    ? NPC_STORM_SHELTER_SPEED_PX * dt
    : 0;
  const combatResponsePx = combatNavigation ? NPC_COMBAT_RESPONSE_SPEED_PX * dt : 0;
  const stepDistance = Math.min(
    distance,
    NPC_VISUAL_MAX_STEP_PX,
    Math.max(routeAdvancePx + catchupPx, stormResponsePx, combatResponsePx)
  );
  if (stepDistance <= 1e-4) return collisionChanged;

  const routeDirection = { x: dx / distance, y: dy / distance };
  const stats = shipStatsForSlug(state.slug);
  const startNav = shipNavigabilityAtLocalPoint(state.x, state.y, state.tileId, state.vector);
  let direction = routeDirection;
  let tack = null;
  if (startNav.ok && startNav.kind !== "river") {
    const wind = windForTile(state.tileId);
    const flowDir = wind.directionRad + Math.PI;
    const windFlowDirection = { x: Math.cos(flowDir), y: -Math.sin(flowDir) };
    let preferredTackSide = state.tackSide;
    if (state.tackSide !== 0 && state.tackRemainingPx <= 0) {
      preferredTackSide = -state.tackSide;
    }
    tack = chooseNpcSailingDirection({
      desiredDirection: routeDirection,
      windFlowDirection,
      stallAngleRad: stats.upwindStallAngleRad,
      currentDirection: tangentToScreenDirection(state.heading) || routeDirection,
      preferredTackSide
    });
    direction = tack.direction;
    if (tack.tacking && (state.tackSide !== tack.tackSide || state.tackRemainingPx <= 0)) {
      state.tackSide = tack.tackSide;
      state.tackRemainingPx = NPC_VISUAL_TACK_LEG_PX;
    } else if (!tack.tacking) {
      clearNpcTackManeuver(state);
    }
  } else {
    clearNpcTackManeuver(state);
  }

  const desiredHeading = screenDirectionToTangent(direction, state.vector, state.heading);
  const collisionHeading = rotateTangentToward(
    state.heading,
    desiredHeading,
    state.vector,
    stats.turnRateRad * dt
  );
  const move = moveNpcVisualShip(state, direction, stepDistance, collisionHeading, dt);
  if (!move) return collisionChanged;

  state.x = move.x;
  state.y = move.y;
  state.tileId = move.tileId;
  state.vector = move.vector;
  state.heading = move.heading;
  if (tack?.tacking) {
    state.tackRemainingPx = Math.max(0, state.tackRemainingPx - stepDistance);
  }
  return true;
}

function applyNpcCollisionDrift(state, dt) {
  const speed = Math.hypot(state.collisionVelocityX, state.collisionVelocityY);
  if (speed < NPC_COLLISION_VELOCITY_MIN_PX) {
    state.collisionVelocityX = 0;
    state.collisionVelocityY = 0;
    return false;
  }
  const direction = {
    x: state.collisionVelocityX / speed,
    y: state.collisionVelocityY / speed
  };
  const move = attemptNpcVisualStep(
    state,
    direction,
    Math.min(NPC_VISUAL_MAX_STEP_PX, speed * dt),
    state.heading
  );
  const damping = Math.exp(-NPC_COLLISION_VELOCITY_DAMPING * dt);
  state.collisionVelocityX *= damping;
  state.collisionVelocityY *= damping;
  if (!move?.ok) {
    state.collisionVelocityX = 0;
    state.collisionVelocityY = 0;
    return false;
  }
  return applyNpcVisualPlacement(state, move);
}

function moveNpcVisualShip(state, direction, distance, heading, dt) {
  const startNav = shipNavigabilityAtLocalPoint(state.x, state.y, state.tileId, state.vector);
  if (!startNav.ok) throw new Error(`NPC ship ${state.id} started outside drawn navigation`);
  if (startNav.kind === "river") {
    const conveyorMove = moveNpcAlongRiverConveyor(state, direction, distance, heading, dt);
    if (conveyorMove) {
      clearNpcEscapeManeuver(state);
      return conveyorMove;
    }
  }
  if (state.escapeDirection && state.escapeRemainingPx > 0) {
    const traveledPx = NPC_VISUAL_ESCAPE_COMMIT_PX - state.escapeRemainingPx;
    const routeClearPx = traveledPx >= NPC_VISUAL_ESCAPE_REJOIN_AFTER_PX
      ? npcEscapeClearDistance(state, direction, heading)
      : 0;
    if (routeClearPx >= NPC_VISUAL_ESCAPE_REJOIN_CLEAR_PX) {
      clearNpcEscapeManeuver(state);
    }
  }
  if (state.escapeDirection && state.escapeRemainingPx > 0) {
    const escapeMove = attemptNpcVisualStep(state, state.escapeDirection, distance, heading);
    if (escapeMove.ok) {
      state.escapeRemainingPx = Math.max(0, state.escapeRemainingPx - distance);
      if (state.escapeRemainingPx === 0) state.escapeDirection = null;
      return escapeMove;
    }
    clearNpcEscapeManeuver(state);
  }

  const guide = npcRiverNavigationDirection(state, direction, startNav.kind);
  const baseDirections = guide
    ? [
        blendRiverNavigationDirections(direction, guide, 0.5),
        blendRiverNavigationDirections(direction, guide, 0.78),
        guide,
        direction
      ].filter(Boolean)
    : [direction];
  const tried = new Set();

  for (const baseDirection of baseDirections) {
    const result = attemptNpcVisualStep(state, baseDirection, distance, heading);
    if (result.ok) return result;
  }

  const slideDirections = [];
  for (const baseDirection of baseDirections) {
    for (const angle of SHIP_COLLISION_SLIDE_SEARCH_ANGLES_RAD.slice(1)) {
      const candidateDirection = rotate2(baseDirection, angle);
      const key = `${Math.round(candidateDirection.x * 1000)},${Math.round(candidateDirection.y * 1000)}`;
      if (tried.has(key)) continue;
      tried.add(key);
      const alignment = direction.x * candidateDirection.x + direction.y * candidateDirection.y;
      const minAlignment = guide ? -0.5 : SHIP_COLLISION_SLIDE_SEARCH_MIN_ALIGN;
      if (alignment < minAlignment) continue;
      slideDirections.push(candidateDirection);
    }
  }

  const slide = slideDirections.length > 0
    ? chooseNpcEscapeDirection({
        desiredDirection: direction,
        currentDirection: tangentToScreenDirection(state.heading) || direction,
        candidateDirections: slideDirections,
        clearDistanceFor: (candidateDirection) => npcEscapeClearDistance(state, candidateDirection, heading),
        preferredSide: state.escapeSide
      })
    : null;
  if (slide) {
    const slideMove = attemptNpcVisualStep(state, slide.direction, distance, heading);
    if (slideMove.ok) {
      commitNpcEscapeManeuver(state, slide.direction, slide.side, distance);
      return slideMove;
    }
  }

  const escape = chooseNpcEscapeDirection({
    desiredDirection: direction,
    currentDirection: tangentToScreenDirection(state.heading) || direction,
    candidateDirections: NPC_VISUAL_ESCAPE_ANGLES_RAD.map((angle) => rotate2(direction, angle)),
    clearDistanceFor: (candidateDirection) => npcEscapeClearDistance(state, candidateDirection, heading),
    preferredSide: state.escapeSide
  });
  if (!escape) return null;

  const escapeMove = attemptNpcVisualStep(state, escape.direction, distance, heading);
  if (!escapeMove.ok) return null;
  commitNpcEscapeManeuver(state, escape.direction, escape.side, distance);
  return escapeMove;
}

function moveNpcAlongRiverConveyor(state, desiredDirection, distance, heading, dt) {
  const centerline = nearestRiverCenterlineInfoAtLocalPoint(
    state.x,
    state.y,
    chart,
    desiredDirection
  );
  if (!centerline?.path || !Number.isFinite(centerline.pathT)) return null;

  const tangentAlignment = centerline.tangent.x * desiredDirection.x +
    centerline.tangent.y * desiredDirection.y;
  const directionSign = tangentAlignment >= 0 ? 1 : -1;
  const target = advanceRiverCenterline(
    centerline.path,
    centerline.pathT,
    distance,
    directionSign
  );
  const targetX = target.x + centerline.pathOffsetX;
  const targetY = target.y + centerline.pathOffsetY;
  const centerDx = centerline.centerlineX - state.x;
  const centerDy = centerline.centerlineY - state.y;
  const centerDistance = Math.hypot(centerDx, centerDy);
  const centerStep = Math.min(centerDistance, NPC_RIVER_CONVEYOR_CENTERING_SPEED_PX * dt);
  const correctionScale = centerDistance > 1e-6 ? centerStep / centerDistance : 0;
  const dx = targetX - centerline.centerlineX + centerDx * correctionScale;
  const dy = targetY - centerline.centerlineY + centerDy * correctionScale;
  const moveDistance = Math.hypot(dx, dy);
  if (moveDistance <= 1e-6) return null;

  const direction = { x: dx / moveDistance, y: dy / moveDistance };
  return npcRiverConveyorPlacement(
    state,
    state.x + dx,
    state.y + dy,
    direction,
    heading
  );
}

function npcRiverConveyorPlacement(state, x, y, movementDirection, heading) {
  const nearest = nearestLocalCollisionTileAtPoint(x, y);
  if (!nearest || nearest.distancePx > SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX) return null;
  const vector = globePositionForLocalPoint(nearest.tileId, x, y);
  const nav = shipNavigabilityAtLocalPoint(x, y, nearest.tileId, vector);
  if (!nav.ok || (nav.kind !== "river" && nav.kind !== "openWater")) return null;
  const movementHeading = screenDirectionToTangent(movementDirection, state.vector, heading);
  const localHeading = normalizeTangentOrFallback(heading, vector, movementHeading);
  return {
    ok: true,
    x,
    y,
    tileId: nearest.tileId,
    vector,
    heading: localHeading
  };
}

function npcEscapeClearDistance(state, direction, heading) {
  let clearDistance = 0;
  for (const distance of NPC_VISUAL_ESCAPE_PROBE_DISTANCES_PX) {
    const probe = attemptNpcVisualStep(state, direction, distance, heading);
    if (!probe.ok) break;
    clearDistance = distance;
  }
  return clearDistance;
}

function commitNpcEscapeManeuver(state, direction, side, distance) {
  state.escapeDirection = direction;
  state.escapeRemainingPx = Math.max(0, NPC_VISUAL_ESCAPE_COMMIT_PX - distance);
  if (side !== 0) state.escapeSide = side;
}

function clearNpcEscapeManeuver(state, resetSide = false) {
  state.escapeDirection = null;
  state.escapeRemainingPx = 0;
  if (resetSide) state.escapeSide = 0;
}

function clearNpcTackManeuver(state) {
  state.tackSide = 0;
  state.tackRemainingPx = 0;
}

function npcStormNavigation(state) {
  const currentIntensity = stormIntensityForTile(state.tileId);
  if (state.stormMode === "anchored") {
    const referenceIntensity = state.stormReferenceTileId === null
      ? currentIntensity
      : stormIntensityForTile(state.stormReferenceTileId);
    if (
      weatherClockMinutes >= state.stormAnchorUntilMinute &&
      referenceIntensity < NPC_STORM_RELEASE_INTENSITY
    ) {
      clearNpcStormManeuver(state);
      return null;
    }
    return { anchored: true };
  }

  if (state.stormMode === "seeking") {
    const referenceIntensity = state.stormReferenceTileId === null
      ? currentIntensity
      : stormIntensityForTile(state.stormReferenceTileId);
    if (currentIntensity < NPC_STORM_RELEASE_INTENSITY && referenceIntensity < NPC_STORM_RELEASE_INTENSITY) {
      clearNpcStormManeuver(state);
      return null;
    }
    if (npcVisualStateIsNearShore(state)) {
      anchorNpcForStorm(state);
      return { anchored: true };
    }
    const routePoint = npcStormShelterRoutePoint(state);
    return routePoint ? { anchored: false, routePoint } : null;
  }

  if (currentIntensity < STORM_DAMAGE_INTENSITY) return null;
  const shelterTileId = nearestStormShelterTile(stormSystem, state.tileId);
  if (shelterTileId === null) return null;
  state.stormMode = "seeking";
  state.stormShelterTileId = shelterTileId;
  state.stormReferenceTileId = state.tileId;
  state.stormAnchorUntilMinute = 0;
  clearNpcEscapeManeuver(state, true);
  clearNpcTackManeuver(state);
  if (npcVisualStateIsNearShore(state)) {
    anchorNpcForStorm(state);
    return { anchored: true };
  }
  const routePoint = npcStormShelterRoutePoint(state);
  return routePoint ? { anchored: false, routePoint } : null;
}

function npcStormShelterRoutePoint(state) {
  if (state.stormShelterTileId === null) return null;
  const nextTileId = nextStormShelterTile(stormSystem, state.tileId) ?? state.stormShelterTileId;
  const shelterVector = tileCenterVector(nextTileId);
  const localPoint = localPointForGlobeVector(shelterVector);
  if (localPoint) return localPoint;

  const tangent = normalizeOrNull(projectTangentVector(shelterVector, state.vector));
  const direction = tangent ? tangentToScreenDirection(tangent) : null;
  if (!direction) return null;
  return {
    x: state.x + direction.x * NPC_STORM_FAR_TARGET_PX,
    y: state.y + direction.y * NPC_STORM_FAR_TARGET_PX,
    tileId: state.stormShelterTileId
  };
}

function npcVisualStateIsNearShore(state) {
  if (!chart) return false;
  const maxDistance2 = ANCHOR_SHORE_MAX_PX * ANCHOR_SHORE_MAX_PX;
  for (const call of chart.tileCalls) {
    if (isWaterSurfaceRow(call.row)) continue;
    if (distance2(state.x, state.y, call.x, call.y) <= maxDistance2) return true;
  }
  return false;
}

function anchorNpcForStorm(state) {
  state.stormMode = "anchored";
  state.stormAnchorUntilMinute = weatherClockMinutes + NPC_STORM_MIN_ANCHOR_MINUTES;
  clearNpcEscapeManeuver(state, true);
  clearNpcTackManeuver(state);
}

function clearNpcStormManeuver(state) {
  state.stormMode = null;
  state.stormShelterTileId = null;
  state.stormReferenceTileId = null;
  state.stormAnchorUntilMinute = 0;
  clearNpcEscapeManeuver(state, true);
  clearNpcTackManeuver(state);
}

function npcRiverNavigationDirection(state, desiredDirection, currentKind) {
  const gateway = riverGatewayDirectionAtLocalPoint(state.x, state.y, currentKind, desiredDirection);
  if (gateway) return gateway;
  if (currentKind !== "river") return null;

  const headingDirection = tangentToScreenDirection(state.heading) || desiredDirection;
  const centerline = nearestRiverCenterlineInfoAtLocalPoint(state.x, state.y, chart, desiredDirection);
  const call = chart?.tileById.get(state.tileId);
  const mask = call
    ? (riverMasks?.[state.tileId] || 0) | (riverToWaterMasks?.[state.tileId] || 0)
    : 0;
  const endpoints = call && mask !== 0
    ? riverEndpointsForTile(call, chart, mask).map((endpoint) => ({
        x: call.drawSurfaceX - TILE_ART_HALF + endpoint.x,
        y: call.drawSurfaceY - TILE_ART_HALF + endpoint.y
      }))
    : [];
  const channelDirection = chooseRiverChannelDirection({
    x: state.x,
    y: state.y,
    desiredDirection,
    headingDirection,
    endpoints
  });
  if (!centerline) return channelDirection;
  return steerAlongRiverCenterline({
    desiredDirection,
    headingDirection,
    tangent: centerline.tangent,
    outwardNormal: centerline.normal,
    centerlineDistance: centerline.centerlineDistance,
    channelDirection
  });
}

function attemptNpcVisualStep(state, direction, distance, heading) {
  const segments = Math.max(1, Math.ceil(distance / SHIP_COLLISION_SAMPLE_STEP_PX));
  const movementHeading = screenDirectionToTangent(direction, state.vector, heading);
  const startNav = shipNavigabilityAtLocalPoint(state.x, state.y, state.tileId, state.vector);
  if (!startNav.ok) throw new Error(`NPC ship ${state.id} started outside drawn navigation`);
  let previousTileId = state.tileId;
  let previousNavKind = startNav.kind;
  let result = null;

  for (let i = 1; i <= segments; i++) {
    const x = state.x + direction.x * distance * (i / segments);
    const y = state.y + direction.y * distance * (i / segments);
    const tileId = localCollisionTileIdAtPoint(x, y, `NPC ship ${state.id}`);
    const vector = globePositionForLocalPoint(tileId, x, y);
    const localHeading = normalizeTangentOrFallback(heading, vector, movementHeading);
    const nav = shipNavigabilityAtLocalPoint(x, y, tileId, vector);
    if (!nav.ok) return { ok: false };
    if (!movementCanUseDrawnNavigation(previousTileId, tileId, previousNavKind, nav.kind, movementHeading)) {
      return { ok: false };
    }
    const occupancy = vesselOccupancyAtPosition(vector, tileId, { x, y }, nav, localHeading);
    if (!occupancy.ok) return { ok: false };
    result = { ok: true, x, y, tileId, vector, heading: localHeading };
    previousTileId = tileId;
    previousNavKind = nav.kind;
  }
  return result || { ok: false };
}

function nearestNpcNavigableVisualPoint(routePoint, heading, searchRadiusPx = NPC_VISUAL_ACTIVATION_SEARCH_PX) {
  const direct = npcNavigableVisualPoint(routePoint.x, routePoint.y, heading);
  if (direct) return direct;

  const routeTile = nearestLocalCollisionTileAtPoint(routePoint.x, routePoint.y);
  if (routeTile && routeTile.distancePx <= SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX &&
      shipTileHasRiver(routeTile.tileId) && !isShipOpenWaterTile(routeTile.tileId)) {
    const riverPlacement = nearestNpcVisualPointOfKind(routePoint, heading, "river", searchRadiusPx);
    if (riverPlacement) return riverPlacement;
  }

  const nearbyWater = wakeWaterCandidatesForPoint(routePoint.x, routePoint.y, chart.waterIndex)
    .filter((entry) => entry.kind === "tile" && isShipOpenWaterTile(entry.call.id))
    .map((entry) => ({
      x: entry.call.x,
      y: entry.call.y,
      distance: Math.hypot(entry.call.x - routePoint.x, entry.call.y - routePoint.y)
    }))
    .filter((entry) => entry.distance <= searchRadiusPx)
    .sort((a, b) => a.distance - b.distance);
  for (const point of nearbyWater) {
    const candidate = npcNavigableVisualPoint(point.x, point.y, heading);
    if (candidate) return candidate;
  }

  for (let radius = SHIP_COLLISION_SAMPLE_STEP_PX; radius <= searchRadiusPx; radius += SHIP_COLLISION_SAMPLE_STEP_PX) {
    for (let i = 0; i < NPC_VISUAL_ACTIVATION_ANGLE_COUNT; i++) {
      const angle = i / NPC_VISUAL_ACTIVATION_ANGLE_COUNT * Math.PI * 2;
      const candidate = npcNavigableVisualPoint(
        routePoint.x + Math.cos(angle) * radius,
        routePoint.y + Math.sin(angle) * radius,
        heading
      );
      if (candidate) return candidate;
    }
  }
  return null;
}

function nearestNpcVisualPointOfKind(routePoint, heading, kind, searchRadiusPx) {
  for (let radius = SHIP_COLLISION_SAMPLE_STEP_PX; radius <= searchRadiusPx; radius += SHIP_COLLISION_SAMPLE_STEP_PX) {
    for (let i = 0; i < NPC_VISUAL_ACTIVATION_ANGLE_COUNT; i++) {
      const angle = i / NPC_VISUAL_ACTIVATION_ANGLE_COUNT * Math.PI * 2;
      const candidate = npcNavigableVisualPoint(
        routePoint.x + Math.cos(angle) * radius,
        routePoint.y + Math.sin(angle) * radius,
        heading
      );
      if (candidate?.navKind === kind) return candidate;
    }
  }
  return null;
}

function npcNavigableVisualPoint(x, y, heading) {
  const nearest = nearestLocalCollisionTileAtPoint(x, y);
  if (!nearest || nearest.distancePx > SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX) return null;
  const tileId = nearest.tileId;
  const vector = globePositionForLocalPoint(tileId, x, y);
  const localHeading = normalizeTangentOrFallback(heading, vector, WORLD_NORTH);
  const nav = shipNavigabilityAtLocalPoint(x, y, tileId, vector);
  if (!nav.ok) return null;
  const occupancy = vesselOccupancyAtPosition(vector, tileId, { x, y }, nav, localHeading);
  if (!occupancy.ok) return null;
  return { x, y, tileId, vector, heading: localHeading, navKind: nav.kind };
}

function localPointForGlobeVector(vector) {
  const tileId = findNearestTileId(graph, directionIndex, vector);
  const layout = localLayout.positions.get(tileId);
  if (!layout) return null;
  const center = tileCenterVector(tileId);
  const delta = [
    vector[0] - center[0],
    vector[1] - center[1],
    vector[2] - center[2]
  ];
  return {
    x: layout.x + dot3(delta, camera.right) * PIXELS_PER_RADIAN,
    y: layout.y - dot3(delta, camera.up) * PIXELS_PER_RADIAN,
    tileId
  };
}

function screenDirectionToTangent(direction, position, fallback) {
  return normalizeOrNull(projectTangentVector([
    camera.right[0] * direction.x - camera.up[0] * direction.y,
    camera.right[1] * direction.x - camera.up[1] * direction.y,
    camera.right[2] * direction.x - camera.up[2] * direction.y
  ], position)) || normalizeTangentOrFallback(fallback, position, WORLD_NORTH);
}

function tangentToScreenDirection(direction) {
  if (!camera) return null;
  return normalizeScreenVector({
    x: dot3(direction, camera.right),
    y: -dot3(direction, camera.up)
  });
}

function riverGatewayDirectionAtLocalPoint(x, y, currentKind, desiredDirection) {
  if (currentKind === "openWater" && !localPointIsNearDrawnRiver(x, y)) return null;
  if (currentKind === "river" && !localPointIsNearOpenWater(x, y)) return null;
  return findRiverGatewayDirection({
    x,
    y,
    currentKind,
    desiredDirection,
    sampleKindAt: localNavigationKindAtPoint
  });
}

function localPointIsNearOpenWater(x, y) {
  if (!chart?.waterIndex) return false;
  const reach = RIVER_GATEWAY_SEARCH_RADIUS_PX + TILE_ART_HALF;
  for (const entry of wakeWaterCandidatesForPoint(x, y, chart.waterIndex)) {
    if (entry.kind !== "tile" || !isShipOpenWaterTile(entry.call.id)) continue;
    if (Math.hypot(entry.call.drawSurfaceX - x, entry.call.drawSurfaceY - y) <= reach) return true;
  }
  return false;
}

function localPointIsNearDrawnRiver(x, y) {
  if (!chart?.waterIndex) return false;
  const reach = RIVER_GATEWAY_SEARCH_RADIUS_PX + TILE_ART_HALF;
  for (const entry of wakeWaterCandidatesForPoint(x, y, chart.waterIndex)) {
    if (entry.kind === "riverConnector") {
      if (pointDistanceToBezierPath(x, y, entry.path) <= RIVER_GATEWAY_SEARCH_RADIUS_PX + RIVER_MOUTH_RADIUS_PX) {
        return true;
      }
      continue;
    }
    if (entry.kind !== "tile" || !shipTileHasRiver(entry.call.id)) continue;
    if (Math.hypot(entry.call.drawSurfaceX - x, entry.call.drawSurfaceY - y) <= reach) return true;
  }
  return false;
}

function localNavigationKindAtPoint(x, y) {
  const tileId = localCollisionTileIdAtPoint(x, y, "river gateway sample");
  const position = globePositionForLocalPoint(tileId, x, y);
  const nav = shipNavigabilityAtLocalPoint(x, y, tileId, position);
  return nav.ok ? nav.kind : null;
}

function vectorArcDistance(a, b) {
  return Math.acos(clamp(dot3(a, b), -1, 1));
}

function npcVisualStateIsOutside(state, offset, margin) {
  return !pointNearScreen({ x: state.x + offset.x, y: state.y + offset.y }, margin);
}

function releaseNpcVisualState(state) {
  clearCombatForShip(state.id);
  npcCombatProjectiles = npcCombatProjectiles.filter((ball) => ball.ownerId !== state.id && ball.targetId !== state.id);
  releaseNpcShipVisualNavigation(npcSeaRoutes, state.id, weatherClockMinutes, state.vector);
  npcVisualShips.delete(state.id);
}

function updateSeagulls(dt, nowMs) {
  if (!chart || !animalImages) return false;
  let changed = false;
  const kept = [];
  const offset = chartOffsetPixels(chart);
  for (const gull of seagulls) {
    gull.x += gull.vx * dt;
    gull.y += gull.vy * dt;
    gull.vx += (gull.targetVx - gull.vx) * Math.min(1, dt * 0.55);
    gull.vy += (gull.targetVy - gull.vy) * Math.min(1, dt * 0.55);
    if (pointNearScreen({ x: gull.x + offset.x, y: gull.y + offset.y }, SEAGULL_DESPAWN_MARGIN_PX)) {
      kept.push(gull);
    }
  }
  if (kept.length !== seagulls.length) changed = true;
  seagulls = kept;

  if (nowMs >= seagullNextSpawnMs) {
    seagullNextSpawnMs = nowMs + SEAGULL_SPAWN_CHECK_MS;
    if (spawnSeagulls(nowMs)) changed = true;
  }
  return changed || seagulls.length > 0;
}

function spawnSeagulls(nowMs) {
  if (seagulls.length >= SEAGULL_MAX_FLYING || !chart) return false;
  const candidates = seagullFlightSpawnCalls(chart);
  if (candidates.length === 0) return false;

  const tick = Math.floor(nowMs / SEAGULL_SPAWN_CHECK_MS);
  const seed = hashInt(centerTileId ^ Math.imul(tick + 1, 0x45d9f3b));
  if ((seed & 7) > 4) return false;

  const spawn = candidates[seed % candidates.length];
  const room = SEAGULL_MAX_FLYING - seagulls.length;
  const count = Math.min(room, 1 + (hashInt(seed ^ 0x67756c6c) % 3));
  for (let i = 0; i < count; i++) {
    seagulls.push(createFlyingSeagull(spawn, hashInt(seed ^ Math.imul(i + 1, 0x9e3779b1)), nowMs));
  }
  return true;
}

function createFlyingSeagull(spawn, seed, nowMs) {
  const wind = seagullWindVector();
  const side = (seed & 1) === 0 ? 1 : -1;
  const angle = ((seed >>> 5) % 6283) / 1000;
  const speed = SEAGULL_MIN_SPEED_PX + ((seed >>> 17) % 1000) / 999 * SEAGULL_SPEED_SPREAD_PX;
  const wander = {
    x: Math.cos(angle) * 0.34 + wind.x * 0.78 + -wind.y * side * 0.18,
    y: Math.sin(angle) * 0.34 + wind.y * 0.78 + wind.x * side * 0.18
  };
  const windDirection = normalizeScreenVector(wander) || spawn.inward;
  const direction = seagullEntryDirection(windDirection, spawn.inward);
  const originJitter = {
    x: (((seed >>> 9) & 15) - 7.5) * 0.9,
    y: (((seed >>> 13) & 15) - 7.5) * 0.55
  };
  const origin = seagullOffscreenOrigin(spawn, originJitter);
  return {
    id: seagullSerial++,
    x: Math.round(origin.x),
    y: Math.round(origin.y),
    vx: direction.x * speed,
    vy: direction.y * speed,
    targetVx: direction.x * speed,
    targetVy: direction.y * speed,
    bornMs: nowMs,
    phaseMs: seed % 1800,
    glideMs: SEAGULL_GLIDE_MIN_MS + ((seed >>> 6) % SEAGULL_GLIDE_SPREAD_MS),
    flapMs: SEAGULL_FLAP_MIN_MS + ((seed >>> 11) % SEAGULL_FLAP_SPREAD_MS)
  };
}

function seagullEntryDirection(direction, inward) {
  const tangent = { x: -inward.y, y: inward.x };
  const tangentAmount = direction.x * tangent.x + direction.y * tangent.y;
  return normalizeScreenVector({
    x: inward.x * 0.42 + tangent.x * tangentAmount,
    y: inward.y * 0.42 + tangent.y * tangentAmount
  }) || inward;
}

function seagullOffscreenOrigin(spawn, jitter) {
  const halfSize = SEAGULL_FRAME_SIZE / 2 + SEAGULL_OFFSCREEN_PADDING_PX;
  let screenX = spawn.screenPoint.x + jitter.x;
  let screenY = spawn.screenPoint.y + jitter.y;
  if (spawn.inward.x > 0) screenX = Math.min(screenX, -halfSize);
  if (spawn.inward.x < 0) screenX = Math.max(screenX, SCREEN_W + halfSize);
  if (spawn.inward.y > 0) screenY = Math.min(screenY, -halfSize);
  if (spawn.inward.y < 0) screenY = Math.max(screenY, SCREEN_H + halfSize);
  return {
    x: screenX - spawn.offset.x,
    y: screenY - spawn.offset.y
  };
}

function seagullWindVector() {
  const state = windIndicatorState || (ship && graph ? windIndicatorTarget() : null);
  if (!state) return { x: 1, y: 0 };
  return normalizeScreenVector({
    x: Math.cos(state.flowDirectionRad),
    y: -Math.sin(state.flowDirectionRad)
  }) || { x: 1, y: 0 };
}

function normalizeScreenVector(v) {
  const length = Math.hypot(v.x, v.y);
  if (length <= 1e-6) return null;
  return { x: v.x / length, y: v.y / length };
}

function seagullFlightSpawnCalls(activeChart) {
  const offset = chartOffsetPixels(activeChart);
  const calls = [];
  for (const call of activeChart.tileCalls) {
    if (!isWaterSurfaceRow(call.row) || isShipBlockedByIceTile(call.id) || !tileHasLandNeighbor(call.id)) continue;
    const screenPoint = {
      x: call.drawSurfaceX + offset.x,
      y: call.drawSurfaceY - 7 + offset.y
    };
    if (!pointNearScreen(screenPoint, SEAGULL_SPAWN_MARGIN_PX)) continue;
    const inward = seagullSpawnInwardDirection(screenPoint);
    if (!inward) continue;
    calls.push({ screenPoint, inward, offset });
  }
  return calls;
}

function seagullSpawnInwardDirection(point) {
  const halfSize = SEAGULL_FRAME_SIZE / 2 + SEAGULL_OFFSCREEN_PADDING_PX;
  let x = 0;
  let y = 0;
  if (point.x <= -halfSize) x = 1;
  else if (point.x >= SCREEN_W + halfSize) x = -1;
  if (point.y <= -halfSize) y = 1;
  else if (point.y >= SCREEN_H + halfSize) y = -1;
  return normalizeScreenVector({ x, y });
}

function updatePrecipitationAnimation(nowMs) {
  const tick = Math.floor(nowMs / PRECIP_PARTICLE_REDRAW_MS);
  if (tick === precipParticleDrawTick) return false;
  precipParticleDrawTick = tick;
  return precipParticles.length > 0 || visiblePrecipitationLastRender;
}

function refreshWeatherState(force) {
  weatherParts = weatherClockParts(weatherClockMinutes);
  if (!runtimeWeather || !seaIceMask || !freshwaterIceMask || !snowGroundMask) return false;
  if (!force && weatherParts.dayIndex === weatherMaskDayIndex) return false;
  weatherMaskDayIndex = weatherParts.dayIndex;
  fillIceMaskForDay(runtimeWeather.seaIceCycle, weatherParts.dayIndex, seaIceMask);
  fillIceMaskForDay(runtimeWeather.freshwaterIceCycle, weatherParts.dayIndex, freshwaterIceMask);
  fillSnowGroundMaskForDay(weatherParts.dayIndex, snowGroundMask);
  return true;
}

function fillSnowGroundMaskForDay(dayIndex, outMask) {
  if (!weatherBake) throw new Error("Cannot build snow ground mask before discrete weather bake is loaded");
  if (outMask.length < weatherBake.tileCount) {
    throw new Error(`Snow ground mask length ${outMask.length} is smaller than tile count ${weatherBake.tileCount}`);
  }

  const day = ((dayIndex % WEATHER_DAYS) + WEATHER_DAYS) % WEATHER_DAYS;
  const dayOffset = day * weatherBake.tileCount;
  for (let tileId = 0; tileId < weatherBake.tileCount; tileId++) {
    const ord = weatherBake.ordinalByTileId[tileId];
    if (ord == null || ord < 0) {
      outMask[tileId] = 0;
      continue;
    }
    outMask[tileId] = (weatherBake.packed[dayOffset + ord] & TILE_DAY_SNOW_GROUND) !== 0 ? 1 : 0;
  }
}

function fitCanvasToDisplay() {
  const viewport = window.visualViewport;
  const layout = canvasDisplayLayout({
    viewportWidth: viewport?.width || window.innerWidth,
    viewportHeight: viewport?.height || window.innerHeight,
    canvasWidth: SCREEN_W,
    canvasHeight: SCREEN_H,
    devicePixelRatio: safeDevicePixelRatio(),
    fitScreen: document.fullscreenElement === shell
  });
  canvas.style.left = `${layout.left}px`;
  canvas.style.top = `${layout.top}px`;
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;
}

function safeDevicePixelRatio() {
  const ratio = window.devicePixelRatio || 1;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

function fullscreenAvailable() {
  return !!document.fullscreenEnabled && typeof shell.requestFullscreen === "function";
}

async function toggleFullscreenMode() {
  optionsMenu.fullscreenError = null;
  try {
    if (document.fullscreenElement === shell) {
      if (typeof document.exitFullscreen !== "function") {
        throw new Error("Fullscreen exit is unavailable");
      }
      await document.exitFullscreen();
      return;
    }
    if (!fullscreenAvailable()) throw new Error("Fullscreen is unavailable in this browser");
    await shell.requestFullscreen();
    await lockLandscapeIfPossible();
  } catch (error) {
    optionsMenu.fullscreenError = "FULLSCREEN FAILED";
    dirty = true;
    console.warn("[pixel-globe] fullscreen toggle failed", error);
  }
}

function handleFullscreenChange() {
  if (document.fullscreenElement !== shell) unlockOrientationIfPossible();
  optionsMenu.fullscreenError = null;
  fitCanvasToDisplay();
  dirty = true;
}

function handleFullscreenVisibilityChange() {
  if (document.hidden) {
    unlockOrientationIfPossible();
  } else if (document.fullscreenElement === shell) {
    void lockLandscapeIfPossible();
  }
  fitCanvasToDisplay();
}

async function lockLandscapeIfPossible() {
  try {
    if (screen.orientation?.lock) await screen.orientation.lock("landscape");
  } catch (_) {
    // Mobile browsers may reject orientation lock outside installed-app contexts.
  }
}

function unlockOrientationIfPossible() {
  try {
    screen.orientation?.unlock?.();
  } catch (_) {
    // Some browsers expose orientation lock without a usable unlock operation.
  }
}

function northUpCamera(center, fallbackRight = [1, 0, 0]) {
  let up = projectToTangent(WORLD_NORTH, center);
  if (Math.hypot(up[0], up[1], up[2]) >= 1e-6) {
    up = normalize3(up);
    const right = normalize3(cross3(up, center));
    return { center, right, up };
  }

  let right = projectToTangent(fallbackRight, center);
  if (Math.hypot(right[0], right[1], right[2]) < 1e-6) {
    right = projectToTangent([1, 0, 0], center);
  }
  if (Math.hypot(right[0], right[1], right[2]) < 1e-6) {
    right = projectToTangent([0, 0, 1], center);
  }
  right = normalize3(right);
  up = normalize3(cross3(center, right));
  return { center, right, up };
}

function projectToTangent(v, normal) {
  const d = dot3(v, normal);
  return [v[0] - normal[0] * d, v[1] - normal[1] * d, v[2] - normal[2] * d];
}

function projectTangentVector(v, normal) {
  return projectToTangent(v, normal);
}

function normalizeTangentOrFallback(v, normal, fallback) {
  const projected = projectTangentVector(v, normal);
  const normalized = normalizeOrNull(projected);
  if (normalized) return normalized;
  const fallbackProjected = projectTangentVector(fallback, normal);
  const fallbackNormalized = normalizeOrNull(fallbackProjected);
  if (fallbackNormalized) return fallbackNormalized;
  return northUpCamera(normal).right;
}

function rotateTangentToward(current, target, normal, maxStepRad) {
  const from = normalizeTangentOrFallback(current, normal, WORLD_NORTH);
  const to = normalizeTangentOrFallback(target, normal, from);
  const sin = dot3(cross3(from, to), normal);
  const cos = clamp(dot3(from, to), -1, 1);
  const signed = Math.atan2(sin, cos);
  const step = clamp(signed, -maxStepRad, maxStepRad);
  if (Math.abs(step) < 1e-6) return to;
  const quarterTurn = cross3(normal, from);
  return normalizeTangentOrFallback([
    from[0] * Math.cos(step) + quarterTurn[0] * Math.sin(step),
    from[1] * Math.cos(step) + quarterTurn[1] * Math.sin(step),
    from[2] * Math.cos(step) + quarterTurn[2] * Math.sin(step)
  ], normal, to);
}

function tileCenterVector(tileId) {
  const k = tileId * 3;
  return [graph.centers[k], graph.centers[k + 1], graph.centers[k + 2]];
}

function scaleVector(v, scale) {
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}

function vectorLength(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalizeOrNull(v) {
  const length = vectorLength(v);
  if (length <= 1e-9) return null;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function drawDayNightPaletteGrade() {
  if (!ship) return;
  const light = localDayNightLight();
  if (light.sunset <= 0.01 && light.night <= 0.01) return;
  const imageData = ctx.getImageData(0, 0, SCREEN_W, SCREEN_H);
  applyDayNightPaletteGrade(imageData.data, SCREEN_W, SCREEN_H, light);
  ctx.putImageData(imageData, 0, 0);
}

function localDayNightLight() {
  const sunDirection = currentSunDirection();
  const sunAltitude = dot3(ship.position, sunDirection);
  const day = smoothstep(DAY_NIGHT_NIGHT_ALT * 0.65, DAY_NIGHT_DAY_ALT, sunAltitude);
  const night = 1 - smoothstep(DAY_NIGHT_NIGHT_ALT, 0.08, sunAltitude);
  const twilight = clamp(1 - day - night, 0, 1);
  const sunset = smoothstep(DAY_NIGHT_SUNSET_START_ALT, 0.05, sunAltitude) *
    (1 - smoothstep(0.06, DAY_NIGHT_SUNSET_END_ALT, sunAltitude));
  return {
    sunAltitude,
    night: easeInOut(night),
    sunset: easeInOut(Math.max(twilight * 0.85, sunset))
  };
}

function currentSunDirection() {
  const subsolar = dateToSubsolarPoint(weatherParts.date);
  return latLonToDirection(subsolar.latDeg, subsolar.lonDeg);
}

function shipSunLightState() {
  if (!ship || !camera) return { bin: 0, direct: 0, shadow: 0, sunAltitude: -1 };
  const sunDirection = currentSunDirection();
  const sunAltitude = dot3(ship.position, sunDirection);
  const { direct, shadow } = shipLightStrengthsForSunAltitude(sunAltitude);
  if (direct <= 0.01 && shadow <= 0.01) {
    return { bin: 0, direct: 0, shadow: 0, sunAltitude };
  }

  const tangent = normalizeOrNull(projectTangentVector(sunDirection, ship.position));
  const screenX = tangent ? dot3(tangent, camera.right) : 0;
  const screenY = tangent ? -dot3(tangent, camera.up) : -1;
  const azimuth = Math.atan2(screenY, screenX);
  const rawAzimuth = Math.round(azimuth / (Math.PI * 2) * SHIP_LIGHT_AZIMUTH_BINS);
  const azimuthIndex = ((rawAzimuth % SHIP_LIGHT_AZIMUTH_BINS) + SHIP_LIGHT_AZIMUTH_BINS) % SHIP_LIGHT_AZIMUTH_BINS;
  const elevationIndex = sunAltitude > SHIP_LIGHT_HIGH_ALTITUDE ? 1 : 0;
  return {
    bin: elevationIndex * SHIP_LIGHT_AZIMUTH_BINS + azimuthIndex,
    direct,
    shadow,
    sunAltitude
  };
}

function dateToSubsolarPoint(date) {
  const utcMs = date.getTime();
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0, 0, 0, 0, 0);
  const dayOfYear = (utcMs - yearStart) / 86400000;
  const utcHours = date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000;
  const b = (2 * Math.PI / 365.25) * (dayOfYear - 81);
  const eotMinutes = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  return {
    latDeg: dateToSubsolarLatDeg(date),
    lonDeg: normalizeLonDeg(-15 * (utcHours - 12 + eotMinutes / 60))
  };
}

function normalizeLonDeg(lonDeg) {
  return ((((lonDeg + 180) % 360) + 360) % 360) - 180;
}

function smoothstep(edge0, edge1, x) {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  return easeInOut((x - edge0) / (edge1 - edge0));
}

function render(nowMs) {
  ctx.fillStyle = "#1f3650";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  ensureChart();
  const offset = chartOffsetPixels(chart);
  revealMinimapFromChart(chart, offset);

  ctx.save();
  ctx.translate(offset.x, offset.y);
  for (const call of chart.baseFaceCalls) drawFace(call, chart);

  for (const call of chart.tileCalls) {
    drawTile(call, chart);
    drawIceSurface(call);
    const frontFaces = chart.frontFacesByTile.get(call.id);
    if (frontFaces) {
      for (const face of frontFaces) drawFace(face, chart, { coverFront: true });
    }
  }

  for (const call of chart.tileCalls) drawWeatherSurface(call);
  for (const call of chart.tileCalls) drawRiver(call, chart);
  for (const call of chart.riverConnectorCalls) drawRiverConnector(call, chart);
  const shipLight = shipSunLightState();
  drawPrecipitation(chart, nowMs, offset);
  drawCloudLayer(chart);
  drawShipWake(chart);
  drawCannonEffects(chart);
  drawSeagulls(chart, nowMs);
  drawWorldDiscoverySprites(chart);
  drawCitySprites(chart, nowMs);
  ctx.restore();

  drawShipShadow(chart, shipLight, offset);
  drawShips(chart, shipLight, nowMs);
  ctx.save();
  ctx.translate(offset.x, offset.y);
  drawCitySpritesAboveShip(chart, offset, nowMs);
  drawCityLabels(chart.cityCalls, chart);
  ctx.restore();
  drawDayNightPaletteGrade();
  drawWindIndicator(nowMs);
  drawMinimap(nowMs);
  drawStormStatus(nowMs);
  drawCombatNotice(nowMs);
  drawAnchorButton();
  drawInteractionButton();
  drawDiscoveryNotice(nowMs);
  if (DEBUG_STATUS_ENABLED) drawTinyStatus(nowMs);
  if (dialogueState) drawDialogueOverlay(nowMs);
  drawShipInfoButton();
  drawPoliticsButton();
  drawDiscoveriesButton();
  drawOptionsButton();
  if (optionsMenu.isOpen) drawOptionsMenu();
  if (discoveriesMenu.isOpen) drawDiscoveriesMenu();
  if (shipInfoMenu.isOpen) drawShipInfoMenu();
  if (politicsMenu.isOpen) drawPoliticsMenu();
  if (gameOverReason) drawGameOverOverlay();
  if (playerIntroModal) drawPlayerIntroModal(nowMs);
}

function drawWorldDiscoverySprites(activeChart) {
  for (const discovery of worldDiscoveries) {
    if (!discovery.spriteKey) continue;
    const image = worldDiscoveryImages.get(discovery.spriteKey);
    if (!image) throw new Error(`Missing world discovery image: ${discovery.spriteKey}`);
    const point = worldDiscoveryLocalPoint(discovery, activeChart);
    if (!point) continue;
    ctx.drawImage(
      image,
      Math.round(point.x - TILE_ART_HALF),
      Math.round(point.y - TILE_ART_HALF)
    );
  }
}

function worldDiscoveryLocalPoint(discovery, activeChart) {
  const tileId = discovery.spriteTileId ?? discovery.tileId;
  const call = activeChart.tileById.get(tileId);
  if (!call) return null;
  return {
    x: call.drawSurfaceX,
    y: call.drawSurfaceY
  };
}

function ensureChart() {
  if (!chart || !chart.visibleSet.has(centerTileId) || !localLayout.positions.has(centerTileId) || chartProjectionOffsetPixels(chart).magnitude > CHART_REBUILD_RADIUS_PX) {
    chart = buildChart(camera);
  }
}

function updateDiscoveries(nowMs) {
  if (!gameState || !ship || !graph) return false;
  let changed = updateDiscoveryNotice(nowMs);
  if (updateCircumnavigationProgress(gameState, longitudeDegForDirection(ship.position))) {
    changed = queueDiscovery(CIRCUMNAVIGATION_DISCOVERY, nowMs) || changed;
  }

  let nearest = null;
  let nearestDistancePx = Infinity;
  for (const discovery of discoveryCatalog) {
    if (discovery.kind === "achievement" || hasDiscovery(gameState, discovery.id)) continue;
    const direction = discoveryDirection(discovery);
    const distancePx = vectorArcDistance(ship.position, direction) * PIXELS_PER_RADIAN;
    if (distancePx > discovery.radiusPx || distancePx >= nearestDistancePx) continue;
    nearest = discovery;
    nearestDistancePx = distancePx;
  }
  if (nearest) changed = queueDiscovery(nearest, nowMs) || changed;
  return changed;
}

function discoveryDirection(discovery) {
  if (discovery.direction) return discovery.direction;
  if (!Number.isInteger(discovery.tileId)) throw new Error(`Discovery ${discovery.id} has no globe position`);
  const offset = discovery.tileId * 3;
  return [graph.centers[offset], graph.centers[offset + 1], graph.centers[offset + 2]];
}

function longitudeDegForDirection(direction) {
  return normalizeLonDeg(Math.atan2(-direction[2], direction[0]) * 180 / Math.PI);
}

function latitudeDegForDirection(direction) {
  return Math.asin(clamp(direction[1], -1, 1)) * 180 / Math.PI;
}

function queueDiscovery(discovery, nowMs) {
  if (!recordDiscovery(gameState, discovery)) return false;
  playDiscoverySuccessSound();
  discoveryNoticeQueue.push(discovery);
  updateDiscoveryNotice(nowMs);
  return true;
}

function updateDiscoveryNotice(nowMs) {
  let changed = false;
  if (discoveryNotice && nowMs >= discoveryNotice.expiresAtMs) {
    discoveryNotice = null;
    changed = true;
  }
  if (!discoveryNotice && discoveryNoticeQueue.length > 0) {
    discoveryNotice = {
      discovery: discoveryNoticeQueue.shift(),
      expiresAtMs: nowMs + MOUNTAIN_DISCOVERY_NOTICE_MS
    };
    changed = true;
  }
  return changed;
}

function chartOffsetPixels(activeChart) {
  void activeChart;
  return layoutOffsetPixels();
}

function layoutOffsetPixels() {
  return {
    x: Math.round(SCREEN_W / 2 - localLayout.viewX),
    y: Math.round(SCREEN_H / 2 - localLayout.viewY),
    magnitude: 0
  };
}

function chartProjectionOffsetPixels(activeChart) {
  const projectedCenter = projectDirectionFor(camera.center, activeChart, false);
  if (!projectedCenter) return { x: 0, y: 0, magnitude: Infinity };
  const x = Math.round(SCREEN_W / 2 - projectedCenter.x);
  const y = Math.round(SCREEN_H / 2 - projectedCenter.y);
  return { x, y, magnitude: Math.hypot(x, y) };
}

function syncLocalLayout(projectedVisible, chartCenterTileId) {
  const projectedById = new Map();
  const pending = new Set();
  for (const item of projectedVisible) {
    projectedById.set(item.id, item);
    if (!localLayout.positions.has(item.id)) pending.add(item.id);
  }

  if (!localLayout.positions.has(chartCenterTileId)) {
    localLayout.positions.set(chartCenterTileId, {
      x: Math.round(localLayout.viewX),
      y: Math.round(localLayout.viewY)
    });
    pending.delete(chartCenterTileId);
  }

  let progress = true;
  while (pending.size > 0 && progress) {
    progress = false;
    for (const id of Array.from(pending)) {
      const position = localPositionFromNeighbors(id, projectedById);
      if (!position) continue;
      localLayout.positions.set(id, position);
      pending.delete(id);
      progress = true;
    }
  }

  if (pending.size > 0) {
    seedDisconnectedVisibleTiles(pending, projectedById, chartCenterTileId);
  }
}

function localPositionFromNeighbors(id, projectedById) {
  const projected = projectedById.get(id);
  if (!projected) return null;
  let x = 0;
  let y = 0;
  let count = 0;

  for (const neighborId of graph.neighbors[id]) {
    const neighborLayout = localLayout.positions.get(neighborId);
    const neighborProjected = projectedById.get(neighborId);
    if (!neighborLayout || !neighborProjected) continue;
    x += neighborLayout.x + projected.x - neighborProjected.x;
    y += neighborLayout.y + projected.y - neighborProjected.y;
    count++;
  }

  if (count === 0) return null;
  return {
    x: Math.round(x / count),
    y: Math.round(y / count)
  };
}

function seedDisconnectedVisibleTiles(pending, projectedById, chartCenterTileId) {
  const centerLayout = localLayout.positions.get(chartCenterTileId);
  const centerProjected = projectedById.get(chartCenterTileId);
  if (!centerLayout || !centerProjected) {
    throw new Error(`Cannot seed local layout for chart center tile: ${chartCenterTileId}`);
  }

  for (const id of pending) {
    const projected = projectedById.get(id);
    if (!projected) throw new Error(`Missing projected position for visible tile: ${id}`);
    localLayout.positions.set(id, {
      x: Math.round(centerLayout.x + projected.x - centerProjected.x),
      y: Math.round(centerLayout.y + projected.y - centerProjected.y)
    });
  }
}

function cullLocalLayout(projectedVisible) {
  const visibleIds = new Set(projectedVisible.map((item) => item.id));
  const minX = localLayout.viewX - SCREEN_W / 2 - LOCAL_LAYOUT_CULL_MARGIN;
  const maxX = localLayout.viewX + SCREEN_W / 2 + LOCAL_LAYOUT_CULL_MARGIN;
  const minY = localLayout.viewY - SCREEN_H / 2 - LOCAL_LAYOUT_CULL_MARGIN;
  const maxY = localLayout.viewY + SCREEN_H / 2 + LOCAL_LAYOUT_CULL_MARGIN;

  for (const [id, position] of localLayout.positions.entries()) {
    if (visibleIds.has(id)) continue;
    if (position.x < minX || position.x > maxX || position.y < minY || position.y > maxY) {
      localLayout.positions.delete(id);
    }
  }
}

function buildChart(anchorCamera) {
  const chartCamera = {
    center: anchorCamera.center.slice(),
    right: anchorCamera.right.slice(),
    up: anchorCamera.up.slice()
  };
  const chartCenterTileId = findNearestTileId(graph, directionIndex, chartCamera.center);
  const projectedVisible = collectChartTiles(chartCamera, chartCenterTileId);
  syncLocalLayout(projectedVisible, chartCenterTileId);
  cullLocalLayout(projectedVisible);
  const drawOffset = layoutOffsetPixels();
  const faceCalls = [];
  const riverConnectorCalls = [];
  const tileCalls = [];
  const cityCalls = [];
  const baseFaceCalls = [];
  const frontFacesByTile = new Map();
  const tileById = new Map();
  const visibleSet = new Set();

  for (const item of projectedVisible) visibleSet.add(item.id);
  for (const item of projectedVisible) {
    const position = localLayout.positions.get(item.id);
    if (!position) throw new Error(`Missing local layout for visible tile: ${item.id}`);
    const row = earthById[item.id];
    const level = terrainLevel(row, item.id);
    const surface = { x: position.x, y: position.y - level * 3 };
    const tileCall = {
      id: item.id,
      x: position.x,
      y: position.y,
      row,
      level,
      surface,
      drawSurfaceX: surface.x,
      drawSurfaceY: surface.y,
      drawLayer: terrainSpriteDrawLayer(spriteForTerrain(row, item.id)),
      sortY: surface.y + level * 3
    };
    tileCalls.push(tileCall);
    tileById.set(item.id, tileCall);
    const city = cityByTileId.get(item.id);
    if (city) cityCalls.push(makeCityCall(city, tileCall));

    const neighbors = graph.neighbors[item.id];
    for (const nid of neighbors) {
      if (!visibleSet.has(nid)) continue;
      if (nid < item.id) continue;
      const nLayout = localLayout.positions.get(nid);
      if (!nLayout) throw new Error(`Missing local layout for visible neighbor: ${nid}`);
      const nrow = earthById[nid];
      const nlevel = terrainLevel(nrow, nid);
      const nSurfaceY = nLayout.y - nlevel * 3;
      if (!segmentNearScreen(surface.x + drawOffset.x, surface.y + drawOffset.y, nLayout.x + drawOffset.x, nSurfaceY + drawOffset.y, CHART_MARGIN)) continue;
      faceCalls.push(makeFaceCall({
        a: item.id,
        b: nid,
        ax: surface.x,
        ay: surface.y,
        aSortY: position.y,
        bx: nLayout.x,
        by: nSurfaceY,
        bSortY: nLayout.y,
        row,
        nrow,
        level,
        nlevel
      }));
      const riverConnector = makeRiverConnectorCall({
        a: item.id,
        b: nid,
        ax: surface.x,
        ay: surface.y,
        aSortY: position.y,
        bx: nLayout.x,
        by: nSurfaceY,
        bSortY: nLayout.y,
        row,
        nrow,
        level,
        nlevel
      });
      if (riverConnector) riverConnectorCalls.push(riverConnector);
    }
  }

  for (const call of faceCalls) {
    if (isFrontCoverFace(call) && visibleSet.has(call.ownerId)) {
      addFrontFace(frontFacesByTile, call.ownerId, call);
    } else {
      baseFaceCalls.push(call);
    }
  }

  baseFaceCalls.sort((a, b) => a.sortY - b.sortY);
  riverConnectorCalls.sort((a, b) => a.sortY - b.sortY || a.a - b.a || a.b - b.b);
  tileCalls.sort(compareTerrainDrawCalls);
  cityCalls.sort((a, b) => a.sortY - b.sortY || a.tileId - b.tileId);
  for (const frontFaces of frontFacesByTile.values()) frontFaces.sort((a, b) => a.sortY - b.sortY);
  const waterIndex = buildWakeWaterIndex(tileCalls, riverConnectorCalls, { tileById });

  return {
    ...chartCamera,
    centerTileId: chartCenterTileId,
    visibleSet,
    tileById,
    waterIndex,
    baseFaceCalls,
    riverConnectorCalls,
    tileCalls,
    cityCalls,
    frontFacesByTile
  };
}

function makeCityCall(city, tileCall) {
  const x = Math.round(tileCall.drawSurfaceX);
  const y = Math.round(tileCall.drawSurfaceY);
  const spriteX = Math.round(tileCall.drawSurfaceX - TILE_ART_HALF);
  const spriteY = Math.round(tileCall.drawSurfaceY - TILE_ART_HALF);
  const labelH = CITY_LABEL_H + CITY_LABEL_PAD_Y * 2;
  const character = portCityCharacters?.get(city.tileId) || null;
  return {
    ...city,
    character,
    portrait: character ? characterExpression(character) : null,
    x,
    y,
    spriteX,
    spriteY,
    spriteW: CITY_SPRITE_W,
    spriteH: CITY_SPRITE_H,
    labelY: spriteY - labelH - CITY_LABEL_GAP_PX,
    sortY: spriteY + CITY_SPRITE_H + 2
  };
}

function buildWakeWaterIndex(tileCalls, riverConnectorCalls, activeChart) {
  const buckets = new Map();
  for (const call of tileCalls) {
    addWakeWaterIndexEntry(buckets, call.drawSurfaceX, call.drawSurfaceY, {
      kind: "tile",
      call
    });
  }

  for (const call of riverConnectorCalls) {
    const geometry = riverConnectorGeometry(call, activeChart);
    if (!geometry) continue;
    const { path } = geometry;
    addWakeWaterIndexBox(buckets, {
      minX: Math.min(path.x0, path.cx, path.x1, geometry.a.x, geometry.b.x) - WAKE_RIVER_RADIUS_PX,
      maxX: Math.max(path.x0, path.cx, path.x1, geometry.a.x, geometry.b.x) + WAKE_RIVER_RADIUS_PX,
      minY: Math.min(path.y0, path.cy, path.y1, geometry.a.y, geometry.b.y) - WAKE_RIVER_RADIUS_PX,
      maxY: Math.max(path.y0, path.cy, path.y1, geometry.a.y, geometry.b.y) + WAKE_RIVER_RADIUS_PX
    }, {
      kind: "riverConnector",
      call,
      geometry,
      path
    });
  }
  return { buckets };
}

function addWakeWaterIndexEntry(buckets, x, y, entry) {
  const bx = Math.floor(x / WAKE_WATER_BUCKET_PX);
  const by = Math.floor(y / WAKE_WATER_BUCKET_PX);
  const key = wakeWaterBucketKey(bx, by);
  const bucket = buckets.get(key);
  if (bucket) bucket.push(entry);
  else buckets.set(key, [entry]);
}

function addWakeWaterIndexBox(buckets, box, entry) {
  const minBx = Math.floor(box.minX / WAKE_WATER_BUCKET_PX);
  const maxBx = Math.floor(box.maxX / WAKE_WATER_BUCKET_PX);
  const minBy = Math.floor(box.minY / WAKE_WATER_BUCKET_PX);
  const maxBy = Math.floor(box.maxY / WAKE_WATER_BUCKET_PX);
  for (let by = minBy; by <= maxBy; by++) {
    for (let bx = minBx; bx <= maxBx; bx++) {
      const key = wakeWaterBucketKey(bx, by);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(entry);
      else buckets.set(key, [entry]);
    }
  }
}

function wakeWaterBucketKey(x, y) {
  return `${x},${y}`;
}

function makeFaceCall(call) {
  const aOwnsFace = call.aSortY <= call.bSortY;
  return {
    ...call,
    ownerId: aOwnsFace ? call.a : call.b,
    ownerRow: aOwnsFace ? call.row : call.nrow,
    ownerLevel: aOwnsFace ? call.level : call.nlevel,
    otherLevel: aOwnsFace ? call.nlevel : call.level,
    sortY: Math.max(call.aSortY, call.bSortY)
  };
}

function isFrontCoverFace(call) {
  return Math.abs(call.bSortY - call.aSortY) > FRONT_FACE_MIN_DY;
}

function addFrontFace(frontFacesByTile, tileId, call) {
  let faces = frontFacesByTile.get(tileId);
  if (!faces) {
    faces = [];
    frontFacesByTile.set(tileId, faces);
  }
  faces.push(call);
}

function makeRiverConnectorCall(call) {
  const edgeA = edgeIndexTowardNeighbor(call.a, call.b);
  const edgeB = edgeIndexTowardNeighbor(call.b, call.a);
  if (edgeA === undefined || edgeB === undefined) return null;

  const aWater = isWaterSurfaceRow(call.row);
  const bWater = isWaterSurfaceRow(call.nrow);
  const aRiver = !aWater && riverEdgeSet(riverMasks, call.a, edgeA);
  const bRiver = !bWater && riverEdgeSet(riverMasks, call.b, edgeB);
  const aHasRiver = !aWater && (riverMasks[call.a] || 0) !== 0;
  const bHasRiver = !bWater && (riverMasks[call.b] || 0) !== 0;
  const aMouth = aRiver && (bWater || riverEdgeSet(riverToWaterMasks, call.a, edgeA));
  const bMouth = bRiver && (aWater || riverEdgeSet(riverToWaterMasks, call.b, edgeB));
  const connectsRiverTiles = (aRiver && bHasRiver) || (bRiver && aHasRiver);
  const connectsMouth = (aRiver && bWater) || (bRiver && aWater);

  if (!connectsRiverTiles && !connectsMouth) return null;
  return {
    ...call,
    aWater,
    bWater,
    aRiver,
    bRiver,
    aHasRiver,
    bHasRiver,
    aMouth,
    bMouth,
    sortY: Math.max(call.aSortY, call.bSortY) - 0.25
  };
}

function riverEdgeSet(masks, tileId, edge) {
  return ((masks?.[tileId] || 0) & (1 << edge)) !== 0;
}

function buildMinimap() {
  const tilePixels = new Uint16Array(graph.tileCount);
  const pixelLandWeights = new Float32Array(MINIMAP_W * MINIMAP_H);
  const pixelTileCounts = new Uint16Array(MINIMAP_W * MINIMAP_H);
  tilePixels.fill(MINIMAP_TILE_OUT_OF_RANGE);
  for (let id = 0; id < graph.tileCount; id++) {
    if (Math.abs(graph.latDeg[id]) > MINIMAP_MAX_LAT_DEG) continue;
    const row = earthById[id];
    const x = minimapX(graph.lonDeg[id]);
    const y = minimapY(graph.latDeg[id]);
    const pixel = x + y * MINIMAP_W;
    const landWeight = minimapLandWeight(row);
    tilePixels[id] = pixel;
    pixelLandWeights[pixel] += landWeight;
    pixelTileCounts[pixel] += 1;
  }

  const canvas = document.createElement("canvas");
  canvas.width = MINIMAP_W;
  canvas.height = MINIMAP_H;
  const mapCtx = canvas.getContext("2d", { alpha: false });
  mapCtx.imageSmoothingEnabled = false;
  fillMinimapCanvas(mapCtx, MINIMAP_UNKNOWN_COLOR);
  return {
    canvas,
    ctx: mapCtx,
    seenTiles: new Uint8Array(graph.tileCount),
    seenTileCount: 0,
    revealedPixels: new Uint8Array(MINIMAP_W * MINIMAP_H),
    pixelLandWeights,
    pixelTileCounts,
    tilePixels
  };
}

function drawMinimap(nowMs) {
  if (!minimap) return;
  ctx.fillStyle = "#2a1c11";
  ctx.fillRect(MINIMAP_X - 1, MINIMAP_Y - 1, MINIMAP_W + 2, MINIMAP_H + 2);
  drawCenteredMinimapCanvas();

  const mx = MINIMAP_X + MINIMAP_CENTER_X;
  const my = MINIMAP_Y + minimapY(graph.latDeg[centerTileId]);
  const blinkOn = Math.floor(nowMs / 320) % 2 === 0;
  ctx.fillStyle = blinkOn ? "#fff4a8" : "#151713";
  ctx.fillRect(mx, my, 1, 1);
}

function fillMinimapCanvas(mapCtx, color) {
  mapCtx.fillStyle = rgbColor(color);
  mapCtx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);
}

function revealMinimapFromChart(activeChart, offset) {
  if (!minimap) return;
  for (const call of activeChart.tileCalls) {
    if (!tileCallNearViewport(call, offset, TILE_ART_HALF)) continue;
    revealMinimapTile(call.id);
  }
}

function revealMinimapTile(tileId) {
  if (minimap.seenTiles[tileId] !== 0) return;
  minimap.seenTiles[tileId] = 1;
  minimap.seenTileCount += 1;

  const pixel = minimap.tilePixels[tileId];
  if (pixel === MINIMAP_TILE_OUT_OF_RANGE) return;
  if (minimap.revealedPixels[pixel] !== 0) return;
  minimap.revealedPixels[pixel] = 1;
  paintMinimapPixel(pixel);
}

function paintMinimapPixel(pixel) {
  const color = minimap.revealedPixels[pixel] !== 0
    ? minimapColor(minimapPixelLandFraction(pixel), pixel)
    : MINIMAP_UNKNOWN_COLOR;
  const x = pixel % MINIMAP_W;
  const y = Math.floor(pixel / MINIMAP_W);
  minimap.ctx.fillStyle = rgbColor(color);
  minimap.ctx.fillRect(x, y, 1, 1);
}

function drawCenteredMinimapCanvas() {
  const startX = wrapMinimapX(minimapX(graph.lonDeg[centerTileId]) - MINIMAP_CENTER_X);
  const firstW = MINIMAP_W - startX;
  ctx.drawImage(
    minimap.canvas,
    startX, 0, firstW, MINIMAP_H,
    MINIMAP_X, MINIMAP_Y, firstW, MINIMAP_H
  );
  if (startX > 0) {
    ctx.drawImage(
      minimap.canvas,
      0, 0, startX, MINIMAP_H,
      MINIMAP_X + firstW, MINIMAP_Y, startX, MINIMAP_H
    );
  }
}

function rgbColor(color) {
  return `rgb(${color[0]},${color[1]},${color[2]})`;
}

function getOptionsButtonRect() {
  return {
    x: OPTIONS_BUTTON_X,
    y: OPTIONS_BUTTON_Y,
    w: OPTIONS_BUTTON_SIZE,
    h: OPTIONS_BUTTON_SIZE
  };
}

function getShipInfoButtonRect() {
  return {
    x: SHIP_INFO_BUTTON_X,
    y: SHIP_INFO_BUTTON_Y,
    w: SHIP_INFO_BUTTON_SIZE,
    h: SHIP_INFO_BUTTON_SIZE
  };
}

function getPoliticsButtonRect() {
  return {
    x: POLITICS_BUTTON_X,
    y: POLITICS_BUTTON_Y,
    w: POLITICS_BUTTON_SIZE,
    h: POLITICS_BUTTON_SIZE
  };
}

function getDiscoveriesButtonRect() {
  return {
    x: DISCOVERIES_BUTTON_X,
    y: DISCOVERIES_BUTTON_Y,
    w: DISCOVERIES_BUTTON_SIZE,
    h: DISCOVERIES_BUTTON_SIZE
  };
}

function drawShipInfoButton() {
  const rect = getShipInfoButtonRect();
  shipInfoMenu.buttonRect = rect;
  const hovered = !menusAreOpen() && pointInRect(optionsMenu.hoverPoint, rect);

  ctx.save();
  ctx.fillStyle = hovered ? "#625565" : "#2e222f";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hovered ? "#ffffff" : "#ab947a";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = "#c7dcd0";
  ctx.fillRect(rect.x + 5, rect.y + 2, 1, 6);
  ctx.fillRect(rect.x + 6, rect.y + 4, 3, 1);
  ctx.fillRect(rect.x + 7, rect.y + 5, 2, 1);
  ctx.fillStyle = "#cd683d";
  ctx.fillRect(rect.x + 2, rect.y + 8, 9, 2);
  ctx.fillRect(rect.x + 3, rect.y + 10, 7, 1);
  if (hovered) {
    const label = "SHIP";
    const width = measurePixelTextWidth(label, PIXEL_FONT_BODY_8) + 6;
    ctx.fillStyle = "#2e222f";
    ctx.fillRect(rect.x - width + rect.w, rect.y + rect.h + 2, width, 11);
    ctx.fillStyle = "#ffffff";
    drawPixelText(label, rect.x + rect.w - 3, rect.y + rect.h + 4, {
      font: PIXEL_FONT_BODY_8,
      align: "right"
    });
  }
  ctx.restore();
}

function drawPoliticsButton() {
  const rect = getPoliticsButtonRect();
  politicsMenu.buttonRect = rect;
  const hovered = !menusAreOpen() && pointInRect(optionsMenu.hoverPoint, rect);

  ctx.save();
  ctx.fillStyle = hovered ? "rgba(255, 244, 168, 0.24)" : "rgba(15, 18, 14, 0.78)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hovered ? "#fff4a8" : "#4d3924";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = "#d6b66b";
  ctx.fillRect(rect.x + 3, rect.y + 8, 7, 1);
  ctx.fillRect(rect.x + 4, rect.y + 4, 1, 5);
  ctx.fillRect(rect.x + 8, rect.y + 4, 1, 5);
  ctx.fillRect(rect.x + 3, rect.y + 3, 7, 1);
  ctx.fillStyle = "#91db69";
  ctx.fillRect(rect.x + 2, rect.y + 6, 2, 1);
  ctx.fillStyle = "#f68181";
  ctx.fillRect(rect.x + 9, rect.y + 6, 2, 1);
  if (hovered) {
    const label = "POLITICS";
    const width = measurePixelTextWidth(label, PIXEL_FONT_BODY_8) + 6;
    ctx.fillStyle = "rgba(15, 18, 14, 0.94)";
    ctx.fillRect(rect.x - width + rect.w, rect.y + rect.h + 2, width, 11);
    ctx.fillStyle = "#fff4a8";
    drawPixelText(label, rect.x + rect.w - 3, rect.y + rect.h + 4, {
      font: PIXEL_FONT_BODY_8,
      align: "right"
    });
  }
  ctx.restore();
}

function drawDiscoveriesButton() {
  const rect = getDiscoveriesButtonRect();
  discoveriesMenu.buttonRect = rect;
  const hovered = !menusAreOpen() && pointInRect(optionsMenu.hoverPoint, rect);

  ctx.save();
  ctx.fillStyle = hovered ? "rgba(255, 244, 168, 0.24)" : "rgba(15, 18, 14, 0.78)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hovered ? "#fff4a8" : "#4d3924";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(discoveriesMenuIcon, rect.x, rect.y);
  if (hovered) {
    const label = "DISCOVERIES";
    const width = measurePixelTextWidth(label, PIXEL_FONT_BODY_8) + 6;
    ctx.fillStyle = "rgba(15, 18, 14, 0.94)";
    ctx.fillRect(rect.x - width + rect.w, rect.y + rect.h + 2, width, 11);
    ctx.fillStyle = "#fff4a8";
    drawPixelText(label, rect.x + rect.w - 3, rect.y + rect.h + 4, {
      font: PIXEL_FONT_BODY_8,
      align: "right"
    });
  }
  ctx.restore();
}

function drawOptionsButton() {
  const rect = getOptionsButtonRect();
  optionsMenu.buttonRect = rect;
  const hovered = !menusAreOpen() && pointInRect(optionsMenu.hoverPoint, rect);

  ctx.save();
  ctx.fillStyle = hovered ? "rgba(255, 244, 168, 0.24)" : "rgba(15, 18, 14, 0.78)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hovered ? "#fff4a8" : "#4d3924";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  if (settingsMenuIcon) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(settingsMenuIcon, rect.x, rect.y);
  } else {
    ctx.fillStyle = "#d7d9bf";
    ctx.fillRect(rect.x + 3, rect.y + 3, 7, 1);
    ctx.fillRect(rect.x + 2, rect.y + 6, 9, 1);
    ctx.fillRect(rect.x + 3, rect.y + 9, 7, 1);
  }
  ctx.restore();
}

function drawShipInfoMenu() {
  const panel = {
    x: SHIP_INFO_PANEL_X,
    y: SHIP_INFO_PANEL_Y,
    w: SHIP_INFO_PANEL_W,
    h: SHIP_INFO_PANEL_H
  };
  const view = createShipInfoView(ship, gameState);
  const cargoPage = shipInfoCargoPage(view, shipInfoMenu.cargoPage);
  shipInfoMenu.cargoPage = cargoPage.page;

  ctx.save();
  ctx.fillStyle = "#2e222f";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#3e3546";
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = "#ab947a";
  ctx.lineWidth = 1;
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);

  shipInfoMenu.closeButtonRect = { x: panel.x + panel.w - 20, y: panel.y + 6, w: 13, h: 13 };
  drawShipInfoCloseButton(
    shipInfoMenu.closeButtonRect,
    pointInRect(optionsMenu.hoverPoint, shipInfoMenu.closeButtonRect)
  );
  drawShipInfoTabs(panel);
  const vesselTitle = view.captainName ? `${view.captainName} / ${view.label}` : view.label;
  const title = shipInfoMenu.view === "ledger"
    ? "CAPTAIN'S LEDGER"
    : shipInfoMenu.view === "papers"
      ? "SHIP'S PAPERS"
      : fitPixelText(vesselTitle.toUpperCase(), PIXEL_FONT_UI_8, panel.w - 206);
  drawOptionsText(
    title,
    panel.x + panel.w / 2,
    panel.y + 8,
    {
      align: "center",
      color: "#fbb954"
    }
  );

  if (shipInfoMenu.view === "ledger") {
    drawShipLedger(panel, view);
    ctx.restore();
    return;
  }
  if (shipInfoMenu.view === "papers") {
    drawShipPapers(panel, view);
    ctx.restore();
    return;
  }

  const artX = panel.x + 10;
  const artY = panel.y + 28;
  ctx.fillStyle = "#323353";
  ctx.fillRect(artX, artY, SHIP_INFO_SIDE_VIEW_W, SHIP_INFO_SIDE_VIEW_H);
  ctx.strokeStyle = "#7f708a";
  ctx.strokeRect(artX + 0.5, artY + 0.5, SHIP_INFO_SIDE_VIEW_W - 1, SHIP_INFO_SIDE_VIEW_H - 1);
  const sideView = shipInfoImages.get(view.slug);
  if (sideView) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sideView, artX, artY);
  } else {
    const message = shipInfoMenu.error || "LOADING SHIP...";
    drawOptionsText(message, artX + SHIP_INFO_SIDE_VIEW_W / 2, artY + 48, {
      align: "center",
      color: shipInfoMenu.error ? "#f68181" : "#9babb2"
    });
  }

  const statsX = panel.x + 218;
  const valueX = panel.x + panel.w - 12;
  drawShipInfoValueRow("HULL", `${view.hull}/${view.maxHull}`, statsX, valueX, panel.y + 31);
  drawShipInfoBar(statsX, panel.y + 43, valueX - statsX, view.hull / view.maxHull, "#91db69");
  drawShipInfoValueRow("CANNONS", String(view.cannons), statsX, valueX, panel.y + 53);
  drawShipInfoValueRow("UPWIND LIMIT", `${view.upwindStallAngleDeg} DEG`, statsX, valueX, panel.y + 65);
  drawShipInfoRating("SPEED", view.ratings.speed, statsX, panel.y + 80);
  drawShipInfoRating("ACCEL", view.ratings.acceleration, statsX, panel.y + 93);
  drawShipInfoRating("TURNING", view.ratings.turning, statsX, panel.y + 106);
  drawShipInfoRating("WINDWARD", view.ratings.windward, statsX, panel.y + 119);
  drawShipInfoRating("SEAWORTHY", view.seaworthiness, statsX, panel.y + 132);

  const cargoY = panel.y + 155;
  ctx.fillStyle = "#625565";
  ctx.fillRect(panel.x + 10, cargoY - 3, panel.w - 20, 1);
  drawOptionsText("CARGO HOLD", panel.x + 12, cargoY + 1, { color: "#c7dcd0" });
  drawOptionsText(`${view.cargoUsed}/${view.cargoCapacity}`, panel.x + 105, cargoY + 1, {
    align: "right",
    color: "#ffffff"
  });
  drawShipInfoBar(panel.x + 116, cargoY + 2, 150, view.cargoUsed / view.cargoCapacity, "#fbb954");
  drawOptionsText(`${view.doubloons} DOUBLOONS`, panel.x + panel.w - 12, cargoY + 1, {
    align: "right",
    color: "#f9c22b"
  });

  if (cargoPage.rows.length === 0) {
    drawOptionsText("THE HOLD IS EMPTY", panel.x + 12, cargoY + 24, { color: "#9babb2" });
  } else {
    cargoPage.rows.forEach((row, index) => {
      const column = Math.floor(index / 4);
      const rowIndex = index % 4;
      const x = panel.x + 12 + column * 207;
      const y = cargoY + 19 + rowIndex * 13;
      ctx.fillStyle = "#ab947a";
      ctx.fillRect(x, y + 3, 3, 3);
      drawOptionsText(
        fitPixelText(`${row.label} x${row.quantity}`, PIXEL_FONT_UI_8, 145),
        x + 8,
        y,
        { color: "#ffffff" }
      );
      const basisLabel = row.averageCost === null ? "AVG --" : `AVG ${Math.round(row.averageCost)} DB`;
      drawOptionsText(basisLabel, x + 194, y, { align: "right", color: "#fbb954" });
    });
  }

  const pagerY = panel.y + panel.h - 18;
  if (cargoPage.pageCount > 1) {
    shipInfoMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: 13, h: 12 };
    shipInfoMenu.nextPageRect = { x: panel.x + panel.w - 25, y: pagerY, w: 13, h: 12 };
    drawShipInfoArrowButton(
      shipInfoMenu.previousPageRect,
      "<",
      pointInRect(optionsMenu.hoverPoint, shipInfoMenu.previousPageRect)
    );
    drawShipInfoArrowButton(
      shipInfoMenu.nextPageRect,
      ">",
      pointInRect(optionsMenu.hoverPoint, shipInfoMenu.nextPageRect)
    );
    drawOptionsText(`MANIFEST ${cargoPage.page + 1}/${cargoPage.pageCount}`, panel.x + panel.w / 2, pagerY + 2, {
      align: "center",
      color: "#9babb2"
    });
  } else {
    shipInfoMenu.previousPageRect = null;
    shipInfoMenu.nextPageRect = null;
  }
  ctx.restore();
}

function drawShipInfoTabs(panel) {
  shipInfoMenu.vesselTabRect = { x: panel.x + 8, y: panel.y + 6, w: 48, h: 13 };
  shipInfoMenu.ledgerTabRect = { x: panel.x + 59, y: panel.y + 6, w: 51, h: 13 };
  shipInfoMenu.papersTabRect = { x: panel.x + 113, y: panel.y + 6, w: 51, h: 13 };
  drawShipInfoTab(
    shipInfoMenu.vesselTabRect,
    "VESSEL",
    shipInfoMenu.view === "vessel",
    pointInRect(optionsMenu.hoverPoint, shipInfoMenu.vesselTabRect)
  );
  drawShipInfoTab(
    shipInfoMenu.ledgerTabRect,
    "LEDGER",
    shipInfoMenu.view === "ledger",
    pointInRect(optionsMenu.hoverPoint, shipInfoMenu.ledgerTabRect)
  );
  drawShipInfoTab(
    shipInfoMenu.papersTabRect,
    "PAPERS",
    shipInfoMenu.view === "papers",
    pointInRect(optionsMenu.hoverPoint, shipInfoMenu.papersTabRect)
  );
}

function drawShipInfoTab(rect, label, selected, hovered) {
  ctx.fillStyle = selected ? "#625565" : (hovered ? "#484a77" : "#2e222f");
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = selected || hovered ? "#c7dcd0" : "#7f708a";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  drawOptionsText(label, rect.x + rect.w / 2, rect.y + 3, {
    align: "center",
    color: selected ? "#ffffff" : "#9babb2"
  });
}

function drawShipLedger(panel, view) {
  const page = shipLedgerPage(gameState, shipInfoMenu.ledgerPage);
  shipInfoMenu.ledgerPage = page.page;
  const summaryY = panel.y + 27;
  const realized = Math.round(view.realizedPnl);
  drawOptionsText(`REALIZED P/L ${formatSignedLedgerMoney(realized)} DB`, panel.x + 12, summaryY, {
    color: ledgerPnlColor(realized)
  });
  drawOptionsText(`CASH ${view.doubloons} DB`, panel.x + panel.w - 12, summaryY, {
    align: "right",
    color: "#f9c22b"
  });

  const dateX = panel.x + 12;
  const portX = panel.x + 86;
  const entryX = panel.x + 151;
  const amountX = panel.x + 322;
  const balanceX = panel.x + 374;
  const pnlX = panel.x + panel.w - 12;
  const headerY = panel.y + 43;
  ctx.fillStyle = "#625565";
  ctx.fillRect(panel.x + 10, headerY - 4, panel.w - 20, 1);
  drawOptionsText("DATE", dateX, headerY, { color: "#ab947a" });
  drawOptionsText("PORT", portX, headerY, { color: "#ab947a" });
  drawOptionsText("ENTRY", entryX, headerY, { color: "#ab947a" });
  drawOptionsText("AMOUNT", amountX, headerY, { align: "right", color: "#ab947a" });
  drawOptionsText("BAL", balanceX, headerY, { align: "right", color: "#ab947a" });
  drawOptionsText("P/L", pnlX, headerY, { align: "right", color: "#ab947a" });

  page.rows.forEach((entry, index) => {
    const y = panel.y + 57 + index * 15;
    ctx.fillStyle = index % 2 === 0 ? "rgba(46, 34, 47, 0.42)" : "rgba(46, 34, 47, 0.18)";
    ctx.fillRect(panel.x + 10, y - 3, panel.w - 20, 13);
    drawOptionsText(shipLedgerDateLabel(entry.simMinute), dateX, y, { color: "#9babb2" });
    drawOptionsText(fitPixelText(entry.location.toUpperCase(), PIXEL_FONT_UI_8, 59), portX, y, {
      color: "#c7dcd0"
    });
    drawOptionsText(fitPixelText(entry.description.toUpperCase(), PIXEL_FONT_UI_8, 116), entryX, y, {
      color: "#ffffff"
    });
    drawOptionsText(formatSignedLedgerMoney(entry.amount), amountX, y, {
      align: "right",
      color: entry.amount < 0 ? "#f68181" : "#91db69"
    });
    drawOptionsText(String(Math.round(entry.balance)), balanceX, y, {
      align: "right",
      color: "#f9c22b"
    });
    drawOptionsText(entry.pnl === null ? "--" : formatSignedLedgerMoney(entry.pnl), pnlX, y, {
      align: "right",
      color: entry.pnl === null ? "#625565" : ledgerPnlColor(entry.pnl)
    });
  });

  const pagerY = panel.y + panel.h - 18;
  if (page.pageCount > 1) {
    shipInfoMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: 13, h: 12 };
    shipInfoMenu.nextPageRect = { x: panel.x + panel.w - 25, y: pagerY, w: 13, h: 12 };
    drawShipInfoArrowButton(
      shipInfoMenu.previousPageRect,
      "<",
      pointInRect(optionsMenu.hoverPoint, shipInfoMenu.previousPageRect)
    );
    drawShipInfoArrowButton(
      shipInfoMenu.nextPageRect,
      ">",
      pointInRect(optionsMenu.hoverPoint, shipInfoMenu.nextPageRect)
    );
  } else {
    shipInfoMenu.previousPageRect = null;
    shipInfoMenu.nextPageRect = null;
  }
  drawOptionsText(`PAGE ${page.page + 1}/${page.pageCount}`, panel.x + panel.w / 2, pagerY + 2, {
    align: "center",
    color: "#9babb2"
  });
}

function drawShipPapers(panel, view) {
  const page = shipPapersPage(view, shipInfoMenu.papersPage);
  shipInfoMenu.papersPage = page.page;
  const summaryY = panel.y + 27;
  drawOptionsText("ACTIVE DOCUMENTS", panel.x + 12, summaryY, { color: "#c7dcd0" });
  drawOptionsText(`${view.papers.length} HELD`, panel.x + panel.w - 12, summaryY, {
    align: "right",
    color: view.papers.length > 0 ? "#fbb954" : "#9babb2"
  });

  const typeX = panel.x + 12;
  const documentX = panel.x + 78;
  const detailX = panel.x + 218;
  const dateX = panel.x + panel.w - 12;
  const headerY = panel.y + 43;
  ctx.fillStyle = "#625565";
  ctx.fillRect(panel.x + 10, headerY - 4, panel.w - 20, 1);
  drawOptionsText("TYPE", typeX, headerY, { color: "#ab947a" });
  drawOptionsText("DOCUMENT", documentX, headerY, { color: "#ab947a" });
  drawOptionsText("DETAIL", detailX, headerY, { color: "#ab947a" });
  drawOptionsText("DATE", dateX, headerY, { align: "right", color: "#ab947a" });

  if (page.rows.length === 0) {
    drawOptionsText("NO SHIP PAPERS HELD", panel.x + 12, panel.y + 63, { color: "#9babb2" });
  }
  page.rows.forEach((paper, index) => {
    const y = panel.y + 57 + index * 18;
    ctx.fillStyle = index % 2 === 0 ? "rgba(46, 34, 47, 0.42)" : "rgba(46, 34, 47, 0.18)";
    ctx.fillRect(panel.x + 10, y - 3, panel.w - 20, 16);
    const typeColor = paper.kind === "marque"
      ? "#91db69"
      : paper.kind === "delivery"
        ? "#fbb954"
        : "#c7dcd0";
    drawOptionsText(fitPixelText(paper.kind.toUpperCase(), PIXEL_FONT_UI_8, 55), typeX, y, {
      color: typeColor
    });
    drawOptionsText(fitPixelText(paper.title.toUpperCase(), PIXEL_FONT_UI_8, 126), documentX, y, {
      color: "#ffffff"
    });
    drawOptionsText(fitPixelText(paper.issuer.toUpperCase(), PIXEL_FONT_UI_8, 126), documentX, y + 8, {
      color: "#9babb2"
    });
    drawOptionsText(fitPixelText(paper.route.toUpperCase(), PIXEL_FONT_UI_8, 145), detailX, y, {
      color: "#c7dcd0"
    });
    drawOptionsText(fitPixelText(paper.detail.toUpperCase(), PIXEL_FONT_UI_8, 145), detailX, y + 8, {
      color: "#ab947a"
    });
    drawOptionsText(shipLedgerDateLabel(paper.simMinute), dateX, y, {
      align: "right",
      color: Number.isFinite(paper.simMinute) ? "#9babb2" : "#625565"
    });
  });

  const pagerY = panel.y + panel.h - 18;
  if (page.pageCount > 1) {
    shipInfoMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: 13, h: 12 };
    shipInfoMenu.nextPageRect = { x: panel.x + panel.w - 25, y: pagerY, w: 13, h: 12 };
    drawShipInfoArrowButton(
      shipInfoMenu.previousPageRect,
      "<",
      pointInRect(optionsMenu.hoverPoint, shipInfoMenu.previousPageRect)
    );
    drawShipInfoArrowButton(
      shipInfoMenu.nextPageRect,
      ">",
      pointInRect(optionsMenu.hoverPoint, shipInfoMenu.nextPageRect)
    );
  } else {
    shipInfoMenu.previousPageRect = null;
    shipInfoMenu.nextPageRect = null;
  }
  drawOptionsText(`PAGE ${page.page + 1}/${page.pageCount}`, panel.x + panel.w / 2, pagerY + 2, {
    align: "center",
    color: "#9babb2"
  });
}

function formatSignedLedgerMoney(value) {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

function ledgerPnlColor(value) {
  if (value > 0.004) return "#91db69";
  if (value < -0.004) return "#f68181";
  return "#fbb954";
}

function drawShipInfoValueRow(label, value, x, valueX, y) {
  drawOptionsText(label, x, y, { color: "#c7dcd0" });
  drawOptionsText(value, valueX, y, { align: "right", color: "#ffffff" });
}

function drawShipInfoRating(label, rating, x, y) {
  drawOptionsText(label, x, y, { color: "#c7dcd0" });
  const meterX = x + 78;
  for (let index = 0; index < 10; index++) {
    ctx.fillStyle = index < rating ? "#30e1b9" : "#625565";
    ctx.fillRect(meterX + index * 8, y + 2, 6, 5);
  }
  drawOptionsText(String(rating), meterX + 89, y, { align: "right", color: "#ffffff" });
}

function drawShipInfoBar(x, y, width, fraction, color) {
  ctx.fillStyle = "#2e222f";
  ctx.fillRect(x, y, width, 6);
  ctx.strokeStyle = "#625565";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 5);
  const fillWidth = Math.round((width - 2) * clamp(fraction, 0, 1));
  if (fillWidth > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, fillWidth, 4);
  }
}

function drawShipInfoCloseButton(rect, hovered) {
  ctx.fillStyle = hovered ? "#625565" : "#2e222f";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hovered ? "#ffffff" : "#7f708a";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  drawOptionsText("X", rect.x + rect.w / 2, rect.y + 3, {
    align: "center",
    color: hovered ? "#ffffff" : "#c7dcd0"
  });
}

function drawShipInfoArrowButton(rect, label, hovered) {
  ctx.fillStyle = hovered ? "#625565" : "#2e222f";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hovered ? "#ffffff" : "#7f708a";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  drawOptionsText(label, rect.x + rect.w / 2, rect.y + 2, {
    align: "center",
    color: hovered ? "#ffffff" : "#fbb954"
  });
}

function drawDiscoveriesMenu() {
  const panelX = Math.floor((SCREEN_W - DISCOVERIES_PANEL_W) / 2);
  const panelY = Math.floor((SCREEN_H - DISCOVERIES_PANEL_H) / 2);
  discoveriesMenu.panelRect = { x: panelX, y: panelY, w: DISCOVERIES_PANEL_W, h: DISCOVERIES_PANEL_H };

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#17130e";
  ctx.fillRect(panelX, panelY, DISCOVERIES_PANEL_W, DISCOVERIES_PANEL_H);
  ctx.strokeStyle = "#a27a3b";
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, DISCOVERIES_PANEL_W - 1, DISCOVERIES_PANEL_H - 1);

  const closeSize = 14;
  discoveriesMenu.closeButtonRect = {
    x: panelX + DISCOVERIES_PANEL_W - closeSize - 6,
    y: panelY + 6,
    w: closeSize,
    h: closeSize
  };
  drawOptionsCloseButton(
    discoveriesMenu.closeButtonRect,
    pointInRect(optionsMenu.hoverPoint, discoveriesMenu.closeButtonRect)
  );
  drawOptionsText("DISCOVERIES", panelX + DISCOVERIES_PANEL_W / 2, panelY + 9, {
    align: "center",
    color: "#ffd98a"
  });

  const entries = discoveredEntries(gameState);
  const total = discoveryCatalog.length;
  const discoveryFraction = total > 0 ? entries.length / total : 0;
  const mappedFraction = minimap ? minimap.seenTileCount / graph.tileCount : 0;
  drawDiscoveryProgressRow(
    panelX + 12,
    panelY + 31,
    "FOUND",
    `${entries.length}/${total}`,
    discoveryFraction,
    "#d6a84f"
  );
  drawDiscoveryProgressRow(
    panelX + 12,
    panelY + 51,
    "GLOBE MAPPED",
    `${(mappedFraction * 100).toFixed(2)}%`,
    mappedFraction,
    "#6aa6a1"
  );

  const pageCount = Math.max(1, Math.ceil(entries.length / DISCOVERIES_PAGE_SIZE));
  discoveriesMenu.page = clamp(discoveriesMenu.page, 0, pageCount - 1);
  const pageStart = discoveriesMenu.page * DISCOVERIES_PAGE_SIZE;
  const pageEntries = entries.slice(pageStart, pageStart + DISCOVERIES_PAGE_SIZE);
  const listX = panelX + 13;
  const listY = panelY + 79;
  if (pageEntries.length === 0) {
    drawOptionsText("NO DISCOVERIES YET", listX, listY, { color: "#8f8779" });
  } else {
    pageEntries.forEach((entry, index) => {
      const y = listY + index * 12;
      ctx.fillStyle = discoveryKindColor(entry.kind);
      ctx.fillRect(listX, y + 2, 3, 3);
      drawOptionsText(
        fitPixelText(entry.displayName, PIXEL_FONT_UI_8, DISCOVERIES_PANEL_W - 37),
        listX + 8,
        y,
        { color: "#eee4cf" }
      );
    });
  }

  const pagerY = panelY + DISCOVERIES_PANEL_H - 21;
  discoveriesMenu.previousPageRect = { x: panelX + 12, y: pagerY, w: 14, h: 13 };
  discoveriesMenu.nextPageRect = { x: panelX + DISCOVERIES_PANEL_W - 26, y: pagerY, w: 14, h: 13 };
  drawOptionsArrowButton(
    discoveriesMenu.previousPageRect,
    "<",
    pointInRect(optionsMenu.hoverPoint, discoveriesMenu.previousPageRect)
  );
  drawOptionsArrowButton(
    discoveriesMenu.nextPageRect,
    ">",
    pointInRect(optionsMenu.hoverPoint, discoveriesMenu.nextPageRect)
  );
  drawOptionsText(`PAGE ${discoveriesMenu.page + 1}/${pageCount}`, panelX + DISCOVERIES_PANEL_W / 2, pagerY + 3, {
    align: "center",
    color: "#a9a08f"
  });
  ctx.restore();
}

function drawDiscoveryProgressRow(x, y, label, value, fraction, color) {
  drawOptionsText(label, x, y, { color: "#d7d0c2" });
  drawOptionsText(value, x + 103, y, { align: "right", color: "#fff1bf" });
  const barX = x + 112;
  const barY = y + 1;
  const barW = 160;
  const barH = 7;
  ctx.fillStyle = "#28231d";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = "#675a49";
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);
  const fillW = Math.round((barW - 2) * clamp(fraction, 0, 1));
  if (fillW > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(barX + 1, barY + 1, fillW, barH - 2);
  }
}

function discoveryKindColor(kind) {
  if (kind === "mountain") return "#aaa3b8";
  if (kind === "landmark") return "#d6a84f";
  if (kind === "legend") return "#f04f78";
  if (kind === "achievement") return "#6aa6a1";
  throw new Error(`Unknown discovery kind: ${kind}`);
}

function drawPoliticsMenu() {
  const panel = {
    x: POLITICS_PANEL_X,
    y: POLITICS_PANEL_Y,
    w: POLITICS_PANEL_W,
    h: POLITICS_PANEL_H
  };
  const view = createPoliticsView(gameState);
  const page = politicsRowsPage(view, politicsMenu.page, POLITICS_ROWS_PER_PAGE);
  politicsMenu.page = page.page;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#17130e";
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = "#a27a3b";
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);

  const closeSize = 14;
  politicsMenu.closeButtonRect = {
    x: panel.x + panel.w - closeSize - 6,
    y: panel.y + 6,
    w: closeSize,
    h: closeSize
  };
  drawOptionsCloseButton(
    politicsMenu.closeButtonRect,
    pointInRect(optionsMenu.hoverPoint, politicsMenu.closeButtonRect)
  );
  drawOptionsText("POLITICAL CHART", panel.x + panel.w / 2, panel.y + 9, {
    align: "center",
    color: "#ffd98a"
  });

  const legendY = panel.y + 27;
  drawOptionsText("A ALLY", panel.x + 12, legendY, { color: "#91db69" });
  drawOptionsText("W WAR", panel.x + 62, legendY, { color: "#f68181" });
  drawOptionsText("- NEUTRAL", panel.x + 108, legendY, { color: "#9babb2" });
  drawOptionsText("PLAYER STANDING", panel.x + panel.w - 12, legendY, {
    align: "right",
    color: "#d6b66b"
  });

  const rowLabelX = panel.x + 12;
  const matrixX = panel.x + 124;
  const headerY = panel.y + 42;
  const matrixY = panel.y + 58;
  const statusX = matrixX + view.powers.length * POLITICS_MATRIX_CELL_W + 8;
  const statusW = panel.x + panel.w - statusX - 12;
  drawOptionsText("POWER", rowLabelX, headerY + 5, { color: "#ab947a" });
  drawOptionsText("STANCE TOWARD", matrixX, headerY - 4, { color: "#ab947a" });
  drawOptionsText("STATUS", statusX, headerY + 5, { color: "#ab947a" });

  view.powers.forEach((power, index) => {
    const x = matrixX + index * POLITICS_MATRIX_CELL_W;
    drawPoliticsColumnCode(power.code, x, headerY + 12, politicsFactionColor(power.id));
  });

  page.rows.forEach((row, rowIndex) => {
    const y = matrixY + rowIndex * POLITICS_MATRIX_ROW_H;
    ctx.fillStyle = rowIndex % 2 === 0 ? "rgba(46, 34, 47, 0.28)" : "rgba(46, 34, 47, 0.12)";
    ctx.fillRect(panel.x + 10, y - 1, panel.w - 20, POLITICS_MATRIX_ROW_H);
    drawOptionsText(
      fitPixelText(row.faction.adjective.toUpperCase(), PIXEL_FONT_UI_8, 104),
      rowLabelX,
      y,
      { color: politicsFactionColor(row.faction.id) }
    );
    row.stances.forEach((stance, index) => {
      drawPoliticsMatrixCell(
        matrixX + index * POLITICS_MATRIX_CELL_W,
        y,
        stance.relation,
        row.faction.id === stance.factionId
      );
    });
    drawPoliticsStanding(row.player, statusX, y, statusW);
  });

  const pagerY = panel.y + panel.h - 18;
  politicsMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: 14, h: 13 };
  politicsMenu.nextPageRect = { x: panel.x + panel.w - 26, y: pagerY, w: 14, h: 13 };
  drawOptionsArrowButton(
    politicsMenu.previousPageRect,
    "<",
    pointInRect(optionsMenu.hoverPoint, politicsMenu.previousPageRect)
  );
  drawOptionsArrowButton(
    politicsMenu.nextPageRect,
    ">",
    pointInRect(optionsMenu.hoverPoint, politicsMenu.nextPageRect)
  );
  drawOptionsText(`PAGE ${page.page + 1}/${page.pageCount}`, panel.x + panel.w / 2, pagerY + 3, {
    align: "center",
    color: "#a9a08f"
  });
  ctx.restore();
}

function drawPoliticsColumnCode(code, x, y, color) {
  ctx.save();
  ctx.translate(x + 1, y);
  ctx.rotate(-Math.PI / 2);
  drawOptionsText(code, 0, 0, { color });
  ctx.restore();
}

function drawPoliticsMatrixCell(x, y, relation, self) {
  const glyph = politicsRelationGlyph(relation);
  ctx.fillStyle = self ? "#3e3546" : "rgba(0, 0, 0, 0.22)";
  ctx.fillRect(x, y, POLITICS_MATRIX_CELL_W - 1, POLITICS_MATRIX_ROW_H - 1);
  drawOptionsText(glyph, x + 1, y, {
    color: self ? "#fff1bf" : politicsRelationColor(relation)
  });
}

function drawPoliticsStanding(player, x, y, width) {
  const scoreW = 25;
  drawOptionsText(player.scoreLabel, x, y, {
    color: politicsStandingColor(player.reputation)
  });
  drawOptionsText(
    fitPixelText(
      player.hasLetterOfMarque ? `${player.label.toUpperCase()} MARQUE` : player.label.toUpperCase(),
      PIXEL_FONT_UI_8,
      Math.max(0, width - scoreW)
    ),
    x + scoreW,
    y,
    { color: "#eee4cf" }
  );
}

function politicsRelationGlyph(relation) {
  if (relation === DIPLOMACY_ALLY) return "A";
  if (relation === DIPLOMACY_WAR) return "W";
  if (relation === DIPLOMACY_NEUTRAL) return "-";
  throw new Error(`Unknown political relation: ${relation}`);
}

function politicsRelationColor(relation) {
  if (relation === DIPLOMACY_ALLY) return "#91db69";
  if (relation === DIPLOMACY_WAR) return "#f68181";
  if (relation === DIPLOMACY_NEUTRAL) return "#9babb2";
  throw new Error(`Unknown political relation: ${relation}`);
}

function politicsStandingColor(reputation) {
  if (reputation <= -75) return "#f04f78";
  if (reputation <= -25) return "#cd683d";
  if (reputation < 0) return "#7f708a";
  if (reputation === 0) return "#9babb2";
  if (reputation < 15) return "#91db69";
  if (reputation < 50) return "#30e1b9";
  return "#fff1bf";
}

function politicsFactionColor(factionId) {
  if (factionId === PIRATE_FACTION_ID) return "#f04f78";
  return "#eee4cf";
}

function drawOptionsMenu() {
  const panelX = Math.floor((SCREEN_W - OPTIONS_PANEL_W) / 2);
  const panelY = Math.floor((SCREEN_H - OPTIONS_PANEL_H) / 2);
  optionsMenu.panelRect = { x: panelX, y: panelY, w: OPTIONS_PANEL_W, h: OPTIONS_PANEL_H };

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#101010";
  ctx.fillRect(panelX, panelY, OPTIONS_PANEL_W, OPTIONS_PANEL_H);
  ctx.strokeStyle = "#8b0000";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, OPTIONS_PANEL_W - 2, OPTIONS_PANEL_H - 2);

  const closeSize = 14;
  const closeX = panelX + OPTIONS_PANEL_W - closeSize - 6;
  const closeY = panelY + 6;
  optionsMenu.closeButtonRect = { x: closeX, y: closeY, w: closeSize, h: closeSize };
  drawOptionsCloseButton(optionsMenu.closeButtonRect, pointInRect(optionsMenu.hoverPoint, optionsMenu.closeButtonRect));

  drawOptionsText("OPTIONS", panelX + OPTIONS_PANEL_W / 2, panelY + 9, {
    align: "center",
    color: "#ffd700"
  });

  const rowX = panelX + 10;
  const rowW = OPTIONS_PANEL_W - 20;
  const fullscreenRow = { x: rowX, y: panelY + 31, w: rowW, h: OPTIONS_ROW_H - 2 };
  const musicRow = { x: rowX, y: panelY + 55, w: rowW, h: OPTIONS_ROW_H - 2 };
  const sfxRow = { x: rowX, y: panelY + 79, w: rowW, h: OPTIONS_ROW_H - 2 };
  const muteRow = { x: rowX, y: panelY + 103, w: rowW, h: OPTIONS_ROW_H - 2 };
  const shipRow = { x: rowX, y: panelY + 127, w: rowW, h: OPTIONS_ROW_H - 2 };
  optionsMenu.rowRects = [fullscreenRow, musicRow, sfxRow, muteRow, shipRow];

  drawOptionsFullscreenRow(fullscreenRow, optionsMenu.selectedIndex === OPTIONS_ROW_FULLSCREEN);
  drawOptionsVolumeRow(musicRow, "MUSIC", "music", optionsMenu.musicVolume, optionsMenu.selectedIndex === OPTIONS_ROW_MUSIC);
  drawOptionsVolumeRow(sfxRow, "SFX", "sfx", optionsMenu.sfxVolume, optionsMenu.selectedIndex === OPTIONS_ROW_SFX);
  drawOptionsMuteRow(muteRow, optionsMenu.selectedIndex === OPTIONS_ROW_MUTE);
  drawOptionsShipRow(shipRow, optionsMenu.selectedIndex === OPTIONS_ROW_SHIP);
  ctx.restore();
}

function drawOptionsFullscreenRow(rowRect, highlighted) {
  drawOptionsRowFrame(rowRect, highlighted);
  const isFullscreen = document.fullscreenElement === shell;
  const label = optionsMenu.fullscreenError || (
    fullscreenAvailable()
      ? (isFullscreen ? "EXIT FULLSCREEN" : "ENTER FULLSCREEN")
      : "FULLSCREEN UNAVAILABLE"
  );
  drawOptionsText(fitPixelText(label, PIXEL_FONT_UI_8, rowRect.w - 16), rowRect.x + 8, rowRect.y + 6, {
    color: optionsMenu.fullscreenError
      ? "#ff8888"
      : (fullscreenAvailable() ? (highlighted ? "#ffffff" : "#ffd700") : "#777777")
  });
}

function drawOptionsCloseButton(rect, hovered) {
  ctx.fillStyle = hovered ? "#3a3a3a" : "#222222";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hovered ? "#ffffff" : "#666666";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  drawOptionsText("X", rect.x + rect.w / 2, rect.y + 3, {
    align: "center",
    color: hovered ? "#ffffff" : "#cccccc"
  });
}

function drawOptionsVolumeRow(rowRect, label, sliderKey, value, highlighted) {
  drawOptionsRowFrame(rowRect, highlighted);
  drawOptionsText(label, rowRect.x + 8, rowRect.y + 6, {
    color: highlighted ? "#ffffff" : "#ffd700"
  });

  const sliderW = 70;
  const sliderH = 8;
  const sliderX = rowRect.x + 66;
  const sliderY = rowRect.y + 6;
  optionsMenu.sliderRects[sliderKey] = { x: sliderX, y: sliderY, w: sliderW, h: sliderH };
  optionsMenu.sliderHitRects[sliderKey] = { x: sliderX - 3, y: rowRect.y, w: sliderW + 6, h: rowRect.h };

  const percent = Math.round(value * 100);
  ctx.fillStyle = "#202020";
  ctx.fillRect(sliderX, sliderY, sliderW, sliderH);
  ctx.strokeStyle = highlighted ? "#ffffff" : "#777777";
  ctx.lineWidth = 1;
  ctx.strokeRect(sliderX + 0.5, sliderY + 0.5, sliderW - 1, sliderH - 1);
  const fillW = Math.max(0, Math.min(sliderW - 2, Math.round((sliderW - 2) * value)));
  if (fillW > 0) {
    ctx.fillStyle = "#66ccff";
    ctx.fillRect(sliderX + 1, sliderY + 1, fillW, sliderH - 2);
  }
  const knobX = sliderX + clamp(Math.round((sliderW - 2) * value), 0, sliderW - 2);
  ctx.fillStyle = "#fff4a8";
  ctx.fillRect(knobX, sliderY - 1, 2, sliderH + 2);

  drawOptionsText(`${percent}%`, rowRect.x + rowRect.w - 8, rowRect.y + 6, {
    align: "right",
    color: "#eeeeee"
  });
}

function drawOptionsMuteRow(rowRect, highlighted) {
  drawOptionsRowFrame(rowRect, highlighted);
  drawOptionsText("MUTE", rowRect.x + 8, rowRect.y + 6, {
    color: highlighted ? "#ffffff" : "#ffd700"
  });

  const boxSize = 10;
  const boxX = rowRect.x + rowRect.w - boxSize - 12;
  const boxY = rowRect.y + Math.floor((rowRect.h - boxSize) / 2);
  optionsMenu.muteRect = { x: boxX - 10, y: rowRect.y, w: boxSize + 20, h: rowRect.h };

  ctx.fillStyle = optionsMenu.muted ? "#66ccff" : "#202020";
  ctx.fillRect(boxX, boxY, boxSize, boxSize);
  ctx.strokeStyle = highlighted ? "#ffffff" : "#777777";
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxSize - 1, boxSize - 1);
  if (optionsMenu.muted) {
    ctx.strokeStyle = "#001018";
    ctx.beginPath();
    ctx.moveTo(boxX + 2, boxY + 5);
    ctx.lineTo(boxX + 4, boxY + 8);
    ctx.lineTo(boxX + 8, boxY + 2);
    ctx.stroke();
  }
}

function drawOptionsShipRow(rowRect, highlighted) {
  drawOptionsRowFrame(rowRect, highlighted);
  drawOptionsText("SHIP", rowRect.x + 8, rowRect.y + 6, {
    color: highlighted ? "#ffffff" : "#ffd700"
  });

  const buttonSize = 12;
  const buttonY = rowRect.y + Math.floor((rowRect.h - buttonSize) / 2);
  const prevRect = { x: rowRect.x + 51, y: buttonY, w: buttonSize, h: buttonSize };
  const nextRect = { x: rowRect.x + rowRect.w - buttonSize - 8, y: buttonY, w: buttonSize, h: buttonSize };
  optionsMenu.shipPrevRect = prevRect;
  optionsMenu.shipNextRect = nextRect;

  drawOptionsArrowButton(prevRect, "<", highlighted && pointInRect(optionsMenu.hoverPoint, prevRect));
  drawOptionsArrowButton(nextRect, ">", highlighted && pointInRect(optionsMenu.hoverPoint, nextRect));

  const valueX = prevRect.x + prevRect.w + 5;
  const valueW = nextRect.x - valueX - 5;
  const label = optionsMenu.shipError || shipLabelForSlug(optionsMenu.shipSlug);
  const fittedLabel = fitPixelText(label, PIXEL_FONT_UI_8, valueW);
  const loading = optionsMenu.shipLoadingSlug === optionsMenu.shipSlug;
  drawOptionsText(loading ? fitPixelText(`${fittedLabel}...`, PIXEL_FONT_UI_8, valueW) : fittedLabel, valueX, rowRect.y + 6, {
    color: optionsMenu.shipError ? "#ff8888" : "#eeeeee"
  });
}

function drawOptionsArrowButton(rect, label, highlighted) {
  ctx.fillStyle = highlighted ? "#3a3a3a" : "#202020";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = highlighted ? "#ffffff" : "#777777";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  drawOptionsText(label, rect.x + rect.w / 2, rect.y + 2, {
    align: "center",
    color: highlighted ? "#ffffff" : "#ffd700"
  });
}

function drawOptionsRowFrame(rect, highlighted) {
  ctx.fillStyle = highlighted ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = highlighted ? "#eeeeee" : "#444444";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
}

function drawOptionsText(text, x, y, options = {}) {
  ctx.fillStyle = options.color || "#d7d9bf";
  drawPixelText(text, x, y, {
    font: PIXEL_FONT_UI_8,
    align: options.align || "left"
  });
}

function fitPixelText(text, font, maxWidth) {
  if (measurePixelTextWidth(text, font) <= maxWidth) return text;
  const suffix = "...";
  const suffixWidth = measurePixelTextWidth(suffix, font);
  let kept = "";
  for (const char of text) {
    if (measurePixelTextWidth(kept + char, font) + suffixWidth > maxWidth) break;
    kept += char;
  }
  return kept.length > 0 ? `${kept}${suffix}` : suffix;
}

function drawPixelText(text, x, y, options = {}) {
  const font = options.font || PIXEL_FONT_BODY_8;
  const align = options.align || "left";
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const textW = measurePixelTextWidth(text, font);
  let drawX = Math.round(x);
  if (align === "center") drawX = Math.round(x - textW / 2);
  if (align === "right") drawX = Math.round(x - textW);
  const drawY = Math.round(y);
  ctx.fillText(text, drawX, drawY);
  return { x: drawX, y: drawY, w: textW, h: CITY_LABEL_H };
}

function measurePixelTextWidth(text, font = PIXEL_FONT_BODY_8) {
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  return Math.ceil(ctx.measureText(text).width);
}

function minimapLandWeight(row) {
  const t = row?.t || "";
  if (t === "water" || t === "lake") return 0;
  if (t === "beach") return 0;
  if (t === "ice" && row.m == null) return 0.15;
  return 1;
}

function isCoastalWaterRow(row) {
  return (row?.t || "") === "beach";
}

function isWaterSurfaceRow(row) {
  // The shared globe cache uses "beach" for underwater coastal waters.
  const t = row?.t || "";
  return t === "water" || t === "lake" || isCoastalWaterRow(row);
}

function minimapPixelLandFraction(pixel) {
  const total = minimap.pixelTileCounts[pixel];
  if (total === 0) return 0;
  return clamp(minimap.pixelLandWeights[pixel] / total, 0, 1);
}

function minimapColor(fraction, pixel) {
  const landFraction = clamp(fraction, 0, 1);
  if (landFraction <= 0) return MINIMAP_WATER_COLOR;
  const boostedLand = Math.max(MINIMAP_PARTIAL_LAND_FLOOR, Math.pow(landFraction, MINIMAP_PARTIAL_LAND_GAMMA));
  const dither = landFraction < 1 ? minimapPixelDither(pixel) * MINIMAP_PARTIAL_DITHER : 0;
  const shade = clamp(boostedLand + dither, MINIMAP_PARTIAL_LAND_FLOOR, 1);
  return lerpRgbColor(MINIMAP_WATER_COLOR, MINIMAP_LAND_COLOR, shade);
}

function minimapPixelDither(pixel) {
  return ((hashInt(pixel ^ 0x5bd1e995) & 0xff) / 255 - 0.5) * 2;
}

function lerpRgbColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function minimapX(lonDeg) {
  const lon = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  return clamp(Math.floor(((lon + 180) / 360) * MINIMAP_W), 0, MINIMAP_W - 1);
}

function wrapMinimapX(x) {
  return ((x % MINIMAP_W) + MINIMAP_W) % MINIMAP_W;
}

function minimapY(latDeg) {
  const mercator = mercatorYForLatDeg(clamp(latDeg, -MINIMAP_MAX_LAT_DEG, MINIMAP_MAX_LAT_DEG));
  return clamp(Math.floor(((MINIMAP_MAX_MERCATOR - mercator) / (MINIMAP_MAX_MERCATOR * 2)) * MINIMAP_H), 0, MINIMAP_H - 1);
}

function mercatorYForLatDeg(latDeg) {
  const lat = latDeg * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + lat / 2));
}

function collectChartTiles(chartCamera, chartCenterTileId) {
  const visible = [];
  const seen = new Set([chartCenterTileId]);
  const q = [chartCenterTileId];
  const maxDistance = Math.hypot(SCREEN_W / 2 + CHART_MARGIN, SCREEN_H / 2 + CHART_MARGIN) / PIXELS_PER_RADIAN + 0.025;
  const minDot = Math.cos(maxDistance);
  let qi = 0;

  while (qi < q.length && q.length < MAX_CHART_TILES) {
    const id = q[qi++];
    const d = dotTile(id, chartCamera.center);
    if (d < minDot) continue;

    const p = projectTileCenterFor(id, chartCamera);
    if (!p) continue;
    if (p.x >= -CHART_MARGIN && p.x <= SCREEN_W + CHART_MARGIN && p.y >= -CHART_MARGIN && p.y <= SCREEN_H + CHART_MARGIN) {
      visible.push({ id, x: p.x, y: p.y });
    }

    if (p.x >= -CHART_MARGIN * 1.2 && p.x <= SCREEN_W + CHART_MARGIN * 1.2 && p.y >= -CHART_MARGIN * 1.2 && p.y <= SCREEN_H + CHART_MARGIN * 1.2) {
      for (const nid of graph.neighbors[id]) {
        if (seen.has(nid)) continue;
        seen.add(nid);
        q.push(nid);
      }
    }
  }

  return visible;
}

function projectTileCenterFor(id, view) {
  const center = graphCenter(graph, id, scratchVec);
  return projectDirectionFor(center, view, true);
}

const scratchVec = [0, 0, 0];

function projectDirectionFor(v, view, snap) {
  const d = dot3(v, view.center);
  if (d <= 0.2) return null;
  const vx = dot3(v, view.right);
  const vy = dot3(v, view.up);
  const sinTheta = Math.sqrt(Math.max(0, 1 - d * d));
  const k = sinTheta > 1e-6 ? Math.acos(clamp(d, -1, 1)) / sinTheta : 1;
  const x = SCREEN_W / 2 + vx * k * PIXELS_PER_RADIAN;
  const y = SCREEN_H / 2 - vy * k * PIXELS_PER_RADIAN;
  return snap ? { x: Math.round(x), y: Math.round(y) } : { x, y };
}

function drawFace(call, activeChart, options = {}) {
  const aTile = activeChart.tileById.get(call.a);
  const bTile = activeChart.tileById.get(call.b);
  const sourceAx = aTile ? aTile.drawSurfaceX : call.ax;
  const sourceAy = aTile ? aTile.drawSurfaceY : call.ay;
  const sourceBx = bTile ? bTile.drawSurfaceX : call.bx;
  const sourceBy = bTile ? bTile.drawSurfaceY : call.by;
  const dx = sourceBx - sourceAx;
  const dy = sourceBy - sourceAy;
  const len = Math.hypot(dx, dy);
  if (len < TILE_RADIUS_PX * 1.7) return;

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const overlap = options.coverFront ? FRONT_FACE_OVERLAP_PX : 0;
  const start = Math.max(2, TILE_RADIUS_PX - 1 - overlap);
  const end = len - TILE_RADIUS_PX + 1;
  const width = FACE_HALF_WIDTH + Math.min(2, Math.abs(call.nlevel - call.level)) + (options.coverFront ? 1 : 0);
  const ax = sourceAx + ux * start;
  const ay = sourceAy + uy * start;
  const bx = sourceAx + ux * end;
  const by = sourceAy + uy * end;
  const bend = (hash2(call.a, call.b) - 0.5) * 2.2;
  const mx = (ax + bx) * 0.5 + nx * bend;
  const my = (ay + by) * 0.5 + ny * bend;

  ctx.fillStyle = faceColorFor(call);
  ctx.beginPath();
  ctx.moveTo(Math.round(ax + nx * width), Math.round(ay + ny * width));
  ctx.lineTo(Math.round(mx + nx * (width + 1)), Math.round(my + ny * (width + 1)));
  ctx.lineTo(Math.round(bx + nx * width), Math.round(by + ny * width));
  ctx.lineTo(Math.round(bx - nx * width), Math.round(by - ny * width));
  ctx.lineTo(Math.round(mx - nx * (width - 1)), Math.round(my - ny * (width - 1)));
  ctx.lineTo(Math.round(ax - nx * width), Math.round(ay - ny * width));
  ctx.closePath();
  ctx.fill();

  drawMountainFaceFoot(call, ax, ay, mx, my, bx, by, nx, ny, width);

  if (isCoastFace(call)) {
    drawBeachFaceDetails(call, ax, ay, mx, my, bx, by, nx, ny, width);
  } else if (Math.abs(call.level - call.nlevel) >= 2) {
    ctx.strokeStyle = call.nlevel > call.level ? "#28261f" : "#d3cab0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(ax + nx * width), Math.round(ay + ny * width));
    ctx.lineTo(Math.round(mx + nx * (width + 1)), Math.round(my + ny * (width + 1)));
    ctx.lineTo(Math.round(bx + nx * width), Math.round(by + ny * width));
    ctx.stroke();
  }
}

function drawMountainFaceFoot(call, ax, ay, mx, my, bx, by, nx, ny, width) {
  if (isCoastFace(call)) return;
  const info = mountainFaceInfo(call);
  if (!info || info.bothMountain) return;

  const mountainAtStart = info.mountain.side === "a";
  const mountainPoint = mountainAtStart ? { x: ax, y: ay } : { x: bx, y: by };
  const pathT = mountainAtStart ? MOUNTAIN_FOOT_REACH : 1 - MOUNTAIN_FOOT_REACH;
  const tip = quadraticFacePoint(ax, ay, mx, my, bx, by, pathT);
  const color = terrainSpriteColor(mountainVariant(info.mountain.id));

  ctx.fillStyle = shadeHex(color, -18);
  ctx.beginPath();
  ctx.moveTo(
    Math.round(mountainPoint.x + nx * width),
    Math.round(mountainPoint.y + ny * width)
  );
  ctx.lineTo(
    Math.round(tip.x + nx * MOUNTAIN_FOOT_TIP_HALF_WIDTH),
    Math.round(tip.y + ny * MOUNTAIN_FOOT_TIP_HALF_WIDTH)
  );
  ctx.lineTo(
    Math.round(tip.x - nx * MOUNTAIN_FOOT_TIP_HALF_WIDTH),
    Math.round(tip.y - ny * MOUNTAIN_FOOT_TIP_HALF_WIDTH)
  );
  ctx.lineTo(
    Math.round(mountainPoint.x - nx * width),
    Math.round(mountainPoint.y - ny * width)
  );
  ctx.closePath();
  ctx.fill();
}

function quadraticFacePoint(ax, ay, mx, my, bx, by, t) {
  const omt = 1 - t;
  return {
    x: omt * omt * ax + 2 * omt * t * mx + t * t * bx,
    y: omt * omt * ay + 2 * omt * t * my + t * t * by
  };
}

function drawBeachFaceDetails(call, ax, ay, mx, my, bx, by, nx, ny, width) {
  const seed = hashInt(call.a ^ Math.imul(call.b, 0x9e3779b1));
  drawBeachLandEdgeJags(call, ax, ay, bx, by, nx, ny, width, seed);
  for (let i = 0; i < BEACH_SPECKLE_COUNT; i++) {
    const h = hashInt(seed ^ Math.imul(i + 1, 0x85ebca6b));
    const along = 0.24 + ((h & 0xff) / 255) * 0.52;
    const side = (((h >>> 8) & 0xff) / 255 - 0.5) * (width * 1.35);
    const x = ax + (bx - ax) * along + nx * side;
    const y = ay + (by - ay) * along + ny * side;
    ctx.fillStyle = (h & 1) === 0 ? BEACH_LIGHT_SPECKLE_COLOR : BEACH_DARK_SPECKLE_COLOR;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  drawBeachWave(call, ax, ay, mx, my, bx, by, nx, ny, width);
}

function drawBeachLandEdgeJags(call, ax, ay, bx, by, nx, ny, width, seed) {
  const waterIsA = isWaterSurfaceRow(call.row);
  const landRow = waterIsA ? call.nrow : call.row;
  const landId = waterIsA ? call.b : call.a;
  const landColor = terrainColorForTile(landRow, landId);

  const edgeX = waterIsA ? bx : ax;
  const edgeY = waterIsA ? by : ay;
  const intoLandX = waterIsA ? (bx - ax) : (ax - bx);
  const intoLandY = waterIsA ? (by - ay) : (ay - by);
  const intoLen = Math.hypot(intoLandX, intoLandY);
  if (intoLen < 1e-6) return;

  const ux = intoLandX / intoLen;
  const uy = intoLandY / intoLen;
  const beachColor = beachFaceColor(call);
  const landEdgeColor = shadeHex(landColor, 6);

  for (let i = 0; i < BEACH_LAND_EDGE_JAG_COUNT; i++) {
    const h = hashInt(seed ^ Math.imul(i + 1, 0xc2b2ae35));
    const side = (((h & 0xff) / 255) * 2 - 1) * (width - 1);
    const depth = 1 + ((h >>> 8) & 1);
    const length = 1 + ((h >>> 10) & 1);
    const x = edgeX + nx * side;
    const y = edgeY + ny * side;

    if ((h & 0x1000) === 0) {
      drawBeachJagPixelRun(x, y, ux, uy, depth, length, beachColor);
    } else {
      drawBeachJagPixelRun(x, y, -ux, -uy, depth, length, landEdgeColor);
    }
  }
}

function drawBeachJagPixelRun(x, y, dx, dy, depth, length, color) {
  ctx.fillStyle = color;
  const sideX = -dy;
  const sideY = dx;
  for (let d = 0; d < depth; d++) {
    for (let l = 0; l < length; l++) {
      ctx.fillRect(
        Math.round(x + dx * d + sideX * l),
        Math.round(y + dy * d + sideY * l),
        1,
        1
      );
    }
  }
}

function drawBeachWave(call, ax, ay, mx, my, bx, by, nx, ny, width) {
  const waterIsA = isWaterSurfaceRow(call.row);
  const wave = beachWaveState(call);
  const fromT = waterIsA ? 0 : 1;
  const toT = waterIsA ? wave.reach : 1 - wave.reach;
  const foamT = waterIsA ? wave.foamReach : 1 - wave.foamReach;
  drawBeachWaveWater(ax, ay, mx, my, bx, by, nx, ny, width, fromT, toT, beachWaterColor(call));
  drawBeachFoamLine(ax, ay, mx, my, bx, by, nx, ny, width, fromT, foamT, wave.foamAlpha);
}

function beachWaveState(call) {
  const offsetMs = hashInt(call.a ^ Math.imul(call.b, 0x632be59b)) % BEACH_WAVE_PERIOD_MS;
  const phase = ((waterAnimationClockMs + offsetMs) % BEACH_WAVE_PERIOD_MS) / BEACH_WAVE_PERIOD_MS;
  const reachSpan = BEACH_WAVE_MAX_REACH - BEACH_WAVE_MIN_REACH;
  if (phase < BEACH_WAVE_ADVANCE_RATIO) {
    const p = easeInOut(phase / BEACH_WAVE_ADVANCE_RATIO);
    const reach = BEACH_WAVE_MIN_REACH + reachSpan * p;
    return { reach, foamReach: reach, foamAlpha: 0.92 };
  }

  const fadePhase = (phase - BEACH_WAVE_ADVANCE_RATIO) / (1 - BEACH_WAVE_ADVANCE_RATIO);
  const foamAlpha = 0.92 * (1 - easeInOut(fadePhase));
  const recedeEnd = BEACH_WAVE_ADVANCE_RATIO + BEACH_WAVE_RECEDE_RATIO;
  if (phase < recedeEnd) {
    const p = easeInOut((phase - BEACH_WAVE_ADVANCE_RATIO) / BEACH_WAVE_RECEDE_RATIO);
    return {
      reach: BEACH_WAVE_MAX_REACH - reachSpan * p,
      foamReach: BEACH_WAVE_MAX_REACH,
      foamAlpha
    };
  }

  return {
    reach: BEACH_WAVE_MIN_REACH,
    foamReach: BEACH_WAVE_MAX_REACH,
    foamAlpha
  };
}

function drawBeachWaveWater(ax, ay, mx, my, bx, by, nx, ny, width, fromT, toT, color) {
  const lineHalfWidth = Math.max(2, Math.round(width));
  for (let side = -lineHalfWidth; side <= lineHalfWidth; side++) {
    const a = beachOffsetPoint(ax, ay, mx, my, bx, by, nx, ny, fromT, side);
    const roundedT = roundedBeachWaveT(fromT, toT, side, lineHalfWidth);
    const b = beachOffsetPoint(ax, ay, mx, my, bx, by, nx, ny, roundedT, side);
    drawPixelLine(Math.round(a.x), Math.round(a.y), Math.round(b.x), Math.round(b.y), color);
  }
}

function drawBeachFoamLine(ax, ay, mx, my, bx, by, nx, ny, width, fromT, t, alpha) {
  if (alpha <= 0.01) return;
  const lineHalfWidth = Math.max(2, width - 1);
  const color = `rgba(255, 253, 231, ${alpha.toFixed(3)})`;
  let previous = null;
  for (let side = -lineHalfWidth; side <= lineHalfWidth; side++) {
    const roundedT = roundedBeachWaveT(fromT, t, side, lineHalfWidth);
    const p = beachOffsetPoint(ax, ay, mx, my, bx, by, nx, ny, roundedT, side);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (previous) drawPixelLine(previous.x, previous.y, x, y, color);
    else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
    previous = { x, y };
  }
}

function roundedBeachWaveT(fromT, targetT, side, lineHalfWidth) {
  const edge = Math.abs(side) / Math.max(1, lineHalfWidth);
  const reachScale = 1 - BEACH_WAVE_EDGE_RECESS * edge * edge;
  return fromT + (targetT - fromT) * reachScale;
}

function beachOffsetPoint(ax, ay, mx, my, bx, by, nx, ny, t, side) {
  const p = beachCenterPoint(ax, ay, mx, my, bx, by, t);
  return {
    x: p.x + nx * side,
    y: p.y + ny * side
  };
}

function beachCenterPoint(ax, ay, mx, my, bx, by, t) {
  const inv = 1 - t;
  return {
    x: inv * inv * ax + 2 * inv * t * mx + t * t * bx,
    y: inv * inv * ay + 2 * inv * t * my + t * t * by
  };
}

function drawRiverConnector(call, activeChart) {
  const geometry = riverConnectorGeometry(call, activeChart);
  if (!geometry) return;
  const { path, a, b } = geometry;
  const seed = hashInt(call.a ^ Math.imul(call.b, 0x9e3779b1));
  const frameId = call.aWater ? call.b : call.a;
  const frame = waterFrameFor(frameId);
  const colors = riverPaletteForTile(frameId, frame);
  const mainColor = colors.base;

  drawPixelBezierStroke(ctx, path, mainColor, RIVER_CONNECTOR_RADIUS_PX);
  drawRiverConnectorMouthFlare(ctx, call, path, mainColor);
  drawPixelBrush(ctx, a.x, a.y, RIVER_CONNECTOR_RADIUS_PX, mainColor);
  drawPixelBrush(ctx, b.x, b.y, RIVER_CONNECTOR_RADIUS_PX, mainColor);
  if (call.aMouth && call.bWater) drawPixelBrush(ctx, b.x, b.y, RIVER_MOUTH_RADIUS_PX, mainColor);
  if (call.bMouth && call.aWater) drawPixelBrush(ctx, a.x, a.y, RIVER_MOUTH_RADIUS_PX, mainColor);
  drawRiverSparkles(ctx, path, frame, seed, colors.light);
}

function riverConnectorGeometry(call, activeChart) {
  const aTile = activeChart.tileById.get(call.a);
  const bTile = activeChart.tileById.get(call.b);
  const sourceAx = aTile ? aTile.drawSurfaceX : call.ax;
  const sourceAy = aTile ? aTile.drawSurfaceY : call.ay;
  const sourceBx = bTile ? bTile.drawSurfaceX : call.bx;
  const sourceBy = bTile ? bTile.drawSurfaceY : call.by;
  const dx = sourceBx - sourceAx;
  const dy = sourceBy - sourceAy;
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;

  const ux = dx / len;
  const uy = dy / len;
  let a = riverConnectorEndpoint(call, "a", sourceAx, sourceAy, ux, uy);
  let b = riverConnectorEndpoint(call, "b", sourceBx, sourceBy, -ux, -uy);
  const joinLen = Math.hypot(b.x - a.x, b.y - a.y);
  if (joinLen < RIVER_JOIN_MIN_LENGTH_PX) {
    const midX = (a.x + b.x) * 0.5;
    const midY = (a.y + b.y) * 0.5;
    const half = RIVER_JOIN_MIN_LENGTH_PX * 0.5;
    a = { x: midX - ux * half, y: midY - uy * half };
    b = { x: midX + ux * half, y: midY + uy * half };
  }

  const path = {
    x0: a.x,
    y0: a.y,
    cx: (a.x + b.x) * 0.5,
    cy: (a.y + b.y) * 0.5,
    x1: b.x,
    y1: b.y
  };
  return { path, a, b };
}

function riverConnectorPath(call, activeChart) {
  return riverConnectorGeometry(call, activeChart)?.path || null;
}

function riverConnectorEndpoint(call, side, x, y, towardX, towardY) {
  const water = side === "a" ? call.aWater : call.bWater;
  if (water) return { x, y };

  const mouth = side === "a" ? call.aMouth && call.bWater : call.bMouth && call.aWater;
  const arm = mouth ? RIVER_MOUTH_ARM_LENGTH_PX : RIVER_ARM_LENGTH_PX;
  return {
    x: x + towardX * arm,
    y: y + towardY * arm
  };
}

function drawTile(call, activeChart) {
  const img = terrainImageForTile(call.row, call.id);
  const x = Math.round(call.drawSurfaceX - TILE_ART_HALF);
  const y = Math.round(call.drawSurfaceY - TILE_ART_HALF);
  ctx.drawImage(img, x, y);

  if (graph.isPentagon[call.id]) {
    ctx.fillStyle = "rgba(31, 35, 26, 0.35)";
    ctx.fillRect(Math.round(call.drawSurfaceX) - 1, Math.round(call.drawSurfaceY) - 1, 3, 3);
  }
}

function cityImageForType(cityType) {
  if (!CITY_TYPE_KEY_SET.has(cityType)) throw new Error(`Unknown city type: ${cityType}`);
  const img = cityImages?.get(cityType);
  if (!img) throw new Error(`Missing loaded city type image: ${cityType}`);
  return img;
}

function drawWeatherSurface(call) {
  if (isWaterSurfaceRow(call.row)) return;
  const flags = weatherFlagsForTile(call.id);
  if ((flags & TILE_DAY_WET_SOIL) !== 0) {
    drawWeatherSpeckles(call, "rgba(53, 64, 75, 0.42)", 14, 0x57544554, 9, 6);
  }
}

function drawIceSurface(call) {
  if (!isWaterSurfaceRow(call.row)) return;
  if (!seaIceMask?.[call.id] && !freshwaterIceMask?.[call.id]) return;
  drawIceOverlay(call, freshwaterIceMask?.[call.id] ? 0.72 : 0.6);
}

function drawIceOverlay(call, alpha) {
  const img = terrainImage("ice_01");
  const x = Math.round(call.drawSurfaceX - TILE_ART_HALF);
  const y = Math.round(call.drawSurfaceY - TILE_ART_HALF);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y);
  ctx.restore();
  drawWeatherSpeckles(call, "rgba(229, 242, 235, 0.58)", 8, 0x494345, 10, 6);
}

function drawWeatherSpeckles(call, color, count, salt, radiusX, radiusY) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const h = hashInt(call.id ^ salt ^ Math.imul(i + 1, 0x9e3779b1));
    const dx = (((h & 0xff) / 255) * 2 - 1) * radiusX;
    const dy = ((((h >>> 8) & 0xff) / 255) * 2 - 1) * radiusY;
    if ((dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) > 1) continue;
    const x = Math.round(call.drawSurfaceX + dx);
    const y = Math.round(call.drawSurfaceY + dy);
    ctx.fillRect(x, y, (h >>> 20) & 1 ? 2 : 1, 1);
  }
}

function drawRiver(call, activeChart) {
  if (!riverMasks) return;
  const mask = riverMasks[call.id] || 0;
  if (mask === 0 || isWaterSurfaceRow(call.row)) return;
  const sprite = riverSpriteForTile(call, activeChart, mask);
  if (!sprite) return;
  const spriteX = Math.round(call.drawSurfaceX - TILE_ART_HALF);
  const spriteY = Math.round(call.drawSurfaceY - TILE_ART_HALF);
  ctx.drawImage(sprite, spriteX, spriteY);
}

function drawPrecipitation(activeChart, nowMs, offset) {
  const weatherTiles = collectPrecipitationTileCalls(activeChart, offset);
  visiblePrecipitationLastRender = weatherTiles.rain.length > 0 || weatherTiles.snow.length > 0;
  syncPrecipitationParticles(weatherTiles);

  for (const particle of precipParticles) {
    const call = weatherTiles.callsByParticleKey.get(precipParticleKey(particle.kind, particle.tileId));
    if (!call) continue;
    if (particle.kind === "rain") drawRainParticle(particle, call, nowMs);
    else drawSnowParticle(particle, call, nowMs);
  }
}

function collectPrecipitationTileCalls(activeChart, offset) {
  const rain = [];
  const snow = [];
  const callsByParticleKey = new Map();
  for (const call of activeChart.tileCalls) {
    if (!tileCallNearViewport(call, offset, PRECIP_PARTICLE_VIEW_MARGIN)) continue;
    const flags = weatherFlagsForTile(call.id);
    if ((flags & TILE_DAY_RAIN) !== 0 || stormIntensityForTile(call.id) >= STORM_ACTIVE_INTENSITY * 0.72) {
      rain.push(call);
      callsByParticleKey.set(precipParticleKey("rain", call.id), call);
    }
    if ((flags & TILE_DAY_SNOW_FALL) !== 0) {
      snow.push(call);
      callsByParticleKey.set(precipParticleKey("snow", call.id), call);
    }
  }
  return { rain, snow, callsByParticleKey };
}

function tileCallNearViewport(call, offset, margin) {
  const x = call.drawSurfaceX + offset.x;
  const y = call.drawSurfaceY + offset.y;
  return x >= -margin &&
    x <= SCREEN_W + margin &&
    y >= -margin &&
    y <= SCREEN_H + margin;
}

function syncPrecipitationParticles(weatherTiles) {
  if (weatherTiles.rain.length === 0 && weatherTiles.snow.length === 0) {
    precipParticles = [];
    return;
  }

  const activeKeys = new Set(weatherTiles.callsByParticleKey.keys());
  precipParticles = precipParticles.filter((particle) => (
    activeKeys.has(precipParticleKey(particle.kind, particle.tileId))
  ));
  syncPrecipitationKind("rain", weatherTiles.rain, RAIN_PARTICLE_LIMIT, RAIN_PARTICLES_PER_TILE);
  syncPrecipitationKind("snow", weatherTiles.snow, SNOW_PARTICLE_LIMIT, SNOW_PARTICLES_PER_TILE);
}

function syncPrecipitationKind(kind, calls, limit, perTile) {
  const target = Math.min(limit, calls.length * perTile);
  let count = 0;
  for (const particle of precipParticles) {
    if (particle.kind === kind) count++;
  }

  while (count > target) {
    let index = -1;
    for (let i = precipParticles.length - 1; i >= 0; i--) {
      if (precipParticles[i].kind === kind) {
        index = i;
        break;
      }
    }
    if (index < 0) break;
    precipParticles.splice(index, 1);
    count--;
  }

  while (count < target && calls.length > 0) {
    const serial = precipParticleSerial++;
    const pick = hashInt(serial ^ (kind === "rain" ? 0x5241494e : 0x534e4f57)) % calls.length;
    precipParticles.push(makePrecipitationParticle(kind, calls[pick], serial));
    count++;
  }
}

function makePrecipitationParticle(kind, call, serial) {
  const salt = kind === "rain" ? 0x85ebca6b : 0xc2b2ae35;
  const seed = hashInt(call.id ^ Math.imul(serial, salt));
  const lifeMs = kind === "rain"
    ? 460 + (seed & 0xff)
    : 1700 + ((seed >>> 8) & 0x3ff);
  return {
    kind,
    tileId: call.id,
    seed,
    lifeMs,
    phaseMs: hashInt(seed ^ 0x27d4eb2d) % lifeMs,
    offsetX: particleRange(seed, 0, -12, 12),
    offsetY: particleRange(seed, 8, -4, 4),
    alpha: kind === "rain"
      ? particleRange(seed, 16, 0.46, 0.72)
      : particleRange(seed, 16, 0.58, 0.86),
    driftAmp: kind === "snow" ? particleRange(seed, 24, 1, 4) : 0
  };
}

function drawRainParticle(particle, call, nowMs) {
  const progress = precipitationProgress(particle, nowMs);
  const wind = windForTile(call.id);
  const flowDir = wind.directionRad + Math.PI;
  const windX = Math.cos(flowDir) * clamp(wind.strength, 0.35, 1.35);
  const x = Math.round(call.drawSurfaceX + particle.offsetX + windX * progress * 8);
  const y = Math.round(call.drawSurfaceY - 15 + particle.offsetY * 0.35 + progress * 30);
  const color = `rgba(137, 184, 205, ${particle.alpha.toFixed(3)})`;

  if (progress > 0.88) {
    drawRainSplash(x, y, progress, color);
    return;
  }

  const tailX = Math.round(x - windX * 2);
  drawPixelLine(tailX, y - 3, x, y + 1, color);
}

function drawRainSplash(x, y, progress, color) {
  const stage = Math.floor((progress - 0.88) / 0.12 * 3);
  ctx.fillStyle = color;
  if (stage <= 0) {
    ctx.fillRect(x - 1, y, 3, 1);
  } else if (stage === 1) {
    ctx.fillRect(x - 2, y - 1, 1, 1);
    ctx.fillRect(x + 2, y - 1, 1, 1);
  }
}

function drawSnowParticle(particle, call, nowMs) {
  const progress = precipitationProgress(particle, nowMs);
  const wind = windForTile(call.id);
  const flowDir = wind.directionRad + Math.PI;
  const windX = Math.cos(flowDir) * clamp(wind.strength, 0.15, 1.1);
  const wobble = Math.sin((nowMs + particle.phaseMs) * 0.004 + particle.seed) * particle.driftAmp;
  const x = Math.round(call.drawSurfaceX + particle.offsetX + windX * progress * 5 + wobble);
  const y = Math.round(call.drawSurfaceY - 14 + particle.offsetY + progress * 28);

  ctx.fillStyle = `rgba(235, 241, 232, ${particle.alpha.toFixed(3)})`;
  ctx.fillRect(x, y, 1, 1);
  if (((particle.seed + Math.floor(nowMs / 240)) & 15) === 0) {
    ctx.fillRect(x + 1, y, 1, 1);
  }
}

function precipitationProgress(particle, nowMs) {
  return ((nowMs + particle.phaseMs) % particle.lifeMs) / particle.lifeMs;
}

function particleRange(seed, shift, min, max) {
  const u = ((seed >>> shift) & 0xff) / 255;
  return min + (max - min) * u;
}

function precipParticleKey(kind, tileId) {
  return `${kind}:${tileId}`;
}

function drawCloudLayer(activeChart) {
  if (!runtimeWeather || !cloudSprites) return;
  drawAnnualCloudSystems(activeChart);
  drawLocalWeatherClouds(activeChart);
}

function drawAnnualCloudSystems(activeChart) {
  for (let slot = 0; slot < runtimeWeather.maxCloudSlots; slot++) {
    const rec = slot * WEATHER_DAYS + weatherParts.dayIndex;
    const tileId = runtimeWeather.cloudSpawnTileIds[rec];
    const call = activeChart.tileById.get(tileId);
    if (!call) continue;
    const seed = hashInt(tileId ^ Math.imul(slot + 1, 0x9e3779b1));
    const wind = cloudWindForTile(tileId, seed);
    drawCloudAt(call, {
      seed,
      templateIndex: runtimeWeather.cloudTemplateIndices[rec],
      baseScale: runtimeWeather.cloudBaseScales[rec],
      windDirectionRad: wind.directionRad,
      windStrength: wind.strength,
      opacityMul: 0.78
    });
  }
}

function drawLocalWeatherClouds(activeChart) {
  let drawn = 0;
  for (const call of activeChart.tileCalls) {
    if (drawn >= MAX_LOCAL_WEATHER_CLOUDS) break;
    const flags = weatherFlagsForTile(call.id);
    const stormIntensity = stormIntensityForTile(call.id);
    const storm = stormIntensity >= STORM_ACTIVE_INTENSITY * 0.65;
    const precip = storm || (flags & (TILE_DAY_RAIN | TILE_DAY_SNOW_FALL)) !== 0;
    const ground = (flags & (TILE_DAY_WET_SOIL | TILE_DAY_SNOW_GROUND)) !== 0;
    if (!precip && !ground) continue;
    const h = hashInt(call.id ^ Math.imul(weatherParts.dayIndex + 1, 0x7f4a7c15));
    if (!precip && (h & 7) !== 0) continue;
    if (precip && !storm && (h & 3) === 0) continue;
    const wind = cloudWindForTile(call.id, h);
    drawCloudAt(call, {
      seed: h,
      templateIndex: h % 3,
      baseScale: storm ? 0.06 : (precip ? 0.045 : 0.026),
      windDirectionRad: wind.directionRad,
      windStrength: wind.strength,
      opacityMul: storm ? 0.9 : (precip ? 0.72 : 0.46)
    });
    drawn++;
  }
}

function cloudWindForTile(tileId, seed) {
  return windAtLatLonDeg(
    graph.latDeg[tileId],
    graph.lonDeg[tileId],
    dateToSubsolarLatDeg(weatherParts.date),
    {
      seed: WEATHER_WIND_SEED,
      simMinute: weatherParts.dayIndex * WEATHER_MINUTES_PER_DAY +
        (hashInt(seed ^ 0x57494e44) % WEATHER_MINUTES_PER_DAY)
    }
  );
}

function drawCloudAt(call, spec) {
  const lifeOffset = hashInt(spec.seed ^ Math.imul(weatherParts.dayIndex + 1, 0x27d4eb2d)) % CLOUD_LIFESPAN_MINUTES;
  const age = (weatherParts.minuteOfDay + lifeOffset) % CLOUD_LIFESPAN_MINUTES;
  const lifeU = age / CLOUD_LIFESPAN_MINUTES;
  const alpha = cloudLifecycleAlpha(lifeU);
  if (alpha <= 0.01) return;

  const sprite = cloudSpriteFor(spec.templateIndex, spec.baseScale);
  const drift = cloudLifecycleDrift(lifeU) * CLOUD_DRIFT_PX * clamp(spec.windStrength, 0.2, 1.2);
  const flowDir = spec.windDirectionRad + Math.PI;
  const anchor = cloudAnchorOffset(spec.seed);
  const x = Math.round(call.drawSurfaceX + anchor.x + Math.cos(flowDir) * drift - sprite.width / 2);
  const y = Math.round(call.drawSurfaceY + anchor.y - sprite.height * 0.72 - Math.sin(flowDir) * drift);
  ctx.save();
  ctx.globalAlpha = clamp(alpha * spec.opacityMul, 0, 0.74);
  ctx.drawImage(sprite, x, y);
  ctx.restore();
}

function cloudLifecycleAlpha(lifeU) {
  const x = clamp(lifeU, 0, 1);
  if (x < CLOUD_FADE_RATIO) return smoothstep(0, CLOUD_FADE_RATIO, x);
  if (x > 1 - CLOUD_FADE_RATIO) return 1 - smoothstep(1 - CLOUD_FADE_RATIO, 1, x);
  return 1;
}

function cloudLifecycleDrift(lifeU) {
  return smoothstep(0, 1, clamp(lifeU, 0, 1));
}

function cloudAnchorOffset(seed) {
  const h = hashInt(seed ^ 0x434c4f55);
  return {
    x: (((h & 0xff) / 255) * 2 - 1) * CLOUD_ANCHOR_JITTER_PX,
    y: ((((h >>> 8) & 0xff) / 255) * 2 - 1) * CLOUD_ANCHOR_JITTER_PX
  };
}

function cloudSpriteFor(templateIndex, displayScale) {
  const templateSprites = cloudSprites[templateIndex % cloudSprites.length];
  const scaleRatio = Math.sqrt(Math.max(0.08, displayScale) / 0.038);
  const sizeIndex = clamp(Math.round(scaleRatio * 1.7), 0, templateSprites.length - 1);
  return templateSprites[sizeIndex];
}

function buildCloudSprites() {
  const sizes = [
    { w: 16, h: 10 },
    { w: 22, h: 13 },
    { w: 28, h: 17 },
    { w: 34, h: 20 },
    { w: 42, h: 24 }
  ];
  const sprites = [];
  for (let variant = 0; variant < 3; variant++) {
    sprites.push(sizes.map((size, sizeIndex) => createCloudSprite(size.w, size.h, variant, sizeIndex)));
  }
  return sprites;
}

function createCloudSprite(width, height, variant, sizeIndex) {
  const sprite = document.createElement("canvas");
  sprite.width = width;
  sprite.height = height;
  const spriteCtx = sprite.getContext("2d", { willReadFrequently: true });
  if (!spriteCtx) throw new Error("Could not create cloud sprite canvas");
  spriteCtx.imageSmoothingEnabled = false;
  const image = spriteCtx.createImageData(width, height);
  const puffs = cloudPuffsFor(variant, sizeIndex);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x + 0.5 - width / 2) / (width / 2);
      const ny = (y + 0.5 - height / 2) / (height / 2);
      let density = -Infinity;
      for (const puff of puffs) {
        const dx = (nx - puff.x) / puff.rx;
        const dy = (ny - puff.y) / puff.ry;
        density = Math.max(density, 1 - Math.sqrt(dx * dx + dy * dy));
      }
      if (density <= 0) continue;
      const shade = clamp(Math.round(226 - Math.max(0, ny) * 38 + density * 18), 166, 242);
      const alpha = clamp(Math.round(58 + density * 150), 0, 208);
      const p = (x + y * width) * 4;
      image.data[p] = shade;
      image.data[p + 1] = clamp(shade + 2, 0, 255);
      image.data[p + 2] = clamp(shade + 4, 0, 255);
      image.data[p + 3] = alpha;
    }
  }

  spriteCtx.putImageData(image, 0, 0);
  return sprite;
}

function cloudPuffsFor(variant, sizeIndex) {
  const lift = (variant - 1) * 0.04;
  const grow = sizeIndex * 0.015;
  return [
    { x: -0.48, y: 0.12 + lift, rx: 0.34 + grow, ry: 0.42 },
    { x: -0.18, y: -0.12 - lift, rx: 0.42 + grow, ry: 0.54 },
    { x: 0.17, y: -0.18 + lift, rx: 0.38 + grow, ry: 0.52 },
    { x: 0.48, y: 0.06 - lift, rx: 0.33 + grow, ry: 0.4 },
    { x: 0.0, y: 0.22, rx: 0.62 + grow, ry: 0.38 }
  ];
}

function riverSpriteForTile(call, activeChart, mask) {
  const endpoints = riverEndpointsForTile(call, activeChart, mask);
  if (endpoints.length === 0) return null;
  const frame = waterFrameFor(call.id);
  const variant = hashInt(call.id) & 15;
  const latitudeBand = waterLatitudeBandForTile(call.id);
  const endpointKey = endpoints.map((p) => `${p.x},${p.y},${p.mouth ? 1 : 0}`).join(";");
  const key = `${latitudeBand}|${frame}|${variant}|${endpointKey}`;
  const cached = riverSpriteCache.get(key);
  if (cached) return cached;
  if (riverSpriteCache.size > RIVER_SPRITE_CACHE_LIMIT) riverSpriteCache = new Map();

  const sprite = generateRiverSprite(endpoints, frame, variant, latitudeBand);
  riverSpriteCache.set(key, sprite);
  return sprite;
}

function riverEndpointsForTile(call, activeChart, mask) {
  const endpoints = [];
  const seen = new Set();
  const edgeCount = graph.edgeCount[call.id];
  for (let edge = 0; edge < edgeCount; edge++) {
    if ((mask & (1 << edge)) === 0) continue;
    const dir = riverEdgeScreenDirection(call, activeChart, edge);
    const mouth = riverEdgeSet(riverToWaterMasks, call.id, edge);
    const armLength = mouth ? RIVER_MOUTH_ARM_LENGTH_PX : RIVER_ARM_LENGTH_PX;
    const x = Math.round(TILE_ART_HALF + dir.x * armLength);
    const y = Math.round(TILE_ART_HALF + dir.y * armLength);
    const key = `${x},${y},${mouth ? 1 : 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    endpoints.push({ x, y, mouth });
  }
  endpoints.sort((a, b) => a.x - b.x || a.y - b.y || Number(a.mouth) - Number(b.mouth));
  return endpoints;
}

function riverEdgeScreenDirection(call, activeChart, edge) {
  const neighborId = graph.edgeNeighbors[call.id]?.[edge];
  if (neighborId === undefined) {
    throw new Error(`River edge ${edge} on tile ${call.id} has no edge neighbor`);
  }

  const neighbor = activeChart.tileById.get(neighborId);
  let dx;
  let dy;
  if (neighbor) {
    dx = neighbor.drawSurfaceX - call.drawSurfaceX;
    dy = neighbor.drawSurfaceY - call.drawSurfaceY;
  } else {
    dx = dotTile(neighborId, activeChart.right) - dotTile(call.id, activeChart.right);
    dy = -(dotTile(neighborId, activeChart.up) - dotTile(call.id, activeChart.up));
  }

  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    throw new Error(`Could not project river edge ${edge} on tile ${call.id}`);
  }
  return { x: dx / len, y: dy / len };
}

function generateRiverSprite(endpoints, frame, variant, latitudeBand) {
  const sprite = document.createElement("canvas");
  sprite.width = TILE_ART_SIZE;
  sprite.height = TILE_ART_SIZE;
  const spriteCtx = sprite.getContext("2d");
  if (!spriteCtx) throw new Error("Could not create river sprite canvas");
  spriteCtx.imageSmoothingEnabled = false;
  const colors = riverPaletteForBand(latitudeBand, frame);
  const mainColor = colors.base;
  const cx = TILE_ART_HALF;
  const cy = TILE_ART_HALF;
  const paths = riverBezierPaths(endpoints, variant);

  for (const path of paths) {
    drawPixelBezierStroke(spriteCtx, path, mainColor, RIVER_BODY_RADIUS_PX);
  }
  drawRiverTileMouthFlares(spriteCtx, paths, endpoints, mainColor);
  if (endpoints.length !== 2) drawPixelBrush(spriteCtx, cx, cy, RIVER_CONNECTOR_RADIUS_PX, mainColor);
  for (const endpoint of endpoints) {
    drawPixelBrush(spriteCtx, endpoint.x, endpoint.y, RIVER_CONNECTOR_RADIUS_PX, mainColor);
    if (endpoint.mouth) drawPixelBrush(spriteCtx, endpoint.x, endpoint.y, RIVER_MOUTH_RADIUS_PX, mainColor);
  }

  for (const path of paths) {
    drawRiverSparkles(spriteCtx, path, frame, variant, colors.light);
  }
  return sprite;
}

function riverBezierPaths(endpoints, seed) {
  const center = { x: TILE_ART_HALF, y: TILE_ART_HALF };
  if (endpoints.length === 2) {
    return [curvedRiverPath(endpoints[0], endpoints[1], center, seed, 0)];
  }
  return endpoints.map((end, index) => {
    const control = {
      x: (center.x + end.x) * 0.5,
      y: (center.y + end.y) * 0.5
    };
    return curvedRiverPath(center, end, control, seed, index);
  });
}

function curvedRiverPath(start, end, controlBase, seed, index) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    throw new Error("Cannot build a curved river path with identical endpoints");
  }
  const nx = -dy / len;
  const ny = dx / len;
  const bend = riverCurveBend(seed, index);
  return {
    x0: start.x,
    y0: start.y,
    cx: controlBase.x + nx * bend,
    cy: controlBase.y + ny * bend,
    x1: end.x,
    y1: end.y
  };
}

function riverCurveBend(seed, index) {
  const raw = hashInt(seed ^ Math.imul(index + 1, 0x9e3779b1));
  const sign = (raw & 1) === 0 ? -1 : 1;
  const amount = 2 + ((raw >>> 1) % Math.max(1, RIVER_CURVE_BEND_PX - 1));
  return sign * amount;
}

function drawPixelBezierStroke(targetCtx, path, color, radius) {
  targetCtx.fillStyle = color;
  forEachPixelOnBezier(path, (x, y) => {
    drawPixelBrush(targetCtx, x, y, radius, color);
  });
}

function drawRiverConnectorMouthFlare(targetCtx, call, path, color) {
  const wideAtStart = riverConnectorMouthWideAtStart(call);
  if (wideAtStart === null) return;
  forEachRiverMouthFlareSample(path, wideAtStart, (x, y, radius) => {
    drawPixelBrush(targetCtx, x, y, Math.round(radius), color);
  });
}

function drawRiverTileMouthFlares(targetCtx, paths, endpoints, color) {
  forEachRiverTileMouthFlare(paths, endpoints, (path, wideAtStart) => {
    forEachRiverMouthFlareSample(path, wideAtStart, (x, y, radius) => {
      drawPixelBrush(targetCtx, x, y, Math.round(radius), color);
    }, RIVER_BODY_RADIUS_PX);
  });
}

function riverConnectorMouthWideAtStart(call) {
  if (call.bMouth && call.aWater) return true;
  if (call.aMouth && call.bWater) return false;
  return null;
}

function forEachRiverTileMouthFlare(paths, endpoints, visit) {
  for (const endpoint of endpoints) {
    if (!endpoint.mouth) continue;
    const path = paths.find((candidate) =>
      riverPointsMatch(candidate.x0, candidate.y0, endpoint.x, endpoint.y)
      || riverPointsMatch(candidate.x1, candidate.y1, endpoint.x, endpoint.y)
    );
    if (!path) throw new Error(`River mouth endpoint ${endpoint.x},${endpoint.y} has no path`);
    visit(path, riverPointsMatch(path.x0, path.y0, endpoint.x, endpoint.y));
  }
}

function riverPointsMatch(ax, ay, bx, by) {
  return Math.abs(ax - bx) < 1e-6 && Math.abs(ay - by) < 1e-6;
}

function forEachRiverMouthFlareSample(path, wideAtStart, visit, narrowRadius = RIVER_CONNECTOR_RADIUS_PX) {
  const steps = Math.max(10, Math.ceil(bezierPathLength(path) * 1.6));
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    const mouthProgress = wideAtStart ? 1 - t : t;
    if (mouthProgress < RIVER_MOUTH_FLARE_START) continue;
    const flare = smoothstep(RIVER_MOUTH_FLARE_START, 1, mouthProgress);
    const point = pointOnRiverBezier(path, t);
    const radius = narrowRadius + (RIVER_MOUTH_RADIUS_PX - narrowRadius) * flare;
    visit(point.x, point.y, radius);
  }
}

function pointOnRiverBezier(path, t) {
  const omt = 1 - t;
  return {
    x: omt * omt * path.x0 + 2 * omt * t * path.cx + t * t * path.x1,
    y: omt * omt * path.y0 + 2 * omt * t * path.cy + t * t * path.y1
  };
}

function drawRiverSparkles(targetCtx, path, frame, seed, color) {
  const points = [];
  forEachPixelOnBezier(path, (x, y) => points.push({ x, y }));
  const phase = (frame - 1) * 3 + (hashInt(seed) % 3);
  targetCtx.fillStyle = color;
  for (let i = 3 + phase; i < points.length - 1; i += 7) {
    const p = points[i];
    targetCtx.fillRect(p.x, p.y, 1, 1);
  }
}

function forEachPixelOnBezier(path, visit) {
  const steps = Math.max(10, Math.ceil(bezierPathLength(path) * 1.6));
  const seen = new Set();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const omt = 1 - t;
    const x = Math.round(omt * omt * path.x0 + 2 * omt * t * path.cx + t * t * path.x1);
    const y = Math.round(omt * omt * path.y0 + 2 * omt * t * path.cy + t * t * path.y1);
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    visit(x, y);
  }
}

function bezierPathLength(path) {
  let length = 0;
  let px = path.x0;
  let py = path.y0;
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const omt = 1 - t;
    const x = omt * omt * path.x0 + 2 * omt * t * path.cx + t * t * path.x1;
    const y = omt * omt * path.y0 + 2 * omt * t * path.cy + t * t * path.y1;
    length += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return length;
}

function drawPixelBrush(targetCtx, x, y, radius, color) {
  targetCtx.fillStyle = color;
  for (let yy = -radius; yy <= radius; yy++) {
    for (let xx = -radius; xx <= radius; xx++) {
      if (Math.abs(xx) + Math.abs(yy) > radius + 1) continue;
      targetCtx.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    }
  }
}

function terrainImage(key) {
  const img = images.get(key);
  if (!img) throw new Error(`Missing terrain image for sprite key: ${key}`);
  return img;
}

function terrainImageForTile(row, id) {
  const key = spriteForTerrain(row, id);
  if (isWaterSurfaceRow(row)) return waterLatitudeTerrainImage(key, id);
  return tileHasSeasonalSnowTerrain(row, id) ? snowCoveredTerrainImage(key) : terrainImage(key);
}

function terrainColorForTile(row, id) {
  const key = spriteForTerrain(row, id);
  if (isWaterSurfaceRow(row)) return waterLatitudeTerrainColor(key, id);
  return tileHasSeasonalSnowTerrain(row, id) ? snowCoveredTerrainColor(key) : terrainSpriteColor(key);
}

function waterLatitudeTerrainImage(key, id) {
  const latitudeBand = waterLatitudeBandForTile(id);
  const cacheKey = `${key}|${latitudeBand}`;
  const cached = waterLatitudeImages?.get(cacheKey);
  if (cached) return cached;
  if (!waterLatitudeImages || !waterLatitudeSpriteColors || !waterLatitudePixelColors) {
    throw new Error("Latitude water palette caches are not initialized");
  }

  const img = terrainImage(key);
  const spriteCanvas = document.createElement("canvas");
  spriteCanvas.width = img.width;
  spriteCanvas.height = img.height;
  const spriteCtx = spriteCanvas.getContext("2d", { willReadFrequently: true });
  if (!spriteCtx) throw new Error(`Could not create latitude water sprite canvas for ${cacheKey}`);
  spriteCtx.imageSmoothingEnabled = false;
  spriteCtx.drawImage(img, 0, 0);

  const imageData = spriteCtx.getImageData(0, 0, img.width, img.height);
  const depthIndex = waterDepthIndexForSpriteKey(key);
  const data = imageData.data;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue;
    const sourceHex = rgbToHex(data[offset], data[offset + 1], data[offset + 2]);
    const mappedHex = waterLatitudePixelHex(sourceHex, latitudeBand, depthIndex);
    const mapped = parseHexColor(mappedHex);
    data[offset] = mapped.r;
    data[offset + 1] = mapped.g;
    data[offset + 2] = mapped.b;
  }
  spriteCtx.putImageData(imageData, 0, 0);

  const baseHex = terrainSpriteColor(key);
  waterLatitudeSpriteColors.set(cacheKey, waterLatitudePixelHex(baseHex, latitudeBand, depthIndex));
  waterLatitudeImages.set(cacheKey, spriteCanvas);
  return spriteCanvas;
}

function waterLatitudeTerrainColor(key, id) {
  const latitudeBand = waterLatitudeBandForTile(id);
  const cacheKey = `${key}|${latitudeBand}`;
  if (!waterLatitudeSpriteColors?.has(cacheKey)) waterLatitudeTerrainImage(key, id);
  const color = waterLatitudeSpriteColors?.get(cacheKey);
  if (!color) throw new Error(`Missing latitude water color for ${cacheKey}`);
  return color;
}

function waterLatitudeBandForTile(id) {
  const latitude = graph?.latDeg?.[id];
  if (!Number.isFinite(latitude)) throw new Error(`Missing latitude for water tile: ${id}`);
  return waterLatitudeBand(latitude);
}

function waterLatitudePixelHex(sourceHex, latitudeBand, depthIndex) {
  const normalized = sourceHex.startsWith("#") ? sourceHex.slice(1).toLowerCase() : sourceHex.toLowerCase();
  const key = `${normalized}|${latitudeBand}|${depthIndex}`;
  const cached = waterLatitudePixelColors.get(key);
  if (cached) return cached;
  const mapped = `#${waterPaletteHexForSourceHex(normalized, latitudeBand, depthIndex)}`;
  waterLatitudePixelColors.set(key, mapped);
  return mapped;
}

function riverPaletteForTile(id, frame) {
  return riverPaletteForBand(waterLatitudeBandForTile(id), frame);
}

function riverPaletteForBand(latitudeBand, frame) {
  const source = riverColors.frames[frame - 1] || riverColors.frames[0];
  return {
    base: waterLatitudePixelHex(riverColors.base, latitudeBand, 0),
    light: waterLatitudePixelHex(source.light, latitudeBand, 0)
  };
}

function terrainSpriteColor(key) {
  const color = spriteColors.get(key);
  if (!color) throw new Error(`Missing dominant terrain color for sprite: ${key}`);
  return color;
}

function tileHasSeasonalSnowTerrain(row, id) {
  if (!row || isWaterSurfaceRow(row)) return false;
  if (!snowGroundMask) throw new Error("Snow ground mask is not initialized");
  return snowGroundMask[id] === 1;
}

function snowCoveredTerrainImage(key) {
  const replacement = snowCoveredTerrainReplacementKey(key);
  if (replacement) return terrainImage(replacement);
  if (!snowyTerrainImages) throw new Error("Snowy terrain image cache is not initialized");

  const cached = snowyTerrainImages.get(key);
  if (cached) return cached;

  const img = terrainImage(key);
  const spriteCanvas = document.createElement("canvas");
  const spriteCtx = spriteCanvas.getContext("2d", { willReadFrequently: true });
  if (!spriteCtx) throw new Error(`Could not create snowy terrain sprite canvas for ${key}`);
  spriteCanvas.width = img.width;
  spriteCanvas.height = img.height;
  spriteCtx.imageSmoothingEnabled = false;
  spriteCtx.clearRect(0, 0, img.width, img.height);
  spriteCtx.drawImage(img, 0, 0);

  const imageData = spriteCtx.getImageData(0, 0, img.width, img.height);
  applyGeneratedSnowPixels(key, imageData);
  spriteCtx.putImageData(imageData, 0, 0);
  snowyTerrainImages.set(key, spriteCanvas);
  snowySpriteColors.set(key, generatedSnowTerrainColor(key));
  return spriteCanvas;
}

function snowCoveredTerrainColor(key) {
  const replacement = snowCoveredTerrainReplacementKey(key);
  if (replacement) return terrainSpriteColor(replacement);
  if (!snowySpriteColors) throw new Error("Snowy terrain color cache is not initialized");
  if (!snowySpriteColors.has(key)) snowCoveredTerrainImage(key);
  const color = snowySpriteColors.get(key);
  if (!color) throw new Error(`Missing generated snowy terrain color for sprite: ${key}`);
  return color;
}

function snowCoveredTerrainReplacementKey(key) {
  if (key.startsWith("water_")) return key;
  return SNOWY_TERRAIN_REPLACEMENTS.get(key) || null;
}

function applyGeneratedSnowPixels(key, imageData) {
  const data = imageData.data;
  const salt = spriteKeyHash(key) ^ SNOW_GENERATED_SALT;
  const w = imageData.width;
  const h = imageData.height;
  const hMax = Math.max(1, h - 1);

  for (let y = 0; y < h; y++) {
    const topBias = 1 - y / hMax;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const alpha = data[i + 3];
      if (alpha <= 50) continue;
      const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (brightness < 28) continue;

      const hsh = hashInt(salt ^ Math.imul(x + 1, 0x1f123bb5) ^ Math.imul(y + 1, 0x9e3779b1));
      const noise = (hsh & 0xff) / 255;
      const brightBias = clamp((brightness - 40) / 155, 0, 1);
      const snowChance = 0.2 + topBias * 0.28 + brightBias * 0.26;
      if (noise > snowChance) continue;

      const snow = SNOW_GENERATED_COLORS[(hsh >>> 9) % SNOW_GENERATED_COLORS.length];
      const amount = 0.62 + (((hsh >>> 16) & 0xf) / 15) * 0.28;
      data[i] = blendChannel(data[i], snow.r, amount);
      data[i + 1] = blendChannel(data[i + 1], snow.g, amount);
      data[i + 2] = blendChannel(data[i + 2], snow.b, amount);
    }
  }
}

function generatedSnowTerrainColor(key) {
  const base = parseHexColor(terrainSpriteColor(key));
  const snow = SNOW_GENERATED_COLORS[1];
  return rgbToHex(
    Math.round(base.r * 0.26 + snow.r * 0.74),
    Math.round(base.g * 0.26 + snow.g * 0.74),
    Math.round(base.b * 0.26 + snow.b * 0.74)
  );
}

function blendChannel(base, target, amount) {
  return Math.round(base * (1 - amount) + target * amount);
}

function spriteKeyHash(key) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function drawShipWake(activeChart) {
  if (!ship?.wakeParticles?.length) return;
  for (const particle of ship.wakeParticles) {
    const life = clamp(particle.age / particle.ttl, 0, 1);
    const alphaBase = wakeParticleAlphaBase(particle.kind);
    const alpha = (alphaBase * Math.pow(1 - life, 1.35)).toFixed(3);
    const color = `rgba(255, 253, 231, ${alpha})`;
    const x = Math.round(particle.x);
    const y = Math.round(particle.y);
    const len = Math.hypot(particle.vx, particle.vy);
    if (!wakeMapPointIsWater(x, y, activeChart)) continue;

    if (particle.kind === "stern" || len <= 0.001) {
      drawWakeFoamDot(particle, x, y, color, activeChart);
      continue;
    }

    const ux = particle.vx / len;
    const uy = particle.vy / len;
    const markLength = clamp(Math.round(2 + life * 4), 2, 5);
    drawWakeFoamMark(particle, ux, uy, markLength, color, activeChart, life);
  }
}

function wakeParticleAlphaBase(kind) {
  if (kind === "bow") return 0.5;
  if (kind === "stern") return 0.28;
  throw new Error(`Unknown wake particle kind: ${kind}`);
}

function drawWakeFoamDot(particle, x, y, color, activeChart) {
  ctx.fillStyle = color;
  drawWakeFoamPixel(x, y, activeChart);
  const h = wakeFoamHash(particle.seed, 0);
  if (wakeFoamUnit(h) < SHIP_WAKE_FOAM_EXTRA_CHANCE) {
    const ox = ((h >>> 11) & 1) === 0 ? -1 : 1;
    const oy = ((h >>> 12) & 1) === 0 ? 0 : (((h >>> 13) & 1) === 0 ? -1 : 1);
    drawWakeFoamPixel(x + ox, y + oy, activeChart);
  }
}

function drawWakeFoamMark(particle, ux, uy, markLength, color, activeChart, life) {
  const px = -uy;
  const py = ux;
  const keepChance = SHIP_WAKE_FOAM_KEEP_YOUNG + (SHIP_WAKE_FOAM_KEEP_OLD - SHIP_WAKE_FOAM_KEEP_YOUNG) * life;
  let drawn = false;
  ctx.fillStyle = color;

  for (let i = -markLength; i <= 1; i++) {
    const h = wakeFoamHash(particle.seed, i + markLength);
    const mustAnchor = i === 0 && !drawn;
    if (!mustAnchor && wakeFoamUnit(h) > keepChance) continue;

    const sideJitter = wakeFoamSideJitter(h);
    const x = Math.round(particle.x + ux * i + px * sideJitter);
    const y = Math.round(particle.y + uy * i + py * sideJitter);
    drawn = drawWakeFoamPixel(x, y, activeChart) || drawn;

    const extraHash = wakeFoamHash(h, i);
    if (wakeFoamUnit(extraHash) < SHIP_WAKE_FOAM_EXTRA_CHANCE * (1 - life * 0.55)) {
      const extraSide = sideJitter === 0 ? (((extraHash >>> 9) & 1) === 0 ? -1 : 1) : -sideJitter;
      const extraX = Math.round(particle.x + ux * i + px * extraSide);
      const extraY = Math.round(particle.y + uy * i + py * extraSide);
      drawn = drawWakeFoamPixel(extraX, extraY, activeChart) || drawn;
    }
  }

  if (!drawn) drawWakeFoamPixel(Math.round(particle.x), Math.round(particle.y), activeChart);
}

function drawWakeFoamPixel(x, y, activeChart) {
  if (!wakeMapPointIsWater(x, y, activeChart)) return false;
  ctx.fillRect(x, y, 1, 1);
  return true;
}

function wakeFoamHash(seed, index) {
  return hashInt(seed ^ Math.imul(index + 37, 0x85ebca6b));
}

function wakeFoamUnit(hash) {
  return (hash & 0xffff) / 0xffff;
}

function wakeFoamSideJitter(hash) {
  const roll = (hash >>> 16) & 7;
  if (roll <= 1) return -1;
  if (roll >= 6) return 1;
  return 0;
}

function wakeMapPointIsWater(x, y, activeChart) {
  if (!activeChart?.waterIndex) return false;
  const candidates = wakeWaterCandidatesForPoint(x, y, activeChart.waterIndex);
  for (const entry of candidates) {
    if (entry.kind === "riverConnector" && pointDistanceToBezierPath(x, y, entry.path) <= WAKE_RIVER_RADIUS_PX) {
      return true;
    }
  }

  if (wakePointIsOnAnyRiverTile(x, y, candidates, activeChart)) return true;
  if (wakePointIsBlockedByDryTileSprite(x, y, candidates, activeChart)) return false;

  let nearestTile = null;
  let nearestD2 = WAKE_WATER_SEARCH_RADIUS_PX * WAKE_WATER_SEARCH_RADIUS_PX;
  for (const entry of candidates) {
    if (entry.kind !== "tile") continue;
    if (!isWaterSurfaceRow(entry.call.row)) continue;
    const dx = entry.call.drawSurfaceX - x;
    const dy = entry.call.drawSurfaceY - y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= nearestD2) continue;
    nearestD2 = d2;
    nearestTile = entry.call;
  }

  if (!nearestTile) return false;
  return true;
}

function nearestRiverCenterlineInfoAtLocalPoint(x, y, activeChart, preferredDirection = null) {
  if (!activeChart?.waterIndex) return null;
  const candidates = wakeWaterCandidatesForPoint(x, y, activeChart.waterIndex);
  let best = null;

  for (const entry of candidates) {
    if (entry.kind === "riverConnector") {
      best = closerRiverCenterlineProbe(
        best,
        riverPathWaterProbe(x, y, entry.path, RIVER_CONNECTOR_RADIUS_PX, entry.call.a),
        preferredDirection
      );
      continue;
    }
    if (entry.kind !== "tile") continue;
    const mask = riverMasks?.[entry.call.id] || 0;
    if (mask === 0) continue;
    const px = x - (entry.call.drawSurfaceX - TILE_ART_HALF);
    const py = y - (entry.call.drawSurfaceY - TILE_ART_HALF);
    const endpoints = riverEndpointsForTile(entry.call, activeChart, mask);
    if (endpoints.length === 0) continue;
    const variant = hashInt(entry.call.id) & 15;
    const pathOffsetX = entry.call.drawSurfaceX - TILE_ART_HALF;
    const pathOffsetY = entry.call.drawSurfaceY - TILE_ART_HALF;
    for (const path of riverBezierPaths(endpoints, variant)) {
      const probe = riverPathWaterProbe(px, py, path, RIVER_BODY_RADIUS_PX, entry.call.id);
      probe.pathOffsetX = pathOffsetX;
      probe.pathOffsetY = pathOffsetY;
      probe.centerlineX += pathOffsetX;
      probe.centerlineY += pathOffsetY;
      best = closerRiverCenterlineProbe(
        best,
        probe,
        preferredDirection
      );
    }
  }
  return best;
}

function closerRiverCenterlineProbe(a, b, preferredDirection) {
  if (!b?.tangent) return a;
  if (!a) return b;
  const distanceDifference = b.centerlineDistance - a.centerlineDistance;
  if (distanceDifference < -0.75) return b;
  if (distanceDifference > 0.75) return a;

  const preferredLength = preferredDirection
    ? Math.hypot(preferredDirection.x, preferredDirection.y)
    : 0;
  if (preferredLength > 1e-8) {
    const px = preferredDirection.x / preferredLength;
    const py = preferredDirection.y / preferredLength;
    const aAlignment = Math.abs(a.tangent.x * px + a.tangent.y * py);
    const bAlignment = Math.abs(b.tangent.x * px + b.tangent.y * py);
    if (bAlignment > aAlignment + 1e-6) return b;
    if (aAlignment > bAlignment + 1e-6) return a;
  }
  if (distanceDifference < 0) return b;
  return a;
}

function riverWaterInfoAtLocalPoint(x, y, activeChart) {
  if (!activeChart?.waterIndex) return null;
  const candidates = wakeWaterCandidatesForPoint(x, y, activeChart.waterIndex);
  let best = null;

  for (const entry of candidates) {
    let info = null;
    if (entry.kind === "riverConnector") {
      info = riverConnectorWaterInfoAtLocalPoint(x, y, entry);
    } else if (entry.kind === "tile" && (riverMasks?.[entry.call.id] || 0) !== 0) {
      info = riverTileWaterInfoAtLocalPoint(x, y, entry.call, activeChart);
    }
    if (!info) continue;
    if (!best || info.clearance < best.clearance) best = info;
  }

  if (!best) return null;
  return {
    ok: best.clearance <= SHIP_RIVER_CHANNEL_TOLERANCE_PX,
    tileId: best.tileId,
    normal: best.normal,
    clearance: best.clearance
  };
}

function riverConnectorWaterInfoAtLocalPoint(x, y, entry) {
  const { call, geometry, path } = entry;
  let best = riverPathWaterProbe(x, y, path, RIVER_CONNECTOR_RADIUS_PX, call.a);
  const wideAtStart = riverConnectorMouthWideAtStart(call);
  if (wideAtStart !== null) {
    forEachRiverMouthFlareSample(path, wideAtStart, (cx, cy, radius) => {
      best = closerRiverProbe(best, riverBrushWaterProbe(x, y, cx, cy, radius, call.a));
    });
  }
  best = closerRiverProbe(best, riverBrushWaterProbe(x, y, geometry.a.x, geometry.a.y, riverConnectorEndpointCollisionRadius(call, "a"), call.a));
  best = closerRiverProbe(best, riverBrushWaterProbe(x, y, geometry.b.x, geometry.b.y, riverConnectorEndpointCollisionRadius(call, "b"), call.b));
  return best;
}

function riverConnectorEndpointCollisionRadius(call, side) {
  if (side === "a" && call.bMouth && call.aWater) return RIVER_MOUTH_RADIUS_PX;
  if (side === "b" && call.aMouth && call.bWater) return RIVER_MOUTH_RADIUS_PX;
  return RIVER_CONNECTOR_RADIUS_PX;
}

function riverTileWaterInfoAtLocalPoint(x, y, call, activeChart) {
  const mask = riverMasks?.[call.id] || 0;
  if (mask === 0) return null;
  const px = x - (call.drawSurfaceX - TILE_ART_HALF);
  const py = y - (call.drawSurfaceY - TILE_ART_HALF);
  const margin = WAKE_RIVER_RADIUS_PX + 2;
  if (px < -margin || px > TILE_ART_SIZE + margin || py < -margin || py > TILE_ART_SIZE + margin) return null;

  const endpoints = riverEndpointsForTile(call, activeChart, mask);
  if (endpoints.length === 0) return null;
  const variant = hashInt(call.id) & 15;
  const paths = riverBezierPaths(endpoints, variant);
  let best = null;
  for (const path of paths) {
    best = closerRiverProbe(best, riverPathWaterProbe(px, py, path, RIVER_BODY_RADIUS_PX, call.id));
  }
  forEachRiverTileMouthFlare(paths, endpoints, (path, wideAtStart) => {
    forEachRiverMouthFlareSample(path, wideAtStart, (cx, cy, radius) => {
      best = closerRiverProbe(best, riverBrushWaterProbe(px, py, cx, cy, radius, call.id));
    }, RIVER_BODY_RADIUS_PX);
  });
  if (endpoints.length !== 2) {
    best = closerRiverProbe(best, riverBrushWaterProbe(px, py, TILE_ART_HALF, TILE_ART_HALF, RIVER_CONNECTOR_RADIUS_PX, call.id));
  }
  for (const endpoint of endpoints) {
    best = closerRiverProbe(best, riverBrushWaterProbe(px, py, endpoint.x, endpoint.y, endpoint.mouth ? RIVER_MOUTH_RADIUS_PX : RIVER_CONNECTOR_RADIUS_PX, call.id));
  }
  return best;
}

function riverPathWaterProbe(px, py, path, radius, tileId) {
  const closest = closestPointOnBezierPath(px, py, path);
  return {
    clearance: closest.distance - radius,
    centerlineDistance: closest.distance,
    centerlineX: closest.x,
    centerlineY: closest.y,
    normal: localNormalFromClosestPoint(px, py, closest.x, closest.y),
    tangent: closest.tangent,
    path,
    pathT: closest.pathT,
    pathOffsetX: 0,
    pathOffsetY: 0,
    tileId
  };
}

function riverBrushWaterProbe(px, py, cx, cy, radius, tileId) {
  const distance = Math.hypot(px - cx, py - cy);
  return {
    clearance: distance - radius,
    centerlineDistance: distance,
    normal: localNormalFromClosestPoint(px, py, cx, cy),
    tangent: null,
    tileId
  };
}

function closerRiverProbe(a, b) {
  if (!b) return a;
  if (!a || b.clearance < a.clearance) return b;
  return a;
}

function localNormalFromClosestPoint(px, py, cx, cy) {
  const dx = px - cx;
  const dy = py - cy;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-6) return null;
  return { x: dx / len, y: dy / len };
}

function wakeWaterCandidatesForPoint(x, y, waterIndex) {
  const bx = Math.floor(x / WAKE_WATER_BUCKET_PX);
  const by = Math.floor(y / WAKE_WATER_BUCKET_PX);
  const range = Math.ceil(WAKE_WATER_SEARCH_RADIUS_PX / WAKE_WATER_BUCKET_PX);
  const candidates = [];
  const seen = new Set();

  for (let yy = by - range; yy <= by + range; yy++) {
    for (let xx = bx - range; xx <= bx + range; xx++) {
      const bucket = waterIndex.buckets.get(wakeWaterBucketKey(xx, yy));
      if (!bucket) continue;
      for (const entry of bucket) {
        if (seen.has(entry)) continue;
        seen.add(entry);
        candidates.push(entry);
      }
    }
  }

  return candidates;
}

function wakePointIsOnAnyRiverTile(x, y, candidates, activeChart) {
  for (const entry of candidates) {
    if (entry.kind !== "tile") continue;
    if ((riverMasks?.[entry.call.id] || 0) === 0) continue;
    if (wakePointIsOnRiverTile(x, y, entry.call, activeChart)) return true;
  }
  return false;
}

function wakePointIsBlockedByDryTileSprite(x, y, candidates, activeChart) {
  for (const entry of candidates) {
    if (entry.kind !== "tile") continue;
    if (isWaterSurfaceRow(entry.call.row)) continue;
    if (!tileTerrainSpriteOpaqueAtMapPoint(entry.call, x, y)) continue;
    if ((riverMasks?.[entry.call.id] || 0) !== 0 && wakePointIsOnRiverTile(x, y, entry.call, activeChart)) continue;
    return true;
  }
  return false;
}

function tileTerrainSpriteOpaqueAtMapPoint(call, x, y) {
  const img = terrainImageForTile(call.row, call.id);
  const px = Math.round(x - (call.drawSurfaceX - TILE_ART_HALF));
  const py = Math.round(y - (call.drawSurfaceY - TILE_ART_HALF));
  if (px < 0 || py < 0 || px >= img.width || py >= img.height) return false;
  const mask = terrainAlphaMask(img);
  return mask.alpha[px + py * mask.width] > 0;
}

function terrainAlphaMask(img) {
  const cached = terrainAlphaMasks.get(img);
  if (cached) return cached;

  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = img.width;
  sampleCanvas.height = img.height;
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleCtx) throw new Error("Could not create terrain alpha mask canvas");
  sampleCtx.imageSmoothingEnabled = false;
  sampleCtx.drawImage(img, 0, 0);

  const data = sampleCtx.getImageData(0, 0, img.width, img.height).data;
  const alpha = new Uint8Array(img.width * img.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];

  const mask = { width: img.width, height: img.height, alpha };
  terrainAlphaMasks.set(img, mask);
  return mask;
}

function wakePointIsOnRiverTile(x, y, call, activeChart) {
  const mask = riverMasks?.[call.id] || 0;
  if (mask === 0) return false;
  const px = x - (call.drawSurfaceX - TILE_ART_HALF);
  const py = y - (call.drawSurfaceY - TILE_ART_HALF);
  const margin = WAKE_RIVER_RADIUS_PX + 1;
  if (px < -margin || px > TILE_ART_SIZE + margin || py < -margin || py > TILE_ART_SIZE + margin) return false;

  const endpoints = riverEndpointsForTile(call, activeChart, mask);
  if (endpoints.length === 0) return false;
  const variant = hashInt(call.id) & 15;
  for (const path of riverBezierPaths(endpoints, variant)) {
    if (pointDistanceToBezierPath(px, py, path) <= WAKE_RIVER_RADIUS_PX) return true;
  }
  if (endpoints.length !== 2 && Math.hypot(px - TILE_ART_HALF, py - TILE_ART_HALF) <= WAKE_RIVER_RADIUS_PX) {
    return true;
  }
  for (const endpoint of endpoints) {
    const radius = endpoint.mouth ? RIVER_MOUTH_RADIUS_PX + 1 : RIVER_CONNECTOR_RADIUS_PX + 1;
    if (Math.hypot(px - endpoint.x, py - endpoint.y) <= radius) return true;
  }
  return false;
}

function pointDistanceToBezierPath(px, py, path) {
  return closestPointOnBezierPath(px, py, path).distance;
}

function closestPointOnBezierPath(px, py, path) {
  let best = Infinity;
  let bestPoint = { x: path.x0, y: path.y0 };
  let bestPathT = 0;
  let bestTangent = null;
  let prev = { x: path.x0, y: path.y0 };
  for (let i = 1; i <= 14; i++) {
    const t = i / 14;
    const omt = 1 - t;
    const point = {
      x: omt * omt * path.x0 + 2 * omt * t * path.cx + t * t * path.x1,
      y: omt * omt * path.y0 + 2 * omt * t * path.cy + t * t * path.y1
    };
    const closest = closestPointOnSegment(px, py, prev.x, prev.y, point.x, point.y);
    if (closest.distance < best) {
      best = closest.distance;
      bestPoint = { x: closest.x, y: closest.y };
      bestPathT = ((i - 1) + closest.t) / 14;
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      const length = Math.hypot(dx, dy);
      bestTangent = length > 1e-8 ? { x: dx / length, y: dy / length } : bestTangent;
    }
    prev = point;
  }
  return {
    x: bestPoint.x,
    y: bestPoint.y,
    distance: best,
    pathT: bestPathT,
    tangent: bestTangent
  };
}

function pointDistanceToSegment(px, py, ax, ay, bx, by) {
  return closestPointOnSegment(px, py, ax, ay, bx, by).distance;
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-9) {
    return {
      x: ax,
      y: ay,
      t: 0,
      distance: Math.hypot(px - ax, py - ay)
    };
  }
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  const x = ax + dx * t;
  const y = ay + dy * t;
  return {
    x,
    y,
    t,
    distance: Math.hypot(px - x, py - y)
  };
}

function drawShipShadow(activeChart, light, offset) {
  if (!ship || !shipLighting || !light || light.shadow <= 0.01) return;
  const frame = shipHeadingFrame();
  const points = shipLightingPoints("shadow", frame, light.bin);
  if (points.length === 0) return;
  const origin = shipScreenOrigin(SHIP_SHADOW_FRAME_SIZE);
  ctx.fillStyle = `rgba(12, 9, 24, ${(SHIP_LIGHT_SHADOW_ALPHA * light.shadow).toFixed(3)})`;
  for (const point of points) {
    const px = point & 0xff;
    const py = point >> 8;
    const screenPx = origin.x + px;
    const screenPy = origin.y + py;
    const localPx = screenPx - offset.x;
    const localPy = screenPy - offset.y;
    if (!wakeMapPointIsWater(localPx, localPy, activeChart)) continue;
    ctx.fillRect(screenPx, screenPy, 1, 1);
  }
}

function drawSeagulls(activeChart, nowMs) {
  if (!animalImages) return;
  const calls = [
    ...landedSeagullCalls(activeChart),
    ...flyingSeagullCalls(nowMs)
  ].sort((a, b) => a.sortY - b.sortY || a.id - b.id);
  for (const call of calls) drawSeagullSprite(call);
}

function landedSeagullCalls(activeChart) {
  const calls = [];
  const offset = chartOffsetPixels(activeChart);
  for (const call of activeChart.tileCalls) {
    if (!pointNearScreen({
      x: call.drawSurfaceX + offset.x,
      y: call.drawSurfaceY + offset.y
    }, SEAGULL_SPAWN_MARGIN_PX)) continue;
    if (!isSeagullLandingCall(call)) continue;
    const seed = hashInt(call.id ^ 0x5347554c);
    if ((seed & 15) > 4) continue;
    const count = 1 + (seed % 3);
    for (let i = 0; i < count; i++) {
      const birdSeed = hashInt(seed ^ Math.imul(i + 1, 0x85ebca6b));
      const x = Math.round(call.drawSurfaceX - 4 + (((birdSeed >>> 4) & 15) - 7));
      const y = Math.round(call.drawSurfaceY - 9 + (((birdSeed >>> 9) & 7) - 3));
      calls.push({
        id: call.id * 8 + i,
        img: animalImages?.seagullStanding || null,
        frame: 0,
        x,
        y,
        sortY: y + SEAGULL_FRAME_SIZE,
        flip: (birdSeed & 1) === 0
      });
    }
  }
  return calls;
}

function flyingSeagullCalls(nowMs) {
  const calls = [];
  for (const gull of seagulls) {
    const bob = Math.round(Math.sin((nowMs + gull.phaseMs) / 540) * 1.2);
    const x = Math.round(gull.x - SEAGULL_FRAME_SIZE / 2);
    const y = Math.round(gull.y - SEAGULL_FRAME_SIZE / 2 + bob);
    calls.push({
      id: 100000 + gull.id,
      img: animalImages.seagullFlight,
      frame: seagullFlightFrame(gull, nowMs),
      x,
      y,
      sortY: y + SEAGULL_FRAME_SIZE,
      flip: gull.vx < 0
    });
  }
  return calls;
}

function seagullFlightFrame(gull, nowMs) {
  const cycleMs = gull.glideMs + gull.flapMs;
  const t = (nowMs - gull.bornMs + gull.phaseMs) % cycleMs;
  if (t < gull.glideMs) return 0;
  const flapU = (t - gull.glideMs) / gull.flapMs;
  return 1 + Math.min(SEAGULL_FLIGHT_FRAMES - 2, Math.floor(flapU * (SEAGULL_FLIGHT_FRAMES - 1)));
}

function drawSeagullSprite(call) {
  if (!call.img) return;
  const sx = call.frame * SEAGULL_FRAME_SIZE;
  ctx.save();
  if (call.flip) {
    ctx.translate(call.x + SEAGULL_FRAME_SIZE, call.y);
    ctx.scale(-1, 1);
    ctx.drawImage(call.img, sx, 0, SEAGULL_FRAME_SIZE, SEAGULL_FRAME_SIZE, 0, 0, SEAGULL_FRAME_SIZE, SEAGULL_FRAME_SIZE);
  } else {
    ctx.drawImage(
      call.img,
      sx,
      0,
      SEAGULL_FRAME_SIZE,
      SEAGULL_FRAME_SIZE,
      call.x,
      call.y,
      SEAGULL_FRAME_SIZE,
      SEAGULL_FRAME_SIZE
    );
  }
  ctx.restore();
}

function isSeagullLandingCall(call) {
  return !isWaterSurfaceRow(call.row) &&
    terrainLevel(call.row, call.id) <= 1 &&
    tileHasWaterNeighbor(call.id);
}

function tileHasLandNeighbor(tileId) {
  for (const neighborId of graph.neighbors[tileId] || []) {
    if (!isWaterSurfaceRow(earthById[neighborId])) return true;
  }
  return false;
}

function tileHasWaterNeighbor(tileId) {
  for (const neighborId of graph.neighbors[tileId] || []) {
    if (isWaterSurfaceRow(earthById[neighborId]) && !isShipBlockedByIceTile(neighborId)) return true;
  }
  return false;
}

function drawShips(activeChart, playerLight, nowMs) {
  const drawCalls = [];
  const playerCall = playerShipDrawCall(playerLight);
  if (playerCall) drawCalls.push(playerCall);
  if (npcSeaRoutes && npcShipImages && camera && directionIndex) {
    for (const state of npcVisualShips.values()) {
      const call = npcShipDrawCall(state, activeChart);
      if (call) drawCalls.push(call);
    }
  }
  drawCalls.sort(compareShipDrawCalls);
  for (const call of drawCalls) drawShipCall(call, nowMs);
}

function playerShipDrawCall(light) {
  if (!ship || !shipImage) return null;
  const frame = shipHeadingFrame();
  const origin = shipScreenOrigin(SHIP_SHEET_FRAME_SIZE);
  return {
    id: "player",
    kind: "player",
    img: shipImage,
    frame,
    x: origin.x,
    y: origin.y,
    sortY: origin.y + SHIP_SHEET_FRAME_SIZE,
    light
  };
}

function npcShipDrawCall(state, activeChart) {
  const offset = chartOffsetPixels(activeChart);
  const point = { x: state.x + offset.x, y: state.y + offset.y };
  if (!pointNearScreen(point, SHIP_SHEET_FRAME_SIZE)) return null;
  if (!activeChart.visibleSet.has(state.tileId)) return null;
  const heading = npcShipScreenHeading(state.heading);
  const img = npcShipImages.get(state.slug);
  if (!img) throw new Error(`Missing NPC ship sprite sheet for ${state.slug}`);
  return {
    id: state.id,
    kind: "npc",
    slug: state.slug,
    factionId: state.factionId,
    role: state.role,
    img,
    frame: headingFrameForScreenHeading(heading),
    x: Math.round(point.x - SHIP_SHEET_FRAME_SIZE / 2),
    y: Math.round(point.y - SHIP_SHEET_FRAME_SIZE / 2),
    sortY: point.y + SHIP_SHEET_FRAME_SIZE / 2,
    stormAnchored: state.stormMode === "anchored",
    combatMode: state.combatMode,
    combatAllegiance: npcCombatAllegiance(state.id, state.factionId),
    hitPoints: state.hitPoints,
    maxHitPoints: state.maxHitPoints,
    flagSeed: state.id.length * 17
  };
}

function npcShipScreenHeading(headingVector) {
  const hx = dot3(headingVector, camera.right);
  const hy = dot3(headingVector, camera.up);
  const length = Math.hypot(hx, hy);
  if (length <= 1e-6) return { x: 0, y: -1 };
  return { x: hx / length, y: -hy / length };
}

function pointNearScreen(point, margin) {
  return point.x >= -margin &&
    point.x <= SCREEN_W + margin &&
    point.y >= -margin &&
    point.y <= SCREEN_H + margin;
}

function drawShipCall(call, nowMs) {
  const sx = (call.frame % SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE;
  const sy = Math.floor(call.frame / SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE;
  if (call.combatAllegiance) drawShipCombatOutline(call, sx, sy);
  ctx.drawImage(
    call.img,
    sx,
    sy,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE,
    call.x,
    call.y,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE
  );
  if (call.kind === "player") drawShipLighting(call.frame, call.x, call.y, call.light);
  if (call.kind === "npc") {
    drawNpcShipFlag(call, nowMs);
    if (call.stormAnchored) drawNpcAnchorMarker(call);
    if (call.combatMode) drawNpcCombatHull(call);
  }
}

function npcCombatAllegiance(npcShipId, factionId) {
  if (shipCombatState.engagements.has(engagementKey(PLAYER_COMBAT_ID, npcShipId))) return "enemy";
  return playerCombatAllegiance(ship.factionId, factionId, playerHasCombatEngagement());
}

function drawShipCombatOutline(call, sx, sy) {
  shipOutlineCtx.clearRect(0, 0, SHIP_SHEET_FRAME_SIZE, SHIP_SHEET_FRAME_SIZE);
  shipOutlineCtx.globalCompositeOperation = "source-over";
  shipOutlineCtx.drawImage(
    call.img,
    sx,
    sy,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE,
    0,
    0,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE
  );
  shipOutlineCtx.globalCompositeOperation = "source-in";
  shipOutlineCtx.fillStyle = call.combatAllegiance === "enemy" ? "#e83b3b" : "#38b764";
  shipOutlineCtx.fillRect(0, 0, SHIP_SHEET_FRAME_SIZE, SHIP_SHEET_FRAME_SIZE);
  shipOutlineCtx.globalCompositeOperation = "source-over";

  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.drawImage(shipOutlineCanvas, call.x + dx, call.y + dy);
  }
}

function drawNpcShipFlag(call, nowMs) {
  const poleX = call.x + 19;
  const poleY = call.y + 5;
  ctx.fillStyle = "#4c3e24";
  ctx.fillRect(poleX, poleY, 1, 10);
  drawWavingFactionFlag(
    call.factionId,
    poleX + 1,
    poleY,
    NPC_SHIP_FLAG_W,
    NPC_SHIP_FLAG_H,
    flagWavePhase(nowMs, call.flagSeed)
  );
}

function drawNpcCombatHull(call) {
  const width = 20;
  const x = call.x + Math.round((SHIP_SHEET_FRAME_SIZE - width) / 2);
  const y = call.y + SHIP_SHEET_FRAME_SIZE - 2;
  const ratio = clamp(call.hitPoints / call.maxHitPoints, 0, 1);
  ctx.fillStyle = "#2e222f";
  ctx.fillRect(x, y, width, 3);
  ctx.fillStyle = call.combatMode === COMBAT_MODE_FLEE ? "#f9c22b" : "#e83b3b";
  ctx.fillRect(x + 1, y + 1, Math.round((width - 2) * ratio), 1);
}

function drawNpcAnchorMarker(call) {
  const x = call.x + SHIP_SHEET_FRAME_SIZE - 10;
  const y = call.y + SHIP_SHEET_FRAME_SIZE - 11;
  ctx.fillStyle = "rgba(199, 220, 208, 0.92)";
  ctx.fillRect(x + 2, y, 1, 6);
  ctx.fillRect(x, y + 2, 5, 1);
  ctx.fillRect(x, y + 5, 2, 1);
  ctx.fillRect(x + 3, y + 5, 2, 1);
  ctx.fillRect(x, y + 4, 1, 2);
  ctx.fillRect(x + 4, y + 4, 1, 2);
}

function shipScreenOrigin(frameSize) {
  return {
    x: Math.round(SCREEN_W / 2 - frameSize / 2),
    y: Math.round(SCREEN_H / 2 - frameSize / 2)
  };
}

function drawShipLighting(frame, x, y, light) {
  if (!shipLighting || !light || light.direct <= 0.01) return;
  drawShipMaskPoints(
    shipLightingPoints("shade", frame, light.bin),
    x,
    y,
    `rgba(26, 18, 44, ${(SHIP_LIGHT_SHADE_ALPHA * light.direct).toFixed(3)})`
  );
  drawShipMaskPoints(
    shipLightingPoints("light", frame, light.bin),
    x,
    y,
    `rgba(255, 240, 188, ${(SHIP_LIGHT_HIGHLIGHT_ALPHA * light.direct).toFixed(3)})`
  );
}

function shipLightingPoints(kind, frame, bin) {
  const points = shipLighting?.[kind]?.[frame]?.[bin];
  if (!points) throw new Error(`Missing ship ${kind} lighting mask for frame ${frame}, bin ${bin}`);
  return points;
}

function drawShipMaskPoints(points, x, y, color) {
  if (points.length === 0) return;
  ctx.fillStyle = color;
  for (const point of points) {
    ctx.fillRect(x + (point & 0xff), y + (point >> 8), 1, 1);
  }
}

function shipHeadingFrame() {
  const heading = shipScreenHeading();
  return headingFrameForScreenHeading(heading);
}

function headingFrameForScreenHeading(heading) {
  const angle = Math.atan2(-heading.y, heading.x);
  const raw = Math.round(angle / (Math.PI * 2) * SHIP_HEADING_COUNT);
  return ((raw % SHIP_HEADING_COUNT) + SHIP_HEADING_COUNT) % SHIP_HEADING_COUNT;
}

function shipFrameScreenHeading(frame) {
  const angle = frame / SHIP_HEADING_COUNT * Math.PI * 2;
  return {
    x: Math.cos(angle),
    y: -Math.sin(angle)
  };
}

function shipScreenHeading() {
  const hx = dot3(ship.heading, camera.right);
  const hy = dot3(ship.heading, camera.up);
  const length = Math.hypot(hx, hy);
  if (length <= 1e-6) return { x: 0, y: -1 };
  return { x: hx / length, y: -hy / length };
}

function drawWindIndicator(nowMs) {
  if (!ship) return;
  const state = windIndicatorState || windIndicatorTarget();
  const flowDir = state.flowDirectionRad;
  const strength = clamp(state.strength, 0.05, 1.25);
  const dx = Math.cos(flowDir);
  const dy = -Math.sin(flowDir);
  const px = -dy;
  const py = dx;
  const radius = WIND_INDICATOR_RADIUS_PX + Math.round(strength * 3);
  const length = 5 + Math.round(strength * 9);
  const halfWidth = 2 + Math.round(strength * 5);
  const baseLen = Math.max(2, Math.round(length * 0.5));
  const cx = Math.round(SCREEN_W / 2 + dx * radius);
  const cy = Math.round(SCREEN_H / 2 + dy * radius);
  const tip = {
    x: Math.round(cx + dx * length),
    y: Math.round(cy + dy * length)
  };
  const base = {
    x: Math.round(cx - dx * baseLen),
    y: Math.round(cy - dy * baseLen)
  };
  const left = {
    x: Math.round(base.x + px * halfWidth),
    y: Math.round(base.y + py * halfWidth)
  };
  const right = {
    x: Math.round(base.x - px * halfWidth),
    y: Math.round(base.y - py * halfWidth)
  };
  const warning = clamp(state.stallWarning || 0, 0, 1);
  const pulse = reducedMotionPreferred
    ? 0.72
    : 0.5 + Math.sin(nowMs / WIND_INDICATOR_STALL_PULSE_MS * Math.PI * 2) * 0.5;
  const warningHue = easeInOut(warning);
  const warningColor = {
    r: Math.round(249 + (240 - 249) * warningHue),
    g: Math.round(194 + (79 - 194) * warningHue),
    b: Math.round(43 + (120 - 43) * warningHue)
  };
  const warningMix = warning * (0.28 + pulse * 0.72);
  const alpha = clamp(0.42 + strength * 0.44 + warning * pulse * 0.12, 0, 1);
  const color = `rgba(${Math.round(130 + (warningColor.r - 130) * warningMix)}, ` +
    `${Math.round(215 + (warningColor.g - 215) * warningMix)}, ` +
    `${Math.round(204 + (warningColor.b - 204) * warningMix)}, ` +
    `${alpha.toFixed(3)})`;
  drawPixelLine(tip.x, tip.y, left.x, left.y, color);
  drawPixelLine(tip.x, tip.y, right.x, right.y, color);
}

function updateWindIndicator(dt) {
  if (!ship || !graph) return false;
  const target = windIndicatorTarget();
  if (!windIndicatorState) {
    windIndicatorState = createWindIndicatorState(target);
    return true;
  }

  updateWindIndicatorDirectionTarget(target.directionIndex);
  const targetDirectionRad = windDirectionForBucket(windIndicatorState.targetDirectionIndex);
  const directionDelta = shortestAngleDelta(windIndicatorState.flowDirectionRad, targetDirectionRad);
  const maxStep = WIND_INDICATOR_TURN_RATE_RAD * dt;
  const directionStep = clamp(directionDelta, -maxStep, maxStep);
  const strengthStep = 1 - Math.exp(-WIND_INDICATOR_STRENGTH_LERP_PER_SECOND * dt);
  const nextStrength = windIndicatorState.strength + (target.strength - windIndicatorState.strength) * strengthStep;
  const warningStep = 1 - Math.exp(-WIND_INDICATOR_WARNING_LERP_PER_SECOND * dt);
  const nextWarning = windIndicatorState.stallWarning +
    (target.stallWarning - windIndicatorState.stallWarning) * warningStep;
  const changed = Math.abs(directionStep) > 0.0004 ||
    Math.abs(nextStrength - windIndicatorState.strength) > 0.002 ||
    Math.abs(nextWarning - windIndicatorState.stallWarning) > 0.002 ||
    (!reducedMotionPreferred && nextWarning > 0.01);

  windIndicatorState = {
    flowDirectionRad: normalizeAngleRad(windIndicatorState.flowDirectionRad + directionStep),
    strength: nextStrength,
    stallWarning: nextWarning,
    targetDirectionIndex: windIndicatorState.targetDirectionIndex,
    pendingDirectionIndex: windIndicatorState.pendingDirectionIndex,
    pendingDirectionFrames: windIndicatorState.pendingDirectionFrames
  };
  return changed;
}

function windIndicatorTarget() {
  const wind = windForTile(centerTileId);
  const flowDirectionRad = normalizeAngleRad(wind.directionRad + Math.PI);
  const directionIndex = windDirectionBucket(flowDirectionRad);
  const windFlow = windFlowVectorAtShip(wind);
  const alignment = clamp(dot3(ship.heading, windFlow), -1, 1);
  const angleFromWind = Math.acos(clamp(-alignment, -1, 1));
  return {
    flowDirectionRad: windDirectionForBucket(directionIndex),
    directionIndex,
    strength: wind.strength,
    stallWarning: sailingStallWarningStrength(angleFromWind, ship.stats.upwindStallAngleRad)
  };
}

function createWindIndicatorState(target) {
  return {
    flowDirectionRad: target.flowDirectionRad,
    strength: target.strength,
    stallWarning: target.stallWarning,
    targetDirectionIndex: target.directionIndex,
    pendingDirectionIndex: target.directionIndex,
    pendingDirectionFrames: 0
  };
}

function updateWindIndicatorDirectionTarget(directionIndex) {
  if (directionIndex === windIndicatorState.targetDirectionIndex) {
    windIndicatorState.pendingDirectionIndex = directionIndex;
    windIndicatorState.pendingDirectionFrames = 0;
    return;
  }
  if (directionIndex !== windIndicatorState.pendingDirectionIndex) {
    windIndicatorState.pendingDirectionIndex = directionIndex;
    windIndicatorState.pendingDirectionFrames = 1;
    return;
  }

  windIndicatorState.pendingDirectionFrames += 1;
  if (windIndicatorState.pendingDirectionFrames >= WIND_INDICATOR_DIRECTION_STABLE_FRAMES) {
    windIndicatorState.targetDirectionIndex = directionIndex;
    windIndicatorState.pendingDirectionFrames = 0;
  }
}

function windDirectionBucket(angle) {
  const step = Math.PI * 2 / WIND_INDICATOR_DIRECTION_COUNT;
  return Math.round(normalizeAngleRad(angle) / step) % WIND_INDICATOR_DIRECTION_COUNT;
}

function windDirectionForBucket(index) {
  const step = Math.PI * 2 / WIND_INDICATOR_DIRECTION_COUNT;
  return normalizeAngleRad(index * step);
}

function shortestAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function normalizeAngleRad(angle) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function drawPixelLine(x0, y0, x1, y1, color) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  ctx.fillStyle = color;
  while (true) {
    ctx.fillRect(x, y, 1, 1);
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function drawCitySprites(activeChart, nowMs) {
  if (!activeChart.cityCalls || activeChart.cityCalls.length === 0) return;
  for (const call of activeChart.cityCalls) drawCitySprite(call, nowMs);
}

function drawCitySpritesAboveShip(activeChart, offset, nowMs) {
  if (!activeChart.cityCalls || activeChart.cityCalls.length === 0) return;
  for (const call of activeChart.cityCalls) {
    if (citySpriteShouldDrawAboveShip(call, offset)) drawCitySprite(call, nowMs);
  }
}

function drawCitySprite(call, nowMs) {
  const img = cityImageForType(call.cityType);
  const poleX = call.spriteX + 29;
  const poleTop = call.spriteY + 2;
  ctx.fillStyle = "#4c3e24";
  ctx.fillRect(poleX, poleTop, 1, 18);
  ctx.drawImage(img, call.spriteX, call.spriteY);
  drawWavingFactionFlag(
    call.factionId,
    poleX + 1,
    poleTop + 1,
    CITY_FLAG_W,
    CITY_FLAG_H,
    flagWavePhase(nowMs, call.tileId)
  );
}

function flagWavePhase(nowMs, seed = 0) {
  return nowMs * CITY_FLAG_WAVE_SPEED_RAD_PER_MS + seed * 0.37;
}

function drawWavingFactionFlag(factionId, x, y, width, height, phaseRad) {
  const image = factionFlagImages?.get(factionId);
  if (!image) throw new Error(`Missing faction flag image: ${factionId}`);
  const offsets = flagWaveColumnOffsets(width, phaseRad, 1);
  for (let column = 0; column < width; column++) {
    const sourceX = Math.floor(column * image.width / width);
    const sourceEndX = Math.floor((column + 1) * image.width / width);
    ctx.drawImage(
      image,
      sourceX,
      0,
      Math.max(1, sourceEndX - sourceX),
      image.height,
      Math.round(x + column),
      Math.round(y + offsets[column]),
      1,
      height
    );
  }
}

function citySpriteShouldDrawAboveShip(call, offset) {
  if (!ship || !shipImage) return false;
  const cityRect = cityScreenRect(call, offset);
  const shipRect = shipScreenRect(SHIP_SHEET_FRAME_SIZE);
  if (!rectsOverlap(cityRect, shipRect)) return false;
  return cityRect.y + cityRect.h > shipScreenSortY();
}

function cityScreenRect(call, offset) {
  return {
    x: call.spriteX + offset.x,
    y: call.spriteY + offset.y,
    w: call.spriteW,
    h: call.spriteH
  };
}

function shipScreenRect(frameSize) {
  const origin = shipScreenOrigin(frameSize);
  return {
    x: origin.x,
    y: origin.y,
    w: frameSize,
    h: frameSize
  };
}

function shipScreenSortY() {
  return Math.round(SCREEN_H / 2 + SHIP_SHEET_FRAME_SIZE / 2);
}

function drawCityLabels(cityCalls, activeChart) {
  for (const { label, box } of cityLabelBoxes(cityCalls, activeChart)) {
    ctx.fillStyle = "rgba(19, 15, 12, 0.72)";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = "#f3dfb0";
    drawPixelText(label, box.x + CITY_LABEL_PAD_X, box.y + CITY_LABEL_PAD_Y, {
      font: PIXEL_FONT_BODY_8
    });
  }
}

function cityLabelBoxes(cityCalls, activeChart) {
  const { labelBounds, visibleBounds, blockers } = cityLabelScreenLayout(activeChart);
  const sorted = [...cityCalls]
    .filter((call) => cityCallIsOnScreen(call, visibleBounds))
    .sort((a, b) => b.population - a.population || cityLabelText(a).localeCompare(cityLabelText(b)));
  const occupied = blockers.slice();
  const boxes = [];

  for (const call of sorted) {
    const label = cityLabelText(call);
    const textW = measurePixelTextWidth(label, PIXEL_FONT_BODY_8);
    const box = placeCityLabel(call, textW, occupied, labelBounds);
    occupied.push(box);
    boxes.push({ call, label, box });
  }

  return boxes;
}

function cityLabelScreenLayout(activeChart) {
  const offset = chartOffsetPixels(activeChart);
  const visibleBounds = {
    minX: -offset.x,
    minY: -offset.y,
    maxX: SCREEN_W - offset.x,
    maxY: SCREEN_H - offset.y
  };
  const labelBounds = {
    minX: -offset.x + 1,
    minY: -offset.y + 1,
    maxX: SCREEN_W - offset.x - 1,
    maxY: SCREEN_H - offset.y - 27
  };
  const blockers = [
    {
      x: MINIMAP_X - offset.x - 2,
      y: MINIMAP_Y - offset.y - 2,
      w: MINIMAP_W + 4,
      h: MINIMAP_H + 4
    }
  ];
  return { labelBounds, visibleBounds, blockers };
}

function cityCallIsOnScreen(call, bounds) {
  return rectsOverlap({
    x: call.spriteX,
    y: call.spriteY,
    w: call.spriteW,
    h: call.spriteH
  }, {
    x: bounds.minX,
    y: bounds.minY,
    w: bounds.maxX - bounds.minX,
    h: bounds.maxY - bounds.minY
  });
}

function placeCityLabel(call, textW, occupied, bounds) {
  const w = textW + CITY_LABEL_PAD_X * 2;
  const h = CITY_LABEL_H + CITY_LABEL_PAD_Y * 2;
  const midY = call.spriteY + call.spriteH / 2 - h / 2;
  const bottomY = call.spriteY + call.spriteH + CITY_LABEL_GAP_PX;
  const candidates = [
    cityLabelBox(call.x - w / 2, call.labelY, w, h),
    cityLabelBox(call.x - w / 2, bottomY, w, h),
    cityLabelBox(call.x + call.spriteW / 2 - 2, midY, w, h),
    cityLabelBox(call.x - call.spriteW / 2 - w + 2, midY, w, h),
    cityLabelBox(call.x - w - CITY_LABEL_GAP_PX, call.labelY, w, h),
    cityLabelBox(call.x + CITY_LABEL_GAP_PX, call.labelY, w, h),
    cityLabelBox(call.x - w - CITY_LABEL_GAP_PX, bottomY, w, h),
    cityLabelBox(call.x + CITY_LABEL_GAP_PX, bottomY, w, h)
  ];
  const preferred = candidates[0];
  let best = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    const box = clampCityLabelBox(candidate, bounds);
    const score = cityLabelPlacementScore(box, occupied, preferred);
    if (score >= bestScore) continue;
    best = box;
    bestScore = score;
  }
  if (!best) throw new Error(`Could not place city label: ${call.city}`);
  return best;
}

function cityLabelBox(x, y, w, h) {
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h)
  };
}

function clampCityLabelBox(box, bounds) {
  const minX = bounds.minX;
  const minY = bounds.minY;
  const maxX = Math.max(minX, bounds.maxX - box.w);
  const maxY = Math.max(minY, bounds.maxY - box.h);
  return {
    ...box,
    x: Math.round(clamp(box.x, minX, maxX)),
    y: Math.round(clamp(box.y, minY, maxY))
  };
}

function cityLabelPlacementScore(box, occupied, preferred) {
  let score = Math.abs(box.x - preferred.x) + Math.abs(box.y - preferred.y);
  for (const other of occupied) {
    score += rectOverlapArea(box, other) * 1000;
  }
  return score;
}

function rectOverlapArea(a, b) {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return w * h;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

function drawDiscoveryNotice(nowMs) {
  if (!discoveryNotice || nowMs >= discoveryNotice.expiresAtMs) return;
  const discovery = discoveryNotice.discovery;
  const x = MOUNTAIN_DISCOVERY_PANEL_X;
  const y = MOUNTAIN_DISCOVERY_PANEL_Y;
  const w = MOUNTAIN_DISCOVERY_PANEL_W;
  const h = MOUNTAIN_DISCOVERY_PANEL_H;
  ctx.fillStyle = "rgba(35, 27, 20, 0.92)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#d6b66b";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = "#fff1bf";
  const headline = fitPixelText(discovery.notice, PIXEL_FONT_UI_8, w - 10);
  drawPixelText(headline, x + 5, y + 4, { font: PIXEL_FONT_UI_8 });
  ctx.fillStyle = "#cbb88a";
  drawPixelText(discovery.detail, x + 5, y + 14, { font: PIXEL_FONT_BODY_8 });
}

function drawInteractionButton() {
  interactionButtonRect = null;
  interactionButtonTarget = null;
  if (dialogueState || menusAreOpen()) return;
  const target = activeInteractionTarget();
  if (!target) return;
  interactionButtonTarget = target;
  interactionButtonRect = {
    x: INTERACTION_BUTTON_X,
    y: INTERACTION_BUTTON_Y,
    w: INTERACTION_BUTTON_W,
    h: INTERACTION_BUTTON_H
  };
  const hovered = pointInRect(optionsMenu.hoverPoint, interactionButtonRect);
  ctx.fillStyle = hovered ? "#6d4b2f" : "#4a3424";
  ctx.fillRect(interactionButtonRect.x, interactionButtonRect.y, interactionButtonRect.w, interactionButtonRect.h);
  ctx.strokeStyle = "#d6b66b";
  ctx.strokeRect(
    interactionButtonRect.x + 0.5,
    interactionButtonRect.y + 0.5,
    interactionButtonRect.w - 1,
    interactionButtonRect.h - 1
  );
  ctx.fillStyle = "#f3dfb0";
  const actionLabel = target.kind === "port"
    ? `Dock: ${cityLabelText(target.call)}`
    : `Hail: ${target.call.label}`;
  const label = fitPixelText(actionLabel, PIXEL_FONT_BODY_8, interactionButtonRect.w - 8);
  drawPixelText(label, interactionButtonRect.x + 4, interactionButtonRect.y + 3, { font: PIXEL_FONT_BODY_8 });
}

function drawAnchorButton() {
  anchorButtonRect = null;
  if (dialogueState || menusAreOpen() || gameOverReason) return;
  if (!anchored && !canAnchorAtCurrentShore()) return;
  anchorButtonRect = {
    x: ANCHOR_BUTTON_X,
    y: ANCHOR_BUTTON_Y,
    w: ANCHOR_BUTTON_W,
    h: ANCHOR_BUTTON_H
  };
  const hovered = pointInRect(optionsMenu.hoverPoint, anchorButtonRect);
  ctx.fillStyle = anchored
    ? (hovered ? "#4f6b62" : "#354b48")
    : (hovered ? "#6d4b2f" : "#4a3424");
  ctx.fillRect(anchorButtonRect.x, anchorButtonRect.y, anchorButtonRect.w, anchorButtonRect.h);
  ctx.strokeStyle = anchored ? "#8ac0b4" : "#d6b66b";
  ctx.strokeRect(
    anchorButtonRect.x + 0.5,
    anchorButtonRect.y + 0.5,
    anchorButtonRect.w - 1,
    anchorButtonRect.h - 1
  );
  ctx.fillStyle = "#f3dfb0";
  const label = fitPixelText(
    anchored ? "WEIGH ANCHOR" : "DROP ANCHOR",
    PIXEL_FONT_BODY_8,
    anchorButtonRect.w - 8
  );
  drawPixelText(label, anchorButtonRect.x + 4, anchorButtonRect.y + 3, { font: PIXEL_FONT_BODY_8 });
}

function drawStormStatus(nowMs) {
  if (!ship || gameOverReason) return;
  const intensity = playerStormIntensity();
  const damageActive = stormDamageNotice && nowMs < stormDamageNotice.expiresAtMs;
  if (!damageActive && intensity < STORM_ACTIVE_INTENSITY && !anchored) return;
  const text = damageActive
    ? `STORM DAMAGE -${stormDamageNotice.damage} HULL`
    : anchored
      ? (intensity >= STORM_ACTIVE_INTENSITY ? "ANCHORED - STORM SHELTER" : "ANCHORED - WAITING")
      : `STORM ${Math.round(intensity * 100)}%`;
  const width = Math.min(190, measurePixelTextWidth(text, PIXEL_FONT_UI_8) + 12);
  const x = Math.round((SCREEN_W - width) / 2);
  const y = MOUNTAIN_DISCOVERY_PANEL_Y + MOUNTAIN_DISCOVERY_PANEL_H + 3;
  ctx.fillStyle = damageActive ? "rgba(93, 42, 43, 0.94)" : "rgba(38, 47, 58, 0.9)";
  ctx.fillRect(x, y, width, 13);
  ctx.strokeStyle = damageActive ? "#f68181" : "#8ac0b4";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 12);
  ctx.fillStyle = damageActive ? "#ffd2c6" : "#d6f2e8";
  drawPixelText(text, x + width / 2, y + 3, { font: PIXEL_FONT_UI_8, align: "center" });
}

function drawCombatNotice(nowMs) {
  if (!combatNotice || nowMs >= combatNotice.expiresAtMs) return;
  const width = Math.min(230, measurePixelTextWidth(combatNotice.text, PIXEL_FONT_UI_8) + 12);
  const x = Math.round((SCREEN_W - width) / 2);
  const y = MOUNTAIN_DISCOVERY_PANEL_Y + MOUNTAIN_DISCOVERY_PANEL_H + 18;
  ctx.fillStyle = "rgba(49, 54, 56, 0.94)";
  ctx.fillRect(x, y, width, 13);
  ctx.strokeStyle = "#f9c22b";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 12);
  ctx.fillStyle = "#fbff86";
  drawPixelText(fitPixelText(combatNotice.text, PIXEL_FONT_UI_8, width - 10), x + width / 2, y + 3, {
    font: PIXEL_FONT_UI_8,
    align: "center"
  });
}

function drawPlayerIntroModal(nowMs) {
  const modal = playerIntroModal;
  if (!modal) return;
  const character = modal.character;
  const panel = {
    x: PLAYER_INTRO_PANEL_X,
    y: PLAYER_INTRO_PANEL_Y,
    w: PLAYER_INTRO_PANEL_W,
    h: PLAYER_INTRO_PANEL_H
  };

  ctx.fillStyle = "rgba(16, 20, 23, 0.82)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#2f241c";
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = "#d6b66b";
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);
  ctx.strokeStyle = "#715033";
  ctx.strokeRect(panel.x + 3.5, panel.y + 3.5, panel.w - 7, panel.h - 7);

  ctx.fillStyle = "#d6b66b";
  drawPixelText("CAPTAIN'S PAPERS", SCREEN_W / 2, panel.y + 10, {
    font: PIXEL_FONT_UI_8,
    align: "center"
  });
  ctx.fillStyle = "#fff1bf";
  drawPixelText(
    fitPixelText(character.name.toUpperCase(), PIXEL_FONT_UI_8, panel.w - 32),
    SCREEN_W / 2,
    panel.y + 25,
    { font: PIXEL_FONT_UI_8, align: "center" }
  );

  const portraitX = panel.x + 18;
  const portraitY = panel.y + 44;
  ctx.fillStyle = "#191f24";
  ctx.fillRect(portraitX - 3, portraitY - 3, DIALOGUE_PORTRAIT_SIZE + 6, DIALOGUE_PORTRAIT_SIZE + 6);
  ctx.strokeStyle = "#8ac0b4";
  ctx.strokeRect(portraitX - 2.5, portraitY - 2.5, DIALOGUE_PORTRAIT_SIZE + 5, DIALOGUE_PORTRAIT_SIZE + 5);
  drawDialoguePortrait(character, null, portraitX, portraitY);

  const flagW = 32;
  const flagH = 20;
  const flagX = portraitX + Math.floor((DIALOGUE_PORTRAIT_SIZE - flagW) / 2);
  const flagY = portraitY + DIALOGUE_PORTRAIT_SIZE + 8;
  ctx.fillStyle = "#4c3e24";
  ctx.fillRect(flagX - 2, flagY - 2, 2, flagH + 8);
  drawWavingFactionFlag(
    character.nationalityId,
    flagX,
    flagY,
    flagW,
    flagH,
    flagWavePhase(nowMs, character.homePortTileId)
  );

  const detailX = panel.x + 104;
  const detailW = panel.w - 122;
  const rows = [
    ["HOME PORT", `${character.homePortName}, ${character.homePortRealmName || character.homePortCountry}`],
    ["NATIONALITY", character.nationalityAdjective],
    ["BORN", `${character.birthDateLabel}  AGE ${character.age}`],
    ["SEX", character.sex.toUpperCase()],
    ["VESSEL", shipLabelForSlug(ship?.typeSlug || character.starterShipSlug)]
  ];
  for (let i = 0; i < rows.length; i++) {
    const y = panel.y + 47 + i * 21;
    ctx.fillStyle = "#bda66f";
    drawPixelText(rows[i][0], detailX, y, { font: PIXEL_FONT_BODY_8 });
    ctx.fillStyle = "#f3dfb0";
    drawPixelText(fitPixelText(rows[i][1], PIXEL_FONT_UI_8, detailW), detailX, y + 9, {
      font: PIXEL_FONT_UI_8
    });
  }

  const button = modal.buttonRect;
  ctx.fillStyle = modal.hovered ? "#6d4b2f" : "#4a3424";
  ctx.fillRect(button.x, button.y, button.w, button.h);
  ctx.strokeStyle = modal.hovered ? "#fff1bf" : "#d6b66b";
  ctx.strokeRect(button.x + 0.5, button.y + 0.5, button.w - 1, button.h - 1);
  ctx.fillStyle = "#fff1bf";
  drawPixelText("BEGIN VOYAGE", button.x + button.w / 2, button.y + 4, {
    font: PIXEL_FONT_UI_8,
    align: "center"
  });
}

function drawGameOverOverlay() {
  ctx.fillStyle = "rgba(18, 14, 24, 0.78)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const panel = { x: 92, y: 90, w: SCREEN_W - 184, h: 68 };
  ctx.fillStyle = "#2e222f";
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = "#f68181";
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);
  ctx.fillStyle = "#ffd2c6";
  drawPixelText("SHIP LOST", SCREEN_W / 2, panel.y + 15, {
    font: PIXEL_FONT_UI_8,
    align: "center"
  });
  ctx.fillStyle = "#c7dcd0";
  drawPixelText(gameOverReason, SCREEN_W / 2, panel.y + 37, {
    font: PIXEL_FONT_BODY_8,
    align: "center"
  });
}

function drawDialogueOverlay(nowMs) {
  const subject = currentDialogueSubject();
  const view = currentDialogueView();
  const portFaction = dialogueState.kind === "port" ? factionById(subject.factionId) : null;
  const panel = {
    x: DIALOGUE_PANEL_X,
    y: DIALOGUE_PANEL_Y,
    w: DIALOGUE_PANEL_W,
    h: DIALOGUE_PANEL_H
  };

  drawDialoguePortrait(subject.character, view.expressionId, DIALOGUE_PORTRAIT_X, DIALOGUE_PORTRAIT_Y);

  ctx.fillStyle = "rgba(28, 20, 15, 0.94)";
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = "#d6b66b";
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);
  ctx.strokeStyle = "#715033";
  ctx.strokeRect(panel.x + 3.5, panel.y + 3.5, panel.w - 7, panel.h - 7);

  ctx.fillStyle = "#f3dfb0";
  const factionBlockX = panel.x + panel.w - DIALOGUE_FACTION_BLOCK_W - 8;
  const speakerW = portFaction ? factionBlockX - panel.x - 16 : panel.w - 18;
  drawPixelText(fitPixelText(view.speaker, PIXEL_FONT_UI_8, speakerW), panel.x + 8, panel.y + 8, {
    font: PIXEL_FONT_UI_8
  });

  if (portFaction) drawDialogueFactionFlag(portFaction, panel, nowMs, subject);

  const textX = panel.x + 12;
  const textY = panel.y + 25;
  const optionW = panel.x + panel.w - textX - 12;
  const bodyTextW = portFaction ? factionBlockX - textX - 8 : optionW;
  let y = textY;
  ctx.fillStyle = "#ead9b5";
  for (const line of wrapPixelText(view.text, PIXEL_FONT_BODY_8, bodyTextW, 4)) {
    drawPixelText(line, textX, y, { font: PIXEL_FONT_BODY_8 });
    y += 10;
  }
  if (view.feedback) {
    ctx.fillStyle = "#c7dd8a";
    for (const line of wrapPixelText(view.feedback, PIXEL_FONT_BODY_8, bodyTextW, 2)) {
      drawPixelText(line, textX, y, { font: PIXEL_FONT_BODY_8 });
      y += 10;
    }
  }

  const optionX = textX;
  const optionY = Math.max(panel.y + 82, y + 3);
  drawDialogueOptions(view, optionX, optionY, optionW);
}

function drawDialogueFactionFlag(faction, panel, nowMs, city) {
  const flagX = panel.x + panel.w - DIALOGUE_FLAG_W - 10;
  const flagY = panel.y + 8;
  ctx.fillStyle = "#4c3e24";
  ctx.fillRect(flagX - 1, flagY - 1, 1, DIALOGUE_FLAG_H + 9);
  drawWavingFactionFlag(
    faction.id,
    flagX,
    flagY,
    DIALOGUE_FLAG_W,
    DIALOGUE_FLAG_H,
    flagWavePhase(nowMs, city.tileId)
  );
  const label = fitPixelText(faction.name.toUpperCase(), PIXEL_FONT_BODY_8, DIALOGUE_FACTION_BLOCK_W);
  ctx.fillStyle = "#d6b66b";
  drawPixelText(label, panel.x + panel.w - 10, flagY + DIALOGUE_FLAG_H + 3, {
    font: PIXEL_FONT_BODY_8,
    align: "right"
  });
  if (city.isFactionCapital) {
    ctx.fillStyle = "#fbff86";
    drawPixelText("CAPITAL", panel.x + panel.w - 10, flagY + DIALOGUE_FLAG_H + 13, {
      font: PIXEL_FONT_BODY_8,
      align: "right"
    });
  }
}

function drawDialoguePortrait(character, expressionId, x, y) {
  const expression = characterExpression(character, expressionId || "neutral");
  const image = dialoguePortraitImage(character, expression);
  if (image) ctx.drawImage(image, x, y);
}

function drawDialogueOptions(view, x, y, width) {
  dialogueLayout.optionRects = [];
  for (let i = 0; i < view.options.length; i++) {
    const option = view.options[i];
    const rect = {
      x,
      y: y + i * DIALOGUE_OPTION_H,
      w: width,
      h: DIALOGUE_OPTION_H
    };
    dialogueLayout.optionRects.push(rect);
    const selected = i === dialogueState.selectedIndex;
    if (selected) {
      ctx.fillStyle = option.disabled ? "rgba(90, 67, 55, 0.72)" : "rgba(104, 78, 44, 0.88)";
      ctx.fillRect(rect.x - 2, rect.y, rect.w + 4, rect.h);
    }
    ctx.fillStyle = option.disabled ? "#8d8171" : selected ? "#fff1b8" : "#e6c98e";
    const prefix = selected ? "> " : "  ";
    drawPixelText(
      fitPixelText(`${prefix}${option.label}`, PIXEL_FONT_BODY_8, rect.w - 4),
      rect.x,
      rect.y + 2,
      { font: PIXEL_FONT_BODY_8 }
    );
  }
}

function wrapPixelText(text, font, maxWidth, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measurePixelTextWidth(next, font) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && words.length > 0) {
    lines[maxLines - 1] = fitPixelText(lines[maxLines - 1], font, maxWidth);
  }
  return lines;
}

function ensureDialoguePortraitLoaded() {
  if (!dialogueState) return;
  const subject = currentDialogueSubject();
  const view = currentDialogueView();
  const expression = characterExpression(subject.character, view.expressionId || "neutral");
  dialoguePortraitImage(subject.character, expression);
}

async function ensureCharacterPortraitLoaded(character, expression) {
  if (!character || !expression) return;
  dialoguePortraitImage(character, expression);
  const pending = portraitPromiseCache.get(`${character.id}|${expression.id}`);
  if (pending) await pending;
}

function dialoguePortraitImage(character, expression) {
  if (!character || !expression) return null;
  const key = `${character.id}|${expression.id}`;
  const cached = portraitCanvasCache.get(key);
  if (cached) return cached;
  if (!portraitPromiseCache.has(key)) {
    const promise = loadAssetImage(expression.src, `portrait ${character.id}.${expression.id}`)
      .then((sourceImage) => {
        const canvas = recolorPortraitImage(sourceImage, character.palette, expression.roleMap);
        portraitCanvasCache.set(key, canvas);
        dirty = true;
      })
      .catch((error) => {
        portraitPromiseCache.delete(key);
        console.error(error);
      });
    portraitPromiseCache.set(key, promise);
  }
  return null;
}

function drawTinyStatus(nowMs) {
  const row = earthById[centerTileId];
  const lat = graph.latDeg[centerTileId].toFixed(2);
  const lon = graph.lonDeg[centerTileId].toFixed(2);
  const flags = weatherFlagsForTile(centerTileId);
  const wind = windForTile(centerTileId);
  const flowDir = wind.directionRad + Math.PI;
  const iced = Boolean(seaIceMask?.[centerTileId] || freshwaterIceMask?.[centerTileId]);
  const shipSpeed = ship ? vectorLength(ship.velocity) * PIXELS_PER_RADIAN : 0;
  const nearestNpc = nearestNpcVisualOffset();
  const npcStatus = nearestNpc
    ? `npc ${npcVisualShips.size} near ${Math.round(nearestNpc.dx)},${Math.round(nearestNpc.dy)}`
    : `npc ${npcVisualShips.size}`;
  const line1 = `${centerTileId}${graph.isPentagon[centerTileId] ? " P" : ""} ${terrainStatusLabel(row)} ${lat},${lon}`;
  const storm = playerStormIntensity();
  const condition = storm >= STORM_ACTIVE_INTENSITY ? `storm ${Math.round(storm * 100)}%` : weatherLabelFor(flags, iced);
  const line2 = `${weatherDateLabel()} ${condition} wind ${windDirectionName(flowDir)} ${wind.strength.toFixed(1)} spd ${shipSpeed.toFixed(0)} ${npcStatus}`;
  const width = Math.min(
    SCREEN_W - 8,
    Math.max(measurePixelTextWidth(line1, PIXEL_FONT_MONO_8), measurePixelTextWidth(line2, PIXEL_FONT_MONO_8)) + 8
  );
  ctx.fillStyle = "rgba(15, 18, 14, 0.62)";
  ctx.fillRect(4, SCREEN_H - 24, width, 20);
  ctx.fillStyle = "#d7d9bf";
  drawPixelText(line1, 8, SCREEN_H - 16, { font: PIXEL_FONT_MONO_8 });
  drawPixelText(line2, 8, SCREEN_H - 6, { font: PIXEL_FONT_MONO_8 });

  void nowMs;
}

function nearestNpcVisualOffset() {
  if (!localLayout || npcVisualShips.size === 0) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const state of npcVisualShips.values()) {
    const dx = state.x - localLayout.viewX;
    const dy = state.y - localLayout.viewY;
    const distance = dx * dx + dy * dy;
    if (distance >= nearestDistance) continue;
    nearest = { dx, dy };
    nearestDistance = distance;
  }
  return nearest;
}

function weatherFlagsForTile(tileId) {
  return discreteWeatherFlagsForTile(weatherBake, tileId, weatherParts.dayIndex);
}

function terrainStatusLabel(row) {
  if (isCoastalWaterRow(row)) return "coastal waters";
  return row?.t || "unknown";
}

function windForTile(tileId) {
  const wind = windAtLatLonDeg(
    graph.latDeg[tileId],
    graph.lonDeg[tileId],
    dateToSubsolarLatDeg(weatherParts.date),
    {
      seed: WEATHER_WIND_SEED,
      simMinute: Math.floor(weatherClockMinutes)
    }
  );
  const stormIntensity = stormIntensityForTile(tileId);
  return {
    ...wind,
    strength: stormWindStrength(wind.strength, stormIntensity)
  };
}

function stormIntensityForTile(tileId, simMinute = weatherClockMinutes) {
  if (!stormSystem || !Number.isInteger(tileId)) return 0;
  return stormIntensityAtTile(stormSystem, tileId, simMinute);
}

function playerStormIntensity() {
  return ship ? stormIntensityForTile(ship.tileId) : 0;
}

function weatherDateLabel() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = weatherParts.date;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hour = String(d.getUTCHours()).padStart(2, "0");
  const minute = String(d.getUTCMinutes()).padStart(2, "0");
  return `${months[d.getUTCMonth()]} ${day} ${hour}:${minute}`;
}

function weatherLabelFor(flags, iced) {
  if (iced) return "ice";
  if ((flags & TILE_DAY_SNOW_FALL) !== 0) return "snowfall";
  if ((flags & TILE_DAY_RAIN) !== 0) return "rain";
  if ((flags & TILE_DAY_SNOW_GROUND) !== 0) return "snow";
  if ((flags & TILE_DAY_WET_SOIL) !== 0) return "wet";
  return "clear";
}

function windDirectionName(directionRad) {
  const deg = ((directionRad * 180 / Math.PI) % 360 + 360) % 360;
  const names = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];
  return names[Math.round(deg / 45) % names.length];
}

function faceColorFor(call) {
  if (isCoastFace(call)) return beachFaceColor(call);
  const mountain = mountainFaceInfo(call);
  if (mountain?.bothMountain) {
    return shadeHex(terrainSpriteColor(mountainVariant(mountain.mountain.id)), -12);
  }
  if (mountain) {
    return mountainNeighborGroundColor(mountain.neighbor.row, mountain.neighbor.id);
  }
  const color = terrainColorForTile(call.ownerRow, call.ownerId);
  if (Math.abs(call.ownerLevel - call.otherLevel) < 2) return color;
  return call.ownerLevel > call.otherLevel ? shadeHex(color, -18) : shadeHex(color, 14);
}

function mountainNeighborGroundColor(row, id) {
  if (tileHasSeasonalSnowTerrain(row, id)) return terrainColorForTile(row, id);
  const spriteKey = spriteForTerrain(row, id);
  if (
    spriteKey.startsWith("forest_") ||
    spriteKey.startsWith("pine_forest_") ||
    spriteKey.startsWith("jungle_")
  ) {
    return terrainSpriteColor(`grass_0${1 + (hashInt(id) % 4)}`);
  }
  return terrainColorForTile(row, id);
}

function mountainFaceInfo(call) {
  const candidates = [
    { side: "a", id: call.a, row: call.row, level: call.level },
    { side: "b", id: call.b, row: call.nrow, level: call.nlevel }
  ];
  const mountains = candidates.filter((candidate) => candidate.level >= 3);
  if (mountains.length === 0) return null;
  const mountain = mountains.find((candidate) => candidate.id === call.ownerId) || mountains[0];
  if (mountains.length === 2) return { mountain, neighbor: null, bothMountain: true };
  return {
    mountain,
    neighbor: candidates.find((candidate) => candidate.side !== mountain.side),
    bothMountain: false
  };
}

function isCoastFace(call) {
  return isWaterSurfaceRow(call.row) !== isWaterSurfaceRow(call.nrow);
}

function beachFaceColor(call) {
  const key = `sand_0${1 + (hashInt(call.a ^ Math.imul(call.b, 0x27d4eb2d)) % 5)}`;
  const color = spriteColors.get(key);
  if (!color) throw new Error(`Missing dominant terrain color for beach transition sprite: ${key}`);
  return paleBeachColor(color);
}

function beachWaterColor(call) {
  const waterIsA = isWaterSurfaceRow(call.row);
  const waterRow = waterIsA ? call.row : call.nrow;
  const waterId = waterIsA ? call.a : call.b;
  const color = terrainColorForTile(waterRow, waterId);
  return rgbaFromHex(color, BEACH_WAVE_WATER_ALPHA);
}

function paleBeachColor(hex) {
  const { r, g, b } = parseHexColor(hex);
  const target = { r: 244, g: 226, b: 142 };
  return rgbToHex(
    Math.round(r * 0.22 + target.r * 0.78),
    Math.round(g * 0.22 + target.g * 0.78),
    Math.round(b * 0.22 + target.b * 0.78)
  );
}

function spriteForTerrain(row, id) {
  const t = row.t || "";
  const variant = hashInt(id) % 4;

  if (t === "water") return waterSpriteForTile(id);
  if (t === "lake" || t === "beach") return `water_shallow_0${waterFrameFor(id)}`;
  if (isMountainPeakTile(id)) return snowyMountainVariant(id);
  if (t === "mountain") return mountainVariant(id);
  if (t.includes("ice_cap")) return "snow_01";
  if (t === "ice") return "ice_01";
  if (t.includes("tundra") || t === "snow") return "snow_01";
  if (row.e > 0.13) return "earth_stone";
  if (row.h === 1) return hillSpriteForTerrain(row, id);
  if (row.e > 0.075) return variant % 2 === 0 ? "earth_rocky" : "earth_stone";
  if (t.includes("desert") || t.includes("steppe")) return t.includes("cold") ? "earth_stone" : sandVariant(id);
  if (t.includes("tropical")) return variant === 0 ? "jungle_palm_01" : `jungle_dense_0${1 + (variant % 3)}`;
  if (t.includes("subarctic") || t.includes("continental")) return variant === 0 ? "pine_forest_01" : `grass_0${1 + variant}`;
  if (t.includes("oceanic") || t.includes("humid") || t.includes("mediterranean")) return variant === 0 ? "forest_broadleaf_01" : `grass_0${1 + variant}`;
  if (t === "forest") return variant % 2 === 0 ? "forest_broadleaf_01" : "forest_broadleaf_02";
  if (t === "desert") return sandVariant(id);
  return `grass_0${1 + variant}`;
}

function waterSpriteForTile(id) {
  const frame = waterFrameFor(id);
  const band = waterDepthBands?.[id] ?? (WATER_DEPTH_GRADATION_COUNT + 1);
  if (band >= 1 && band <= WATER_DEPTH_GRADATION_COUNT) {
    return `water_depth_0${band}_0${frame}`;
  }
  return `water_deep_01_0${frame}`;
}

function waterFrameFor(id) {
  const staggerMs = hashInt(id) % WATER_FRAME_MS;
  return (Math.floor((waterAnimationClockMs + staggerMs) / WATER_FRAME_MS) % 2) + 1;
}

function terrainLevel(row, id) {
  const t = row.t || "";
  if (t === "water") return -2;
  if (t === "lake" || t === "beach") return -1;
  if (t.includes("ice")) return 0;
  if (isMountainPeakTile(id) || t === "mountain") return 3;
  if (row.e > 0.13) return 2;
  if (row.h === 1 || row.e > 0.075) return 1;
  return 0;
}

function isMountainPeakTile(id) {
  if (!mountainLandmarks) throw new Error("Mountain landmarks are not initialized");
  return mountainLandmarks.peakTileIds.has(id);
}

function sandVariant(id) {
  return `sand_0${1 + (hashInt(id) % 5)}`;
}

function hillSpriteForTerrain(row, id) {
  const terrain = row.t || "";
  const grassy = terrain === "land" ||
    terrain === "forest" ||
    terrain.includes("savanna") ||
    terrain.includes("humid") ||
    terrain.includes("oceanic") ||
    terrain.includes("mediterranean") ||
    terrain.includes("continental") ||
    terrain.includes("subarctic") ||
    terrain.includes("highland");
  if (grassy) return images.has("grassy_hill") ? "grassy_hill" : `grass_0${1 + (hashInt(id) % 4)}`;
  return hashInt(id) % 2 === 0 ? "earth_rocky" : "earth_stone";
}

function mountainVariant(id) {
  return `mountain_stone_0${1 + (hashInt(id) % 3)}`;
}

function snowyMountainVariant(id) {
  return `mountain_snowy_0${1 + (hashInt(id) % 2)}`;
}

function segmentNearScreen(ax, ay, bx, by, margin = VIEW_MARGIN) {
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by);
  const maxY = Math.max(ay, by);
  return maxX >= -margin && minX <= SCREEN_W + margin && maxY >= -margin && minY <= SCREEN_H + margin;
}

function dotTile(id, v) {
  const k = id * 3;
  return graph.centers[k] * v[0] + graph.centers[k + 1] * v[1] + graph.centers[k + 2] * v[2];
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const c = Math.cos(lat);
  return [c * Math.cos(lon), Math.sin(lat), -c * Math.sin(lon)];
}

function isControlKey(key) {
  return key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "w" ||
    key === "W" ||
    key === "a" ||
    key === "A" ||
    key === "s" ||
    key === "S" ||
    key === "d" ||
    key === "D";
}

function isInteractionKey(key) {
  return key === "Enter" || key === " ";
}

function isCannonKey(key) {
  return key === "q" ||
    key === "Q" ||
    key === "e" ||
    key === "E";
}

function cannonSideForKey(key) {
  if (key === "q" || key === "Q") return "port";
  if (key === "e" || key === "E") return "starboard";
  throw new Error(`Unknown cannon key: ${key}`);
}

function isWeatherControlKey(key) {
  return key === "[" ||
    key === "]" ||
    key === "," ||
    key === "." ||
    key === " ";
}

function handleWeatherControlKey(key) {
  if (key === "[") adjustWeatherClock(-WEATHER_MINUTES_PER_DAY);
  if (key === "]") adjustWeatherClock(WEATHER_MINUTES_PER_DAY);
  if (key === ",") adjustWeatherClock(-60);
  if (key === ".") adjustWeatherClock(60);
  if (key === " ") toggleWeatherClock();
}

function adjustWeatherClock(deltaMinutes) {
  weatherClockMinutes += deltaMinutes;
  refreshWeatherState(true);
  dirty = true;
}

function toggleWeatherClock() {
  if (weatherTimeScale > 0) {
    pausedWeatherTimeScale = weatherTimeScale;
    weatherTimeScale = 0;
  } else {
    weatherTimeScale = pausedWeatherTimeScale || WEATHER_DEFAULT_TIME_SCALE;
  }
  dirty = true;
}

function drawLoading() {
  ctx.fillStyle = "#172437";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#d7d9bf";
  drawPixelText("Loading pixel globe...", 8, 14, { font: PIXEL_FONT_BODY_8 });
}

function drawFatalError(err, heading = "Prototype failed to start") {
  ctx.fillStyle = "#1d1513";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#f0d2be";
  const lines = String(err?.message || err).match(/.{1,70}/g) || ["Unknown error"];
  drawPixelText(heading, 8, 14, { font: PIXEL_FONT_BODY_8 });
  for (let i = 0; i < lines.length; i++) drawPixelText(lines[i], 8, 28 + i * 10, { font: PIXEL_FONT_BODY_8 });
}

function hashInt(n) {
  let x = n | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function hash2(a, b) {
  return (hashInt((a * 73856093) ^ (b * 19349663)) & 0xffff) / 0xffff;
}

function shadeHex(hex, delta) {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  const n = Number.parseInt(clean, 16);
  const r = clamp(((n >> 16) & 255) + delta, 0, 255);
  const g = clamp(((n >> 8) & 255) + delta, 0, 255);
  const b = clamp((n & 255) + delta, 0, 255);
  return `rgb(${r},${g},${b})`;
}
