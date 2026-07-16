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
  alphaMaskContainsMapPoint,
  forEachPixelBrushPoint,
  pixelMaskKey
} from "./pixelWaterMask.js";
import {
  CITY_VISUAL_MAX_OFFSET_PX,
  cityBankPreferenceVector,
  selectCityVisualOffset
} from "./cityVisualPlacement.js";
import {
  MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS,
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
  MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS,
  removeBlockedRiverEdgesFromMasks
} from "./manualRiverHexChains.js";
import {
  applyManualTerrainOverrides,
  assertManualShallowWaterReachesOcean
} from "./manualTerrainOverrides.js";
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
  weatherClockAtLocalTime,
  weatherClockParts,
  windAtLatLonDeg
} from "./weather.js";
import {
  DEFAULT_PLAYER_SHIP_SLUG,
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_SAIL,
  SHIP_STATS,
  SHIP_STATS_BY_SLUG,
  shipLabelForSlug,
  shipStatsForSlug
} from "./shipStats.js";
import {
  SHIP_SHADOW_FRAME_SIZE,
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADING_SUFFIX,
  SHIP_SPRITE_HEADINGS,
  SHIP_SPRITE_SHEET_COLS
} from "./shipSpriteLayout.js";
import { SHIP_ROWING_FRAME_COUNT } from "./shipRowingAnimation.js";
import {
  SHIP_MINIMUM_POWERED_SPEED_RAD,
  sailingEfficiencyForAlignment,
  shipDragFactor,
  shipHasWindDeadZone,
  shipPropulsionPerformance
} from "./shipPropulsion.js";
import {
  assignNpcShipCaptains,
  assignPortCityCharacterFromSource,
  assignPortCityCharacters,
  CHARACTER_PORTRAIT_ASSET_VERSION,
  characterExpression,
  generateCampaignContactCharacter,
  generatePassengerCharacter,
  generateSpecialPortCharacter,
  loadCharacterPortraitManifest
} from "./characterPortraits.js";
import {
  generatePlayerStartingProfile,
  resolvePlayerCharacterIdentityKey
} from "./playerCharacter.js";
import { SeamlessMusicPlayer } from "./musicPlayer.js";
import {
  FISH_CARGO_GOOD_ID,
  SHIP_ITEM_FISHING_NET,
  SURVIVAL_DEHYDRATION_INTERVAL_MINUTES,
  SURVIVAL_STARVATION_INTERVAL_MINUTES,
  activeFactionSafePassageIds,
  grantEnvoySafePassage,
  advanceGameDiplomacy,
  advanceActivePlayTime,
  applySurvivalDeprivation,
  attemptPortDisguise,
  awardPlayerShip,
  cargoFree,
  cargoUsed,
  consumePendingDiscoveryPortDialogue,
  createGameState,
  discoveredEntries,
  diplomacyBetweenForState,
  factionReputation,
  factionSafePassageRefusalStatus,
  factionSafePassageToll,
  hasShipItem,
  hasPrivateeringAuthorityAgainst,
  hasDiscovery,
  initializeProvisionalShipLoadout,
  mingTradeOpenToFaction,
  isEnvoyQuest,
  loseCrew,
  migrateGameState,
  playerCannonEquipment,
  playerFishingNet,
  playerShipIsWarship,
  pirateHideoutsVisibleToPlayer,
  portEntryStatus,
  refillFreshWaterFromShore,
  receiveDiscoveryCargo,
  receiveEmergencyShipAid,
  receiveFishCatch,
  receivePortConquestPrize,
  receiveSurrenderedLoot,
  reconcileQuestPortTiles,
  recordAttackAgainstFaction,
  recordDiscovery,
  recordPiracyAgainstFaction,
  refuseFactionSafePassage,
  restockSelectedShipLoadoutAtPort,
  rollCrewCasualtiesForDamage,
  purchasePlayerShip,
  purchaseFactionSafePassage,
  setPlayerShipStats,
  shipEmergencyAidNeed,
  settleCampaignGoalAtHome,
  stowForagedFood,
  survivalStatus,
  updateCartographyMemory,
  updateCircumnavigationProgress,
  updateSurvival,
  visitPort
} from "./gameState.js";
import {
  CAMPAIGN_DESTINATION_DISCOVERY,
  CAMPAIGN_DESTINATION_HOME,
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  campaignGoalDestination,
  campaignDialogueCharacter,
  campaignDialogueView,
  campaignGoalIntroSteps,
  campaignGoalLabel,
  campaignHomecomingSteps,
  campaignVictorySummary,
  createCampaignDialogueSession,
  explorerWonderCatalog,
  isExplorerLeadAssignable,
  markCampaignGoalIntroSeen,
  selectCampaignDialogueOption
} from "./campaignGoals.js";
import {
  CHEAT_COMMAND_DISCOVER_ALL,
  CHEAT_COMMAND_MILLION_DOUBLOONS,
  createCheatCodeInputState,
  grantAllDiscoveriesForCheat,
  grantMillionDoubloonsForCheat,
  processCheatCodeKey
} from "./cheatCodes.js";
import {
  diplomacyEventNotice,
  diplomacyPairKey,
  recordDiplomaticPortCall,
  validateWorldDiplomacy
} from "./worldDiplomacy.js";
import {
  fishingNetById,
  npcFishingNetExpectedHaul
} from "./fishingNets.js";
import { buildPlayerPirateHideoutPorts } from "./piratePorts.js";
import {
  buildMountainLandmarks,
  loadNamedMountains
} from "./mountainLandmarks.js";
import {
  CIRCUMNAVIGATION_DISCOVERY,
  EL_DORADO_DISCOVERY_ID,
  WORLD_DISCOVERY_SPRITE_KEYS,
  buildWorldDiscoveries,
  captainDialogueForDiscovery,
  isDiscoveryNovelToCharacter,
  mountainDiscovery,
  restrictMountainsToNavigableView
} from "./discoveries.js";
import { validateExplorerReportDialogueCatalog } from "./explorerDiscoveryDialogue.js";
import {
  createPassengerDialogueSession,
  createPortArrivalDialogueSession,
  createPortDialogueSession,
  deliveryMissionShouldOpenOnArrival,
  createShoreBatteryDialogueSession,
  createShipDialogueSession,
  passengerDialogueView,
  portDialogueView,
  prepareSurrenderPrizeDialogue,
  selectPassengerDialogueOption,
  selectPortDialogueOption,
  selectShoreBatteryDialogueOption,
  selectShipDialogueOption,
  shoreBatteryDialogueView,
  shipDialogueView
} from "./dialogueSystem.js";
import {
  NPC_ROLE_FISHERMAN,
  NPC_ROLE_MERCHANT,
  NPC_ROLE_PIRATE,
  NPC_ROLE_WARSHIP,
  NPC_SHIP_SLUGS,
  addNpcSeaRoutePort,
  applyNpcConquestOwnership,
  captureSurrenderedNpcShip,
  configureCaptureEncounter,
  createNpcSeaRouteSystem,
  damageNpcShip,
  npcCargoAvailableQuantity,
  npcPortHasMajorProtection,
  npcRoleLabel,
  npcSeaRouteHasPort,
  npcShipSnapshots,
  releaseNpcShipVisualNavigation,
  restoreNpcSeaRouteSystem,
  setNpcShipVisualNavigation,
  sinkNpcShip,
  snapshotNpcSeaRouteSystem,
  storeNpcCargo,
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
import { advanceRowingCadence, createRowingCadenceState } from "./rowingCadence.js";
import {
  EARLY_SAILING_HELP_WINDOW_SECONDS,
  createSailingTutorialState,
  earlySailingHelpWindowIsActive,
  sailingHelpPages,
  sailingTutorialTerrainKind,
  updateEarlySailingHelpState,
  updateSailingTutorialState
} from "./sailingTutorial.js";
import {
  RIVER_GATEWAY_SEARCH_RADIUS_PX,
  advanceRiverCenterline,
  blendRiverNavigationDirections,
  chooseRiverChannelDirection,
  findRiverGatewayDirection,
  heldShipHaulStrength,
  selectRiverRailPath,
  shipHaulMotionScale,
  steerAlongRiverCenterline
} from "./riverNavigation.js";
import {
  chooseNpcEscapeDirection,
  chooseNpcObstacleAvoidanceDirection,
  chooseNpcSailingDirection
} from "./npcVisualNavigation.js";
import { compareShipDrawCalls } from "./shipDrawOrder.js";
import {
  SHIP_MINIMUM_RUDDER_AUTHORITY,
  contactPushOffVelocity,
  shipTurnRate,
  updateBoundaryContactLatch
} from "./shipTurning.js";
import {
  SHIP_SINK_EFFECT_DURATION_MS,
  createShipSinkEffect,
  shipSinkDepthByte,
  shipSinkEffectComplete,
  shipSinkFrame
} from "./shipSinking.js";
import {
  SHIP_REFRACTION_BAND_HEIGHT,
  SHIP_SUBMERGED_ALPHA,
  floatingShipSubmergedPixelKeys,
  liveShipRefractionOffset,
  shipMaxRasterWaterlineDepth
} from "./shipWaterline.js";
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
  STORM_PASSAGE_CLEARED,
  createStormPassageState,
  fillStormEdgeFogPixels,
  markStormClearanceDelivered,
  markStormWarningDelivered,
  stormFogStrength,
  updateStormPassage
} from "./stormPresentation.js";
import {
  STORM_SHIP_STRIKE_FLASH_FRAME,
  STORM_SHIP_STRIKE_FRAME_COUNT,
  STORM_SHIP_STRIKE_FRAME_HEIGHT,
  STORM_SHIP_STRIKE_FRAME_WIDTH,
  STORM_SHIP_STRIKE_SHEET_COLUMNS,
  consumeStormShipStrikeFlash,
  consumeStormLightningFlash,
  createStormShipStrikeState,
  createStormLightningState,
  stormShipStrikeDrawOrigin,
  stormShipStrikeFrame,
  triggerStormShipStrike,
  updateStormShipStrike,
  updateStormLightning
} from "./stormLightning.js";
import {
  compareTerrainDrawCalls,
  terrainBaseSpriteKey,
  terrainConnectorNeedsSlopeDetail,
  TERRAIN_MOUNTAIN_LEVEL,
  terrainSpriteDrawLayer
} from "./terrainDrawOrder.js";
import { canvasDisplayLayout } from "./displayScaling.js";
import {
  hardenPixelTextAlpha,
  pixelTextOrigin,
  pixelTextRasterHeight,
  pixelTextScratchRasterLayout,
  snapPointToTransformedPixelGrid
} from "./pixelText.js";
import { buildPixelIconOutlinePixels } from "./pixelIconContrast.js";
import {
  globeWaterHexWaveFrame,
  localWaterHexWaveFrame,
  waterHexWaveBandsForFrame
} from "./waterHexWave.js";
import {
  BINARY_CONFIRM_NO_INDEX,
  BINARY_CONFIRM_YES_INDEX,
  clampMenuIndex,
  createBinaryConfirmationState,
  stepMenuIndex,
  toggleBinaryConfirmationIndex
} from "./menuNavigation.js";
import {
  GAME_ICON_ASSET_VERSION,
  GAME_ICON_SIZE,
  dialogueOptionIconId,
  gameIconAtlasDimensions,
  gameIconAtlasRect,
  gameIconDrawRect,
  gameIconIds,
  menuLabelIconId,
  startMenuIconId,
  tradeGoodIconId
} from "./gameIcons.js";
import { responsiveLogicalViewport } from "./responsiveViewport.js";
import {
  CAPTURE_MAX_SECONDS,
  CAPTURE_VIEWPORT,
  captureScenarioFromSearch
} from "./captureScenarios.js";
import { CaptureRecorder } from "./captureRecorder.js";
import { createCaptureControls } from "./captureControls.js";
import { isShareScreenshotKey, saveShareScreenshot } from "./screenshotExport.js";
import {
  dialogueOptionLayout,
  dialogueOptionNavigationLayout,
  dialogueOptionTextLayout,
  dialogueOptionWindow,
  dialoguePanelGeometry
} from "./dialoguePanelLayout.js";
import { controlTextLayout } from "./controlTextLayout.js";
import {
  INTERACTION_INPUT,
  interactionInputOwner
} from "./interactionInput.js";
import { fitMeasuredText, wrapMeasuredText } from "./measuredTextLayout.js";
import { gameOverStatsLayout } from "./gameOverLayout.js";
import { flagWaveColumnOffsets } from "./flagAnimation.js";
import {
  windVFlowDirectionForScreenVector,
  windVGeometry,
  windVOpacity
} from "./windIndicator.js";
import { loadImageWithRetry } from "./assetImageLoader.js";
import { DEFAULT_GAME_TIME_SCALE } from "./gamePacing.js";
import {
  COMBAT_MODE_ATTACK,
  COMBAT_MODE_FLEE,
  PLAYER_COMBAT_ID,
  createShipCombatState,
  engagementKey,
  forceShipEngagement,
  npcPrizeRecipientId,
  npcShouldOfferSurrender,
  playerNpcAttackGraceIsActive,
  playerCombatAllegiance,
  updateShipCombatState
} from "./shipCombat.js";
import {
  SHORE_BATTERY_RANGE_PX,
  armShoreBatteryReload,
  createShoreBatteryState,
  damageShoreBattery,
  shoreBatteryCanFire,
  shoreBatteryDisabledNotice,
  shoreBatteryId,
  shoreBatteryIsDisabled,
  shoreBatteryMayDemandToll,
  shoreBatteryPlayerResponse,
  shoreBatterySurrenderNotice,
  updateShoreBatteryState
} from "./shoreBatteries.js";
import { cityCrackSegments } from "./cityDamage.js";
import {
  FIRE_FRAME_COUNT,
  FIRE_FRAME_HEIGHT,
  FIRE_FRAME_MS,
  FIRE_FRAME_WIDTH,
  fireAnimationFrame,
  fireSoundPresence
} from "./fireEffects.js";
import {
  resolveShipCollision,
  separateTouchingShips
} from "./shipCollision.js";
import {
  pointInShipFootprint,
  shipFootprintPolygonCenter,
  shipFootprintFrame,
  translatedShipFootprint,
  validateShipFootprintBake
} from "./shipFootprint.js";
import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTION_CAPITALS_1522,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  diplomacyBetween,
  factionById,
  factionCapitalCityRecords1522,
  factionCapitalForCity,
  factionHasFlag,
  factionIdForCity1522,
  markFactionCapitalsOnPorts
} from "./factions.js";
import {
  PORT_CONQUEST_MIN_CREW,
  PORT_CONQUEST_NPC_LANDING_RANGE_PX,
  applyPortConquestOwnership,
  clearPlayerPortAssault,
  markPlayerPortAssault,
  npcPortConquestChance,
  portConquestPrize,
  playerPortAssaultIsActive,
  portConquestStatus,
  recordPortCapture,
  resolvePortConquest
} from "./portConquest.js";
import { recentRegionalRulerChange } from "./rulers.js";
import { recentHistoricalGossipForPort } from "./historicalGossip.js";
import {
  createPoliticsView,
  politicsRowsPage
} from "./politics.js";
import {
  addWorldEconomyPort,
  advanceWorldEconomy,
  createWorldEconomy,
  restoreWorldEconomy,
  snapshotWorldEconomy,
  tradeGoodById,
  worldEconomyHasPort
} from "./economy.js";
import {
  waterDepthIndexForSpriteKey,
  waterLatitudeBand,
  waterPaletteHexForSourceHex
} from "./waterLatitudePalette.js";
import { applyDayNightPaletteGrade } from "./dayNightPalette.js";
import {
  createShipComparisonView,
  createShipInfoView,
  createShipyardShipView,
  shipInfoCargoPage,
  shipLocalDateLabel,
  shipLedgerDateLabel,
  shipLedgerPage,
  shipPapersPage
} from "./shipInfo.js";
import { claimShipyardListing, shipyardAtPort, shipyardRumorForPort } from "./shipyards.js";
import { clearLocalSave, readLocalSave, writeLocalSave } from "./localSave.js";
import {
  appendVoyageRecord,
  grossDoubloonsEarned,
  readVoyageHistory,
  voyageHistorySummary
} from "./voyageHistory.js";
import {
  MANUAL_CITY_RECORDS_1522,
  cityPopulationObservationAtYear,
  cityRequiresPortAccess,
  selectCityCatalogRecords
} from "./cityCatalogSelection.js";
import { cityIsLandlocked } from "./cityPortAccess.js";
import { withColonialFounding } from "./colonialCities.js";
import {
  COLONIZATION_STAGE_ESTABLISHED,
  COLONIZATION_STAGE_FAILED,
  advanceColonizationQuest,
  assignColonizationTargetTile,
  colonizationObjective,
  colonizationTargetCoordinates,
  colonizationWorldRecord,
  isColonizationQuestOrigin,
  isColonizationQuestTarget
} from "./colonizationQuest.js";
import { formatCompactNumber } from "./compactNumber.js";
import {
  activeTravelMissionQuest,
  markPassengerOfferSeen,
  passengerQuestById,
  pendingPassengerOfferForCity,
  travelMissionOfferForCity
} from "./passengerMissions.js";
import {
  fishHabitatKind,
  fisheryForHabitat,
  harvestFishery
} from "./fishEcology.js";
import {
  FISHING_NET_FRAME_COUNT,
  FISHING_NET_FRAME_SIZE,
  canStartFishing,
  fishingActionPresentation,
  fishingAnimationState,
  fishingCatchChance,
  fishingCatchSucceeds,
  fishingSideForTarget
} from "./fishingAction.js";
import {
  compareTerrainConnectorDrawOrder,
  isCoastalWaterRow,
  isPermanentSeaIceRow,
  isShipUsableSurfaceWater,
  isWaterSurfaceRow,
  terrainRowsNeedBeach
} from "./terrainSurface.js";
import { terrainConnectorRasterSpans } from "./terrainConnectorRaster.js";
import { nearestWaterMaskedPoint, waterMaskedSpritePixels } from "./fishWaterMask.js";
import { shipCanRefillFreshWater } from "./freshWaterAccess.js";
import { gamepadControlFrame } from "./controllerInput.js";
import {
  broadsideArcGeometry,
  broadsideReloadGeometry,
  pointInBroadsideArc
} from "./broadsideControls.js";
import {
  navalArrowVolleyCount,
  navalWeaponFiresAtWill,
  NAVAL_WEAPON_ARROW,
  NAVAL_WEAPON_CANNON,
  navalWeaponForShip,
  navalWeaponUsesBroadside
} from "./navalWeapons.js";
import { firstNavalProjectileHit, navalProjectilePoint } from "./navalProjectile.js";
import { cannonWeaponWithEquipment } from "./cannonEquipment.js";
import {
  advanceCannonSmokeBursts,
  cannonSmokePixels,
  createCannonSmokeBurst
} from "./cannonSmoke.js";
import { cannonShotDistanceGain } from "./cannonAudio.js";
import {
  advanceHullSplinterBursts,
  createHullSplinterBurst,
  hullSplinterPixels
} from "./hullSplinters.js";
import {
  LAKE_BATTLE_PHASE_ACTIVE,
  LAKE_BATTLE_PLAYER_ID,
  LAKE_BATTLE_ENEMY_SLUGS,
  LAKE_BATTLE_SHIP_SLUGS,
  createLakeBattle,
  createLakeBattleArenaMap,
  drainLakeBattleEvents,
  fireLakeBattleBroadside,
  lakeBattleShipById,
  lakeBattleHeadingVector,
  lakeBattleCombatantIsCity,
  lakeBattleCombatantHitRadius,
  lakeBattleCombatantLabel,
  lakeBattleCombatantPoint,
  lakeBattleCombatantStats,
  lakeBattleProjectilePoint,
  lakeBattleWaterAt,
  lakeBattleWeaponRange,
  lakeBattleWindFlowDirection,
  resizeLakeBattle,
  updateLakeBattle
} from "./lakeBattle.js";
import { lakeBattleHudLayout } from "./lakeBattleHud.js";
import {
  VIKING_LONGSHIP_CHARACTER_SOURCE_ID,
  VIKING_LONGSHIP_PRICE,
  VIKING_LONGSHIP_REWARD_DECLINED,
  VIKING_LONGSHIP_REWARD_PENDING,
  VIKING_LONGSHIP_SLUG,
  acceptVikingLongshipReward,
  isVikingLongshipQuestPort,
  markVikingLongshipPurchased,
  vikingLongshipRewardDisposition,
  vikingLongshipUnlocked
} from "./vikingLongshipQuest.js";
import {
  SHORE_SCAVENGE_CASUALTY,
  SHORE_SCAVENGE_FOOD,
  SHORE_SCAVENGE_NOTHING,
  SHORE_SCAVENGE_WATER,
  foragedFoodQuantity,
  rollShoreScavenge,
  shoreScavengeContextForTerrain,
  shoreScavengeNoticeLabel,
  shoreScavengeNarrative
} from "./shoreScavenge.js";

const BASE_SCREEN_W = 455;
const BASE_SCREEN_H = 256;
let SCREEN_W = BASE_SCREEN_W;
let SCREEN_H = BASE_SCREEN_H;
const SUBDIVISIONS = 7;
const SALTWATER_PASSAGE_TILE_IDS = MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS[SUBDIVISIONS] || [];
const PIXELS_PER_RADIAN = 2450;
const TILE_RADIUS_PX = 10;
const TILE_ART_SIZE = 36;
const TILE_ART_HALF = TILE_ART_SIZE / 2;
const FACE_HALF_WIDTH = 9;
const COAST_FACE_ENDPOINT_OVERLAP_PX = 2;
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
const SHIP_SHEET_FRAME_SIZE = SHIP_SPRITE_FRAME_SIZE;
const SHIP_SHEET_COLS = SHIP_SPRITE_SHEET_COLS;
const SHIP_HEADING_COUNT = SHIP_SPRITE_HEADINGS;
const SHIP_LIGHT_AZIMUTH_BINS = 16;
const SHIP_LIGHT_ELEVATION_BINS = 2;
const SHIP_LIGHT_BIN_COUNT = SHIP_LIGHT_AZIMUTH_BINS * SHIP_LIGHT_ELEVATION_BINS;
const SHIP_LIGHT_HIGH_ALTITUDE = 0.5;
const SHIP_LIGHT_HIGHLIGHT_ALPHA = 0.3;
const SHIP_LIGHT_SHADE_ALPHA = 0.28;
const SHIP_LIGHT_SHADOW_ALPHA = 0.22;
const SHIP_SHADOW_HALF = SHIP_SHADOW_FRAME_SIZE / 2;
const SHIP_MIN_SLIDE_SPEED_RAD = 0.0015;
const SHIP_COLLISION_SLIDE_SPEED_KEEP = 0.96;
const SHIP_COLLISION_MIN_TANGENT_RATIO = 0.05;
const SHIP_COLLISION_SLIDE_SEARCH_MIN_ALIGN = -0.08;
const SHIP_COLLISION_SLIDE_SEARCH_SIDE_KEEP = 0.9;
const SHIP_STOP_DAMPING = 0.15;
const SHIP_COLLISION_RADIUS_PX = 5;
const SHIP_RIVER_COLLISION_RADIUS_PX = 0.85;
const SHIP_COLLISION_PUSH_OFF_MAX_PX = 4;
const SHIP_COLLISION_PUSH_OFF_SPEED_KEEP = 0.72;
const SHIP_RIVER_CHANNEL_TOLERANCE_PX = 0.75;
const SHIP_RIVER_TURN_RATE_MULTIPLIER = 2.4;
const SHIP_BOUNDARY_CONTACT_PROBE_PX = 1;
const SHIP_BOUNDARY_CONTACT_RELEASE_PX = 6;
const SHIP_CONTACT_ESCAPE_SPEED_RAD = 0.0015;
const SHIP_RIVER_HAUL_ACCEL_RAD = 0.009;
const SHIP_RIVER_HAUL_MAX_SPEED_RAD = 0.0085;
const SHIP_HAUL_RECOVERY_AFTER_SECONDS = 0.3;
const SHIP_HAUL_RECOVERY_MAX_RADIUS_PX = 8;
const SHIP_HAUL_RECOVERY_SPEED_RAD = 0.0045;
const SHIP_COLLISION_SAMPLE_STEP_PX = 2;
const SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX = 48;
const SHIP_RIVER_HEADING_ALIGN_DOT = Math.cos(Math.PI / 3);
const SHIP_RIVER_TARGET_ALIGN_DOT = Math.cos(80 * Math.PI / 180);
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
const NPC_RIVER_RAIL_MIN_SPEED_PX = 10;
const NPC_RIVER_RAIL_CENTERING_SPEED_PX = 18;
const NPC_VISUAL_ESCAPE_PROBE_DISTANCES_PX = [6, 12, 24, 36, 54];
const NPC_VISUAL_UPDATE_INTERVAL_SECONDS = 1 / 30;
const NPC_COMBAT_RESPONSE_SPEED_PX = 8;
const NPC_COMBAT_NAV_TARGET_PX = 110;
const NPC_MAJOR_PORT_AVOID_RADIUS_PX = 132;
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
const NAVAL_MAX_PROJECTILES = 160;
const CANNON_MAX_SPLASHES = 128;
const CANNON_MAX_SMOKE_BURSTS = 192;
const CANNON_SMOKE_COLORS = Object.freeze(["92, 84, 76", "199, 204, 195", "255, 253, 231"]);
const HULL_SPLINTER_MAX_BURSTS = 128;
const HULL_SPLINTER_COLORS = Object.freeze(["84, 51, 30", "139, 82, 41", "218, 145, 62"]);
const ARROW_LINE_LENGTH_PX = 4;
const WIND_INDICATOR_RADIUS_PX = 20;
const WIND_INDICATOR_DIRECTION_COUNT = 16;
const WIND_INDICATOR_DIRECTION_STABLE_FRAMES = 3;
const WIND_INDICATOR_TURN_RATE_RAD = Math.PI * 1.35;
const WIND_INDICATOR_STRENGTH_LERP_PER_SECOND = 2.4;
const WIND_INDICATOR_WARNING_LERP_PER_SECOND = 8;
const WIND_INDICATOR_STALL_PULSE_MS = 900;
const RIVER_HIGHLIGHT_FRAME_MS = 2000;
const WATER_REDRAW_MS = 250;
const WATER_DEPTH_GRADATION_COUNT = 4;
const WEATHER_REDRAW_MS = 250;
const PRECIP_PARTICLE_REDRAW_MS = 80;
const RAIN_PARTICLE_LIMIT = 340;
const SNOW_PARTICLE_LIMIT = 240;
const RAIN_PARTICLES_PER_TILE = 3;
const SNOW_PARTICLES_PER_TILE = 2;
const PRECIP_PARTICLE_VIEW_MARGIN = 30;
const WEATHER_DEFAULT_TIME_SCALE = DEFAULT_GAME_TIME_SCALE;
const WEATHER_WIND_SEED = 90210;
const STORM_SCREEN_RAIN_ENTER_INTENSITY = STORM_ACTIVE_INTENSITY * 0.62;
const STORM_SCREEN_RAIN_MAX_STREAKS = 180;
const STORM_SCREEN_RAIN_TRAVEL_PX = 620;
const STORM_SCREEN_RAIN_MARGIN_PX = 44;
const STORM_FOG_ENTER_INTENSITY = STORM_ACTIVE_INTENSITY * 0.45;
const STORM_FOG_FULL_INTENSITY = 0.6;
const STORM_FOG_BREATHE_PERIOD_MS = 7200;
const STORM_SHIP_BOB_ENTER_INTENSITY = STORM_ACTIVE_INTENSITY * 0.52;
const STORM_SHIP_BOB_MAX_X_PX = 1;
const STORM_SHIP_BOB_MAX_Y_PX = 3;
const STORM_CAPTAIN_ALERT_ENTER_INTENSITY = STORM_ACTIVE_INTENSITY;
const STORM_CAPTAIN_ALERT_EXIT_INTENSITY = STORM_ACTIVE_INTENSITY * 0.58;
const STORM_CAPTAIN_CLEARANCE_DELAY_MS = 10000;
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
const WORLD_DISCOVERY_ASSET_VERSION = "world-wonders-2";
const VEHICLE_ASSET_VERSION = "ship-orientation-3";
const SHIP_WAKE_ANCHORS_URL = `/assets/vehicles/unity-ships/wake-anchors.json?v=${VEHICLE_ASSET_VERSION}`;
const SHIP_HULL_FOOTPRINTS_URL = `/assets/vehicles/unity-ships/hull-footprints.json?v=${VEHICLE_ASSET_VERSION}`;
const ROWING_SHIP_ANIMATION_SPECS = new Map([
  ["mediterranean-galley", Object.freeze({ frames: SHIP_ROWING_FRAME_COUNT, frameMs: 125, volume: 0.14, playbackRate: 0.88 })],
  ["joseon-turtle-ship", Object.freeze({ frames: SHIP_ROWING_FRAME_COUNT, frameMs: 123, volume: 0.14, playbackRate: 0.92 })],
  ["joseon-panokseon", Object.freeze({ frames: SHIP_ROWING_FRAME_COUNT, frameMs: 125, volume: 0.14, playbackRate: 0.90 })],
  ["japanese-atakebune", Object.freeze({ frames: SHIP_ROWING_FRAME_COUNT, frameMs: 137, volume: 0.14, playbackRate: 0.84 })],
  ["viking-longship", Object.freeze({ frames: SHIP_ROWING_FRAME_COUNT, frameMs: 117, volume: 0.14, playbackRate: 0.96 })],
  ["mesoamerican-dugout-canoe", Object.freeze({ frames: SHIP_ROWING_FRAME_COUNT, frameMs: 110, volume: 0.11, playbackRate: 1.08 })]
]);
const CITY_ASSET_VERSION = "city-types-2";
const FIRE_EFFECT_ASSET_VERSION = "fire-effect-1";
const FIRE_EFFECT_URL = "/assets/misc/fire.png";
const COLONY_DEPARTURE_DISTANCE_PX = 90;
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
const CITY_MAX_COUNT = 480;
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
  "polynesian",
  "mesoamerican",
  "andean",
  "sub-saharan"
]);
const CITY_TYPE_KEY_SET = new Set(CITY_TYPE_KEYS);
const CITY_TYPE_ART_KEYS = Object.freeze({
  polynesian: "village"
});
const CITY_IMAGE_KEYS = Object.freeze([...CITY_TYPE_KEYS, "village"]);
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
  "Malaysia",
  "Myanmar",
  "Thailand",
  "Vietnam"
]);
const CITY_TYPE_POLYNESIAN_COUNTRIES = new Set([
  "Aotearoa",
  "Cook Islands",
  "Fiji",
  "French Polynesia",
  "Hawaii",
  "Kiribati",
  "Niue",
  "Rapa Nui",
  "Samoa",
  "Tonga"
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
  "Iceland",
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
  "Oman",
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
  "Kenya",
  "Mali",
  "Mozambique",
  "Nigeria",
  "Senegal",
  "Somalia",
  "Tanzania",
  "Zimbabwe"
]);
const CITY_SPRITE_W = TILE_ART_SIZE;
const CITY_SPRITE_H = TILE_ART_SIZE;
const CITY_SHADOW_SOURCE_Y = Math.floor(CITY_SPRITE_H / 2);
const CITY_SHADOW_SOURCE_H = CITY_SPRITE_H - CITY_SHADOW_SOURCE_Y;
const CITY_SHADOW_WIDTH_SCALE = 0.82;
const CITY_SHADOW_MIN_STRETCH = 0.6;
const CITY_SHADOW_MAX_STRETCH = 2.5;
const CITY_SHADOW_ALPHA = 0.22;
const CITY_LABEL_H = 8;
const CITY_LABEL_PAD_X = 2;
const CITY_LABEL_PAD_Y = 1;
const CITY_LABEL_GAP_PX = 2;
const PORT_INTERACTION_RADIUS_PX = 34;
const PORT_DIALOGUE_TRAFFIC_RADIUS_PX = 120;
const FISH_INTERACTION_RADIUS_PX = 22;
const PORT_CITY_CLICK_PAD_PX = 3;
const INTERACTION_BUTTON_W = 156;
const INTERACTION_BUTTON_H = 28;
let INTERACTION_BUTTON_X = Math.floor((SCREEN_W - INTERACTION_BUTTON_W) / 2);
let INTERACTION_BUTTON_Y = SCREEN_H - INTERACTION_BUTTON_H - 5;
const ANCHOR_BUTTON_W = 88;
const ANCHOR_BUTTON_H = INTERACTION_BUTTON_H;
let ANCHOR_BUTTON_X = Math.floor((SCREEN_W - ANCHOR_BUTTON_W - 4 - INTERACTION_BUTTON_W) / 2);
let ANCHOR_BUTTON_Y = INTERACTION_BUTTON_Y;
const ANCHOR_SHORE_MAX_PX = 36;
const SCAVENGE_BUTTON_W = 96;
const SCAVENGE_ACTION_MS = 3000;
const PORT_WAIT_BUTTON_W = 176;
const QUEST_ARROW_EDGE_MARGIN_PX = 15;
const QUEST_ARROW_CITY_Y_OFFSET = -18;
const QUEST_ARROW_SIZE_PX = 7;
const MOUNTAIN_DISCOVERY_RADIUS_PX = 120;
const MOUNTAIN_DISCOVERY_NOTICE_MS = 4600;
const MOUNTAIN_DISCOVERY_PANEL_W = 230;
const MOUNTAIN_DISCOVERY_PANEL_H = 24;
let MOUNTAIN_DISCOVERY_PANEL_X = Math.floor((SCREEN_W - MOUNTAIN_DISCOVERY_PANEL_W) / 2);
const MOUNTAIN_DISCOVERY_PANEL_Y = 5;
const SURVIVAL_PANEL_X = 5;
const SURVIVAL_PANEL_Y = 5;
const SURVIVAL_PANEL_W = 120;
const SURVIVAL_PANEL_H = 44;
const SURVIVAL_BAR_W = 46;
const SURVIVAL_BAR_H = 4;
const SURVIVAL_NOTICE_MS = 2400;
const SURVIVAL_DEHYDRATION_CREW_LOSS = 1;
const SURVIVAL_STARVATION_CREW_LOSS = 1;
const DISCOVERIES_BUTTON_SIZE = 24;
let DISCOVERIES_PANEL_W = 300;
let DISCOVERIES_PANEL_H = 214;
const SHIP_INFO_BUTTON_SIZE = 24;
const POLITICS_BUTTON_SIZE = 24;
const SHIP_INFO_PANEL_X = 10;
const SHIP_INFO_PANEL_Y = 8;
let SHIP_INFO_PANEL_W = SCREEN_W - SHIP_INFO_PANEL_X * 2;
let SHIP_INFO_PANEL_H = SCREEN_H - SHIP_INFO_PANEL_Y * 2;
const POLITICS_PANEL_X = 8;
const POLITICS_PANEL_Y = 8;
let POLITICS_PANEL_W = SCREEN_W - POLITICS_PANEL_X * 2;
let POLITICS_PANEL_H = SCREEN_H - POLITICS_PANEL_Y * 2;
const POLITICS_ROWS_PER_PAGE = 18;
const POLITICS_MATRIX_CELL_W = 7;
const POLITICS_MATRIX_ROW_H = 11;
const SHIP_INFO_SIDE_VIEW_W = 192;
const SHIP_INFO_SIDE_VIEW_H = 104;
const DIALOGUE_PORTRAIT_SIZE = 64;
const DIALOGUE_OPTION_H = 24;
let PLAYER_INTRO_PANEL_W = 326;
let PLAYER_INTRO_PANEL_H = 194;
let PLAYER_INTRO_PANEL_X = Math.floor((SCREEN_W - PLAYER_INTRO_PANEL_W) / 2);
let PLAYER_INTRO_PANEL_Y = Math.floor((SCREEN_H - PLAYER_INTRO_PANEL_H) / 2);
const PLAYER_INTRO_BUTTON_W = 150;
const PLAYER_INTRO_BUTTON_H = 28;
let CAPTAIN_ALERT_PANEL_W = 286;
const CAPTAIN_ALERT_PANEL_H = 110;
let CAPTAIN_ALERT_PANEL_X = Math.floor((SCREEN_W - CAPTAIN_ALERT_PANEL_W) / 2);
let CAPTAIN_ALERT_PANEL_Y = Math.floor((SCREEN_H - CAPTAIN_ALERT_PANEL_H) / 2);
const CAPTAIN_ALERT_BUTTON_W = 104;
const CAPTAIN_ALERT_BUTTON_H = 28;
const SAILING_HELP_PANEL_MAX_W = 344;
const SAILING_HELP_PANEL_MAX_H = 238;
const SAILING_HELP_BUTTON_W = 150;
const SAILING_HELP_BUTTON_H = 30;
let START_MENU_PANEL_W = 244;
const START_MENU_PANEL_H = 232;
let START_MENU_PANEL_X = Math.floor((SCREEN_W - START_MENU_PANEL_W) / 2);
let START_MENU_PANEL_Y = Math.floor((SCREEN_H - START_MENU_PANEL_H) / 2);
const START_MENU_BUTTON_W = 166;
const START_MENU_BUTTON_H = 30;
const START_MENU_BUTTON_GAP = 8;
const START_MENU_ACTION_CONTINUE = "continue";
const START_MENU_ACTION_NEW_GAME = "new-game";
const START_MENU_ACTION_LAKE_BATTLE = "lake-battle";
const START_MENU_ACTION_PAST_VOYAGES = "past-voyages";
const START_MENU_ACTION_OPTIONS = "options";
const START_MENU_ACTION_CREDITS = "credits";
const LAKE_BATTLE_SCREEN_SETUP = "setup";
const LAKE_BATTLE_SCREEN_ACTIVE = "active";
const LAKE_BATTLE_SCREEN_PAUSED = "paused";
const LAKE_BATTLE_SCREEN_SINKING = "sinking";
const LAKE_BATTLE_SCREEN_RESULT = "result";
const LAKE_BATTLE_SETUP_PLAYER_ROW = 0;
const LAKE_BATTLE_SETUP_ENEMY_ROW = 1;
const LAKE_BATTLE_SETUP_BEGIN_ROW = 2;
const LAKE_BATTLE_SETUP_BACK_ROW = 3;
const LAKE_BATTLE_SETUP_ROW_COUNT = 4;
const LAKE_BATTLE_PAUSE_ACTIONS = Object.freeze(["RESUME", "RESTART", "CHOOSE SHIPS", "OPTIONS", "START MENU"]);
const LAKE_BATTLE_RESULT_ACTIONS = Object.freeze(["REMATCH", "CHOOSE SHIPS", "START MENU"]);
const AUTOSAVE_INTERVAL_MS = 30000;
const CREDITS_MARKDOWN_URL = "/assets/CREDITS.md";
let CREDITS_PANEL_W = 338;
let CREDITS_PANEL_H = 218;
let CREDITS_PANEL_X = Math.floor((SCREEN_W - CREDITS_PANEL_W) / 2);
let CREDITS_PANEL_Y = Math.floor((SCREEN_H - CREDITS_PANEL_H) / 2);
const CREDITS_LINES_PER_PAGE = 16;
let PAST_VOYAGES_PANEL_W = 338;
let PAST_VOYAGES_PANEL_H = 238;
let PAST_VOYAGES_PANEL_X = Math.floor((SCREEN_W - PAST_VOYAGES_PANEL_W) / 2);
let PAST_VOYAGES_PANEL_Y = Math.floor((SCREEN_H - PAST_VOYAGES_PANEL_H) / 2);
const GAME_OVER_MEMORIAL_MS = 8500;
const GAME_OVER_FADE_MS = 1800;
let GAME_OVER_PANEL_W = 350;
const GAME_OVER_PANEL_H = 178;
let GAME_OVER_PANEL_X = Math.floor((SCREEN_W - GAME_OVER_PANEL_W) / 2);
let GAME_OVER_PANEL_Y = Math.floor((SCREEN_H - GAME_OVER_PANEL_H) / 2);
const POINTER_STEERING_DEADZONE_PX = 6;
const POINTER_TAP_ACTION_MAX_MS = 220;
const POINTER_TAP_ACTION_MAX_TRAVEL_PX = 5;
const PIXEL_FONT_SMALL_8 = "8px \"Silkscreen\", monospace";
const PIXEL_FONT_DIALOGUE_8 = "8px \"Dogica\", monospace";
const PIXEL_TEXT_RASTER_CACHE_LIMIT = 2048;
const PIRATE_MENU_PAPER = "#ead8b2";
const PIRATE_MENU_PAPER_BUTTON = "#d6bd8f";
const PIRATE_MENU_PAPER_SELECTED = "#fbb954";
const PIRATE_MENU_INK = "#2f241c";
const PIRATE_MENU_INK_MUTED = "#715033";
const PIRATE_MENU_CHART_LINE = "#547e64";
const PIRATE_MENU_PAPER_INSET = "#d6bd8f";
const PIRATE_MENU_PAPER_INSET_ALT = "#c9aa78";
const PIRATE_MENU_DANGER = "#9e3e36";
const PIRATE_MENU_SUCCESS = "#547e64";
const LOCAL_LAYOUT_CULL_MARGIN = 520;
const MINIMAP_W = 80;
const MINIMAP_H = 26;
const MINIMAP_CENTER_X = Math.floor(MINIMAP_W / 2);
const MINIMAP_MAX_LAT_DEG = 72;
const MINIMAP_MAX_MERCATOR = mercatorYForLatDeg(MINIMAP_MAX_LAT_DEG);
let MINIMAP_X = SCREEN_W - MINIMAP_W - 5;
let MINIMAP_Y = SCREEN_H - MINIMAP_H - 5;
const MINIMAP_TILE_OUT_OF_RANGE = 0xffff;
const MINIMAP_UNKNOWN_COLOR = [74, 66, 55];
const MINIMAP_WATER_COLOR = [184, 151, 95];
const MINIMAP_LAND_COLOR = [92, 59, 31];
const MINIMAP_PARTIAL_LAND_FLOOR = 0.18;
const MINIMAP_PARTIAL_LAND_GAMMA = 0.62;
const MINIMAP_PARTIAL_DITHER = 0.08;
const OPTIONS_BUTTON_SIZE = 27;
let OPTIONS_BUTTON_X = SCREEN_W - OPTIONS_BUTTON_SIZE - 5;
const OPTIONS_BUTTON_Y = 5;
let DISCOVERIES_BUTTON_X = OPTIONS_BUTTON_X - DISCOVERIES_BUTTON_SIZE - 3;
const DISCOVERIES_BUTTON_Y = OPTIONS_BUTTON_Y;
let SHIP_INFO_BUTTON_X = DISCOVERIES_BUTTON_X - SHIP_INFO_BUTTON_SIZE - 3;
const SHIP_INFO_BUTTON_Y = OPTIONS_BUTTON_Y;
let POLITICS_BUTTON_X = SHIP_INFO_BUTTON_X - POLITICS_BUTTON_SIZE - 3;
const POLITICS_BUTTON_Y = OPTIONS_BUTTON_Y;
const OPTIONS_PANEL_W = 196;
const OPTIONS_PANEL_H = 228;
const OPTIONS_ROW_H = 34;
const OPTIONS_ROW_COUNT = 5;
const OPTIONS_ROW_FULLSCREEN = 0;
const OPTIONS_ROW_MUSIC = 1;
const OPTIONS_ROW_SFX = 2;
const OPTIONS_ROW_MUTE = 3;
const OPTIONS_ROW_START_MENU = 4;
const UI_ICON_BUTTON_SIZE = 24;
const UI_PAGER_BUTTON_W = 30;
const UI_PAGER_BUTTON_H = 24;
const UI_TAB_H = 24;
const SHIP_INFO_DESKTOP_SUMMARY_Y = 36;
const SHIP_INFO_DESKTOP_HEADER_Y = 52;
const SHIP_INFO_DESKTOP_FIRST_ROW_Y = 66;
const SHIP_INFO_PAPER_ROW_H = 21;
const CAPTAIN_MENU_LABELS = Object.freeze([
  "SHIP & LEDGER",
  "POLITICS",
  "DISCOVERIES",
  "OPTIONS"
]);
const CAPTAIN_MENU_ICON_IDS = Object.freeze([
  "menu:ship",
  "menu:politics",
  "menu:discoveries",
  "menu:options"
]);
const CAPTAIN_MENU_PANEL_W = 224;
const CAPTAIN_MENU_PANEL_H = 226;
const SHIP_INFO_ASSET_VERSION = "native-boats-1";
const MUSIC_ASSET_VERSION = "storm-theme-1";
const SFX_ASSET_VERSION = "fire-crackle-1";
const ANIMAL_ASSET_VERSION = "fishing-net-2";
const STORM_SHIP_STRIKE_ASSET_VERSION = "infected-tribe-1";
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
  gameVictory: {
    intro: "/assets/music/game-victory-intro.ogg",
    loop: "/assets/music/game-victory-loop.ogg"
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
  polynesian: "cityTropical",
  mesoamerican: "cityTropical",
  andean: "cityAndean",
  "sub-saharan": "cityTropical"
});
const COMBAT_MUSIC_HOLD_MS = 18000;
const COMBAT_BIG_BROADSIDE_MIN_CANNONS = 10;
const COMBAT_NOTICE_MS = 4200;
const SFX_CANNON_URL = "/assets/sfx/universfield-cannon-shot-352459.ogg";
const SFX_BOW_FIRE_URL = "/assets/sfx/bow-fire.ogg";
const SFX_ARROW_HIT_URL = "/assets/sfx/arrow-hit.ogg";
const SFX_HARBOUR_URL = "/assets/sfx/freesound_community-harboursoundsanno1811-24015.ogg";
const SFX_IMPACT_URL = "/assets/sfx/dragon-studio-boulder-impact-487673.ogg";
const SFX_SEAGULLS_URL = "/assets/sfx/dragon-studio-seagull-calls-339723.ogg";
const SFX_SHORE_GULLS_URL = "/assets/sfx/freesound_community-sea-and-seagull-wave-5932.ogg";
const SFX_HARSH_WIND_URL = "/assets/sfx/dragon-studio-harsh-wind-515272.ogg";
const SFX_WINTER_WIND_URL = "/assets/sfx/dragon-studio-winter-wind-402331.ogg";
const SFX_DESERT_WIND_URL = "/assets/sfx/tanweraman-desert-wind-1-350398.ogg";
const SFX_STORM_URL = "/assets/sfx/u_7hpxkdroz2-storm-461601.mp3";
const SFX_LIGHTNING_URL = "/assets/sfx/freesound_community-lightning-strike-29683.ogg";
const STORM_SHIP_STRIKE_URL = "/assets/misc/lightning.png";
const SFX_SAIL_FLAP_URL = "/assets/sfx/freesound_community-flag-6367.ogg";
const SFX_UNDERWAY_URL = "/assets/sfx/freesound_community-sailboat-underway-48728.ogg";
const SFX_SAIL_DEPLOY_URL = "/assets/sfx/freesound_community-saildeploy-99393.ogg";
const SFX_DISCOVERY_SUCCESS_URL = "/assets/sfx/freesound_community-short-success-sound-glockenspiel-treasure-video-game-6346.mp3";
const SFX_COIN_CLINK_URL = "/assets/sfx/floraphonic-coin-and-money-bag-3-185264.mp3";
const SFX_FISHING_URL = "/assets/sfx/alex_jauk-water-splash-147014.mp3";
const SFX_FISHING_SUCCESS_URL = "/assets/sfx/freesound_community-item-pickup-37089.ogg";
const SFX_FISHING_FAILURE_URL = "/assets/sfx/dominik-braun-failure-sound.mp3";
const SFX_SCAVENGE_SUCCESS_URL = "/assets/sfx/freesound_community-item-pickup-37089.ogg";
const SFX_SCAVENGE_FAILURE_URL = "/assets/sfx/dominik-braun-failure-sound.mp3";
const SFX_FIRE_URL = "/assets/sfx/three-kingdoms-stratagem-fire-crackle-loop.ogg";
const SFX_CANNON_POOL_SIZE = 8;
const SFX_BOW_FIRE_POOL_SIZE = 6;
const SFX_ARROW_HIT_POOL_SIZE = 6;
const SFX_IMPACT_POOL_SIZE = 6;
const SFX_SAIL_DEPLOY_POOL_SIZE = 2;
const SFX_DISCOVERY_SUCCESS_POOL_SIZE = 3;
const SFX_COIN_CLINK_POOL_SIZE = 4;
const SFX_FISHING_POOL_SIZE = 3;
const SFX_ROWING_POOL_SIZE = 2;
const SFX_FISHING_SUCCESS_POOL_SIZE = 2;
const SFX_FISHING_FAILURE_POOL_SIZE = 2;
const SFX_SCAVENGE_SUCCESS_POOL_SIZE = 2;
const SFX_SCAVENGE_FAILURE_POOL_SIZE = 2;
const SFX_LIGHTNING_POOL_SIZE = 2;
const SFX_CANNON_VOLUME = 0.76;
const SFX_BOW_FIRE_VOLUME = 0.68;
const SFX_ARROW_HIT_VOLUME = 0.54;
const SFX_IMPACT_VOLUME = 0.64;
const SFX_SAIL_DEPLOY_VOLUME = 0.22;
const SFX_DISCOVERY_SUCCESS_VOLUME = 0.72;
const SFX_COIN_CLINK_VOLUME = 0.58;
const SFX_FISHING_VOLUME = 0.42;
const SFX_FISHING_SUCCESS_VOLUME = 0.58;
const SFX_FISHING_FAILURE_VOLUME = 0.46;
const SFX_SCAVENGE_SUCCESS_VOLUME = 0.62;
const SFX_SCAVENGE_FAILURE_VOLUME = 0.44;
const SFX_LIGHTNING_VOLUME = 0.72;
const SFX_HARBOUR_MAX_VOLUME = 0.08;
const SFX_SEAGULLS_MAX_VOLUME = 0.1;
const SFX_SHORE_GULLS_MAX_VOLUME = 0.16;
const SFX_HARSH_WIND_MAX_VOLUME = 0.12;
const SFX_WINTER_WIND_MAX_VOLUME = 0.11;
const SFX_DESERT_WIND_MAX_VOLUME = 0.1;
const SFX_STORM_MAX_VOLUME = 0.42;
const SFX_SAIL_FLAP_MAX_VOLUME = 0.52;
const SFX_UNDERWAY_MAX_VOLUME = 0.065;
const SFX_FIRE_MAX_VOLUME = 0.2;
const SFX_HARBOUR_NEAR_PX = 42;
const SFX_HARBOUR_FAR_PX = 170;
const SFX_AMBIENT_FADE_PER_SECOND = 1.35;
const SFX_WIND_FADE_PER_SECOND = 0.035;
const SFX_STORM_FADE_PER_SECOND = 0.35;
const SFX_SAIL_FLAP_FADE_PER_SECOND = 2.4;
const SFX_UNDERWAY_FADE_PER_SECOND = 0.018;
const SFX_FIRE_FADE_PER_SECOND = 0.55;
const SFX_WIND_TERRAIN_RADIUS_PX = 150;
const STORM_MUSIC_ENTER_INTENSITY = STORM_ACTIVE_INTENSITY;
const STORM_MUSIC_EXIT_INTENSITY = STORM_ACTIVE_INTENSITY * 0.72;
const STORM_DAMAGE_NOTICE_MS = 3600;
const SEAGULL_FLIGHT_URL = "/assets/animals/seagull-Sheet.png";
const SEAGULL_STANDING_URL = "/assets/animals/seagull_standing.png";
const FISH_SPRITE_URL = "/assets/animals/fish.png";
const FISHING_NET_SHEET_URL = "/assets/misc/fishing-net-Sheet.png";
const SEAGULL_FRAME_SIZE = 9;
const FISH_SPRITE_SIZE = 9;
const FISH_VISIBLE_MAX_INDIVIDUALS = 42;
const FISH_NPC_HARVEST_RADIUS_PX = 24;
const FISH_NPC_HARVEST_INTERVAL_MINUTES = 8 * 60;
const FISH_NOTICE_MS = 2400;
const FISH_SWIM_SEARCH_MARGIN_PX = 18;
const FISH_SWIM_PERIOD_MIN_MS = 4200;
const FISH_SWIM_PERIOD_SPREAD_MS = 5200;
const FISH_SCATTER_RADIUS_PX = 30;
const FISH_SCATTER_PUSH_PX = 5;
const FISH_ANIMATION_REDRAW_MS = 120;
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
const CAPTURE_SCENARIO = captureScenarioFromSearch(window.location.search);
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
  throw new Error("Marque & Reprisal requires its shell and responsive canvas");
}
const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
if (!ctx) throw new Error("Marque & Reprisal could not create its 2D canvas context");
ctx.imageSmoothingEnabled = false;
const shipOutlineCanvas = document.createElement("canvas");
shipOutlineCanvas.width = SHIP_SHEET_FRAME_SIZE;
shipOutlineCanvas.height = SHIP_SHEET_FRAME_SIZE;
const shipOutlineCtx = shipOutlineCanvas.getContext("2d");
if (!shipOutlineCtx) throw new Error("Marque & Reprisal could not create its ship outline context");
shipOutlineCtx.imageSmoothingEnabled = false;
const shipSinkSampleCanvas = document.createElement("canvas");
shipSinkSampleCanvas.width = SHIP_SHEET_FRAME_SIZE;
shipSinkSampleCanvas.height = SHIP_SHEET_FRAME_SIZE;
const shipSinkSampleCtx = shipSinkSampleCanvas.getContext("2d", {
  willReadFrequently: true,
  colorSpace: "srgb"
});
if (!shipSinkSampleCtx) throw new Error("Marque & Reprisal could not create its ship sinking sample context");
shipSinkSampleCtx.imageSmoothingEnabled = false;
const shipSinkPixelCache = new WeakMap();
const shipWaterlineLayerCache = new WeakMap();
const selectableOutlineCache = new WeakMap();
const pixelTextRasterCache = new Map();
const pixelTextFontLayoutCache = new Map();
let stormEdgeFogCanvas = null;
const reducedMotionPreferred = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

const keys = new Set();
const pointerSteering = {
  active: false,
  pointerId: null,
  point: null,
  startPoint: null,
  startedAtMs: null,
  maxTravelPx: 0,
  tapAction: null
};
let controllerSteering = null;
let controllerButtons = [];
let graph;
let directionIndex;
let earthRows;
let earthById;
let mountainLandmarks;
let worldDiscoveries = [];
let discoveryCatalog = [];
let discoveryCatalogById = new Map();
let discoveryNotice = null;
const discoveryNoticeQueue = [];
let fishCatchNotice = null;
let fishingAction = null;
let survivalNotice = null;
let images;
let shipImage;
let shipSinkDepthImage;
let shipWakeAnchors;
let shipWakeAnchorsBySlug;
let shipFootprintsBySlug;
let shipLighting;
const shipInfoImages = new Map();
const shipInfoImagePromises = new Map();
let gameIconAtlasImage;
let gameIconOutlineAtlasImage;
let worldDiscoveryImages;
let cityImages;
let factionFlagImages;
let animalImages;
let stormShipStrikeImage;
let fireEffectImage;
let cityCatalog;
let cityByTileId;
let npcShipAssetsBySlug;
let rowingShipAssetsBySlug;
let npcSeaRoutes;
let worldEconomy;
let npcShipCaptains;
let pirateHideoutCharacters = new Map();
let pirateHideoutPortsByTileId = new Map();
const npcVisualShips = new Map();
const shipCombatState = createShipCombatState();
const shipCollisionCooldowns = new Map();
const shipCombatEntryCollisionGrace = new Map();
const shoreBatteryStates = new Map();
let npcCombatProjectiles = [];
let npcCombatSplashes = [];
let cannonSmokeBursts = [];
let hullSplinterBursts = [];
let npcVisualUpdateAccumulator = 0;
let characterPortraitManifest;
let usedCharacterNames = new Set();
let portCityCharacters;
let campaignGoalContact;
let colonizationOrganizer;
let colonizationTargetTileId = null;
let portCitiesByTileId;
let portCities = [];
let factionCapitalPorts;
const spriteAlphaMasks = new WeakMap();
const cityOpaquePixelCache = new WeakMap();
const cityDamageOverlayCache = new WeakMap();
const cityVisualOffsets = new Map();
const fishSpriteTintCache = new Map();
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
const stormPassageState = createStormPassageState();
let riverSpriteCache = new Map();
let waterDepthBands;
let weatherBake;
let runtimeWeather;
let seaIceMask;
let freshwaterIceMask;
let snowGroundMask;
let cloudSprites;
let weatherClockMinutes = START_WEATHER.clockMinutes;
let voyageStartClockMinutes = START_WEATHER.clockMinutes;
let weatherTimeScale = START_WEATHER.timeScale;
let pausedWeatherTimeScale = START_WEATHER.timeScale || WEATHER_DEFAULT_TIME_SCALE;
let weatherParts = weatherClockParts(weatherClockMinutes);
let weatherMaskDayIndex = -1;
let weatherDrawTick = -1;
let ship;
let playerSteeringHoldSeconds = 0;
let playerHaulBlockedSeconds = 0;
let playerBoundaryAssistContact = null;
let camera;
let chart;
let localLayout;
let minimap;
let themeMusic = null;
let soundEffects = null;
const stormLightningState = createStormLightningState();
const stormShipStrikeState = createStormShipStrikeState();
const sailingAudioState = createSailingAudioState();
const rowingCadenceState = createRowingCadenceState();
let sailingTutorialState = createSailingTutorialState();
let sailingTutorialInputMode = window.matchMedia?.("(pointer: coarse)")?.matches === true
  ? "touch"
  : "keyboard";
let backgroundMusicTrackKey = "ship";
let combatMusicUntilMs = 0;
let gameAudioActivationAllowed = false;
let gameState = null;
let dialogueState = null;
let dialogueLayout = createDialogueLayoutState();
let startMenu = null;
let lakeBattleMode = null;
let lakeBattleTerrainChart = null;
let lakeBattleTerrainChartKey = "";
const lakeBattleShipAssets = new Map();
const lakeBattleShipAssetPromises = new Map();
let localSaveResult = { status: "empty", save: null, error: null };
let voyageHistoryResult = { status: "ready", records: [], error: null };
let hasStartedVoyage = false;
let captureRecorder = null;
let capturePlaybackPaused = Boolean(CAPTURE_SCENARIO);
let captureLastPositionEventMs = -Infinity;
let lastAutosaveMs = 0;
let captainAlertModal = null;
let familyDebtReturnReminderDelivered = false;
const survivalDeprivationTimers = {
  waterNextMinute: null,
  foodNextMinute: null
};
let creditsMarkdown = "";
let playerIntroModal = null;
let interactionButtonRect = null;
let interactionButtonTarget = null;
let anchorButtonRect = null;
let scavengeButtonRect = null;
let shoreScavengeAction = null;
let anchored = false;
let portWaitState = null;
let portWaitButtonRect = null;
let stormMusicActive = false;
let stormDamageNotice = null;
let combatNotice = null;
let gameOverReason = null;
let gameOverState = null;
let worldShipSinkEffects = [];
const portraitCanvasCache = new Map();
const portraitPromiseCache = new Map();
const grayscalePortraitCanvasCache = new WeakMap();
const cityShadowSpriteCache = new Map();
let centerTileId = 0;
let windIndicatorState = null;
let shipyardPurchaseListingId = null;
let surrenderedShipCapturePendingId = null;
let vikingLongshipAcquisitionPending = false;
let dirty = true;
let lastFrameMs = performance.now();
let lastStatusMs = 0;
let lastOverlayMs = 0;
let worldSpriteAnimationTick = -1;
let waterAnimationClockMs = 0;
let waterAnimationDrawTick = -1;
const globeWaterHexWaveFrameIndexCache = new Map();
const localWaterHexWaveFrameIndexCache = new Map();
const waterHexWaveFrameCache = new WeakMap();
let fishAnimationDrawTick = -1;
let precipParticleDrawTick = -1;
let precipParticles = [];
let precipParticleSerial = 1;
let visiblePrecipitationLastRender = false;
let seagulls = [];
let seagullNextSpawnMs = 0;
let seagullSerial = 1;
const optionsMenu = createOptionsMenuState();
const creditsMenu = createCreditsMenuState();
const pastVoyagesMenu = createPastVoyagesMenuState();
const discoveriesMenu = createDiscoveriesMenuState();
const shipInfoMenu = createShipInfoMenuState();
const politicsMenu = createPoliticsMenuState();
const captainMenu = createCaptainMenuState();
const cheatCodeInput = createCheatCodeInputState();

fitCanvasToDisplay();
window.addEventListener("resize", fitCanvasToDisplay);
window.visualViewport?.addEventListener("resize", fitCanvasToDisplay);
document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("visibilitychange", handleFullscreenVisibilityChange);
screen.orientation?.addEventListener?.("change", fitCanvasToDisplay);

window.addEventListener("keydown", (event) => {
  if (isShareScreenshotKey(event)) {
    event.preventDefault();
    if (!event.repeat) {
      void saveShareScreenshot(canvas)
        .then(({ width, height }) => showSurvivalNotice(`SCREENSHOT SAVED  ${width}X${height}`, "good"))
        .catch((error) => {
          console.error("Could not save share screenshot", error);
          showSurvivalNotice("SCREENSHOT FAILED", "warn");
        });
    }
    return;
  }
  if (handleCheatCodeKeyDown(event)) return;
  ensureGameAudioStarted(true);
  if (isControlKey(event.key)) sailingTutorialInputMode = "keyboard";
  if (lakeBattleMode && optionsMenu.isOpen) {
    handleOptionsKeyDown(event);
    return;
  }
  if (lakeBattleMode) {
    handleLakeBattleKeyDown(event);
    return;
  }
  if (dispatchWorldOverlayKey(event)) return;
  if (event.key === "Escape") {
    event.preventDefault();
    openCaptainMenu();
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
canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
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
    loadedShipSpriteAsset,
    loadedShipWakeAnchors,
    loadedShipFootprints,
    loadedShipLighting,
    loadedNpcShipAssets,
    loadedRowingShipAssets,
    loadedGameIconAtlas,
    loadedWorldDiscoveryImages,
    loadedCityImages,
    loadedFactionFlagImages,
    loadedAnimalImages,
    loadedStormShipStrikeImage,
    loadedFireEffectImage,
    loadedCityCatalog,
    loadedCharacterPortraitManifest,
    loadedNamedMountains,
    loadedCreditsMarkdown,
    earth,
    discreteWeatherBuffer,
    runtimeWeatherBuffer
  ] = await Promise.all([
    loadTerrainImages(),
    START_SHIP_SLUG_OVERRIDE
      ? loadShipSpriteAsset(`${shipSpriteKey}-${SHIP_SPRITE_HEADING_SUFFIX}`, `Player ship: ${START_SHIP_SLUG}`)
      : Promise.resolve(null),
    loadShipWakeAnchors(),
    loadShipFootprints(),
    START_SHIP_SLUG_OVERRIDE
      ? loadShipLightingBake(shipSpriteKey)
      : Promise.resolve(null),
    loadNpcShipAssets(),
    loadRowingShipAssets(),
    loadGameIconAtlas(),
    loadWorldDiscoveryImages(),
    loadCityImages(),
    loadFactionFlagImages(),
    loadAnimalImages(),
    loadStormShipStrikeImage(),
    loadFireEffectImage(),
    loadCityCatalog(CITY_DATA_YEAR),
    loadCharacterPortraitManifest(),
    loadNamedMountains(),
    fetchText(CREDITS_MARKDOWN_URL, "credits"),
    fetchEarthCache(),
    fetchBinary("/shared/discrete-weather-bake-7.bin", "discrete weather bake"),
    fetchBinary("/shared/globe-runtime-bake-7.bin", "globe runtime bake")
  ]);
  images = loadedImages;
  shipImage = loadedShipSpriteAsset?.image || null;
  shipSinkDepthImage = loadedShipSpriteAsset?.sinkDepthImage || null;
  shipWakeAnchorsBySlug = loadedShipWakeAnchors;
  shipWakeAnchors = requiredShipWakeAnchors(START_SHIP_SLUG);
  shipFootprintsBySlug = loadedShipFootprints;
  shipLighting = loadedShipLighting;
  npcShipAssetsBySlug = loadedNpcShipAssets;
  rowingShipAssetsBySlug = loadedRowingShipAssets;
  gameIconAtlasImage = loadedGameIconAtlas;
  gameIconOutlineAtlasImage = createGameIconOutlineAtlas(loadedGameIconAtlas);
  worldDiscoveryImages = loadedWorldDiscoveryImages;
  cityImages = loadedCityImages;
  factionFlagImages = loadedFactionFlagImages;
  animalImages = loadedAnimalImages;
  stormShipStrikeImage = loadedStormShipStrikeImage;
  fireEffectImage = loadedFireEffectImage;
  cityCatalog = loadedCityCatalog;
  creditsMarkdown = loadedCreditsMarkdown;
  localSaveResult = CAPTURE_SCENARIO
    ? { status: "empty", save: null, error: null }
    : readLocalSave();
  if (localSaveResult.status === "invalid") {
    console.warn("[pixel-globe] local save is unavailable", localSaveResult.error);
  }
  voyageHistoryResult = CAPTURE_SCENARIO
    ? { status: "ready", records: [], error: null }
    : readVoyageHistory();
  if (voyageHistoryResult.status === "invalid") {
    console.warn("[pixel-globe] past voyage history is unavailable", voyageHistoryResult.error);
  }
  if (earth.subdivisions !== SUBDIVISIONS) {
    throw new Error(`Expected Earth cache subdivision ${SUBDIVISIONS}, got ${earth.subdivisions}`);
  }
  earthRows = applyManualTerrainOverrides(earth.tiles, earth.subdivisions);
  earth.tiles = earthRows;

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
  assertManualShallowWaterReachesOcean(oceanReachableNavigationMask, SUBDIVISIONS);
  cityByTileId = placeCityCatalog(cityCatalog);
  colonizationTargetTileId = findColonizationTargetTile();
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
  validateExplorerReportDialogueCatalog(explorerWonderCatalog(discoveryCatalog));
  discoveryCatalogById = new Map(discoveryCatalog.map((discovery) => [discovery.id, discovery]));
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
  usedCharacterNames = new Set();
  const playerProfile = generatePlayerStartingProfile({
    identityKey: playerCharacterIdentityKey(),
    ports: portCities,
    manifest: characterPortraitManifest,
    usedNames: usedCharacterNames
  });
  const playerCharacter = CAPTURE_SCENARIO
    ? capturePlayerCharacter(playerProfile.character, CAPTURE_SCENARIO)
    : playerProfile.character;
  const playerShipSlug = START_SHIP_SLUG_OVERRIDE || playerProfile.starterShipSlug;
  const playerStartPosition = START_POSITION_OVERRIDE || {
    lat: playerProfile.homePort.lat,
    lon: playerProfile.homePort.lon
  };
  if (!START_WEATHER.explicitTime) {
    weatherClockMinutes = weatherClockAtLocalTime(
      START_WEATHER.clockMinutes,
      playerStartPosition.lon,
      10
    );
    weatherParts = weatherClockParts(weatherClockMinutes);
  }
  voyageStartClockMinutes = weatherClockMinutes;
  worldEconomy = createWorldEconomy({
    ports: portCities,
    startMinute: weatherClockMinutes
  });
  const activeShipyardListings = [...worldEconomy.shipyards.yards.values()].filter((yard) => yard.listing);
  console.info(
    `[pixel-globe] shipyards: ${worldEconomy.shipyards.yards.size} ports, ` +
    `${activeShipyardListings.length} new vessels listed` +
    (activeShipyardListings.length > 0
      ? ` (${activeShipyardListings.map((yard) => `${yard.portName}: ${yard.listing.shipLabel}`).join(", ")})`
      : "")
  );
  if (!shipImage || !shipSinkDepthImage || !shipLighting || playerShipSlug !== START_SHIP_SLUG) {
    const playerShipAssets = await loadShipAssetSet(playerShipSlug);
    shipImage = playerShipAssets.image;
    shipSinkDepthImage = playerShipAssets.sinkDepthImage;
    shipLighting = playerShipAssets.lighting;
    shipWakeAnchors = requiredShipWakeAnchors(playerShipSlug);
  }
  portCityCharacters = assignPortCityCharacters(portCities, characterPortraitManifest, usedCharacterNames);
  const vikingLongshipPort = portCities.find(isVikingLongshipQuestPort);
  if (!vikingLongshipPort) throw new Error("Hafnarfjordur is missing from the dockable 1522 port roster");
  const replacedVikingPortFactor = portCityCharacters.get(vikingLongshipPort.tileId);
  if (!replacedVikingPortFactor) throw new Error("Hafnarfjordur has no generated port factor to replace");
  usedCharacterNames.delete(replacedVikingPortFactor.name);
  portCityCharacters.set(vikingLongshipPort.tileId, assignPortCityCharacterFromSource(
    vikingLongshipPort,
    VIKING_LONGSHIP_CHARACTER_SOURCE_ID,
    characterPortraitManifest,
    usedCharacterNames
  ));
  const colonizationOrigin = portCities.find(isColonizationQuestOrigin);
  if (!colonizationOrigin) throw new Error("Bordeaux is missing from the dockable 1522 port roster");
  const bordeauxFactor = portCityCharacters.get(colonizationOrigin.tileId);
  if (!bordeauxFactor) throw new Error("Bordeaux has no generated port factor");
  colonizationOrganizer = generateSpecialPortCharacter({
    identityKey: "port-royal-colonial-organizer",
    port: colonizationOrigin,
    excludedSourceIds: [bordeauxFactor.sourceId],
    role: "colonial-organizer",
    manifest: characterPortraitManifest,
    usedNames: usedCharacterNames
  });
  console.info(
    `[pixel-globe] character portraits: ${portCityCharacters.size} port cities, ` +
    `${characterPortraitManifest.sourceCharacters.length} authored portraits`
  );
  console.info(
    `[pixel-globe] player captain: ${playerCharacter.name}, ${playerCharacter.nationalityAdjective}, ` +
    `born ${playerCharacter.birthDateLabel}, ${playerCharacter.expressions.length} expressions, ` +
    `home port ${playerCharacter.homePortName}, starter ${shipLabelForSlug(playerShipSlug)}`
  );
  console.info(`[pixel-globe] faction capitals: ${factionCapitalPorts.size} water-accessible capitals`);
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
  if (CAPTURE_SCENARIO) applyCaptureShipHeading(ship, CAPTURE_SCENARIO.player.headingDeg);
  gameState = createGameState({
    cargoCapacity: ship.cargoCapacity,
    startMinute: weatherClockMinutes,
    playerCharacter,
    shipStats: ship.stats
  });
  assignColonizationTargetTile(gameState.memory.colonization, colonizationTargetTileId);
  syncColonizationWorldState(gameState, { startMinute: weatherClockMinutes });
  familyDebtReturnReminderDelivered = false;
  campaignGoalContact = createCampaignGoalContact(gameState.playerCharacter, gameState.memory.campaignGoal);
  if (CAPTURE_SCENARIO) gameState.activePlaySeconds = CAPTURE_SCENARIO.player.activePlaySeconds;
  applyCurrentPortConquestOwnership();
  sailingTutorialState = createSailingTutorialState();
  initializeProvisionalShipLoadout(gameState, ship.stats);
  if (CAPTURE_SCENARIO) applyCaptureDiplomacy(gameState, CAPTURE_SCENARIO.diplomacy);
  npcSeaRoutes = createNpcSeaRouteSystem({
    ports: portCities,
    startMinute: weatherClockMinutes,
    economy: worldEconomy,
    fishState: gameState,
    relationBetween: currentDiplomacyBetween,
    mingTradeOpenToFaction: (factionId) => mingTradeOpenToFaction(gameState, factionId),
    onForeignPortCall: recordNpcDiplomaticPortCall
  });
  if (CAPTURE_SCENARIO) {
    for (const encounter of CAPTURE_SCENARIO.encounters) {
      configureCaptureEncounter(npcSeaRoutes, encounter, weatherClockMinutes);
    }
  }
  const playerPirateHideoutPorts = buildPlayerPirateHideoutPorts(npcSeaRoutes.pirateHideouts);
  pirateHideoutPortsByTileId = new Map(playerPirateHideoutPorts.map((port) => [port.tileId, port]));
  const pirateHideoutHosts = playerPirateHideoutPorts.map((port) => ({
    id: port.portId,
    role: NPC_ROLE_PIRATE,
    currentPort: port,
    profileId: port.routeRegion || null
  }));
  pirateHideoutCharacters = assignNpcShipCaptains(
    pirateHideoutHosts,
    characterPortraitManifest,
    usedCharacterNames
  );
  npcShipCaptains = assignNpcShipCaptains(npcSeaRoutes.ships, characterPortraitManifest, usedCharacterNames);
  console.info(`[pixel-globe] NPC sea routes: ${npcSeaRoutes.ships.length} ships`);
  console.info(`[pixel-globe] NPC ship captains: ${npcShipCaptains.size} assigned portraits`);
  console.info(`[pixel-globe] named characters: ${usedCharacterNames.size} unique people`);
  playerIntroModal = CAPTURE_SCENARIO ? null : createPlayerIntroModal(playerCharacter);
  startMenu = CAPTURE_SCENARIO ? null : createStartMenuState();
  hasStartedVoyage = Boolean(CAPTURE_SCENARIO);
  await ensureCharacterPortraitLoaded(playerCharacter, characterExpression(playerCharacter));
  syncShipCargoFromGameState();
  camera = northUpCamera(ship.position);
  centerTileId = ship.tileId;
  localLayout = createLocalLayout(centerTileId);
  chart = buildChart(camera);
  setupThemeMusic();
  setupSoundEffects();
  if (CAPTURE_SCENARIO) setupCaptureMode();
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

  const sample = "PIXEL 1522 gy";
  const requiredFonts = [
    { label: "Silkscreen", font: "8px \"Silkscreen\"" },
    { label: "Dogica", font: "8px \"Dogica\"" }
  ];
  const loadedFaces = await Promise.all(
    requiredFonts.map(({ font }) => document.fonts.load(font, sample))
  );
  await document.fonts.ready;

  for (let index = 0; index < requiredFonts.length; index++) {
    const { label, font } = requiredFonts[index];
    if (loadedFaces[index].length === 0 || !document.fonts.check(font, sample)) {
      throw new Error(`Pixel font failed to load: ${label}`);
    }
    await waitForPixelFontRaster(label, font, sample);
  }
}

async function waitForPixelFontRaster(label, font, sample) {
  const timeoutMs = 3000;
  const startedAt = Date.now();
  let attempts = 0;
  let lastError = null;
  do {
    await nextFontRasterProbe();
    attempts += 1;
    try {
      const measuredWidth = measurePixelTextWidth(sample, font);
      pixelTextRaster(sample, font, "#ffffff", measuredWidth);
      return;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("Pixel text raster contains no opaque glyph pixels:")) {
        throw error;
      }
      lastError = error;
    }
  } while (Date.now() - startedAt < timeoutMs);
  throw new Error(
    `Pixel font loaded but could not rasterize after ${attempts} probes over ${Date.now() - startedAt}ms: ` +
    `${label}; ${lastError?.message || "unknown error"}`
  );
}

function nextFontRasterProbe() {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 50);
  });
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
  return loadAssetImage(
    `/assets/terrain/${TERRAIN_VARIANT}/${key}.png?v=${TERRAIN_ASSET_VERSION}`,
    `${TERRAIN_VARIANT} terrain image: ${key}`
  ).then((image) => [key, image]);
}

function loadVehicleImage(key) {
  return loadAssetImage(`/assets/vehicles/${key}.png?v=${VEHICLE_ASSET_VERSION}`, `vehicle image: ${key}`);
}

async function loadShipSpriteAsset(spriteKey, label) {
  const [image, sinkDepthImage] = await Promise.all([
    loadVehicleImage(spriteKey),
    loadVehicleImage(`${spriteKey}-sink-depth`)
  ]);
  validateShipSpriteSheet(image, `${label} image`);
  validateShipSpriteSheet(sinkDepthImage, `${label} sink-depth image`);
  return Object.freeze({ image, sinkDepthImage });
}

async function loadNpcShipAssets() {
  const entries = await Promise.all(NPC_SHIP_SLUGS.map(async (slug) => {
    const key = `${vehicleSpriteKeyForShipSlug(slug)}-${SHIP_SPRITE_HEADING_SUFFIX}`;
    return [slug, await loadShipSpriteAsset(key, `NPC ship: ${slug}`)];
  }));
  return new Map(entries);
}

async function loadRowingShipAssets() {
  const entries = await Promise.all([...ROWING_SHIP_ANIMATION_SPECS].map(async ([slug, spec]) => {
    const assets = await Promise.all(Array.from({ length: spec.frames }, async (_, frameIndex) => {
      const key = `${vehicleSpriteKeyForShipSlug(slug)}-rowing-${frameIndex}-${SHIP_SPRITE_HEADING_SUFFIX}`;
      return loadShipSpriteAsset(key, `Rowing ship: ${slug} frame ${frameIndex}`);
    }));
    return [slug, assets];
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

async function loadShipFootprints() {
  const res = await fetch(SHIP_HULL_FOOTPRINTS_URL);
  if (!res.ok) throw new Error(`Failed to load ship hull footprints: HTTP ${res.status}`);
  const bake = await res.json();
  return validateShipFootprintBake(bake, SHIP_SHEET_FRAME_SIZE, SHIP_HEADING_COUNT, SHIP_MENU_SLUGS);
}

function requiredShipFootprints(slug) {
  const footprints = shipFootprintsBySlug?.get(slug);
  if (!footprints) throw new Error(`Missing baked hull footprints for ship: ${slug}`);
  return footprints;
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

async function loadGameIconAtlas() {
  const image = await loadAssetImage(
    `/assets/ui/game-icons.png?v=${GAME_ICON_ASSET_VERSION}`,
    "game icon atlas"
  );
  const dimensions = gameIconAtlasDimensions();
  validateImageDimensions(image, "game icon atlas", dimensions.width, dimensions.height);
  return image;
}

function createGameIconOutlineAtlas(image) {
  const dimensions = gameIconAtlasDimensions();
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = dimensions.width;
  sourceCanvas.height = dimensions.height;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) throw new Error("Could not create game icon outline source canvas");
  sourceCtx.imageSmoothingEnabled = false;
  sourceCtx.drawImage(image, 0, 0);
  const source = sourceCtx.getImageData(0, 0, dimensions.width, dimensions.height);
  const outlinePixels = buildPixelIconOutlinePixels({
    sourcePixels: source.data,
    width: dimensions.width,
    height: dimensions.height,
    cells: gameIconIds().map(gameIconAtlasRect)
  });

  const outlineCanvas = document.createElement("canvas");
  outlineCanvas.width = dimensions.width;
  outlineCanvas.height = dimensions.height;
  const outlineCtx = outlineCanvas.getContext("2d");
  if (!outlineCtx) throw new Error("Could not create game icon outline canvas");
  const outline = outlineCtx.createImageData(dimensions.width, dimensions.height);
  outline.data.set(outlinePixels);
  outlineCtx.putImageData(outline, 0, 0);
  return outlineCanvas;
}

async function loadAnimalImages() {
  const [seagullFlight, seagullStanding, fish, fishingNet] = await Promise.all([
    loadAssetImage(`${SEAGULL_FLIGHT_URL}?v=${ANIMAL_ASSET_VERSION}`, "seagull flight sheet"),
    loadAssetImage(`${SEAGULL_STANDING_URL}?v=${ANIMAL_ASSET_VERSION}`, "standing seagull image"),
    loadAssetImage(`${FISH_SPRITE_URL}?v=${ANIMAL_ASSET_VERSION}`, "fish image"),
    loadAssetImage(`${FISHING_NET_SHEET_URL}?v=${ANIMAL_ASSET_VERSION}`, "fishing net sheet")
  ]);
  validateImageDimensions(
    seagullFlight,
    "seagull flight sheet",
    SEAGULL_FRAME_SIZE * SEAGULL_FLIGHT_FRAMES,
    SEAGULL_FRAME_SIZE
  );
  validateImageDimensions(seagullStanding, "standing seagull image", SEAGULL_FRAME_SIZE, SEAGULL_FRAME_SIZE);
  validateImageDimensions(fish, "fish image", FISH_SPRITE_SIZE, FISH_SPRITE_SIZE);
  validateImageDimensions(
    fishingNet,
    "fishing net sheet",
    FISHING_NET_FRAME_SIZE * FISHING_NET_FRAME_COUNT,
    FISHING_NET_FRAME_SIZE
  );
  return { seagullFlight, seagullStanding, fish, fishingNet };
}

async function loadStormShipStrikeImage() {
  const image = await loadAssetImage(
    `${STORM_SHIP_STRIKE_URL}?v=${STORM_SHIP_STRIKE_ASSET_VERSION}`,
    "storm ship lightning sheet"
  );
  validateImageDimensions(
    image,
    "storm ship lightning sheet",
    STORM_SHIP_STRIKE_FRAME_WIDTH * STORM_SHIP_STRIKE_SHEET_COLUMNS,
    STORM_SHIP_STRIKE_FRAME_HEIGHT * Math.ceil(
      STORM_SHIP_STRIKE_FRAME_COUNT / STORM_SHIP_STRIKE_SHEET_COLUMNS
    )
  );
  return image;
}

async function loadFireEffectImage() {
  const image = await loadAssetImage(
    `${FIRE_EFFECT_URL}?v=${FIRE_EFFECT_ASSET_VERSION}`,
    "world fire animation"
  );
  validateImageDimensions(
    image,
    "world fire animation",
    FIRE_FRAME_WIDTH * FIRE_FRAME_COUNT,
    FIRE_FRAME_HEIGHT
  );
  return image;
}

function validateImageDimensions(img, label, expectedWidth, expectedHeight) {
  if (img.width !== expectedWidth || img.height !== expectedHeight) {
    throw new Error(`${label} has ${img.width}x${img.height}; expected ${expectedWidth}x${expectedHeight}`);
  }
}

async function loadCityImages() {
  const entries = await Promise.all(CITY_IMAGE_KEYS.map(loadCityTypeImage));
  return new Map(entries);
}

async function loadCityTypeImage(cityType) {
  const artKey = CITY_TYPE_ART_KEYS[cityType] || cityType;
  const img = await loadAssetImage(
    `/assets/buildings/city-types/city-${artKey}.png?v=${CITY_ASSET_VERSION}`,
    `city type image: ${cityType}`
  );
  if (img.width !== CITY_SPRITE_W || img.height !== CITY_SPRITE_H) {
    throw new Error(`City type image ${cityType} must be ${CITY_SPRITE_W}x${CITY_SPRITE_H}, got ${img.width}x${img.height}`);
  }
  return [cityType, img];
}

async function loadFactionFlagImages() {
  const entries = await Promise.all(FACTIONS.filter((faction) => factionHasFlag(faction.id)).map(async (faction) => {
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
  return loadImageWithRetry({
    src,
    label,
    createImage: () => new Image(),
    beforeRetry: waitForVisiblePage
  });
}

function waitForVisiblePage() {
  if (document.visibilityState !== "hidden") return Promise.resolve();
  return new Promise((resolve) => {
    document.addEventListener("visibilitychange", resolve, { once: true });
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
  const coastalIntentIndex = optionalCsvIndex(header, "coastal_intent");
  const lakeIntentIndex = optionalCsvIndex(header, "lake_intent");
  const observationsByCity = new Map();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 1 && row[0] === "") continue;
    const city = requiredCsvCell(row, cityIndex, rowIndex, "city").trim();
    const country = requiredCsvCell(row, countryIndex, rowIndex, "country").trim();
    const lat = requiredCsvNumber(row, latIndex, rowIndex, "latitude");
    const lon = requiredCsvNumber(row, lonIndex, rowIndex, "longitude");
    const year = requiredCsvInteger(row, yearIndex, rowIndex, "year");
    const population = requiredCsvNumber(row, populationIndex, rowIndex, "population");
    const coastalIntent = optionalCsvBoolean(row, coastalIntentIndex);
    const lakeIntent = optionalCsvBoolean(row, lakeIntentIndex);
    if (population <= 0) continue;

    const cityId = normalizeCityKey(city, country);
    const observations = observationsByCity.get(cityId) || [];
    observations.push({ cityId, city, country, lat, lon, year, population, coastalIntent, lakeIntent });
    observationsByCity.set(cityId, observations);
  }

  const bestByCity = new Map();
  for (const [cityId, observations] of observationsByCity) {
    const capitalSpec = factionCapitalForCity(observations[0]);
    const observation = cityPopulationObservationAtYear(observations, targetYear, {
      allowStaleObservation: Boolean(capitalSpec)
    });
    if (!observation) continue;
    const cityRecord = withColonialFounding({
      ...observation,
      displayCity: cityDisplayName(observation.city, observation.country, targetYear),
      cityType: cityTypeForCity(observation.country, observation.lat, observation.lon)
    });
    bestByCity.set(cityId, {
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec?.factionId || null
    });
  }

  ensureManualCityRecords(bestByCity, targetYear);
  ensureFactionCapitalCityRecords(bestByCity, targetYear);

  const cities = selectCityCatalogRecords(bestByCity.values(), CITY_MAX_COUNT);
  ensureFactionCapitalsInCityCatalog(cities, bestByCity);
  ensureManualCitiesInCityCatalog(cities, bestByCity);
  if (cities.length === 0) throw new Error(`City dataset produced no cities for year ${targetYear}`);
  return cities;
}

function ensureManualCityRecords(bestByCity, targetYear) {
  for (const manualSpec of MANUAL_CITY_RECORDS_1522) {
    if (manualSpec.year > targetYear) continue;
    const cityId = normalizeCityKey(manualSpec.city, manualSpec.country);
    const cityRecord = withColonialFounding({
      cityId,
      city: manualSpec.city,
      displayCity: manualSpec.displayCity || cityDisplayName(manualSpec.city, manualSpec.country, targetYear),
      country: manualSpec.country,
      lat: manualSpec.lat,
      lon: manualSpec.lon,
      cityType: manualSpec.cityType || cityTypeForCity(manualSpec.country, manualSpec.lat, manualSpec.lon),
      year: manualSpec.year,
      population: manualSpec.population,
      coastalIntent: manualSpec.coastalIntent,
      lakeIntent: manualSpec.lakeIntent,
      requiredTradePort: Boolean(manualSpec.requiredTradePort),
      manualRegion: manualSpec.manualRegion || null,
      settlementType: manualSpec.settlementType || "city",
      marketGoods: manualSpec.marketGoods || null,
      playerHomeExcluded: Boolean(manualSpec.playerHomeExcluded)
    });
    const capitalSpec = factionCapitalForCity(cityRecord);
    bestByCity.set(cityId, {
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec?.factionId || null
    });
  }
}

function ensureFactionCapitalCityRecords(bestByCity, targetYear) {
  for (const capitalSpec of factionCapitalCityRecords1522()) {
    const cityId = normalizeCityKey(capitalSpec.city, capitalSpec.country);
    if (bestByCity.has(cityId)) continue;
    const cityRecord = withColonialFounding({
      cityId,
      city: capitalSpec.city,
      displayCity: cityDisplayName(capitalSpec.city, capitalSpec.country, targetYear),
      country: capitalSpec.country,
      lat: capitalSpec.lat,
      lon: capitalSpec.lon,
      cityType: cityTypeForCity(capitalSpec.country, capitalSpec.lat, capitalSpec.lon),
      year: targetYear,
      population: capitalSpec.population,
      coastalIntent: true,
      lakeIntent: false
    });
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

function ensureManualCitiesInCityCatalog(cities, bestByCity) {
  const included = new Set(cities.map((city) => city.cityId));
  for (const manualSpec of MANUAL_CITY_RECORDS_1522) {
    const cityId = normalizeCityKey(manualSpec.city, manualSpec.country);
    if (included.has(cityId)) continue;
    const city = bestByCity.get(cityId);
    if (!city) throw new Error(`No city catalog record for manual city: ${manualSpec.city}, ${manualSpec.country}`);
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

function optionalCsvIndex(header, name) {
  const index = header.indexOf(name);
  return index >= 0 ? index : null;
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

function optionalCsvBoolean(row, index) {
  if (index == null) return false;
  const value = String(row[index] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
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
  if (CITY_TYPE_POLYNESIAN_COUNTRIES.has(country)) return "polynesian";
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
  return city.portAlias || city.displayCity || city.city;
}

async function loadShipLightingBake(shipSpriteKey) {
  const [lightImage, shadeImage, shadowImage] = await Promise.all([
    loadVehicleImage(`${shipSpriteKey}-${SHIP_SPRITE_HEADING_SUFFIX}-light`),
    loadVehicleImage(`${shipSpriteKey}-${SHIP_SPRITE_HEADING_SUFFIX}-shade`),
    loadVehicleImage(`${shipSpriteKey}-${SHIP_SPRITE_HEADING_SUFFIX}-shadow`)
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
  if (CAPTURE_SCENARIO) {
    return { lat: CAPTURE_SCENARIO.player.lat, lon: CAPTURE_SCENARIO.player.lon };
  }
  const params = new URLSearchParams(window.location.search);
  if (!params.has("lat") && !params.has("lon")) return null;
  return {
    lat: numericQueryParam(params, "lat", START_LAT_DEG, -89.999, 89.999),
    lon: numericQueryParam(params, "lon", START_LON_DEG, -180, 180)
  };
}

function startWeatherFromLocation() {
  if (CAPTURE_SCENARIO) {
    const world = CAPTURE_SCENARIO.world;
    return {
      clockMinutes: (world.day - 1) * WEATHER_MINUTES_PER_DAY + world.hour * 60 + world.minute,
      timeScale: world.timeScale,
      explicitTime: true
    };
  }
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
    timeScale,
    explicitTime: params.has("hour") || params.has("minute")
  };
}

function shipSlugOverrideFromLocation() {
  if (CAPTURE_SCENARIO) return CAPTURE_SCENARIO.player.shipSlug;
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

function handleCheatCodeKeyDown(event) {
  const available = cheatCodesAvailable();
  if (!cheatCodeInput.active && !available) return false;
  const result = processCheatCodeKey(cheatCodeInput, event);
  if (!result.handled) return false;
  event.preventDefault();
  if (result.status === "opened" || result.status === "edited") {
    showSurvivalNotice(`CHEAT CODE: ${cheatCodeInput.buffer || "_"}`, "good");
  } else if (result.status === "canceled") {
    showSurvivalNotice("CHEAT CODE CANCELED", "warn");
  } else if (result.status === "unknown") {
    showSurvivalNotice(`UNKNOWN CHEAT: ${result.code || "EMPTY"}`, "warn");
  } else if (result.command) {
    if (!available) throw new Error("Cannot apply a cheat code outside an active voyage");
    applyCheatCommand(result.command);
  }
  dirty = true;
  return true;
}

function cheatCodesAvailable() {
  return Boolean(!CAPTURE_SCENARIO && hasStartedVoyage && gameState && ship && !gameOverReason && !lakeBattleMode);
}

function applyCheatCommand(command) {
  if (command === CHEAT_COMMAND_DISCOVER_ALL) {
    const result = grantAllDiscoveriesForCheat(gameState, discoveryCatalog);
    showSurvivalNotice(
      result.granted > 0
        ? `${result.granted} DISCOVERIES UNLOCKED`
        : `ALL ${result.total} DISCOVERIES ALREADY FOUND`,
      "good"
    );
  } else if (command === CHEAT_COMMAND_MILLION_DOUBLOONS) {
    grantMillionDoubloonsForCheat(gameState);
    showSurvivalNotice("DOUBLOONS SET TO 1,000,000", "good");
    playCoinClinkSound();
  } else {
    throw new Error(`Unknown cheat command: ${command}`);
  }
  if (!saveVoyageNow(`cheat code: ${command}`)) {
    throw new Error(`Could not save voyage after cheat command: ${command}`);
  }
  console.info(`[pixel-globe] applied cheat command: ${command}`);
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

  const removed = removeBlockedRiverEdgesFromMasks(
    graph,
    masks,
    MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS] || []
  );
  const added = mergeManualRiverChainsIntoMasks(masks);
  const manualMouthEdges = mergeManualRiverMouthEdgesIntoMasks(masks, toWaterMasks);
  const mouthEdges = markRiverEdgesOpeningToWater(masks, toWaterMasks);
  console.info(
    `[pixel-globe] river masks loaded: ${countRiverTiles(masks)} tiles, ${removed} blocked base half-edges, ${added} manual half-edge additions, ${manualMouthEdges} manual mouth half-edges, ${mouthEdges} derived coastal mouth half-edges`
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
  return earthById[tileId]?.t === "water";
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
  pollGamepadControls();
  const dt = clamp((nowMs - lastFrameMs) / 1000, 0, 0.05);
  lastFrameMs = nowMs;
  if (lakeBattleMode) {
    updateWaterAnimation(nowMs);
    updateLakeBattleModeFrame(dt, nowMs);
    updateMusicContext(nowMs);
    render(nowMs);
    dirty = false;
    lastStatusMs = nowMs;
    lastOverlayMs = nowMs;
    requestAnimationFrame(loop);
    return;
  }
  if (!capturePlaybackPaused && !menusAreOpen() && !dialogueState && !playerIntroModal && !gameOverReason) {
    advanceActivePlayTime(gameState, dt);
    if (fishingAction) {
      if (updateFishingAction(nowMs)) dirty = true;
    } else if (!anchored && !portWaitState && updateSailing(dt)) dirty = true;
    if (updateNavalWeapons(dt)) dirty = true;
    if (updateWaterAnimation(nowMs)) dirty = true;
    if (updateFishAnimation(nowMs)) dirty = true;
    if (updateWeather(dt, nowMs)) dirty = true;
    if (updateCampaignGoalReturnReminder()) dirty = true;
    if (updateColonizationQuest()) dirty = true;
    if (updateShoreScavenge(nowMs)) dirty = true;
    ensureChart();
    if (updateDiscoveries(nowMs)) dirty = true;
    if (updateNpcShips(dt)) dirty = true;
    if (updateSeagulls(dt, nowMs)) dirty = true;
    if (updateWindIndicator(dt)) dirty = true;
    if (updatePrecipitationAnimation(nowMs)) dirty = true;
    if (updateStormLightning(stormLightningState, {
      nowMs,
      intensity: playerStormIntensity()
    })) dirty = true;
    recordCapturePosition(nowMs);
  }
  if (updateStormShipStrike(stormShipStrikeState, nowMs)) dirty = true;
  if (updateWorldShipSinkEffects(nowMs)) dirty = true;
  updateAmbientAudio(dt);
  updateMusicContext(nowMs);
  if (!CAPTURE_SCENARIO && hasStartedVoyage && nowMs - lastAutosaveMs >= AUTOSAVE_INTERVAL_MS) {
    saveVoyageNow("periodic autosave");
  }
  if (updateWorldSpriteAnimation(nowMs)) dirty = true;
  if (dirty || menusAreOpen() || dialogueState || gameOverReason || nowMs - lastStatusMs > 1000) {
    render(nowMs);
    dirty = false;
    lastStatusMs = nowMs;
    lastOverlayMs = nowMs;
  } else if (!startMenu && !creditsMenu.isOpen && !playerIntroModal && nowMs - lastOverlayMs > 250) {
    if (minimapShouldBeVisible()) drawMinimap(nowMs);
    drawSurvivalMeters();
    if (portWaitState) drawPortWaitControls();
    else drawCaptainMenuButton();
    lastOverlayMs = nowMs;
  }
  requestAnimationFrame(loop);
}

function updateWorldSpriteAnimation(nowMs) {
  const tick = Math.floor(nowMs / Math.min(CITY_FLAG_FRAME_MS, FIRE_FRAME_MS));
  if (tick === worldSpriteAnimationTick) return false;
  worldSpriteAnimationTick = tick;
  return true;
}

function createOptionsMenuState() {
  return {
    isOpen: false,
    musicVolume: loadStoredVolume(MUSIC_VOLUME_STORAGE_KEY, MUSIC_DEFAULT_VOLUME),
    sfxVolume: loadStoredVolume(SFX_VOLUME_STORAGE_KEY, SFX_DEFAULT_VOLUME),
    muted: loadStoredAudioMuted(),
    fullscreenError: null,
    returnError: null,
    selectedIndex: 0,
    activeSliderKey: null,
    hoverPoint: null,
    buttonRect: null,
    panelRect: null,
    closeButtonRect: null,
    rowRects: [],
    sliderRects: {},
    sliderHitRects: {},
    muteRect: null
  };
}

function createCaptainMenuState() {
  return {
    isOpen: false,
    selectedIndex: 0,
    hoverPoint: null,
    buttonRect: null,
    panelRect: null,
    closeButtonRect: null,
    itemRects: []
  };
}

function createStartMenuState() {
  return {
    selectedIndex: 0,
    buttonRects: [],
    isLoading: false,
    message: localSaveResult.status === "invalid" ? "SAVE COULD NOT BE READ" : "",
    newGameConfirmation: null
  };
}

function startMenuActions() {
  const actions = [];
  if (localSaveResult.status === "ready") {
    actions.push({ id: START_MENU_ACTION_CONTINUE, label: startMenu?.isLoading ? "LOADING..." : "CONTINUE" });
  }
  actions.push({
    id: START_MENU_ACTION_NEW_GAME,
    label: localSaveResult.status === "ready" ? "NEW GAME" : "START GAME"
  });
  actions.push({ id: START_MENU_ACTION_LAKE_BATTLE, label: "SHIP BATTLE" });
  actions.push({ id: START_MENU_ACTION_PAST_VOYAGES, label: "PAST VOYAGES" });
  actions.push({ id: START_MENU_ACTION_OPTIONS, label: "OPTIONS" });
  actions.push({ id: START_MENU_ACTION_CREDITS, label: "CREDITS" });
  return actions;
}

function createCreditsMenuState() {
  return {
    isOpen: false,
    page: 0,
    panelRect: null,
    closeButtonRect: null,
    previousPageRect: null,
    nextPageRect: null
  };
}

function createPastVoyagesMenuState() {
  return {
    isOpen: false,
    page: 0,
    panelRect: null,
    closeButtonRect: null,
    previousPageRect: null,
    nextPageRect: null
  };
}

function createPlayerIntroModal(character) {
  return {
    character,
    hovered: false,
    buttonRect: playerIntroButtonRect()
  };
}

function playerIntroButtonRect() {
  return {
    x: Math.floor((SCREEN_W - PLAYER_INTRO_BUTTON_W) / 2),
    y: PLAYER_INTRO_PANEL_Y + PLAYER_INTRO_PANEL_H - PLAYER_INTRO_BUTTON_H - 9,
    w: PLAYER_INTRO_BUTTON_W,
    h: PLAYER_INTRO_BUTTON_H
  };
}

function createCaptainAlertModal(message, expressionId = "neutral") {
  return createCharacterAlertModal(gameState?.playerCharacter || null, message, expressionId);
}

function createCharacterAlertModal(character, message, expressionId = "neutral") {
  if (!character) throw new Error("Character alert requires a character");
  return {
    kind: "alert",
    character,
    message,
    expressionId,
    hovered: false,
    buttonRect: captainAlertButtonRect()
  };
}

function createSailingHelpModal(inputMode) {
  const pages = sailingHelpPages(inputMode);
  return {
    kind: "sailing-help",
    inputMode,
    pages,
    page: 0,
    hovered: false,
    buttonRect: sailingHelpButtonRect()
  };
}

function sailingHelpPanelRect() {
  const w = Math.min(SAILING_HELP_PANEL_MAX_W, SCREEN_W - 12);
  const h = Math.min(SAILING_HELP_PANEL_MAX_H, SCREEN_H - 12);
  return {
    x: Math.floor((SCREEN_W - w) / 2),
    y: Math.floor((SCREEN_H - h) / 2),
    w,
    h
  };
}

function sailingHelpButtonRect() {
  const panel = sailingHelpPanelRect();
  return {
    x: panel.x + Math.floor((panel.w - SAILING_HELP_BUTTON_W) / 2),
    y: panel.y + panel.h - SAILING_HELP_BUTTON_H - 9,
    w: SAILING_HELP_BUTTON_W,
    h: SAILING_HELP_BUTTON_H
  };
}

function captainAlertButtonRect() {
  return {
    x: CAPTAIN_ALERT_PANEL_X + CAPTAIN_ALERT_PANEL_W - CAPTAIN_ALERT_BUTTON_W - 14,
    y: CAPTAIN_ALERT_PANEL_Y + CAPTAIN_ALERT_PANEL_H - CAPTAIN_ALERT_BUTTON_H - 11,
    w: CAPTAIN_ALERT_BUTTON_W,
    h: CAPTAIN_ALERT_BUTTON_H
  };
}

function openCaptainAlertModal(message, expressionId = "neutral") {
  return openCharacterAlertModal(gameState?.playerCharacter || null, message, expressionId);
}

function openCharacterAlertModal(character, message, expressionId = "neutral") {
  if (!character || captainAlertModal || gameOverReason) return false;
  captainAlertModal = createCharacterAlertModal(character, message, expressionId);
  stopShipForDialogue();
  const expression = characterExpression(character, expressionId);
  void ensureCharacterPortraitLoaded(character, expression);
  dirty = true;
  return true;
}

function openSailingHelpModal(inputMode) {
  if (!gameState?.playerCharacter || captainAlertModal || gameOverReason) return false;
  captainAlertModal = createSailingHelpModal(inputMode);
  stopShipForDialogue();
  dirty = true;
  return true;
}

function handlePlayerIntroKeyDown(event) {
  event.preventDefault();
  if (event.key === "Enter" || event.key === " ") closePlayerIntroModal();
}

function handleCaptainAlertKeyDown(event) {
  event.preventDefault();
  if (captainAlertModal?.kind === "sailing-help") {
    if (event.key === "Escape") closeCaptainAlertModal();
    else if (["Enter", " ", "ArrowRight", "ArrowDown", "PageDown"].includes(event.key)) {
      stepSailingHelpPage(1);
    } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
      stepSailingHelpPage(-1);
    }
    return;
  }
  if (event.key === "Enter" || event.key === " " || event.key === "Escape") closeCaptainAlertModal();
}

function handleGameOverKeyDown(event) {
  event.preventDefault();
  if (gameOverRestartIsAvailable(lastFrameMs)) restartAfterGameOver();
}

function handlePlayerIntroPointerDown(point) {
  if (pointInRect(point, playerIntroModal?.buttonRect)) closePlayerIntroModal();
}

function handleCaptainAlertPointerDown(point) {
  if (!pointInRect(point, captainAlertModal?.buttonRect)) return;
  if (captainAlertModal.kind === "sailing-help") stepSailingHelpPage(1);
  else closeCaptainAlertModal();
}

function stepSailingHelpPage(direction) {
  const modal = captainAlertModal;
  if (modal?.kind !== "sailing-help") return;
  const nextPage = modal.page + direction;
  if (nextPage >= modal.pages.length) {
    closeCaptainAlertModal();
    return;
  }
  modal.page = Math.max(0, nextPage);
  modal.hovered = false;
  modal.buttonRect = sailingHelpButtonRect();
  dirty = true;
}

function closePlayerIntroModal() {
  playerIntroModal = null;
  keys.clear();
  clearPointerSteering();
  openCampaignGoalIntroDialogue();
  dirty = true;
}

function openCampaignGoalIntroDialogue() {
  const goal = gameState?.memory?.campaignGoal;
  if (!goal || goal.introSeen) return false;
  const homeCity = campaignGoalHomeCity();
  const contact = campaignGoalContactCharacter();
  let steps = campaignGoalIntroSteps(goal, gameState.playerCharacter, contact);
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    const lead = nearestUndiscoveredExplorerWonder(homeCity);
    const outcome = settleCampaignGoalAtHome(gameState, homeCity, {
      currentMinute: weatherClockMinutes,
      wonderCatalog: discoveryCatalog,
      nextLeadDiscoveryId: lead?.id || null
    });
    if (outcome.nextLeadDiscoveryId) {
      steps = [
        ...steps,
        {
          speaker: "contact",
          expressionId: "attentive",
          text: `Begin with ${lead.displayName}: ${lead.detail || "the nearest wonder still missing from our atlas"}. I can offer ${outcome.nextLeadReward.toLocaleString("en-US")} doubloons for a true account. I have marked its bearing.`
        }
      ];
    }
  }
  dialogueState = createCampaignDialogueSession({
    cityTileId: goal.homePortTileId,
    steps,
    phase: goal.type === CAMPAIGN_GOAL_FAMILY_DEBT ? "family-debt-intro" : "intro"
  });
  dialogueLayout = createDialogueLayoutState();
  stopShipForDialogue();
  ensureDialoguePortraitLoaded();
  saveVoyageNow("opened campaign goal");
  dirty = true;
  return true;
}

function campaignGoalHomeCity() {
  const goal = gameState?.memory?.campaignGoal;
  if (!goal) throw new Error("Player has no campaign goal");
  const city = cityByTileId.get(goal.homePortTileId);
  if (!city) throw new Error(`Campaign home port is not placed: ${goal.homePortTileId}`);
  return city;
}

function activeCampaignGoalDestination() {
  const goal = gameState?.memory?.campaignGoal;
  if (!goal) return null;
  return campaignGoalDestination(goal, {
    discoveredIds: new Set(gameState.memory.discoveryOrder),
    currentMinute: weatherClockMinutes,
    doubloons: gameState.doubloons
  });
}

function updateCampaignGoalReturnReminder() {
  const goal = gameState?.memory?.campaignGoal;
  if (!goal || goal.type !== CAMPAIGN_GOAL_FAMILY_DEBT) return false;
  const destination = activeCampaignGoalDestination();
  const shouldReturnHome = destination?.kind === CAMPAIGN_DESTINATION_HOME &&
    destination.reason === "pay-family-debt";
  if (!shouldReturnHome) {
    familyDebtReturnReminderDelivered = false;
    return false;
  }
  if (familyDebtReturnReminderDelivered) return false;
  const homeName = cityLabelText(campaignGoalHomeCity());
  const opened = openCaptainAlertModal(
    `We have enough to clear the family debt, even allowing another month of interest. ` +
      `We should return home to ${homeName}. I have marked the course.`,
    "happy"
  );
  if (!opened) return false;
  familyDebtReturnReminderDelivered = true;
  saveVoyageNow("family debt return reminder");
  return true;
}

function updateColonizationQuest() {
  const memory = gameState?.memory?.colonization;
  if (!memory || !ship || !Number.isInteger(memory.targetTileId)) return false;
  const targetVector = tileCenterVector(memory.targetTileId);
  const distancePx = Math.acos(clamp(dot3(ship.position, targetVector), -1, 1)) * PIXELS_PER_RADIAN;
  const changed = advanceColonizationQuest(memory, weatherClockMinutes, {
    awayFromColony: distancePx >= COLONY_DEPARTURE_DISTANCE_PX
  });
  if (!changed) return false;
  syncColonizationWorldState(gameState, { startMinute: weatherClockMinutes });
  saveVoyageNow(memory.stage === COLONIZATION_STAGE_FAILED
    ? "Port Royal colony failed"
    : "departed Port Royal colony");
  return true;
}

function campaignGoalContactCharacter() {
  if (!campaignGoalContact) throw new Error("Campaign goal contact has not been assigned");
  return campaignGoalContact;
}

function createCampaignGoalContact(playerCharacter, goal) {
  if (!goal) throw new Error("Cannot assign a campaign contact without a campaign goal");
  const homeCity = portCitiesByTileId.get(goal.homePortTileId);
  if (!homeCity) throw new Error(`Campaign home port is not in the port roster: ${goal.homePortTileId}`);
  const factor = portCityCharacters.get(homeCity.tileId);
  if (!factor) throw new Error(`Campaign home port has no factor: ${cityLabelText(homeCity)}`);
  return generateCampaignContactCharacter({
    playerCharacter,
    homePort: homeCity,
    goalType: goal.type,
    excludedSourceId: factor.sourceId,
    manifest: characterPortraitManifest,
    usedNames: usedCharacterNames
  });
}

function closeCaptainAlertModal() {
  captainAlertModal = null;
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
  return Boolean(startMenu) || creditsMenu.isOpen || optionsMenu.isOpen ||
    pastVoyagesMenu.isOpen || discoveriesMenu.isOpen || shipInfoMenu.isOpen ||
    politicsMenu.isOpen || captainMenu.isOpen ||
    Boolean(captainAlertModal);
}

function captainChildMenuIsOpen() {
  return optionsMenu.isOpen || creditsMenu.isOpen || discoveriesMenu.isOpen ||
    shipInfoMenu.isOpen || politicsMenu.isOpen;
}

function currentInteractionInputOwner() {
  return interactionInputOwner({
    optionsActive: optionsMenu.isOpen,
    creditsActive: creditsMenu.isOpen,
    pastVoyagesActive: pastVoyagesMenu.isOpen,
    startMenuActive: Boolean(startMenu),
    captainAlertActive: Boolean(captainAlertModal),
    playerIntroActive: Boolean(playerIntroModal),
    gameOverActive: Boolean(gameOverReason),
    captainMenuActive: captainMenu.isOpen && !captainChildMenuIsOpen(),
    shipInfoActive: shipInfoMenu.isOpen,
    politicsActive: politicsMenu.isOpen,
    discoveriesActive: discoveriesMenu.isOpen,
    dialogueActive: Boolean(dialogueState),
    portWaitActive: Boolean(portWaitState),
    fishingActive: Boolean(fishingAction)
  });
}

function dispatchWorldOverlayKey(event) {
  const owner = currentInteractionInputOwner();
  if (owner === INTERACTION_INPUT.OPTIONS) handleOptionsKeyDown(event);
  else if (owner === INTERACTION_INPUT.CREDITS) handleCreditsKeyDown(event);
  else if (owner === INTERACTION_INPUT.PAST_VOYAGES) handlePastVoyagesKeyDown(event);
  else if (owner === INTERACTION_INPUT.START_MENU) handleStartMenuKeyDown(event);
  else if (owner === INTERACTION_INPUT.CAPTAIN_ALERT) handleCaptainAlertKeyDown(event);
  else if (owner === INTERACTION_INPUT.PLAYER_INTRO) handlePlayerIntroKeyDown(event);
  else if (owner === INTERACTION_INPUT.GAME_OVER) handleGameOverKeyDown(event);
  else if (owner === INTERACTION_INPUT.CAPTAIN_MENU) handleCaptainMenuKeyDown(event);
  else if (owner === INTERACTION_INPUT.SHIP_INFO) handleShipInfoKeyDown(event);
  else if (owner === INTERACTION_INPUT.POLITICS) handlePoliticsKeyDown(event);
  else if (owner === INTERACTION_INPUT.DISCOVERIES) handleDiscoveriesKeyDown(event);
  else if (owner === INTERACTION_INPUT.DIALOGUE) handleDialogueKeyDown(event);
  else if (owner === INTERACTION_INPUT.PORT_WAIT) handlePortWaitKeyDown(event);
  else if (owner === INTERACTION_INPUT.FISHING) event.preventDefault();
  else if (owner === INTERACTION_INPUT.WORLD) return false;
  else throw new Error(`Unknown interaction input owner: ${owner}`);
  return true;
}

function dispatchWorldOverlayPointerDown(event, point) {
  const owner = currentInteractionInputOwner();
  if (owner === INTERACTION_INPUT.WORLD) return false;
  event.preventDefault();
  if (owner !== INTERACTION_INPUT.FISHING && typeof canvas.setPointerCapture === "function") {
    canvas.setPointerCapture(event.pointerId);
  }
  if (owner === INTERACTION_INPUT.OPTIONS) handleOptionsPointerDown(point);
  else if (owner === INTERACTION_INPUT.CREDITS) handleCreditsPointerDown(point);
  else if (owner === INTERACTION_INPUT.PAST_VOYAGES) handlePastVoyagesPointerDown(point);
  else if (owner === INTERACTION_INPUT.START_MENU) handleStartMenuPointerDown(point);
  else if (owner === INTERACTION_INPUT.CAPTAIN_ALERT) handleCaptainAlertPointerDown(point);
  else if (owner === INTERACTION_INPUT.PLAYER_INTRO) handlePlayerIntroPointerDown(point);
  else if (owner === INTERACTION_INPUT.GAME_OVER) {
    if (gameOverRestartIsAvailable(lastFrameMs)) restartAfterGameOver();
  } else if (owner === INTERACTION_INPUT.CAPTAIN_MENU) handleCaptainMenuPointerDown(point);
  else if (owner === INTERACTION_INPUT.SHIP_INFO) handleShipInfoPointerDown(point);
  else if (owner === INTERACTION_INPUT.POLITICS) handlePoliticsPointerDown(point);
  else if (owner === INTERACTION_INPUT.DISCOVERIES) handleDiscoveriesPointerDown(point);
  else if (owner === INTERACTION_INPUT.DIALOGUE) handleDialoguePointerDown(point);
  else if (owner === INTERACTION_INPUT.PORT_WAIT) {
    if (pointInRect(point, portWaitButtonRect)) stopWaitingInPort();
  } else if (owner !== INTERACTION_INPUT.FISHING) {
    throw new Error(`Unknown interaction input owner: ${owner}`);
  }
  return true;
}

function dispatchWorldOverlayPointerMove(point) {
  const owner = currentInteractionInputOwner();
  if (owner === INTERACTION_INPUT.WORLD) return false;
  if (owner === INTERACTION_INPUT.OPTIONS) {
    updateOptionsSelectionFromPoint(point);
    if (optionsMenu.activeSliderKey) setOptionsVolumeFromPoint(optionsMenu.activeSliderKey, point);
    else dirty = true;
  } else if (owner === INTERACTION_INPUT.START_MENU) {
    if (startMenu.newGameConfirmation) updateNewGameConfirmationSelectionFromPoint(point);
    else updateStartMenuSelectionFromPoint(point);
  } else if (owner === INTERACTION_INPUT.CAPTAIN_ALERT) {
    captainAlertModal.hovered = pointInRect(point, captainAlertModal.buttonRect);
    dirty = true;
  } else if (owner === INTERACTION_INPUT.PLAYER_INTRO) {
    playerIntroModal.hovered = pointInRect(point, playerIntroModal.buttonRect);
    dirty = true;
  } else if (owner === INTERACTION_INPUT.CAPTAIN_MENU) {
    updateCaptainMenuSelectionFromPoint(point);
    dirty = true;
  } else if (owner === INTERACTION_INPUT.DIALOGUE) {
    updateDialogueSelectionFromPoint(point);
    dirty = true;
  } else if (owner !== INTERACTION_INPUT.FISHING) {
    dirty = true;
  }
  return true;
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
    bowFire: createSoundPool(SFX_BOW_FIRE_URL, SFX_BOW_FIRE_POOL_SIZE, "bow fire"),
    arrowHit: createSoundPool(SFX_ARROW_HIT_URL, SFX_ARROW_HIT_POOL_SIZE, "arrow hit"),
    impact: createSoundPool(SFX_IMPACT_URL, SFX_IMPACT_POOL_SIZE, "impact thud"),
    sailDeploy: createSoundPool(SFX_SAIL_DEPLOY_URL, SFX_SAIL_DEPLOY_POOL_SIZE, "sail deployment"),
    discoverySuccess: createSoundPool(SFX_DISCOVERY_SUCCESS_URL, SFX_DISCOVERY_SUCCESS_POOL_SIZE, "discovery success"),
    coinClink: createSoundPool(SFX_COIN_CLINK_URL, SFX_COIN_CLINK_POOL_SIZE, "coin clink"),
    fishing: createSoundPool(SFX_FISHING_URL, SFX_FISHING_POOL_SIZE, "fishing splash"),
    rowing: createSoundPool(SFX_FISHING_URL, SFX_ROWING_POOL_SIZE, "oar stroke"),
    fishingSuccess: createSoundPool(
      SFX_FISHING_SUCCESS_URL,
      SFX_FISHING_SUCCESS_POOL_SIZE,
      "successful fish catch"
    ),
    fishingFailure: createSoundPool(
      SFX_FISHING_FAILURE_URL,
      SFX_FISHING_FAILURE_POOL_SIZE,
      "empty fishing net"
    ),
    scavengeSuccess: createSoundPool(
      SFX_SCAVENGE_SUCCESS_URL,
      SFX_SCAVENGE_SUCCESS_POOL_SIZE,
      "successful shore scavenge"
    ),
    scavengeFailure: createSoundPool(
      SFX_SCAVENGE_FAILURE_URL,
      SFX_SCAVENGE_FAILURE_POOL_SIZE,
      "unsuccessful shore scavenge"
    ),
    lightning: createSoundPool(
      SFX_LIGHTNING_URL,
      SFX_LIGHTNING_POOL_SIZE,
      "storm lightning"
    ),
    harbour: createAmbientLoop(SFX_HARBOUR_URL, "harbour ambience"),
    seagulls: createAmbientLoop(SFX_SEAGULLS_URL, "seagull calls"),
    shoreGulls: createAmbientLoop(SFX_SHORE_GULLS_URL, "shore gulls and waves"),
    harshWind: createAmbientLoop(SFX_HARSH_WIND_URL, "open-water wind"),
    winterWind: createAmbientLoop(SFX_WINTER_WIND_URL, "winter wind"),
    desertWind: createAmbientLoop(SFX_DESERT_WIND_URL, "desert wind"),
    storm: createAmbientLoop(SFX_STORM_URL, "storm"),
    sailFlap: createAmbientLoop(SFX_SAIL_FLAP_URL, "upwind sail flapping"),
    underway: createAmbientLoop(SFX_UNDERWAY_URL, "ship underway"),
    fire: createAmbientLoop(SFX_FIRE_URL, "nearby fire")
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
  if (lakeBattleMode && (
    lakeBattleMode.battle?.phase === LAKE_BATTLE_PHASE_ACTIVE ||
    lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SINKING
  )) return true;
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
  const musicVolume = CAPTURE_SCENARIO ? 0 : clamp(optionsMenu.musicVolume, 0, 1);
  const sfxVolume = clamp(optionsMenu.sfxVolume, 0, 1);
  if (themeMusic) themeMusic.setOutput(musicVolume, optionsMenu.muted);
  if (soundEffects) {
    for (const audio of [
      ...soundEffects.cannon,
      ...soundEffects.bowFire,
      ...soundEffects.arrowHit,
      ...soundEffects.impact,
      ...soundEffects.sailDeploy,
      ...soundEffects.discoverySuccess,
      ...soundEffects.coinClink,
      ...soundEffects.fishing,
      ...soundEffects.rowing,
      ...soundEffects.fishingSuccess,
      ...soundEffects.fishingFailure,
      ...soundEffects.scavengeSuccess,
      ...soundEffects.scavengeFailure,
      ...soundEffects.lightning
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

function playCannonShotSound(broadsideCount, distancePx = 0) {
  const countGain = 0.72 + Math.min(0.28, Math.max(0, broadsideCount - 1) * 0.025);
  const distanceGain = cannonShotDistanceGain(distancePx);
  playSoundEffect(
    soundEffects?.cannon,
    SFX_CANNON_VOLUME * countGain * distanceGain,
    0.94 + Math.random() * 0.1
  );
}

function playLightningStrikeSound() {
  playSoundEffect(soundEffects?.lightning, SFX_LIGHTNING_VOLUME, 1);
}

function playBowFireSound() {
  playSoundEffect(soundEffects?.bowFire, SFX_BOW_FIRE_VOLUME, 0.94 + Math.random() * 0.1);
}

function playArrowHitSound() {
  playSoundEffect(soundEffects?.arrowHit, SFX_ARROW_HIT_VOLUME, 0.95 + Math.random() * 0.08);
}

function playNavalAttackSound(weapon, broadsideCount, distancePx = 0) {
  if (weapon.kind === NAVAL_WEAPON_ARROW) {
    playBowFireSound();
    return;
  }
  if (weapon.kind === NAVAL_WEAPON_CANNON) {
    playCannonShotSound(broadsideCount, distancePx);
    return;
  }
  throw new Error(`Unknown naval attack sound: ${weapon.kind}`);
}

function playNavalImpactSound(projectile) {
  if (projectile.kind === NAVAL_WEAPON_ARROW) {
    playArrowHitSound();
    return;
  }
  playCannonImpactSound(Math.hypot(
    projectile.targetX - projectile.startX,
    projectile.targetY - projectile.startY
  ));
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

function playFishingSound() {
  playSoundEffect(soundEffects?.fishing, SFX_FISHING_VOLUME, 0.94 + Math.random() * 0.12);
}

function playRowingStrokeSound(spec) {
  playSoundEffect(
    soundEffects?.rowing,
    spec.volume,
    spec.playbackRate * (0.97 + Math.random() * 0.06)
  );
}

function playFishingSuccessSound() {
  playSoundEffect(soundEffects?.fishingSuccess, SFX_FISHING_SUCCESS_VOLUME, 0.98 + Math.random() * 0.04);
}

function playFishingFailureSound() {
  playSoundEffect(soundEffects?.fishingFailure, SFX_FISHING_FAILURE_VOLUME, 0.98 + Math.random() * 0.04);
}

function playScavengeSuccessSound() {
  playSoundEffect(soundEffects?.scavengeSuccess, SFX_SCAVENGE_SUCCESS_VOLUME, 0.96 + Math.random() * 0.06);
}

function playScavengeFailureSound() {
  playSoundEffect(soundEffects?.scavengeFailure, SFX_SCAVENGE_FAILURE_VOLUME, 0.98 + Math.random() * 0.04);
}

function updateAmbientAudio(dt) {
  if (!soundEffects) return;
  const shore = shoreProximity();
  const sailing = sailingAmbientTargets(dt);
  updateRowingStrokeAudio(dt, sailing.rowing);
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
  changed = updateAmbientLoop(
    soundEffects.fire,
    visibleFireSoundPresence() * SFX_FIRE_MAX_VOLUME,
    SFX_FIRE_MAX_VOLUME,
    dt,
    SFX_FIRE_FADE_PER_SECOND
  ) || changed;
  if (changed) applyThemeAudioSettings();
}

function updateRowingStrokeAudio(dt, active) {
  const spec = ship ? ROWING_SHIP_ANIMATION_SPECS.get(ship.typeSlug) : null;
  if (!spec) {
    advanceRowingCadence(rowingCadenceState, { active: false, dt, periodSeconds: 1 });
    return;
  }
  const stroke = advanceRowingCadence(rowingCadenceState, {
    active,
    dt,
    periodSeconds: spec.frames * spec.frameMs / 1000
  });
  if (stroke) playRowingStrokeSound(spec);
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
    soundEffects.underway,
    soundEffects.fire
  ].filter(Boolean);
}

function visibleFireSoundPresence() {
  if (!chart || !localLayout || !ship) return 0;
  let nearestDistanceSquared = Infinity;
  for (const source of visibleWorldFireSources()) {
    nearestDistanceSquared = Math.min(
      nearestDistanceSquared,
      distance2(localLayout.viewX, localLayout.viewY, source.x, source.y)
    );
  }
  return Number.isFinite(nearestDistanceSquared)
    ? fireSoundPresence(Math.sqrt(nearestDistanceSquared))
    : 0;
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
  const paused = Boolean(dialogueState || menusAreOpen() || gameOverReason);
  const rowing = !paused && playerShipIsRowing();
  if (!anchored) {
    return {
      ...targets,
      sailFlap: ship.stats.propulsion !== SHIP_PROPULSION_OAR && !rowing ? targets.sailFlap : 0,
      underway: rowing ? 0 : targets.underway,
      rowing
    };
  }
  return {
    ...targets,
    sailFlap: 0,
    underway: 0,
    rowing: false
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
  if (CAPTURE_SCENARIO) return CAPTURE_SCENARIO.seed;
  const querySeed = new URLSearchParams(window.location.search).get("captainSeed");
  return resolvePlayerCharacterIdentityKey({
    querySeed,
    generatedSeed: randomPlayerCharacterIdentitySeed()
  });
}

function capturePlayerCharacter(character, scenarioValue) {
  const faction = factionById(scenarioValue.player.factionId);
  return Object.freeze({
    ...character,
    nationalityId: faction.id,
    nationalityName: faction.name,
    nationalityAdjective: faction.adjective,
    homePortRealmName: faction.name
  });
}

function applyCaptureShipHeading(playerShip, headingDeg) {
  if (!playerShip?.position) throw new Error("Cannot set capture heading before creating the player ship");
  const frame = northUpCamera(playerShip.position);
  const radians = headingDeg * Math.PI / 180;
  const heading = normalizeTangentOrFallback([
    frame.right[0] * Math.cos(radians) + frame.up[0] * Math.sin(radians),
    frame.right[1] * Math.cos(radians) + frame.up[1] * Math.sin(radians),
    frame.right[2] * Math.cos(radians) + frame.up[2] * Math.sin(radians)
  ], playerShip.position, frame.right);
  playerShip.heading = heading;
  playerShip.targetHeading = heading.slice();
}

function applyCaptureDiplomacy(state, relations) {
  const diplomacy = state?.relations?.diplomacy;
  if (!diplomacy) throw new Error("Capture scenario cannot configure missing world diplomacy");
  for (const relation of relations) {
    diplomacy.overrides[diplomacyPairKey(relation.factionAId, relation.factionBId)] = relation.relation;
  }
  validateWorldDiplomacy(diplomacy);
}

function setupCaptureMode() {
  if (!CAPTURE_SCENARIO) throw new Error("Capture mode requires a scenario");
  applyResponsiveViewport(CAPTURE_VIEWPORT.width, CAPTURE_VIEWPORT.height);
  document.body.classList.add("capture-mode");
  captureRecorder = new CaptureRecorder({
    canvas,
    scenario: CAPTURE_SCENARIO,
    maxSeconds: CAPTURE_MAX_SECONDS,
    simMinute: () => weatherClockMinutes
  });
  createCaptureControls({
    shell,
    scenario: CAPTURE_SCENARIO,
    recorder: captureRecorder,
    onRecordingStarted: () => {
      capturePlaybackPaused = false;
      ensureGameAudioStarted(true);
      emitCaptureEvent("scenario-start", {
        playerShip: ship.typeSlug,
        playerFaction: ship.factionId,
        encounterIds: CAPTURE_SCENARIO.encounters.map((encounter) => encounter.id)
      });
      dirty = true;
    }
  });
}

function emitCaptureEvent(type, data = {}) {
  return captureRecorder?.recordEvent(type, data) || false;
}

function recordCapturePosition(nowMs) {
  if (!captureRecorder || captureRecorder.state !== "recording" || nowMs - captureLastPositionEventMs < 1000) {
    return;
  }
  captureLastPositionEventMs = nowMs;
  emitCaptureEvent("position", {
    lat: Math.round(latitudeDegForDirection(ship.position) * 10000) / 10000,
    lon: Math.round(longitudeDegForDirection(ship.position) * 10000) / 10000,
    tileId: ship.tileId,
    speed: Math.round(Math.hypot(...ship.velocity) * 1e7) / 1e7,
    heading: shipHeadingFrame()
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

async function loadShipAssetSet(slug) {
  const shipSpriteKey = vehicleSpriteKeyForShipSlug(slug);
  const [spriteAsset, loadedShipLighting] = await Promise.all([
    loadShipSpriteAsset(`${shipSpriteKey}-${SHIP_SPRITE_HEADING_SUFFIX}`, `Player ship: ${slug}`),
    loadShipLightingBake(shipSpriteKey)
  ]);
  return {
    ...spriteAsset,
    lighting: loadedShipLighting
  };
}

function applyPlayerShipType(slug, stats, assets, { stateAlreadyUpdated = false } = {}) {
  shipImage = assets.image;
  shipSinkDepthImage = assets.sinkDepthImage;
  shipWakeAnchors = requiredShipWakeAnchors(slug);
  shipLighting = assets.lighting;
  if (ship) {
    if (gameState && !stateAlreadyUpdated) setPlayerShipStats(gameState, stats);
    ship.typeSlug = slug;
    ship.stats = stats;
    ship.hitPoints = stats.hitPoints;
    ship.maxHitPoints = stats.hitPoints;
    ship.cargoCapacity = gameState?.cargoCapacity || stats.cargoCapacity;
    ship.cargoUsed = gameState ? cargoUsed(gameState) : Math.min(ship.cargoUsed || 0, stats.cargoCapacity);
    ship.wakeParticles = [];
    ship.lastWakeEmit = null;
    ship.navalProjectiles = [];
    ship.cannonSplashes = [];
    cannonSmokeBursts = [];
    hullSplinterBursts = [];
    ship.cannonCooldowns = {
      port: 0,
      starboard: 0
    };
    ship.arrowCooldown = 0;
  }
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
    stepShipInfoView(1);
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

function createLakeBattleModeState() {
  const playerIndex = LAKE_BATTLE_SHIP_SLUGS.indexOf("brigantine");
  const enemyIndex = LAKE_BATTLE_ENEMY_SLUGS.indexOf("caravel");
  if (playerIndex < 0 || enemyIndex < 0) throw new Error("Lake battle default ships are missing from the armed roster");
  return {
    screen: LAKE_BATTLE_SCREEN_SETUP,
    playerIndex,
    enemyIndex,
    selectedIndex: LAKE_BATTLE_SETUP_PLAYER_ROW,
    battle: null,
    sinkEffects: [],
    resultReadyAtMs: null,
    loading: false,
    error: null,
    hoverPoint: null,
    rowRects: [],
    leftArrowRects: [],
    rightArrowRects: [],
    actionRects: [],
    pauseButtonRect: null
  };
}

function openLakeBattleMode() {
  lakeBattleMode = createLakeBattleModeState();
  startMenu = null;
  keys.clear();
  clearPointerSteering();
  syncCanvasAriaLabel();
  preloadLakeBattleShipAsset(selectedLakeBattleSlug("player"));
  preloadLakeBattleShipAsset(selectedLakeBattleSlug("enemy"));
  dirty = true;
}

function closeLakeBattleModeToStartMenu() {
  lakeBattleMode = null;
  lakeBattleTerrainChart = null;
  lakeBattleTerrainChartKey = "";
  combatMusicUntilMs = 0;
  startMenu = createStartMenuState();
  syncCanvasAriaLabel();
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function selectedLakeBattleSlug(side) {
  if (!lakeBattleMode) throw new Error("Lake battle mode is not open");
  if (side === "player") return LAKE_BATTLE_SHIP_SLUGS[lakeBattleMode.playerIndex];
  if (side === "enemy") return LAKE_BATTLE_ENEMY_SLUGS[lakeBattleMode.enemyIndex];
  throw new Error(`Unknown lake battle selection side: ${side}`);
}

function stepLakeBattleShipSelection(side, direction) {
  if (!Number.isInteger(direction) || direction === 0) throw new Error(`Invalid lake battle selection step: ${direction}`);
  const key = side === "player" ? "playerIndex" : side === "enemy" ? "enemyIndex" : null;
  if (!key) throw new Error(`Unknown lake battle selection side: ${side}`);
  const length = side === "player" ? LAKE_BATTLE_SHIP_SLUGS.length : LAKE_BATTLE_ENEMY_SLUGS.length;
  lakeBattleMode[key] = ((lakeBattleMode[key] + direction) % length + length) % length;
  lakeBattleMode.error = null;
  preloadLakeBattleShipAsset(selectedLakeBattleSlug(side));
  dirty = true;
}

function preloadLakeBattleShipAsset(slug) {
  if (lakeBattleCombatantIsCity(slug)) return;
  void ensureLakeBattleShipAsset(slug).catch(() => {
    // ensureLakeBattleShipAsset reports the exact asset failure in the mode and console.
  });
}

async function ensureLakeBattleShipAsset(slug) {
  if (lakeBattleCombatantIsCity(slug)) throw new Error("A lake battle city does not use a ship asset");
  if (lakeBattleShipAssets.has(slug)) return lakeBattleShipAssets.get(slug);
  const npcAsset = npcShipAssetsBySlug?.get(slug);
  if (npcAsset) {
    lakeBattleShipAssets.set(slug, npcAsset);
    return npcAsset;
  }
  const pending = lakeBattleShipAssetPromises.get(slug);
  if (pending) return pending;
  const promise = loadShipSpriteAsset(
    `${vehicleSpriteKeyForShipSlug(slug)}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    `Lake battle ship: ${slug}`
  )
    .then((asset) => {
      lakeBattleShipAssets.set(slug, asset);
      lakeBattleShipAssetPromises.delete(slug);
      dirty = true;
      return asset;
    })
    .catch((error) => {
      lakeBattleShipAssetPromises.delete(slug);
      if (lakeBattleMode) lakeBattleMode.error = `COULD NOT LOAD ${shipLabelForSlug(slug).toUpperCase()}`;
      console.error(`[pixel-globe] lake battle ship asset failed: ${slug}`, error);
      dirty = true;
      throw error;
    });
  lakeBattleShipAssetPromises.set(slug, promise);
  return promise;
}

async function beginLakeBattle() {
  if (!lakeBattleMode || lakeBattleMode.loading) return;
  const mode = lakeBattleMode;
  mode.loading = true;
  mode.error = null;
  dirty = true;
  try {
    const playerSlug = selectedLakeBattleSlug("player");
    const enemySlug = selectedLakeBattleSlug("enemy");
    const assets = [ensureLakeBattleShipAsset(playerSlug)];
    if (!lakeBattleCombatantIsCity(enemySlug)) assets.push(ensureLakeBattleShipAsset(enemySlug));
    await Promise.all(assets);
    if (lakeBattleMode !== mode) return;
    mode.battle = createLakeBattle({
      width: SCREEN_W,
      height: SCREEN_H,
      playerSlug,
      enemySlug,
      shipFootprints: shipFootprintsBySlug
    });
    mode.screen = LAKE_BATTLE_SCREEN_ACTIVE;
    mode.sinkEffects = [];
    mode.resultReadyAtMs = null;
    mode.selectedIndex = 0;
    mode.loading = false;
    mode.pauseButtonRect = null;
    keys.clear();
    clearPointerSteering();
    startCombatMusicForThreat(Math.max(
      lakeBattleCombatantStats(playerSlug).cannons,
      lakeBattleCombatantStats(enemySlug).cannons
    ) >= COMBAT_BIG_BROADSIDE_MIN_CANNONS ? "big" : "small");
  } catch (error) {
    if (lakeBattleMode !== mode) return;
    mode.loading = false;
    mode.error ||= "BATTLE COULD NOT START";
    console.error("[pixel-globe] lake battle could not start", error);
  }
  dirty = true;
}

function restartLakeBattle() {
  if (!lakeBattleMode) return;
  const playerSlug = selectedLakeBattleSlug("player");
  const enemySlug = selectedLakeBattleSlug("enemy");
  if (!lakeBattleShipAssets.has(playerSlug) ||
      (!lakeBattleCombatantIsCity(enemySlug) && !lakeBattleShipAssets.has(enemySlug))) {
    throw new Error("Cannot restart lake battle without both selected ship assets");
  }
  lakeBattleMode.battle = createLakeBattle({
    width: SCREEN_W,
    height: SCREEN_H,
    playerSlug,
    enemySlug,
    shipFootprints: shipFootprintsBySlug
  });
  lakeBattleMode.screen = LAKE_BATTLE_SCREEN_ACTIVE;
  lakeBattleMode.sinkEffects = [];
  lakeBattleMode.resultReadyAtMs = null;
  lakeBattleMode.selectedIndex = 0;
  keys.clear();
  clearPointerSteering();
  startCombatMusicForThreat(Math.max(
    lakeBattleCombatantStats(playerSlug).cannons,
    lakeBattleCombatantStats(enemySlug).cannons
  ) >= COMBAT_BIG_BROADSIDE_MIN_CANNONS ? "big" : "small");
  dirty = true;
}

function returnLakeBattleToSetup() {
  if (!lakeBattleMode) return;
  lakeBattleMode.screen = LAKE_BATTLE_SCREEN_SETUP;
  lakeBattleMode.battle = null;
  lakeBattleMode.sinkEffects = [];
  lakeBattleMode.resultReadyAtMs = null;
  lakeBattleMode.selectedIndex = LAKE_BATTLE_SETUP_PLAYER_ROW;
  lakeBattleMode.error = null;
  combatMusicUntilMs = 0;
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function updateLakeBattleModeFrame(dt, nowMs) {
  if (!lakeBattleMode || optionsMenu.isOpen) return false;
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SINKING) {
    if (!Number.isFinite(lakeBattleMode.resultReadyAtMs)) {
      throw new Error("Lake battle sinking screen has no result deadline");
    }
    if (nowMs >= lakeBattleMode.resultReadyAtMs) {
      lakeBattleMode.screen = LAKE_BATTLE_SCREEN_RESULT;
      lakeBattleMode.selectedIndex = 0;
    }
    dirty = true;
    return true;
  }
  if (lakeBattleMode.screen !== LAKE_BATTLE_SCREEN_ACTIVE) return false;
  const battle = lakeBattleMode.battle;
  if (!battle) throw new Error("Active lake battle screen has no battle state");
  updateLakeBattle(battle, dt, { desiredHeadingRad: lakeBattleInputHeading() });
  processLakeBattleEvents(battle);
  if (battle.phase !== LAKE_BATTLE_PHASE_ACTIVE) {
    startLakeBattleSinkSequence(battle, nowMs);
    keys.clear();
    clearPointerSteering();
  }
  dirty = true;
  return true;
}

function startLakeBattleSinkSequence(battle, nowMs) {
  const defeatedCombatants = [battle.player, battle.enemy].filter((state) => state.hitPoints <= 0);
  if (defeatedCombatants.length === 0) throw new Error("Finished lake battle has no defeated combatant");
  const sunkShips = defeatedCombatants.filter((state) => !lakeBattleCombatantIsCity(state));
  if (sunkShips.length === 0) {
    lakeBattleMode.sinkEffects = [];
    lakeBattleMode.resultReadyAtMs = null;
    lakeBattleMode.screen = LAKE_BATTLE_SCREEN_RESULT;
    lakeBattleMode.selectedIndex = 0;
    return;
  }
  lakeBattleMode.sinkEffects = sunkShips.map((shipState) => ({
    shipId: shipState.id,
    effect: createLakeBattleShipSinkEffect(shipState, nowMs)
  }));
  lakeBattleMode.resultReadyAtMs = nowMs + SHIP_SINK_EFFECT_DURATION_MS;
  lakeBattleMode.screen = LAKE_BATTLE_SCREEN_SINKING;
}

function lakeBattleInputHeading() {
  const battle = lakeBattleMode?.battle;
  if (!battle) return null;
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy += 1;
  if (pointerSteering.active && pointerSteering.point) {
    const px = pointerSteering.point.x - battle.player.x;
    const py = pointerSteering.point.y - battle.player.y;
    const length = Math.hypot(px, py);
    if (length >= POINTER_STEERING_DEADZONE_PX) {
      dx += px / length;
      dy += py / length;
    }
  }
  if (controllerSteering) {
    dx += controllerSteering.dx * controllerSteering.strength;
    dy -= controllerSteering.dy * controllerSteering.strength;
  }
  if (dx === 0 && dy === 0) return null;
  return Math.atan2(dy, dx);
}

function fireLakeBattlePlayerBroadside(sideName) {
  const battle = lakeBattleMode?.battle;
  if (!battle || lakeBattleMode.screen !== LAKE_BATTLE_SCREEN_ACTIVE) return false;
  const fired = fireLakeBattleBroadside(battle, LAKE_BATTLE_PLAYER_ID, sideName);
  if (fired) processLakeBattleEvents(battle);
  dirty = dirty || fired;
  return fired;
}

function processLakeBattleEvents(battle) {
  for (const event of drainLakeBattleEvents(battle)) {
    if (event.type === "fire") {
      const firingShip = lakeBattleShipById(battle, event.shipId);
      const distanceFromPlayer = Math.hypot(
        firingShip.x - battle.player.x,
        firingShip.y - battle.player.y
      );
      playNavalAttackSound({ kind: event.weaponKind }, event.count, distanceFromPlayer);
    } else if (event.type === "hit") {
      if (event.weaponKind === NAVAL_WEAPON_ARROW) playArrowHitSound();
      else playCannonImpactSound(18);
    } else if (event.type === "collision") {
      playCannonImpactSound(8);
    } else if (event.type !== "finished") {
      throw new Error(`Unknown lake battle event: ${event.type}`);
    }
  }
}

function handleLakeBattlePointerDown(pointerId, point) {
  lakeBattleMode.hoverPoint = point;
  if (lakeBattleMode.loading) return;
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SINKING) return;
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SETUP) {
    for (let row = 0; row <= LAKE_BATTLE_SETUP_ENEMY_ROW; row++) {
      if (pointInRect(point, lakeBattleMode.leftArrowRects[row])) {
        lakeBattleMode.selectedIndex = row;
        stepLakeBattleShipSelection(row === 0 ? "player" : "enemy", -1);
        return;
      }
      if (pointInRect(point, lakeBattleMode.rightArrowRects[row])) {
        lakeBattleMode.selectedIndex = row;
        stepLakeBattleShipSelection(row === 0 ? "player" : "enemy", 1);
        return;
      }
    }
    for (let row = 0; row < lakeBattleMode.rowRects.length; row++) {
      if (!pointInRect(point, lakeBattleMode.rowRects[row])) continue;
      lakeBattleMode.selectedIndex = row;
      if (row >= LAKE_BATTLE_SETUP_BEGIN_ROW) activateLakeBattleSetupRow();
      dirty = true;
      return;
    }
    return;
  }
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_ACTIVE) {
    if (pointInRect(point, lakeBattleMode.pauseButtonRect)) {
      lakeBattleMode.screen = LAKE_BATTLE_SCREEN_PAUSED;
      lakeBattleMode.selectedIndex = 0;
      keys.clear();
      clearPointerSteering();
      dirty = true;
      return;
    }
    const broadside = lakeBattleBroadsideSideAtPoint(point);
    if (broadside) {
      beginPointerSteering(pointerId, point, {
        type: "lake-broadside",
        sideName: broadside
      });
      return;
    }
    beginPointerSteering(pointerId, point);
    return;
  }
  const actions = lakeBattleMode.screen === LAKE_BATTLE_SCREEN_PAUSED
    ? LAKE_BATTLE_PAUSE_ACTIONS
    : LAKE_BATTLE_RESULT_ACTIONS;
  for (let index = 0; index < lakeBattleMode.actionRects.length; index++) {
    if (!pointInRect(point, lakeBattleMode.actionRects[index])) continue;
    lakeBattleMode.selectedIndex = index;
    activateLakeBattleAction(actions[index]);
    return;
  }
}

function handleLakeBattlePointerMove(event, point) {
  lakeBattleMode.hoverPoint = point;
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SINKING) {
    dirty = true;
    return;
  }
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_ACTIVE &&
      pointerSteering.active && pointerSteering.pointerId === event.pointerId) {
    event.preventDefault();
    updatePointerSteering(point);
  } else if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SETUP) {
    for (let row = 0; row < lakeBattleMode.rowRects.length; row++) {
      if (pointInRect(point, lakeBattleMode.rowRects[row])) lakeBattleMode.selectedIndex = row;
    }
  } else if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_PAUSED ||
             lakeBattleMode.screen === LAKE_BATTLE_SCREEN_RESULT) {
    for (let index = 0; index < lakeBattleMode.actionRects.length; index++) {
      if (pointInRect(point, lakeBattleMode.actionRects[index])) lakeBattleMode.selectedIndex = index;
    }
  }
  dirty = true;
}

function lakeBattleBroadsideArc(sideName) {
  const battle = lakeBattleMode?.battle;
  if (!battle) throw new Error("Cannot create lake broadside arc without a battle");
  return broadsideArcGeometry({
    screenWidth: SCREEN_W,
    screenHeight: SCREEN_H,
    heading: lakeBattleHeadingVector(battle.player),
    sideName,
    range: lakeBattleWeaponRange(battle.player),
    origin: { x: battle.player.x, y: battle.player.y }
  });
}

function lakeBattleBroadsideSideAtPoint(point) {
  if (!lakeBattleMode?.battle || lakeBattleMode.screen !== LAKE_BATTLE_SCREEN_ACTIVE) return null;
  if (!navalWeaponUsesBroadside(lakeBattleMode.battle.player.weapon)) return null;
  for (const sideName of ["port", "starboard"]) {
    if (pointInBroadsideArc(point, lakeBattleBroadsideArc(sideName), 5)) return sideName;
  }
  return null;
}

function handleLakeBattleKeyDown(event) {
  if (!lakeBattleMode) return;
  event.preventDefault();
  if (lakeBattleMode.loading) return;
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SINKING) return;
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SETUP) {
    handleLakeBattleSetupKeyDown(event.key);
    return;
  }
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_ACTIVE) {
    if (event.key === "Escape") {
      lakeBattleMode.screen = LAKE_BATTLE_SCREEN_PAUSED;
      lakeBattleMode.selectedIndex = 0;
      keys.clear();
      clearPointerSteering();
    } else if (isCannonKey(event.key)) {
      if (!event.repeat) fireLakeBattlePlayerBroadside(cannonSideForKey(event.key));
    } else if (isControlKey(event.key)) {
      keys.add(event.key);
    }
    dirty = true;
    return;
  }
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_PAUSED) {
    handleLakeBattleActionMenuKeyDown(event.key, LAKE_BATTLE_PAUSE_ACTIONS);
    return;
  }
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_RESULT) {
    handleLakeBattleActionMenuKeyDown(event.key, LAKE_BATTLE_RESULT_ACTIONS);
    return;
  }
  throw new Error(`Unknown lake battle screen: ${lakeBattleMode.screen}`);
}

function handleLakeBattleSetupKeyDown(key) {
  if (key === "Escape") {
    closeLakeBattleModeToStartMenu();
    return;
  }
  if (key === "ArrowUp" || key === "ArrowDown") {
    lakeBattleMode.selectedIndex = stepMenuIndex(
      lakeBattleMode.selectedIndex,
      key === "ArrowDown" ? 1 : -1,
      LAKE_BATTLE_SETUP_ROW_COUNT
    );
    dirty = true;
    return;
  }
  if ((key === "ArrowLeft" || key === "ArrowRight") && lakeBattleMode.selectedIndex <= LAKE_BATTLE_SETUP_ENEMY_ROW) {
    stepLakeBattleShipSelection(
      lakeBattleMode.selectedIndex === LAKE_BATTLE_SETUP_PLAYER_ROW ? "player" : "enemy",
      key === "ArrowRight" ? 1 : -1
    );
    return;
  }
  if (key === "Enter" || key === " ") activateLakeBattleSetupRow();
}

function activateLakeBattleSetupRow() {
  if (lakeBattleMode.selectedIndex === LAKE_BATTLE_SETUP_PLAYER_ROW) {
    stepLakeBattleShipSelection("player", 1);
  } else if (lakeBattleMode.selectedIndex === LAKE_BATTLE_SETUP_ENEMY_ROW) {
    stepLakeBattleShipSelection("enemy", 1);
  } else if (lakeBattleMode.selectedIndex === LAKE_BATTLE_SETUP_BEGIN_ROW) {
    void beginLakeBattle();
  } else if (lakeBattleMode.selectedIndex === LAKE_BATTLE_SETUP_BACK_ROW) {
    closeLakeBattleModeToStartMenu();
  }
}

function handleLakeBattleActionMenuKeyDown(key, actions) {
  if (key === "Escape") {
    if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_PAUSED) {
      lakeBattleMode.screen = LAKE_BATTLE_SCREEN_ACTIVE;
      lakeBattleMode.selectedIndex = 0;
    } else {
      returnLakeBattleToSetup();
    }
    dirty = true;
    return;
  }
  if (key === "ArrowUp" || key === "ArrowDown") {
    lakeBattleMode.selectedIndex = stepMenuIndex(
      lakeBattleMode.selectedIndex,
      key === "ArrowDown" ? 1 : -1,
      actions.length
    );
    dirty = true;
    return;
  }
  if (key === "Enter" || key === " ") activateLakeBattleAction(actions[lakeBattleMode.selectedIndex]);
}

function activateLakeBattleAction(action) {
  if (action === "RESUME") {
    lakeBattleMode.screen = LAKE_BATTLE_SCREEN_ACTIVE;
  } else if (action === "RESTART" || action === "REMATCH") {
    restartLakeBattle();
  } else if (action === "CHOOSE SHIPS") {
    returnLakeBattleToSetup();
  } else if (action === "OPTIONS") {
    openOptionsMenu();
  } else if (action === "START MENU") {
    closeLakeBattleModeToStartMenu();
  } else {
    throw new Error(`Unknown lake battle action: ${action}`);
  }
  dirty = true;
}

function closeStartMenu() {
  startMenu = null;
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function startNewVoyage() {
  familyDebtReturnReminderDelivered = false;
  if (localSaveResult.status === "ready") {
    if (!archiveSavedVoyageBeforeStartingOver()) {
      throw new Error("Could not archive the current voyage before starting over");
    }
    const voyageWasStarted = hasStartedVoyage;
    hasStartedVoyage = false;
    try {
      clearLocalSave();
      const clearedSave = readLocalSave();
      if (clearedSave.status !== "empty") {
        throw new Error(`Local save was not empty after deletion: ${clearedSave.status}`);
      }
      localSaveResult = clearedSave;
    } catch (error) {
      hasStartedVoyage = voyageWasStarted;
      throw error;
    }
    window.location.reload();
    return;
  }
  sailingTutorialState = createSailingTutorialState();
  playerBoundaryAssistContact = null;
  gameState.memory.flags.sailingBasicsElapsedSeconds = 0;
  hasStartedVoyage = true;
  closeStartMenu();
  saveVoyageNow("new voyage");
}

function archiveSavedVoyageBeforeStartingOver() {
  const payload = localSaveResult.status === "ready" ? localSaveResult.save?.payload : null;
  if (!payload) return false;
  try {
    const savedStats = shipStatsForSlug(payload.playerShip.typeSlug);
    const savedState = migrateGameState(payload.gameState, savedStats);
    const record = createPastVoyageRecord({
      state: savedState,
      playerShip: payload.playerShip,
      startMinute: payload.worldClock.voyageStartMinute,
      endMinute: payload.worldClock.currentMinute,
      outcome: "Voyage abandoned for a new expedition.",
      outcomeType: "quit"
    });
    if (!storePastVoyage(record)) {
      throw new Error("Could not store the abandoned voyage in voyage history");
    }
    return true;
  } catch (error) {
    console.warn("[pixel-globe] could not archive the abandoned voyage", error);
    return false;
  }
}

async function continueSavedVoyage() {
  if (!startMenu || startMenu.isLoading || localSaveResult.status !== "ready") return;
  const menu = startMenu;
  menu.isLoading = true;
  menu.message = "";
  dirty = true;
  try {
    await restoreSavedVoyage(localSaveResult.save.payload);
    hasStartedVoyage = true;
    closeStartMenu();
    saveVoyageNow("continued voyage");
  } catch (error) {
    console.warn("[pixel-globe] could not continue the local save", error);
    localSaveResult = { status: "invalid", save: null, error };
    if (startMenu === menu) {
      menu.isLoading = false;
      menu.selectedIndex = 0;
      menu.message = "SAVE COULD NOT BE LOADED";
    }
    dirty = true;
  }
}

async function restoreSavedVoyage(payload) {
  const savedShip = payload.playerShip;
  const stats = shipStatsForSlug(savedShip.typeSlug);
  const restoredGameState = migrateGameState(payload.gameState, stats);
  factionById(savedShip.factionId);
  if (restoredGameState.cargoCapacity !== stats.cargoCapacity) {
    throw new Error("Saved ship capacity does not match its hull");
  }
  if (!Number.isInteger(savedShip.tileId) || !isShipBaseNavigableTile(savedShip.tileId)) {
    throw new Error(`Saved ship tile is not navigable: ${savedShip.tileId}`);
  }
  if (!Number.isFinite(savedShip.hitPoints) || savedShip.hitPoints <= 0 ||
      !Number.isFinite(savedShip.maxHitPoints) || savedShip.maxHitPoints < savedShip.hitPoints) {
    throw new Error("Saved player hull is invalid");
  }
  if (Math.hypot(...savedShip.position) < 0.5 || Math.hypot(...savedShip.heading) < 0.5) {
    throw new Error("Saved player navigation vectors are invalid");
  }
  assignColonizationTargetTile(restoredGameState.memory.colonization, colonizationTargetTileId);
  syncColonizationWorldState(restoredGameState, { startMinute: payload.economy.lastMinute });
  const assets = await loadShipAssetSet(savedShip.typeSlug);
  restoreWorldEconomy(worldEconomy, payload.economy);
  restoreNpcSeaRouteSystem(npcSeaRoutes, payload.npcRoutes, {
    economy: worldEconomy,
    fishState: restoredGameState,
    relationBetween: currentDiplomacyBetween,
    mingTradeOpenToFaction: (factionId) => mingTradeOpenToFaction(restoredGameState, factionId)
  });

  gameState = restoredGameState;
  familyDebtReturnReminderDelivered = false;
  restoreCartographyFromGameState();
  applyCurrentPortConquestOwnership();
  if (!gameState.memory.flags || typeof gameState.memory.flags !== "object") {
    gameState.memory.flags = {};
  }
  sailingTutorialState = createSailingTutorialState({
    earlyWindowSeconds: Number.isFinite(gameState.memory.flags.sailingBasicsElapsedSeconds)
      ? gameState.memory.flags.sailingBasicsElapsedSeconds
      : EARLY_SAILING_HELP_WINDOW_SECONDS
  });
  reconcileQuestPortTiles(gameState, portCities);
  shipImage = assets.image;
  shipSinkDepthImage = assets.sinkDepthImage;
  shipWakeAnchors = requiredShipWakeAnchors(savedShip.typeSlug);
  shipLighting = assets.lighting;
  const position = normalize3(savedShip.position.slice());
  const savedLat = latitudeDegForDirection(position);
  const savedLon = longitudeDegForDirection(position);
  ship = createShip(savedLat, savedLon, savedShip.typeSlug, savedShip.factionId);
  ship.position = position;
  ship.tileId = savedShip.tileId;
  ship.heading = normalizeTangentOrFallback(savedShip.heading, position, WORLD_NORTH);
  ship.targetHeading = normalizeTangentOrFallback(savedShip.targetHeading, position, ship.heading);
  ship.velocity = savedShip.velocity.slice();
  ship.hitPoints = savedShip.hitPoints;
  ship.maxHitPoints = savedShip.maxHitPoints;
  ship.wakeSeedCounter = savedShip.wakeSeedCounter || 0;
  ship.cannonSequence = savedShip.cannonSequence || 0;
  ship.cannonCooldowns = { port: 0, starboard: 0 };
  ship.arrowCooldown = 0;
  ship.wakeParticles = [];
  ship.lastWakeEmit = null;
  ship.navalProjectiles = [];
  ship.cannonSplashes = [];
  cannonSmokeBursts = [];
  hullSplinterBursts = [];

  weatherClockMinutes = payload.worldClock.currentMinute;
  voyageStartClockMinutes = payload.worldClock.voyageStartMinute;
  weatherParts = weatherClockParts(weatherClockMinutes);
  anchored = payload.anchored;
  survivalDeprivationTimers.waterNextMinute = finiteMinuteOrNull(payload.survivalDamageTimers?.waterNextMinute);
  survivalDeprivationTimers.foodNextMinute = finiteMinuteOrNull(payload.survivalDamageTimers?.foodNextMinute);
  playerIntroModal = gameState.memory.campaignGoal?.introSeen === false
    ? createPlayerIntroModal(gameState.playerCharacter)
    : null;
  captainAlertModal = null;
  dialogueState = null;
  dialogueLayout = createDialogueLayoutState();
  fishingAction = null;
  shoreScavengeAction = null;
  portWaitState = null;
  portWaitButtonRect = null;
  discoveryNotice = null;
  discoveryNoticeQueue.length = 0;
  fishCatchNotice = null;
  gameOverReason = null;
  gameOverState = null;
  npcVisualShips.clear();
  shoreBatteryStates.clear();
  npcCombatProjectiles = [];
  npcCombatSplashes = [];
  shipCombatState.engagements.clear();
  shipCollisionCooldowns.clear();
  shipCombatEntryCollisionGrace.clear();
  playerSteeringHoldSeconds = 0;
  playerHaulBlockedSeconds = 0;
  playerBoundaryAssistContact = null;
  keys.clear();
  clearPointerSteering();

  usedCharacterNames = new Set([gameState.playerCharacter.name]);
  for (const character of portCityCharacters.values()) usedCharacterNames.add(character.name);
  campaignGoalContact = createCampaignGoalContact(gameState.playerCharacter, gameState.memory.campaignGoal);
  npcShipCaptains = assignNpcShipCaptains(npcSeaRoutes.ships, characterPortraitManifest, usedCharacterNames);
  await ensureCharacterPortraitLoaded(gameState.playerCharacter, characterExpression(gameState.playerCharacter));
  syncShipCargoFromGameState();
  camera = northUpCamera(ship.position);
  centerTileId = ship.tileId;
  localLayout = createLocalLayout(centerTileId);
  chart = buildChart(camera);
  refreshWeatherState(true);
  setBackgroundMusicTrack("ship", { force: true });
  lastAutosaveMs = performance.now();
  dirty = true;
}

function saveVoyageNow(reason) {
  if (CAPTURE_SCENARIO) return true;
  if (!hasStartedVoyage || !gameState || !ship || gameOverReason || ship.hitPoints <= 0) return false;
  try {
    syncCartographyToGameState();
    const save = writeLocalSave({
      gameState,
      playerShip: snapshotPlayerShip(),
      worldClock: {
        currentMinute: weatherClockMinutes,
        voyageStartMinute: voyageStartClockMinutes
      },
      economy: snapshotWorldEconomy(worldEconomy),
      npcRoutes: snapshotNpcSeaRouteSystem(npcSeaRoutes),
      anchored,
      survivalDamageTimers: { ...survivalDeprivationTimers }
    });
    localSaveResult = { status: "ready", save, error: null };
    if (reason === "new voyage" || reason === "continued voyage") {
      const bytes = new TextEncoder().encode(JSON.stringify(save)).byteLength;
      console.info(`[pixel-globe] local save: ${Math.ceil(bytes / 1024)} KiB`);
    }
    lastAutosaveMs = performance.now();
    return true;
  } catch (error) {
    console.warn(`[pixel-globe] local save failed (${reason})`, error);
    return false;
  }
}

function applyCurrentPortConquestOwnership() {
  if (!gameState?.memory?.conquest) throw new Error("Cannot apply port ownership without conquest state");
  applyPortConquestOwnership(gameState.memory.conquest, portCities);
  const factionByTileId = new Map(portCities.map((city) => [city.tileId, city.factionId]));
  for (const [tileId, factionId] of factionByTileId) {
    const catalogCity = cityByTileId.get(tileId);
    if (catalogCity) factionSyncCity(catalogCity, factionId);
  }
  for (const city of chart?.cityCalls || []) {
    const factionId = factionByTileId.get(city.tileId);
    if (factionId) factionSyncCity(city, factionId);
  }
  if (npcSeaRoutes) {
    applyNpcConquestOwnership(
      npcSeaRoutes,
      factionByTileId,
      new Set(gameState.memory.conquest.collapsedFactionIds)
    );
    for (const state of npcVisualShips.values()) {
      const strategic = npcSeaRoutes.shipById.get(state.id);
      if (strategic) state.factionId = strategic.factionId;
    }
  }
  shoreBatteryStates.clear();
  return factionByTileId;
}

function factionSyncCity(city, factionId) {
  city.foundingFactionId = city.foundingFactionId || city.factionId;
  city.factionId = factionId;
}

function snapshotPlayerShip() {
  return {
    factionId: ship.factionId,
    typeSlug: ship.typeSlug,
    position: ship.position.slice(),
    tileId: ship.tileId,
    heading: ship.heading.slice(),
    targetHeading: ship.targetHeading.slice(),
    velocity: ship.velocity.slice(),
    hitPoints: ship.hitPoints,
    maxHitPoints: ship.maxHitPoints,
    wakeSeedCounter: ship.wakeSeedCounter,
    cannonSequence: ship.cannonSequence
  };
}

function finiteMinuteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function openCreditsMenu() {
  closeOptionsMenu();
  closePastVoyagesMenu();
  closeDiscoveriesMenu();
  closeShipInfoMenu();
  closePoliticsMenu();
  creditsMenu.isOpen = true;
  creditsMenu.page = 0;
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function openPastVoyagesMenu() {
  closeOptionsMenu();
  closeCreditsMenu();
  pastVoyagesMenu.isOpen = true;
  pastVoyagesMenu.page = 0;
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function closePastVoyagesMenu() {
  pastVoyagesMenu.isOpen = false;
  pastVoyagesMenu.panelRect = null;
  pastVoyagesMenu.closeButtonRect = null;
  pastVoyagesMenu.previousPageRect = null;
  pastVoyagesMenu.nextPageRect = null;
  dirty = true;
}

function pastVoyagesPageCount() {
  return voyageHistoryResult.records.length + 1;
}

function stepPastVoyagesPage(direction) {
  const pageCount = pastVoyagesPageCount();
  pastVoyagesMenu.page = stepMenuIndex(pastVoyagesMenu.page, direction, pageCount);
  dirty = true;
}

function closeCreditsMenu() {
  creditsMenu.isOpen = false;
  creditsMenu.panelRect = null;
  creditsMenu.closeButtonRect = null;
  creditsMenu.previousPageRect = null;
  creditsMenu.nextPageRect = null;
  dirty = true;
}

function creditsPageCount() {
  return Math.max(1, Math.ceil(creditsDisplayLines().length / CREDITS_LINES_PER_PAGE));
}

function stepCreditsPage(direction) {
  const pageCount = creditsPageCount();
  creditsMenu.page = clamp(creditsMenu.page + direction, 0, pageCount - 1);
  dirty = true;
}

function openOptionsMenu() {
  closeDiscoveriesMenu();
  closeShipInfoMenu();
  closePoliticsMenu();
  closeCreditsMenu();
  closePastVoyagesMenu();
  optionsMenu.isOpen = true;
  optionsMenu.selectedIndex = 0;
  optionsMenu.activeSliderKey = null;
  optionsMenu.returnError = null;
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
  optionsMenu.returnError = null;
  dirty = true;
}

function returnToStartMenuFromOptions() {
  if (!optionsMenu.isOpen) throw new Error("Cannot return to the start menu while options are closed");
  optionsMenu.returnError = null;

  if (lakeBattleMode) {
    closeOptionsMenu();
    closeLakeBattleModeToStartMenu();
    return true;
  }
  if (startMenu) {
    closeOptionsMenu();
    return true;
  }
  if (hasStartedVoyage && !saveVoyageNow("returned to start menu")) {
    optionsMenu.returnError = "SAVE FAILED - TRY AGAIN";
    dirty = true;
    return false;
  }

  closeOptionsMenu();
  closeCaptainMenu();
  startMenu = createStartMenuState();
  syncCanvasAriaLabel();
  keys.clear();
  clearPointerSteering();
  dirty = true;
  return true;
}

function openCaptainMenu() {
  if (startMenu || gameOverReason || playerIntroModal || captainAlertModal) return;
  closeOptionsMenu();
  closeDiscoveriesMenu();
  closeShipInfoMenu();
  closePoliticsMenu();
  closeCreditsMenu();
  captainMenu.isOpen = true;
  captainMenu.selectedIndex = 0;
  captainMenu.itemRects = [];
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function closeCaptainMenu() {
  captainMenu.isOpen = false;
  captainMenu.panelRect = null;
  captainMenu.closeButtonRect = null;
  captainMenu.itemRects = [];
  dirty = true;
}

function handleCaptainMenuKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape") {
    closeCaptainMenu();
    return;
  }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    captainMenu.selectedIndex = stepMenuIndex(
      captainMenu.selectedIndex,
      direction,
      CAPTAIN_MENU_LABELS.length
    );
    dirty = true;
    return;
  }
  if (event.key === "Enter" || event.key === " ") activateCaptainMenuSelection(captainMenu.selectedIndex);
}

function activateCaptainMenuSelection(index) {
  if (index === 0) openShipInfoMenu();
  else if (index === 1) openPoliticsMenu();
  else if (index === 2) openDiscoveriesMenu();
  else if (index === 3) openOptionsMenu();
}

function handleOptionsKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape") {
    closeOptionsMenu();
    return;
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    const direction = event.key === "ArrowDown" ? 1 : -1;
    optionsMenu.selectedIndex = stepMenuIndex(optionsMenu.selectedIndex, direction, OPTIONS_ROW_COUNT);
    dirty = true;
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    const direction = event.key === "ArrowRight" ? 1 : -1;
    if (optionsMenu.selectedIndex === OPTIONS_ROW_MUSIC) {
      setMusicVolume(optionsMenu.musicVolume + direction * 0.05);
    } else if (optionsMenu.selectedIndex === OPTIONS_ROW_SFX) {
      setSfxVolume(optionsMenu.sfxVolume + direction * 0.05);
    }
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    if (optionsMenu.selectedIndex === OPTIONS_ROW_FULLSCREEN) void toggleFullscreenMode();
    if (optionsMenu.selectedIndex === OPTIONS_ROW_MUTE) toggleAudioMuted();
    if (optionsMenu.selectedIndex === OPTIONS_ROW_START_MENU) returnToStartMenuFromOptions();
    return;
  }
  if (event.key === "m" || event.key === "M") {
    toggleAudioMuted();
  }
}

function handleStartMenuKeyDown(event) {
  event.preventDefault();
  if (startMenu.isLoading) return;
  if (startMenu.newGameConfirmation) {
    handleNewGameConfirmationKeyDown(event.key);
    return;
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const actionCount = startMenuActions().length;
    startMenu.selectedIndex = stepMenuIndex(startMenu.selectedIndex, direction, actionCount);
    dirty = true;
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    activateStartMenuSelection();
    return;
  }
  if (event.key === "Escape") {
    openOptionsMenu();
  }
}

function handleCreditsKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape") {
    closeCreditsMenu();
    return;
  }
  if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
    stepCreditsPage(-1);
  } else if (["ArrowRight", "ArrowDown", "PageDown", "Enter", " "].includes(event.key)) {
    const pageCount = creditsPageCount();
    if (creditsMenu.page >= pageCount - 1 && (event.key === "Enter" || event.key === " ")) closeCreditsMenu();
    else stepCreditsPage(1);
  }
}

function handlePastVoyagesKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape") {
    closePastVoyagesMenu();
    return;
  }
  if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
    stepPastVoyagesPage(-1);
  } else if (["ArrowRight", "ArrowDown", "PageDown", "Enter", " "].includes(event.key)) {
    stepPastVoyagesPage(1);
  }
}

function activateStartMenuSelection() {
  if (!startMenu || startMenu.isLoading) return;
  const action = startMenuActions()[startMenu.selectedIndex];
  if (!action) return;
  if (action.id === START_MENU_ACTION_CONTINUE) {
    void continueSavedVoyage();
    return;
  }
  if (action.id === START_MENU_ACTION_NEW_GAME) {
    if (localSaveResult.status === "ready") openNewGameConfirmation();
    else startNewVoyage();
    return;
  }
  if (action.id === START_MENU_ACTION_LAKE_BATTLE) {
    openLakeBattleMode();
    return;
  }
  if (action.id === START_MENU_ACTION_PAST_VOYAGES) {
    openPastVoyagesMenu();
    return;
  }
  if (action.id === START_MENU_ACTION_OPTIONS) {
    openOptionsMenu();
    return;
  }
  if (action.id === START_MENU_ACTION_CREDITS) openCreditsMenu();
}

function handlePointerDown(event) {
  const point = canvasPointFromEvent(event);
  sailingTutorialInputMode = event.pointerType === "touch" || event.pointerType === "pen"
    ? "touch"
    : "mouse";
  optionsMenu.hoverPoint = point;
  captainMenu.hoverPoint = point;
  ensureGameAudioStarted(true);
  if (lakeBattleMode && optionsMenu.isOpen) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    handleOptionsPointerDown(point);
    return;
  }
  if (lakeBattleMode) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    handleLakeBattlePointerDown(event.pointerId, point);
    return;
  }
  if (dispatchWorldOverlayPointerDown(event, point)) return;
  if (!dialogueState && pointInRect(point, expandedRect(getCaptainMenuButtonRect(), 8))) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openCaptainMenu();
    return;
  }
  if (!dialogueState && pointInRect(point, anchorButtonRect)) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    toggleAnchor();
    return;
  }
  if (!dialogueState && pointInRect(point, scavengeButtonRect)) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    startShoreScavenge();
    return;
  }
  if (pointInRect(point, interactionButtonRect)) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openActiveInteractionDialogue();
    return;
  }
  const broadside = navalBroadsideSideAtPoint(point);
  if (broadside) {
    event.preventDefault();
    beginPointerSteering(event.pointerId, point, {
      type: "world-broadside",
      sideName: broadside
    });
    return;
  }
  const clickedShip = npcShipCallAtPoint(point);
  if (clickedShip) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    openShipDialogue(clickedShip);
    return;
  }
  const clickedFish = fishCallAtPoint(point);
  if (clickedFish) {
    event.preventDefault();
    if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(event.pointerId);
    catchFishAtFishery(clickedFish);
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
  captainMenu.hoverPoint = point;
  if (lakeBattleMode && optionsMenu.isOpen) {
    updateOptionsSelectionFromPoint(point);
    if (optionsMenu.activeSliderKey) setOptionsVolumeFromPoint(optionsMenu.activeSliderKey, point);
    else dirty = true;
    return;
  }
  if (lakeBattleMode) {
    handleLakeBattlePointerMove(event, point);
    return;
  }
  if (dispatchWorldOverlayPointerMove(point)) return;
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
  const tapAction = endPointerSteering(event?.pointerId);
  if (tapAction) activatePointerTapAction(tapAction);
  if (optionsMenu.activeSliderKey) {
    optionsMenu.activeSliderKey = null;
    dirty = true;
  }
}

function handleCaptainMenuPointerDown(point) {
  if (pointInRect(point, captainMenu.closeButtonRect)) {
    closeCaptainMenu();
    return;
  }
  updateCaptainMenuSelectionFromPoint(point);
  for (let index = 0; index < captainMenu.itemRects.length; index++) {
    if (!pointInRect(point, captainMenu.itemRects[index])) continue;
    activateCaptainMenuSelection(index);
    return;
  }
}

function updateCaptainMenuSelectionFromPoint(point) {
  for (let index = 0; index < captainMenu.itemRects.length; index++) {
    if (!pointInRect(point, captainMenu.itemRects[index])) continue;
    captainMenu.selectedIndex = index;
    return;
  }
}

function beginPointerSteering(pointerId, point, tapAction = null) {
  pointerSteering.active = true;
  pointerSteering.pointerId = pointerId;
  pointerSteering.point = point;
  pointerSteering.startPoint = point;
  pointerSteering.startedAtMs = performance.now();
  pointerSteering.maxTravelPx = 0;
  pointerSteering.tapAction = tapAction;
  if (typeof canvas.setPointerCapture === "function") canvas.setPointerCapture(pointerId);
  dirty = true;
}

function updatePointerSteering(point) {
  pointerSteering.point = point;
  pointerSteering.maxTravelPx = Math.max(
    pointerSteering.maxTravelPx,
    Math.hypot(point.x - pointerSteering.startPoint.x, point.y - pointerSteering.startPoint.y)
  );
  dirty = true;
}

function endPointerSteering(pointerId) {
  if (!pointerSteering.active) return null;
  if (pointerId !== undefined && pointerSteering.pointerId !== pointerId) return null;
  const heldMs = performance.now() - pointerSteering.startedAtMs;
  const tapAction = pointerSteering.tapAction &&
    heldMs <= POINTER_TAP_ACTION_MAX_MS &&
    pointerSteering.maxTravelPx <= POINTER_TAP_ACTION_MAX_TRAVEL_PX
    ? pointerSteering.tapAction
    : null;
  clearPointerSteering();
  return tapAction;
}

function activatePointerTapAction(action) {
  if (action.type === "world-broadside") {
    fireBroadside(action.sideName);
    return;
  }
  if (action.type === "lake-broadside") {
    fireLakeBattlePlayerBroadside(action.sideName);
    return;
  }
  throw new Error(`Unknown pointer tap action: ${action.type}`);
}

function clearPointerSteering() {
  pointerSteering.active = false;
  pointerSteering.pointerId = null;
  pointerSteering.point = null;
  pointerSteering.startPoint = null;
  pointerSteering.startedAtMs = null;
  pointerSteering.maxTravelPx = 0;
  pointerSteering.tapAction = null;
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
  if (pointInRect(point, optionsMenu.rowRects[OPTIONS_ROW_START_MENU])) {
    optionsMenu.selectedIndex = OPTIONS_ROW_START_MENU;
    returnToStartMenuFromOptions();
  }
}

function handleStartMenuPointerDown(point) {
  if (startMenu.isLoading) return;
  if (startMenu.newGameConfirmation) {
    handleNewGameConfirmationPointerDown(point);
    return;
  }
  updateStartMenuSelectionFromPoint(point);
  for (let i = 0; i < startMenu.buttonRects.length; i++) {
    if (!pointInRect(point, startMenu.buttonRects[i])) continue;
    startMenu.selectedIndex = i;
    activateStartMenuSelection();
    return;
  }
}

function openNewGameConfirmation() {
  if (!startMenu || localSaveResult.status !== "ready") {
    throw new Error("New-game confirmation requires an active saved voyage");
  }
  startMenu.newGameConfirmation = createBinaryConfirmationState();
  startMenu.message = "";
  keys.clear();
  clearPointerSteering();
  dirty = true;
}

function closeNewGameConfirmation() {
  if (!startMenu) return;
  startMenu.newGameConfirmation = null;
  dirty = true;
}

function handleNewGameConfirmationKeyDown(key) {
  const confirmation = startMenu?.newGameConfirmation;
  if (!confirmation) throw new Error("New-game confirmation keyboard input requires an open confirmation");
  if (key === "Escape") {
    closeNewGameConfirmation();
    return;
  }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
    confirmation.selectedIndex = toggleBinaryConfirmationIndex(confirmation.selectedIndex);
    dirty = true;
    return;
  }
  if (key === "Enter" || key === " ") activateNewGameConfirmation();
}

function handleNewGameConfirmationPointerDown(point) {
  const confirmation = startMenu?.newGameConfirmation;
  if (!confirmation) throw new Error("New-game confirmation pointer input requires an open confirmation");
  for (let index = 0; index < confirmation.buttonRects.length; index++) {
    if (!pointInRect(point, confirmation.buttonRects[index])) continue;
    confirmation.selectedIndex = index;
    activateNewGameConfirmation();
    return;
  }
}

function updateNewGameConfirmationSelectionFromPoint(point) {
  const confirmation = startMenu?.newGameConfirmation;
  if (!confirmation) throw new Error("New-game confirmation hover requires an open confirmation");
  for (let index = 0; index < confirmation.buttonRects.length; index++) {
    if (!pointInRect(point, confirmation.buttonRects[index])) continue;
    confirmation.selectedIndex = index;
    dirty = true;
    return;
  }
}

function activateNewGameConfirmation() {
  const confirmation = startMenu?.newGameConfirmation;
  if (!confirmation) throw new Error("Cannot activate a closed new-game confirmation");
  if (confirmation.selectedIndex === BINARY_CONFIRM_NO_INDEX) {
    closeNewGameConfirmation();
    return;
  }
  if (confirmation.selectedIndex !== BINARY_CONFIRM_YES_INDEX) {
    throw new Error(`Unknown new-game confirmation choice: ${confirmation.selectedIndex}`);
  }
  try {
    startNewVoyage();
  } catch (error) {
    console.error("[pixel-globe] could not start a new voyage", error);
    startMenu.newGameConfirmation = null;
    startMenu.message = "COULD NOT END CURRENT VOYAGE";
    dirty = true;
  }
}

function handleCreditsPointerDown(point) {
  if (pointInRect(point, creditsMenu.closeButtonRect)) {
    closeCreditsMenu();
    return;
  }
  if (pointInRect(point, creditsMenu.previousPageRect)) {
    stepCreditsPage(-1);
    return;
  }
  if (pointInRect(point, creditsMenu.nextPageRect)) stepCreditsPage(1);
}

function handlePastVoyagesPointerDown(point) {
  if (pointInRect(point, pastVoyagesMenu.closeButtonRect)) {
    closePastVoyagesMenu();
    return;
  }
  if (pointInRect(point, pastVoyagesMenu.previousPageRect)) {
    stepPastVoyagesPage(-1);
    return;
  }
  if (pointInRect(point, pastVoyagesMenu.nextPageRect)) stepPastVoyagesPage(1);
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
  const pageCount = Math.max(1, Math.ceil(count / discoveriesPageSize()));
  discoveriesMenu.page = stepMenuIndex(discoveriesMenu.page, direction, pageCount);
  dirty = true;
}

function discoveriesPageSize() {
  return SCREEN_W < 300 ? 2 : 3;
}

function stepPoliticsPage(direction) {
  const view = createPoliticsView(gameState);
  if (SCREEN_W < 380) {
    const pagination = compactPoliticsPagination(view);
    politicsMenu.page = stepMenuIndex(politicsMenu.page, direction, pagination.pageCount);
    dirty = true;
    return;
  }
  const page = politicsRowsPage(view, politicsMenu.page + direction, POLITICS_ROWS_PER_PAGE);
  politicsMenu.page = page.page;
  dirty = true;
}

function updateOptionsSelectionFromPoint(point) {
  for (let i = 0; i < optionsMenu.rowRects.length; i++) {
    if (pointInRect(point, optionsMenu.rowRects[i])) {
      optionsMenu.selectedIndex = i;
      dirty = true;
      return;
    }
  }
}

function updateStartMenuSelectionFromPoint(point) {
  for (let i = 0; i < startMenu.buttonRects.length; i++) {
    if (!pointInRect(point, startMenu.buttonRects[i])) continue;
    startMenu.selectedIndex = i;
    dirty = true;
    return;
  }
  dirty = true;
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
    optionRects: [],
    scrollOffset: 0,
    previousRect: null,
    nextRect: null
  };
}

function handleDialogueKeyDown(event) {
  event.preventDefault();
  if (event.key === "Escape") {
    if (dialogueState.kind === "campaign-goal") return;
    closeDialogue();
    return;
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    stepDialogueSelection(event.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    chooseDialogueOption(dialogueState.selectedIndex);
    return;
  }
  if (event.key === "ArrowLeft") {
    if (dialogueState.kind === "campaign-goal") return;
    if (dialogueState.kind === "ship") {
      closeDialogue();
      return;
    }
    if (dialogueState.kind === "port" && ["barred", "disguise-failed"].includes(dialogueState.nodeId)) {
      closeDialogue();
      return;
    }
    dialogueState.nodeId = dialogueState.kind === "port" && dialogueState.nodeId === "disguise-success"
      ? dialogueState.nextPortNodeId || "root"
      : "root";
    dialogueState.selectedIndex = 0;
    dialogueState.feedback = null;
    dirty = true;
  }
}

function handleDialoguePointerDown(point) {
  if (pointInRect(point, dialogueLayout.previousRect)) {
    stepDialogueSelection(-1);
    return;
  }
  if (pointInRect(point, dialogueLayout.nextRect)) {
    stepDialogueSelection(1);
    return;
  }
  updateDialogueSelectionFromPoint(point);
  for (const entry of dialogueLayout.optionRects) {
    if (!pointInRect(point, entry.rect)) continue;
    chooseDialogueOption(entry.index);
    return;
  }
}

function updateDialogueSelectionFromPoint(point) {
  for (const entry of dialogueLayout.optionRects) {
    if (!pointInRect(point, entry.rect)) continue;
    dialogueState.selectedIndex = entry.index;
    return;
  }
}

function stepDialogueSelection(direction) {
  const view = currentDialogueView();
  dialogueState.selectedIndex = stepMenuIndex(
    dialogueState.selectedIndex,
    direction,
    view.options.length
  );
  dirty = true;
}

function handleCanvasWheel(event) {
  if (currentInteractionInputOwner() !== INTERACTION_INPUT.DIALOGUE || Math.abs(event.deltaY) < 1) return;
  event.preventDefault();
  stepDialogueSelection(event.deltaY > 0 ? 1 : -1);
}

function openActiveInteractionDialogue() {
  if (fishingAction) return false;
  const promptTarget = interactionTargetIsUsable(interactionButtonTarget) ? interactionButtonTarget : null;
  const target = promptTarget || activeInteractionTarget();
  if (!target) return false;
  emitCaptureEvent("interaction-opened", {
    kind: target.kind,
    id: target.call?.id || target.call?.tileId || null,
    label: target.call?.displayCity || target.call?.city || target.call?.slug || null
  });
  if (target.kind === "port") openPortDialogue(target.call);
  else if (target.kind === "fish") return catchFishAtFishery(target.call);
  else openShipDialogue(target.call);
  return true;
}

function openPortDialogue(cityCall) {
  if (!gameState) throw new Error("Cannot open port dialogue before game state is ready");
  if (!cityCall.character) throw new Error(`Cannot open dialogue for non-port city: ${cityLabelText(cityCall)}`);
  combatMusicUntilMs = 0;
  setBackgroundMusicTrack(musicTrackForCity(cityCall), { restart: true, force: true });
  if (isColonizationQuestTarget(cityCall) &&
      cityCall.colonizationQuestStage !== COLONIZATION_STAGE_ESTABLISHED) {
    dialogueState = createPortDialogueSession(cityCall, {
      initialNodeId: "colonization",
      admittedToPort: false
    });
    dialogueLayout = createDialogueLayoutState();
    stopShipForDialogue();
    ensureDialoguePortraitLoaded();
    saveVoyageNow("visited Port Royal colony site");
    dirty = true;
    return;
  }
  const entryStatus = portEntryStatus(gameState, cityCall, Math.floor(weatherClockMinutes));
  const conquestStatus = playerPortConquestStatus(cityCall);
  if (!entryStatus.allowed || conquestStatus.canAttempt || conquestStatus.playerAssaultActive) {
    dialogueState = createPortDialogueSession(cityCall, { initialNodeId: "barred" });
    dialogueLayout = createDialogueLayoutState();
    stopShipForDialogue();
    ensureDialoguePortraitLoaded();
    saveVoyageNow("barred from port");
    dirty = true;
    return;
  }

  const needsLoadout = admitPlayerToPort(cityCall);
  const campaignSession = createCampaignHomecomingSession(cityCall, needsLoadout);
  if (campaignSession) {
    dialogueState = campaignSession;
  } else {
    dialogueState = createOrdinaryPortArrivalSession(cityCall, needsLoadout);
  }
  dialogueLayout = createDialogueLayoutState();
  stopShipForDialogue();
  ensureDialoguePortraitLoaded();
  if (!campaignSession) openPendingDiscoveryPortDialogue();
  saveVoyageNow("port arrival");
  dirty = true;
}

function createOrdinaryPortArrivalSession(cityCall, needsLoadout) {
  const passengerQuest = passengerDialogueQuestForCity(cityCall, { createOffer: true });
  const autoPassengerQuest = passengerQuest && shouldAutoOpenPassengerDialogue(cityCall, passengerQuest)
    ? passengerQuest
    : null;
  let questCharacterSession = null;
  if (autoPassengerQuest) {
    markPassengerOfferSeen(gameState, autoPassengerQuest);
    questCharacterSession = createPassengerDialogueSession(cityCall, autoPassengerQuest);
  }
  return createPortArrivalDialogueSession(cityCall, {
    needsLoadout,
    questCharacterSession,
    openDeliveryMission: deliveryMissionShouldOpenOnArrival(gameState, cityCall, portCities)
  });
}

function createCampaignHomecomingSession(cityCall, needsLoadout) {
  const goal = gameState.memory.campaignGoal;
  if (!goal || cityCall.tileId !== goal.homePortTileId) return null;
  const doubloonsBefore = gameState.doubloons;
  const lead = goal.type === CAMPAIGN_GOAL_EXPLORER
    ? retainedOrNearestExplorerLead(cityCall, goal)
    : null;
  const outcome = settleCampaignGoalAtHome(gameState, cityCall, {
    currentMinute: weatherClockMinutes,
    wonderCatalog: discoveryCatalog,
    nextLeadDiscoveryId: lead?.id || null
  });
  if (gameState.doubloons !== doubloonsBefore) playCoinClinkSound();
  const steps = campaignHomecomingSteps(
    goal,
    outcome,
    gameState.playerCharacter,
    discoveryCatalogById
  );
  const session = createCampaignDialogueSession({
    cityTileId: cityCall.tileId,
    steps,
    phase: outcome.completed
      ? `${goal.type}-victory`
      : goal.type,
    continueToPortOnClose: !outcome.completed,
    nextPortNodeId: needsLoadout ? "loadout" : "greeting",
    victoryOnClose: outcome.completed
  });
  session.needsLoadout = needsLoadout;
  return session;
}

function openPendingDiscoveryPortDialogue() {
  const discoveryDialogue = consumePendingDiscoveryPortDialogue(gameState);
  if (!discoveryDialogue) return false;
  return openCaptainAlertModal(discoveryDialogue.message, discoveryDialogue.expressionId);
}

function admitPlayerToPort(cityCall) {
  const needsLoadout = !gameState.ship?.loadoutId;
  visitPort(gameState, cityCall, Math.floor(weatherClockMinutes));
  if (needsLoadout) repairPlayerShipAtPort();
  else applyAutomaticPortServices(cityCall);
  return needsLoadout;
}

function attemptHostilePortEntry(cityCall) {
  const outcome = attemptPortDisguise(
    gameState,
    cityCall,
    Math.floor(weatherClockMinutes),
    Math.random()
  );
  dialogueState.selectedIndex = 0;
  dialogueState.feedback = null;
  if (outcome.success) {
    const needsLoadout = admitPlayerToPort(cityCall);
    dialogueState.admittedToPort = true;
    dialogueState.disguisedEntry = true;
    dialogueState.nextPortNodeId = needsLoadout ? "loadout" : "root";
    dialogueState.nodeId = "disguise-success";
    openPendingDiscoveryPortDialogue();
    saveVoyageNow("entered hostile port in disguise");
  } else {
    dialogueState.nodeId = "disguise-failed";
    saveVoyageNow("failed hostile port disguise");
  }
  dialogueLayout.scrollOffset = 0;
  ensureDialoguePortraitLoaded();
  dirty = true;
}

function playerPortConquestStatus(cityCall) {
  if (!gameState?.ship || !ship) throw new Error("Port conquest requires the player ship");
  const battery = ensureShoreBatteryState(cityCall);
  return {
    ...portConquestStatus({
    city: cityCall,
    batteryDisabled: shoreBatteryIsDisabled(battery, Math.floor(weatherClockMinutes)),
    crew: gameState.ship.crew,
    crewCapacity: gameState.ship.crewCapacity,
    attackerFactionId: ship.factionId
    }),
    playerAssaultActive: playerPortAssaultIsActive(
      gameState.memory.flags,
      cityCall,
      Math.floor(weatherClockMinutes)
    )
  };
}

function attemptPlayerPortConquest(cityCall) {
  const status = playerPortConquestStatus(cityCall);
  const outcome = resolvePortConquest(status, Math.random(), Math.random());
  if (!outcome.success) {
    const lost = loseCrew(gameState, outcome.crewLost);
    syncShipCargoFromGameState();
    closeDialogue();
    showSurvivalNotice(`${lost} MARINES LOST`, "warn");
    if (gameState.ship.crew <= 0) {
      sinkPlayerShip(`The landing force was destroyed during the assault on ${cityLabelText(cityCall)}.`);
    } else {
      openCaptainAlertModal(
        `${cityLabelText(cityCall)} repelled the landing. We lost ${lost} crew in the fighting.`,
        "sad"
      );
      saveVoyageNow("port conquest repelled");
    }
    dirty = true;
    return false;
  }

  const oldFaction = factionById(cityCall.factionId);
  const newFaction = factionById(ship.factionId);
  const prize = receivePortConquestPrize(
    gameState,
    cityCall,
    portConquestPrize(cityCall),
    { simMinute: Math.floor(weatherClockMinutes) }
  );
  const event = recordPortCapture(
    gameState.memory.conquest,
    cityCall,
    ship.factionId,
    Math.floor(weatherClockMinutes),
    "player"
  );
  clearPlayerPortAssault(gameState.memory.flags, cityCall);
  applyCurrentPortConquestOwnership();
  clearCombatForShip(PLAYER_COMBAT_ID);
  npcCombatProjectiles = npcCombatProjectiles.filter((shot) => shot.targetId !== PLAYER_COMBAT_ID);
  const capturedCity = chartPortCallById(event.portId) || portCitiesByTileId.get(event.cityTileId);
  if (!capturedCity) throw new Error(`Captured port disappeared: ${event.portId}`);
  const needsLoadout = admitPlayerToPort(capturedCity);
  dialogueState = createPortArrivalDialogueSession(capturedCity, { needsLoadout });
  dialogueLayout = createDialogueLayoutState();
  stopShipForDialogue();
  ensureDialoguePortraitLoaded();
  const collapseText = event.collapsedFactionId
    ? ` ${oldFaction.name} has collapsed; its remaining ports and ships are now neutral.`
    : "";
  playCoinClinkSound();
  showSurvivalNotice(`${cityLabelText(capturedCity).toUpperCase()} CAPTURED  +${prize.amount} DB`, "good");
  openCaptainAlertModal(
    `${cityLabelText(capturedCity)} has surrendered and now flies the ${newFaction.adjective} flag. ` +
      `The captured treasury yields ${prize.amount} doubloons.${collapseText}`,
    "happy"
  );
  saveVoyageNow("port conquered");
  dirty = true;
  return true;
}

function applyAutomaticPortServices(cityCall) {
  const context = portDialogueContext();
  const repaired = repairPlayerShipAtPort();
  const loadout = restockSelectedShipLoadoutAtPort(gameState, cityCall, ship.stats, context);
  const labels = [];
  if (repaired > 0) labels.push(`HULL +${repaired}`);
  if (loadout?.additions.crew > 0) labels.push(`CREW +${loadout.additions.crew}`);
  if (loadout?.additions.cannons > 0) labels.push(`GUNS +${loadout.additions.cannons}`);
  if (loadout?.additions.water > 0) labels.push(`WATER +${Math.ceil(loadout.additions.water)}`);
  if (loadout?.additions.food > 0) labels.push(`FOOD +${loadout.additions.food}`);
  if (loadout?.spent > 0) playCoinClinkSound();
  syncShipCargoFromGameState();
  if (labels.length > 0) showSurvivalNotice(`PORT: ${labels.join(" ")}`, "good");
}

function repairPlayerShipAtPort() {
  if (!ship) return 0;
  const maxHull = ship.maxHitPoints || ship.stats?.hitPoints || ship.hitPoints;
  if (!Number.isFinite(maxHull) || maxHull <= 0 || ship.hitPoints >= maxHull) return 0;
  const repaired = Math.max(0, Math.round(maxHull - ship.hitPoints));
  ship.hitPoints = maxHull;
  return repaired;
}

function openPassengerDialogue(cityCall, quest) {
  if (!gameState) throw new Error("Cannot open passenger dialogue before game state is ready");
  markPassengerOfferSeen(gameState, quest);
  dialogueState = createPassengerDialogueSession(cityCall, quest, {
    admittedToPort: true,
    continueToPortOnClose: true,
    nextPortNodeId: "root"
  });
  dialogueLayout = createDialogueLayoutState();
  stopShipForDialogue();
  ensureDialoguePortraitLoaded();
  dirty = true;
}

function continuePortDialogueAfterQuestCharacter() {
  const city = currentDialogueCity();
  const initialNodeId = dialogueState.nextPortNodeId || "greeting";
  dialogueState = createPortDialogueSession(city, {
    initialNodeId,
    admittedToPort: dialogueState.admittedToPort === true
  });
  dialogueLayout = createDialogueLayoutState();
  ensureDialoguePortraitLoaded();
  dirty = true;
}

function continuePortDialogueAfterCampaign() {
  const city = currentDialogueCity();
  const needsLoadout = dialogueState.needsLoadout === true;
  dialogueState = createOrdinaryPortArrivalSession(city, needsLoadout);
  dialogueLayout = createDialogueLayoutState();
  ensureDialoguePortraitLoaded();
  openPendingDiscoveryPortDialogue();
  saveVoyageNow("campaign homecoming complete");
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
  fishingAction = null;
  stopShipMotion();
}

function stopShipMotion() {
  if (!ship) return;
  ship.velocity = [0, 0, 0];
  ship.targetHeading = ship.heading.slice();
  ship.wakeParticles = [];
  ship.lastWakeEmit = null;
  clearPointerSteering();
  keys.clear();
}

function toggleAnchor() {
  if (!ship || gameOverReason || shoreScavengeAction) return false;
  if (anchored) {
    anchored = false;
    keys.clear();
    clearPointerSteering();
    playSailDeploySound();
    saveVoyageNow("weighed anchor");
    dirty = true;
    return true;
  }
  if (!canAnchorAtCurrentShore()) return false;
  anchored = true;
  stopShipMotion();
  saveVoyageNow("dropped anchor");
  dirty = true;
  return true;
}

function canAnchorAtCurrentShore() {
  if (!ship || !chart || !localLayout || gameOverReason) return false;
  if (!isShipNavigableTile(ship.tileId) && !isPlayerUsableSurfaceWaterTile(ship.tileId)) return false;
  return Boolean(nearestScavengeShoreCall());
}

function nearestScavengeShoreCall() {
  if (!ship || !chart || !localLayout) return null;
  const maxDistance2 = ANCHOR_SHORE_MAX_PX * ANCHOR_SHORE_MAX_PX;
  let nearest = null;
  let nearestDistance2 = Infinity;
  for (const call of chart.tileCalls) {
    if (isWaterSurfaceRow(call.row)) continue;
    const callDistance2 = distance2(localLayout.viewX, localLayout.viewY, call.x, call.y);
    if (callDistance2 > maxDistance2 || callDistance2 >= nearestDistance2) continue;
    nearest = call;
    nearestDistance2 = callDistance2;
  }
  return nearest;
}

function currentShoreScavengeContext() {
  const shoreCall = nearestScavengeShoreCall();
  if (!shoreCall) throw new Error("Anchored shore scavenging requires a nearby shore tile");
  return shoreScavengeContextForTerrain(
    shoreCall.row,
    graph.latDeg[shoreCall.id],
    Boolean(snowGroundMask?.[shoreCall.id])
  );
}

function startShoreScavenge() {
  if (!anchored || shoreScavengeAction || gameOverReason) return false;
  if (playerStormIntensity() >= STORM_ACTIVE_INTENSITY) {
    showSurvivalNotice("TOO DANGEROUS TO GO ASHORE", "warn");
    return false;
  }
  shoreScavengeAction = {
    startedAtMs: lastFrameMs,
    completesAtMs: lastFrameMs + SCAVENGE_ACTION_MS,
    context: currentShoreScavengeContext()
  };
  stopShipForDialogue();
  showSurvivalNotice("SCAVENGING ASHORE...", "good");
  dirty = true;
  return true;
}

function updateShoreScavenge(nowMs) {
  if (!shoreScavengeAction || nowMs < shoreScavengeAction.completesAtMs) return false;
  const context = shoreScavengeAction.context;
  shoreScavengeAction = null;
  const outcome = rollShoreScavenge(context);
  const narrative = shoreScavengeNarrative(outcome, context);
  if (outcome === SHORE_SCAVENGE_WATER) {
    const noticeLabel = shoreScavengeNoticeLabel(outcome, context);
    const filled = refillFreshWaterFromShore(gameState);
    if (filled > 0) {
      playScavengeSuccessSound();
      showSurvivalNotice(`${noticeLabel}  WATER +${Math.ceil(filled)}`, "good");
      openCaptainAlertModal(`${narrative} We filled the casks.`, "happy");
    } else {
      playScavengeFailureSound();
      showSurvivalNotice(`${noticeLabel}  CASKS CANNOT TAKE MORE`, "warn");
      openCaptainAlertModal(`${narrative} Every cask was already full.`, "concerned");
    }
  } else if (outcome === SHORE_SCAVENGE_FOOD) {
    const noticeLabel = shoreScavengeNoticeLabel(outcome, context);
    const found = stowForagedFood(gameState, foragedFoodQuantity());
    if (found > 0) {
      playScavengeSuccessSound();
      showSurvivalNotice(`${noticeLabel}  FOOD +${found}`, "good");
      openCaptainAlertModal(`${narrative} We gained ${found} food.`, "happy");
    } else {
      playScavengeFailureSound();
      showSurvivalNotice(`${noticeLabel}  HOLD FULL`, "warn");
      openCaptainAlertModal(`${narrative} There was no room in the hold.`, "concerned");
    }
  } else if (outcome === SHORE_SCAVENGE_NOTHING) {
    playScavengeFailureSound();
    showSurvivalNotice("FOUND NOTHING", "warn");
    openCaptainAlertModal(narrative, "sad");
  } else if (outcome === SHORE_SCAVENGE_CASUALTY) {
    const lost = loseCrew(gameState, 1);
    playScavengeFailureSound();
    syncShipCargoFromGameState();
    showSurvivalNotice(`${lost} CREW LOST ASHORE`, "warn");
    if (gameState.ship.crew <= 0) {
      sinkPlayerShip("The last of the crew died while scavenging ashore.");
    } else {
      openCaptainAlertModal(narrative, "sad");
    }
  }
  syncShipCargoFromGameState();
  saveVoyageNow("shore scavenging");
  return true;
}

function startWaitingInPort(city) {
  if (!city || portWaitState || gameOverReason) return false;
  portWaitState = {
    cityTileId: city.tileId,
    portId: city.portId || `city-${city.tileId}`,
    startedAtMinute: weatherClockMinutes,
    disguisedEntry: dialogueState?.disguisedEntry === true,
    mingIllicitTradeAccess: dialogueState?.mingIllicitTradeAccess === true,
    mingIllicitTradeAttempted: dialogueState?.mingIllicitTradeAttempted === true
  };
  resetSurvivalDamageTimers();
  dialogueState = null;
  dialogueLayout = createDialogueLayoutState();
  stopShipForDialogue();
  clearCombatForShip(PLAYER_COMBAT_ID);
  npcCombatProjectiles = npcCombatProjectiles.filter((projectile) => projectile.targetId !== PLAYER_COMBAT_ID);
  saveVoyageNow("waiting in port");
  dirty = true;
  return true;
}

function playerShipIsInvulnerable() {
  return Boolean(portWaitState);
}

function resetSurvivalDamageTimers() {
  survivalDeprivationTimers.waterNextMinute = null;
  survivalDeprivationTimers.foodNextMinute = null;
}

function stopWaitingInPort() {
  if (!portWaitState) return false;
  const city = chartPortCallById(portWaitState.portId) || cityByTileId.get(portWaitState.cityTileId);
  const character = city?.character || (city ? portCityCharacters?.get(city.tileId) : null);
  const disguisedEntry = portWaitState.disguisedEntry === true;
  const mingIllicitTradeAccess = portWaitState.mingIllicitTradeAccess === true;
  const mingIllicitTradeAttempted = portWaitState.mingIllicitTradeAttempted === true;
  portWaitState = null;
  portWaitButtonRect = null;
  if (!city || !character) {
    setBackgroundMusicTrack("ship", { force: true });
    dirty = true;
    return false;
  }
  dialogueState = createPortDialogueSession({
    ...city,
    character,
    portrait: characterExpression(character)
  }, {
    initialNodeId: "root",
    admittedToPort: true,
    disguisedEntry,
    mingIllicitTradeAccess,
    mingIllicitTradeAttempted
  });
  dialogueLayout = createDialogueLayoutState();
  ensureDialoguePortraitLoaded();
  saveVoyageNow("stopped waiting in port");
  dirty = true;
  return true;
}

function handlePortWaitKeyDown(event) {
  event.preventDefault();
  if (event.key === "Enter" || event.key === " " || event.key === "Escape") stopWaitingInPort();
}

function closeDialogue() {
  const wasPortDialogue = dialogueState?.kind === "port" || dialogueState?.kind === "passenger" ||
    (dialogueState?.kind === "campaign-goal" && dialogueState.admittedToPort === true);
  const departureCity = wasPortDialogue && dialogueState.admittedToPort === true
    ? currentDialogueCity()
    : null;
  if (departureCity) applyAutomaticPortServices(departureCity);
  dialogueState = null;
  dialogueLayout = createDialogueLayoutState();
  if (wasPortDialogue) {
    combatMusicUntilMs = 0;
    setBackgroundMusicTrack("ship", { force: true });
    playSailDeploySound();
    saveVoyageNow("left port dialogue");
  }
  dirty = true;
}

function chooseDialogueOption(optionIndex) {
  let result;
  let dialogueNpcShipId = null;
  const previousNodeId = dialogueState.nodeId || null;
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
    if (result.colonizationChanged) {
      syncColonizationWorldState(gameState, { startMinute: weatherClockMinutes });
    }
    syncShipCargoFromGameState();
    if (gameState.doubloons !== doubloonsBefore) playCoinClinkSound();
    saveVoyageNow("port transaction");
    if (result.action?.type === "open-passenger") {
      openPassengerDialogue(currentDialogueCity(), result.action.quest);
      return;
    }
    if (result.action?.type === "purchase-ship") {
      void purchaseShipyardShip(result.action);
      return;
    }
    if (["purchase-viking-longship", "accept-viking-longship-reward"].includes(result.action?.type)) {
      void acquireVikingLongship(result.action);
      return;
    }
    if (result.action?.type === "wait-in-port") {
      startWaitingInPort(currentDialogueCity());
      return;
    }
    if (result.action?.type === "attempt-disguise") {
      attemptHostilePortEntry(currentDialogueCity());
      return;
    }
    if (result.action?.type === "land-marines") {
      attemptPlayerPortConquest(currentDialogueCity());
      return;
    }
  } else if (dialogueState.kind === "passenger") {
    const doubloonsBefore = gameState.doubloons;
    result = selectPassengerDialogueOption(
      dialogueState,
      currentDialogueCity(),
      currentDialoguePassenger(),
      gameState,
      optionIndex,
      portDialogueContext()
    );
    syncShipCargoFromGameState();
    if (gameState.doubloons !== doubloonsBefore) playCoinClinkSound();
    saveVoyageNow("quest decision");
    if (result.action?.type === "open-port") {
      continuePortDialogueAfterQuestCharacter();
      return;
    }
    if (result.action?.type === "envoy-negotiated") {
      const negotiation = result.action.negotiation;
      const event = negotiation.events[0] || null;
      showSurvivalNotice(
        negotiation.mingTradeOpened ? "MING TRADE OPENED" :
          event ? diplomacyEventNotice(event) : "DIPLOMATIC MISSION ADVANCES",
        "good"
      );
      saveVoyageNow("envoy negotiations");
    }
  } else if (dialogueState.kind === "ship") {
    dialogueNpcShipId = dialogueState.npcShipId;
    result = selectShipDialogueOption(dialogueState, currentDialogueShip(), optionIndex);
  } else if (dialogueState.kind === "shore-battery") {
    const city = currentDialogueCity();
    result = selectShoreBatteryDialogueOption(dialogueState, city, optionIndex);
    if (result.action?.type === "purchase-safe-passage") {
      const passage = purchaseFactionSafePassage(gameState, city, Math.floor(weatherClockMinutes));
      const battery = shoreBatteryStates.get(shoreBatteryId(city));
      if (battery) {
        battery.engagedTargetIds.delete(PLAYER_COMBAT_ID);
        battery.playerHailed = false;
      }
      playCoinClinkSound();
      showSurvivalNotice(`${factionById(passage.factionId).adjective.toUpperCase()} PASSAGE  ${passage.days} DAYS`, "good");
      saveVoyageNow("purchased faction safe passage");
      result.action = null;
    } else if (result.action?.type === "refuse-safe-passage") {
      refuseFactionSafePassage(gameState, city.factionId, Math.floor(weatherClockMinutes));
      saveVoyageNow("refused faction safe passage");
      result.action = null;
    }
  } else if (dialogueState.kind === "campaign-goal") {
    result = selectCampaignDialogueOption(dialogueState, optionIndex);
  } else {
    throw new Error(`Unknown dialogue session kind: ${dialogueState.kind}`);
  }
  if (result.action && dialogueNpcShipId) applyShipDialogueAction(dialogueNpcShipId, result.action);
  if (result.action?.type === "campaign-intro-complete") {
    markCampaignGoalIntroSeen(gameState.memory.campaignGoal);
    saveVoyageNow("campaign goal introduced");
  }
  if (result.action?.type === "campaign-victory") {
    completeCampaignVoyage();
    return;
  }
  if (result.closed) {
    if (dialogueState.kind === "campaign-goal" && dialogueState.continueToPortOnClose) {
      continuePortDialogueAfterCampaign();
      return;
    }
    if (dialogueState.continueToPortOnClose) {
      continuePortDialogueAfterQuestCharacter();
      return;
    }
    closeDialogue();
    return;
  }
  if ((dialogueState.nodeId || null) !== previousNodeId) dialogueLayout.scrollOffset = 0;
  clampDialogueSelection();
  ensureDialoguePortraitLoaded();
  dirty = true;
}

async function purchaseShipyardShip(action) {
  if (shipyardPurchaseListingId) return;
  const session = dialogueState;
  const city = currentDialogueCity();
  const yard = shipyardAtPort(worldEconomy.shipyards, city);
  const listing = yard.listing;
  if (!listing || listing.id !== action.listingId || listing.shipSlug !== action.shipSlug) {
    session.feedback = "That vessel is no longer available.";
    dirty = true;
    return;
  }
  shipyardPurchaseListingId = listing.id;
  session.feedback = "The shipwrights are readying the vessel for inspection.";
  dirty = true;
  try {
    const stats = shipStatsForSlug(listing.shipSlug);
    const assets = await loadShipAssetSet(listing.shipSlug);
    if (dialogueState !== session || session.nodeId !== "shipyard") return;
    purchasePlayerShip(gameState, city, stats, listing.price, { simMinute: Math.floor(weatherClockMinutes) });
    claimShipyardListing(worldEconomy.shipyards, city, listing.id);
    applyPlayerShipType(listing.shipSlug, stats, assets, { stateAlreadyUpdated: true });
    syncShipCargoFromGameState();
    playCoinClinkSound();
    session.feedback = `Purchased ${listing.shipLabel} for ${listing.price} doubloons.`;
    session.selectedIndex = 0;
    saveVoyageNow("ship purchase");
  } catch (error) {
    console.error(new Error(`Failed to purchase ${listing.shipLabel}`, { cause: error }));
    session.feedback = error instanceof Error ? error.message : "The ship purchase failed.";
  } finally {
    shipyardPurchaseListingId = null;
    dirty = true;
  }
}

async function acquireVikingLongship(action) {
  if (vikingLongshipAcquisitionPending) return;
  const session = dialogueState;
  const city = currentDialogueCity();
  const rewardDisposition = vikingLongshipRewardDisposition(gameState);
  const acceptingReward = action.type === "accept-viking-longship-reward";
  const purchasing = action.type === "purchase-viking-longship";
  if (
    session?.kind !== "port" ||
    session.nodeId !== "viking-longship" ||
    !isVikingLongshipQuestPort(city) ||
    action.shipSlug !== VIKING_LONGSHIP_SLUG ||
    !vikingLongshipUnlocked(gameState) ||
    (!acceptingReward && !purchasing) ||
    (acceptingReward && rewardDisposition !== VIKING_LONGSHIP_REWARD_PENDING) ||
    (purchasing && rewardDisposition !== VIKING_LONGSHIP_REWARD_DECLINED)
  ) {
    throw new Error("Invalid Viking longship acquisition state");
  }
  vikingLongshipAcquisitionPending = true;
  session.feedback = "The enthusiast is readying the longship for inspection.";
  dirty = true;
  try {
    const stats = shipStatsForSlug(VIKING_LONGSHIP_SLUG);
    const assets = await loadShipAssetSet(VIKING_LONGSHIP_SLUG);
    if (dialogueState !== session || session.nodeId !== "viking-longship") return;
    const transactionContext = { simMinute: Math.floor(weatherClockMinutes) };
    if (acceptingReward) {
      awardPlayerShip(
        gameState,
        city,
        stats,
        "Longship awarded for completing the historical reconstruction",
        transactionContext
      );
      acceptVikingLongshipReward(gameState);
    } else {
      purchasePlayerShip(gameState, city, stats, VIKING_LONGSHIP_PRICE, transactionContext);
      markVikingLongshipPurchased(gameState);
    }
    applyPlayerShipType(VIKING_LONGSHIP_SLUG, stats, assets, { stateAlreadyUpdated: true });
    syncShipCargoFromGameState();
    if (purchasing) playCoinClinkSound();
    session.feedback = acceptingReward
      ? `Accepted ${shipLabelForSlug(VIKING_LONGSHIP_SLUG)} as the reconstruction reward.`
      : `Purchased ${shipLabelForSlug(VIKING_LONGSHIP_SLUG)} for ${VIKING_LONGSHIP_PRICE} doubloons.`;
    session.selectedIndex = 0;
    saveVoyageNow(acceptingReward ? "accepted Viking longship reward" : "Viking longship purchase");
  } catch (error) {
    console.error(new Error("Failed to acquire Viking Longship", { cause: error }));
    session.feedback = error instanceof Error ? error.message : "The longship acquisition failed.";
  } finally {
    vikingLongshipAcquisitionPending = false;
    dirty = true;
  }
}

function applyShipDialogueAction(npcShipId, action) {
  if (action.type === "receive-aid") {
    const granted = receiveEmergencyShipAid(gameState, npcShipId);
    if (!dialogueState || dialogueState.kind !== "ship" || dialogueState.npcShipId !== npcShipId) {
      throw new Error(`Emergency aid dialogue closed before transfer: ${npcShipId}`);
    }
    dialogueState.aidMessage = `Take these stores with our compliments. Food +${granted.food}, water +${granted.water}.`;
    syncShipCargoFromGameState();
    resetSurvivalDamageTimers();
    showSurvivalNotice(`SHIP AID: FOOD +${granted.food}  WATER +${granted.water}`, "good");
    saveVoyageNow("received emergency provisions at sea");
    return;
  }
  if (action.type === "surrender") {
    handleNpcSurrender(npcShipId, PLAYER_COMBAT_ID, { preserveHull: true });
    return;
  }
  if (action.type === "capture-surrendered-ship") {
    void captureSurrenderedShip(npcShipId);
    return;
  }
  if (action.type === "attack") {
    beginPlayerInitiatedCombat(npcShipId);
    return;
  }
  throw new Error(`Unknown ship dialogue result action: ${action.type}`);
}

async function captureSurrenderedShip(npcShipId) {
  if (surrenderedShipCapturePendingId) return;
  const session = dialogueState;
  if (
    !session ||
    session.kind !== "ship" ||
    session.npcShipId !== npcShipId ||
    session.nodeId !== "capture-loading" ||
    session.prize?.candidateShipSlug === undefined
  ) {
    throw new Error(`Invalid surrendered ship capture state: ${npcShipId}`);
  }
  const candidateSlug = session.prize.candidateShipSlug;
  const strategic = npcSeaRoutes.shipById.get(npcShipId);
  if (!strategic || strategic.slug !== candidateSlug) {
    throw new Error(`Surrendered prize is no longer available: ${npcShipId}`);
  }
  if (
    strategic.specie !== 0 ||
    Object.values(strategic.cargo).some((quantity) => quantity !== 0) ||
    strategic.graceUntilPortVisit <= strategic.portVisits
  ) {
    throw new Error(`Surrendered prize is not ready for transfer: ${npcShipId}`);
  }
  surrenderedShipCapturePendingId = npcShipId;
  session.feedback = "Your prize crew are transferring command.";
  dirty = true;
  try {
    const stats = shipStatsForSlug(candidateSlug);
    const assets = await loadShipAssetSet(candidateSlug);
    if (dialogueState !== session || session.nodeId !== "capture-loading") return;
    awardPlayerShip(
      gameState,
      null,
      stats,
      `Captured ${shipLabelForSlug(candidateSlug)} as a surrendered prize`,
      { simMinute: Math.floor(weatherClockMinutes) }
    );
    applyPlayerShipType(candidateSlug, stats, assets, { stateAlreadyUpdated: true });
    ship.hitPoints = stats.hitPoints;
    captureSurrenderedNpcShip(npcSeaRoutes, npcShipId, Math.floor(weatherClockMinutes));
    npcVisualShips.delete(npcShipId);
    shipCombatEntryCollisionGrace.delete(npcShipId);
    syncShipCargoFromGameState();
    showSurvivalNotice(`CAPTURED ${shipLabelForSlug(candidateSlug).toUpperCase()}`, "good");
    saveVoyageNow("captured surrendered ship");
    closeDialogue();
  } catch (error) {
    console.error(new Error(`Failed to capture surrendered ship ${npcShipId}`, { cause: error }));
    if (dialogueState === session) {
      session.nodeId = "capture-confirm";
      session.feedback = error instanceof Error ? error.message : "The prize transfer failed.";
      session.selectedIndex = 0;
    }
  } finally {
    surrenderedShipCapturePendingId = null;
    dirty = true;
  }
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
    const hideoutsWereVisible = pirateHideoutsVisibleToPlayer(gameState);
    recordPiracyAgainstFaction(gameState, factionId, { includeVictim: false });
    if (state) state.playerPiracyRecorded = true;
    if (!hideoutsWereVisible && pirateHideoutsVisibleToPlayer(gameState)) {
      chart = null;
      showSurvivalNotice("PIRATE HIDEOUTS REVEALED", "good");
      dirty = true;
    }
  }
}

function clampDialogueSelection() {
  const view = currentDialogueView();
  dialogueState.selectedIndex = clamp(dialogueState.selectedIndex, 0, Math.max(0, view.options.length - 1));
}

function currentDialogueCity() {
  if (!dialogueState) throw new Error("No active dialogue session");
  if (dialogueState.kind === "port") {
    const portCall = chartPortCallById(dialogueState.portId);
    if (portCall) {
      if (dialogueState.nodeId !== "colonization") return portCall;
      const character = portCall.colonizationQuestStage === COLONIZATION_STAGE_FAILED
        ? gameState.playerCharacter
        : colonizationOrganizer;
      if (!character) throw new Error("Colonization dialogue has no character");
      return {
        ...portCall,
        character,
        portrait: characterExpression(character)
      };
    }
  }
  const city = cityByTileId.get(dialogueState.cityTileId);
  if (!city) throw new Error(`Dialogue city is no longer placed: ${dialogueState.cityTileId}`);
  const questCharacter = dialogueState.kind === "port" && dialogueState.nodeId === "colonization"
    ? city.colonizationQuestStage === COLONIZATION_STAGE_FAILED
      ? gameState.playerCharacter
      : colonizationOrganizer
    : null;
  const character = questCharacter || portCityCharacters?.get(city.tileId);
  if (!character) throw new Error(`Dialogue city has no port character: ${cityLabelText(city)}`);
  return {
    ...city,
    character,
    portrait: characterExpression(character)
  };
}

function chartPortCallById(portId) {
  if (!portId || !chart?.cityCalls) return null;
  return chart.cityCalls.find((call) => call.portId === portId) || null;
}

function currentDialogueView() {
  if (dialogueState.kind === "port") {
    return portDialogueView(dialogueState, currentDialogueCity(), gameState, worldEconomy, portCities, portDialogueContext());
  }
  if (dialogueState.kind === "passenger") {
    return passengerDialogueView(dialogueState, currentDialogueCity(), currentDialoguePassenger(), gameState);
  }
  if (dialogueState.kind === "ship") {
    return shipDialogueView(dialogueState, currentDialogueShip());
  }
  if (dialogueState.kind === "shore-battery") {
    return shoreBatteryDialogueView(dialogueState, currentDialogueCity());
  }
  if (dialogueState.kind === "campaign-goal") {
    return campaignDialogueView(
      dialogueState,
      gameState.playerCharacter,
      campaignGoalContactCharacter()
    );
  }
  throw new Error(`Unknown dialogue session kind: ${dialogueState.kind}`);
}

function portDialogueContext() {
  const city = dialogueState?.cityTileId === undefined
    ? null
    : chartPortCallById(dialogueState.portId) || cityByTileId.get(dialogueState.cityTileId);
  const questOnlyColony = city?.colonizationQuestSite === true &&
    city.colonizationQuestStage !== COLONIZATION_STAGE_ESTABLISHED;
  const shipyard = city && !questOnlyColony ? shipyardAtPort(worldEconomy.shipyards, city) : null;
  const simMinute = Math.floor(weatherClockMinutes);
  return {
    random: Math.random,
    simMinute,
    dayIndex: weatherParts.dayIndex,
    shipPower: playerShipPrivateeringPower(),
    shipStats: ship?.stats || null,
    nearbyShips: nearbyPortTraffic(city),
    stormy: city ? stormIntensityForTile(city.tileId) >= STORM_ACTIVE_INTENSITY * 0.62 : false,
    playerStanding: city?.factionId ? factionReputation(gameState, city.factionId) : 0,
    rivalLabel: portPoliticalRivalLabel(city),
    rulerRumor: city?.factionId ? recentRegionalRulerChange(city.factionId, simMinute) : null,
    historicalGossip: city ? recentHistoricalGossipForPort(city, simMinute) : null,
    shipyard,
    portEntryStatus: city ? portEntryStatus(gameState, city, simMinute) : null,
    portConquestStatus: city && !questOnlyColony ? playerPortConquestStatus(city) : null,
    shipyardRumor: city && !questOnlyColony ? shipyardRumorForPort(worldEconomy.shipyards, city) : null,
    passengerOffer: city && dialogueState?.kind === "port"
      ? pendingPassengerOfferForCity(gameState, city)
      : null
  };
}

function nearbyPortTraffic(city) {
  const counts = { merchants: 0, warships: 0, pirates: 0, fishermen: 0 };
  if (!city || !chart) return counts;
  const portCall = chart.cityCalls?.find((call) => call.tileId === city.tileId);
  if (!portCall) return counts;
  const radius2 = PORT_DIALOGUE_TRAFFIC_RADIUS_PX * PORT_DIALOGUE_TRAFFIC_RADIUS_PX;
  for (const state of npcVisualShips.values()) {
    if (distance2(portCall.x, portCall.y, state.x, state.y) > radius2) continue;
    if (state.role === NPC_ROLE_PIRATE) counts.pirates += 1;
    else if (state.role === NPC_ROLE_WARSHIP) counts.warships += 1;
    else if (state.role === NPC_ROLE_FISHERMAN) counts.fishermen += 1;
    else if (state.role === NPC_ROLE_MERCHANT) counts.merchants += 1;
  }
  return counts;
}

function portPoliticalRivalLabel(city) {
  if (!city?.factionId || city.factionId === PIRATE_FACTION_ID) return null;
  const rivals = FACTIONS
    .filter((faction) => faction.id !== PIRATE_FACTION_ID && faction.id !== city.factionId)
    .filter((faction) => currentDiplomacyBetween(city.factionId, faction.id) === DIPLOMACY_WAR)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (rivals.length === 0) return null;
  const rival = rivals[hashInt(city.tileId) % rivals.length];
  return rival.adjective || rival.name;
}

function passengerDialogueQuestForCity(city, { createOffer = false } = {}) {
  const activeMission = activeTravelMissionQuest(gameState);
  if (activeMission) {
    return activeMission.destinationTileId === city.tileId ? activeMission : null;
  }
  if (!createOffer) return pendingPassengerOfferForCity(gameState, city);
  return travelMissionOfferForCity(gameState, city, portCities, {
    simMinute: Math.floor(weatherClockMinutes),
    relationBetween: currentDiplomacyBetween,
    createCharacter: createPassengerCharacterForQuest
  });
}

function shouldAutoOpenPassengerDialogue(city, quest) {
  if (!quest || (quest.kind !== "passenger" && !isEnvoyQuest(quest))) {
    return false;
  }
  if (quest.destinationTileId === city.tileId && activeTravelMissionQuest(gameState)?.id === quest.id) return true;
  return quest.originTileId === city.tileId && quest.seen !== true;
}

function createPassengerCharacterForQuest({ quest, origin, destination, scenario }) {
  return generatePassengerCharacter({
    identityKey: quest.id,
    originPort: origin,
    destinationPort: destination,
    scenarioId: scenario.id,
    namePortPreference: scenario.namePort,
    manifest: characterPortraitManifest,
    usedNames: usedCharacterNames
  });
}

function playerShipPrivateeringPower() {
  if (!ship) return 0;
  return Math.round((gameState?.ship?.cannons || 0) + (ship.maxHitPoints || ship.stats?.hitPoints || 0));
}

function currentDialogueShip() {
  if (!dialogueState || dialogueState.kind !== "ship") throw new Error("No active ship dialogue session");
  return dialogueShipForId(dialogueState.npcShipId);
}

function dialogueShipForId(npcShipId) {
  const npcShip = npcSeaRoutes?.shipById?.get(npcShipId);
  if (!npcShip) throw new Error(`Dialogue NPC ship no longer exists: ${npcShipId}`);
  const character = npcShipCaptains?.get(npcShip.id);
  if (!character) throw new Error(`Dialogue NPC ship has no captain: ${npcShip.id}`);
  const visualState = npcVisualShips.get(npcShip.id);
  if (!visualState) throw new Error(`Dialogue NPC ship is no longer visible: ${npcShip.id}`);
  const combatGrace = npcShip.graceUntilPortVisit > npcShip.portVisits;
  const inCombatWithPlayer = shipCombatState.engagements.has(engagementKey(PLAYER_COMBAT_ID, npcShip.id));
  const enemy = inCombatWithPlayer || npcShip.role === NPC_ROLE_PIRATE ||
    currentDiplomacyBetween(ship.factionId, npcShip.factionId) === DIPLOMACY_WAR;
  const emergencyAid = shipEmergencyAidNeed(gameState, npcShip.id);
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
    hitPoints: npcShip.hitPoints,
    maxHitPoints: npcShip.maxHitPoints,
    role: npcShip.role,
    roleLabel: npcRoleLabel(npcShip.role),
    fishingNetLabel: npcShip.fishingNetId ? fishingNetById(npcShip.fishingNetId).label : null,
    faction: factionById(npcShip.factionId),
    cargo: { ...npcShip.cargo },
    specie: Math.floor(npcShip.specie),
    destinationName: npcShip.plan?.destination
      ? cityLabelText(npcShip.plan.destination)
      : null,
    stormStatus,
    combatGrace,
    inCombatWithPlayer,
    canOfferEmergencyAid: !enemy && emergencyAid.available,
    playerAttackIsPiracy,
    willOfferSurrender: npcShouldOfferSurrender(npcCombatEntity(visualState), playerCombatEntity()),
    character
  };
}

function currentDialogueSubject() {
  if (dialogueState?.kind === "ship") return currentDialogueShip();
  if (dialogueState?.kind === "passenger") return currentDialoguePassenger();
  if (dialogueState?.kind === "campaign-goal") {
    const character = campaignDialogueCharacter(
      dialogueState,
      gameState.playerCharacter,
      campaignGoalContactCharacter()
    );
    return {
      ...currentDialogueCity(),
      character,
      portrait: characterExpression(character)
    };
  }
  return currentDialogueCity();
}

function currentDialoguePassenger() {
  if (!dialogueState || dialogueState.kind !== "passenger") throw new Error("No active passenger dialogue session");
  const quest = passengerQuestById(gameState, dialogueState.questId);
  if (!quest) throw new Error(`Dialogue passenger quest is no longer available: ${dialogueState.questId}`);
  const character = quest.passenger;
  if (!character) throw new Error(`Passenger quest has no generated character: ${quest.id}`);
  return {
    ...quest,
    character,
    portrait: characterExpression(character)
  };
}

function activeInteractionTarget() {
  if (fishingAction) return null;
  const port = activePortCall();
  if (port) return { kind: "port", call: port };
  const fishCall = activeFishCall();
  if (fishCall) return { kind: "fish", call: fishCall };
  const npcShip = activeNpcShipCall();
  return npcShip ? { kind: "ship", call: npcShip } : null;
}

function activePortCall() {
  if (!chart || !localLayout) return null;
  const currentTileId = ship?.tileId ?? centerTileId;
  const currentPortCalls = (chart.cityCalls || []).filter((call) => call.tileId === currentTileId && call.character);
  if (currentPortCalls.length > 0) {
    return currentPortCalls.find((call) => call.isPirateHideout) || currentPortCalls[0];
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

function activeFishCall() {
  if (!chart || !localLayout || !gameState || !hasShipItem(gameState, SHIP_ITEM_FISHING_NET)) return null;
  return nearestFishCallNearPoint(localLayout.viewX, localLayout.viewY, FISH_INTERACTION_RADIUS_PX);
}

function nearestFishCallNearPoint(x, y, radiusPx) {
  let best = null;
  let bestDistance = Infinity;
  const maxDistance = radiusPx * radiusPx;
  const tileSearchRadius = radiusPx + FISH_SWIM_SEARCH_MARGIN_PX;
  const tileSearchDistance = tileSearchRadius * tileSearchRadius;
  for (const tileCall of chart.tileCalls) {
    const tileDistance = distance2(x, y, tileCall.drawSurfaceX, tileCall.drawSurfaceY);
    if (tileDistance > tileSearchDistance) continue;
    const fishery = fisheryForTileCall(tileCall);
    if (!fishery) continue;
    for (const call of fishIndividualCallsForFishery(tileCall, fishery, lastFrameMs)) {
      const distance = distance2(x, y, call.centerX, call.centerY);
      if (distance > maxDistance || distance >= bestDistance) continue;
      best = fishInteractionCall(call);
      bestDistance = distance;
    }
  }
  return best;
}

function fishInteractionCall(call) {
  return {
    id: call.id,
    label: call.fishery.speciesLabel,
    tileId: call.tileId,
    x: call.centerX,
    y: call.centerY,
    individualId: call.id,
    fishery: call.fishery
  };
}

function fishingChanceForCall(call) {
  if (!gameState) throw new Error("Cannot calculate fishing chance before game state is ready");
  if (!call?.fishery) throw new Error("Cannot calculate fishing chance without a fishery");
  const net = playerFishingNet(gameState);
  return fishingCatchChance(call.fishery.visibleIndividualCount, net.catchRateMultiplier);
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
  if (target.kind === "fish") return fishInteractionCallIsUsable(target.call);
  if (target.kind === "ship") {
    const state = npcVisualShips.get(target.call?.id);
    return npcShipInHailRange(state);
  }
  throw new Error(`Unknown interaction target kind: ${target.kind}`);
}

function fishInteractionCallIsUsable(call) {
  if (!call || !gameState || !hasShipItem(gameState, SHIP_ITEM_FISHING_NET)) return false;
  if (!Number.isFinite(call.x) || !Number.isFinite(call.y)) return false;
  if (!localLayout) return false;
  return distance2(localLayout.viewX, localLayout.viewY, call.x, call.y) <=
    FISH_INTERACTION_RADIUS_PX * FISH_INTERACTION_RADIUS_PX;
}

function fishCallAtPoint(point) {
  if (!point || !chart || !localLayout || !gameState || !hasShipItem(gameState, SHIP_ITEM_FISHING_NET)) return null;
  const offset = chartOffsetPixels(chart);
  let best = null;
  let bestDistance = Infinity;
  for (const call of fishIndividualDrawCalls(chart, lastFrameMs)) {
    const interaction = fishInteractionCall(call);
    if (!fishInteractionCallIsUsable(interaction)) continue;
    const screenX = call.centerX + offset.x;
    const screenY = call.centerY + offset.y;
    const rect = {
      x: screenX - FISH_SPRITE_SIZE / 2 - 5,
      y: screenY - FISH_SPRITE_SIZE / 2 - 5,
      w: FISH_SPRITE_SIZE + 10,
      h: FISH_SPRITE_SIZE + 10
    };
    if (!pointInRect(point, rect)) continue;
    const distance = distance2(point.x, point.y, screenX, screenY);
    if (distance >= bestDistance) continue;
    best = interaction;
    bestDistance = distance;
  }
  return best;
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

function catchFishAtFishery(call) {
  if (!gameState) throw new Error("Cannot catch fish before game state is ready");
  if (fishingAction) return false;
  if (!hasShipItem(gameState, SHIP_ITEM_FISHING_NET)) {
    showFishCatchNotice("NEED FISHING NET", "warn");
    return false;
  }
  if (!fishInteractionCallIsUsable(call)) {
    showFishCatchNotice("FISH MOVED OUT OF REACH", "warn");
    return false;
  }
  const free = cargoFree(gameState);
  if (!canStartFishing(free)) {
    showFishCatchNotice("HOLD FULL", "warn");
    return false;
  }
  const net = playerFishingNet(gameState);
  const chance = fishingChanceForCall(call);
  fishingAction = {
    startMs: lastFrameMs,
    fishery: call.fishery,
    speciesLabel: call.fishery.speciesLabel,
    fishingNetId: net.id,
    side: fishingSideForTarget(localLayout.viewX, call.x),
    catchSucceeded: fishingCatchSucceeds(Math.random(), chance),
    frameIndex: 0,
    cycleIndex: 0
  };
  stopShipMotion();
  playFishingSound();
  dirty = true;
  return true;
}

function updateFishingAction(nowMs) {
  const action = fishingAction;
  if (!action) return false;
  const animation = fishingAnimationState(action.startMs, nowMs);
  if (animation.complete) {
    fishingAction = null;
    resolveFishingAction(action);
    return true;
  }

  const changed = animation.frameIndex !== action.frameIndex || animation.cycleIndex !== action.cycleIndex;
  if (animation.cycleIndex > action.cycleIndex) playFishingSound();
  action.frameIndex = animation.frameIndex;
  action.cycleIndex = animation.cycleIndex;
  return changed;
}

function resolveFishingAction(action) {
  if (!action.catchSucceeded) {
    playFishingFailureSound();
    showFishCatchNotice("NET CAME UP EMPTY", "warn");
    return;
  }

  const free = cargoFree(gameState);
  if (free <= 0) {
    playFishingFailureSound();
    showFishCatchNotice("HOLD FULL", "warn");
    return;
  }
  const result = harvestFishery(
    gameState,
    action.fishery,
    Math.min(fishingNetById(action.fishingNetId).maxCatch, free),
    Math.floor(weatherClockMinutes),
    { actor: "player" }
  );
  if (result.quantity <= 0) {
    playFishingFailureSound();
    showFishCatchNotice("FISHERY DEPLETED", "warn");
    return;
  }
  receiveFishCatch(gameState, result, {
    simMinute: Math.floor(weatherClockMinutes),
    location: "Fishing grounds"
  });
  playFishingSuccessSound();
  syncShipCargoFromGameState();
  const depletedText = result.overfished ? " - OVERFISHED" : "";
  showFishCatchNotice(`CAUGHT ${result.speciesLabel.toUpperCase()} x${result.quantity}${depletedText}`, "good");
  saveVoyageNow("fishing catch");
  dirty = true;
}

function showFishCatchNotice(text, tone) {
  fishCatchNotice = {
    text,
    tone,
    expiresAtMs: lastFrameMs + FISH_NOTICE_MS
  };
  dirty = true;
}

function showSurvivalNotice(text, tone) {
  survivalNotice = {
    text,
    tone,
    expiresAtMs: lastFrameMs + SURVIVAL_NOTICE_MS
  };
  dirty = true;
}

function syncShipCargoFromGameState() {
  if (!ship || !gameState) return;
  ship.cargoCapacity = gameState.cargoCapacity;
  ship.cargoUsed = cargoUsed(gameState);
  ship.cannons = gameState.ship?.cannons || 0;
  ship.crew = gameState.ship?.crew || 0;
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
      if (!cityRequiresPortAccess(city)) continue;
      const alternateTileId = nearestTileMatching(tileId, (id) => placementPredicate(id) && !placed.has(id));
      if (alternateTileId === undefined) {
        throw new Error(`Could not place required port city on an unoccupied land tile: ${city.city}, ${city.country}`);
      }
      tileId = alternateTileId;
    }
    placed.set(tileId, { ...city, tileId });
  }
  return placed;
}

function findColonizationTargetTile() {
  const target = colonizationTargetCoordinates();
  const startId = findNearestTileId(graph, directionIndex, latLonToDirection(target.lat, target.lon));
  const tileId = nearestTileMatching(startId, (id) => (
    isCityDrawableTile(id) &&
    !cityByTileId.has(id) &&
    !cityIsLandlocked(cityPortAccessOptions(id))
  ));
  if (tileId === undefined) throw new Error("Could not place Port Royal on an empty coastal hex");
  return tileId;
}

function syncColonizationWorldState(state, { startMinute = weatherClockMinutes } = {}) {
  if (!state?.memory?.colonization) throw new Error("Cannot sync colonization without quest state");
  if (!Number.isInteger(colonizationTargetTileId)) throw new Error("Port Royal target tile is not assigned");
  if (!colonizationOrganizer) throw new Error("Port Royal colonial organizer is not assigned");
  assignColonizationTargetTile(state.memory.colonization, colonizationTargetTileId);
  const record = colonizationWorldRecord(state.memory.colonization);
  const existing = cityByTileId.get(colonizationTargetTileId);
  if (!record) {
    if (existing?.colonizationQuestSite) cityByTileId.delete(colonizationTargetTileId);
    portCityCharacters.delete(colonizationTargetTileId);
    return null;
  }
  if (existing && !existing.colonizationQuestSite) {
    throw new Error(`Port Royal target tile is occupied by ${cityLabelText(existing)}`);
  }

  cityByTileId.set(record.tileId, record);
  portCityCharacters.set(record.tileId, colonizationOrganizer);
  if (record.colonizationQuestStage !== COLONIZATION_STAGE_ESTABLISHED) {
    chart = null;
    dirty = true;
    return record;
  }

  const portIndex = portCities.findIndex((city) => city.tileId === record.tileId);
  if (portIndex < 0) portCities.push(record);
  else portCities[portIndex] = record;
  portCitiesByTileId.set(record.tileId, record);
  if (!worldEconomyHasPort(worldEconomy, record)) {
    addWorldEconomyPort(worldEconomy, record, startMinute);
  }
  if (npcSeaRoutes && !npcSeaRouteHasPort(npcSeaRoutes, record)) {
    addNpcSeaRoutePort(npcSeaRoutes, record);
  }
  chart = null;
  dirty = true;
  return record;
}

function cityPlacementPredicate(city) {
  if (!cityRequiresPortAccess(city)) return isCityDrawableTile;
  return (tileId) => isCityDrawableTile(tileId) && !cityIsLandlocked(cityPortAccessOptions(tileId));
}

function portCitiesForCharacters() {
  const ports = [...cityByTileId.values()].filter((city) => !cityIsLandlocked(cityPortAccessOptions(city.tileId)));
  if (ports.length === 0) throw new Error("No port cities found for character portrait assignments");
  return ports;
}

function cityPortAccessOptions(tileId) {
  return {
    graph,
    earthRows: earthById,
    reachableNavigationMask: oceanReachableNavigationMask,
    riverMasks,
    tileId
  };
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
    navalProjectiles: [],
    cannonSplashes: [],
    cannonSequence: 0,
    cannonCooldowns: {
      port: 0,
      starboard: 0
    },
    arrowCooldown: 0
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
  const inRiver = shipIsInRiverWater();
  playerSteeringHoldSeconds = inputHeading ? playerSteeringHoldSeconds + dt : 0;
  if (!inputHeading) playerHaulBlockedSeconds = 0;

  const probedBoundaryContact = inputHeading ? playerShipBoundaryContact(inputHeading) : null;
  const boundaryContact = probedBoundaryContact || playerBoundaryAssistContact;
  const haulMotionScale = shipHaulMotionScale({
    inRiver,
    nearShore: !inRiver && (canAnchorAtCurrentShore() || Boolean(boundaryContact))
  });

  const previousHeading = ship.heading;
  if (inputHeading) {
    ship.targetHeading = inputHeading;
    const turnRate = shipTurnRate({
      turnRateRad: ship.stats.turnRateRad,
      speedRad: vectorLength(ship.velocity),
      topSpeedRad: ship.stats.topSpeedRad,
      assistedPivot: Boolean(boundaryContact),
      assistedMultiplier: inRiver ? SHIP_RIVER_TURN_RATE_MULTIPLIER : 1,
      minimumRudderAuthority: SHIP_MINIMUM_RUDDER_AUTHORITY
    });
    ship.heading = rotateTangentToward(
      ship.heading,
      ship.targetHeading,
      ship.position,
      turnRate * dt
    );
  } else {
    ship.targetHeading = ship.heading;
  }

  applyWindAcceleration(dt);
  applyPlayerBoundaryPushOff(inputHeading, boundaryContact);
  applyHeldShipHaulAcceleration(dt, inputHeading, haulMotionScale);
  const previousPosition = ship.position;
  const moveResult = moveShipWithCollision(dt);
  const movedPx = vectorLength([
    ship.position[0] - previousPosition[0],
    ship.position[1] - previousPosition[1],
    ship.position[2] - previousPosition[2]
  ]) * PIXELS_PER_RADIAN;
  const collisionNormal = normalizeBoundaryContactNormal(moveResult.normal);
  playerBoundaryAssistContact = updateBoundaryContactLatch({
    latchedContact: playerBoundaryAssistContact,
    probedContact: probedBoundaryContact
      ? { normal: probedBoundaryContact.normal, clearTravelPx: 0 }
      : null,
    collisionNormal,
    collided: moveResult.collided,
    movedPx,
    releaseDistancePx: SHIP_BOUNDARY_CONTACT_RELEASE_PX
  });
  const blockedWhileHauling = haulMotionScale > 0 && inputHeading &&
    moveResult.collided && movedPx < 0.08;
  playerHaulBlockedSeconds = blockedWhileHauling ? playerHaulBlockedSeconds + dt : 0;
  const recovered = blockedWhileHauling && playerHaulBlockedSeconds >= SHIP_HAUL_RECOVERY_AFTER_SECONDS
    ? recoverPlayerFromNavigationEdge(inputHeading, moveResult.normal, haulMotionScale)
    : false;
  if (recovered) playerHaulBlockedSeconds = 0;
  const wakeChanged = updateShipWake(dt);
  const headingChanged = dot3(previousHeading, ship.heading) < 0.9995;
  const tutorialChanged = updateSailingTutorials(dt, inRiver, movedPx);
  return tutorialChanged || recovered || moveResult.moved || moveResult.collided || headingChanged || wakeChanged || vectorLength(ship.velocity) > 0.0001;
}

function normalizeBoundaryContactNormal(normal) {
  if (!normal) return null;
  return normalizeOrNull(projectTangentVector(normal, ship.position));
}

function playerShipBoundaryContact(inputHeading) {
  const desired = normalizeOrNull(projectTangentVector(inputHeading, ship.position));
  if (!desired) return null;
  const right = normalizeOrNull(cross3(ship.position, desired));
  if (!right) return null;
  const directions = [
    desired,
    scaleVector(desired, -1),
    right,
    scaleVector(right, -1),
    normalizeOrNull([desired[0] + right[0], desired[1] + right[1], desired[2] + right[2]]),
    normalizeOrNull([desired[0] - right[0], desired[1] - right[1], desired[2] - right[2]]),
    normalizeOrNull([-desired[0] + right[0], -desired[1] + right[1], -desired[2] + right[2]]),
    normalizeOrNull([-desired[0] - right[0], -desired[1] - right[1], -desired[2] - right[2]])
  ].filter(Boolean);
  let contact = null;

  for (const direction of directions) {
    const step = scaleVector(direction, SHIP_BOUNDARY_CONTACT_PROBE_PX / PIXELS_PER_RADIAN);
    const probe = attemptShipStep(ship.position, ship.tileId, step);
    if (probe.ok) continue;
    const normal = probe.normal || shipCollisionNormal(ship.position, probe.blockedTileId, step);
    if (!normal) {
      contact ||= { normal: null, escapeAlignment: Infinity };
      continue;
    }
    const normalized = normalizeOrNull(projectTangentVector(normal, ship.position));
    if (!normalized) continue;
    const escapeAlignment = dot3(desired, normalized);
    if (!contact || escapeAlignment < contact.escapeAlignment) {
      contact = { normal: normalized, escapeAlignment };
    }
  }
  return contact;
}

function applyPlayerBoundaryPushOff(inputHeading, boundaryContact) {
  if (!inputHeading || !boundaryContact?.normal) return;
  const desired = normalizeOrNull(projectTangentVector(inputHeading, ship.position));
  if (!desired) return;
  ship.velocity = projectTangentVector(contactPushOffVelocity({
    velocity: ship.velocity,
    desiredDirection: desired,
    obstacleNormal: boundaryContact.normal,
    minimumEscapeSpeedRad: SHIP_CONTACT_ESCAPE_SPEED_RAD
  }), ship.position);
}

function updateSailingTutorials(dt, inRiver, movedPx) {
  const flags = gameState?.memory?.flags;
  const basicsAlreadyShown = flags?.sailingBasicsTutorialShown === true;
  const shouldOpenBasics = updateEarlySailingHelpState(sailingTutorialState, {
    dt,
    movedPx,
    alreadyShown: basicsAlreadyShown,
    eligible: !anchored && !playerHasCombatEngagement()
  });
  if (flags) flags.sailingBasicsElapsedSeconds = sailingTutorialState.earlyWindowSeconds;
  if (shouldOpenBasics) {
    const opened = openSailingHelpModal(sailingTutorialInputMode);
    if (opened && flags) {
      flags.sailingBasicsTutorialShown = true;
      flags.tackingTutorialShown = true;
    }
    return opened;
  }

  const waitingForBasics = !basicsAlreadyShown && earlySailingHelpWindowIsActive(sailingTutorialState);
  const wind = windForTile(ship.tileId);
  const windFlow = windFlowVectorAtShip(wind);
  const propulsion = shipPropulsionPerformance(ship.stats, {
    windStrength: wind.strength,
    sailEfficiency: sailingEfficiency(ship.heading, windFlow),
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD,
    rowerRatio: playerRowerRatio()
  });
  const shouldPrompt = updateSailingTutorialState(sailingTutorialState, {
    dt,
    alreadyShown: gameState?.memory?.flags?.tackingTutorialShown === true,
    eligible: !waitingForBasics && !inRiver && !anchored && !playerHasCombatEngagement(),
    stalled: propulsion.stalled
  });
  if (!shouldPrompt) return false;

  const opened = openCaptainAlertModal(
    "We're head to wind. Turn until the wind V sits outside the bow, then zigzag back upwind. That's tacking.",
    "concerned"
  );
  if (opened) gameState.memory.flags.tackingTutorialShown = true;
  return opened;
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
  if (controllerSteering) {
    dx += controllerSteering.dx * controllerSteering.strength;
    dy += controllerSteering.dy * controllerSteering.strength;
  }
  if (dx === 0 && dy === 0) return null;

  return normalizeTangentOrFallback([
    camera.right[0] * dx + camera.up[0] * dy,
    camera.right[1] * dx + camera.up[1] * dy,
    camera.right[2] * dx + camera.up[2] * dy
  ], ship.position, ship.heading);
}

function pollGamepadControls() {
  const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
  const gamepad = Array.from(pads || []).find((pad) => pad?.connected !== false) || null;
  if (!gamepad) {
    controllerSteering = null;
    controllerButtons = [];
    return;
  }
  const frame = gamepadControlFrame(gamepad, controllerButtons);
  controllerButtons = frame.buttons;
  controllerSteering = frame.steering;
  if (frame.steering || frame.actions.length > 0) sailingTutorialInputMode = "controller";
  for (const action of frame.actions) handleControllerAction(action);
}

function handleControllerAction(action) {
  ensureGameAudioStarted(true);
  if (action === "firePort" || action === "fireStarboard") {
    if (lakeBattleMode) {
      if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_ACTIVE) {
        fireLakeBattlePlayerBroadside(action === "firePort" ? "port" : "starboard");
      }
      return;
    }
    if (shipInfoMenu.isOpen) {
      stepShipInfoView(action === "firePort" ? -1 : 1);
      return;
    }
    if (!menusAreOpen() && !dialogueState && !playerIntroModal && !gameOverReason) {
      fireBroadside(action === "firePort" ? "port" : "starboard");
    }
    return;
  }
  if (action === "anchor") {
    if (!menusAreOpen() && !dialogueState && !playerIntroModal && !gameOverReason &&
      (anchored || canAnchorAtCurrentShore())) toggleAnchor();
    return;
  }
  if (action === "menu") {
    if (lakeBattleMode) {
      dispatchControllerKey("Escape");
      return;
    }
    if (!menusAreOpen() && !dialogueState && !playerIntroModal && !gameOverReason) openCaptainMenu();
    else dispatchControllerKey("Escape");
    return;
  }
  if (action === "confirm") {
    if (controllerUiIsActive()) dispatchControllerKey("Enter");
    else openActiveInteractionDialogue();
    return;
  }
  if (action === "back") {
    dispatchControllerKey("Escape");
    return;
  }
  if (lakeBattleMode?.screen === LAKE_BATTLE_SCREEN_ACTIVE &&
      ["up", "down", "left", "right"].includes(action)) {
    return;
  }
  const key = action === "up"
    ? "ArrowUp"
    : action === "down"
      ? "ArrowDown"
      : action === "left"
        ? "ArrowLeft"
        : action === "right"
          ? "ArrowRight"
          : null;
  if (key) dispatchControllerKey(key);
}

function stepShipInfoView(direction) {
  const views = ["vessel", "ledger", "papers"];
  const index = views.indexOf(shipInfoMenu.view);
  shipInfoMenu.view = views[stepMenuIndex(index, direction, views.length)];
  dirty = true;
}

function controllerUiIsActive() {
  return Boolean(gameOverReason || shipInfoMenu.isOpen || politicsMenu.isOpen || discoveriesMenu.isOpen ||
    optionsMenu.isOpen || creditsMenu.isOpen || pastVoyagesMenu.isOpen || captainMenu.isOpen ||
    startMenu || lakeBattleMode || playerIntroModal ||
    captainAlertModal || dialogueState || portWaitState);
}

function dispatchControllerKey(key) {
  const event = { key, preventDefault() {} };
  if (lakeBattleMode && optionsMenu.isOpen) handleOptionsKeyDown(event);
  else if (lakeBattleMode) handleLakeBattleKeyDown(event);
  else dispatchWorldOverlayKey(event);
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
  const propulsion = shipPropulsionPerformance(ship.stats, {
    windStrength: wind.strength,
    sailEfficiency: efficiency,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD,
    rowerRatio: playerRowerRatio()
  });
  const propulsionAccel = ship.stats.accelerationRad * propulsion.accelerationFactor;

  ship.velocity = [
    ship.velocity[0] + ship.heading[0] * propulsionAccel * dt,
    ship.velocity[1] + ship.heading[1] * propulsionAccel * dt,
    ship.velocity[2] + ship.heading[2] * propulsionAccel * dt
  ];
  ship.velocity = projectTangentVector(ship.velocity, ship.position);
  ship.velocity = scaleVector(ship.velocity, shipDragFactor(propulsion.stalled, dt));
  limitShipSpeed(propulsion.maxSpeedRad);
}

function applyHeldShipHaulAcceleration(dt, inputHeading, motionScale) {
  if (!inputHeading || motionScale <= 0) return;
  const strength = heldShipHaulStrength(playerSteeringHoldSeconds);
  if (strength <= 0) return;
  const direction = normalizeOrNull(projectTangentVector(inputHeading, ship.position));
  if (!direction) return;

  const currentSpeedTowardInput = dot3(ship.velocity, direction);
  const maxSpeed = SHIP_RIVER_HAUL_MAX_SPEED_RAD * motionScale * strength;
  if (currentSpeedTowardInput >= maxSpeed) return;

  const addSpeed = Math.min(
    SHIP_RIVER_HAUL_ACCEL_RAD * motionScale * strength * dt,
    maxSpeed - currentSpeedTowardInput
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

function shipIsInFreshWater() {
  if (!ship || !earthById || !localLayout || !chart) return false;
  const navigation = shipNavigabilityAtLocalPoint(
    localLayout.viewX,
    localLayout.viewY,
    ship.tileId,
    ship.position
  );
  const riverTileId = navigation.riverTileId ?? ship.tileId;
  return shipCanRefillFreshWater({
    navigationKind: navigation.kind,
    riverTileId,
    frozen: Boolean(freshwaterIceMask?.[riverTileId]),
    saltwaterPassageTileIds: SALTWATER_PASSAGE_TILE_IDS
  });
}

function sailingEfficiency(heading, windFlow) {
  return sailingEfficiencyForStats(ship.stats, heading, windFlow);
}

function sailingEfficiencyForStats(stats, heading, windFlow) {
  const alignment = clamp(dot3(heading, windFlow), -1, 1);
  return sailingEfficiencyForAlignment(stats, alignment);
}

function windFlowVectorAtShip(wind) {
  return windFlowVectorAtPosition(wind, ship.position, ship.heading);
}

function windFlowVectorAtPosition(wind, position, fallbackHeading) {
  const flowDir = wind.directionRad + Math.PI;
  return normalizeTangentOrFallback([
    camera.right[0] * Math.cos(flowDir) + camera.up[0] * Math.sin(flowDir),
    camera.right[1] * Math.cos(flowDir) + camera.up[1] * Math.sin(flowDir),
    camera.right[2] * Math.cos(flowDir) + camera.up[2] * Math.sin(flowDir)
  ], position, fallbackHeading);
}

function limitShipSpeed(maxSpeed) {
  if (!Number.isFinite(maxSpeed)) return;
  const speed = vectorLength(ship.velocity);
  if (speed <= maxSpeed) return;
  ship.velocity = scaleVector(ship.velocity, maxSpeed / speed);
}

function moveShipWithCollision(dt) {
  const step = scaleVector(ship.velocity, dt);
  if (vectorLength(step) < 1e-8) return { moved: false, collided: false, normal: null };

  for (const assistedVelocity of playerRiverGatewayVelocities()) {
    const assisted = attemptShipStep(ship.position, ship.tileId, scaleVector(assistedVelocity, dt));
    if (!assisted.ok) continue;
    ship.velocity = projectTangentVector(assistedVelocity, assisted.position);
    applyShipMove(assisted.position, assisted.tileId);
    return { moved: true, collided: false, normal: null };
  }

  const direct = attemptShipStep(ship.position, ship.tileId, step);
  if (direct.ok) {
    applyShipMove(direct.position, direct.tileId);
    return { moved: true, collided: false, normal: null };
  }

  const normal = direct.normal || shipCollisionNormal(ship.position, direct.blockedTileId, step);
  const slide = findShipSlideMove(normal, dt);
  if (slide) {
    ship.velocity = projectTangentVector(slide.velocity, slide.position);
    applyShipMove(slide.position, slide.tileId);
    return { moved: true, collided: true, normal };
  }

  const pushOff = findShipPushOffMove(normal);
  if (pushOff) {
    ship.velocity = projectTangentVector(pushOff.velocity, pushOff.position);
    applyShipMove(pushOff.position, pushOff.tileId);
    return { moved: true, collided: true, normal };
  }

  ship.velocity = scaleVector(projectTangentVector(ship.velocity, ship.position), SHIP_STOP_DAMPING);
  if (vectorLength(ship.velocity) < SHIP_MIN_SLIDE_SPEED_RAD) ship.velocity = [0, 0, 0];
  return { moved: false, collided: true, normal };
}

function recoverPlayerFromNavigationEdge(inputHeading, blockedNormal, motionScale) {
  if (!inputHeading || !localLayout || !chart || !camera) return false;
  const directions = playerHaulRecoveryDirections(inputHeading, blockedNormal);
  for (let radiusPx = 1; radiusPx <= SHIP_HAUL_RECOVERY_MAX_RADIUS_PX; radiusPx++) {
    for (const direction of directions) {
      const candidatePosition = normalize3([
        ship.position[0] + direction[0] * radiusPx / PIXELS_PER_RADIAN,
        ship.position[1] + direction[1] * radiusPx / PIXELS_PER_RADIAN,
        ship.position[2] + direction[2] * radiusPx / PIXELS_PER_RADIAN
      ]);
      const localPoint = localCollisionPointForPosition(ship.position, candidatePosition);
      const collisionTile = localCollisionTileAtPoint(localPoint.x, localPoint.y);
      if (!collisionTile) continue;
      const tileId = collisionTile.tileId;
      const nav = shipNavigabilityAtLocalPoint(localPoint.x, localPoint.y, tileId, candidatePosition);
      if (!nav.ok) continue;
      const recoveryHeading = normalizeTangentOrFallback(inputHeading, candidatePosition, ship.heading);
      const occupancy = vesselOccupancyAtPosition(candidatePosition, tileId, localPoint, nav, recoveryHeading);
      if (!occupancy.ok) continue;

      applyShipMove(candidatePosition, tileId);
      ship.heading = normalizeTangentOrFallback(recoveryHeading, ship.position, ship.heading);
      ship.targetHeading = ship.heading.slice();
      ship.velocity = scaleVector(ship.heading, SHIP_HAUL_RECOVERY_SPEED_RAD * motionScale);
      return true;
    }
  }
  return false;
}

function playerHaulRecoveryDirections(inputHeading, blockedNormal) {
  const desired = normalizeOrNull(projectTangentVector(inputHeading, ship.position));
  if (!desired) return [];
  const candidates = [];
  const away = blockedNormal
    ? normalizeOrNull(projectTangentVector(scaleVector(blockedNormal, -1), ship.position))
    : null;
  if (away) addPlayerHaulRecoveryDirection(candidates, away);
  for (const degrees of [0, 18, -18, 36, -36, 60, -60, 90, -90, 135, -135, 180]) {
    addPlayerHaulRecoveryDirection(candidates, rotateTangentDirection(desired, ship.position, degrees * Math.PI / 180));
  }
  return candidates.map((candidate) => candidate.direction);
}

function addPlayerHaulRecoveryDirection(candidates, direction) {
  if (!direction) return;
  const key = direction.map((value) => Math.round(value * 1000)).join(",");
  if (candidates.some((candidate) => candidate.key === key)) return;
  candidates.push({ key, direction });
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

function findShipPushOffMove(normal) {
  if (!normal) return null;
  const away = normalizeOrNull(projectTangentVector(scaleVector(normal, -1), ship.position));
  if (!away) return null;
  const directions = [
    away,
    rotateTangentDirection(away, ship.position, Math.PI / 6),
    rotateTangentDirection(away, ship.position, -Math.PI / 6),
    rotateTangentDirection(away, ship.position, Math.PI / 3),
    rotateTangentDirection(away, ship.position, -Math.PI / 3)
  ];
  const speed = Math.max(
    vectorLength(ship.velocity) * SHIP_COLLISION_PUSH_OFF_SPEED_KEEP,
    SHIP_MIN_SLIDE_SPEED_RAD
  );

  for (let distancePx = 0.5; distancePx <= SHIP_COLLISION_PUSH_OFF_MAX_PX; distancePx += 0.5) {
    for (const direction of directions) {
      const step = scaleVector(direction, distancePx / PIXELS_PER_RADIAN);
      const candidate = attemptShipStep(ship.position, ship.tileId, step);
      if (!candidate.ok) continue;
      return {
        velocity: scaleVector(direction, speed),
        position: candidate.position,
        tileId: candidate.tileId
      };
    }
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
    const collisionTile = localCollisionTileAtPoint(localPoint.x, localPoint.y);
    if (!collisionTile) return { ok: false };
    const tileId = collisionTile.tileId;
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
    const occupancy = vesselOccupancyAtPosition(position, tileId, localPoint, centerNav, ship.heading);
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

function vesselOccupancyAtPosition(position, tileId, localPoint, centerNav, heading) {
  const sampleRadiusPx = centerNav.kind === "river" ? SHIP_RIVER_COLLISION_RADIUS_PX : SHIP_COLLISION_RADIUS_PX;
  const forward = normalizeTangentOrFallback(heading, position, WORLD_NORTH);
  const side = normalizeOrNull(cross3(position, forward));
  const sampleVectors = side
    ? [forward, side, scaleVector(side, -1)]
    : [forward];

  for (const sampleVector of sampleVectors) {
    const samplePoint = localShipCollisionSamplePoint(sampleVector, sampleRadiusPx, localPoint);
    const collisionTile = localCollisionTileAtPoint(samplePoint.x, samplePoint.y);
    if (!collisionTile) return { ok: false };
    const sampleTileId = collisionTile.tileId;
    const sampleNav = shipNavigabilityAtLocalPoint(samplePoint.x, samplePoint.y, sampleTileId, position);
    if (!sampleNav.ok) return sampleNav;
  }
  return { ok: true };
}

function localShipCollisionSamplePoint(sampleVector, distancePx, localPoint) {
  if (!localLayout || !camera) throw new Error("Cannot sample rendered ship collision without a local layout and camera");
  return {
    x: localPoint.x + dot3(sampleVector, camera.right) * distancePx,
    y: localPoint.y - dot3(sampleVector, camera.up) * distancePx
  };
}

function shipNavigabilityAtLocalPoint(x, y, tileId, position) {
  if (isPlayerUsableSurfaceWaterTile(tileId)) {
    return { ok: true, kind: "openWater" };
  }

  const riverInfo = riverWaterInfoAtLocalPoint(x, y, chart);
  if (riverInfo?.ok) return { ok: true, kind: "river", riverTileId: riverInfo.tileId };

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

function localCollisionTileIdAtPoint(x, y, label) {
  if (!localLayout || !chart?.waterIndex) throw new Error(`Cannot resolve ${label} without an indexed local chart`);
  const nearest = nearestLocalCollisionTileAtPoint(x, y);
  if (!nearest) throw new Error(`Could not resolve ${label}; indexed chart has no nearby tiles`);
  if (nearest.distancePx > SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX) {
    throw new Error(`Could not resolve ${label}; nearest drawn tile was ${nearest.distancePx.toFixed(1)}px away`);
  }
  return nearest.tileId;
}

function localCollisionTileAtPoint(x, y) {
  const nearest = nearestLocalCollisionTileAtPoint(x, y);
  if (!nearest || nearest.distancePx > SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX) return null;
  return nearest;
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
  const toPlayerWater = isPlayerUsableSurfaceWaterTile(toTileId);
  if (!isShipNavigableTile(toTileId) && !toPlayerWater) return false;
  if (fromTileId === toTileId) return true;

  const edgeA = edgeIndexTowardNeighbor(fromTileId, toTileId);
  const edgeB = edgeIndexTowardNeighbor(toTileId, fromTileId);
  if (edgeA === undefined || edgeB === undefined) return false;

  const fromWater = isPlayerUsableSurfaceWaterTile(fromTileId);
  const toWater = toPlayerWater;
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

function isShipBaseNavigableTile(tileId) {
  return isWaterSurfaceRow(earthById[tileId]) || shipTileHasRiver(tileId);
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

function isPlayerUsableSurfaceWaterTile(tileId) {
  if (!ship) return false;
  return isShipUsableSurfaceWater(
    earthById[tileId],
    tileId,
    ship.tileId,
    isShipBlockedByIceTile(tileId)
  );
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
  if (!ship || !camera || !localLayout) return false;
  if (sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown cannon broadside: ${sideName}`);
  }
  const weapon = playerNavalWeapon();
  if (!navalWeaponUsesBroadside(weapon)) return false;
  const broadsideCount = shipBroadsideCannonCount();
  if (ship.cannonCooldowns[sideName] > 0) return false;

  ship.cannonCooldowns[sideName] = weapon.reloadSeconds;
  emitCaptureEvent("weapon-fired", {
    ownerId: PLAYER_COMBAT_ID,
    weapon: weapon.kind,
    side: sideName,
    count: broadsideCount
  });
  startCombatMusicForThreat(broadsideCount >= COMBAT_BIG_BROADSIDE_MIN_CANNONS ? "big" : "small");
  playNavalAttackSound(weapon, broadsideCount);

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
    const range = (CANNON_RANGE_PX + (cannonUnit(seed, 2) * 2 - 1) * CANNON_RANGE_JITTER_PX) *
      weapon.rangeScale;
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
    const projectile = {
      kind: weapon.kind,
      ownerId: PLAYER_COMBAT_ID,
      startX,
      startY,
      targetX,
      targetY,
      age: 0,
      duration: range / (CANNON_SPEED_PX * weapon.speedScale),
      arcHeight: (CANNON_ARC_HEIGHT_PX + cannonUnit(seed, 4) * 4) * weapon.arcHeightScale,
      damage: weapon.damage,
      seed
    };
    ship.navalProjectiles.push(projectile);
    if (projectile.kind === NAVAL_WEAPON_CANNON) addCannonSmokeBurst(projectile);
  }

  if (ship.navalProjectiles.length > NAVAL_MAX_PROJECTILES) {
    ship.navalProjectiles.splice(0, ship.navalProjectiles.length - NAVAL_MAX_PROJECTILES);
  }
  dirty = true;
  return true;
}

function firePlayerArrowVolleyAtWill() {
  if (!ship || !localLayout || ship.arrowCooldown > 0) return false;
  const weapon = playerNavalWeapon();
  if (!navalWeaponFiresAtWill(weapon)) return false;
  const target = nearestPlayerArrowTarget(CANNON_RANGE_PX * weapon.rangeScale);
  if (!target) return false;

  ship.arrowCooldown = weapon.reloadSeconds;
  const count = navalArrowVolleyCount(ship.stats.crewCapacity);
  emitCaptureEvent("weapon-fired", {
    ownerId: PLAYER_COMBAT_ID,
    targetId: target.id,
    weapon: weapon.kind,
    count
  });
  const origin = { x: localLayout.viewX, y: localLayout.viewY };
  const heading = shipScreenHeading();
  const sequence = ++ship.cannonSequence;
  playNavalAttackSound(weapon, count);
  startCombatMusicForThreat("small");

  for (let index = 0; index < count; index++) {
    const lineT = count === 1 ? 0 : index / (count - 1) - 0.5;
    const seed = cannonSeed(sequence, index, 0x6172726f, origin);
    const startX = origin.x + heading.x * lineT * 8;
    const startY = origin.y + heading.y * lineT * 8;
    const targetX = target.point.x + (cannonUnit(seed, 1) * 2 - 1) * 3;
    const targetY = target.point.y + (cannonUnit(seed, 2) * 2 - 1) * 3;
    const range = Math.hypot(targetX - startX, targetY - startY);
    ship.navalProjectiles.push({
      kind: weapon.kind,
      ownerId: PLAYER_COMBAT_ID,
      targetId: target.id,
      startX,
      startY,
      targetX,
      targetY,
      age: 0,
      duration: Math.max(0.12, range / (CANNON_SPEED_PX * weapon.speedScale)),
      arcHeight: (CANNON_ARC_HEIGHT_PX + cannonUnit(seed, 3) * 4) * weapon.arcHeightScale,
      damage: weapon.damage,
      seed
    });
  }
  if (ship.navalProjectiles.length > NAVAL_MAX_PROJECTILES) {
    ship.navalProjectiles.splice(0, ship.navalProjectiles.length - NAVAL_MAX_PROJECTILES);
  }
  return true;
}

function nearestPlayerArrowTarget(range) {
  if (!Number.isFinite(range) || range <= 0) throw new Error(`Invalid arrow range: ${range}`);
  const candidateIds = new Set();
  for (const engagement of shipCombatState.engagements.values()) {
    if (engagement.aId === PLAYER_COMBAT_ID) candidateIds.add(engagement.bId);
    else if (engagement.bId === PLAYER_COMBAT_ID) candidateIds.add(engagement.aId);
  }
  for (const battery of activeVisibleShoreBatteries()) {
    if (battery.engagedTargetIds.has(PLAYER_COMBAT_ID)) candidateIds.add(battery.id);
  }

  const origin = { x: localLayout.viewX, y: localLayout.viewY };
  let nearest = null;
  for (const id of candidateIds) {
    const point = combatEntityAimPoint(id);
    if (!point) continue;
    const distance = Math.hypot(point.x - origin.x, point.y - origin.y);
    if (distance > range || distance >= (nearest?.distance ?? Infinity)) continue;
    nearest = { id, point, distance };
  }
  return nearest;
}

function drawCombatBroadsideControls() {
  if (!ship || !localLayout || portWaitState || !playerHasCombatEngagement() || dialogueState || menusAreOpen() || gameOverReason) return;
  const weapon = playerNavalWeapon();
  if (!navalWeaponUsesBroadside(weapon)) return;
  for (const sideName of ["port", "starboard"]) {
    const arc = navalBroadsideArc(sideName, weapon);
    const cooldown = ship.cannonCooldowns[sideName] || 0;
    const hasTarget = navalArcHasEnemy(arc);
    drawBroadsideReloadIndicator(arc, cooldown, weapon.reloadSeconds, hasTarget);
  }
}

function drawBroadsideReloadIndicator(arc, cooldown, reloadSeconds, hasTarget) {
  if (!Number.isFinite(reloadSeconds) || reloadSeconds <= 0) {
    throw new Error(`Invalid broadside reload time: ${reloadSeconds}`);
  }
  const ready = cooldown <= 0;
  const readyFraction = 1 - clamp(cooldown / reloadSeconds, 0, 1);
  const reload = broadsideReloadGeometry(arc, readyFraction);
  ctx.save();
  traceBroadsideSector(arc, arc.outerRadius);
  ctx.fillStyle = ready ? "rgba(46, 34, 47, 0.04)" : "rgba(46, 34, 47, 0.16)";
  ctx.fill();

  if (reload.readyFraction > 0) {
    traceBroadsideSector(arc, reload.fillOuterRadius);
    ctx.fillStyle = ready
      ? (hasTarget ? "rgba(249, 194, 43, 0.14)" : "rgba(249, 194, 43, 0.07)")
      : "rgba(249, 194, 43, 0.12)";
    ctx.fill();
  }

  traceBroadsideSector(arc, arc.outerRadius);
  ctx.strokeStyle = ready ? (hasTarget ? "#fff4a8" : "#f9c22b") : "#625565";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (reload.reloading && reload.readyFraction > 0) {
    ctx.strokeStyle = "#f9c22b";
    ctx.beginPath();
    ctx.arc(
      arc.origin.x,
      arc.origin.y,
      reload.fillOuterRadius,
      arc.startAngle,
      arc.endAngle
    );
    ctx.stroke();
  }
  ctx.restore();
}

function traceBroadsideSector(arc, outerRadius) {
  if (!Number.isFinite(outerRadius) || outerRadius < arc.innerRadius || outerRadius > arc.outerRadius) {
    throw new Error(`Invalid broadside sector radius: ${outerRadius}`);
  }
  ctx.beginPath();
  ctx.arc(arc.origin.x, arc.origin.y, arc.innerRadius, arc.startAngle, arc.endAngle);
  ctx.lineTo(
    arc.origin.x + Math.cos(arc.endAngle) * outerRadius,
    arc.origin.y + Math.sin(arc.endAngle) * outerRadius
  );
  ctx.arc(arc.origin.x, arc.origin.y, outerRadius, arc.endAngle, arc.startAngle, true);
  ctx.closePath();
}

function navalBroadsideArc(sideName, weapon = playerNavalWeapon()) {
  if (!weapon) throw new Error("Cannot draw a broadside arc without a naval weapon");
  const heading = shipScreenHeading();
  const cannonLength = Math.min(CANNON_RANGE_PX, Math.max(46, Math.min(SCREEN_W, SCREEN_H) * 0.25));
  return broadsideArcGeometry({
    screenWidth: SCREEN_W,
    screenHeight: SCREEN_H,
    heading,
    sideName,
    range: cannonLength * weapon.rangeScale
  });
}

function navalBroadsideSideAtPoint(point) {
  if (!point || !ship || !localLayout || !playerHasCombatEngagement() || dialogueState || menusAreOpen()) return null;
  const weapon = playerNavalWeapon();
  if (!navalWeaponUsesBroadside(weapon)) return null;
  for (const sideName of ["port", "starboard"]) {
    if (pointInBroadsideArc(point, navalBroadsideArc(sideName, weapon), 5)) return sideName;
  }
  return null;
}

function navalArcHasEnemy(arc) {
  const offset = chartOffsetPixels(chart);
  for (const state of npcVisualShips.values()) {
    if (!shipCombatState.engagements.has(engagementKey(PLAYER_COMBAT_ID, state.id))) continue;
    const point = { x: state.x + offset.x, y: state.y + offset.y };
    if (pointInBroadsideArc(point, arc, 7)) return true;
  }
  for (const battery of activeVisibleShoreBatteries()) {
    if (!battery.engagedTargetIds.has(PLAYER_COMBAT_ID)) continue;
    const localPoint = shoreBatteryPoint(battery.id);
    const point = { x: localPoint.x + offset.x, y: localPoint.y + offset.y };
    if (pointInBroadsideArc(point, arc, 9)) return true;
  }
  return false;
}

function shipBroadsideCannonCount() {
  return Math.ceil((gameState?.ship?.cannons || 0) / 2);
}

function playerNavalWeapon() {
  const homePort = portCitiesByTileId?.get(gameState?.character?.homePortTileId);
  const weapon = navalWeaponForShip({
    cultureType: homePort?.cityType || null,
    cannons: gameState?.ship?.cannons || 0,
    weaponKind: ship?.stats?.navalWeaponKind || null
  });
  if (!weapon || weapon.kind !== NAVAL_WEAPON_CANNON) return weapon;
  return cannonWeaponWithEquipment(weapon, playerCannonEquipment(gameState).id);
}

function cannonMuzzleForeAftSpan(broadsideCount) {
  return CANNON_MUZZLE_FORE_AFT_SPAN_PX + Math.min(9, Math.max(0, broadsideCount - 7) * 0.38);
}

function updateNavalWeapons(dt) {
  if (!ship) return false;
  ship.cannonCooldowns.port = Math.max(0, ship.cannonCooldowns.port - dt);
  ship.cannonCooldowns.starboard = Math.max(0, ship.cannonCooldowns.starboard - dt);
  ship.arrowCooldown = Math.max(0, ship.arrowCooldown - dt);

  let changed = firePlayerArrowVolleyAtWill();
  if (cannonSmokeBursts.length > 0) {
    cannonSmokeBursts = advanceCannonSmokeBursts(cannonSmokeBursts, dt);
    changed = true;
  }
  if (hullSplinterBursts.length > 0) {
    hullSplinterBursts = advanceHullSplinterBursts(hullSplinterBursts, dt);
    changed = true;
  }
  if (ship.navalProjectiles.length > 0) {
    const keptBalls = [];
    for (const ball of ship.navalProjectiles) {
      const previousAge = ball.age;
      ball.age = Math.min(ball.duration, ball.age + dt);
      if (
        ball.kind === NAVAL_WEAPON_CANNON &&
        resolvePlayerCannonPathHit(ball, previousAge)
      ) {
        continue;
      }
      if (ball.age >= ball.duration) {
        if (ball.kind === NAVAL_WEAPON_ARROW) {
          resolvePlayerNavalImpact(ball);
          continue;
        }
        if (wakeMapPointIsWater(Math.round(ball.targetX), Math.round(ball.targetY), chart)) {
          addCannonSplash(ball);
        } else {
          playCannonImpactSound(Math.hypot(ball.targetX - ball.startX, ball.targetY - ball.startY));
        }
        continue;
      }
      keptBalls.push(ball);
    }
    ship.navalProjectiles = keptBalls;
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

function resolvePlayerCannonPathHit(ball, previousAge) {
  const targets = [...npcVisualShips.values()]
    .filter((state) => state.hitPoints > 0 && !state.combatGrace)
    .map((state) => ({
      id: state.id,
      x: state.x,
      y: state.y,
      footprint: combatShipFootprint(state.id)
    }));
  for (const battery of activeVisibleShoreBatteries()) {
    const point = shoreBatteryPoint(battery.id);
    targets.push({ id: battery.id, x: point.x, y: point.y, radius: 9 });
  }
  const hit = firstNavalProjectileHit(
    navalProjectilePoint(ball, previousAge),
    navalProjectilePoint(ball),
    targets
  );
  if (!hit) return false;
  const target = npcVisualShips.get(hit.target.id) || shoreBatteryStates.get(hit.target.id);
  if (!target) throw new Error(`Cannon path target disappeared: ${hit.target.id}`);
  if (shoreBatteryStates.has(target.id)) applyShoreBatteryHit(ball, target, hit, true);
  else applyPlayerNavalHit(ball, target, hit);
  return true;
}

function resolvePlayerNavalImpact(ball) {
  if (ball.kind !== NAVAL_WEAPON_ARROW || typeof ball.targetId !== "string") {
    throw new Error("Player arrow projectile requires an explicit target");
  }
  if (!combatEngagementIsActive(PLAYER_COMBAT_ID, ball.targetId)) return false;
  const target = npcVisualShips.get(ball.targetId) || shoreBatteryStates.get(ball.targetId);
  const point = combatEntityPoint(ball.targetId);
  if (!target || !point) return false;
  const footprint = npcVisualShips.has(ball.targetId) ? combatShipFootprint(ball.targetId) : null;
  const hit = footprint
    ? pointInShipFootprint({ x: ball.targetX, y: ball.targetY }, footprint)
    : Math.hypot(point.x - ball.targetX, point.y - ball.targetY) <= NPC_COMBAT_PROJECTILE_HIT_RADIUS_PX;
  if (!hit) return false;

  if (shoreBatteryStates.has(target.id)) {
    applyShoreBatteryHit(ball, target, { x: ball.targetX, y: ball.targetY }, true);
  } else {
    applyPlayerNavalHit(ball, target, { x: ball.targetX, y: ball.targetY });
  }
  return true;
}

function activeVisibleShoreBatteries() {
  const simMinute = Math.floor(weatherClockMinutes);
  return [...shoreBatteryStates.values()].filter((state) => (
    !shoreBatteryIsDisabled(state, simMinute) && shoreBatteryPoint(state.id)
  ));
}

function combatEngagementIsActive(aId, bId) {
  if (shipCombatState.engagements.has(engagementKey(aId, bId))) return true;
  const aBattery = shoreBatteryStates.get(aId);
  if (aBattery?.engagedTargetIds.has(bId)) return true;
  const bBattery = shoreBatteryStates.get(bId);
  return bBattery?.engagedTargetIds.has(aId) === true;
}

function applyShoreBatteryHit(ball, battery, point, hitByPlayer) {
  if (hitByPlayer) beginPlayerInitiatedShoreCombat(battery);
  else battery.engagedTargetIds.add(ball.ownerId);
  playNavalImpactSound({ ...ball, targetX: point.x, targetY: point.y });
  const result = damageShoreBattery(
    battery,
    gameState.memory.flags,
    ball.damage,
    Math.floor(weatherClockMinutes)
  );
  addHullSplinterBurst(ball, point);
  if (!result.newlyDisabled) return;
  if (hitByPlayer) {
    const city = chartPortCallById(battery.portId);
    if (!city) throw new Error(`Disabled player target has no port: ${battery.portId}`);
    markPlayerPortAssault(gameState.memory.flags, city, battery.disabledUntilMinute);
  }
  if (!hitByPlayer) attemptNpcPortConquest(battery, ball.ownerId);
  npcCombatProjectiles = npcCombatProjectiles.filter((shot) => (
    shot.ownerId !== battery.id && shot.targetId !== battery.id
  ));
  combatNotice = {
    text: shoreBatteryDisabledNotice(battery),
    expiresAtMs: lastFrameMs + COMBAT_NOTICE_MS
  };
  saveVoyageNow("shore battery disabled");
}

function attemptNpcPortConquest(battery, npcShipId) {
  const npc = npcVisualShips.get(npcShipId);
  const strategic = npcSeaRoutes?.shipById.get(npcShipId);
  if (!npc || !strategic || strategic.role !== NPC_ROLE_WARSHIP) return false;
  const stats = shipStatsForSlug(strategic.slug);
  if (stats.crewCapacity < PORT_CONQUEST_MIN_CREW || strategic.factionId === NEUTRAL_FACTION_ID ||
      strategic.factionId === PIRATE_FACTION_ID || strategic.factionId === battery.factionId) return false;
  const batteryPoint = shoreBatteryPoint(battery.id);
  if (!batteryPoint || Math.hypot(npc.x - batteryPoint.x, npc.y - batteryPoint.y) > PORT_CONQUEST_NPC_LANDING_RANGE_PX) {
    return false;
  }
  const city = chartPortCallById(battery.portId);
  if (!city) throw new Error(`NPC conquest port is not visible: ${battery.portId}`);
  if (Math.random() >= npcPortConquestChance(city)) return false;

  const event = recordPortCapture(
    gameState.memory.conquest,
    city,
    strategic.factionId,
    Math.floor(weatherClockMinutes),
    `npc:${npcShipId}`
  );
  clearPlayerPortAssault(gameState.memory.flags, city);
  const conqueringFaction = factionById(strategic.factionId);
  const defeatedFaction = factionById(event.previousFactionId);
  applyCurrentPortConquestOwnership();
  const collapseText = event.collapsedFactionId ? `; ${defeatedFaction.name.toUpperCase()} COLLAPSES` : "";
  showSurvivalNotice(
    `${event.cityName.toUpperCase()} TAKEN BY ${conqueringFaction.adjective.toUpperCase()} FORCES${collapseText}`,
    "warn"
  );
  saveVoyageNow("npc conquered port");
  dirty = true;
  return true;
}

function beginPlayerInitiatedShoreCombat(battery) {
  if (!battery.engagedTargetIds.has(PLAYER_COMBAT_ID)) {
    battery.engagedTargetIds.add(PLAYER_COMBAT_ID);
    battery.playerHailed = true;
  }
  if (battery.playerAttackRecorded) return;
  recordAttackAgainstFaction(gameState, battery.factionId);
  if (!hasPrivateeringAuthorityAgainst(gameState, battery.factionId)) {
    recordPiracyAgainstFaction(gameState, battery.factionId, { includeVictim: false });
  }
  battery.playerAttackRecorded = true;
}

function applyPlayerNavalHit(ball, target, point) {
  if (!shipCombatState.engagements.has(engagementKey(PLAYER_COMBAT_ID, target.id))) {
    beginPlayerInitiatedCombat(target.id);
  }
  playNavalImpactSound({ ...ball, targetX: point.x, targetY: point.y });
  const damage = damageNpcShip(npcSeaRoutes, target.id, ball.damage);
  emitCaptureEvent("projectile-hit", {
    ownerId: PLAYER_COMBAT_ID,
    targetId: target.id,
    weapon: ball.kind,
    damage: ball.damage,
    remainingHitPoints: damage.hitPoints
  });
  target.hitPoints = damage.hitPoints;
  if (damage.sunk) handleNpcSinking(target.id, PLAYER_COMBAT_ID);
  else {
    addHullSplinterBurst(ball, point);
    if (damage.shouldSurrender) handleNpcSurrender(target.id, PLAYER_COMBAT_ID);
  }
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

function drawNavalEffects(activeChart) {
  if (!ship) return;
  drawCannonSmokeBursts(cannonSmokeBursts);
  drawCannonSplashes(activeChart);
  drawPlayerNavalProjectiles();
  drawNpcCombatSplashes(activeChart);
  drawNpcCombatProjectiles();
}

function drawNpcCombatProjectiles() {
  for (const ball of npcCombatProjectiles) {
    const point = cannonBallPoint(ball, ball.age);
    drawNavalProjectile(ball, point);
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

function drawPlayerNavalProjectiles() {
  if (!ship.navalProjectiles.length) return;
  for (const ball of ship.navalProjectiles) {
    const point = cannonBallPoint(ball, ball.age);
    drawNavalProjectile(ball, point);
  }
}

function drawNavalProjectile(projectile, point) {
  if (projectile.kind === NAVAL_WEAPON_ARROW) {
    drawArrowProjectile(projectile, point);
    return;
  }
  drawCannonTrail(projectile);
  ctx.fillStyle = "rgba(18, 14, 12, 0.95)";
  ctx.fillRect(Math.round(point.x), Math.round(point.y - point.z), 1, 1);
}

function addCannonSmokeBurst(projectile) {
  cannonSmokeBursts.push(createCannonSmokeBurst(projectile));
  if (cannonSmokeBursts.length > CANNON_MAX_SMOKE_BURSTS) {
    cannonSmokeBursts.splice(0, cannonSmokeBursts.length - CANNON_MAX_SMOKE_BURSTS);
  }
}

function drawCannonSmokeBursts(bursts) {
  for (const burst of bursts) {
    for (const pixel of cannonSmokePixels(burst)) {
      ctx.fillStyle = `rgba(${CANNON_SMOKE_COLORS[pixel.shade]}, ${pixel.alpha.toFixed(3)})`;
      ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
    }
  }
}

function addHullSplinterBurst(projectile, point) {
  hullSplinterBursts.push(createHullSplinterBurst(projectile, point));
  if (hullSplinterBursts.length > HULL_SPLINTER_MAX_BURSTS) {
    hullSplinterBursts.splice(0, hullSplinterBursts.length - HULL_SPLINTER_MAX_BURSTS);
  }
}

function drawHullSplinterBursts(bursts) {
  for (const burst of bursts) {
    for (const pixel of hullSplinterPixels(burst)) {
      ctx.fillStyle = `rgba(${HULL_SPLINTER_COLORS[pixel.shade]}, ${pixel.alpha.toFixed(3)})`;
      ctx.fillRect(pixel.x, pixel.y, 1, 1);
    }
  }
}

function drawArrowProjectile(projectile, point) {
  const dx = projectile.targetX - projectile.startX;
  const dy = projectile.targetY - projectile.startY;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-6) return;
  const ux = dx / length;
  const uy = dy / length;
  const y = point.y - point.z;
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  for (let i = 0; i < ARROW_LINE_LENGTH_PX; i++) {
    ctx.fillRect(Math.round(point.x - ux * i), Math.round(y - uy * i), 1, 1);
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
  return navalProjectilePoint(ball, age);
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
  globeWaterHexWaveFrameIndexCache.clear();
  localWaterHexWaveFrameIndexCache.clear();
  return true;
}

function updateFishAnimation(nowMs) {
  if (!chart || !gameState || !animalImages?.fish) return false;
  const tick = Math.floor(nowMs / FISH_ANIMATION_REDRAW_MS);
  if (tick === fishAnimationDrawTick) return false;
  fishAnimationDrawTick = tick;
  return true;
}

function updateWeather(dt, nowMs) {
  if (!runtimeWeather || !weatherBake) return false;
  let stormDamageChanged = false;
  let survivalChanged = false;
  let stormCaptainChanged = false;
  let diplomacyChanged = false;
  if (weatherTimeScale > 0) {
    const previousClockMinutes = weatherClockMinutes;
    weatherClockMinutes += dt * weatherTimeScale / 60;
    stormDamageChanged = updateStormDamage(previousClockMinutes, weatherClockMinutes);
    survivalChanged = updatePlayerSurvival(previousClockMinutes, weatherClockMinutes);
    stormCaptainChanged = updateStormCaptainAlert(previousClockMinutes, weatherClockMinutes, nowMs);
    diplomacyChanged = updateWorldDiplomacy();
  }

  const dayChanged = refreshWeatherState(false);
  const tick = Math.floor(nowMs / WEATHER_REDRAW_MS);
  if (tick !== weatherDrawTick) {
    weatherDrawTick = tick;
    return weatherTimeScale > 0 || dayChanged || stormDamageChanged || survivalChanged ||
      stormCaptainChanged || diplomacyChanged;
  }
  return dayChanged || stormDamageChanged || survivalChanged || stormCaptainChanged || diplomacyChanged;
}

function updateWorldDiplomacy() {
  const diplomacy = gameState?.relations?.diplomacy;
  if (!diplomacy || weatherClockMinutes < diplomacy.nextEventMinute) return false;
  const events = advanceGameDiplomacy(gameState, weatherClockMinutes);
  if (events.length === 0) return false;
  const latest = events[events.length - 1];
  showSurvivalNotice(diplomacyEventNotice(latest), latest.kind === "peace" ? "good" : "warn");
  return true;
}

function recordNpcDiplomaticPortCall(visitingFactionId, portFactionId, simMinute) {
  if (!gameState?.relations?.diplomacy) throw new Error("NPC port call occurred without world diplomacy");
  return recordDiplomaticPortCall(
    gameState.relations.diplomacy,
    visitingFactionId,
    portFactionId,
    simMinute
  );
}

function updatePlayerSurvival(previousMinute, currentMinute) {
  if (!gameState || !ship || gameOverReason || currentMinute <= previousMinute) return false;
  const safePort = playerShipIsInvulnerable();
  const result = updateSurvival(gameState, previousMinute, currentMinute, {
    freshwater: shipIsInFreshWater(),
    rainfall: playerRainfallStrength(),
    safePort
  });
  if (safePort) {
    resetSurvivalDamageTimers();
    return result.changed;
  }
  if (result.freshWaterRefilled) showSurvivalNotice("FRESH WATER REFILLED", "good");
  if (result.changed) syncShipCargoFromGameState();
  const status = survivalStatus(gameState);
  const deprivationChanged = updateSurvivalDeprivationLosses(status, currentMinute);
  if (gameOverReason) return true;
  if (status.freshWaterFraction > 0 && status.freshWaterFraction <= 0.12) {
    showSurvivalNotice("FRESH WATER LOW", "warn");
  }
  if (status.foodUnits > 0 && status.foodDays <= 3) {
    showSurvivalNotice("FOOD LOW", "warn");
  }
  return result.changed || deprivationChanged;
}

function updateStormCaptainAlert(previousMinute, currentMinute, nowMs) {
  if (!ship || gameOverReason || currentMinute <= previousMinute) return false;
  const intensity = playerStormIntensity();
  const transition = updateStormPassage(stormPassageState, intensity, {
    enterIntensity: STORM_CAPTAIN_ALERT_ENTER_INTENSITY,
    exitIntensity: STORM_CAPTAIN_ALERT_EXIT_INTENSITY,
    clearanceDelayMs: STORM_CAPTAIN_CLEARANCE_DELAY_MS
  }, nowMs);
  let changed = transition !== null;

  if (transition === STORM_PASSAGE_CLEARED) {
    showSurvivalNotice("STORM PASSED - SAFE TO SAIL", "good");
  }
  if (stormPassageState.clearancePending) {
    const opened = openCaptainAlertModal(stormClearanceMessage(), "happy");
    if (opened) markStormClearanceDelivered(stormPassageState);
    return changed || opened;
  }
  if (intensity < STORM_CAPTAIN_ALERT_EXIT_INTENSITY) {
    return changed;
  }
  if (portWaitState || intensity < STORM_CAPTAIN_ALERT_ENTER_INTENSITY) return changed;
  if (!stormPassageState.warningPending) return changed;

  const opened = openCaptainAlertModal(stormCaptainAlertMessage(intensity), "concerned");
  if (opened) markStormWarningDelivered(stormPassageState);
  return changed || opened;
}

function stormCaptainAlertMessage(intensity) {
  if (anchored) return "The anchor is holding, but this weather is fierce.";
  if (intensity >= STORM_DAMAGE_INTENSITY) return "This storm is hammering us. We should get to shore.";
  return "The weather is turning ugly. Keep her bow steady.";
}

function stormClearanceMessage() {
  if (portWaitState) return "The storm has passed. It is safe to put to sea again.";
  if (anchored) return "The storm has passed. We can weigh anchor safely.";
  return "The worst has passed. We are safe to make sail again.";
}

function updateSurvivalDeprivationLosses(status, currentMinute) {
  const waterLoss = updateSurvivalCrewLossTimer({
    key: "waterNextMinute",
    active: status.freshWater <= 0,
    currentMinute,
    intervalMinutes: SURVIVAL_DEHYDRATION_INTERVAL_MINUTES,
    crewLossPerTick: SURVIVAL_DEHYDRATION_CREW_LOSS,
    alert: () => openCaptainAlertModal("So thirsty... We need fresh water.", "sad")
  });
  const foodLoss = updateSurvivalCrewLossTimer({
    key: "foodNextMinute",
    active: status.foodUnits <= 0,
    currentMinute,
    intervalMinutes: SURVIVAL_STARVATION_INTERVAL_MINUTES,
    crewLossPerTick: SURVIVAL_STARVATION_CREW_LOSS,
    alert: () => showSurvivalNotice("NO FOOD LEFT", "warn")
  });
  const deprivation = applySurvivalDeprivation(gameState, {
    dehydration: waterLoss.crewLoss,
    starvation: foodLoss.crewLoss
  });
  if (deprivation.crewLost > 0) syncShipCargoFromGameState();
  if (deprivation.crewLost <= 0) {
    return waterLoss.changed || foodLoss.changed;
  }

  const reason = status.freshWater <= 0 && status.foodUnits <= 0
    ? "The crew succumbed to thirst and starvation."
    : status.freshWater <= 0
      ? "The crew succumbed to thirst."
      : "The crew succumbed to starvation.";
  showSurvivalNotice(`${deprivationNoticeLabel(deprivation)} -${deprivation.crewLost} CREW`, "warn");
  if (deprivation.crewDepleted) {
    endPlayerVoyage(reason, { sinkShip: false, outcomeType: "death" });
    return true;
  }
  return true;
}

function deprivationNoticeLabel({ dehydrationCrewLost, starvationCrewLost }) {
  if (dehydrationCrewLost > 0 && starvationCrewLost > 0) return "DEPRIVATION";
  if (dehydrationCrewLost > 0) return "DEHYDRATION";
  if (starvationCrewLost > 0) return "STARVATION";
  throw new Error("Cannot label deprivation without a crew loss");
}

function updateSurvivalCrewLossTimer({
  key,
  active,
  currentMinute,
  intervalMinutes,
  crewLossPerTick,
  alert
}) {
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error(`Invalid survival loss interval: ${intervalMinutes}`);
  }
  if (!Number.isInteger(crewLossPerTick) || crewLossPerTick <= 0) {
    throw new Error(`Invalid survival crew loss: ${crewLossPerTick}`);
  }
  if (!active) {
    survivalDeprivationTimers[key] = null;
    return { crewLoss: 0, changed: false };
  }
  if (survivalDeprivationTimers[key] === null) {
    survivalDeprivationTimers[key] = currentMinute + intervalMinutes;
    if (typeof alert === "function") alert();
    return { crewLoss: 0, changed: true };
  }
  let crewLoss = 0;
  while (currentMinute >= survivalDeprivationTimers[key]) {
    crewLoss += crewLossPerTick;
    survivalDeprivationTimers[key] += intervalMinutes;
  }
  return { crewLoss, changed: crewLoss > 0 };
}

function updateStormDamage(previousMinute, currentMinute) {
  if (!ship || !stormSystem || anchored || playerShipIsInvulnerable() || gameOverReason || currentMinute <= previousMinute) return false;
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

  if (!triggerStormShipStrike(stormShipStrikeState, lastFrameMs)) return false;
  ship.hitPoints = Math.max(0, ship.hitPoints - totalDamage);
  emitCaptureEvent("storm-damage", {
    damage: totalDamage,
    intensity: strongestIntensity,
    remainingHitPoints: ship.hitPoints
  });
  applyCrewCasualtiesFromHullDamage(totalDamage, "The last of the crew was lost in the storm.");
  stormDamageNotice = {
    damage: totalDamage,
    intensity: strongestIntensity,
    expiresAtMs: lastFrameMs + STORM_DAMAGE_NOTICE_MS
  };
  if (ship.hitPoints <= 0) sinkPlayerShip("Your ship foundered in the storm.");
  return true;
}

function sinkPlayerShip(reason) {
  emitCaptureEvent("ship-sunk", { shipId: PLAYER_COMBAT_ID, reason });
  endPlayerVoyage(reason, { sinkShip: true, outcomeType: "death" });
}

function completeCampaignVoyage() {
  const goal = gameState?.memory?.campaignGoal;
  if (!goal) throw new Error("Campaign victory requires a campaign goal");
  const victory = campaignVictorySummary(goal, gameState.playerCharacter);
  endPlayerVoyage(victory.reason, {
    sinkShip: false,
    outcomeType: "victory",
    victory
  });
}

function endPlayerVoyage(reason, { sinkShip, outcomeType, victory = null }) {
  if (typeof reason !== "string" || reason.trim() === "") throw new Error("Ending a voyage requires a reason");
  if (typeof sinkShip !== "boolean") throw new Error("Ending a voyage requires an explicit sinkShip decision");
  if (!["death", "victory"].includes(outcomeType)) throw new Error(`Invalid voyage outcome type: ${outcomeType}`);
  if (outcomeType === "victory" && (!victory || typeof victory.legacy !== "string")) {
    throw new Error("Campaign victory requires a legacy summary");
  }
  if (gameOverReason || playerShipIsInvulnerable()) return;
  if (sinkShip) spawnPlayerShipSinkEffect(lastFrameMs);
  gameOverReason = reason;
  gameOverState = createGameOverState(reason, lastFrameMs, sinkShip, outcomeType, victory);
  storePastVoyage(createPastVoyageRecord({
    state: gameState,
    playerShip: snapshotPlayerShip(),
    startMinute: voyageStartClockMinutes,
    endMinute: gameOverState.deathMinute,
    outcome: reason,
    outcomeType
  }));
  anchored = false;
  fishingAction = null;
  shoreScavengeAction = null;
  portWaitState = null;
  portWaitButtonRect = null;
  dialogueState = null;
  dialogueLayout = createDialogueLayoutState();
  closeMenusForGameOver();
  ship.velocity = [0, 0, 0];
  ship.wakeParticles = [];
  keys.clear();
  clearPointerSteering();
  combatMusicUntilMs = 0;
  stormMusicActive = false;
  try {
    clearLocalSave();
    localSaveResult = { status: "empty", save: null, error: null };
  } catch (error) {
    console.warn(`[pixel-globe] could not clear the local save after ${outcomeType}`, error);
  }
  playMusicTrack(outcomeType === "victory" ? "gameVictory" : "gameOverSad", {
    crossfadeSeconds: MUSIC_COMBAT_CROSSFADE_SECONDS,
    restart: true
  });
  dirty = true;
}

function createGameOverState(reason, startedAtMs, sinkShip, outcomeType, victory) {
  if (typeof sinkShip !== "boolean") throw new Error("Game-over state requires an explicit sinkShip decision");
  const character = gameState?.playerCharacter || null;
  const deathMinute = Math.floor(weatherClockMinutes);
  return {
    reason,
    outcomeType,
    victory,
    sinkShip,
    startedAtMs,
    deathMinute,
    deathDateLabel: shipLedgerDateLabel(deathMinute),
    character,
    vessel: shipLabelForSlug(ship.typeSlug),
    stats: createGameOverStats(deathMinute)
  };
}

function createGameOverStats(deathMinute) {
  const voyage = createVoyageStatsForState(
    gameState,
    voyageStartClockMinutes,
    deathMinute,
    ship?.position
  );
  const ledgerEntries = gameState.accounts.ledger.length;
  const cargo = cargoUsed(gameState);
  const cargoCapacity = gameState?.cargoCapacity || ship?.cargoCapacity || 0;
  return {
    ...voyage,
    ledgerEntries,
    doubloons: voyage.endingDoubloons,
    cargo,
    cargoCapacity
  };
}

function createPastVoyageRecord({ state, playerShip, startMinute, endMinute, outcome, outcomeType }) {
  const character = state.playerCharacter;
  const stats = createVoyageStatsForState(state, startMinute, endMinute, playerShip.position);
  return {
    captainName: character?.name || "Unknown captain",
    home: character
      ? `${character.homePortName}, ${character.homePortRealmName}`
      : "Unknown home port",
    birthDateLabel: character?.birthDateLabel || "--",
    endDateLabel: shipLedgerDateLabel(endMinute),
    vessel: shipLabelForSlug(playerShip.typeSlug),
    outcome,
    outcomeType,
    goal: campaignGoalLabel(state.memory.campaignGoal),
    ...stats
  };
}

function createVoyageStatsForState(state, startMinute, endMinute, position) {
  const ledger = state.accounts.ledger;
  const opening = ledger.find((entry) => entry.kind === "opening");
  const openingDoubloons = Number.isFinite(opening?.amount) ? opening.amount : 0;
  const decisions = state.memory.decisions || {};
  const piracyActs = Object.entries(decisions).reduce((total, [key, count]) => (
    key.startsWith("reputation.piracy.") && Number.isFinite(count) ? total + count : total
  ), 0);
  const safePosition = Array.isArray(position) && position.length === 3 ? position : [1, 0, 0];
  return {
    daysAtSea: Math.max(1, Math.floor((endMinute - startMinute) / WEATHER_MINUTES_PER_DAY) + 1),
    doubloonsEarned: Math.round(grossDoubloonsEarned(ledger)),
    endingDoubloons: state.doubloons,
    netDoubloons: Math.round(state.doubloons - openingDoubloons),
    realizedPnl: Math.round(state.accounts.realizedPnl || 0),
    discoveries: discoveredEntries(state).length,
    visitedPorts: Object.keys(state.memory.visitedPorts).length,
    completedQuests: Object.keys(state.memory.quests.completed).length,
    lettersOfMarque: Object.keys(state.relations.lettersOfMarque).length,
    crewLost: Math.max(0, decisions["crew.lost"] || 0),
    piracyActs: Math.max(0, piracyActs),
    circumnavigated: hasDiscovery(state, CIRCUMNAVIGATION_DISCOVERY.id),
    mappedPercent: mappedPercentForState(state),
    latitude: latitudeDegForDirection(safePosition),
    longitude: longitudeDegForDirection(safePosition)
  };
}

function storePastVoyage(record) {
  try {
    const stored = appendVoyageRecord(record);
    voyageHistoryResult = { status: "ready", records: stored.records, error: null };
    return true;
  } catch (error) {
    console.warn("[pixel-globe] could not record the completed voyage", error);
    return false;
  }
}

function closeMenusForGameOver() {
  optionsMenu.isOpen = false;
  optionsMenu.activeSliderKey = null;
  pastVoyagesMenu.isOpen = false;
  discoveriesMenu.isOpen = false;
  shipInfoMenu.isOpen = false;
  politicsMenu.isOpen = false;
  captainAlertModal = null;
}

function gameOverElapsedMs(nowMs) {
  return Math.max(0, nowMs - (gameOverState?.startedAtMs ?? nowMs));
}

function gameOverRestartIsAvailable(nowMs) {
  if (gameOverState?.outcomeType === "victory") {
    return gameOverElapsedMs(nowMs) >= 900;
  }
  return Boolean(gameOverState && gameOverElapsedMs(nowMs) >=
    gameOverTransitionDurationMs() + GAME_OVER_MEMORIAL_MS + GAME_OVER_FADE_MS);
}

function gameOverTransitionDurationMs() {
  if (!gameOverState) return 0;
  return gameOverState.sinkShip ? SHIP_SINK_EFFECT_DURATION_MS : 0;
}

function restartAfterGameOver() {
  // Rebuild the procedural voyage from scratch; boot now lands on the start menu.
  window.location.reload();
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
      NPC_VISUAL_RECOVERY_SEARCH_PX,
      state.slug
    ) || nearestNpcNavigableVisualPoint(
      routePoint,
      snapshot.routeHeading,
      NPC_VISUAL_RECOVERY_SEARCH_PX,
      state.slug
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
  if (updateNpcFishermenHarvest()) changed = true;
  return changed;
}

function createNpcVisualState(snapshot, routePoint) {
  const initial = nearestNpcNavigableVisualPoint(
    routePoint,
    snapshot.routeHeading,
    NPC_VISUAL_ACTIVATION_SEARCH_PX,
    snapshot.slug
  );
  if (!initial) return null;
  const state = {
    id: snapshot.id,
    slug: snapshot.slug,
    factionId: snapshot.factionId,
    role: snapshot.role,
    fishingNetId: snapshot.fishingNetId,
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
    riverRailPathKey: null,
    riverRailDirectionSign: 0,
    riverRailExcludedPathKey: null,
    combatMode: null,
    combatTargetId: null,
    combatEnemyIds: [],
    weaponCooldown: 0,
    weaponSequence: 0,
    collisionVelocityX: 0,
    collisionVelocityY: 0,
    stormMode: null,
    stormShelterTileId: null,
    stormReferenceTileId: null,
    stormAnchorUntilMinute: 0,
    fishHarvestUntilMinute: 0,
    fishingAction: null
  };
  setNpcShipVisualNavigation(npcSeaRoutes, state.id, state.vector, state.heading);
  return state;
}

function syncNpcVisualStateFromSnapshot(state, snapshot) {
  state.slug = snapshot.slug;
  state.factionId = snapshot.factionId;
  state.role = snapshot.role;
  state.fishingNetId = snapshot.fishingNetId;
  state.hitPoints = snapshot.hitPoints;
  state.maxHitPoints = snapshot.maxHitPoints;
  state.combatGrace = snapshot.combatGrace;
}

function updateNpcFishermenHarvest() {
  if (!gameState || !chart || !npcSeaRoutes) return false;
  const nowMinute = Math.floor(weatherClockMinutes);
  let changed = false;
  for (const state of npcVisualShips.values()) {
    if (state.role !== NPC_ROLE_FISHERMAN) continue;
    if (state.fishingAction) {
      if (state.combatMode || state.stormMode) {
        state.fishingAction = null;
        changed = true;
        continue;
      }
      const animation = fishingAnimationState(state.fishingAction.startMs, lastFrameMs);
      if (!animation.complete) {
        if (
          animation.frameIndex !== state.fishingAction.frameIndex ||
          animation.cycleIndex !== state.fishingAction.cycleIndex
        ) changed = true;
        state.fishingAction.frameIndex = animation.frameIndex;
        state.fishingAction.cycleIndex = animation.cycleIndex;
        continue;
      }

      const action = state.fishingAction;
      state.fishingAction = null;
      state.fishHarvestUntilMinute = nowMinute + FISH_NPC_HARVEST_INTERVAL_MINUTES;
      const npcShip = npcSeaRoutes.shipById.get(state.id);
      if (!npcShip) continue;
      const free = npcCargoAvailableQuantity(npcShip, FISH_CARGO_GOOD_ID);
      if (free <= 0) continue;
      const result = harvestFishery(
        gameState,
        action.fishery,
        Math.min(npcFishingNetExpectedHaul(npcShip.fishingNetId), free),
        nowMinute,
        { actor: "npc" }
      );
      if (result.quantity > 0) {
        const stored = storeNpcCargo(npcShip, FISH_CARGO_GOOD_ID, result.quantity, 0, "onscreen fishing");
        if (stored !== result.quantity) {
          throw new Error(`NPC visual fishing capacity changed during harvest: ${npcShip.id} stored ${stored}/${result.quantity}`);
        }
      }
      changed = true;
      continue;
    }
    if (state.combatMode || state.stormMode) continue;
    if ((state.fishHarvestUntilMinute || 0) > nowMinute) continue;
    const npcShip = npcSeaRoutes.shipById.get(state.id);
    if (!npcShip) continue;
    const free = npcCargoAvailableQuantity(npcShip, FISH_CARGO_GOOD_ID);
    if (free <= 0) continue;
    const call = nearestFishCallNearPoint(state.x, state.y, FISH_NPC_HARVEST_RADIUS_PX);
    if (!call) continue;
    state.fishingAction = {
      startMs: lastFrameMs,
      fishery: call.fishery,
      side: fishingSideForTarget(state.x, call.x),
      frameIndex: 0,
      cycleIndex: 0
    };
    changed = true;
  }
  return changed;
}

function updateNpcCombat(dt) {
  if (!ship || gameOverReason) return false;
  const playerWasInCombat = playerHasCombatEngagement();
  const participantsBefore = combatParticipantIds();
  const entities = [playerCombatEntity(), ...[...npcVisualShips.values()].map(npcCombatEntity)];
  const result = updateShipCombatState(shipCombatState, entities, currentDiplomacyBetween);
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
  const batteryCombat = updateShoreBatteryCombat(dt, combatHailOpened);
  changed ||= batteryCombat.changed;

  for (const state of npcVisualShips.values()) {
    state.weaponCooldown = Math.max(0, state.weaponCooldown - dt);
    const intent = result.intents.get(state.id) || shoreBatteryIntentForNpc(state);
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
    if (!combatHailOpened && !batteryCombat.hailOpened && intent?.mode === COMBAT_MODE_ATTACK && fireNpcWeaponAtTarget(state, intent.targetId)) {
      changed = true;
    }
  }

  if (result.intents.has(PLAYER_COMBAT_ID) || playerHasShoreBatteryEngagement()) {
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
  return playerHasShoreBatteryEngagement();
}

function playerHasShoreBatteryEngagement() {
  for (const state of shoreBatteryStates.values()) {
    if (state.engagedTargetIds.has(PLAYER_COMBAT_ID)) return true;
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
  if (attemptEnvoyIntercession(state.factionId)) return true;
  openShipDialogue({ id: npcShipId, character }, { attackReason: npcCombatAttackReason(state) });
  return true;
}

function attemptEnvoyIntercession(factionId) {
  const passage = grantEnvoySafePassage(gameState, factionId, Math.floor(weatherClockMinutes));
  if (!passage) return false;
  const envoy = passage.quest.passenger;
  if (!envoy) throw new Error(`Envoy mission has no character: ${passage.quest.id}`);
  clearCombatForShip(PLAYER_COMBAT_ID);
  for (const battery of shoreBatteryStates.values()) battery.engagedTargetIds.delete(PLAYER_COMBAT_ID);
  openCharacterAlertModal(envoy, passage.message, "stern");
  showSurvivalNotice(`${factionById(factionId).adjective.toUpperCase()} DIPLOMATIC PASSAGE  ${passage.days} DAYS`, "good");
  saveVoyageNow("envoy claimed diplomatic passage");
  return true;
}

function npcCombatAttackReason(state) {
  if (state.role === NPC_ROLE_PIRATE) {
    return "Your cargo and coin are ours. Heave to, or we open fire!";
  }
  if (state.role === NPC_ROLE_MERCHANT || state.role === NPC_ROLE_FISHERMAN) {
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

function updateShoreBatteryCombat(dt, anotherHailOpened) {
  if (!chart || !gameState || !ship || !localLayout) return { changed: false, hailOpened: false };
  const simMinute = Math.floor(weatherClockMinutes);
  const flags = gameState.memory.flags;
  let changed = false;
  let hailOpened = false;
  const visibleIds = new Set();

  for (const city of chart.cityCalls || []) {
    if (!city.character || !factionHasFlag(city.factionId)) continue;
    const state = ensureShoreBatteryState(city);
    visibleIds.add(state.id);
    if (updateShoreBatteryState(state, flags, simMinute, dt)) changed = true;
    if (shoreBatteryIsDisabled(state, simMinute)) continue;
    const point = shoreBatteryPoint(state.id);
    if (!point) throw new Error(`Visible shore battery has no draw point: ${state.id}`);
    const weapon = shoreBatteryWeapon(state);
    const range = SHORE_BATTERY_RANGE_PX * weapon.rangeScale;
    const nextTargets = new Set();
    const playerDistance = Math.hypot(point.x - localLayout.viewX, point.y - localLayout.viewY);
    const entryStatus = portEntryStatus(gameState, city, simMinute);
    const playerHostile = !playerNpcAttackGraceIsActive(gameState.activePlaySeconds) && entryStatus.hostile;
    const passageRefusalActive = playerHostile &&
      factionSafePassageRefusalStatus(gameState, city.factionId, simMinute).active;
    const playerResponse = shoreBatteryPlayerResponse({
      playerHostile,
      hostileByWar: entryStatus.hostileByWar,
      withinWeaponRange: playerDistance <= range,
      withinTollRange: playerDistance <= PORT_INTERACTION_RADIUS_PX,
      tollDemandEligible: shoreBatteryMayDemandToll(city),
      playerHailed: state.playerHailed,
      passageRefusalActive
    });
    if (playerResponse.shouldHail) {
      if (!anotherHailOpened && !hailOpened && !dialogueState && !menusAreOpen()) {
        if (!attemptEnvoyIntercession(city.factionId)) openShoreBatteryCombatHail(city, state);
        hailOpened = true;
        changed = true;
      }
    }
    if (playerResponse.shouldEngage) nextTargets.add(PLAYER_COMBAT_ID);
    if (playerDistance > range + 20) {
      state.playerHailed = false;
    }

    for (const npc of npcVisualShips.values()) {
      if (npc.combatGrace || npc.hitPoints <= 0 || !shoreBatteryHostileToFaction(city, npc.factionId)) continue;
      if (Math.hypot(point.x - npc.x, point.y - npc.y) <= range) nextTargets.add(npc.id);
    }
    if (setContentsDiffer(state.engagedTargetIds, nextTargets)) changed = true;
    state.engagedTargetIds = nextTargets;
    if (shoreBatteryCanFire(state, simMinute) && fireShoreBatteryAtNearestTarget(state)) changed = true;
  }

  for (const state of shoreBatteryStates.values()) {
    if (!visibleIds.has(state.id)) state.engagedTargetIds.clear();
  }
  return { changed, hailOpened };
}

function ensureShoreBatteryState(city) {
  const id = shoreBatteryId(city);
  let state = shoreBatteryStates.get(id);
  if (!state) {
    state = createShoreBatteryState(city, gameState.memory.flags, Math.floor(weatherClockMinutes));
    shoreBatteryStates.set(id, state);
  }
  return state;
}

function shoreBatteryHostileToFaction(city, factionId) {
  if (!factionId || city.factionId === factionId) return false;
  return currentDiplomacyBetween(city.factionId, factionId) === DIPLOMACY_WAR;
}

function openShoreBatteryCombatHail(city, state) {
  state.playerHailed = true;
  const currentRelation = currentDiplomacyBetween(ship.factionId, city.factionId);
  const relation = currentRelation === DIPLOMACY_WAR ? DIPLOMACY_WAR : DIPLOMACY_HOSTILE;
  const playerWarship = playerShipIsWarship(gameState);
  const toll = playerWarship ? null : factionSafePassageToll(gameState);
  dialogueState = createShoreBatteryDialogueSession(city, {
    relation,
    playerWarship,
    toll,
    canAffordToll: toll !== null && gameState.doubloons >= toll,
    simMinute: Math.floor(weatherClockMinutes)
  });
  dialogueLayout = createDialogueLayoutState();
  stopShipForDialogue();
  ensureDialoguePortraitLoaded();
  startCombatMusicForThreat(state.gunCount >= 2 ? "big" : "small");
  dirty = true;
}

function shoreBatteryWeapon(state) {
  const weapon = navalWeaponForShip({ cultureType: state.cultureType, cannons: state.gunCount });
  if (!weapon) throw new Error(`Shore battery has no weapon: ${state.id}`);
  return weapon;
}

function shoreBatteryPoint(batteryId) {
  const state = shoreBatteryStates.get(batteryId);
  if (!state || !chart) return null;
  const call = chart.cityCalls?.find((city) => (city.portId || `city-${city.tileId}`) === state.portId);
  if (!call) return null;
  return { x: call.x, y: call.y - 2 };
}

function shoreBatteryIntentForNpc(npc) {
  let targetId = null;
  let nearestDistance = Infinity;
  for (const battery of shoreBatteryStates.values()) {
    if (!battery.engagedTargetIds.has(npc.id)) continue;
    const point = shoreBatteryPoint(battery.id);
    if (!point) continue;
    const distance = Math.hypot(point.x - npc.x, point.y - npc.y);
    if (distance >= nearestDistance) continue;
    nearestDistance = distance;
    targetId = battery.id;
  }
  return targetId ? { mode: COMBAT_MODE_ATTACK, targetId, enemyIds: [targetId] } : null;
}

function fireShoreBatteryAtNearestTarget(state) {
  const origin = shoreBatteryPoint(state.id);
  if (!origin) return false;
  let targetId = null;
  let target = null;
  let nearestDistance = Infinity;
  for (const id of state.engagedTargetIds) {
    if (id === PLAYER_COMBAT_ID && dialogueState) continue;
    const point = combatEntityAimPoint(id);
    if (!point) continue;
    const distance = Math.hypot(point.x - origin.x, point.y - origin.y);
    if (distance >= nearestDistance) continue;
    targetId = id;
    target = point;
    nearestDistance = distance;
  }
  if (!target) return false;
  const weapon = shoreBatteryWeapon(state);
  emitCaptureEvent("weapon-fired", {
    ownerId: state.id,
    targetId,
    weapon: weapon.kind,
    count: state.gunCount
  });
  armShoreBatteryReload(state);
  playNavalAttackSound(weapon, state.gunCount, distanceFromPlayerPoint(origin));
  startCombatMusicForThreat(state.gunCount >= 2 ? "big" : "small");
  for (let index = 0; index < state.gunCount; index++) {
    const seed = cannonSeed(state.shotSequence, index, state.cityTileId * 0x51a7, origin);
    const jitter = weapon.kind === NAVAL_WEAPON_ARROW ? 2.5 : 5;
    const targetX = target.x + (cannonUnit(seed, 1) * 2 - 1) * jitter;
    const targetY = target.y + (cannonUnit(seed, 2) * 2 - 1) * jitter;
    const range = Math.hypot(targetX - origin.x, targetY - origin.y);
    const projectile = {
      kind: weapon.kind,
      ownerId: state.id,
      targetId,
      startX: origin.x + index,
      startY: origin.y,
      targetX,
      targetY,
      age: 0,
      duration: range / (CANNON_SPEED_PX * weapon.speedScale),
      arcHeight: (CANNON_ARC_HEIGHT_PX + cannonUnit(seed, 3) * 3) * weapon.arcHeightScale,
      damage: weapon.damage,
      seed
    };
    npcCombatProjectiles.push(projectile);
    if (weapon.kind === NAVAL_WEAPON_CANNON) addCannonSmokeBurst(projectile);
  }
  return true;
}

function setContentsDiffer(a, b) {
  if (a.size !== b.size) return true;
  for (const value of a) if (!b.has(value)) return true;
  return false;
}

function playerCombatEntity() {
  const weapon = playerNavalWeapon();
  return {
    id: PLAYER_COMBAT_ID,
    factionId: ship.factionId,
    role: NPC_ROLE_PIRATE,
    x: localLayout.viewX,
    y: localLayout.viewY,
    hitPoints: Math.max(1, ship.hitPoints),
    maxHitPoints: ship.maxHitPoints,
    cannons: weapon?.kind === NAVAL_WEAPON_CANNON ? gameState?.ship?.cannons || 0 : 0,
    topSpeedRad: ship.stats.topSpeedRad,
    combatGrace: false,
    npcAttackProtected: playerNpcAttackGraceIsActive(gameState.activePlaySeconds),
    portProtected: playerShipIsInvulnerable(),
    majorPortProtected: playerHasMajorPortProtection(),
    safePassageFactionIds: activeFactionSafePassageIds(gameState, Math.floor(weatherClockMinutes))
  };
}

function playerHasMajorPortProtection() {
  if (!chart || !localLayout) return false;
  return (chart.cityCalls || []).some((city) => (
    npcPortHasMajorProtection(city) &&
    Math.hypot(city.x - localLayout.viewX, city.y - localLayout.viewY) <= NPC_MAJOR_PORT_AVOID_RADIUS_PX
  ));
}

function npcPirateMajorPortAvoidance(state) {
  if (state.role !== NPC_ROLE_PIRATE || !chart) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const city of chart.cityCalls || []) {
    if (!npcPortHasMajorProtection(city)) continue;
    const distance = Math.hypot(state.x - city.x, state.y - city.y);
    if (distance >= NPC_MAJOR_PORT_AVOID_RADIUS_PX || distance >= nearestDistance) continue;
    nearest = city;
    nearestDistance = distance;
  }
  if (!nearest) return null;
  let awayX = state.x - nearest.x;
  let awayY = state.y - nearest.y;
  let length = Math.hypot(awayX, awayY);
  if (length <= 1e-6) {
    const heading = tangentToScreenDirection(state.heading) || { x: 1, y: 0 };
    awayX = heading.x;
    awayY = heading.y;
    length = 1;
  }
  return {
    routePoint: {
      x: state.x + awayX / length * NPC_COMBAT_NAV_TARGET_PX,
      y: state.y + awayY / length * NPC_COMBAT_NAV_TARGET_PX
    }
  };
}

function npcCombatEntity(state) {
  const stats = shipStatsForSlug(state.slug);
  const weapon = npcNavalWeapon(state, stats);
  return {
    id: state.id,
    factionId: state.factionId,
    role: state.role,
    x: state.x,
    y: state.y,
    hitPoints: state.hitPoints,
    maxHitPoints: state.maxHitPoints,
    cannons: weapon?.kind === NAVAL_WEAPON_CANNON ? stats.cannons : 0,
    topSpeedRad: stats.topSpeedRad,
    combatGrace: state.combatGrace,
    npcAttackProtected: false
  };
}

function combatEntityPoint(entityId) {
  if (entityId === PLAYER_COMBAT_ID) {
    return ship && localLayout ? { x: localLayout.viewX, y: localLayout.viewY } : null;
  }
  if (shoreBatteryStates.has(entityId)) return shoreBatteryPoint(entityId);
  const state = npcVisualShips.get(entityId);
  return state ? { x: state.x, y: state.y } : null;
}

function combatEntityAimPoint(entityId) {
  const point = combatEntityPoint(entityId);
  if (!point || shoreBatteryStates.has(entityId)) return point;
  const footprint = combatShipFootprint(entityId);
  return shipFootprintPolygonCenter(footprint);
}

function distanceFromPlayerPoint(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`Invalid cannon sound source: ${point?.x},${point?.y}`);
  }
  const playerPoint = combatEntityPoint(PLAYER_COMBAT_ID);
  if (!playerPoint) throw new Error("Cannot spatialize cannon sound without the player draw position");
  return Math.hypot(point.x - playerPoint.x, point.y - playerPoint.y);
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
  const weapon = npcNavalWeapon(state);
  const orbitRange = NPC_COMBAT_ORBIT_RANGE_PX * (weapon?.rangeScale || 1);
  if (distance > orbitRange * 1.35) return { routePoint: target };

  const direct = { x: dx / distance, y: dy / distance };
  const orbitSide = (hashInt(state.id.length * 0x45d9f3b) & 1) === 0 ? -1 : 1;
  const radialCorrection = clamp((distance - orbitRange) / Math.max(8, 16 * (weapon?.rangeScale || 1)), -0.8, 0.8);
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

function fireNpcWeaponAtTarget(state, targetId) {
  if (state.weaponCooldown > 0 || state.combatGrace) return false;
  const target = combatEntityAimPoint(targetId);
  if (!target) return false;
  const stats = shipStatsForSlug(state.slug);
  const weapon = npcNavalWeapon(state, stats);
  if (!weapon) return false;
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const distance = Math.hypot(dx, dy);
  if (distance > NPC_COMBAT_FIRE_RANGE_PX * weapon.rangeScale || distance <= 1e-6) return false;
  const heading = tangentToScreenDirection(state.heading);
  if (!heading) return false;
  const direct = { x: dx / distance, y: dy / distance };
  if (
    navalWeaponUsesBroadside(weapon) &&
    Math.abs(heading.x * direct.x + heading.y * direct.y) > NPC_COMBAT_BROADSIDE_DOT
  ) return false;

  const volleyCount = navalWeaponUsesBroadside(weapon)
    ? Math.min(4, Math.max(1, Math.ceil(stats.cannons / 10)))
    : navalArrowVolleyCount(stats.crewCapacity);
  emitCaptureEvent("weapon-fired", {
    ownerId: state.id,
    targetId,
    weapon: weapon.kind,
    count: volleyCount
  });
  state.weaponCooldown = navalWeaponUsesBroadside(weapon)
    ? NPC_COMBAT_COOLDOWN_SECONDS
    : weapon.reloadSeconds;
  state.weaponSequence += 1;
  playNavalAttackSound(
    weapon,
    Math.max(1, Math.ceil(stats.cannons / 2)),
    distanceFromPlayerPoint(state)
  );
  startCombatMusicForThreat(stats.cannons >= COMBAT_BIG_BROADSIDE_MIN_CANNONS ? "big" : "small");

  for (let index = 0; index < volleyCount; index++) {
    const seed = cannonSeed(state.weaponSequence, index, state.id.length * 0x51a7, state);
    const jitterScale = weapon.kind === NAVAL_WEAPON_ARROW ? 3.5 : 7;
    const jitterX = (cannonUnit(seed, 1) * 2 - 1) * jitterScale;
    const jitterY = (cannonUnit(seed, 2) * 2 - 1) * jitterScale;
    const targetX = target.x + jitterX;
    const targetY = target.y + jitterY;
    const lineT = volleyCount === 1 ? 0 : index / (volleyCount - 1) - 0.5;
    const startX = state.x + (navalWeaponFiresAtWill(weapon) ? heading.x * lineT * 8 : 0);
    const startY = state.y + (navalWeaponFiresAtWill(weapon) ? heading.y * lineT * 8 : 0);
    const range = Math.hypot(targetX - startX, targetY - startY);
    const projectile = {
      kind: weapon.kind,
      ownerId: state.id,
      targetId,
      startX,
      startY,
      targetX,
      targetY,
      age: 0,
      duration: range / (CANNON_SPEED_PX * weapon.speedScale),
      arcHeight: (CANNON_ARC_HEIGHT_PX + cannonUnit(seed, 3) * 3) * weapon.arcHeightScale,
      damage: weapon.damage,
      seed
    };
    npcCombatProjectiles.push(projectile);
    if (projectile.kind === NAVAL_WEAPON_CANNON) addCannonSmokeBurst(projectile);
  }
  if (npcCombatProjectiles.length > NPC_COMBAT_MAX_PROJECTILES) {
    npcCombatProjectiles.splice(0, npcCombatProjectiles.length - NPC_COMBAT_MAX_PROJECTILES);
  }
  return true;
}

function npcNavalWeapon(state, stats = shipStatsForSlug(state.slug)) {
  const routeShip = npcSeaRoutes?.shipById.get(state.id);
  return navalWeaponForShip({
    cultureType: routeShip?.cultureType || routeShip?.currentPort?.cityType || null,
    cannons: stats.cannons,
    weaponKind: stats.navalWeaponKind || null
  });
}

function updateNpcCombatProjectiles(dt) {
  let changed = false;
  const kept = [];
  for (const ball of npcCombatProjectiles) {
    const previousAge = ball.age;
    ball.age = Math.min(ball.duration, ball.age + dt);
    if (ball.kind === NAVAL_WEAPON_CANNON && resolveNpcCannonPathHit(ball, previousAge)) {
      changed = true;
      continue;
    }
    if (ball.age < ball.duration) {
      kept.push(ball);
      changed = true;
      continue;
    }
    if (ball.kind === NAVAL_WEAPON_ARROW) resolveNpcCombatImpact(ball);
    else addNpcCombatSplash(ball);
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

function resolveNpcCannonPathHit(ball, previousAge) {
  const targets = [];
  if (
    ball.ownerId !== PLAYER_COMBAT_ID &&
    ship && ship.hitPoints > 0
  ) {
    targets.push({
      id: PLAYER_COMBAT_ID,
      x: localLayout.viewX,
      y: localLayout.viewY,
      footprint: combatShipFootprint(PLAYER_COMBAT_ID)
    });
  }
  for (const state of npcVisualShips.values()) {
    if (state.id === ball.ownerId || state.hitPoints <= 0 || state.combatGrace) continue;
    targets.push({
      id: state.id,
      x: state.x,
      y: state.y,
      footprint: combatShipFootprint(state.id)
    });
  }
  for (const battery of activeVisibleShoreBatteries()) {
    if (battery.id === ball.ownerId) continue;
    if (!combatEngagementIsActive(ball.ownerId, battery.id)) continue;
    const point = shoreBatteryPoint(battery.id);
    targets.push({ id: battery.id, x: point.x, y: point.y, radius: 9 });
  }
  const hit = firstNavalProjectileHit(
    navalProjectilePoint(ball, previousAge),
    navalProjectilePoint(ball),
    targets
  );
  if (!hit) return false;
  applyNpcCombatHit(ball, hit.target.id, hit);
  return true;
}

function resolveNpcCombatImpact(ball) {
  const target = combatEntityPoint(ball.targetId);
  const active = combatEngagementIsActive(ball.ownerId, ball.targetId);
  const shipFootprint = ball.targetId === PLAYER_COMBAT_ID || npcVisualShips.has(ball.targetId)
    ? combatShipFootprint(ball.targetId)
    : null;
  if (
    !target ||
    !active ||
    (shipFootprint
      ? !pointInShipFootprint({ x: ball.targetX, y: ball.targetY }, shipFootprint)
      : Math.hypot(target.x - ball.targetX, target.y - ball.targetY) > NPC_COMBAT_PROJECTILE_HIT_RADIUS_PX)
  ) {
    if (ball.kind !== NAVAL_WEAPON_ARROW) addNpcCombatSplash(ball);
    return;
  }

  applyNpcCombatHit(ball, ball.targetId, { x: ball.targetX, y: ball.targetY });
}

function combatShipFootprint(id) {
  if (id === PLAYER_COMBAT_ID) {
    if (!ship || !localLayout) throw new Error("Player hull footprint requires an active drawn ship");
    const heading = shipScreenHeading();
    const frame = shipFootprintFrame(requiredShipFootprints(ship.typeSlug), heading);
    return translatedShipFootprint(frame, localLayout.viewX, localLayout.viewY);
  }
  const state = npcVisualShips.get(id);
  if (!state) throw new Error(`Cannot resolve hull footprint for unknown NPC ship: ${id}`);
  const heading = npcShipScreenHeading(state.heading);
  const frame = shipFootprintFrame(requiredShipFootprints(state.slug), heading);
  return translatedShipFootprint(frame, state.x, state.y);
}

function applyNpcCombatHit(ball, targetId, point) {
  if (targetId === PLAYER_COMBAT_ID && playerShipIsInvulnerable()) return;
  playNavalImpactSound({ ...ball, targetX: point.x, targetY: point.y });
  if (targetId === PLAYER_COMBAT_ID) {
    ship.hitPoints = Math.max(0, ship.hitPoints - ball.damage);
    emitCaptureEvent("projectile-hit", {
      ownerId: ball.ownerId,
      targetId,
      weapon: ball.kind,
      damage: ball.damage,
      remainingHitPoints: ship.hitPoints
    });
    applyCrewCasualtiesFromHullDamage(ball.damage, "The last of the crew fell in battle.");
    if (ship.hitPoints <= 0) sinkPlayerShip("Your ship was sunk in battle.");
    else addHullSplinterBurst(ball, point);
    return;
  }

  const battery = shoreBatteryStates.get(targetId);
  if (battery) {
    applyShoreBatteryHit(ball, battery, point, false);
    return;
  }

  const damage = damageNpcShip(npcSeaRoutes, targetId, ball.damage);
  emitCaptureEvent("projectile-hit", {
    ownerId: ball.ownerId,
    targetId,
    weapon: ball.kind,
    damage: ball.damage,
    remainingHitPoints: damage.hitPoints
  });
  const state = npcVisualShips.get(targetId);
  if (state) state.hitPoints = damage.hitPoints;
  if (damage.sunk) handleNpcSinking(targetId, ball.ownerId);
  else {
    addHullSplinterBurst(ball, point);
    if (damage.shouldSurrender) handleNpcSurrender(targetId, ball.ownerId);
  }
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
  let playerPrizeSummary = null;
  const npcWinnerId = npcPrizeRecipientId(
    winnerId,
    npcSeaRoutes.shipById,
    shoreBatteryStates
  );
  const wonByShoreBattery = shoreBatteryStates.has(winnerId);
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
    playerPrizeSummary = {
      specie: received.specie,
      cargoQuantity
    };
  } else if (wonByShoreBattery) {
    const battery = shoreBatteryStates.get(winnerId);
    const captain = npcShipCaptains.get(loserId);
    const loserPoint = combatEntityPoint(loserId);
    const playerPoint = combatEntityPoint(PLAYER_COMBAT_ID);
    if (!battery) throw new Error(`Missing victorious shore battery: ${winnerId}`);
    if (!captain) throw new Error(`Surrendering NPC ship has no captain: ${loserId}`);
    if (!loserFactionId) throw new Error(`Surrendering NPC ship has no faction: ${loserId}`);
    const noticeText = shoreBatterySurrenderNotice({
      captainName: captain.name,
      nationalityAdjective: factionById(loserFactionId).adjective,
      portName: battery.cityName,
      playerPoint,
      surrenderPoint: loserPoint
    });
    if (noticeText) {
      combatNotice = {
        text: noticeText,
        expiresAtMs: lastFrameMs + COMBAT_NOTICE_MS
      };
    }
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
  if (playerPrizeSummary) openSurrenderPrizeDecision(loserId, playerPrizeSummary);
}

function openSurrenderPrizeDecision(npcShipId, lootSummary) {
  const existingSession = dialogueState?.kind === "ship" && dialogueState.npcShipId === npcShipId
    ? dialogueState
    : null;
  if (dialogueState && !existingSession) {
    throw new Error(`Cannot open surrender prize while ${dialogueState.kind} dialogue is active`);
  }
  const prizeShip = dialogueShipForId(npcShipId);
  dialogueState = prepareSurrenderPrizeDialogue(existingSession, prizeShip, {
    slug: ship.typeSlug,
    hitPoints: ship.hitPoints,
    maxHitPoints: ship.maxHitPoints,
    cargoUsed: cargoUsed(gameState)
  }, lootSummary);
  dialogueLayout = createDialogueLayoutState();
  ensureShipyardSideViewLoaded(prizeShip.slug);
  ensureDialoguePortraitLoaded();
  dirty = true;
}

function handleNpcSinking(loserId, winnerId) {
  const strategic = npcSeaRoutes.shipById.get(loserId);
  if (!strategic) return false;
  const visualState = npcVisualShips.get(loserId);
  if (visualState) spawnNpcShipSinkEffect(visualState, lastFrameMs);
  const factionId = strategic.factionId;
  sinkNpcShip(npcSeaRoutes, loserId, Math.floor(weatherClockMinutes));
  if (winnerId === PLAYER_COMBAT_ID) recordPlayerAttackConsequences(loserId, factionId);
  clearCombatForShip(loserId);
  npcVisualShips.delete(loserId);
  shipCombatEntryCollisionGrace.delete(loserId);
  npcCombatProjectiles = npcCombatProjectiles.filter((ball) => ball.ownerId !== loserId && ball.targetId !== loserId);
  combatNotice = {
    text: "SHIP SUNK",
    expiresAtMs: lastFrameMs + COMBAT_NOTICE_MS
  };
  return true;
}

function clearCombatForShip(shipId) {
  for (const [key, engagement] of [...shipCombatState.engagements.entries()]) {
    if (engagement.aId === shipId || engagement.bId === shipId) shipCombatState.engagements.delete(key);
  }
  for (const battery of shoreBatteryStates.values()) battery.engagedTargetIds.delete(shipId);
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
      footprint: combatShipFootprint(id)
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
    footprint: combatShipFootprint(id)
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
    if (playerShipIsInvulnerable()) return;
    ship.hitPoints = Math.max(0, ship.hitPoints - amount);
    applyCrewCasualtiesFromHullDamage(amount, "The last of the crew died after a collision.");
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
  if (damage.sunk) {
    handleNpcSinking(id, otherId);
    return;
  }
  if (!damage.shouldSurrender || !state) return;
  const directEnemy = shipCombatState.engagements.has(engagementKey(id, otherId));
  const winnerId = directEnemy ? otherId : state.combatTargetId;
  if (winnerId) handleNpcSurrender(id, winnerId);
}

function applyCrewCasualtiesFromHullDamage(damage, crewLossReason = "The last of the crew was lost at sea.") {
  if (!gameState || damage <= 0 || playerShipIsInvulnerable()) return 0;
  const lost = rollCrewCasualtiesForDamage(gameState, damage);
  if (lost <= 0) return 0;
  syncShipCargoFromGameState();
  showSurvivalNotice(`${lost} CREW LOST`, "warn");
  if (gameState.ship.crew <= 0) sinkPlayerShip(crewLossReason);
  return lost;
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
    clearNpcRiverRail(state);
  }
  const stormNavigation = npcStormNavigation(state);
  if (state.fishingAction && !state.combatMode && !stormNavigation) return collisionChanged;
  if (state.fishingAction) state.fishingAction = null;
  if (stormNavigation?.anchored) return collisionChanged;
  const portAvoidance = stormNavigation ? null : npcPirateMajorPortAvoidance(state);
  const combatNavigation = stormNavigation || portAvoidance ? null : npcCombatNavigation(state);
  const navigationPoint = stormNavigation?.routePoint || portAvoidance?.routePoint || combatNavigation?.routePoint || routePoint;

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
  const combatResponsePx = combatNavigation || portAvoidance ? NPC_COMBAT_RESPONSE_SPEED_PX * dt : 0;
  const startNav = shipNavigabilityAtLocalPoint(state.x, state.y, state.tileId, state.vector);
  const riverRailDistance = startNav.ok && startNav.kind === "river"
    ? NPC_RIVER_RAIL_MIN_SPEED_PX * dt
    : 0;
  const stepDistance = Math.min(
    distance,
    NPC_VISUAL_MAX_STEP_PX,
    Math.max(routeAdvancePx + catchupPx, stormResponsePx, combatResponsePx, riverRailDistance)
  );
  if (stepDistance <= 1e-4) return collisionChanged;

  const routeDirection = { x: dx / distance, y: dy / distance };
  const stats = shipStatsForSlug(state.slug);
  const strategicRiverDirection = startNav.ok && startNav.kind === "river" &&
    !stormNavigation && !portAvoidance && !combatNavigation
    ? tangentToScreenDirection(snapshot.routeHeading)
    : null;
  let direction = strategicRiverDirection || routeDirection;
  let tack = null;
  if (startNav.ok && startNav.kind !== "river" && stats.propulsion === SHIP_PROPULSION_SAIL) {
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
    const railMove = moveNpcAlongRiverRail(state, direction, distance, dt);
    if (railMove) {
      clearNpcEscapeManeuver(state);
      return railMove;
    }
  } else {
    clearNpcRiverRail(state);
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

  const escape = chooseNpcObstacleAvoidanceDirection({
    desiredDirection: direction,
    currentDirection: tangentToScreenDirection(state.heading) || direction,
    clearDistanceFor: (candidateDirection) => npcEscapeClearDistance(state, candidateDirection, heading),
    preferredSide: state.escapeSide
  });
  if (!escape) return null;

  const escapeMove = attemptNpcVisualStep(state, escape.direction, distance, heading);
  if (!escapeMove.ok) return null;
  commitNpcEscapeManeuver(state, escape.direction, escape.side, distance);
  return escapeMove;
}

function moveNpcAlongRiverRail(state, desiredDirection, distance, dt) {
  const selection = selectRiverRailPath({
    probes: riverCenterlineInfosAtLocalPoint(state.x, state.y, chart),
    desiredDirection,
    activePathKey: state.riverRailPathKey,
    activeDirectionSign: state.riverRailDirectionSign,
    excludedPathKey: state.riverRailExcludedPathKey
  });
  if (!selection) return null;
  const centerline = selection.probe;
  state.riverRailPathKey = centerline.pathKey;
  state.riverRailDirectionSign = selection.directionSign;
  state.riverRailExcludedPathKey = null;
  const target = advanceRiverCenterline(
    centerline.path,
    centerline.pathT,
    distance,
    selection.directionSign
  );
  const targetX = target.x + centerline.pathOffsetX;
  const targetY = target.y + centerline.pathOffsetY;
  const centerDx = centerline.centerlineX - state.x;
  const centerDy = centerline.centerlineY - state.y;
  const centerDistance = Math.hypot(centerDx, centerDy);
  const centerStep = Math.min(centerDistance, NPC_RIVER_RAIL_CENTERING_SPEED_PX * dt);
  const correctionScale = centerDistance > 1e-6 ? centerStep / centerDistance : 0;
  const dx = targetX - centerline.centerlineX + centerDx * correctionScale;
  const dy = targetY - centerline.centerlineY + centerDy * correctionScale;
  const moveDistance = Math.hypot(dx, dy);
  if (moveDistance <= 1e-6) return null;

  const direction = { x: dx / moveDistance, y: dy / moveDistance };
  const placement = npcRiverRailPlacement(
    state,
    state.x + dx,
    state.y + dy,
    direction
  );
  if (placement && target.reachedEnd) {
    state.riverRailExcludedPathKey = state.riverRailPathKey;
    state.riverRailPathKey = null;
    state.riverRailDirectionSign = 0;
  }
  return placement;
}

function npcRiverRailPlacement(state, x, y, movementDirection) {
  const nearest = nearestLocalCollisionTileAtPoint(x, y);
  if (!nearest || nearest.distancePx > SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX) return null;
  const vector = globePositionForLocalPoint(nearest.tileId, x, y);
  const nav = shipNavigabilityAtLocalPoint(x, y, nearest.tileId, vector);
  if (!nav.ok || (nav.kind !== "river" && nav.kind !== "openWater")) return null;
  const movementHeading = screenDirectionToTangent(movementDirection, state.vector, state.heading);
  const localHeading = normalizeTangentOrFallback(movementHeading, vector, state.heading);
  return {
    ok: true,
    x,
    y,
    tileId: nearest.tileId,
    vector,
    heading: localHeading
  };
}

function clearNpcRiverRail(state) {
  state.riverRailPathKey = null;
  state.riverRailDirectionSign = 0;
  state.riverRailExcludedPathKey = null;
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
    const collisionTile = localCollisionTileAtPoint(x, y);
    if (!collisionTile) return { ok: false };
    const tileId = collisionTile.tileId;
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

function nearestNpcNavigableVisualPoint(routePoint, heading, searchRadiusPx, slug) {
  if (!slug) throw new Error("NPC visual placement requires a ship slug");
  const direct = npcNavigableVisualPoint(routePoint.x, routePoint.y, heading, slug);
  if (direct) return direct;

  const routeTile = nearestLocalCollisionTileAtPoint(routePoint.x, routePoint.y);
  if (routeTile && routeTile.distancePx <= SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX &&
      shipTileHasRiver(routeTile.tileId) && !isShipOpenWaterTile(routeTile.tileId)) {
    const riverPlacement = nearestNpcVisualPointOfKind(routePoint, heading, "river", searchRadiusPx, slug);
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
    const candidate = npcNavigableVisualPoint(point.x, point.y, heading, slug);
    if (candidate) return candidate;
  }

  for (let radius = SHIP_COLLISION_SAMPLE_STEP_PX; radius <= searchRadiusPx; radius += SHIP_COLLISION_SAMPLE_STEP_PX) {
    for (let i = 0; i < NPC_VISUAL_ACTIVATION_ANGLE_COUNT; i++) {
      const angle = i / NPC_VISUAL_ACTIVATION_ANGLE_COUNT * Math.PI * 2;
      const candidate = npcNavigableVisualPoint(
        routePoint.x + Math.cos(angle) * radius,
        routePoint.y + Math.sin(angle) * radius,
        heading,
        slug
      );
      if (candidate) return candidate;
    }
  }
  return null;
}

function nearestNpcVisualPointOfKind(routePoint, heading, kind, searchRadiusPx, slug) {
  for (let radius = SHIP_COLLISION_SAMPLE_STEP_PX; radius <= searchRadiusPx; radius += SHIP_COLLISION_SAMPLE_STEP_PX) {
    for (let i = 0; i < NPC_VISUAL_ACTIVATION_ANGLE_COUNT; i++) {
      const angle = i / NPC_VISUAL_ACTIVATION_ANGLE_COUNT * Math.PI * 2;
      const candidate = npcNavigableVisualPoint(
        routePoint.x + Math.cos(angle) * radius,
        routePoint.y + Math.sin(angle) * radius,
        heading,
        slug
      );
      if (candidate?.navKind === kind) return candidate;
    }
  }
  return null;
}

function npcNavigableVisualPoint(x, y, heading, slug) {
  const nearest = nearestLocalCollisionTileAtPoint(x, y);
  if (!nearest || nearest.distancePx > SHIP_LOCAL_COLLISION_SEARCH_RADIUS_PX) return null;
  const tileId = nearest.tileId;
  const vector = globePositionForLocalPoint(tileId, x, y);
  const localHeading = normalizeTangentOrFallback(heading, vector, WORLD_NORTH);
  const nav = shipNavigabilityAtLocalPoint(x, y, tileId, vector);
  if (!nav.ok) return null;
  if (nav.kind !== "river") {
    const occupancy = vesselOccupancyAtPosition(vector, tileId, { x, y }, nav, localHeading);
    if (!occupancy.ok) return null;
  }
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
  const collisionTile = localCollisionTileAtPoint(x, y);
  if (!collisionTile) return null;
  const tileId = collisionTile.tileId;
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
  return precipParticles.length > 0 ||
    visiblePrecipitationLastRender ||
    playerStormIntensity() >= STORM_SCREEN_RAIN_ENTER_INTENSITY;
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
  const viewportWidth = Math.min(shell.clientWidth || window.innerWidth, viewport?.width || window.innerWidth);
  const viewportHeight = Math.min(shell.clientHeight || window.innerHeight, viewport?.height || window.innerHeight);
  const logical = CAPTURE_SCENARIO
    ? CAPTURE_VIEWPORT
    : responsiveLogicalViewport({ viewportWidth, viewportHeight });
  applyResponsiveViewport(logical.width, logical.height);
  const layout = canvasDisplayLayout({
    viewportWidth,
    viewportHeight,
    canvasWidth: SCREEN_W,
    canvasHeight: SCREEN_H,
    devicePixelRatio: safeDevicePixelRatio(),
    fitScreen: document.fullscreenElement === shell || coarsePointerIsPrimary()
  });
  canvas.style.left = `${layout.left}px`;
  canvas.style.top = `${layout.top}px`;
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;
}

function applyResponsiveViewport(width, height) {
  if (width === SCREEN_W && height === SCREEN_H) return;
  SCREEN_W = width;
  SCREEN_H = height;
  if (lakeBattleMode?.battle) resizeLakeBattle(lakeBattleMode.battle, width, height);
  lakeBattleTerrainChart = null;
  lakeBattleTerrainChartKey = "";
  canvas.width = width;
  canvas.height = height;
  syncCanvasAriaLabel();
  ctx.imageSmoothingEnabled = false;

  INTERACTION_BUTTON_X = Math.floor((SCREEN_W - INTERACTION_BUTTON_W) / 2);
  INTERACTION_BUTTON_Y = SCREEN_H - INTERACTION_BUTTON_H - 5;
  ANCHOR_BUTTON_X = Math.floor((SCREEN_W - ANCHOR_BUTTON_W - 4 - INTERACTION_BUTTON_W) / 2);
  ANCHOR_BUTTON_Y = INTERACTION_BUTTON_Y;
  MOUNTAIN_DISCOVERY_PANEL_X = Math.floor((SCREEN_W - MOUNTAIN_DISCOVERY_PANEL_W) / 2);
  DISCOVERIES_PANEL_W = Math.min(300, SCREEN_W - 12);
  DISCOVERIES_PANEL_H = Math.min(214, SCREEN_H - 12);
  SHIP_INFO_PANEL_W = SCREEN_W - SHIP_INFO_PANEL_X * 2;
  SHIP_INFO_PANEL_H = SCREEN_H - SHIP_INFO_PANEL_Y * 2;
  POLITICS_PANEL_W = SCREEN_W - POLITICS_PANEL_X * 2;
  POLITICS_PANEL_H = SCREEN_H - POLITICS_PANEL_Y * 2;
  PLAYER_INTRO_PANEL_W = Math.min(326, SCREEN_W - 12);
  PLAYER_INTRO_PANEL_H = Math.min(SCREEN_W < 400 ? 320 : 194, SCREEN_H - 12);
  PLAYER_INTRO_PANEL_X = Math.floor((SCREEN_W - PLAYER_INTRO_PANEL_W) / 2);
  PLAYER_INTRO_PANEL_Y = Math.floor((SCREEN_H - PLAYER_INTRO_PANEL_H) / 2);
  CAPTAIN_ALERT_PANEL_W = Math.min(286, SCREEN_W - 12);
  CAPTAIN_ALERT_PANEL_X = Math.floor((SCREEN_W - CAPTAIN_ALERT_PANEL_W) / 2);
  CAPTAIN_ALERT_PANEL_Y = Math.floor((SCREEN_H - CAPTAIN_ALERT_PANEL_H) / 2);
  START_MENU_PANEL_W = Math.min(244, SCREEN_W - 12);
  START_MENU_PANEL_X = Math.floor((SCREEN_W - START_MENU_PANEL_W) / 2);
  START_MENU_PANEL_Y = Math.floor((SCREEN_H - START_MENU_PANEL_H) / 2);
  CREDITS_PANEL_W = Math.min(338, SCREEN_W - 12);
  CREDITS_PANEL_H = Math.min(218, SCREEN_H - 12);
  CREDITS_PANEL_X = Math.floor((SCREEN_W - CREDITS_PANEL_W) / 2);
  CREDITS_PANEL_Y = Math.floor((SCREEN_H - CREDITS_PANEL_H) / 2);
  PAST_VOYAGES_PANEL_W = Math.min(338, SCREEN_W - 12);
  PAST_VOYAGES_PANEL_H = Math.min(238, SCREEN_H - 12);
  PAST_VOYAGES_PANEL_X = Math.floor((SCREEN_W - PAST_VOYAGES_PANEL_W) / 2);
  PAST_VOYAGES_PANEL_Y = Math.floor((SCREEN_H - PAST_VOYAGES_PANEL_H) / 2);
  GAME_OVER_PANEL_W = Math.min(350, SCREEN_W - 12);
  GAME_OVER_PANEL_X = Math.floor((SCREEN_W - GAME_OVER_PANEL_W) / 2);
  GAME_OVER_PANEL_Y = Math.floor((SCREEN_H - GAME_OVER_PANEL_H) / 2);
  MINIMAP_X = SCREEN_W - MINIMAP_W - 5;
  MINIMAP_Y = SCREEN_H - MINIMAP_H - 5;
  OPTIONS_BUTTON_X = SCREEN_W - OPTIONS_BUTTON_SIZE - 5;
  DISCOVERIES_BUTTON_X = OPTIONS_BUTTON_X - DISCOVERIES_BUTTON_SIZE - 3;
  SHIP_INFO_BUTTON_X = DISCOVERIES_BUTTON_X - SHIP_INFO_BUTTON_SIZE - 3;
  POLITICS_BUTTON_X = SHIP_INFO_BUTTON_X - POLITICS_BUTTON_SIZE - 3;

  if (playerIntroModal) playerIntroModal.buttonRect = playerIntroButtonRect();
  if (captainAlertModal) {
    captainAlertModal.buttonRect = captainAlertModal.kind === "sailing-help"
      ? sailingHelpButtonRect()
      : captainAlertButtonRect();
  }
  dirty = true;
}

function syncCanvasAriaLabel() {
  const surface = lakeBattleMode ? "ship battle lake" : "world map";
  canvas.setAttribute("aria-label", `Marque & Reprisal ${surface}, ${SCREEN_W} by ${SCREEN_H}`);
}

function coarsePointerIsPrimary() {
  return window.matchMedia?.("(pointer: coarse)")?.matches === true;
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
  } catch (error) {
    optionsMenu.fullscreenError = "FULLSCREEN FAILED";
    dirty = true;
    console.warn("[pixel-globe] fullscreen toggle failed", error);
  }
}

function handleFullscreenChange() {
  optionsMenu.fullscreenError = null;
  fitCanvasToDisplay();
  dirty = true;
}

function handleFullscreenVisibilityChange() {
  fitCanvasToDisplay();
  if (document.visibilityState === "hidden") saveVoyageNow("page hidden");
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
  if (lakeBattleMode) {
    drawLakeBattleMode(nowMs);
    if (optionsMenu.isOpen) drawOptionsMenu();
    return;
  }
  ctx.fillStyle = "#1f3650";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  ensureChart();
  const offset = chartOffsetPixels(chart);
  revealMinimapFromChart(chart, offset);

  ctx.save();
  ctx.translate(offset.x, offset.y);
  drawTerrainConnectorFaces(chart.faceCalls, chart);

  for (const call of chart.tileCalls) {
    drawTile(call, chart);
    drawIceSurface(call);
  }

  for (const call of chart.tileCalls) drawWeatherSurface(call);
  for (const call of chart.tileCalls) drawRiver(call, chart);
  for (const call of chart.riverConnectorCalls) drawRiverConnector(call, chart);
  const shipLight = shipSunLightState();
  drawFishIndividuals(chart, nowMs);
  drawPrecipitation(chart, nowMs, offset);
  drawCloudLayer(chart);
  drawShipWake(chart);
  drawNavalEffects(chart);
  drawCityShadows(chart, shipLight);
  drawSeagulls(chart, nowMs);
  drawWorldDiscoverySprites(chart);
  drawCitySprites(chart, nowMs);
  ctx.restore();

  drawShipShadow(chart, shipLight, offset);
  drawFishingNetAnimation(nowMs);
  drawNpcFishingNetAnimations(nowMs);
  drawShips(chart, shipLight, nowMs);
  ctx.save();
  ctx.translate(offset.x, offset.y);
  drawHullSplinterBursts(hullSplinterBursts);
  drawCitySpritesAboveShip(chart, offset, nowMs);
  drawCityLabels(chart.cityCalls, chart);
  ctx.restore();
  drawDayNightPaletteGrade();
  drawStormScreenRain(nowMs);
  drawStormEdgeFog(nowMs);
  drawStormShipStrike(nowMs);
  drawCombatBroadsideControls();
  drawSelectableInteractionOutlines(nowMs);
  drawWindIndicator(nowMs);
  if (minimapShouldBeVisible()) drawMinimap(nowMs);
  drawSurvivalMeters();
  drawQuestDestinationArrow(nowMs);
  drawColonizationDestinationArrow(nowMs);
  drawCampaignGoalDestinationArrow(nowMs);
  drawStormStatus(nowMs);
  drawCombatNotice(nowMs);
  drawFishCatchNotice(nowMs);
  drawSurvivalNotice(nowMs);
  if (portWaitState) {
    drawPortWaitControls();
  } else {
    drawAnchorButton();
    drawScavengeButton();
    drawInteractionButton();
  }
  drawDiscoveryNotice(nowMs);
  if (DEBUG_STATUS_ENABLED) drawTinyStatus(nowMs);
  if (dialogueState) drawDialogueOverlay(nowMs);
  if (!portWaitState) drawCaptainMenuButton();
  if (discoveriesMenu.isOpen) drawDiscoveriesMenu();
  if (shipInfoMenu.isOpen) drawShipInfoMenu();
  if (politicsMenu.isOpen) drawPoliticsMenu();
  if (captainMenu.isOpen && !captainChildMenuIsOpen()) drawCaptainMenu(nowMs);
  if (gameOverReason) drawGameOverOverlay(nowMs);
  if (playerIntroModal && !startMenu && !creditsMenu.isOpen) drawPlayerIntroModal(nowMs);
  if (captainAlertModal && !startMenu && !creditsMenu.isOpen) drawCaptainAlertModal();
  if (startMenu) drawStartMenu(nowMs);
  if (pastVoyagesMenu.isOpen) drawPastVoyagesMenu();
  if (creditsMenu.isOpen) drawCreditsMenu();
  if (optionsMenu.isOpen) drawOptionsMenu();
  drawStormLightningFlash(nowMs);
}

function drawStormShipStrike(nowMs) {
  const frame = stormShipStrikeFrame(stormShipStrikeState, nowMs);
  if (!frame || frame.index === STORM_SHIP_STRIKE_FLASH_FRAME) return;
  if (!stormShipStrikeImage) throw new Error("Storm ship lightning sheet is not loaded");
  if (!ship) throw new Error("Storm ship lightning cannot draw without the player ship");

  const origin = shipScreenOrigin(SHIP_SHEET_FRAME_SIZE);
  const bobbed = stormBobbedShipCall({
    tileId: ship.tileId,
    bobSeed: 0x504c4159,
    x: origin.x,
    y: origin.y
  }, nowMs);
  const drawOrigin = stormShipStrikeDrawOrigin({
    shipX: bobbed.x,
    shipY: bobbed.y,
    shipFrameSize: SHIP_SHEET_FRAME_SIZE
  });

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = "source-over";
  if (frame.mirrored) {
    ctx.translate(drawOrigin.x + STORM_SHIP_STRIKE_FRAME_WIDTH, drawOrigin.y);
    ctx.scale(-1, 1);
    ctx.drawImage(
      stormShipStrikeImage,
      frame.sourceX,
      frame.sourceY,
      STORM_SHIP_STRIKE_FRAME_WIDTH,
      STORM_SHIP_STRIKE_FRAME_HEIGHT,
      0,
      0,
      STORM_SHIP_STRIKE_FRAME_WIDTH,
      STORM_SHIP_STRIKE_FRAME_HEIGHT
    );
  } else {
    ctx.drawImage(
      stormShipStrikeImage,
      frame.sourceX,
      frame.sourceY,
      STORM_SHIP_STRIKE_FRAME_WIDTH,
      STORM_SHIP_STRIKE_FRAME_HEIGHT,
      drawOrigin.x,
      drawOrigin.y,
      STORM_SHIP_STRIKE_FRAME_WIDTH,
      STORM_SHIP_STRIKE_FRAME_HEIGHT
    );
  }
  ctx.restore();
}

function drawStormLightningFlash(nowMs) {
  const ambientFlash = consumeStormLightningFlash(stormLightningState);
  const shipStrikeFlash = consumeStormShipStrikeFlash(stormShipStrikeState, nowMs);
  if (!ambientFlash && !shipStrikeFlash) return;
  emitCaptureEvent("lightning", { shipStrike: shipStrikeFlash });
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.restore();
  playLightningStrikeSound();
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

function drawSelectableInteractionOutlines(nowMs) {
  if (!chart || !localLayout || portWaitState || dialogueState || menusAreOpen() || fishingAction || gameOverReason) return;
  const offset = chartOffsetPixels(chart);
  const primary = activeInteractionTarget();
  const primaryId = primary?.call?.id ?? primary?.call?.tileId ?? null;
  const pulseBright = reducedMotionPreferred || Math.floor(nowMs / 420) % 2 === 0;

  for (const call of chart.cityCalls || []) {
    if (call.hiddenSettlement) continue;
    if (!portCallInInteractionRange(call)) continue;
    drawSelectableSpriteOutline({
      image: cityImageForType(call.cityType, call.settlementType),
      sourceX: 0,
      sourceY: 0,
      sourceW: call.spriteW,
      sourceH: call.spriteH,
      x: Math.round(call.spriteX + offset.x),
      y: Math.round(call.spriteY + offset.y),
      primary: primaryId === call.tileId,
      pulseBright
    });
  }

  for (const state of npcVisualShips.values()) {
    if (!npcShipInHailRange(state)) continue;
    const baseCall = npcShipDrawCall(state, chart);
    if (!baseCall) continue;
    const call = stormBobbedShipCall(baseCall, nowMs);
    drawSelectableSpriteOutline({
      image: call.img,
      sourceX: (call.frame % SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE,
      sourceY: Math.floor(call.frame / SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE,
      sourceW: SHIP_SHEET_FRAME_SIZE,
      sourceH: SHIP_SHEET_FRAME_SIZE,
      x: call.x,
      y: call.y,
      primary: primaryId === state.id,
      pulseBright
    });
  }

  if (gameState && hasShipItem(gameState, SHIP_ITEM_FISHING_NET)) {
    const fishingDisabled = !canStartFishing(cargoFree(gameState));
    for (const call of fishIndividualDrawCalls(chart, nowMs)) {
      const interaction = fishInteractionCall(call);
      if (!fishInteractionCallIsUsable(interaction)) continue;
      drawSelectableSpriteOutline({
        image: tintedFishSprite(call.colors),
        sourceX: 0,
        sourceY: 0,
        sourceW: FISH_SPRITE_SIZE,
        sourceH: FISH_SPRITE_SIZE,
        x: Math.round(call.x + offset.x),
        y: Math.round(call.y + offset.y),
        flip: call.flip,
        primary: primaryId === call.id,
        pulseBright,
        disabled: fishingDisabled
      });
    }
  }
}

function drawSelectableSpriteOutline({
  image,
  sourceX,
  sourceY,
  sourceW,
  sourceH,
  x,
  y,
  flip = false,
  primary,
  pulseBright,
  disabled = false
}) {
  const color = disabled ? "#756c62" : primary && pulseBright ? "#fff4a8" : "#f9c22b";
  const outline = selectableSpriteOutlineCanvas(
    image,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    flip,
    color
  );
  ctx.drawImage(outline, Math.round(x) - 1, Math.round(y) - 1);
}

function selectableSpriteOutlineCanvas(image, sourceX, sourceY, sourceW, sourceH, flip, color) {
  let entries = selectableOutlineCache.get(image);
  if (!entries) {
    entries = new Map();
    selectableOutlineCache.set(image, entries);
  }
  const key = `${sourceX},${sourceY},${sourceW},${sourceH},${flip ? 1 : 0},${color}`;
  const cached = entries.get(key);
  if (cached) return cached;

  const outline = document.createElement("canvas");
  outline.width = sourceW + 2;
  outline.height = sourceH + 2;
  const outlineCtx = outline.getContext("2d");
  if (!outlineCtx) throw new Error("Could not create selectable sprite outline");
  outlineCtx.imageSmoothingEnabled = false;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    drawOutlineSource(
      outlineCtx,
      image,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      1 + dx,
      1 + dy,
      flip
    );
  }
  outlineCtx.globalCompositeOperation = "source-in";
  outlineCtx.fillStyle = color;
  outlineCtx.fillRect(0, 0, outline.width, outline.height);
  outlineCtx.globalCompositeOperation = "destination-out";
  drawOutlineSource(outlineCtx, image, sourceX, sourceY, sourceW, sourceH, 1, 1, flip);
  outlineCtx.globalCompositeOperation = "source-over";
  entries.set(key, outline);
  return outline;
}

function drawOutlineSource(targetCtx, image, sourceX, sourceY, sourceW, sourceH, x, y, flip) {
  if (!flip) {
    targetCtx.drawImage(image, sourceX, sourceY, sourceW, sourceH, x, y, sourceW, sourceH);
    return;
  }
  targetCtx.save();
  targetCtx.translate(x + sourceW, y);
  targetCtx.scale(-1, 1);
  targetCtx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
  targetCtx.restore();
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
  const explorerCampaign = gameState.memory.campaignGoal?.type === CAMPAIGN_GOAL_EXPLORER;
  for (const discovery of discoveryCatalog) {
    if (
      discovery.kind === "achievement" ||
      hasDiscovery(gameState, discovery.id) ||
      (!explorerCampaign && !isDiscoveryNovelToCharacter(discovery, gameState.playerCharacter))
    ) continue;
    const distancePx = discoveryDistancePx(discovery, ship.position);
    if (distancePx > discovery.radiusPx || distancePx >= nearestDistancePx) continue;
    nearest = discovery;
    nearestDistancePx = distancePx;
  }
  if (nearest) changed = queueDiscovery(nearest, nowMs) || changed;
  return changed;
}

function discoveryDistancePx(discovery, position) {
  const routeDirections = Array.isArray(discovery.routeDirections) ? discovery.routeDirections : [];
  const directions = routeDirections.length > 0 ? routeDirections : [discoveryDirection(discovery)];
  let nearestDistancePx = Infinity;
  for (const direction of directions) {
    nearestDistancePx = Math.min(nearestDistancePx, vectorArcDistance(position, direction) * PIXELS_PER_RADIAN);
  }
  return nearestDistancePx;
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
  const cargoReward = applyDiscoveryCargoReward(discovery);
  openDiscoveryCaptainDialogue(discovery, cargoReward);
  playDiscoverySuccessSound();
  emitCaptureEvent("discovery", {
    id: discovery.id,
    name: discovery.displayName || discovery.name || discovery.id,
    kind: discovery.kind
  });
  discoveryNoticeQueue.push(discovery);
  updateDiscoveryNotice(nowMs);
  saveVoyageNow("discovery");
  return true;
}

function applyDiscoveryCargoReward(discovery) {
  const reward = discovery.cargoReward;
  if (!reward?.fillRemainingHold) return null;
  const received = receiveDiscoveryCargo(
    gameState,
    discovery,
    reward.goodId,
    { simMinute: Math.floor(weatherClockMinutes) }
  );
  syncShipCargoFromGameState();
  return received;
}

function openDiscoveryCaptainDialogue(discovery, cargoReward) {
  const dialogue = captainDialogueForDiscovery(discovery, gameState?.playerCharacter);
  if (!dialogue) return false;
  let message = dialogue;
  if (discovery.id === EL_DORADO_DISCOVERY_ID && cargoReward) {
    const cargoMessage = cargoReward.quantity > 0
      ? `Every spare inch now holds gold: ${cargoReward.quantity} units.`
      : "But our hold is full; we cannot carry its treasure.";
    message = `${message} ${cargoMessage}`;
  }
  return openCaptainAlertModal(message, "happy");
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
  const citySpecs = [];
  const tileById = new Map();
  const visibleSet = new Set();
  const visiblePirateHideouts = gameState && npcSeaRoutes && pirateHideoutsVisibleToPlayer(gameState)
    ? pirateHideoutPortsByTileId
    : null;

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
    if (city) citySpecs.push({ city, tileCall });
    const pirateHideout = visiblePirateHideouts?.get(item.id);
    if (pirateHideout) citySpecs.push({ city: pirateHideout, tileCall });

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

  faceCalls.sort(compareTerrainConnectorDrawOrder);
  riverConnectorCalls.sort((a, b) => a.sortY - b.sortY || a.a - b.a || a.b - b.b);
  tileCalls.sort(compareTerrainDrawCalls);
  const waterIndex = buildWakeWaterIndex(tileCalls, riverConnectorCalls, { tileById });
  const placementChart = {
    tileById,
    waterIndex,
    right: chartCamera.right,
    up: chartCamera.up
  };
  for (const { city, tileCall } of citySpecs) cityCalls.push(makeCityCall(city, tileCall, placementChart));
  cityCalls.sort((a, b) => a.sortY - b.sortY || a.tileId - b.tileId);

  return {
    ...chartCamera,
    centerTileId: chartCenterTileId,
    visibleSet,
    tileById,
    waterIndex,
    faceCalls,
    riverConnectorCalls,
    tileCalls,
    cityCalls
  };
}

function makeCityCall(city, tileCall, activeChart) {
  const visualOffset = city.isPirateHideout
    ? { x: 18, y: -4 }
    : cityVisualOffset(city, tileCall, activeChart);
  const offsetX = visualOffset.x;
  const offsetY = visualOffset.y;
  const x = Math.round(tileCall.drawSurfaceX + offsetX);
  const y = Math.round(tileCall.drawSurfaceY + offsetY);
  const spriteX = Math.round(tileCall.drawSurfaceX - TILE_ART_HALF + offsetX);
  const spriteY = Math.round(tileCall.drawSurfaceY - TILE_ART_HALF + offsetY);
  const labelH = CITY_LABEL_H + CITY_LABEL_PAD_Y * 2;
  const character = city.isPirateHideout
    ? pirateHideoutCharacters.get(city.portId) || null
    : portCityCharacters?.get(city.tileId) || null;
  return {
    ...city,
    portId: city.portId || `city-${city.tileId}`,
    character,
    portrait: character ? characterExpression(character) : null,
    visualOffset,
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

function cityVisualOffset(city, tileCall, activeChart) {
  if (!activeChart?.waterIndex) throw new Error(`Cannot place city without a river index: ${city.city}`);
  const key = city.portId || `city-${city.tileId}`;
  const cached = cityVisualOffsets.get(key);
  if (cached) return cached;

  const image = cityImageForType(city.cityType, city.settlementType);
  const opaquePixels = cityOpaquePixels(image);
  const riverPixels = riverPixelsForCityPlacement(tileCall, activeChart);
  const baseSpriteX = Math.round(tileCall.drawSurfaceX - TILE_ART_HALF);
  const baseSpriteY = Math.round(tileCall.drawSurfaceY - TILE_ART_HALF);
  const preferredDirection = cityBankPreferenceVector(city);
  const offset = selectCityVisualOffset((candidate) => {
    let riverOverlapPixels = 0;
    for (const pixel of opaquePixels) {
      const x = baseSpriteX + candidate.x + pixel.x;
      const y = baseSpriteY + candidate.y + pixel.y;
      if (riverPixels.has(pixelMaskKey(x, y))) riverOverlapPixels++;
    }
    return {
      riverOverlapPixels,
      centerOnOpenWater: wakeMapPointIsWater(
        tileCall.drawSurfaceX + candidate.x,
        tileCall.drawSurfaceY + candidate.y,
        activeChart
      )
    };
  }, preferredDirection);
  cityVisualOffsets.set(key, offset);
  return offset;
}

function cityOpaquePixels(image) {
  const cached = cityOpaquePixelCache.get(image);
  if (cached) return cached;
  const mask = spriteAlphaMask(image);
  const pixels = [];
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.alpha[x + y * mask.width] > 0) pixels.push({ x, y });
    }
  }
  if (pixels.length === 0) throw new Error("City sprite contains no opaque pixels");
  cityOpaquePixelCache.set(image, pixels);
  return pixels;
}

function riverPixelsForCityPlacement(tileCall, activeChart) {
  const pixels = new Set();
  const extent = TILE_ART_HALF + CITY_VISUAL_MAX_OFFSET_PX;
  const minX = Math.floor(tileCall.drawSurfaceX - extent);
  const maxX = Math.ceil(tileCall.drawSurfaceX + extent);
  const minY = Math.floor(tileCall.drawSurfaceY - extent);
  const maxY = Math.ceil(tileCall.drawSurfaceY + extent);

  for (const entry of wakeWaterCandidatesForPoint(tileCall.drawSurfaceX, tileCall.drawSurfaceY, activeChart.waterIndex)) {
    if (entry.kind === "riverConnector") {
      for (const key of entry.waterPixels) {
        const comma = key.indexOf(",");
        const x = Number(key.slice(0, comma));
        const y = Number(key.slice(comma + 1));
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) pixels.add(key);
      }
      continue;
    }
    if (entry.kind !== "tile") continue;
    const mask = riverMasks?.[entry.call.id] || 0;
    if (mask === 0 || isWaterSurfaceRow(entry.call.row)) continue;
    const sprite = riverSpriteForTile(entry.call, activeChart, mask);
    if (!sprite) continue;
    const alphaMask = spriteAlphaMask(sprite);
    const originX = Math.round(entry.call.drawSurfaceX - TILE_ART_HALF);
    const originY = Math.round(entry.call.drawSurfaceY - TILE_ART_HALF);
    for (let y = 0; y < alphaMask.height; y++) {
      const mapY = originY + y;
      if (mapY < minY || mapY > maxY) continue;
      for (let x = 0; x < alphaMask.width; x++) {
        if (alphaMask.alpha[x + y * alphaMask.width] === 0) continue;
        const mapX = originX + x;
        if (mapX < minX || mapX > maxX) continue;
        pixels.add(pixelMaskKey(mapX, mapY));
      }
    }
  }
  return pixels;
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
      path,
      waterPixels: riverConnectorWaterPixels(call, geometry)
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

function syncCartographyToGameState() {
  if (!gameState || !minimap) return;
  const packed = new Uint8Array(Math.ceil(minimap.seenTiles.length / 8));
  for (let tileId = 0; tileId < minimap.seenTiles.length; tileId++) {
    if (minimap.seenTiles[tileId] !== 0) packed[tileId >> 3] |= 1 << (tileId & 7);
  }
  updateCartographyMemory(gameState, bytesToBase64(packed), minimap.seenTileCount);
}

function restoreCartographyFromGameState() {
  if (!gameState || !minimap) throw new Error("Cannot restore cartography before game state and minimap exist");
  const memory = gameState.memory.cartography;
  minimap.seenTiles.fill(0);
  minimap.revealedPixels.fill(0);
  minimap.seenTileCount = 0;
  fillMinimapCanvas(minimap.ctx, MINIMAP_UNKNOWN_COLOR);
  if (memory.seenTilesBase64 === "") {
    if (memory.seenTileCount !== 0) throw new Error("Cartography count has no saved tile mask");
    return;
  }
  const packed = base64ToBytes(memory.seenTilesBase64);
  const expectedBytes = Math.ceil(graph.tileCount / 8);
  if (packed.length !== expectedBytes) {
    throw new Error(`Cartography tile mask has ${packed.length} bytes; expected ${expectedBytes}`);
  }
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if ((packed[tileId >> 3] & (1 << (tileId & 7))) !== 0) revealMinimapTile(tileId);
  }
  if (minimap.seenTileCount !== memory.seenTileCount) {
    throw new Error(`Cartography count mismatch: mask=${minimap.seenTileCount} state=${memory.seenTileCount}`);
  }
}

function mappedPercentForState(state) {
  if (!state || !graph) return 0;
  const seenTileCount = state === gameState && minimap
    ? minimap.seenTileCount
    : state.memory.cartography.seenTileCount;
  return clamp(seenTileCount / graph.tileCount * 100, 0, 100);
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(encoded) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
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

function minimapShouldBeVisible() {
  return SCREEN_W >= SCREEN_H;
}

function getCaptainMenuButtonRect() {
  return {
    x: OPTIONS_BUTTON_X,
    y: OPTIONS_BUTTON_Y,
    w: OPTIONS_BUTTON_SIZE,
    h: OPTIONS_BUTTON_SIZE
  };
}

function getOptionsButtonRect() {
  return {
    x: OPTIONS_BUTTON_X,
    y: OPTIONS_BUTTON_Y,
    w: OPTIONS_BUTTON_SIZE,
    h: OPTIONS_BUTTON_SIZE
  };
}

function drawCaptainMenuButton() {
  if (startMenu || gameOverReason || playerIntroModal || captainAlertModal || dialogueState) return;
  const rect = getCaptainMenuButtonRect();
  captainMenu.buttonRect = rect;
  const hovered = !menusAreOpen() && pointInRect(captainMenu.hoverPoint, expandedRect(rect, 3));
  ctx.save();
  drawPirateHudButton(rect, hovered);
  ctx.fillStyle = PIRATE_MENU_INK;
  const menuLineX = rect.x + Math.floor((rect.w - 15) / 2);
  const menuLineY = rect.y + Math.floor((rect.h - 12) / 2);
  ctx.fillRect(menuLineX, menuLineY, 15, 2);
  ctx.fillRect(menuLineX, menuLineY + 5, 15, 2);
  ctx.fillRect(menuLineX, menuLineY + 10, 15, 2);
  ctx.restore();
}

function drawCaptainMenu(nowMs) {
  const panel = {
    x: Math.floor((SCREEN_W - Math.min(CAPTAIN_MENU_PANEL_W, SCREEN_W - 12)) / 2),
    y: Math.floor((SCREEN_H - Math.min(CAPTAIN_MENU_PANEL_H, SCREEN_H - 12)) / 2),
    w: Math.min(CAPTAIN_MENU_PANEL_W, SCREEN_W - 12),
    h: Math.min(CAPTAIN_MENU_PANEL_H, SCREEN_H - 12)
  };
  captainMenu.panelRect = panel;
  captainMenu.closeButtonRect = {
    x: panel.x + panel.w - UI_ICON_BUTTON_SIZE - 6,
    y: panel.y + 6,
    w: UI_ICON_BUTTON_SIZE,
    h: UI_ICON_BUTTON_SIZE
  };

  ctx.save();
  drawPiratePaperModal(panel, 0.82);
  drawOptionsCloseButton(
    captainMenu.closeButtonRect,
    pointInRect(captainMenu.hoverPoint, captainMenu.closeButtonRect)
  );
  drawOptionsText("CAPTAIN'S CHART", panel.x + panel.w / 2, panel.y + 10, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center",
    color: PIRATE_MENU_INK
  });

  drawCaptainChart(panel, nowMs);
  ctx.restore();
}

function drawCaptainMenuItemIcon(index, x, y, active) {
  const iconId = CAPTAIN_MENU_ICON_IDS[index];
  if (!iconId) throw new Error(`Captain menu item has no icon: ${index}`);
  drawGameIcon(iconId, x - 1, y - 1, { alpha: active ? 1 : 0.82 });
}

function drawGameIcon(iconId, x, y, options = {}) {
  if (!gameIconAtlasImage) throw new Error("Game icon atlas is not loaded");
  if (!gameIconOutlineAtlasImage) throw new Error("Game icon outline atlas is not initialized");
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Game icon options must be an object");
  }
  const { alpha = 1, contrastOutline = false } = options;
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) throw new Error(`Invalid game icon alpha: ${alpha}`);
  if (typeof contrastOutline !== "boolean") throw new Error(`Invalid game icon outline mode: ${contrastOutline}`);
  const source = gameIconAtlasRect(iconId);
  const destination = gameIconDrawRect(x, y);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  if (contrastOutline) {
    ctx.drawImage(
      gameIconOutlineAtlasImage,
      source.x,
      source.y,
      source.w,
      source.h,
      destination.x,
      destination.y,
      destination.w,
      destination.h
    );
  }
  ctx.drawImage(
    gameIconAtlasImage,
    source.x,
    source.y,
    source.w,
    source.h,
    destination.x,
    destination.y,
    destination.w,
    destination.h
  );
  ctx.restore();
}

function drawCaptainChart(panel, nowMs) {
  const mapW = panel.w - 24;
  const mapH = Math.min(Math.floor(mapW * MINIMAP_H / MINIMAP_W), panel.h - 82);
  const mapX = panel.x + 12;
  const mapY = panel.y + 34;
  ctx.fillStyle = "#1a1511";
  ctx.fillRect(mapX - 2, mapY - 2, mapW + 4, mapH + 4);
  ctx.strokeStyle = "#715033";
  ctx.strokeRect(mapX - 1.5, mapY - 1.5, mapW + 3, mapH + 3);
  drawScaledCenteredMinimap(mapX, mapY, mapW, mapH);

  const markerX = Math.round(mapX + mapW / 2);
  const markerY = Math.round(mapY + minimapY(graph.latDeg[centerTileId]) / MINIMAP_H * mapH);
  ctx.fillStyle = Math.floor(nowMs / 320) % 2 === 0 ? "#fff4a8" : "#5b4627";
  ctx.fillRect(markerX - 1, markerY - 1, 3, 3);

  const mapped = minimap ? minimap.seenTileCount / graph.tileCount : 0;
  drawOptionsText(`MAPPED ${(mapped * 100).toFixed(2)}%`, panel.x + panel.w / 2, mapY + mapH + 12, {
    align: "center",
    color: PIRATE_MENU_INK_MUTED
  });
  drawCaptainChartNavigation(panel);
}

function drawCaptainChartNavigation(panel) {
  const gap = 4;
  const navH = 36;
  const availableW = panel.w - 24;
  const itemW = Math.floor((availableW - gap * (CAPTAIN_MENU_LABELS.length - 1)) / CAPTAIN_MENU_LABELS.length);
  const totalW = itemW * CAPTAIN_MENU_LABELS.length + gap * (CAPTAIN_MENU_LABELS.length - 1);
  const startX = panel.x + Math.floor((panel.w - totalW) / 2);
  const y = panel.y + panel.h - navH - 8;
  captainMenu.itemRects = CAPTAIN_MENU_LABELS.map((_, index) => ({
    x: startX + index * (itemW + gap),
    y,
    w: itemW,
    h: navH
  }));

  let hoveredIndex = -1;
  captainMenu.itemRects.forEach((rect, index) => {
    const selected = index === captainMenu.selectedIndex;
    const hovered = pointInRect(captainMenu.hoverPoint, rect);
    if (hovered) hoveredIndex = index;
    drawPiratePaperInset(rect, selected || hovered);
    drawCaptainMenuItemIcon(
      index,
      rect.x + Math.floor((rect.w - 13) / 2),
      rect.y + Math.floor((rect.h - 13) / 2),
      selected || hovered
    );
  });

  const labelIndex = hoveredIndex >= 0 ? hoveredIndex : captainMenu.selectedIndex;
  drawOptionsText(CAPTAIN_MENU_LABELS[labelIndex], panel.x + panel.w / 2, y - 13, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center",
    color: PIRATE_MENU_INK
  });
}

function drawScaledCenteredMinimap(x, y, width, height) {
  if (!minimap) return;
  const startX = wrapMinimapX(minimapX(graph.lonDeg[centerTileId]) - MINIMAP_CENTER_X);
  const firstW = MINIMAP_W - startX;
  const firstDisplayW = width * firstW / MINIMAP_W;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(minimap.canvas, startX, 0, firstW, MINIMAP_H, x, y, firstDisplayW, height);
  if (startX > 0) {
    ctx.drawImage(minimap.canvas, 0, 0, startX, MINIMAP_H, x + firstDisplayW, y, width - firstDisplayW, height);
  }
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
  drawPirateHudButton(rect, hovered);
  drawGameIcon("menu:ship", rect.x + Math.floor((rect.w - GAME_ICON_SIZE) / 2), rect.y + Math.floor((rect.h - GAME_ICON_SIZE) / 2));
  if (hovered) {
    const label = "SHIP";
    const width = measurePixelTextWidth(label, PIXEL_FONT_SMALL_8) + 6;
    ctx.fillStyle = PIRATE_MENU_PAPER;
    ctx.fillRect(rect.x - width + rect.w, rect.y + rect.h + 2, width, 11);
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText(label, rect.x + rect.w - 3, rect.y + rect.h + 4, {
      font: PIXEL_FONT_SMALL_8,
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
  drawPirateHudButton(rect, hovered);
  drawGameIcon("menu:politics", rect.x + Math.floor((rect.w - GAME_ICON_SIZE) / 2), rect.y + Math.floor((rect.h - GAME_ICON_SIZE) / 2));
  if (hovered) {
    const label = "POLITICS";
    const width = measurePixelTextWidth(label, PIXEL_FONT_SMALL_8) + 6;
    ctx.fillStyle = PIRATE_MENU_PAPER;
    ctx.fillRect(rect.x - width + rect.w, rect.y + rect.h + 2, width, 11);
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText(label, rect.x + rect.w - 3, rect.y + rect.h + 4, {
      font: PIXEL_FONT_SMALL_8,
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
  drawPirateHudButton(rect, hovered);
  drawGameIcon("menu:discoveries", rect.x + Math.floor((rect.w - GAME_ICON_SIZE) / 2), rect.y + Math.floor((rect.h - GAME_ICON_SIZE) / 2));
  if (hovered) {
    const label = "DISCOVERIES";
    const width = measurePixelTextWidth(label, PIXEL_FONT_SMALL_8) + 6;
    ctx.fillStyle = PIRATE_MENU_PAPER;
    ctx.fillRect(rect.x - width + rect.w, rect.y + rect.h + 2, width, 11);
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText(label, rect.x + rect.w - 3, rect.y + rect.h + 4, {
      font: PIXEL_FONT_SMALL_8,
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
  drawPirateHudButton(rect, hovered);
  drawGameIcon("menu:options", rect.x + Math.floor((rect.w - GAME_ICON_SIZE) / 2), rect.y + Math.floor((rect.h - GAME_ICON_SIZE) / 2));
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
  drawPiratePaperModal(panel, 0.9);

  shipInfoMenu.closeButtonRect = {
    x: panel.x + panel.w - UI_ICON_BUTTON_SIZE - 6,
    y: panel.y + 6,
    w: UI_ICON_BUTTON_SIZE,
    h: UI_ICON_BUTTON_SIZE
  };
  drawShipInfoCloseButton(
    shipInfoMenu.closeButtonRect,
    pointInRect(optionsMenu.hoverPoint, shipInfoMenu.closeButtonRect)
  );
  drawShipInfoTabs(panel);
  const vesselTitle = view.captainName ? `${view.captainName} / ${view.label}` : view.label;
  if (SCREEN_W < 400) {
    const compactTitle = shipInfoMenu.view === "ledger"
      ? "CAPTAIN'S LEDGER"
      : shipInfoMenu.view === "papers"
        ? "SHIP'S INVENTORY"
        : vesselTitle.toUpperCase();
    drawOptionsText(
      fitPixelText(compactTitle, PIXEL_FONT_SMALL_8, panel.w - 24),
      panel.x + panel.w / 2,
      panel.y + 35,
      { align: "center", color: PIRATE_MENU_INK }
    );
    if (shipInfoMenu.view === "ledger") drawCompactShipLedger(panel, view);
    else if (shipInfoMenu.view === "papers") drawCompactShipPapers(panel, view);
    else drawCompactShipVessel(panel, view, cargoPage);
    ctx.restore();
    return;
  }
  const title = shipInfoMenu.view === "ledger"
    ? "CAPTAIN'S LEDGER"
    : shipInfoMenu.view === "papers"
      ? "SHIP'S INVENTORY"
      : vesselTitle.toUpperCase();
  const titleLeft = shipInfoMenu.papersTabRect.x + shipInfoMenu.papersTabRect.w + 7;
  const titleRight = shipInfoMenu.closeButtonRect.x - 7;
  drawOptionsText(
    fitPixelText(title, PIXEL_FONT_SMALL_8, titleRight - titleLeft),
    (titleLeft + titleRight) / 2,
    panel.y + 8,
    {
      align: "center",
      color: PIRATE_MENU_INK
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
  const artY = panel.y + 36;
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
  drawShipInfoValueRow(
    `CREW / ${view.armamentLabel}`,
    `${view.crew}/${view.crewCapacity}  ${view.armamentSummary}`,
    statsX,
    valueX,
    panel.y + 53
  );
  drawShipInfoValueRow("PROPULSION", view.propulsionSummary, statsX, valueX, panel.y + 65);
  drawShipInfoRating("SPEED", view.ratings.speed, statsX, panel.y + 80);
  drawShipInfoRating("ACCEL", view.ratings.acceleration, statsX, panel.y + 93);
  drawShipInfoRating("TURNING", view.ratings.turning, statsX, panel.y + 106);
  drawShipInfoRating("WINDWARD", view.ratings.windward, statsX, panel.y + 119);
  drawShipInfoRating("SEAWORTHY", view.seaworthiness, statsX, panel.y + 132);
  const provisionY = artY + SHIP_INFO_SIDE_VIEW_H + 2;
  drawOptionsText(`WATER ${Math.ceil(view.survival.freshWaterDays)}D`, artX, provisionY, {
    color: view.survival.freshWaterFraction <= 0.16 ? PIRATE_MENU_DANGER : PIRATE_MENU_CHART_LINE
  });
  drawOptionsText(`FOOD ${Math.floor(view.survival.foodDays)}D`, artX + 91, provisionY, {
    color: view.survival.foodDays <= 3 ? PIRATE_MENU_DANGER : PIRATE_MENU_INK_MUTED
  });

  const cargoY = panel.y + 155;
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  ctx.fillRect(panel.x + 10, cargoY - 3, panel.w - 20, 1);
  drawOptionsText("CARGO HOLD", panel.x + 12, cargoY + 1, { color: PIRATE_MENU_INK });
  drawOptionsText(`${view.cargoUsed}/${view.cargoCapacity}`, panel.x + 105, cargoY + 1, {
    align: "right",
    color: PIRATE_MENU_INK
  });
  drawShipInfoBar(panel.x + 116, cargoY + 2, 150, view.cargoUsed / view.cargoCapacity, "#fbb954");
  drawOptionsText(`${view.doubloons} DOUBLOONS`, panel.x + panel.w - 12, cargoY + 1, {
    align: "right",
    color: PIRATE_MENU_INK
  });

  if (cargoPage.rows.length === 0) {
    drawOptionsText("THE HOLD IS EMPTY", panel.x + 12, cargoY + 24, { color: PIRATE_MENU_INK_MUTED });
  } else {
    cargoPage.rows.forEach((row, index) => {
      const column = Math.floor(index / 4);
      const rowIndex = index % 4;
      const x = panel.x + 12 + column * 207;
      const y = cargoY + 19 + rowIndex * 17;
      drawGameIcon(tradeGoodIconId(row.id), x, y - 4);
      drawOptionsText(
        fitPixelText(`${row.label} x${row.quantity}`, PIXEL_FONT_SMALL_8, 130),
        x + GAME_ICON_SIZE + 4,
        y,
        { color: PIRATE_MENU_INK }
      );
      const basisLabel = row.averageCost === null ? "AVG --" : `AVG ${Math.round(row.averageCost)} DB`;
      drawOptionsText(basisLabel, x + 194, y, { align: "right", color: PIRATE_MENU_INK_MUTED });
    });
  }

  const pagerY = panel.y + panel.h - UI_PAGER_BUTTON_H - 5;
  if (cargoPage.pageCount > 1) {
    shipInfoMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
    shipInfoMenu.nextPageRect = { x: panel.x + panel.w - 12 - UI_PAGER_BUTTON_W, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
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
      color: PIRATE_MENU_INK_MUTED
    });
  } else {
    shipInfoMenu.previousPageRect = null;
    shipInfoMenu.nextPageRect = null;
  }
  ctx.restore();
}

function drawCompactShipVessel(panel, view, cargoPage) {
  const artX = panel.x + Math.floor((panel.w - SHIP_INFO_SIDE_VIEW_W) / 2);
  const artY = panel.y + 48;
  ctx.fillStyle = "#323353";
  ctx.fillRect(artX, artY, SHIP_INFO_SIDE_VIEW_W, SHIP_INFO_SIDE_VIEW_H);
  ctx.strokeStyle = "#7f708a";
  ctx.strokeRect(artX + 0.5, artY + 0.5, SHIP_INFO_SIDE_VIEW_W - 1, SHIP_INFO_SIDE_VIEW_H - 1);
  const sideView = shipInfoImages.get(view.slug);
  if (sideView) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sideView, artX, artY);
  } else {
    drawOptionsText(shipInfoMenu.error || "LOADING SHIP...", panel.x + panel.w / 2, artY + 48, {
      align: "center",
      color: shipInfoMenu.error ? "#f68181" : "#9babb2"
    });
  }

  const labelX = panel.x + 12;
  const valueX = panel.x + panel.w - 12;
  let y = artY + SHIP_INFO_SIDE_VIEW_H + 10;
  drawShipInfoValueRow("HULL", `${view.hull}/${view.maxHull}`, labelX, valueX, y);
  drawShipInfoBar(labelX + 62, y + 1, Math.max(30, panel.w - 112), view.hull / view.maxHull, "#91db69");
  y += 13;
  drawShipInfoValueRow(
    `CREW / ${view.armamentLabel}`,
    `${view.crew}/${view.crewCapacity}  ${view.armamentSummary}`,
    labelX,
    valueX,
    y
  );
  y += 12;
  drawShipInfoValueRow("PROPULSION", view.propulsionSummary, labelX, valueX, y);
  y += 13;
  const ratings = [
    ["SPEED", view.ratings.speed],
    ["ACCEL", view.ratings.acceleration],
    ["TURNING", view.ratings.turning],
    ["WINDWARD", view.ratings.windward],
    ["SEAWORTHY", view.seaworthiness]
  ];
  for (const [label, rating] of ratings) {
    drawCompactShipRating(label, rating, labelX, valueX, y);
    y += 12;
  }
  drawOptionsText(`WATER ${Math.ceil(view.survival.freshWaterDays)}D`, labelX, y + 1, {
    color: view.survival.freshWaterFraction <= 0.16 ? PIRATE_MENU_DANGER : PIRATE_MENU_CHART_LINE
  });
  drawOptionsText(`FOOD ${Math.floor(view.survival.foodDays)}D`, valueX, y + 1, {
    align: "right",
    color: view.survival.foodDays <= 3 ? PIRATE_MENU_DANGER : PIRATE_MENU_INK_MUTED
  });
  y += 17;

  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  ctx.fillRect(panel.x + 10, y, panel.w - 20, 1);
  drawOptionsText("CARGO HOLD", labelX, y + 6, { color: PIRATE_MENU_INK });
  drawOptionsText(`${view.cargoUsed}/${view.cargoCapacity}`, labelX + 89, y + 6, {
    align: "right",
    color: PIRATE_MENU_INK
  });
  drawOptionsText(`${view.doubloons} DB`, valueX, y + 6, { align: "right", color: PIRATE_MENU_INK });
  y += 20;
  if (cargoPage.rows.length === 0) {
    drawOptionsText("THE HOLD IS EMPTY", labelX, y, { color: PIRATE_MENU_INK_MUTED });
  } else {
    const maxRows = Math.max(1, Math.floor((panel.y + panel.h - 22 - y) / 17));
    cargoPage.rows.slice(0, maxRows).forEach((row, index) => {
      const rowY = y + index * 17;
      drawGameIcon(tradeGoodIconId(row.id), labelX, rowY - 4);
      drawOptionsText(
        fitPixelText(`${row.label} x${row.quantity}`, PIXEL_FONT_SMALL_8, panel.w - 108),
        labelX + GAME_ICON_SIZE + 4,
        rowY,
        { color: PIRATE_MENU_INK }
      );
      const basis = row.averageCost === null ? "AVG --" : `AVG ${Math.round(row.averageCost)} DB`;
      drawOptionsText(basis, valueX, rowY, { align: "right", color: PIRATE_MENU_INK_MUTED });
    });
  }
  drawCompactShipPager(panel, cargoPage.page, cargoPage.pageCount, "MANIFEST");
}

function drawCompactShipRating(label, rating, x, valueX, y) {
  drawOptionsText(label, x, y, { color: PIRATE_MENU_INK });
  const meterX = x + 80;
  for (let index = 0; index < 10; index++) {
    ctx.fillStyle = index < rating ? PIRATE_MENU_CHART_LINE : PIRATE_MENU_PAPER_INSET_ALT;
    ctx.fillRect(meterX + index * 7, y + 2, 5, 5);
  }
  drawOptionsText(String(rating), valueX, y, { align: "right", color: PIRATE_MENU_INK });
}

function drawCompactShipLedger(panel, view) {
  const page = shipLedgerPage(gameState, shipInfoMenu.ledgerPage);
  shipInfoMenu.ledgerPage = page.page;
  const left = panel.x + 12;
  const right = panel.x + panel.w - 12;
  const top = panel.y + 43;
  const realized = Math.round(view.realizedPnl);
  drawOptionsText(`P/L ${formatSignedLedgerMoney(realized)} DB`, left, top, { color: ledgerPnlColor(realized) });
  drawOptionsText(`CASH ${view.doubloons} DB`, right, top, { align: "right", color: PIRATE_MENU_INK });
  const availableH = panel.y + panel.h - UI_PAGER_BUTTON_H - 7 - (top + 14);
  const rowH = Math.max(20, Math.floor(availableH / Math.max(1, page.rows.length)));
  page.rows.forEach((entry, index) => {
    const y = top + 15 + index * rowH;
    ctx.fillStyle = index % 2 === 0 ? "rgba(113, 80, 51, 0.18)" : "rgba(113, 80, 51, 0.07)";
    ctx.fillRect(panel.x + 10, y - 3, panel.w - 20, rowH - 1);
    drawOptionsText(shipLedgerDateLabel(entry.simMinute), left, y, { color: PIRATE_MENU_INK_MUTED });
    drawOptionsText(fitPixelText(entry.location.toUpperCase(), PIXEL_FONT_SMALL_8, panel.w - 125), left + 70, y, {
      color: PIRATE_MENU_CHART_LINE
    });
    drawOptionsText(formatSignedLedgerMoney(entry.amount), right, y, {
      align: "right",
      color: entry.amount < 0 ? "#f68181" : "#91db69"
    });
    drawOptionsText(fitPixelText(entry.description.toUpperCase(), PIXEL_FONT_SMALL_8, panel.w - 82), left, y + 9, {
      color: PIRATE_MENU_INK
    });
    const pnl = entry.pnl === null ? `BAL ${Math.round(entry.balance)}` : `P/L ${formatSignedLedgerMoney(entry.pnl)}`;
    drawOptionsText(pnl, right, y + 9, {
      align: "right",
      color: entry.pnl === null ? "#f9c22b" : ledgerPnlColor(entry.pnl)
    });
  });
  drawCompactShipPager(panel, page.page, page.pageCount, "LEDGER");
}

function drawCompactShipPapers(panel, view) {
  const page = shipPapersPage(view, shipInfoMenu.papersPage);
  shipInfoMenu.papersPage = page.page;
  const left = panel.x + 12;
  const right = panel.x + panel.w - 12;
  const top = panel.y + 43;
  drawOptionsText("ITEMS & DOCUMENTS", left, top, { color: PIRATE_MENU_INK });
  drawOptionsText(`${view.papers.length} HELD`, right, top, { align: "right", color: PIRATE_MENU_INK_MUTED });
  if (page.rows.length === 0) drawOptionsText("INVENTORY IS EMPTY", left, top + 21, { color: PIRATE_MENU_INK_MUTED });
  const availableH = panel.y + panel.h - UI_PAGER_BUTTON_H - 7 - (top + 14);
  const rowH = Math.max(26, Math.floor(availableH / Math.max(1, page.rows.length)));
  page.rows.forEach((paper, index) => {
    const y = top + 16 + index * rowH;
    ctx.fillStyle = index % 2 === 0 ? "rgba(113, 80, 51, 0.18)" : "rgba(113, 80, 51, 0.07)";
    ctx.fillRect(panel.x + 10, y - 3, panel.w - 20, rowH - 1);
    drawOptionsText(paper.kind.toUpperCase(), left, y, { color: paper.kind === "marque" ? "#91db69" : "#fbb954" });
    drawOptionsText(shipLedgerDateLabel(paper.simMinute), right, y, { align: "right", color: PIRATE_MENU_INK_MUTED });
    drawOptionsText(fitPixelText(paper.title.toUpperCase(), PIXEL_FONT_SMALL_8, panel.w - 24), left, y + 9, {
      color: PIRATE_MENU_INK
    });
    drawOptionsText(fitPixelText(paper.route.toUpperCase(), PIXEL_FONT_SMALL_8, panel.w - 24), left, y + 18, {
      color: PIRATE_MENU_CHART_LINE
    });
  });
  drawCompactShipPager(panel, page.page, page.pageCount, "INVENTORY");
}

function drawCompactShipPager(panel, page, pageCount, label) {
  const pagerY = panel.y + panel.h - UI_PAGER_BUTTON_H - 5;
  if (pageCount > 1) {
    shipInfoMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
    shipInfoMenu.nextPageRect = { x: panel.x + panel.w - 12 - UI_PAGER_BUTTON_W, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
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
  drawOptionsText(`${label} ${page + 1}/${pageCount}`, panel.x + panel.w / 2, pagerY + 2, {
    align: "center",
    color: PIRATE_MENU_INK_MUTED
  });
}

function drawShipInfoTabs(panel) {
  shipInfoMenu.vesselTabRect = { x: panel.x + 8, y: panel.y + 6, w: 48, h: UI_TAB_H };
  shipInfoMenu.ledgerTabRect = { x: panel.x + 59, y: panel.y + 6, w: 51, h: UI_TAB_H };
  shipInfoMenu.papersTabRect = { x: panel.x + 113, y: panel.y + 6, w: 66, h: UI_TAB_H };
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
    "INVENTORY",
    shipInfoMenu.view === "papers",
    pointInRect(optionsMenu.hoverPoint, shipInfoMenu.papersTabRect)
  );
}

function drawShipInfoTab(rect, label, selected, hovered) {
  drawPiratePaperInset(rect, selected || hovered);
  drawOptionsText(label, rect.x + rect.w / 2, rect.y + Math.floor((rect.h - 8) / 2), {
    align: "center",
    color: PIRATE_MENU_INK
  });
}

function drawShipLedger(panel, view) {
  const page = shipLedgerPage(gameState, shipInfoMenu.ledgerPage);
  shipInfoMenu.ledgerPage = page.page;
  const summaryY = panel.y + SHIP_INFO_DESKTOP_SUMMARY_Y;
  const realized = Math.round(view.realizedPnl);
  drawOptionsText(`REALIZED P/L ${formatSignedLedgerMoney(realized)} DB`, panel.x + 12, summaryY, {
    color: ledgerPnlColor(realized)
  });
  drawOptionsText(`CASH ${view.doubloons} DB`, panel.x + panel.w - 12, summaryY, {
    align: "right",
    color: PIRATE_MENU_INK
  });

  const dateX = panel.x + 12;
  const portX = panel.x + 86;
  const entryX = panel.x + 151;
  const amountX = panel.x + 322;
  const balanceX = panel.x + 374;
  const pnlX = panel.x + panel.w - 12;
  const headerY = panel.y + SHIP_INFO_DESKTOP_HEADER_Y;
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  ctx.fillRect(panel.x + 10, headerY - 4, panel.w - 20, 1);
  drawOptionsText("DATE", dateX, headerY, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("PORT", portX, headerY, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("ENTRY", entryX, headerY, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("AMOUNT", amountX, headerY, { align: "right", color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("BAL", balanceX, headerY, { align: "right", color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("P/L", pnlX, headerY, { align: "right", color: PIRATE_MENU_INK_MUTED });

  page.rows.forEach((entry, index) => {
    const y = panel.y + SHIP_INFO_DESKTOP_FIRST_ROW_Y + index * 15;
    ctx.fillStyle = index % 2 === 0 ? "rgba(113, 80, 51, 0.18)" : "rgba(113, 80, 51, 0.07)";
    ctx.fillRect(panel.x + 10, y - 3, panel.w - 20, 13);
    drawOptionsText(shipLedgerDateLabel(entry.simMinute), dateX, y, { color: PIRATE_MENU_INK_MUTED });
    drawOptionsText(fitPixelText(entry.location.toUpperCase(), PIXEL_FONT_SMALL_8, 59), portX, y, {
      color: PIRATE_MENU_CHART_LINE
    });
    drawOptionsText(fitPixelText(entry.description.toUpperCase(), PIXEL_FONT_SMALL_8, 116), entryX, y, {
      color: PIRATE_MENU_INK
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

  const pagerY = panel.y + panel.h - UI_PAGER_BUTTON_H - 5;
  if (page.pageCount > 1) {
    shipInfoMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
    shipInfoMenu.nextPageRect = { x: panel.x + panel.w - 12 - UI_PAGER_BUTTON_W, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
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
    color: PIRATE_MENU_INK_MUTED
  });
}

function drawShipPapers(panel, view) {
  const page = shipPapersPage(view, shipInfoMenu.papersPage);
  shipInfoMenu.papersPage = page.page;
  const summaryY = panel.y + SHIP_INFO_DESKTOP_SUMMARY_Y;
  drawOptionsText("ITEMS & DOCUMENTS", panel.x + 12, summaryY, { color: PIRATE_MENU_INK });
  drawOptionsText(`${view.papers.length} HELD`, panel.x + panel.w - 12, summaryY, {
    align: "right",
    color: view.papers.length > 0 ? PIRATE_MENU_INK : PIRATE_MENU_INK_MUTED
  });

  const typeX = panel.x + 12;
  const entryX = panel.x + 78;
  const detailX = panel.x + 218;
  const dateX = panel.x + panel.w - 12;
  const headerY = panel.y + SHIP_INFO_DESKTOP_HEADER_Y;
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  ctx.fillRect(panel.x + 10, headerY - 4, panel.w - 20, 1);
  drawOptionsText("TYPE", typeX, headerY, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("ENTRY", entryX, headerY, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("DETAIL", detailX, headerY, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("DATE", dateX, headerY, { align: "right", color: PIRATE_MENU_INK_MUTED });

  if (page.rows.length === 0) {
    drawOptionsText("INVENTORY IS EMPTY", panel.x + 12, panel.y + SHIP_INFO_DESKTOP_FIRST_ROW_Y + 6, {
      color: PIRATE_MENU_INK_MUTED
    });
  }
  page.rows.forEach((paper, index) => {
    const y = panel.y + SHIP_INFO_DESKTOP_FIRST_ROW_Y + index * SHIP_INFO_PAPER_ROW_H;
    ctx.fillStyle = index % 2 === 0 ? "rgba(113, 80, 51, 0.18)" : "rgba(113, 80, 51, 0.07)";
    ctx.fillRect(panel.x + 10, y - 3, panel.w - 20, SHIP_INFO_PAPER_ROW_H - 1);
    const typeColor = paper.kind === "marque"
      ? PIRATE_MENU_SUCCESS
      : paper.kind === "delivery"
        ? PIRATE_MENU_INK
        : PIRATE_MENU_CHART_LINE;
    drawOptionsText(fitPixelText(paper.kind.toUpperCase(), PIXEL_FONT_SMALL_8, 55), typeX, y, {
      color: typeColor
    });
    drawOptionsText(fitPixelText(paper.title.toUpperCase(), PIXEL_FONT_SMALL_8, 126), entryX, y, {
      color: PIRATE_MENU_INK
    });
    drawOptionsText(fitPixelText(paper.issuer.toUpperCase(), PIXEL_FONT_SMALL_8, 126), entryX, y + 9, {
      color: PIRATE_MENU_INK_MUTED
    });
    drawOptionsText(fitPixelText(paper.route.toUpperCase(), PIXEL_FONT_SMALL_8, 145), detailX, y, {
      color: PIRATE_MENU_CHART_LINE
    });
    drawOptionsText(fitPixelText(paper.detail.toUpperCase(), PIXEL_FONT_SMALL_8, 145), detailX, y + 9, {
      color: PIRATE_MENU_INK_MUTED
    });
    drawOptionsText(shipLedgerDateLabel(paper.simMinute), dateX, y, {
      align: "right",
      color: PIRATE_MENU_INK_MUTED
    });
  });

  const pagerY = panel.y + panel.h - UI_PAGER_BUTTON_H - 5;
  if (page.pageCount > 1) {
    shipInfoMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
    shipInfoMenu.nextPageRect = { x: panel.x + panel.w - 12 - UI_PAGER_BUTTON_W, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
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
    color: PIRATE_MENU_INK_MUTED
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
  drawOptionsText(label, x, y, { color: PIRATE_MENU_INK });
  drawOptionsText(value, valueX, y, { align: "right", color: PIRATE_MENU_INK });
}

function drawShipInfoRating(label, rating, x, y) {
  drawOptionsText(label, x, y, { color: PIRATE_MENU_INK });
  const meterX = x + 78;
  for (let index = 0; index < 10; index++) {
    ctx.fillStyle = index < rating ? PIRATE_MENU_CHART_LINE : PIRATE_MENU_PAPER_INSET_ALT;
    ctx.fillRect(meterX + index * 8, y + 2, 6, 5);
  }
  drawOptionsText(String(rating), meterX + 89, y, { align: "right", color: PIRATE_MENU_INK });
}

function drawShipInfoBar(x, y, width, fraction, color) {
  ctx.fillStyle = PIRATE_MENU_PAPER_INSET_ALT;
  ctx.fillRect(x, y, width, 6);
  ctx.strokeStyle = PIRATE_MENU_INK_MUTED;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 5);
  const fillWidth = Math.round((width - 2) * clamp(fraction, 0, 1));
  if (fillWidth > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, fillWidth, 4);
  }
}

function drawShipInfoCloseButton(rect, hovered) {
  drawPiratePaperInset(rect, hovered);
  drawOptionsText("X", rect.x + rect.w / 2, rect.y + Math.floor((rect.h - 8) / 2), {
    align: "center",
    color: PIRATE_MENU_INK
  });
}

function drawShipInfoArrowButton(rect, label, hovered) {
  drawPiratePaperInset(rect, hovered);
  drawOptionsText(label, rect.x + rect.w / 2, rect.y + Math.floor((rect.h - 8) / 2), {
    align: "center",
    color: PIRATE_MENU_INK
  });
}

function drawDiscoveriesMenu() {
  const panelX = Math.floor((SCREEN_W - DISCOVERIES_PANEL_W) / 2);
  const panelY = Math.floor((SCREEN_H - DISCOVERIES_PANEL_H) / 2);
  discoveriesMenu.panelRect = { x: panelX, y: panelY, w: DISCOVERIES_PANEL_W, h: DISCOVERIES_PANEL_H };

  ctx.save();
  drawPiratePaperModal(discoveriesMenu.panelRect, 0.78);

  const closeSize = UI_ICON_BUTTON_SIZE;
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
    color: PIRATE_MENU_INK
  });

  const entries = discoveredEntries(gameState);
  const total = discoveryCatalog.length;
  const discoveryFraction = total > 0 ? entries.length / total : 0;
  const mappedFraction = minimap ? minimap.seenTileCount / graph.tileCount : 0;
  const compact = DISCOVERIES_PANEL_W < 280;
  const progressWidth = DISCOVERIES_PANEL_W - 24;
  drawDiscoveryProgressRow(
    panelX + 12,
    panelY + 31,
    "FOUND",
    `${entries.length}/${total}`,
    discoveryFraction,
    "#d6a84f",
    progressWidth,
    compact
  );
  drawDiscoveryProgressRow(
    panelX + 12,
    panelY + (compact ? 57 : 51),
    "GLOBE MAPPED",
    `${(mappedFraction * 100).toFixed(2)}%`,
    mappedFraction,
    "#6aa6a1",
    progressWidth,
    compact
  );

  const pageSize = discoveriesPageSize();
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  discoveriesMenu.page = clamp(discoveriesMenu.page, 0, pageCount - 1);
  const pageStart = discoveriesMenu.page * pageSize;
  const pageEntries = entries.slice(pageStart, pageStart + pageSize);
  const listX = panelX + 13;
  const listY = panelY + (compact ? 91 : 79);
  if (pageEntries.length === 0) {
    drawOptionsText("NO DISCOVERIES YET", listX, listY, { color: PIRATE_MENU_INK_MUTED });
  } else {
    pageEntries.forEach((entry, index) => {
      const y = listY + index * 36;
      const sprite = discoverySpriteImage(entry);
      if (sprite) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, listX, y);
      } else {
        ctx.fillStyle = discoveryKindColor(entry.kind);
        ctx.fillRect(listX + 15, y + 14, 6, 6);
        ctx.fillStyle = PIRATE_MENU_INK;
        ctx.fillRect(listX + 17, y + 16, 2, 2);
      }
      const textX = listX + 42;
      const textWidth = DISCOVERIES_PANEL_W - 67;
      drawOptionsText(
        fitPixelText(entry.displayName.toUpperCase(), PIXEL_FONT_SMALL_8, textWidth),
        textX,
        y + 7,
        { color: PIRATE_MENU_INK }
      );
      const detail = fitPixelText(entry.detail.toUpperCase(), PIXEL_FONT_SMALL_8, textWidth);
      ctx.fillStyle = PIRATE_MENU_INK_MUTED;
      drawPixelText(detail, textX, y + 20, { font: PIXEL_FONT_SMALL_8 });
    });
  }

  const pagerY = panelY + DISCOVERIES_PANEL_H - UI_PAGER_BUTTON_H - 5;
  discoveriesMenu.previousPageRect = { x: panelX + 12, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
  discoveriesMenu.nextPageRect = {
    x: panelX + DISCOVERIES_PANEL_W - 12 - UI_PAGER_BUTTON_W,
    y: pagerY,
    w: UI_PAGER_BUTTON_W,
    h: UI_PAGER_BUTTON_H
  };
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
    color: PIRATE_MENU_INK_MUTED
  });
  ctx.restore();
}

function discoverySpriteImage(entry) {
  const discovery = discoveryCatalogById.get(entry.id);
  if (!discovery) throw new Error(`Discovered entry is missing from the catalog: ${entry.id}`);
  if (discovery.menuTerrainSpriteKey) return terrainImage(discovery.menuTerrainSpriteKey);
  const spriteKey = discovery.spriteKey;
  if (!spriteKey) return null;
  const image = worldDiscoveryImages.get(spriteKey);
  if (!image) throw new Error(`Missing discovered wonder image: ${spriteKey}`);
  return image;
}

function drawDiscoveryProgressRow(x, y, label, value, fraction, color, availableWidth, compact) {
  drawOptionsText(label, x, y, { color: PIRATE_MENU_INK });
  drawOptionsText(value, x + (compact ? availableWidth : 103), y, { align: "right", color: PIRATE_MENU_INK });
  const barX = compact ? x : x + 112;
  const barY = compact ? y + 11 : y + 1;
  const barW = compact ? availableWidth : Math.max(20, availableWidth - 112);
  const barH = 7;
  ctx.fillStyle = PIRATE_MENU_PAPER_INSET_ALT;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = PIRATE_MENU_INK_MUTED;
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
  if (SCREEN_W < 380) {
    drawCompactPoliticsMenu();
    return;
  }
  const panel = {
    x: POLITICS_PANEL_X,
    y: POLITICS_PANEL_Y,
    w: POLITICS_PANEL_W,
    h: POLITICS_PANEL_H
  };
  const view = createPoliticsView(gameState);
  const newsHeight = view.recentEvents.length > 0 ? 12 : 0;
  const availableRows = Math.floor(
    (panel.h - 58 - UI_PAGER_BUTTON_H - 8 - newsHeight) / POLITICS_MATRIX_ROW_H
  );
  const page = politicsRowsPage(
    view,
    politicsMenu.page,
    Math.max(6, Math.min(POLITICS_ROWS_PER_PAGE, availableRows))
  );
  politicsMenu.page = page.page;

  ctx.save();
  drawPiratePaperModal(panel, 0.78);

  const closeSize = UI_ICON_BUTTON_SIZE;
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
    color: PIRATE_MENU_INK
  });

  const rowLabelX = panel.x + 12;
  const matrixX = panel.x + 124;
  const matrixW = view.powers.length * POLITICS_MATRIX_CELL_W;
  const legendY = panel.y + 27;
  drawOptionsText("A ALLY", panel.x + 12, legendY, { color: "#91db69" });
  drawOptionsText("W WAR", panel.x + 62, legendY, { color: "#f68181" });
  drawOptionsText("- NEUTRAL  . NO CONTACT", panel.x + 108, legendY, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("STANCE TOWARD", matrixX + matrixW / 2, legendY, {
    align: "center",
    color: PIRATE_MENU_INK_MUTED
  });
  drawOptionsText("PLAYER STANDING", panel.x + panel.w - 12, legendY, {
    align: "right",
    color: PIRATE_MENU_INK
  });

  const headerY = panel.y + 42;
  const matrixY = panel.y + 58;
  const statusX = matrixX + matrixW + 8;
  const statusW = panel.x + panel.w - statusX - 12;
  drawOptionsText("POWER", rowLabelX, headerY + 5, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("STATUS", statusX, headerY + 5, { color: PIRATE_MENU_INK_MUTED });

  view.powers.forEach((power, index) => {
    const x = matrixX + index * POLITICS_MATRIX_CELL_W;
    drawPoliticsColumnCode(power.code, x, headerY + 12, politicsFactionColor(power.id));
  });

  page.rows.forEach((row, rowIndex) => {
    const y = matrixY + rowIndex * POLITICS_MATRIX_ROW_H;
    ctx.fillStyle = rowIndex % 2 === 0 ? "rgba(113, 80, 51, 0.18)" : "rgba(113, 80, 51, 0.07)";
    ctx.fillRect(panel.x + 10, y - 1, panel.w - 20, POLITICS_MATRIX_ROW_H);
    drawOptionsText(
      fitPixelText(row.faction.adjective.toUpperCase(), PIXEL_FONT_SMALL_8, 104),
      rowLabelX,
      y,
      { color: politicsFactionColor(row.faction.id) }
    );
    row.stances.forEach((stance, index) => {
      drawPoliticsMatrixCell(
        matrixX + index * POLITICS_MATRIX_CELL_W,
        y,
        stance.relation,
        row.faction.id === stance.factionId,
        stance.contact
      );
    });
    drawPoliticsStanding(row.player, statusX, y, statusW);
  });

  const pagerY = panel.y + panel.h - UI_PAGER_BUTTON_H - 5;
  politicsMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
  politicsMenu.nextPageRect = {
    x: panel.x + panel.w - 12 - UI_PAGER_BUTTON_W,
    y: pagerY,
    w: UI_PAGER_BUTTON_W,
    h: UI_PAGER_BUTTON_H
  };
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
    color: PIRATE_MENU_INK_MUTED
  });
  drawPoliticsLatestNews(view, panel, pagerY);
  ctx.restore();
}

function compactPoliticsPagination(view) {
  const panelW = POLITICS_PANEL_W;
  const panelH = POLITICS_PANEL_H;
  const columnsPerPage = Math.max(5, Math.floor((panelW - 130) / POLITICS_MATRIX_CELL_W));
  const newsHeight = view.recentEvents.length > 0 ? 12 : 0;
  const rowsPerPage = Math.max(
    6,
    Math.min(20, Math.floor((panelH - 92 - newsHeight) / POLITICS_MATRIX_ROW_H))
  );
  const columnPageCount = Math.max(1, Math.ceil(view.powers.length / columnsPerPage));
  const rowPageCount = Math.max(1, Math.ceil(view.rows.length / rowsPerPage));
  return {
    columnsPerPage,
    rowsPerPage,
    columnPageCount,
    rowPageCount,
    pageCount: columnPageCount * rowPageCount
  };
}

function drawCompactPoliticsMenu() {
  const panel = {
    x: POLITICS_PANEL_X,
    y: POLITICS_PANEL_Y,
    w: POLITICS_PANEL_W,
    h: POLITICS_PANEL_H
  };
  const view = createPoliticsView(gameState);
  const pagination = compactPoliticsPagination(view);
  politicsMenu.page = clampMenuIndex(politicsMenu.page, pagination.pageCount);
  const rowPage = Math.floor(politicsMenu.page / pagination.columnPageCount);
  const columnPage = politicsMenu.page % pagination.columnPageCount;
  const rows = view.rows.slice(
    rowPage * pagination.rowsPerPage,
    (rowPage + 1) * pagination.rowsPerPage
  );
  const powers = view.powers.slice(
    columnPage * pagination.columnsPerPage,
    (columnPage + 1) * pagination.columnsPerPage
  );

  ctx.save();
  drawPiratePaperModal(panel, 0.82);
  politicsMenu.panelRect = panel;
  politicsMenu.closeButtonRect = {
    x: panel.x + panel.w - UI_ICON_BUTTON_SIZE - 6,
    y: panel.y + 6,
    w: UI_ICON_BUTTON_SIZE,
    h: UI_ICON_BUTTON_SIZE
  };
  drawOptionsCloseButton(
    politicsMenu.closeButtonRect,
    pointInRect(optionsMenu.hoverPoint, politicsMenu.closeButtonRect)
  );
  drawOptionsText("POLITICAL CHART", panel.x + panel.w / 2, panel.y + 9, {
    align: "center",
    color: PIRATE_MENU_INK
  });
  drawOptionsText("A ALLY", panel.x + 10, panel.y + 27, { color: "#91db69" });
  drawOptionsText("W WAR", panel.x + 58, panel.y + 27, { color: "#f68181" });
  drawOptionsText("- NEUT  . NONE", panel.x + 104, panel.y + 27, { color: PIRATE_MENU_INK_MUTED });

  const labelX = panel.x + 10;
  const matrixX = panel.x + 91;
  const statusX = panel.x + panel.w - 31;
  const headerY = panel.y + 44;
  const matrixY = panel.y + 63;
  drawOptionsText("POWER", labelX, headerY, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText("YOU", statusX, headerY, { color: PIRATE_MENU_INK });
  powers.forEach((power, index) => {
    drawPoliticsColumnCode(
      power.code,
      matrixX + index * POLITICS_MATRIX_CELL_W,
      headerY + 13,
      politicsFactionColor(power.id)
    );
  });

  rows.forEach((row, rowIndex) => {
    const y = matrixY + rowIndex * POLITICS_MATRIX_ROW_H;
    ctx.fillStyle = rowIndex % 2 === 0 ? "rgba(113, 80, 51, 0.18)" : "rgba(113, 80, 51, 0.07)";
    ctx.fillRect(panel.x + 8, y - 1, panel.w - 16, POLITICS_MATRIX_ROW_H);
    drawOptionsText(
      fitPixelText(row.faction.adjective.toUpperCase(), PIXEL_FONT_SMALL_8, 76),
      labelX,
      y,
      { color: politicsFactionColor(row.faction.id) }
    );
    const stanceByFaction = new Map(row.stances.map((stance) => [stance.factionId, stance]));
    powers.forEach((power, index) => {
      const stance = stanceByFaction.get(power.id);
      if (!stance) return;
      drawPoliticsMatrixCell(
        matrixX + index * POLITICS_MATRIX_CELL_W,
        y,
        stance.relation,
        row.faction.id === power.id,
        stance.contact
      );
    });
    drawOptionsText(row.player.scoreLabel, statusX + 21, y, {
      align: "right",
      color: politicsStandingColor(row.player.reputation)
    });
  });

  const pagerY = panel.y + panel.h - UI_PAGER_BUTTON_H - 5;
  politicsMenu.previousPageRect = { x: panel.x + 12, y: pagerY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
  politicsMenu.nextPageRect = {
    x: panel.x + panel.w - 12 - UI_PAGER_BUTTON_W,
    y: pagerY,
    w: UI_PAGER_BUTTON_W,
    h: UI_PAGER_BUTTON_H
  };
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
  drawOptionsText(
    `PAGE ${politicsMenu.page + 1}/${pagination.pageCount}`,
    panel.x + panel.w / 2,
    pagerY + 3,
    { align: "center", color: PIRATE_MENU_INK_MUTED }
  );
  drawPoliticsLatestNews(view, panel, pagerY);
  ctx.restore();
}

function drawPoliticsLatestNews(view, panel, pagerY) {
  const latest = view.recentEvents[0];
  if (!latest) return;
  drawOptionsText(
    fitPixelText(`LATEST ${diplomacyEventNotice(latest)}`, PIXEL_FONT_SMALL_8, panel.w - 120),
    panel.x + panel.w / 2,
    pagerY - 11,
    { align: "center", color: latest.kind === "peace" ? "#91db69" : "#f68181" }
  );
}

function drawPoliticsColumnCode(code, x, y, color) {
  ctx.save();
  ctx.translate(x + 1, y);
  ctx.rotate(-Math.PI / 2);
  drawOptionsText(code, 0, 0, { color });
  ctx.restore();
}

function drawPoliticsMatrixCell(x, y, relation, self, contact) {
  const glyph = politicsRelationGlyph(relation, self, contact);
  ctx.fillStyle = self ? PIRATE_MENU_PAPER_INSET_ALT : "rgba(113, 80, 51, 0.12)";
  ctx.fillRect(x, y, POLITICS_MATRIX_CELL_W - 1, POLITICS_MATRIX_ROW_H - 1);
  drawOptionsText(glyph, x + 1, y, {
    color: self ? PIRATE_MENU_INK : politicsRelationColor(relation)
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
      PIXEL_FONT_SMALL_8,
      Math.max(0, width - scoreW)
    ),
    x + scoreW,
    y,
    { color: PIRATE_MENU_INK }
  );
}

function politicsRelationGlyph(relation, self, contact) {
  if (self) return "A";
  if (relation === DIPLOMACY_ALLY) return "A";
  if (relation === DIPLOMACY_FRIENDLY) return "+";
  if (relation === DIPLOMACY_WAR) return "W";
  if (relation === DIPLOMACY_HOSTILE) return "!";
  if (relation === DIPLOMACY_NEUTRAL) return contact ? "-" : ".";
  throw new Error(`Unknown political relation: ${relation}`);
}

function politicsRelationColor(relation) {
  if (relation === DIPLOMACY_ALLY) return "#91db69";
  if (relation === DIPLOMACY_FRIENDLY) return "#c8d45d";
  if (relation === DIPLOMACY_WAR) return "#f68181";
  if (relation === DIPLOMACY_HOSTILE) return "#e6a15c";
  if (relation === DIPLOMACY_NEUTRAL) return PIRATE_MENU_INK_MUTED;
  throw new Error(`Unknown political relation: ${relation}`);
}

function politicsStandingColor(reputation) {
  if (reputation <= -75) return "#f04f78";
  if (reputation <= -25) return "#cd683d";
  if (reputation < 0) return PIRATE_MENU_INK_MUTED;
  if (reputation === 0) return PIRATE_MENU_INK_MUTED;
  if (reputation < 15) return PIRATE_MENU_SUCCESS;
  if (reputation < 50) return PIRATE_MENU_CHART_LINE;
  return PIRATE_MENU_INK;
}

function politicsFactionColor(factionId) {
  if (factionId === PIRATE_FACTION_ID) return PIRATE_MENU_DANGER;
  return PIRATE_MENU_INK;
}

function drawLakeBattleMode(nowMs) {
  const terrainChart = ensureLakeBattleTerrainChart();
  drawLakeBattleTerrain(terrainChart);
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SETUP) {
    drawLakeBattleSetup();
    return;
  }
  const battle = lakeBattleMode.battle;
  if (!battle) throw new Error(`Lake battle screen ${lakeBattleMode.screen} has no battle state`);
  drawLakeBattleWakes(battle);
  drawLakeBattleEffects(battle);
  drawLakeBattleShips(battle, nowMs);
  drawHullSplinterBursts(battle.hullSplinterBursts);
  drawLakeBattleSinkEffects(battle, nowMs);
  const hudLayout = drawLakeBattleHud(battle);
  if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_ACTIVE) {
    drawLakeBattleBroadsideControls(battle);
    drawLakeBattleWindIndicator(battle, nowMs);
    drawLakeBattlePauseButton(hudLayout.pauseButton);
  } else if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_PAUSED) {
    drawLakeBattleActionOverlay("BATTLE PAUSED", LAKE_BATTLE_PAUSE_ACTIONS);
  } else if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_SINKING) {
    // The wreck animation is the result presentation until the last pixels submerge.
  } else if (lakeBattleMode.screen === LAKE_BATTLE_SCREEN_RESULT) {
    const title = battle.outcome === "victory"
      ? "VICTORY"
      : battle.outcome === "defeat"
        ? "DEFEAT"
        : "DRAW";
    drawLakeBattleActionOverlay(title, LAKE_BATTLE_RESULT_ACTIONS);
  } else {
    throw new Error(`Unknown lake battle screen: ${lakeBattleMode.screen}`);
  }
}

function ensureLakeBattleTerrainChart() {
  const map = lakeBattleMode?.battle?.map || createLakeBattleArenaMap(SCREEN_W, SCREEN_H);
  const key = `${map.width}x${map.height}|${map.seed}`;
  if (lakeBattleTerrainChart && lakeBattleTerrainChartKey === key) return lakeBattleTerrainChart;
  lakeBattleTerrainChart = buildLakeBattleTerrainChart(map);
  lakeBattleTerrainChartKey = key;
  return lakeBattleTerrainChart;
}

function buildLakeBattleTerrainChart(map) {
  const faceCalls = [];
  const tileCalls = [];
  const tileById = new Map();

  for (const cell of map.cells) {
    const row = cell.terrain;
    const level = terrainLevel(row, cell.id);
    const surface = { x: cell.x, y: cell.y - level * 3 };
    const tileCall = {
      id: cell.id,
      x: cell.x,
      y: cell.y,
      row,
      level,
      surface,
      drawSurfaceX: surface.x,
      drawSurfaceY: surface.y,
      drawLayer: terrainSpriteDrawLayer(spriteForTerrain(row, cell.id)),
      sortY: cell.y
    };
    tileCalls.push(tileCall);
    tileById.set(cell.id, tileCall);
  }

  for (const cell of map.cells) {
    const tile = tileById.get(cell.id);
    for (const neighborId of cell.neighbors) {
      if (neighborId < cell.id) continue;
      const neighbor = tileById.get(neighborId);
      if (!neighbor) throw new Error(`Lake battle tile has missing neighbor: ${cell.id}/${neighborId}`);
      faceCalls.push(makeFaceCall({
        a: tile.id,
        b: neighbor.id,
        ax: tile.drawSurfaceX,
        ay: tile.drawSurfaceY,
        aSortY: tile.y,
        bx: neighbor.drawSurfaceX,
        by: neighbor.drawSurfaceY,
        bSortY: neighbor.y,
        row: tile.row,
        nrow: neighbor.row,
        level: tile.level,
        nlevel: neighbor.level
      }));
    }
  }

  faceCalls.sort(compareTerrainConnectorDrawOrder);
  tileCalls.sort(compareTerrainDrawCalls);
  return { map, tileById, faceCalls, tileCalls };
}

function drawLakeBattleTerrain(terrainChart) {
  ctx.fillStyle = "#1f3650";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawTerrainConnectorFaces(terrainChart.faceCalls, terrainChart);
  for (const tile of terrainChart.tileCalls) drawTile(tile, terrainChart);
}

function drawLakeBattleSetup() {
  const panel = lakeBattleSetupPanelRect();
  ctx.save();
  drawPiratePaperModal(panel, 0.76);
  drawOptionsText("SHIP BATTLE", panel.x + panel.w / 2, panel.y + 11, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center",
    color: PIRATE_MENU_INK
  });

  const selectorHeight = 54;
  const playerRect = { x: panel.x + 10, y: panel.y + 30, w: panel.w - 20, h: selectorHeight };
  const enemyRect = { ...playerRect, y: playerRect.y + selectorHeight + 5 };
  const beginRect = { x: panel.x + Math.floor((panel.w - 166) / 2), y: enemyRect.y + selectorHeight + 8, w: 166, h: 24 };
  const backRect = { ...beginRect, y: beginRect.y + 28 };
  lakeBattleMode.rowRects = [playerRect, enemyRect, beginRect, backRect];
  drawLakeBattleShipSelector(playerRect, "YOUR SHIP", "player", LAKE_BATTLE_SETUP_PLAYER_ROW);
  drawLakeBattleShipSelector(enemyRect, "ENEMY", "enemy", LAKE_BATTLE_SETUP_ENEMY_ROW);
  drawStartMenuButton(
    beginRect,
    lakeBattleMode.loading ? "LOADING SHIPS..." : "BEGIN BATTLE",
    lakeBattleMode.selectedIndex === LAKE_BATTLE_SETUP_BEGIN_ROW,
    "action:attack"
  );
  drawStartMenuButton(
    backRect,
    "BACK",
    lakeBattleMode.selectedIndex === LAKE_BATTLE_SETUP_BACK_ROW,
    "action:back"
  );
  if (lakeBattleMode.error) {
    drawOptionsText(
      fitPixelText(lakeBattleMode.error, PIXEL_FONT_SMALL_8, panel.w - 20),
      panel.x + panel.w / 2,
      panel.y + panel.h - 14,
      { align: "center", color: "#f68181" }
    );
  }
  ctx.restore();
}

function lakeBattleSetupPanelRect() {
  const width = Math.min(390, SCREEN_W - 12);
  const height = Math.min(244, SCREEN_H - 12);
  return {
    x: Math.floor((SCREEN_W - width) / 2),
    y: Math.floor((SCREEN_H - height) / 2),
    w: width,
    h: height
  };
}

function drawLakeBattleShipSelector(rect, headingLabel, side, row) {
  const selected = lakeBattleMode.selectedIndex === row;
  const slug = selectedLakeBattleSlug(side);
  const stats = lakeBattleCombatantStats(slug);
  drawPiratePaperInset(rect, selected);
  const arrowSize = 24;
  const leftRect = { x: rect.x + 4, y: rect.y + 15, w: arrowSize, h: arrowSize };
  const rightRect = { x: rect.x + rect.w - arrowSize - 4, y: rect.y + 15, w: arrowSize, h: arrowSize };
  lakeBattleMode.leftArrowRects[row] = leftRect;
  lakeBattleMode.rightArrowRects[row] = rightRect;
  drawShipInfoArrowButton(leftRect, "<", pointInRect(lakeBattleMode.hoverPoint, leftRect));
  drawShipInfoArrowButton(rightRect, ">", pointInRect(lakeBattleMode.hoverPoint, rightRect));

  if (lakeBattleCombatantIsCity(slug)) {
    ctx.drawImage(cityImageForType("mediterranean"), rect.x + 31, rect.y + 9);
  } else {
    const asset = lakeBattleShipAssets.get(slug) || npcShipAssetsBySlug?.get(slug);
    if (asset) drawLakeBattleSpriteFrame(asset.image, 0, rect.x + 31, rect.y + 9);
    else drawOptionsText("...", rect.x + 49, rect.y + 23, { align: "center", color: PIRATE_MENU_INK_MUTED });
  }
  const textLeft = rect.x + 72;
  const textWidth = Math.max(64, rect.w - 108);
  drawOptionsText(headingLabel, textLeft, rect.y + 6, { color: selected ? PIRATE_MENU_CHART_LINE : PIRATE_MENU_INK_MUTED });
  drawOptionsText(
    fitPixelText(lakeBattleCombatantLabel(slug).toUpperCase(), PIXEL_FONT_SMALL_8, textWidth),
    textLeft,
    rect.y + 20,
    { color: PIRATE_MENU_INK }
  );
  const gunCount = stats.batteryGuns || stats.cannons;
  const armament = stats.navalWeaponKind === NAVAL_WEAPON_ARROW ? "ARROWS" : `${gunCount} GUNS`;
  const compactArmament = stats.navalWeaponKind === NAVAL_WEAPON_ARROW ? "ARR" : `${gunCount}G`;
  const summary = rect.w < 300
    ? `H${stats.hitPoints} ${compactArmament} C${stats.crewCapacity}`
    : `HULL ${stats.hitPoints}  ${armament}  CREW ${stats.crewCapacity}`;
  drawOptionsText(
    fitPixelText(summary, PIXEL_FONT_SMALL_8, textWidth),
    textLeft,
    rect.y + 36,
    { color: PIRATE_MENU_INK_MUTED }
  );
}

function drawLakeBattleWakes(battle) {
  ctx.save();
  for (const shipState of [battle.player, battle.enemy]) {
    for (const wake of shipState.wake) {
      const life = clamp(wake.age / wake.ttl, 0, 1);
      const spread = 1 + Math.floor(life * 5);
      const broken = (wake.seed + Math.floor(wake.age * 8)) % 4 === 0;
      ctx.globalAlpha = (1 - life) * 0.72;
      ctx.fillStyle = "#ffffff";
      const port = {
        x: Math.round(wake.x + wake.sideX * spread),
        y: Math.round(wake.y + wake.sideY * spread)
      };
      const starboard = {
        x: Math.round(wake.x - wake.sideX * spread),
        y: Math.round(wake.y - wake.sideY * spread)
      };
      if (!broken && lakeBattleWaterAt(battle, port.x, port.y)) {
        ctx.fillRect(port.x, port.y, 1, 1);
      }
      if (lakeBattleWaterAt(battle, starboard.x, starboard.y)) {
        ctx.fillRect(starboard.x, starboard.y, 1, 1);
      }
    }
  }
  ctx.restore();
}

function drawLakeBattleEffects(battle) {
  drawCannonSmokeBursts(battle.cannonSmokeBursts);
  for (const projectile of battle.projectiles) {
    drawNavalProjectile(projectile, lakeBattleProjectilePoint(projectile));
  }
  for (const splash of battle.splashes) {
    if (!lakeBattleWaterAt(battle, splash.x, splash.y)) continue;
    const life = clamp(splash.age / splash.ttl, 0, 1);
    ctx.globalAlpha = (1 - life) * 0.82;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(splash.x - 1, splash.y, 3, 1);
    ctx.fillRect(splash.x, splash.y - 2, 1, 4);
  }
  for (const impact of battle.impacts) {
    const life = clamp(impact.age / impact.ttl, 0, 1);
    ctx.globalAlpha = 1 - life;
    ctx.fillStyle = impact.kind === NAVAL_WEAPON_ARROW ? "#ffffff" : "#f9c22b";
    ctx.fillRect(impact.x, impact.y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawLakeBattleShips(battle, nowMs) {
  const ships = [battle.player, battle.enemy].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
  for (const shipState of ships) {
    if (lakeBattleCombatantIsCity(shipState)) drawLakeBattleCity(shipState);
    else if (shipState.hitPoints > 0) drawLakeBattleShip(shipState, nowMs);
  }
}

function drawLakeBattleCity(cityState) {
  const image = cityImageForType("mediterranean");
  const point = lakeBattleCombatantPoint(cityState);
  const x = Math.round(point.x - CITY_SPRITE_W / 2);
  const y = Math.round(point.y - CITY_SPRITE_H / 2);
  if (cityState.hitPoints > 0) {
    const outline = selectableSpriteOutlineCanvas(
      image,
      0,
      0,
      CITY_SPRITE_W,
      CITY_SPRITE_H,
      false,
      "#e83b3b"
    );
    ctx.drawImage(outline, x - 1, y - 1);
  }
  ctx.drawImage(image, x, y);
  if (cityState.hitPoints <= 0) {
    ctx.drawImage(cityDamageOverlay(image, 0x4c414b45), x, y);
  }
  drawLakeBattleShipHullBar(cityState, x + 7, y + CITY_SPRITE_H - 1, 22);
}

function lakeBattleShipSpriteCall(shipState, nowMs) {
  const baseAsset = lakeBattleShipAssets.get(shipState.slug) || npcShipAssetsBySlug?.get(shipState.slug);
  if (!baseAsset) throw new Error(`Missing loaded lake battle ship asset: ${shipState.slug}`);
  const baseCall = {
    id: shipState.id,
    kind: shipState.id === LAKE_BATTLE_PLAYER_ID ? "player" : "npc",
    slug: shipState.slug,
    img: baseAsset.image,
    sinkDepthImg: baseAsset.sinkDepthImage,
    rowing: shipState.rowing,
    bobSeed: shipState.id === LAKE_BATTLE_PLAYER_ID ? 0 : 37
  };
  const frameAsset = rowingShipFrameAsset(baseCall, nowMs);
  return {
    ...baseCall,
    img: frameAsset.image,
    sinkDepthImg: frameAsset.sinkDepthImage,
    frame: headingFrameForScreenHeading(lakeBattleHeadingVector(shipState)),
    x: Math.round(shipState.x - SHIP_SHEET_FRAME_SIZE / 2),
    y: Math.round(shipState.y - SHIP_SHEET_FRAME_SIZE / 2),
    combatAllegiance: shipState.id === LAKE_BATTLE_PLAYER_ID ? "ally" : "enemy"
  };
}

function createLakeBattleShipSinkEffect(shipState, nowMs) {
  const call = lakeBattleShipSpriteCall(shipState, nowMs);
  return createShipSinkEffect({
    id: call.id,
    pixels: shipSpriteFramePixels(call.img, call.sinkDepthImg, call.frame),
    frameSize: SHIP_SHEET_FRAME_SIZE,
    originX: call.x,
    originY: call.y,
    startedAtMs: nowMs,
    seed: hashInt(Math.round(shipState.x * 257) ^ Math.round(shipState.y * 65537) ^ call.id.length)
  });
}

function drawLakeBattleShip(shipState, nowMs) {
  const call = lakeBattleShipSpriteCall(shipState, nowMs);
  const layers = shipWaterlineLayers(call.img, call.sinkDepthImg, call.frame, call.slug);
  drawShipCombatOutline(call, layers);
  drawFloatingShipSprite(call, layers, nowMs);
  drawLakeBattleShipHullBar(shipState, call.x + 7, call.y + SHIP_SHEET_FRAME_SIZE - 1, 22);
}

function drawLakeBattleSinkEffects(battle, nowMs) {
  for (const { effect } of lakeBattleMode.sinkEffects) {
    drawShipSinkEffect(effect, nowMs, { x: 0, y: 0 }, (x, y) => lakeBattleWaterAt(battle, x, y));
  }
}

function drawLakeBattleSpriteFrame(image, frame, x, y) {
  const sx = (frame % SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE;
  const sy = Math.floor(frame / SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE;
  ctx.drawImage(
    image,
    sx,
    sy,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE,
    Math.round(x),
    Math.round(y),
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE
  );
}

function drawLakeBattleShipHullBar(shipState, x, y, width) {
  const ratio = clamp(shipState.hitPoints / shipState.maxHitPoints, 0, 1);
  ctx.fillStyle = "#2e222f";
  ctx.fillRect(x, y, width, 3);
  ctx.fillStyle = shipState.id === LAKE_BATTLE_PLAYER_ID ? "#91db69" : "#e83b3b";
  ctx.fillRect(x + 1, y + 1, Math.round((width - 2) * ratio), 1);
}

function drawLakeBattleHud(battle) {
  const playerLabel = lakeBattleCombatantLabel(battle.player.slug).toUpperCase();
  const enemyLabel = lakeBattleCombatantLabel(battle.enemy.slug).toUpperCase();
  const layout = lakeBattleHudLayout({
    screenWidth: SCREEN_W,
    labelWidths: [
      measurePixelTextWidth(playerLabel, PIXEL_FONT_SMALL_8),
      measurePixelTextWidth(enemyLabel, PIXEL_FONT_SMALL_8)
    ]
  });
  ctx.fillStyle = "rgba(46, 34, 47, 0.82)";
  for (const panel of [layout.player, layout.enemy]) {
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  }
  drawLakeBattleHudSide(battle.player, playerLabel, layout.player);
  drawLakeBattleHudSide(battle.enemy, enemyLabel, layout.enemy);
  return layout;
}

function drawLakeBattleHudSide(shipState, label, panel) {
  const x = panel.alignRight ? panel.x + panel.w - 4 : panel.x + 4;
  const y = panel.y + 4;
  const width = panel.w - 8;
  drawOptionsText(
    fitPixelText(label, PIXEL_FONT_SMALL_8, width),
    x,
    y,
    { align: panel.alignRight ? "right" : "left", color: "#ffffff" }
  );
  const barX = panel.x + 4;
  const ratio = clamp(shipState.hitPoints / shipState.maxHitPoints, 0, 1);
  ctx.fillStyle = "#313638";
  ctx.fillRect(barX, y + 12, width, 5);
  ctx.fillStyle = panel.alignRight ? "#e83b3b" : "#91db69";
  ctx.fillRect(barX + 1, y + 13, Math.round((width - 2) * ratio), 3);
}

function drawLakeBattleWindIndicator(battle, nowMs) {
  const flowDirectionRad = lakeBattleWindFlowDirection(battle);
  const flow = { x: Math.cos(flowDirectionRad), y: Math.sin(flowDirectionRad) };
  const heading = lakeBattleHeadingVector(battle.player);
  const alignment = clamp(heading.x * flow.x + heading.y * flow.y, -1, 1);
  const angleFromWind = Math.acos(clamp(-alignment, -1, 1));
  const warning = shipHasWindDeadZone(battle.player.stats)
    ? sailingStallWarningStrength(angleFromWind, battle.player.stats.upwindStallAngleRad)
    : 0;
  drawShipWindV({
    centerX: battle.player.x,
    centerY: battle.player.y,
    flowDirectionRad: windVFlowDirectionForScreenVector(flow.x, flow.y),
    deadZoneHalfAngleRad: battle.player.stats.upwindStallAngleRad,
    strength: battle.wind.strength,
    warning,
    nowMs
  });
}

function drawLakeBattleBroadsideControls(battle) {
  if (!navalWeaponUsesBroadside(battle.player.weapon)) return;
  for (const sideName of ["port", "starboard"]) {
    const arc = lakeBattleBroadsideArc(sideName);
    const cooldown = battle.player.cooldowns[sideName];
    const targetInArc = pointInBroadsideArc(
      lakeBattleCombatantPoint(battle.enemy),
      arc,
      lakeBattleCombatantHitRadius(battle.enemy)
    );
    drawBroadsideReloadIndicator(
      arc,
      cooldown,
      battle.player.weapon.reloadSeconds,
      targetInArc
    );
  }
}

function drawLakeBattlePauseButton(rect) {
  lakeBattleMode.pauseButtonRect = rect;
  const hovered = pointInRect(lakeBattleMode.hoverPoint, rect);
  ctx.fillStyle = hovered ? "#625565" : "#313638";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hovered ? "#ffffff" : "#9babb2";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = "#c7dcd0";
  ctx.fillRect(rect.x + 7, rect.y + 6, 2, 10);
  ctx.fillRect(rect.x + 13, rect.y + 6, 2, 10);
}

function drawLakeBattleActionOverlay(title, actions) {
  ctx.fillStyle = "rgba(16, 20, 23, 0.66)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const width = Math.min(220, SCREEN_W - 16);
  const height = 50 + actions.length * 28;
  const panel = {
    x: Math.floor((SCREEN_W - width) / 2),
    y: Math.floor((SCREEN_H - height) / 2),
    w: width,
    h: height
  };
  drawPiratePaperPanel(panel);
  ctx.strokeStyle = PIRATE_MENU_INK;
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);
  drawOptionsText(title, panel.x + panel.w / 2, panel.y + 14, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center",
    color: PIRATE_MENU_INK
  });
  lakeBattleMode.actionRects = actions.map((_, index) => ({
    x: panel.x + 20,
    y: panel.y + 37 + index * 28,
    w: panel.w - 40,
    h: 24
  }));
  for (let index = 0; index < actions.length; index++) {
    drawStartMenuButton(
      lakeBattleMode.actionRects[index],
      actions[index],
      lakeBattleMode.selectedIndex === index,
      menuLabelIconId(actions[index])
    );
  }
}

function drawStartMenu(nowMs) {
  const actions = startMenuActions();
  const denseActions = actions.length >= 5;
  const panelHeight = denseActions
    ? Math.min(244, SCREEN_H - 12)
    : (actions.length >= 4 ? START_MENU_PANEL_H : (startMenu.message ? 212 : 196));
  const panel = {
    x: START_MENU_PANEL_X,
    y: Math.floor((SCREEN_H - panelHeight) / 2),
    w: START_MENU_PANEL_W,
    h: panelHeight
  };
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / 620);

  ctx.save();
  ctx.fillStyle = "rgba(16, 20, 23, 0.72)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawPiratePaperPanel(panel);
  ctx.strokeStyle = PIRATE_MENU_INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);
  ctx.strokeStyle = PIRATE_MENU_CHART_LINE;
  ctx.strokeRect(panel.x + 4.5, panel.y + 4.5, panel.w - 9, panel.h - 9);

  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText("MARQUE & REPRISAL", panel.x + panel.w / 2, panel.y + 28, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center"
  });
  ctx.fillStyle = `rgba(84, 126, 100, ${0.58 + pulse * 0.32})`;
  ctx.fillRect(panel.x + 54, panel.y + 51, panel.w - 108, 1);
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  drawPixelText("1522", panel.x + panel.w / 2, panel.y + 57, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });

  const labels = actions.map((action) => action.label);
  const firstButtonY = panel.y + (denseActions ? 68 : 76);
  const buttonGap = denseActions ? 3 : START_MENU_BUTTON_GAP;
  const buttonHeight = denseActions ? 24 : START_MENU_BUTTON_H;
  startMenu.buttonRects = labels.map((_, index) => ({
    x: panel.x + Math.floor((panel.w - START_MENU_BUTTON_W) / 2),
    y: firstButtonY + index * (buttonHeight + buttonGap),
    w: START_MENU_BUTTON_W,
    h: buttonHeight
  }));

  for (let i = 0; i < labels.length; i++) {
    drawStartMenuButton(
      startMenu.buttonRects[i],
      labels[i],
      startMenu.selectedIndex === i,
      startMenuIconId(actions[i].id)
    );
  }
  if (startMenu.message) {
    ctx.fillStyle = "#f68181";
    drawPixelText(startMenu.message, panel.x + panel.w / 2, panel.y + panel.h - 16, {
      font: PIXEL_FONT_SMALL_8,
      align: "center"
    });
  }
  ctx.restore();
  if (startMenu.newGameConfirmation) drawNewGameConfirmation();
}

function drawNewGameConfirmation() {
  const confirmation = startMenu?.newGameConfirmation;
  if (!confirmation) throw new Error("Cannot draw a closed new-game confirmation");

  const panelWidth = Math.min(318, SCREEN_W - 16);
  const panelHeight = 126;
  const panel = {
    x: Math.floor((SCREEN_W - panelWidth) / 2),
    y: Math.floor((SCREEN_H - panelHeight) / 2),
    w: panelWidth,
    h: panelHeight
  };
  const titleLines = wrapPixelText(
    "ARE YOU SURE YOU WANT TO START A NEW GAME?",
    PIXEL_FONT_DIALOGUE_8,
    panel.w - 24,
    3
  );
  const warningLines = wrapPixelText(
    "THIS WILL END YOUR CURRENT VOYAGE.",
    PIXEL_FONT_SMALL_8,
    panel.w - 24,
    2
  );
  const buttonGap = 10;
  const buttonWidth = Math.min(88, Math.floor((panel.w - 34 - buttonGap) / 2));
  const buttonY = panel.y + panel.h - 34;
  const buttonsWidth = buttonWidth * 2 + buttonGap;
  const buttonsX = panel.x + Math.floor((panel.w - buttonsWidth) / 2);
  confirmation.buttonRects = [
    { x: buttonsX, y: buttonY, w: buttonWidth, h: 24 },
    { x: buttonsX + buttonWidth + buttonGap, y: buttonY, w: buttonWidth, h: 24 }
  ];

  ctx.save();
  drawPiratePaperModal(panel, 0.84);
  let textY = panel.y + 17;
  ctx.fillStyle = PIRATE_MENU_INK;
  for (const line of titleLines) {
    drawPixelText(line, panel.x + panel.w / 2, textY, {
      font: PIXEL_FONT_DIALOGUE_8,
      align: "center"
    });
    textY += 11;
  }
  textY += 7;
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  for (const line of warningLines) {
    drawPixelText(line, panel.x + panel.w / 2, textY, {
      font: PIXEL_FONT_SMALL_8,
      align: "center"
    });
    textY += 9;
  }
  drawStartMenuButton(
    confirmation.buttonRects[BINARY_CONFIRM_YES_INDEX],
    "YES",
    confirmation.selectedIndex === BINARY_CONFIRM_YES_INDEX
  );
  drawStartMenuButton(
    confirmation.buttonRects[BINARY_CONFIRM_NO_INDEX],
    "NO",
    confirmation.selectedIndex === BINARY_CONFIRM_NO_INDEX
  );
  ctx.restore();
}

function drawStartMenuButton(rect, label, highlighted, iconId = null) {
  ctx.fillStyle = highlighted ? PIRATE_MENU_PAPER_SELECTED : PIRATE_MENU_PAPER_BUTTON;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = highlighted ? PIRATE_MENU_INK : PIRATE_MENU_INK_MUTED;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  if (highlighted) {
    ctx.fillStyle = PIRATE_MENU_CHART_LINE;
    const markerY = rect.y + Math.floor((rect.h - 3) / 2);
    ctx.fillRect(rect.x + 4, markerY, 3, 3);
    ctx.fillRect(rect.x + rect.w - 7, markerY, 3, 3);
  }
  ctx.fillStyle = PIRATE_MENU_INK;
  if (iconId) {
    const textWidth = measurePixelTextWidth(label, PIXEL_FONT_DIALOGUE_8);
    const contentWidth = GAME_ICON_SIZE + 6 + textWidth;
    const iconX = Math.floor(rect.x + (rect.w - contentWidth) / 2);
    const iconY = rect.y + Math.floor((rect.h - GAME_ICON_SIZE) / 2);
    drawGameIcon(iconId, iconX, iconY);
    drawPixelText(label, iconX + GAME_ICON_SIZE + 6, controlTextY(rect), {
      font: PIXEL_FONT_DIALOGUE_8
    });
  } else {
    drawPixelText(label, rect.x + rect.w / 2, controlTextY(rect), {
      font: PIXEL_FONT_DIALOGUE_8,
      align: "center"
    });
  }
}

function drawPiratePaperPanel(panel) {
  ctx.fillStyle = PIRATE_MENU_PAPER;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  const fleckCount = Math.max(12, Math.floor(panel.w * panel.h / 720));
  const panelSeed = hashInt(
    Math.imul(Math.round(panel.x), 0x45d9f3b) ^
    Math.imul(Math.round(panel.y), 0x27d4eb2d) ^
    Math.imul(Math.round(panel.w), 0x165667b1) ^
    Math.round(panel.h)
  );
  for (let index = 0; index < fleckCount; index++) {
    const seed = hashInt(panelSeed ^ Math.imul(index + 1, 0x9e3779b1));
    const x = panel.x + 3 + (seed & 0xffff) % Math.max(1, panel.w - 6);
    const y = panel.y + 3 + ((seed >>> 16) & 0xffff) % Math.max(1, panel.h - 6);
    ctx.fillStyle = (seed & 0x10000) === 0
      ? "rgba(113, 80, 51, 0.12)"
      : "rgba(84, 126, 100, 0.09)";
    ctx.fillRect(x, y, (seed & 3) === 0 ? 2 : 1, 1);
  }
}

function drawPiratePaperModal(panel, overlayAlpha = 0.76) {
  ctx.fillStyle = `rgba(16, 20, 23, ${overlayAlpha})`;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawPiratePaperPanel(panel);
  ctx.strokeStyle = PIRATE_MENU_INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);
  ctx.strokeStyle = PIRATE_MENU_CHART_LINE;
  ctx.strokeRect(panel.x + 3.5, panel.y + 3.5, panel.w - 7, panel.h - 7);
}

function drawPiratePaperInset(rect, highlighted = false) {
  ctx.fillStyle = highlighted ? PIRATE_MENU_PAPER_SELECTED : PIRATE_MENU_PAPER_INSET;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = highlighted ? PIRATE_MENU_INK : PIRATE_MENU_INK_MUTED;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
}

function drawPirateHudPanel(rect) {
  drawPiratePaperPanel(rect);
  ctx.strokeStyle = PIRATE_MENU_CHART_LINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
}

function drawPirateHudButton(rect, highlighted = false) {
  ctx.fillStyle = highlighted ? PIRATE_MENU_PAPER_SELECTED : PIRATE_MENU_PAPER;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = highlighted ? PIRATE_MENU_INK : PIRATE_MENU_CHART_LINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
}

function drawPastVoyagesMenu() {
  const records = voyageHistoryResult.records;
  const pageCount = records.length + 1;
  pastVoyagesMenu.page = clamp(pastVoyagesMenu.page, 0, pageCount - 1);
  const panel = {
    x: PAST_VOYAGES_PANEL_X,
    y: PAST_VOYAGES_PANEL_Y,
    w: PAST_VOYAGES_PANEL_W,
    h: PAST_VOYAGES_PANEL_H
  };

  ctx.save();
  drawPiratePaperModal(panel, 0.8);
  ctx.fillStyle = "rgba(84, 126, 100, 0.18)";
  for (let y = panel.y + 39; y < panel.y + panel.h - 29; y += 13) {
    ctx.fillRect(panel.x + 12, y, panel.w - 24, 1);
  }
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  ctx.fillRect(panel.x + 11, panel.y + 33, 1, panel.h - 65);

  pastVoyagesMenu.panelRect = panel;
  pastVoyagesMenu.closeButtonRect = {
    x: panel.x + panel.w - UI_ICON_BUTTON_SIZE - 7,
    y: panel.y + 7,
    w: UI_ICON_BUTTON_SIZE,
    h: UI_ICON_BUTTON_SIZE
  };
  drawOptionsCloseButton(
    pastVoyagesMenu.closeButtonRect,
    pointInRect(optionsMenu.hoverPoint, pastVoyagesMenu.closeButtonRect)
  );

  if (pastVoyagesMenu.page === 0) drawPastVoyagesSummaryPage(panel, records);
  else drawPastVoyageRecordPage(panel, records[pastVoyagesMenu.page - 1], records.length - pastVoyagesMenu.page + 1);

  const pagerY = panel.y + panel.h - UI_PAGER_BUTTON_H - 5;
  pastVoyagesMenu.previousPageRect = {
    x: panel.x + 12,
    y: pagerY,
    w: UI_PAGER_BUTTON_W,
    h: UI_PAGER_BUTTON_H
  };
  pastVoyagesMenu.nextPageRect = {
    x: panel.x + panel.w - 12 - UI_PAGER_BUTTON_W,
    y: pagerY,
    w: UI_PAGER_BUTTON_W,
    h: UI_PAGER_BUTTON_H
  };
  drawOptionsArrowButton(
    pastVoyagesMenu.previousPageRect,
    "<",
    pointInRect(optionsMenu.hoverPoint, pastVoyagesMenu.previousPageRect)
  );
  drawOptionsArrowButton(
    pastVoyagesMenu.nextPageRect,
    ">",
    pointInRect(optionsMenu.hoverPoint, pastVoyagesMenu.nextPageRect)
  );
  drawOptionsText(`PAGE ${pastVoyagesMenu.page + 1}/${pageCount}`, panel.x + panel.w / 2, pagerY + 3, {
    align: "center",
    color: PIRATE_MENU_INK_MUTED
  });
  ctx.restore();
}

function drawPastVoyagesSummaryPage(panel, records) {
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText("PAST VOYAGES", panel.x + panel.w / 2, panel.y + 10, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center"
  });
  drawOptionsText("CAPTAINS' REGISTER", panel.x + panel.w / 2, panel.y + 27, {
    align: "center",
    color: PIRATE_MENU_CHART_LINE
  });
  const summary = voyageHistorySummary(records);
  drawPastVoyageRows(panel, [
    ["VOYAGES", summary.voyages],
    ["TOTAL DAYS", summary.totalDays],
    ["LONGEST VOYAGE", `${summary.longestVoyageDays} DAYS`],
    ["TOTAL EARNED", `${formatDoubloons(summary.totalDoubloonsEarned)} DB`],
    ["MOST EARNED", `${formatDoubloons(summary.mostDoubloonsEarned)} DB`],
    ["RICHEST ENDING", `${formatDoubloons(summary.richestEndingPurse)} DB`],
    ["MOST DISCOVERIES", summary.mostDiscoveries],
    ["VICTORY / DEATH / QUIT", `${summary.victories} / ${summary.deaths} / ${summary.quits}`]
  ], panel.y + 48, 16);
  if (records.length === 0) {
    drawOptionsText("NO PAST VOYAGES YET", panel.x + panel.w / 2, panel.y + panel.h - 42, {
      align: "center",
      color: PIRATE_MENU_INK_MUTED
    });
  }
}

function drawPastVoyageRecordPage(panel, record, voyageNumber) {
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(`VOYAGE ${voyageNumber}`, panel.x + panel.w / 2, panel.y + 10, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center"
  });
  drawOptionsText(
    fitPixelText(record.captainName.toUpperCase(), PIXEL_FONT_SMALL_8, panel.w - 76),
    panel.x + panel.w / 2,
    panel.y + 27,
    { align: "center", color: PIRATE_MENU_CHART_LINE }
  );
  drawPastVoyageRows(panel, [
    ["LIFETIME", `${record.birthDateLabel} - ${record.endDateLabel}`],
    ["HOME", record.home],
    ["RESULT / GOAL", `${record.outcomeType.toUpperCase()} / ${record.goal.toUpperCase()}`],
    ["LAST VESSEL", record.vessel],
    ["DAYS / WORLD MAPPED", `${record.daysAtSea} / ${record.mappedPercent.toFixed(2)}%`],
    ["EARNED / NET", `${formatDoubloons(record.doubloonsEarned)} / ${formatSignedDoubloons(record.netDoubloons)}`],
    ["FINAL / TRADE PNL", `${formatDoubloons(record.endingDoubloons)} / ${formatSignedDoubloons(record.realizedPnl)}`],
    ["DISC / PORTS / WORLD", `${record.discoveries} / ${record.visitedPorts} / ${record.circumnavigated ? "YES" : "NO"}`],
    ["QUESTS / MARQUES", `${record.completedQuests} / ${record.lettersOfMarque}`],
    ["CREW LOST / PIRACY", `${record.crewLost} / ${record.piracyActs}`]
  ], panel.y + 42, 13);
  drawOptionsText("FATE", panel.x + 18, panel.y + 174, { color: PIRATE_MENU_INK_MUTED });
  drawOptionsText(
    fitPixelText(record.outcome, PIXEL_FONT_SMALL_8, panel.w - 36),
    panel.x + 18,
    panel.y + 187,
    { color: PIRATE_MENU_INK }
  );
}

function drawPastVoyageRows(panel, rows, startY, lineHeight) {
  const labelX = panel.x + 18;
  const valueX = panel.x + panel.w - 18;
  const valueWidth = Math.max(42, Math.floor(panel.w * 0.57));
  rows.forEach(([label, value], index) => {
    const y = startY + index * lineHeight;
    drawOptionsText(String(label), labelX, y, { color: PIRATE_MENU_INK_MUTED });
    drawOptionsText(
      fitPixelText(String(value), PIXEL_FONT_SMALL_8, valueWidth),
      valueX,
      y,
      { align: "right", color: PIRATE_MENU_INK }
    );
  });
}

function formatDoubloons(value) {
  return Math.round(value).toLocaleString("en-US");
}

function formatSignedDoubloons(value) {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${formatDoubloons(rounded)}`;
}

function drawCreditsMenu() {
  const panel = {
    x: CREDITS_PANEL_X,
    y: CREDITS_PANEL_Y,
    w: CREDITS_PANEL_W,
    h: CREDITS_PANEL_H
  };
  const lines = creditsDisplayLines();
  const pageCount = Math.max(1, Math.ceil(lines.length / CREDITS_LINES_PER_PAGE));
  creditsMenu.page = clamp(creditsMenu.page, 0, pageCount - 1);
  const start = creditsMenu.page * CREDITS_LINES_PER_PAGE;
  const visibleLines = lines.slice(start, start + CREDITS_LINES_PER_PAGE);

  ctx.save();
  drawPiratePaperModal(panel, 0.78);

  const closeSize = UI_ICON_BUTTON_SIZE;
  creditsMenu.closeButtonRect = {
    x: panel.x + panel.w - closeSize - 8,
    y: panel.y + 8,
    w: closeSize,
    h: closeSize
  };
  drawOptionsCloseButton(
    creditsMenu.closeButtonRect,
    pointInRect(optionsMenu.hoverPoint, creditsMenu.closeButtonRect)
  );

  drawOptionsText("CREDITS", panel.x + panel.w / 2, panel.y + 11, {
    align: "center",
    color: PIRATE_MENU_INK
  });

  let y = panel.y + 32;
  for (const line of visibleLines) {
    if (line.kind === "blank") {
      y += 7;
      continue;
    }
    const color = line.kind === "title"
      ? PIRATE_MENU_INK
      : line.kind === "heading"
        ? PIRATE_MENU_CHART_LINE
        : PIRATE_MENU_INK_MUTED;
    const font = PIXEL_FONT_SMALL_8;
    ctx.fillStyle = color;
    drawPixelText(line.text, panel.x + 17 + line.indent, y, { font });
    y += line.kind === "body" ? 9 : 11;
  }

  const pageLabel = `${creditsMenu.page + 1}/${pageCount}`;
  drawOptionsText(pageLabel, panel.x + panel.w / 2, panel.y + panel.h - 18, {
    align: "center",
    color: PIRATE_MENU_INK_MUTED
  });

  const navY = panel.y + panel.h - UI_PAGER_BUTTON_H - 5;
  creditsMenu.previousPageRect = { x: panel.x + 14, y: navY, w: UI_PAGER_BUTTON_W, h: UI_PAGER_BUTTON_H };
  creditsMenu.nextPageRect = {
    x: panel.x + panel.w - 14 - UI_PAGER_BUTTON_W,
    y: navY,
    w: UI_PAGER_BUTTON_W,
    h: UI_PAGER_BUTTON_H
  };
  drawOptionsArrowButton(
    creditsMenu.previousPageRect,
    "<",
    pointInRect(optionsMenu.hoverPoint, creditsMenu.previousPageRect)
  );
  drawOptionsArrowButton(
    creditsMenu.nextPageRect,
    ">",
    pointInRect(optionsMenu.hoverPoint, creditsMenu.nextPageRect)
  );
  ctx.restore();
}

function creditsDisplayLines() {
  const markdown = creditsMarkdown.trim();
  if (!markdown) throw new Error("Credits markdown is empty");
  const lines = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (lines.length > 0 && lines[lines.length - 1].kind !== "blank") {
        lines.push({ kind: "blank", text: "", indent: 0 });
      }
      continue;
    }
    let kind = "body";
    let indent = 0;
    let text = trimmed;
    if (text.startsWith("# ")) {
      kind = "title";
      text = text.slice(2);
    } else if (text.startsWith("## ")) {
      kind = "heading";
      text = text.slice(3);
    } else if (text.startsWith("- ")) {
      text = text.slice(2);
      indent = 6;
    }
    const font = PIXEL_FONT_SMALL_8;
    const maxWidth = CREDITS_PANEL_W - 42 - indent;
    const wrapped = wrapPixelText(text, font, maxWidth, kind === "body" ? 3 : 2);
    for (let i = 0; i < wrapped.length; i++) {
      lines.push({
        kind,
        text: i === 0 && indent > 0 ? `- ${wrapped[i]}` : wrapped[i],
        indent: i === 0 ? 0 : indent + 6
      });
    }
  }
  return lines;
}

function drawOptionsMenu() {
  const panelX = Math.floor((SCREEN_W - OPTIONS_PANEL_W) / 2);
  const panelY = Math.floor((SCREEN_H - OPTIONS_PANEL_H) / 2);
  optionsMenu.panelRect = { x: panelX, y: panelY, w: OPTIONS_PANEL_W, h: OPTIONS_PANEL_H };

  ctx.save();
  drawPiratePaperModal(optionsMenu.panelRect, 0.78);

  const closeSize = UI_ICON_BUTTON_SIZE;
  const closeX = panelX + OPTIONS_PANEL_W - closeSize - 6;
  const closeY = panelY + 6;
  optionsMenu.closeButtonRect = { x: closeX, y: closeY, w: closeSize, h: closeSize };
  drawOptionsCloseButton(optionsMenu.closeButtonRect, pointInRect(optionsMenu.hoverPoint, optionsMenu.closeButtonRect));

  drawOptionsText("OPTIONS", panelX + OPTIONS_PANEL_W / 2, panelY + 9, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center",
    color: PIRATE_MENU_INK
  });

  const rowX = panelX + 10;
  const rowW = OPTIONS_PANEL_W - 20;
  const firstRowY = panelY + 34;
  const rowStep = OPTIONS_ROW_H + 2;
  const fullscreenRow = { x: rowX, y: firstRowY, w: rowW, h: OPTIONS_ROW_H - 2 };
  const musicRow = { x: rowX, y: firstRowY + rowStep, w: rowW, h: OPTIONS_ROW_H - 2 };
  const sfxRow = { x: rowX, y: firstRowY + rowStep * 2, w: rowW, h: OPTIONS_ROW_H - 2 };
  const muteRow = { x: rowX, y: firstRowY + rowStep * 3, w: rowW, h: OPTIONS_ROW_H - 2 };
  const startMenuRow = { x: rowX, y: firstRowY + rowStep * 4, w: rowW, h: OPTIONS_ROW_H - 2 };
  optionsMenu.rowRects = [fullscreenRow, musicRow, sfxRow, muteRow, startMenuRow];

  drawOptionsFullscreenRow(fullscreenRow, optionsMenu.selectedIndex === OPTIONS_ROW_FULLSCREEN);
  drawOptionsVolumeRow(musicRow, "MUSIC", "music", optionsMenu.musicVolume, optionsMenu.selectedIndex === OPTIONS_ROW_MUSIC);
  drawOptionsVolumeRow(sfxRow, "SFX", "sfx", optionsMenu.sfxVolume, optionsMenu.selectedIndex === OPTIONS_ROW_SFX);
  drawOptionsMuteRow(muteRow, optionsMenu.selectedIndex === OPTIONS_ROW_MUTE);
  drawOptionsStartMenuRow(startMenuRow, optionsMenu.selectedIndex === OPTIONS_ROW_START_MENU);
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
  drawOptionsText(fitPixelText(label, PIXEL_FONT_DIALOGUE_8, rowRect.w - 16), rowRect.x + 8, controlTextY(rowRect), {
    font: PIXEL_FONT_DIALOGUE_8,
    color: optionsMenu.fullscreenError
      ? PIRATE_MENU_DANGER
      : (fullscreenAvailable() ? PIRATE_MENU_INK : PIRATE_MENU_INK_MUTED)
  });
}

function drawOptionsCloseButton(rect, hovered) {
  drawPiratePaperInset(rect, hovered);
  drawOptionsText("X", rect.x + rect.w / 2, rect.y + Math.floor((rect.h - 8) / 2), {
    align: "center",
    color: PIRATE_MENU_INK
  });
}

function drawOptionsVolumeRow(rowRect, label, sliderKey, value, highlighted) {
  drawOptionsRowFrame(rowRect, highlighted);
  drawOptionsText(label, rowRect.x + 8, controlTextY(rowRect), {
    font: PIXEL_FONT_DIALOGUE_8,
    color: PIRATE_MENU_INK
  });

  const sliderW = 70;
  const sliderH = 10;
  const sliderX = rowRect.x + 66;
  const sliderY = rowRect.y + Math.floor((rowRect.h - sliderH) / 2);
  optionsMenu.sliderRects[sliderKey] = { x: sliderX, y: sliderY, w: sliderW, h: sliderH };
  optionsMenu.sliderHitRects[sliderKey] = { x: sliderX - 3, y: rowRect.y, w: sliderW + 6, h: rowRect.h };

  const percent = Math.round(value * 100);
  ctx.fillStyle = PIRATE_MENU_PAPER_INSET_ALT;
  ctx.fillRect(sliderX, sliderY, sliderW, sliderH);
  ctx.strokeStyle = highlighted ? PIRATE_MENU_INK : PIRATE_MENU_INK_MUTED;
  ctx.lineWidth = 1;
  ctx.strokeRect(sliderX + 0.5, sliderY + 0.5, sliderW - 1, sliderH - 1);
  const fillW = Math.max(0, Math.min(sliderW - 2, Math.round((sliderW - 2) * value)));
  if (fillW > 0) {
    ctx.fillStyle = PIRATE_MENU_CHART_LINE;
    ctx.fillRect(sliderX + 1, sliderY + 1, fillW, sliderH - 2);
  }
  const knobX = sliderX + clamp(Math.round((sliderW - 2) * value), 0, sliderW - 2);
  ctx.fillStyle = PIRATE_MENU_INK;
  ctx.fillRect(knobX, sliderY - 1, 2, sliderH + 2);

  drawOptionsText(`${percent}%`, rowRect.x + rowRect.w - 8, controlTextY(rowRect), {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "right",
    color: PIRATE_MENU_INK
  });
}

function drawOptionsMuteRow(rowRect, highlighted) {
  drawOptionsRowFrame(rowRect, highlighted);
  drawOptionsText("MUTE", rowRect.x + 8, controlTextY(rowRect), {
    font: PIXEL_FONT_DIALOGUE_8,
    color: PIRATE_MENU_INK
  });

  const boxSize = 14;
  const boxX = rowRect.x + rowRect.w - boxSize - 12;
  const boxY = rowRect.y + Math.floor((rowRect.h - boxSize) / 2);
  optionsMenu.muteRect = { x: boxX - 10, y: rowRect.y, w: boxSize + 20, h: rowRect.h };

  ctx.fillStyle = optionsMenu.muted ? PIRATE_MENU_CHART_LINE : PIRATE_MENU_PAPER_INSET_ALT;
  ctx.fillRect(boxX, boxY, boxSize, boxSize);
  ctx.strokeStyle = highlighted ? PIRATE_MENU_INK : PIRATE_MENU_INK_MUTED;
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxSize - 1, boxSize - 1);
  if (optionsMenu.muted) {
    ctx.strokeStyle = PIRATE_MENU_PAPER;
    ctx.beginPath();
    ctx.moveTo(boxX + 2, boxY + 5);
    ctx.lineTo(boxX + 4, boxY + 8);
    ctx.lineTo(boxX + 8, boxY + 2);
    ctx.stroke();
  }
}

function drawOptionsStartMenuRow(rowRect, highlighted) {
  drawOptionsRowFrame(rowRect, highlighted);
  const iconX = rowRect.x + 8;
  const iconY = rowRect.y + Math.floor((rowRect.h - GAME_ICON_SIZE) / 2);
  drawGameIcon("action:start-menu", iconX, iconY, { alpha: optionsMenu.returnError ? 0.5 : 1 });
  const label = optionsMenu.returnError || "RETURN TO MAIN MENU";
  drawOptionsText(fitPixelText(label, PIXEL_FONT_SMALL_8, rowRect.w - 38), rowRect.x + 31, controlTextY(rowRect), {
    font: PIXEL_FONT_SMALL_8,
    color: optionsMenu.returnError ? PIRATE_MENU_DANGER : PIRATE_MENU_INK
  });
}

function drawOptionsArrowButton(rect, label, highlighted) {
  drawPiratePaperInset(rect, highlighted);
  drawOptionsText(label, rect.x + rect.w / 2, rect.y + Math.floor((rect.h - 8) / 2), {
    align: "center",
    color: PIRATE_MENU_INK
  });
}

function drawOptionsRowFrame(rect, highlighted) {
  drawPiratePaperInset(rect, highlighted);
}

function rowTextY(rect) {
  return rect.y + Math.floor((rect.h - 8) / 2);
}

function controlTextY(rect) {
  return rect.y + Math.floor((rect.h - 10) / 2);
}

function drawOptionsText(text, x, y, options = {}) {
  ctx.fillStyle = options.color || "#d7d9bf";
  drawPixelText(text, x, y, {
    font: options.font || PIXEL_FONT_SMALL_8,
    align: options.align || "left"
  });
}

function fitPixelText(text, font, maxWidth) {
  return fitMeasuredText(text, maxWidth, (entry) => measurePixelTextWidth(entry, font));
}

function drawPixelText(text, x, y, options = {}) {
  if (typeof text !== "string") throw new Error(`Pixel text must be a string: ${text}`);
  const font = options.font || PIXEL_FONT_SMALL_8;
  const align = options.align || "left";
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const textW = measurePixelTextWidth(text, font);
  const alignedOrigin = pixelTextOrigin({ x, y, width: textW, align });
  const origin = snapPointToTransformedPixelGrid(alignedOrigin, ctx.getTransform());
  if (typeof ctx.fillStyle !== "string") {
    throw new Error("Pixel text requires a solid CSS fill color");
  }
  const raster = pixelTextRaster(text, font, ctx.fillStyle, textW);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(raster, origin.x, origin.y);
  ctx.restore();
  return { x: origin.x, y: origin.y, w: textW, h: CITY_LABEL_H };
}

function pixelTextRaster(text, font, color, measuredWidth) {
  const key = `${font}\u0000${color}\u0000${text}`;
  const cached = pixelTextRasterCache.get(key);
  if (cached) {
    pixelTextRasterCache.delete(key);
    pixelTextRasterCache.set(key, cached);
    return cached;
  }

  const width = Math.max(1, measuredWidth);
  const layout = pixelTextFontLayout(font);
  const scratch = document.createElement("canvas");
  scratch.width = width + layout.padding * 2;
  scratch.height = layout.scratchHeight;
  const scratchCtx = scratch.getContext("2d", { willReadFrequently: true });
  if (!scratchCtx) throw new Error(`Could not create pixel text scratch raster for: ${text}`);
  scratchCtx.imageSmoothingEnabled = false;
  scratchCtx.font = font;
  scratchCtx.textAlign = "left";
  scratchCtx.textBaseline = "alphabetic";
  scratchCtx.fillStyle = color;
  scratchCtx.fillText(text, layout.padding, layout.baselineY);
  const imageData = scratchCtx.getImageData(layout.padding, layout.padding, width, layout.height);
  const opaquePixels = hardenPixelTextAlpha(imageData.data);
  if (text.trim().length > 0 && opaquePixels === 0) {
    throw new Error(`Pixel text raster contains no opaque glyph pixels: ${text}`);
  }

  const raster = document.createElement("canvas");
  raster.width = width;
  raster.height = layout.height;
  const rasterCtx = raster.getContext("2d", { willReadFrequently: true });
  if (!rasterCtx) throw new Error(`Could not create pixel text raster for: ${text}`);
  rasterCtx.imageSmoothingEnabled = false;
  rasterCtx.putImageData(imageData, 0, 0);

  if (pixelTextRasterCache.size >= PIXEL_TEXT_RASTER_CACHE_LIMIT) {
    const oldestKey = pixelTextRasterCache.keys().next().value;
    if (oldestKey === undefined) throw new Error("Pixel text raster cache eviction failed");
    pixelTextRasterCache.delete(oldestKey);
  }
  pixelTextRasterCache.set(key, raster);
  return raster;
}

function pixelTextFontLayout(font) {
  const cached = pixelTextFontLayoutCache.get(font);
  if (cached) return cached;
  const metricsCanvas = document.createElement("canvas");
  const metricsCtx = metricsCanvas.getContext("2d");
  if (!metricsCtx) throw new Error(`Could not measure pixel font: ${font}`);
  metricsCtx.font = font;
  const layout = pixelTextScratchRasterLayout(font, metricsCtx.measureText("PIXEL 1522 gy"));
  pixelTextFontLayoutCache.set(font, layout);
  return layout;
}

function measurePixelTextWidth(text, font = PIXEL_FONT_SMALL_8) {
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

const terrainConnectorLayerCache = new WeakMap();

function drawTerrainConnectorFaces(faceCalls, activeChart, options = {}) {
  const layer = terrainConnectorLayer(faceCalls, activeChart);
  ctx.drawImage(layer.canvas, layer.x, layer.y);
  for (const entry of layer.entries) drawTerrainConnectorDetails(entry, options);
}

function terrainConnectorLayer(faceCalls, activeChart) {
  if (!Array.isArray(faceCalls)) throw new Error("Terrain connector layer requires face calls");
  if (!activeChart || typeof activeChart !== "object") throw new Error("Terrain connector layer requires a chart");
  const dayKey = Math.floor(weatherClockMinutes / (24 * 60));
  const cached = terrainConnectorLayerCache.get(activeChart);
  if (cached?.dayKey === dayKey && cached.faceCalls === faceCalls) return cached;

  const entries = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const call of faceCalls) {
    const geometry = terrainConnectorGeometry(call, activeChart);
    if (!geometry) continue;
    const seed = hashInt(call.a ^ Math.imul(call.b, 0x9e3779b1));
    const spans = terrainConnectorRasterSpans(geometry.polygon, seed);
    for (const span of spans) {
      minX = Math.min(minX, span.x);
      minY = Math.min(minY, span.y);
      maxX = Math.max(maxX, span.x + span.width - 1);
      maxY = Math.max(maxY, span.y);
    }
    entries.push({
      call,
      geometry,
      color: faceColorFor(call),
      spans
    });
  }
  if (entries.length === 0) throw new Error("Terrain connector layer has no drawable faces");

  const canvas = document.createElement("canvas");
  canvas.width = maxX - minX + 1;
  canvas.height = maxY - minY + 1;
  const layerCtx = canvas.getContext("2d");
  if (!layerCtx) throw new Error("Could not create terrain connector layer context");
  layerCtx.imageSmoothingEnabled = false;
  for (const entry of entries) {
    layerCtx.fillStyle = entry.color;
    for (const span of entry.spans) {
      layerCtx.fillRect(span.x - minX, span.y - minY, span.width, 1);
    }
  }

  const layer = { dayKey, faceCalls, entries, canvas, x: minX, y: minY };
  terrainConnectorLayerCache.set(activeChart, layer);
  return layer;
}

function terrainConnectorGeometry(call, activeChart) {
  const aTile = activeChart.tileById.get(call.a);
  const bTile = activeChart.tileById.get(call.b);
  const sourceAx = aTile ? aTile.drawSurfaceX : call.ax;
  const sourceAy = aTile ? aTile.drawSurfaceY : call.ay;
  const sourceBx = bTile ? bTile.drawSurfaceX : call.bx;
  const sourceBy = bTile ? bTile.drawSurfaceY : call.by;
  const dx = sourceBx - sourceAx;
  const dy = sourceBy - sourceAy;
  const len = Math.hypot(dx, dy);
  if (len < TILE_RADIUS_PX * 1.7) return null;

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const width = FACE_HALF_WIDTH + Math.min(2, Math.abs(call.nlevel - call.level));
  const endpointWidth = width + (isCoastFace(call) ? COAST_FACE_ENDPOINT_OVERLAP_PX : 0);
  const ax = sourceAx;
  const ay = sourceAy;
  const bx = sourceBx;
  const by = sourceBy;
  const bend = (hash2(call.a, call.b) - 0.5) * 2.2;
  const mx = (ax + bx) * 0.5 + nx * bend;
  const my = (ay + by) * 0.5 + ny * bend;

  return {
    ax,
    ay,
    bx,
    by,
    mx,
    my,
    nx,
    ny,
    width,
    polygon: [
    { x: Math.round(ax + nx * endpointWidth), y: Math.round(ay + ny * endpointWidth) },
    { x: Math.round(mx + nx * (width + 1)), y: Math.round(my + ny * (width + 1)) },
    { x: Math.round(bx + nx * endpointWidth), y: Math.round(by + ny * endpointWidth) },
    { x: Math.round(bx - nx * endpointWidth), y: Math.round(by - ny * endpointWidth) },
    { x: Math.round(mx - nx * (width - 1)), y: Math.round(my - ny * (width - 1)) },
    { x: Math.round(ax - nx * endpointWidth), y: Math.round(ay - ny * endpointWidth) }
    ]
  };
}

function drawTerrainConnectorDetails(entry, options) {
  const { call, geometry } = entry;
  const { ax, ay, bx, by, mx, my, nx, ny, width } = geometry;

  if (isCoastFace(call)) {
    drawBeachFaceDetails(call, ax, ay, mx, my, bx, by, nx, ny, width, options.waveClockMs);
  } else if (terrainConnectorNeedsSlopeDetail(call.level, call.nlevel)) {
    const slopeColor = call.nlevel > call.level ? "#28261f" : "#d3cab0";
    const startX = Math.round(ax + nx * width);
    const startY = Math.round(ay + ny * width);
    const middleX = Math.round(mx + nx * (width + 1));
    const middleY = Math.round(my + ny * (width + 1));
    const endX = Math.round(bx + nx * width);
    const endY = Math.round(by + ny * width);
    drawPixelLine(startX, startY, middleX, middleY, slopeColor);
    drawPixelLine(middleX, middleY, endX, endY, slopeColor);
  }
}

function drawBeachFaceDetails(call, ax, ay, mx, my, bx, by, nx, ny, width, waveClockMs) {
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

  drawBeachWave(call, ax, ay, mx, my, bx, by, nx, ny, width, waveClockMs);
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

function drawBeachWave(call, ax, ay, mx, my, bx, by, nx, ny, width, waveClockMs) {
  const waterIsA = isWaterSurfaceRow(call.row);
  const wave = beachWaveState(call, waveClockMs);
  const fromT = waterIsA ? 0 : 1;
  const toT = waterIsA ? wave.reach : 1 - wave.reach;
  const foamT = waterIsA ? wave.foamReach : 1 - wave.foamReach;
  drawBeachWaveWater(ax, ay, mx, my, bx, by, nx, ny, width, fromT, toT, beachWaterColor(call));
  drawBeachFoamLine(ax, ay, mx, my, bx, by, nx, ny, width, fromT, foamT, wave.foamAlpha);
}

function beachWaveState(call, clockMs = waterAnimationClockMs) {
  if (!Number.isFinite(clockMs) || clockMs < 0) throw new Error(`Invalid beach wave clock: ${clockMs}`);
  const offsetMs = hashInt(call.a ^ Math.imul(call.b, 0x632be59b)) % BEACH_WAVE_PERIOD_MS;
  const phase = ((clockMs + offsetMs) % BEACH_WAVE_PERIOD_MS) / BEACH_WAVE_PERIOD_MS;
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
  const frame = riverHighlightFrameFor(frameId);
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

function riverConnectorWaterPixels(call, geometry) {
  const { path, a, b } = geometry;
  const pixels = new Set();
  const addBrush = (x, y, radius) => {
    forEachPixelBrushPoint(x, y, radius, (px, py) => pixels.add(pixelMaskKey(px, py)));
  };

  forEachPixelOnBezier(path, (x, y) => addBrush(x, y, RIVER_CONNECTOR_RADIUS_PX));
  const wideAtStart = riverConnectorMouthWideAtStart(call);
  if (wideAtStart !== null) {
    forEachRiverMouthFlareSample(path, wideAtStart, (x, y, radius) => {
      addBrush(x, y, Math.round(radius));
    });
  }
  addBrush(a.x, a.y, RIVER_CONNECTOR_RADIUS_PX);
  addBrush(b.x, b.y, RIVER_CONNECTOR_RADIUS_PX);
  if (call.aMouth && call.bWater) addBrush(b.x, b.y, RIVER_MOUTH_RADIUS_PX);
  if (call.bMouth && call.aWater) addBrush(a.x, a.y, RIVER_MOUTH_RADIUS_PX);
  return pixels;
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
  const spriteKey = spriteForTerrain(call.row, call.id);
  const baseSpriteKey = terrainBaseSpriteKey(spriteKey);
  const img = baseSpriteKey === spriteKey
    ? terrainImageForTile(call.row, call.id)
    : terrainBaseImageForTile(call.row, call.id, baseSpriteKey);
  const x = Math.round(call.drawSurfaceX - TILE_ART_HALF);
  const y = Math.round(call.drawSurfaceY - TILE_ART_HALF);
  const waveFrame = waterHexWaveFrameForTile(call, activeChart);
  if (waveFrame !== null) {
    ctx.drawImage(prebakedWaterHexWaveFrame(img, waveFrame), x, y);
  } else {
    ctx.drawImage(img, x, y);
  }
  if (baseSpriteKey !== spriteKey) ctx.drawImage(terrainImageForTile(call.row, call.id), x, y);

  if (graph.isPentagon[call.id]) {
    ctx.fillStyle = "rgba(31, 35, 26, 0.35)";
    ctx.fillRect(
      Math.round(call.drawSurfaceX) - 1,
      Math.round(call.drawSurfaceY) - 1,
      3,
      3
    );
  }
}

function prebakedWaterHexWaveFrame(img, frame) {
  let frames = waterHexWaveFrameCache.get(img);
  if (!frames) {
    frames = new Map();
    waterHexWaveFrameCache.set(img, frames);
  }
  const cached = frames.get(frame);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = TILE_ART_SIZE;
  canvas.height = TILE_ART_SIZE;
  const waveCtx = canvas.getContext("2d");
  if (!waveCtx) throw new Error("Could not create a pre-baked water wave frame");
  waveCtx.imageSmoothingEnabled = false;
  for (const band of waterHexWaveBandsForFrame(frame, TILE_ART_SIZE)) {
    waveCtx.drawImage(
      img,
      0,
      band.y,
      TILE_ART_SIZE,
      band.height,
      band.offsetX,
      band.y,
      TILE_ART_SIZE,
      band.height
    );
  }
  frames.set(frame, canvas);
  return canvas;
}

function waterHexWaveFrameForTile(call, activeChart) {
  if (call.row?.t !== "water" && call.row?.t !== "lake") return null;
  if (!activeChart?.map && tileHasSurfaceIce(call.id)) return null;
  if (activeChart?.map) {
    const cached = localWaterHexWaveFrameIndexCache.get(call.id);
    if (cached !== undefined) return cached;
    const frame = localWaterHexWaveFrame(waterAnimationClockMs, call.x, call.y);
    localWaterHexWaveFrameIndexCache.set(call.id, frame);
    return frame;
  }
  const cached = globeWaterHexWaveFrameIndexCache.get(call.id);
  if (cached !== undefined) return cached;
  const latitudeDeg = graph?.latDeg?.[call.id];
  const longitudeDeg = graph?.lonDeg?.[call.id];
  if (!Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeDeg)) {
    throw new Error(`Water tile ${call.id} has no globe coordinates for its wave phase`);
  }
  const frame = globeWaterHexWaveFrame(waterAnimationClockMs, latitudeDeg, longitudeDeg);
  globeWaterHexWaveFrameIndexCache.set(call.id, frame);
  return frame;
}

function cityImageForType(cityType, settlementType = "city") {
  if (!CITY_TYPE_KEY_SET.has(cityType)) throw new Error(`Unknown city type: ${cityType}`);
  const imageKey = settlementType === "village" ? "village" : cityType;
  const img = cityImages?.get(imageKey);
  if (!img) throw new Error(`Missing loaded city image: ${imageKey}`);
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
  const isPermanentIce = isPermanentSeaIceRow(call.row);
  const isSeasonalIce = isWaterSurfaceRow(call.row) && tileHasSurfaceIce(call.id);
  if (!isPermanentIce && !isSeasonalIce) return;
  drawWeatherSpeckles(call, "rgba(155, 171, 178, 0.68)", 7, 0x494345, 10, 6);
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

function drawStormScreenRain(nowMs) {
  if (!ship) return;
  const intensity = playerStormIntensity();
  if (intensity < STORM_SCREEN_RAIN_ENTER_INTENSITY) return;
  const t = clamp((intensity - STORM_SCREEN_RAIN_ENTER_INTENSITY) / (1 - STORM_SCREEN_RAIN_ENTER_INTENSITY), 0, 1);
  const wind = windForTile(ship.tileId);
  const dir = screenWindFlowVector(wind);
  const margin = STORM_SCREEN_RAIN_MARGIN_PX;
  const spanW = SCREEN_W + margin * 2;
  const spanH = SCREEN_H + margin * 2;
  const count = Math.round(70 + t * (STORM_SCREEN_RAIN_MAX_STREAKS - 70));
  const speed = 0.44 + t * 0.46;
  const daySalt = Math.imul(weatherParts.dayIndex + 1, 0x45d9f3b);

  for (let i = 0; i < count; i++) {
    const seed = hashInt(daySalt ^ Math.imul(i + 1, 0x9e3779b1));
    const baseX = -margin + stormRainUnit(seed, 0x1111) * spanW;
    const baseY = -margin + stormRainUnit(seed, 0x2222) * spanH;
    const phase = (nowMs * speed + stormRainUnit(seed, 0x3333) * STORM_SCREEN_RAIN_TRAVEL_PX) %
      STORM_SCREEN_RAIN_TRAVEL_PX;
    const x = Math.round(wrapRange(baseX + dir.x * phase, -margin, SCREEN_W + margin));
    const y = Math.round(wrapRange(baseY + dir.y * phase, -margin, SCREEN_H + margin));
    const length = 12 + Math.round(t * 18 + stormRainUnit(seed, 0x4444) * 7);
    const tailX = Math.round(x - dir.x * length);
    const tailY = Math.round(y - dir.y * length);
    const alpha = 0.18 + t * 0.22 + stormRainUnit(seed, 0x5555) * 0.12;
    drawPixelLine(tailX, tailY, x, y, `rgba(155, 198, 216, ${alpha.toFixed(3)})`);
  }
}

function drawStormEdgeFog(nowMs) {
  if (!ship) return;
  const strength = stormFogStrength(
    playerStormIntensity(),
    STORM_FOG_ENTER_INTENSITY,
    STORM_FOG_FULL_INTENSITY
  );
  if (strength <= 0) return;
  const texture = stormEdgeFogTexture();
  const breathe = reducedMotionPreferred
    ? 1
    : 0.94 + Math.sin(nowMs / STORM_FOG_BREATHE_PERIOD_MS * Math.PI * 2) * 0.06;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = strength * breathe;
  ctx.drawImage(texture, 0, 0);
  ctx.restore();
}

function stormEdgeFogTexture() {
  if (stormEdgeFogCanvas?.width === SCREEN_W && stormEdgeFogCanvas.height === SCREEN_H) {
    return stormEdgeFogCanvas;
  }
  const texture = document.createElement("canvas");
  texture.width = SCREEN_W;
  texture.height = SCREEN_H;
  const textureCtx = texture.getContext("2d");
  if (!textureCtx) throw new Error("Could not create storm edge fog texture");
  const imageData = textureCtx.createImageData(SCREEN_W, SCREEN_H);
  fillStormEdgeFogPixels(imageData.data, SCREEN_W, SCREEN_H);
  textureCtx.putImageData(imageData, 0, 0);
  stormEdgeFogCanvas = texture;
  return texture;
}

function screenWindFlowVector(wind) {
  const flowDir = wind.directionRad + Math.PI;
  const x = Math.cos(flowDir);
  const y = -Math.sin(flowDir);
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function stormRainUnit(seed, salt) {
  return (hashInt(seed ^ salt) & 0xffff) / 0xffff;
}

function wrapRange(value, min, max) {
  const span = max - min;
  return ((value - min) % span + span) % span + min;
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
  const frame = riverHighlightFrameFor(call.id);
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
    if (!activeChart.right || !activeChart.up) {
      throw new Error(`Cannot project offscreen river edge ${edge} on tile ${call.id} without chart axes`);
    }
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
  forEachPixelBrushPoint(x, y, radius, (px, py) => targetCtx.fillRect(px, py, 1, 1));
}

function terrainImage(key) {
  const img = images.get(key);
  if (!img) throw new Error(`Missing terrain image for sprite key: ${key}`);
  return img;
}

function terrainImageForTile(row, id) {
  if (isPermanentSeaIceRow(row) || (isWaterSurfaceRow(row) && tileHasSurfaceIce(id))) {
    return terrainImage("snow_01");
  }
  const key = spriteForTerrain(row, id);
  if (isWaterSurfaceRow(row)) return waterLatitudeTerrainImage(key, id, row);
  return tileHasSeasonalSnowTerrain(row, id) ? snowCoveredTerrainImage(key) : terrainImage(key);
}

function terrainBaseImageForTile(row, id, baseSpriteKey) {
  if (!baseSpriteKey.startsWith("earth_")) {
    throw new Error(`Mountain terrain requires rocky ground, got: ${baseSpriteKey}`);
  }
  return tileHasSeasonalSnowTerrain(row, id)
    ? snowCoveredTerrainImage(baseSpriteKey)
    : terrainImage(baseSpriteKey);
}

function terrainColorForTile(row, id) {
  if (isPermanentSeaIceRow(row) || (isWaterSurfaceRow(row) && tileHasSurfaceIce(id))) {
    return terrainSpriteColor("snow_01");
  }
  const key = spriteForTerrain(row, id);
  if (isWaterSurfaceRow(row)) return waterLatitudeTerrainColor(key, id, row);
  return tileHasSeasonalSnowTerrain(row, id) ? snowCoveredTerrainColor(key) : terrainSpriteColor(key);
}

function tileHasSurfaceIce(tileId) {
  if (!Number.isInteger(tileId) || tileId < 0) throw new Error(`Invalid surface ice tile: ${tileId}`);
  return Boolean(seaIceMask?.[tileId] || freshwaterIceMask?.[tileId]);
}

function waterLatitudeTerrainImage(key, id, row = null) {
  const latitudeBand = waterLatitudeBandForTile(id, row);
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

function waterLatitudeTerrainColor(key, id, row = null) {
  const latitudeBand = waterLatitudeBandForTile(id, row);
  const cacheKey = `${key}|${latitudeBand}`;
  if (!waterLatitudeSpriteColors?.has(cacheKey)) waterLatitudeTerrainImage(key, id, row);
  const color = waterLatitudeSpriteColors?.get(cacheKey);
  if (!color) throw new Error(`Missing latitude water color for ${cacheKey}`);
  return color;
}

function waterLatitudeBandForTile(id, row = null) {
  const latitude = Number.isFinite(row?.latitudeDeg) ? row.latitudeDeg : graph?.latDeg?.[id];
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
  const pixelKey = pixelMaskKey(Math.round(x), Math.round(y));
  for (const entry of candidates) {
    if (entry.kind === "riverConnector" && entry.waterPixels.has(pixelKey)) {
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
  const probes = riverCenterlineInfosAtLocalPoint(x, y, activeChart);
  if (preferredDirection) {
    return selectRiverRailPath({ probes, desiredDirection: preferredDirection })?.probe || null;
  }
  return probes.reduce((best, probe) => (
    !best || probe.centerlineDistance < best.centerlineDistance ? probe : best
  ), null);
}

function riverCenterlineInfosAtLocalPoint(x, y, activeChart) {
  if (!activeChart?.waterIndex) return [];
  const candidates = wakeWaterCandidatesForPoint(x, y, activeChart.waterIndex);
  const probes = [];

  for (const entry of candidates) {
    if (entry.kind === "riverConnector") {
      const probe = riverPathWaterProbe(x, y, entry.path, RIVER_CONNECTOR_RADIUS_PX, entry.call.a);
      probe.pathKey = `connector:${entry.call.a}:${entry.call.b}`;
      probes.push(probe);
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
    const paths = riverBezierPaths(endpoints, variant);
    for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
      const path = paths[pathIndex];
      const probe = riverPathWaterProbe(px, py, path, RIVER_BODY_RADIUS_PX, entry.call.id);
      probe.pathKey = `tile:${entry.call.id}:${pathIndex}`;
      probe.pathOffsetX = pathOffsetX;
      probe.pathOffsetY = pathOffsetY;
      probe.centerlineX += pathOffsetX;
      probe.centerlineY += pathOffsetY;
      probes.push(probe);
    }
  }
  return probes;
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
  const mask = spriteAlphaMask(img);
  return mask.alpha[px + py * mask.width] > 0;
}

function spriteAlphaMask(img) {
  const cached = spriteAlphaMasks.get(img);
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
  spriteAlphaMasks.set(img, mask);
  return mask;
}

function wakePointIsOnRiverTile(x, y, call, activeChart) {
  const mask = riverMasks?.[call.id] || 0;
  if (mask === 0) return false;
  const sprite = riverSpriteForTile(call, activeChart, mask);
  if (!sprite) return false;
  return alphaMaskContainsMapPoint(
    spriteAlphaMask(sprite),
    Math.round(call.drawSurfaceX - TILE_ART_HALF),
    Math.round(call.drawSurfaceY - TILE_ART_HALF),
    x,
    y
  );
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
  if (!ship || (gameOverReason && gameOverState?.sinkShip !== false) || !shipLighting || !light || light.shadow <= 0.01) return;
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

function drawFishingNetAnimation(nowMs) {
  if (!fishingAction || !animalImages?.fishingNet) return;
  const animation = fishingAnimationState(fishingAction.startMs, nowMs);
  if (animation.complete) return;
  const sx = animation.frameIndex * FISHING_NET_FRAME_SIZE;
  const y = Math.round(SCREEN_H / 2 - FISHING_NET_FRAME_SIZE / 2);
  ctx.save();
  if (fishingAction.side < 0) {
    ctx.translate(Math.round(SCREEN_W / 2), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      animalImages.fishingNet,
      sx,
      0,
      FISHING_NET_FRAME_SIZE,
      FISHING_NET_FRAME_SIZE,
      0,
      y,
      FISHING_NET_FRAME_SIZE,
      FISHING_NET_FRAME_SIZE
    );
  } else {
    ctx.drawImage(
      animalImages.fishingNet,
      sx,
      0,
      FISHING_NET_FRAME_SIZE,
      FISHING_NET_FRAME_SIZE,
      Math.round(SCREEN_W / 2),
      y,
      FISHING_NET_FRAME_SIZE,
      FISHING_NET_FRAME_SIZE
    );
  }
  ctx.restore();
}

function drawNpcFishingNetAnimations(nowMs) {
  if (!animalImages?.fishingNet || !chart) return;
  const offset = chartOffsetPixels(chart);
  for (const state of npcVisualShips.values()) {
    const action = state.fishingAction;
    if (!action) continue;
    const animation = fishingAnimationState(action.startMs, nowMs);
    if (animation.complete) continue;
    const sx = animation.frameIndex * FISHING_NET_FRAME_SIZE;
    const shipX = Math.round(state.x + offset.x);
    const y = Math.round(state.y + offset.y - FISHING_NET_FRAME_SIZE / 2);
    if (!pointNearScreen({ x: shipX, y }, FISHING_NET_FRAME_SIZE)) continue;
    ctx.save();
    if (action.side < 0) {
      ctx.translate(shipX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        animalImages.fishingNet,
        sx,
        0,
        FISHING_NET_FRAME_SIZE,
        FISHING_NET_FRAME_SIZE,
        0,
        y,
        FISHING_NET_FRAME_SIZE,
        FISHING_NET_FRAME_SIZE
      );
    } else {
      ctx.drawImage(
        animalImages.fishingNet,
        sx,
        0,
        FISHING_NET_FRAME_SIZE,
        FISHING_NET_FRAME_SIZE,
        shipX,
        y,
        FISHING_NET_FRAME_SIZE,
        FISHING_NET_FRAME_SIZE
      );
    }
    ctx.restore();
  }
}

function drawFishIndividuals(activeChart, nowMs) {
  if (!animalImages?.fish || !gameState) return;
  const calls = fishIndividualDrawCalls(activeChart, nowMs);
  for (const call of calls) drawFishSprite(call);
}

function fishIndividualDrawCalls(activeChart, nowMs) {
  const calls = [];
  const offset = chartOffsetPixels(activeChart);
  for (const tileCall of activeChart.tileCalls) {
    if (calls.length >= FISH_VISIBLE_MAX_INDIVIDUALS) break;
    if (!pointNearScreen({
      x: tileCall.drawSurfaceX + offset.x,
      y: tileCall.drawSurfaceY + offset.y
    }, FISH_SPRITE_SIZE + 6)) continue;
    const fishery = fisheryForTileCall(tileCall);
    if (!fishery) continue;
    calls.push(...fishIndividualCallsForFishery(tileCall, fishery, nowMs, FISH_VISIBLE_MAX_INDIVIDUALS - calls.length));
  }
  return calls.sort((a, b) => a.sortY - b.sortY || a.sortId - b.sortId);
}

function fishIndividualCallsForFishery(tileCall, fishery, nowMs, maxCount = Infinity) {
  const calls = [];
  const seed = hashInt(tileCall.id ^ 0x46495348);
  const count = Math.min(maxCount, fishery.visibleIndividualCount);
  for (let i = 0; i < count; i++) {
    const fishSeed = hashInt(seed ^ Math.imul(i + 1, 0x9e3779b1));
    const motion = fishIndividualSwimMotion(tileCall, fishery, fishSeed, i, nowMs);
    if (!motion) continue;
    const x = Math.round(motion.x);
    const y = Math.round(motion.y);
    calls.push({
      id: `fish-${fishery.stockKey}-${i}`,
      sortId: tileCall.id * 8 + i,
      tileId: tileCall.id,
      centerX: x,
      centerY: y,
      x: x - Math.floor(FISH_SPRITE_SIZE / 2),
      y: y - Math.floor(FISH_SPRITE_SIZE / 2),
      sortY: y,
      fishery,
      colors: fishery.colors,
      alpha: fishery.overfished ? 0.26 : 0.42,
      flip: motion.vx < 0,
      scale: fishery.schoolScale
    });
  }
  return calls;
}

function fishIndividualSwimMotion(tileCall, fishery, fishSeed, index, nowMs) {
  const radius = fisherySwimRadius(fishery);
  const axis = fisherySwimAxis(tileCall, fishery, fishSeed);
  const cross = { x: -axis.y, y: axis.x };
  const periodMs = FISH_SWIM_PERIOD_MIN_MS + ((fishSeed >>> 7) % FISH_SWIM_PERIOD_SPREAD_MS);
  const phase = ((nowMs + (fishSeed & 0xffff)) % periodMs) / periodMs * Math.PI * 2;
  const schoolingPhase = phase + index * 0.42;
  const home = fishIndividualHomeOffset(fishSeed, index, radius);
  const forward = Math.sin(schoolingPhase) * radius.x + Math.sin(schoolingPhase * 0.47 + fishSeed) * radius.x * 0.22;
  const side = Math.sin(schoolingPhase * 1.8 + (fishSeed >>> 5)) * radius.y;
  const tailWag = Math.sin((nowMs + fishSeed) / 180) * 0.55;
  let x = tileCall.drawSurfaceX + home.x + axis.x * forward + cross.x * (side + tailWag);
  let y = tileCall.drawSurfaceY + home.y + axis.y * forward + cross.y * (side + tailWag);
  const scatter = fishScatterOffset(x, y);
  x += scatter.x;
  y += scatter.y;
  const vx = axis.x * Math.cos(schoolingPhase) * radius.x + cross.x * Math.cos(schoolingPhase * 1.8) * radius.y + scatter.x;
  const waterPoint = fishWaterMaskedPoint(tileCall, fishery, x, y, axis);
  return waterPoint ? { ...waterPoint, vx } : null;
}

function fishWaterMaskedPoint(tileCall, fishery, x, y, preferredDirection) {
  const isWater = (px, py) => wakeMapPointIsWater(px, py, chart);
  if (isWater(x, y)) return { x, y };
  if (fishery.habitatKind === "river" || fishery.habitatKind === "river-mouth") {
    const river = nearestRiverCenterlineInfoAtLocalPoint(x, y, chart, preferredDirection);
    if (river && isWater(river.centerlineX, river.centerlineY)) {
      return { x: river.centerlineX, y: river.centerlineY };
    }
  }
  return nearestWaterMaskedPoint({
    x,
    y,
    isWater,
    fallback: { x: tileCall.drawSurfaceX, y: tileCall.drawSurfaceY },
    maxRadius: Math.max(6, Math.ceil(fishery.areaRadiusPx || 8) + 4)
  });
}

function fisherySwimRadius(fishery) {
  const area = Math.max(4, fishery.areaRadiusPx || 8);
  if (fishery.habitatKind === "river") return { x: area * 0.86, y: area * 0.3 };
  if (fishery.habitatKind === "river-mouth") return { x: area * 0.9, y: area * 0.34 };
  if (fishery.habitatKind === "lake") return { x: area * 0.84, y: area * 0.42 };
  if (fishery.habitatKind === "coastal") return { x: area * 0.8, y: area * 0.44 };
  return { x: area * 0.82, y: area * 0.46 };
}

function fisherySwimAxis(tileCall, fishery, fishSeed) {
  if (fishery.habitatKind === "river" || fishery.habitatKind === "river-mouth") {
    const riverAxis = fishRiverAxis(tileCall);
    if (riverAxis) return riverAxis;
  }
  const angle = ((fishSeed >>> 9) % 6283) / 1000;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function fishRiverAxis(tileCall) {
  let dx = 0;
  let dy = 0;
  for (const neighborId of graph.neighbors[tileCall.id] || []) {
    if (!shipTileHasRiver(neighborId) && !isShipOpenWaterTile(neighborId)) continue;
    const neighbor = chart?.tileById.get(neighborId);
    if (!neighbor) continue;
    dx += neighbor.drawSurfaceX - tileCall.drawSurfaceX;
    dy += neighbor.drawSurfaceY - tileCall.drawSurfaceY;
  }
  return normalizeScreenVector({ x: dx, y: dy });
}

function fishIndividualHomeOffset(fishSeed, index, radius) {
  return {
    x: ((((fishSeed >>> 4) & 15) - 7.5) / 7.5) * radius.x * 0.42 + (index - 2) * 0.8,
    y: ((((fishSeed >>> 12) & 15) - 7.5) / 7.5) * radius.y * 0.62
  };
}

function fishScatterOffset(x, y) {
  if (!localLayout || !ship) return { x: 0, y: 0 };
  const dx = x - localLayout.viewX;
  const dy = y - localLayout.viewY;
  const distance = Math.hypot(dx, dy);
  if (distance <= 1e-3 || distance >= FISH_SCATTER_RADIUS_PX) return { x: 0, y: 0 };
  const push = (1 - distance / FISH_SCATTER_RADIUS_PX) * FISH_SCATTER_PUSH_PX;
  return {
    x: dx / distance * push,
    y: dy / distance * push
  };
}

function fisheryForTileCall(tileCall) {
  const habitat = fishHabitatForTileCall(tileCall);
  if (!habitat) return null;
  return fisheryForHabitat(gameState, habitat, Math.floor(weatherClockMinutes));
}

function fishHabitatForTileCall(tileCall) {
  if (!tileCall || seaIceMask?.[tileCall.id] || freshwaterIceMask?.[tileCall.id]) return null;
  const isRiver = shipTileHasRiver(tileCall.id) && !isWaterSurfaceRow(tileCall.row);
  const isRiverMouth = shipTileHasRiver(tileCall.id) && isWaterSurfaceRow(tileCall.row);
  const isLake = tileCall.row?.t === "lake" && isShipOpenWaterTile(tileCall.id);
  const isWater = isShipOpenWaterTile(tileCall.id);
  const isCoastal = isCoastalWaterRow(tileCall.row) || (isWater && tileHasLandNeighbor(tileCall.id));
  const kind = fishHabitatKind({ isWater, isCoastal, isRiver, isRiverMouth, isLake });
  if (!kind) return null;
  const center = tileCenterVector(tileCall.id);
  return {
    tileId: tileCall.id,
    kind,
    lat: latitudeDegForDirection(center),
    lon: longitudeDegForDirection(center)
  };
}

function drawFishSprite(call) {
  const sprite = tintedFishSprite(call.colors);
  const alpha = spriteAlphaMask(sprite).alpha;
  const visiblePixels = waterMaskedSpritePixels({
    x: call.x,
    y: call.y,
    width: FISH_SPRITE_SIZE,
    height: FISH_SPRITE_SIZE,
    alpha,
    flip: call.flip,
    isWater: (x, y) => wakeMapPointIsWater(x, y, chart)
  });
  if (visiblePixels.length === 0) return;
  ctx.save();
  ctx.globalAlpha = call.alpha;
  ctx.beginPath();
  for (const pixel of visiblePixels) ctx.rect(pixel.x, pixel.y, 1, 1);
  ctx.clip();
  if (call.flip) {
    ctx.translate(call.x + FISH_SPRITE_SIZE, call.y);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0);
  } else {
    ctx.drawImage(sprite, call.x, call.y);
  }
  ctx.restore();
}

function tintedFishSprite(colors) {
  const key = `${colors.body}|${colors.highlight}|${colors.shadow}`;
  const cached = fishSpriteTintCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = FISH_SPRITE_SIZE;
  canvas.height = FISH_SPRITE_SIZE;
  const tintCtx = canvas.getContext("2d", { willReadFrequently: true });
  if (!tintCtx) throw new Error("Could not create fish tint canvas");
  tintCtx.imageSmoothingEnabled = false;
  tintCtx.drawImage(animalImages.fish, 0, 0);
  const data = tintCtx.getImageData(0, 0, FISH_SPRITE_SIZE, FISH_SPRITE_SIZE);
  const palette = {
    body: hexToRgb(colors.body),
    highlight: hexToRgb(colors.highlight),
    shadow: hexToRgb(colors.shadow)
  };
  for (let i = 0; i < data.data.length; i += 4) {
    const alpha = data.data[i + 3];
    if (alpha === 0) continue;
    const light = (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 765;
    const color = light > 0.72 ? palette.highlight : light < 0.32 ? palette.shadow : palette.body;
    data.data[i] = color.r;
    data.data[i + 1] = color.g;
    data.data[i + 2] = color.b;
  }
  tintCtx.putImageData(data, 0, 0);
  fishSpriteTintCache.set(key, canvas);
  return canvas;
}

function hexToRgb(hex) {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
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

function updateWorldShipSinkEffects(nowMs) {
  if (worldShipSinkEffects.length === 0) return false;
  worldShipSinkEffects = worldShipSinkEffects.filter(({ effect }) => !shipSinkEffectComplete(effect, nowMs));
  return true;
}

function spawnPlayerShipSinkEffect(nowMs) {
  const call = playerShipDrawCall(shipSunLightState());
  if (!call) throw new Error("Cannot sink the player ship without its current draw call");
  worldShipSinkEffects.push(createWorldShipSinkEntry(call, nowMs, "screen", { x: 0, y: 0 }));
}

function spawnNpcShipSinkEffect(state, nowMs) {
  if (!chart) throw new Error(`Cannot sink NPC ship ${state.id} before the local chart exists`);
  const call = npcShipDrawCall(state, chart);
  if (!call) return false;
  worldShipSinkEffects.push(createWorldShipSinkEntry(call, nowMs, "chart", chartOffsetPixels(chart)));
  return true;
}

function createWorldShipSinkEntry(call, nowMs, space, coordinateOffset) {
  if (space !== "screen" && space !== "chart") throw new Error(`Unknown ship sinking coordinate space: ${space}`);
  const frameAsset = rowingShipFrameAsset(call, nowMs);
  const renderedCall = stormBobbedShipCall({
    ...call,
    img: frameAsset.image,
    sinkDepthImg: frameAsset.sinkDepthImage
  }, nowMs);
  return {
    space,
    effect: createShipSinkEffect({
      id: call.id,
      pixels: shipSpriteFramePixels(renderedCall.img, renderedCall.sinkDepthImg, renderedCall.frame),
      frameSize: SHIP_SHEET_FRAME_SIZE,
      originX: renderedCall.x - coordinateOffset.x,
      originY: renderedCall.y - coordinateOffset.y,
      startedAtMs: nowMs,
      seed: hashInt(call.tileId ^ Math.imul(String(call.id).length + 1, 0x9e3779b1))
    })
  };
}

function shipSpriteFramePixels(image, sinkDepthImage, frame) {
  if (!(image instanceof HTMLImageElement) && !(image instanceof HTMLCanvasElement)) {
    throw new Error("Ship sinking requires a loaded image or canvas sprite sheet");
  }
  if (!(sinkDepthImage instanceof HTMLImageElement) && !(sinkDepthImage instanceof HTMLCanvasElement)) {
    throw new Error("Ship sinking requires a loaded sink-depth image or canvas sprite sheet");
  }
  if (!Number.isInteger(frame) || frame < 0 || frame >= SHIP_HEADING_COUNT) {
    throw new Error(`Ship sinking received an invalid heading frame: ${frame}`);
  }
  let depthImages = shipSinkPixelCache.get(image);
  if (!depthImages) {
    depthImages = new WeakMap();
    shipSinkPixelCache.set(image, depthImages);
  }
  let frames = depthImages.get(sinkDepthImage);
  if (!frames) {
    frames = new Map();
    depthImages.set(sinkDepthImage, frames);
  }
  const cached = frames.get(frame);
  if (cached) return cached;

  const sx = (frame % SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE;
  const sy = Math.floor(frame / SHIP_SHEET_COLS) * SHIP_SHEET_FRAME_SIZE;
  shipSinkSampleCtx.clearRect(0, 0, SHIP_SHEET_FRAME_SIZE, SHIP_SHEET_FRAME_SIZE);
  shipSinkSampleCtx.drawImage(
    image,
    sx,
    sy,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE,
    0,
    0,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE
  );
  const data = shipSinkSampleCtx.getImageData(0, 0, SHIP_SHEET_FRAME_SIZE, SHIP_SHEET_FRAME_SIZE).data;
  shipSinkSampleCtx.clearRect(0, 0, SHIP_SHEET_FRAME_SIZE, SHIP_SHEET_FRAME_SIZE);
  shipSinkSampleCtx.drawImage(
    sinkDepthImage,
    sx,
    sy,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE,
    0,
    0,
    SHIP_SHEET_FRAME_SIZE,
    SHIP_SHEET_FRAME_SIZE
  );
  const sinkDepthData = shipSinkSampleCtx
    .getImageData(0, 0, SHIP_SHEET_FRAME_SIZE, SHIP_SHEET_FRAME_SIZE)
    .data;
  const pixels = [];
  for (let y = 0; y < SHIP_SHEET_FRAME_SIZE; y++) {
    for (let x = 0; x < SHIP_SHEET_FRAME_SIZE; x++) {
      const index = (y * SHIP_SHEET_FRAME_SIZE + x) * 4;
      const alpha = data[index + 3];
      const sinkDepthAlpha = sinkDepthData[index + 3];
      if ((alpha === 0) !== (sinkDepthAlpha === 0)) {
        throw new Error(`Ship sinking sprite and sink-depth alpha disagree in frame ${frame} at ${x},${y}`);
      }
      if (alpha === 0) continue;
      const sinkDepth = shipSinkDepthByte(
        sinkDepthData[index],
        sinkDepthData[index + 1],
        sinkDepthData[index + 2],
        ` in frame ${frame} at ${x},${y}`
      );
      pixels.push(Object.freeze({
        x,
        y,
        color: `rgb(${data[index]}, ${data[index + 1]}, ${data[index + 2]})`,
        alpha: alpha / 255,
        sinkHeight: sinkDepth / 255
      }));
    }
  }
  if (pixels.length === 0) throw new Error(`Ship sinking sprite frame ${frame} contains no opaque pixels`);
  const result = Object.freeze(pixels);
  frames.set(frame, result);
  return result;
}

function shipWaterlineLayers(image, sinkDepthImage, frame, slug) {
  let depthImages = shipWaterlineLayerCache.get(image);
  if (!depthImages) {
    depthImages = new WeakMap();
    shipWaterlineLayerCache.set(image, depthImages);
  }
  let frames = depthImages.get(sinkDepthImage);
  if (!frames) {
    frames = new Map();
    depthImages.set(sinkDepthImage, frames);
  }
  const maxRasterDepth = shipMaxRasterWaterlineDepth(slug);
  const cacheKey = `${frame}:${maxRasterDepth}`;
  const cached = frames.get(cacheKey);
  if (cached) return cached;

  const aboveCanvas = document.createElement("canvas");
  aboveCanvas.width = SHIP_SHEET_FRAME_SIZE;
  aboveCanvas.height = SHIP_SHEET_FRAME_SIZE;
  const aboveCtx = aboveCanvas.getContext("2d");
  const submergedCanvas = document.createElement("canvas");
  submergedCanvas.width = SHIP_SHEET_FRAME_SIZE;
  submergedCanvas.height = SHIP_SHEET_FRAME_SIZE;
  const submergedCtx = submergedCanvas.getContext("2d");
  if (!aboveCtx || !submergedCtx) throw new Error("Could not create ship waterline layer canvases");
  aboveCtx.imageSmoothingEnabled = false;
  submergedCtx.imageSmoothingEnabled = false;

  const pixels = shipSpriteFramePixels(image, sinkDepthImage, frame);
  const submergedPointSet = floatingShipSubmergedPixelKeys(
    pixels,
    SHIP_SHEET_FRAME_SIZE,
    maxRasterDepth
  );
  const abovePointSet = new Set();
  for (const pixel of pixels) {
    const key = pixel.y * SHIP_SHEET_FRAME_SIZE + pixel.x;
    const targetCtx = submergedPointSet.has(key) ? submergedCtx : aboveCtx;
    targetCtx.globalAlpha = pixel.alpha;
    targetCtx.fillStyle = pixel.color;
    targetCtx.fillRect(pixel.x, pixel.y, 1, 1);
    if (targetCtx === aboveCtx) abovePointSet.add(pixel.x | (pixel.y << 8));
  }
  aboveCtx.globalAlpha = 1;
  submergedCtx.globalAlpha = 1;

  const layers = Object.freeze({
    aboveCanvas,
    submergedCanvas,
    abovePointSet
  });
  frames.set(cacheKey, layers);
  return layers;
}

function drawFloatingShipSprite(call, layers, nowMs) {
  const refractionTime = reducedMotionPreferred ? 0 : nowMs;
  ctx.save();
  ctx.globalAlpha = SHIP_SUBMERGED_ALPHA;
  for (let y = 0; y < SHIP_SHEET_FRAME_SIZE; y += SHIP_REFRACTION_BAND_HEIGHT) {
    const bandHeight = Math.min(SHIP_REFRACTION_BAND_HEIGHT, SHIP_SHEET_FRAME_SIZE - y);
    const offset = liveShipRefractionOffset(y, refractionTime, call.bobSeed);
    ctx.drawImage(
      layers.submergedCanvas,
      0,
      y,
      SHIP_SHEET_FRAME_SIZE,
      bandHeight,
      call.x + offset,
      call.y + y,
      SHIP_SHEET_FRAME_SIZE,
      bandHeight
    );
  }
  ctx.restore();
  ctx.drawImage(layers.aboveCanvas, call.x, call.y);
}

function drawWorldShipSinkEffect(entry, activeChart, nowMs) {
  const chartOffset = chartOffsetPixels(activeChart);
  if (entry.space === "chart") {
    drawShipSinkEffect(entry.effect, nowMs, chartOffset, (x, y) => wakeMapPointIsWater(x, y, activeChart));
    return;
  }
  if (entry.space === "screen") {
    drawShipSinkEffect(entry.effect, nowMs, { x: 0, y: 0 }, (x, y) => (
      wakeMapPointIsWater(x - chartOffset.x, y - chartOffset.y, activeChart)
    ));
    return;
  }
  throw new Error(`Unknown ship sinking coordinate space: ${entry.space}`);
}

function drawShipSinkEffect(effect, nowMs, drawOffset, waterAtPoint) {
  const frame = shipSinkFrame(effect, nowMs);
  ctx.save();
  for (const pixel of frame.ripples) {
    if (!waterAtPoint(pixel.x, pixel.y)) continue;
    drawShipSinkPixel(pixel, drawOffset);
  }
  for (const pixel of frame.hullPixels) drawShipSinkPixel(pixel, drawOffset);
  for (const pixel of frame.particles) drawShipSinkPixel(pixel, drawOffset);
  ctx.restore();
}

function drawShipSinkPixel(pixel, drawOffset) {
  if (pixel.alpha <= 0) return;
  ctx.globalAlpha = pixel.alpha;
  ctx.fillStyle = pixel.color;
  ctx.fillRect(pixel.x + drawOffset.x, pixel.y + drawOffset.y, 1, 1);
}

function drawShips(activeChart, playerLight, nowMs) {
  const drawCalls = [];
  const playerCall = playerShipDrawCall(playerLight);
  if (playerCall) drawCalls.push(playerCall);
  if (npcSeaRoutes && npcShipAssetsBySlug && camera && directionIndex) {
    for (const state of npcVisualShips.values()) {
      const call = npcShipDrawCall(state, activeChart);
      if (call) drawCalls.push(call);
    }
  }
  for (const entry of worldShipSinkEffects) {
    const offset = entry.space === "chart" ? chartOffsetPixels(activeChart) : { x: 0, y: 0 };
    drawCalls.push({
      id: `sinking:${entry.effect.id}`,
      kind: "sinking",
      sortY: entry.effect.waterlineY + offset.y,
      entry,
      activeChart
    });
  }
  drawCalls.sort(compareShipDrawCalls);
  for (const call of drawCalls) drawShipCall(call, nowMs);
}

function playerShipDrawCall(light) {
  if (!ship || !shipImage || (gameOverReason && gameOverState?.sinkShip !== false)) return null;
  const frame = shipHeadingFrame();
  const origin = shipScreenOrigin(SHIP_SHEET_FRAME_SIZE);
  return {
    id: "player",
    kind: "player",
    tileId: ship.tileId,
    bobSeed: 0x504c4159,
    slug: ship.typeSlug,
    img: shipImage,
    sinkDepthImg: shipSinkDepthImage,
    rowing: playerShipIsRowing(),
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
  const asset = npcShipAssetsBySlug.get(state.slug);
  if (!asset) throw new Error(`Missing NPC ship sprite asset for ${state.slug}`);
  return {
    id: state.id,
    kind: "npc",
    tileId: state.tileId,
    bobSeed: hashInt(state.tileId ^ Math.imul(state.id.length + 1, 0x9e3779b1)),
    slug: state.slug,
    factionId: state.factionId,
    role: state.role,
    img: asset.image,
    sinkDepthImg: asset.sinkDepthImage,
    rowing: npcShipIsRowing(state),
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
  if (call.kind === "sinking") {
    drawWorldShipSinkEffect(call.entry, call.activeChart, nowMs);
    return;
  }
  const frameAsset = rowingShipFrameAsset(call, nowMs);
  const drawCall = stormBobbedShipCall({
    ...call,
    img: frameAsset.image,
    sinkDepthImg: frameAsset.sinkDepthImage
  }, nowMs);
  const layers = shipWaterlineLayers(
    drawCall.img,
    drawCall.sinkDepthImg,
    drawCall.frame,
    drawCall.slug
  );
  if (drawCall.combatAllegiance) drawShipCombatOutline(drawCall, layers);
  drawFloatingShipSprite(drawCall, layers, nowMs);
  if (drawCall.kind === "player") {
    drawShipLighting(drawCall.frame, drawCall.x, drawCall.y, drawCall.light, layers.abovePointSet);
  }
  if (drawCall.kind === "npc") {
    drawNpcShipFlag(drawCall, nowMs);
    if (drawCall.stormAnchored) drawNpcAnchorMarker(drawCall);
    if (drawCall.combatMode) drawNpcCombatHull(drawCall);
  }
}

function rowingShipFrameAsset(call, nowMs) {
  if (!call.img || !call.sinkDepthImg) throw new Error(`Ship ${call.slug} is missing its sprite asset pair`);
  if (!call.rowing) return { image: call.img, sinkDepthImage: call.sinkDepthImg };
  const frames = rowingShipAssetsBySlug?.get(call.slug);
  if (!frames || frames.length === 0) throw new Error(`Rowing ship ${call.slug} has no animation assets`);
  const spec = ROWING_SHIP_ANIMATION_SPECS.get(call.slug);
  if (!spec) throw new Error(`Rowing ship ${call.slug} has no animation specification`);
  const seedOffset = call.kind === "npc" ? (call.bobSeed & 0xff) * 3 : 0;
  const frameIndex = reducedMotionPreferred
    ? 0
    : Math.floor((nowMs + seedOffset) / spec.frameMs) % frames.length;
  return frames[frameIndex];
}

function playerShipIsRowing() {
  if (!ship || anchored || portWaitState) return false;
  if (vectorLength(ship.velocity) <= SHIP_MIN_SLIDE_SPEED_RAD) return false;
  return shipUsesOars(
    ship.stats,
    ship.heading,
    ship.position,
    ship.tileId,
    playerRowerRatio()
  );
}

function npcShipIsRowing(state) {
  if (state.stormMode === "anchored" || state.fishingAction) return false;
  if (state.routeKey?.startsWith("held:")) return false;
  return shipUsesOars(shipStatsForSlug(state.slug), state.heading, state.vector, state.tileId);
}

function shipUsesOars(stats, heading, position, tileId, rowerRatio = 1) {
  if (!rowingShipAssetsBySlug?.has(stats.slug)) return false;
  const wind = windForTile(tileId);
  const windFlow = windFlowVectorAtPosition(wind, position, heading);
  return shipPropulsionPerformance(stats, {
    windStrength: wind.strength,
    sailEfficiency: sailingEfficiencyForStats(stats, heading, windFlow),
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD,
    rowerRatio
  }).rowing;
}

function playerRowerRatio() {
  if (!ship?.stats) return 0;
  const crew = gameState?.ship?.crew ?? ship.stats.crewCapacity;
  return clamp(crew / ship.stats.crewCapacity, 0, 1);
}

function stormBobbedShipCall(call, nowMs) {
  const intensity = stormIntensityForTile(call.tileId);
  if (intensity < STORM_SHIP_BOB_ENTER_INTENSITY) return call;
  const t = clamp((intensity - STORM_SHIP_BOB_ENTER_INTENSITY) / (1 - STORM_SHIP_BOB_ENTER_INTENSITY), 0, 1);
  const seedPhase = (call.bobSeed & 0xffff) / 0xffff * Math.PI * 2;
  const x = call.x + Math.round(Math.sin(nowMs * 0.008 + seedPhase * 0.7) * STORM_SHIP_BOB_MAX_X_PX * t);
  const y = call.y + Math.round(Math.sin(nowMs * 0.013 + seedPhase) * STORM_SHIP_BOB_MAX_Y_PX * t);
  return { ...call, x, y };
}

function npcCombatAllegiance(npcShipId, factionId) {
  if (shipCombatState.engagements.has(engagementKey(PLAYER_COMBAT_ID, npcShipId))) return "enemy";
  return playerCombatAllegiance(
    ship.factionId,
    factionId,
    playerHasCombatEngagement(),
    currentDiplomacyBetween
  );
}

function currentDiplomacyBetween(factionAId, factionBId) {
  return gameState
    ? diplomacyBetweenForState(gameState, factionAId, factionBId)
    : diplomacyBetween(factionAId, factionBId);
}

function drawShipCombatOutline(call, layers) {
  shipOutlineCtx.clearRect(0, 0, SHIP_SHEET_FRAME_SIZE, SHIP_SHEET_FRAME_SIZE);
  shipOutlineCtx.globalCompositeOperation = "source-over";
  shipOutlineCtx.drawImage(layers.aboveCanvas, 0, 0);
  shipOutlineCtx.globalCompositeOperation = "source-in";
  shipOutlineCtx.fillStyle = call.combatAllegiance === "enemy" ? "#e83b3b" : "#38b764";
  shipOutlineCtx.fillRect(0, 0, SHIP_SHEET_FRAME_SIZE, SHIP_SHEET_FRAME_SIZE);
  shipOutlineCtx.globalCompositeOperation = "source-over";

  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.drawImage(shipOutlineCanvas, call.x + dx, call.y + dy);
  }
}

function drawNpcShipFlag(call, nowMs) {
  if (!factionHasFlag(call.factionId)) return;
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

function drawShipLighting(frame, x, y, light, abovePointSet) {
  if (!shipLighting || !light || light.direct <= 0.01) return;
  drawShipMaskPoints(
    shipLightingPoints("shade", frame, light.bin),
    x,
    y,
    `rgba(26, 18, 44, ${(SHIP_LIGHT_SHADE_ALPHA * light.direct).toFixed(3)})`,
    abovePointSet
  );
  drawShipMaskPoints(
    shipLightingPoints("light", frame, light.bin),
    x,
    y,
    `rgba(255, 240, 188, ${(SHIP_LIGHT_HIGHLIGHT_ALPHA * light.direct).toFixed(3)})`,
    abovePointSet
  );
}

function shipLightingPoints(kind, frame, bin) {
  const points = shipLighting?.[kind]?.[frame]?.[bin];
  if (!points) throw new Error(`Missing ship ${kind} lighting mask for frame ${frame}, bin ${bin}`);
  return points;
}

function drawShipMaskPoints(points, x, y, color, allowedPoints) {
  if (points.length === 0) return;
  if (!(allowedPoints instanceof Set)) throw new Error("Ship lighting requires an above-water pixel mask");
  ctx.fillStyle = color;
  for (const point of points) {
    if (!allowedPoints.has(point)) continue;
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
  drawShipWindV({
    centerX: SCREEN_W / 2,
    centerY: SCREEN_H / 2,
    flowDirectionRad: state.flowDirectionRad,
    deadZoneHalfAngleRad: ship.stats.upwindStallAngleRad,
    strength: state.strength,
    warning: state.stallWarning || 0,
    nowMs
  });
}

function drawShipWindV({
  centerX,
  centerY,
  flowDirectionRad,
  deadZoneHalfAngleRad,
  strength,
  warning,
  nowMs
}) {
  const clampedStrength = clamp(strength, 0.05, 1.25);
  const geometry = windVGeometry({
    centerX,
    centerY,
    flowDirectionRad,
    deadZoneHalfAngleRad,
    windStrength: clampedStrength,
    radiusPx: WIND_INDICATOR_RADIUS_PX
  });
  const clampedWarning = clamp(warning, 0, 1);
  const pulse = reducedMotionPreferred
    ? 0.72
    : 0.5 + Math.sin(nowMs / WIND_INDICATOR_STALL_PULSE_MS * Math.PI * 2) * 0.5;
  const warningHue = easeInOut(clampedWarning);
  const warningColor = {
    r: Math.round(249 + (240 - 249) * warningHue),
    g: Math.round(194 + (79 - 194) * warningHue),
    b: Math.round(43 + (120 - 43) * warningHue)
  };
  const warningMix = clampedWarning * (0.28 + pulse * 0.72);
  const alpha = windVOpacity(clampedStrength, clampedWarning, pulse);
  const color = `rgba(${Math.round(158 + (warningColor.r - 158) * warningMix)}, ` +
    `${Math.round(226 + (warningColor.g - 226) * warningMix)}, ` +
    `${Math.round(211 + (warningColor.b - 211) * warningMix)}, ` +
    `${alpha.toFixed(3)})`;
  drawPixelLine(geometry.apex.x, geometry.apex.y, geometry.port.x, geometry.port.y, color);
  drawPixelLine(geometry.apex.x, geometry.apex.y, geometry.starboard.x, geometry.starboard.y, color);
}

function drawQuestDestinationArrow(nowMs) {
  const destination = activeQuestDestinationPort();
  if (!destination || !ship || !chart || !localLayout) return;
  const destinationVector = latLonToDirection(destination.lat, destination.lon);
  const visibleCity = chart.cityCalls?.find((call) => call.tileId === destination.tileId);
  drawWorldTargetArrow({
    targetVector: destinationVector,
    localPoint: visibleCity || localPointForGlobeVector(destinationVector),
    localYOffset: QUEST_ARROW_CITY_Y_OFFSET,
    nowMs
  });
}

function drawCampaignGoalDestinationArrow(nowMs) {
  if (!ship || !chart || !localLayout) return;
  const destination = activeCampaignGoalDestination();
  if (!destination) return;
  const style = { light: "#30e1b9", dark: "#0eaf9b", shadow: "rgba(19, 45, 48, 0.78)" };

  if (destination.kind === CAMPAIGN_DESTINATION_DISCOVERY) {
    const discovery = discoveryCatalogById.get(destination.discoveryId);
    if (!discovery) throw new Error(`Campaign goal points to missing discovery: ${destination.discoveryId}`);
    const targetVector = nearestDiscoveryDirection(discovery, ship.position);
    drawWorldTargetArrow({
      targetVector,
      localPoint: localPointForGlobeVector(targetVector),
      localYOffset: -10,
      nowMs,
      style
    });
    return;
  }
  if (destination.kind !== CAMPAIGN_DESTINATION_HOME) {
    throw new Error(`Unknown campaign destination kind: ${destination.kind}`);
  }
  const homeCity = campaignGoalHomeCity();
  if (homeCity.tileId !== destination.homePortTileId) {
    throw new Error(`Campaign destination home port mismatch: ${destination.homePortTileId}`);
  }
  const targetVector = latLonToDirection(homeCity.lat, homeCity.lon);
  const visibleCity = chart.cityCalls?.find((call) => call.tileId === homeCity.tileId);
  drawWorldTargetArrow({
    targetVector,
    localPoint: visibleCity || localPointForGlobeVector(targetVector),
    localYOffset: QUEST_ARROW_CITY_Y_OFFSET,
    nowMs,
    style
  });
}

function drawColonizationDestinationArrow(nowMs) {
  if (!ship || !chart || !localLayout || !gameState) return;
  const objective = colonizationObjective(gameState.memory.colonization);
  if (!objective) return;
  const targetVector = tileCenterVector(objective.tileId);
  const visibleCity = chart.cityCalls?.find((call) => call.tileId === objective.tileId);
  drawWorldTargetArrow({
    targetVector,
    localPoint: visibleCity || localPointForGlobeVector(targetVector),
    localYOffset: QUEST_ARROW_CITY_Y_OFFSET,
    nowMs,
    style: { light: "#8bd5ff", dark: "#277bb8", shadow: "rgba(14, 35, 56, 0.78)" }
  });
}

function drawWorldTargetArrow({ targetVector, localPoint, localYOffset, nowMs, style }) {
  if (localPoint) {
    const offset = chartOffsetPixels(chart);
    const point = {
      x: Math.round(localPoint.x + offset.x),
      y: Math.round(localPoint.y + offset.y + localYOffset)
    };
    if (pointWithinScreen(point, QUEST_ARROW_EDGE_MARGIN_PX)) {
      drawQuestArrowGlyph(point, { x: 0, y: 1 }, nowMs, style);
      return;
    }
  }
  const tangent = normalizeOrNull(projectTangentVector(targetVector, ship.position));
  const direction = tangent ? tangentToScreenDirection(tangent) : null;
  if (!direction) return;
  drawQuestArrowGlyph(screenEdgePointForDirection(direction), direction, nowMs, style);
}

function nearestUndiscoveredExplorerWonder(origin) {
  if (!gameState || !origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) {
    throw new Error("Explorer lead selection requires a placed home port");
  }
  const originDirection = latLonToDirection(origin.lat, origin.lon);
  return explorerWonderCatalog(discoveryCatalog)
    .filter(isExplorerLeadAssignable)
    .filter((discovery) => !hasDiscovery(gameState, discovery.id))
    .map((discovery) => ({ discovery, distance: discoveryDistancePx(discovery, originDirection) }))
    .sort((a, b) => a.distance - b.distance || a.discovery.id.localeCompare(b.discovery.id))[0]?.discovery || null;
}

function retainedOrNearestExplorerLead(origin, goal) {
  if (goal.currentLeadDiscoveryId !== null) {
    const assignedLead = discoveryCatalogById.get(goal.currentLeadDiscoveryId);
    if (!assignedLead) {
      throw new Error(`Explorer goal points to missing discovery: ${goal.currentLeadDiscoveryId}`);
    }
    if (!isExplorerLeadAssignable(assignedLead)) {
      throw new Error(`Explorer goal points to non-location objective: ${goal.currentLeadDiscoveryId}`);
    }
    if (!hasDiscovery(gameState, assignedLead.id)) return assignedLead;
  }
  return nearestUndiscoveredExplorerWonder(origin);
}

function nearestDiscoveryDirection(discovery, position) {
  const directions = Array.isArray(discovery.routeDirections) && discovery.routeDirections.length > 0
    ? discovery.routeDirections
    : [discoveryDirection(discovery)];
  return directions.reduce((nearest, direction) => (
    dot3(direction, position) > dot3(nearest, position) ? direction : nearest
  ), directions[0]);
}

function activeQuestDestinationPort() {
  const quest = gameState?.memory?.quests?.active;
  if (!quest?.destinationTileId) return null;
  const destination = portCitiesByTileId?.get(quest.destinationTileId) || cityByTileId?.get(quest.destinationTileId);
  if (!destination || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lon)) return null;
  return destination;
}

function pointWithinScreen(point, margin = 0) {
  return point.x >= margin &&
    point.x <= SCREEN_W - margin &&
    point.y >= margin &&
    point.y <= SCREEN_H - margin;
}

function screenEdgePointForDirection(direction) {
  const dir = normalizeScreenVector(direction) || { x: 0, y: -1 };
  const cx = SCREEN_W / 2;
  const cy = SCREEN_H / 2;
  const candidates = [];
  if (Math.abs(dir.x) > 1e-6) {
    candidates.push(((dir.x > 0 ? SCREEN_W - QUEST_ARROW_EDGE_MARGIN_PX : QUEST_ARROW_EDGE_MARGIN_PX) - cx) / dir.x);
  }
  if (Math.abs(dir.y) > 1e-6) {
    candidates.push(((dir.y > 0 ? SCREEN_H - QUEST_ARROW_EDGE_MARGIN_PX : QUEST_ARROW_EDGE_MARGIN_PX) - cy) / dir.y);
  }
  const t = Math.min(...candidates.filter((value) => value > 0));
  return {
    x: Math.round(cx + dir.x * t),
    y: Math.round(cy + dir.y * t)
  };
}

function drawQuestArrowGlyph(point, direction, nowMs, style = {}) {
  const dir = normalizeScreenVector(direction) || { x: 0, y: -1 };
  const pulse = reducedMotionPreferred ? 0.5 : 0.5 + Math.sin(nowMs / 420 * Math.PI * 2) * 0.5;
  const size = QUEST_ARROW_SIZE_PX + (pulse > 0.72 ? 1 : 0);
  const width = 4;
  const px = -dir.y;
  const py = dir.x;
  const tip = {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
  const base = {
    x: Math.round(tip.x - dir.x * size),
    y: Math.round(tip.y - dir.y * size)
  };
  const left = {
    x: Math.round(base.x + px * width),
    y: Math.round(base.y + py * width)
  };
  const right = {
    x: Math.round(base.x - px * width),
    y: Math.round(base.y - py * width)
  };

  ctx.fillStyle = style.shadow || "rgba(33, 24, 20, 0.72)";
  ctx.beginPath();
  ctx.moveTo(tip.x + 1, tip.y + 1);
  ctx.lineTo(left.x + 1, left.y + 1);
  ctx.lineTo(right.x + 1, right.y + 1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = style.dark || "#e6904e";
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = style.light || "#f9c22b";
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(base.x, base.y);
  ctx.closePath();
  ctx.fill();
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
    stallWarning: shipHasWindDeadZone(ship.stats)
      ? sailingStallWarningStrength(angleFromWind, ship.stats.upwindStallAngleRad)
      : 0
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
  drawPixelLineOnContext(ctx, x0, y0, x1, y1, color);
}

function drawPixelLineOnContext(targetCtx, x0, y0, x1, y1, color) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  targetCtx.fillStyle = color;
  while (true) {
    targetCtx.fillRect(x, y, 1, 1);
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

function cityDamageOverlay(image, seed) {
  let overlays = cityDamageOverlayCache.get(image);
  if (!overlays) {
    overlays = new Map();
    cityDamageOverlayCache.set(image, overlays);
  }
  let overlay = overlays.get(seed);
  if (overlay) return overlay;

  overlay = document.createElement("canvas");
  overlay.width = CITY_SPRITE_W;
  overlay.height = CITY_SPRITE_H;
  const overlayCtx = overlay.getContext("2d");
  if (!overlayCtx) throw new Error(`Could not create city damage overlay for seed ${seed}`);
  for (const crack of cityCrackSegments(seed, CITY_SPRITE_W, CITY_SPRITE_H)) {
    drawPixelLineOnContext(
      overlayCtx,
      crack.x0,
      crack.y0,
      crack.x1,
      crack.y1,
      "#1a1512"
    );
  }
  overlayCtx.globalCompositeOperation = "destination-in";
  overlayCtx.drawImage(image, 0, 0);
  overlays.set(seed, overlay);
  return overlay;
}

function drawCityShadows(activeChart, light) {
  if (!activeChart.cityCalls || activeChart.cityCalls.length === 0) return;
  if (!light || light.shadow <= 0.01) return;
  const direction = cityShadowDirection();
  if (!direction) return;
  const lowSun = 1 - smoothstep(0.04, 0.35, Math.max(-0.04, light.sunAltitude));
  const stretch = CITY_SHADOW_MIN_STRETCH +
    (CITY_SHADOW_MAX_STRETCH - CITY_SHADOW_MIN_STRETCH) * easeInOut(lowSun);
  const alpha = CITY_SHADOW_ALPHA * light.shadow * (0.48 + lowSun * 0.52);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const call of activeChart.cityCalls) drawCityShadow(call, direction, stretch);
  ctx.restore();
}

function cityShadowDirection() {
  if (!ship || !camera) return null;
  const tangent = normalizeOrNull(projectTangentVector(currentSunDirection(), ship.position));
  if (!tangent) return null;
  const towardSun = tangentToScreenDirection(tangent);
  if (!towardSun) return null;
  return normalizeScreenVector({ x: -towardSun.x, y: -towardSun.y });
}

function drawCityShadow(call, direction, stretch) {
  if (call.hiddenSettlement) return;
  const img = cityShadowSpriteForType(call.cityType, call.settlementType);
  const px = -direction.y;
  const py = direction.x;
  const anchorX = call.spriteX + CITY_SPRITE_W / 2;
  const anchorY = call.spriteY + CITY_SHADOW_SOURCE_Y;
  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.transform(
    px * CITY_SHADOW_WIDTH_SCALE,
    py * CITY_SHADOW_WIDTH_SCALE,
    direction.x * stretch,
    direction.y * stretch,
    0,
    0
  );
  ctx.drawImage(img, -CITY_SPRITE_W / 2, 0);
  ctx.restore();
}

function cityShadowSpriteForType(cityType, settlementType = "city") {
  const cacheKey = settlementType === "village" ? "village" : cityType;
  let canvas = cityShadowSpriteCache.get(cacheKey);
  if (canvas) return canvas;
  const img = cityImageForType(cityType, settlementType);
  canvas = document.createElement("canvas");
  canvas.width = CITY_SPRITE_W;
  canvas.height = CITY_SHADOW_SOURCE_H;
  const shadowCtx = canvas.getContext("2d");
  if (!shadowCtx) throw new Error(`Could not create city shadow sprite: ${cityType}`);
  shadowCtx.drawImage(
    img,
    0,
    CITY_SHADOW_SOURCE_Y,
    CITY_SPRITE_W,
    CITY_SHADOW_SOURCE_H,
    0,
    0,
    CITY_SPRITE_W,
    CITY_SHADOW_SOURCE_H
  );
  shadowCtx.globalCompositeOperation = "source-in";
  shadowCtx.fillStyle = "#120d18";
  shadowCtx.fillRect(0, 0, canvas.width, canvas.height);
  cityShadowSpriteCache.set(cacheKey, canvas);
  return canvas;
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
  if (call.hiddenSettlement) return;
  const img = cityImageForType(call.cityType, call.settlementType);
  const battery = shoreBatteryStates.get(shoreBatteryId(call));
  const batteryDisabled = battery && shoreBatteryIsDisabled(battery, Math.floor(weatherClockMinutes));
  const fireSource = fireSourceForCity(call, batteryDisabled);
  const batteryInPlayerCombat = battery?.engagedTargetIds.has(PLAYER_COMBAT_ID) &&
    !batteryDisabled;
  if (batteryInPlayerCombat) {
    const outline = selectableSpriteOutlineCanvas(
      img,
      0,
      0,
      call.spriteW,
      call.spriteH,
      false,
      "#e83b3b"
    );
    ctx.drawImage(outline, call.spriteX - 1, call.spriteY - 1);
  }
  const poleX = call.spriteX + 29;
  const poleTop = call.spriteY + 2;
  const hasFlag = factionHasFlag(call.factionId);
  if (hasFlag) {
    ctx.fillStyle = "#4c3e24";
    ctx.fillRect(poleX, poleTop, 1, 18);
  }
  ctx.drawImage(img, call.spriteX, call.spriteY);
  if (batteryDisabled) {
    ctx.drawImage(cityDamageOverlay(img, call.tileId), call.spriteX, call.spriteY);
  }
  if (hasFlag) {
    drawWavingFactionFlag(
      call.factionId,
      poleX + 1,
      poleTop + 1,
      CITY_FLAG_W,
      CITY_FLAG_H,
      flagWavePhase(nowMs, call.tileId)
    );
  }
  if (fireSource) drawOnFire(fireSource, nowMs);
  if (batteryInPlayerCombat) drawShoreBatteryHealthBar(call, battery);
}

function visibleWorldFireSources() {
  if (!chart?.cityCalls) return [];
  const simMinute = Math.floor(weatherClockMinutes);
  const sources = [];
  for (const call of chart.cityCalls) {
    const battery = shoreBatteryStates.get(shoreBatteryId(call));
    const batteryDisabled = Boolean(battery && shoreBatteryIsDisabled(battery, simMinute));
    const source = fireSourceForCity(call, batteryDisabled);
    if (source) sources.push(source);
  }
  return sources;
}

function fireSourceForCity(call, batteryDisabled) {
  if (call.hiddenSettlement || (!call.colonyBurning && !batteryDisabled)) return null;
  return {
    id: call.colonyBurning ? `colony-fire:${call.tileId}` : `battery-fire:${call.tileId}`,
    x: call.x,
    y: call.y,
    screenX: call.spriteX + CITY_SPRITE_W / 2,
    screenBaseY: call.spriteY + CITY_SPRITE_H,
    phaseSeed: call.tileId
  };
}

function drawOnFire(source, nowMs) {
  if (!fireEffectImage) throw new Error(`Fire source ${source.id} cannot draw before the fire animation loads`);
  const frame = fireAnimationFrame(nowMs, source.phaseSeed);
  ctx.drawImage(
    fireEffectImage,
    frame * FIRE_FRAME_WIDTH,
    0,
    FIRE_FRAME_WIDTH,
    FIRE_FRAME_HEIGHT,
    Math.round(source.screenX - FIRE_FRAME_WIDTH / 2),
    Math.round(source.screenBaseY - FIRE_FRAME_HEIGHT),
    FIRE_FRAME_WIDTH,
    FIRE_FRAME_HEIGHT
  );
}

function drawShoreBatteryHealthBar(call, battery) {
  const width = 18;
  const x = Math.round(call.x - width / 2);
  const y = Math.round(call.spriteY - 3);
  const fill = Math.round((width - 2) * clamp(battery.hitPoints / battery.maxHitPoints, 0, 1));
  ctx.fillStyle = "#1a1512";
  ctx.fillRect(x, y, width, 3);
  ctx.fillStyle = battery.hitPoints <= battery.maxHitPoints * 0.35 ? "#e83b3b" : "#f68181";
  ctx.fillRect(x + 1, y + 1, fill, 1);
}

function flagWavePhase(nowMs, seed = 0) {
  return nowMs * CITY_FLAG_WAVE_SPEED_RAD_PER_MS + seed * 0.37;
}

function drawWavingFactionFlag(factionId, x, y, width, height, phaseRad) {
  if (!factionHasFlag(factionId)) {
    throw new Error(`Neutral faction cannot be drawn as a flag`);
  }
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
      font: PIXEL_FONT_SMALL_8
    });
  }
}

function cityLabelBoxes(cityCalls, activeChart) {
  const { labelBounds, visibleBounds, blockers } = cityLabelScreenLayout(activeChart);
  const sorted = [...cityCalls]
    .filter((call) => !call.hiddenSettlement && cityCallIsOnScreen(call, visibleBounds))
    .sort((a, b) => b.population - a.population || cityLabelText(a).localeCompare(cityLabelText(b)));
  const occupied = blockers.slice();
  const boxes = [];

  for (const call of sorted) {
    const label = cityLabelText(call);
    const textW = measurePixelTextWidth(label, PIXEL_FONT_SMALL_8);
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
  const sprite = discoverySpriteImage(discovery);
  const textX = sprite ? x + 25 : x + 5;
  if (sprite) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, x + 3, y + 3, 18, 18);
  }
  ctx.fillStyle = "#fff1bf";
  const headline = fitPixelText(discovery.notice, PIXEL_FONT_SMALL_8, x + w - 5 - textX);
  drawPixelText(headline, textX, y + 4, { font: PIXEL_FONT_SMALL_8 });
  ctx.fillStyle = "#cbb88a";
  drawPixelText(discovery.detail, textX, y + 14, { font: PIXEL_FONT_SMALL_8 });
}

function drawInteractionButton() {
  interactionButtonRect = null;
  interactionButtonTarget = null;
  if (dialogueState || menusAreOpen() || fishingAction) return;
  const target = activeInteractionTarget();
  if (!target) return;
  interactionButtonTarget = target;
  interactionButtonRect = {
    x: anchored
      ? Math.floor((SCREEN_W - INTERACTION_BUTTON_W) / 2)
      : anchorButtonRect ? anchorButtonRect.x + anchorButtonRect.w + 4 : INTERACTION_BUTTON_X,
    y: anchored ? INTERACTION_BUTTON_Y - INTERACTION_BUTTON_H - 4 : INTERACTION_BUTTON_Y,
    w: INTERACTION_BUTTON_W,
    h: INTERACTION_BUTTON_H
  };
  const disabled = target.kind === "fish" && !canStartFishing(cargoFree(gameState));
  const hovered = !disabled && pointInRect(optionsMenu.hoverPoint, interactionButtonRect);
  drawPiratePaperControl(interactionButtonRect, { disabled, hovered });
  let actionLabel;
  let secondaryLabel = null;
  if (target.kind === "port") {
    actionLabel = `Dock: ${cityLabelText(target.call)}`;
  } else if (target.kind === "fish") {
    const presentation = fishingActionPresentation(target.call.label, fishingChanceForCall(target.call));
    actionLabel = presentation.label;
    secondaryLabel = presentation.chanceLabel;
  } else if (target.kind === "ship") {
    actionLabel = `Hail: ${target.call.label}`;
  } else {
    throw new Error(`Unknown interaction target kind: ${target.kind}`);
  }
  const iconId = target.kind === "port"
    ? "action:dock"
    : target.kind === "fish"
      ? "action:fish"
      : "action:hail";
  drawControlIconLabel(interactionButtonRect, actionLabel, iconId, {
    disabled,
    secondaryLabel,
    font: target.kind === "fish" ? PIXEL_FONT_SMALL_8 : PIXEL_FONT_DIALOGUE_8
  });
}

function drawAnchorButton() {
  anchorButtonRect = null;
  if (dialogueState || menusAreOpen() || gameOverReason || fishingAction) return;
  if (!anchored && !canAnchorAtCurrentShore()) return;
  anchorButtonRect = {
    x: anchored
      ? Math.floor((SCREEN_W - ANCHOR_BUTTON_W - 4 - SCAVENGE_BUTTON_W) / 2)
      : ANCHOR_BUTTON_X,
    y: ANCHOR_BUTTON_Y,
    w: ANCHOR_BUTTON_W,
    h: ANCHOR_BUTTON_H
  };
  const disabled = anchored && Boolean(shoreScavengeAction);
  const hovered = !disabled && pointInRect(optionsMenu.hoverPoint, anchorButtonRect);
  drawPiratePaperControl(anchorButtonRect, { disabled, hovered, active: anchored });
  const label = disabled ? "HOLD FAST" : anchored ? "WEIGH ANCHOR" : "DROP ANCHOR";
  drawControlIconLabel(anchorButtonRect, label, "action:dock", { disabled });
}

function drawScavengeButton() {
  scavengeButtonRect = null;
  if (!anchored || dialogueState || menusAreOpen() || gameOverReason || fishingAction) return;
  scavengeButtonRect = {
    x: anchorButtonRect.x + anchorButtonRect.w + 4,
    y: ANCHOR_BUTTON_Y,
    w: SCAVENGE_BUTTON_W,
    h: ANCHOR_BUTTON_H
  };
  const stormy = playerStormIntensity() >= STORM_ACTIVE_INTENSITY;
  const disabled = Boolean(shoreScavengeAction) || stormy;
  const hovered = !disabled && pointInRect(optionsMenu.hoverPoint, scavengeButtonRect);
  drawPiratePaperControl(scavengeButtonRect, { disabled, hovered });
  const label = shoreScavengeAction ? "SEARCHING..." : stormy ? "STORM" : "SCAVENGE";
  drawControlIconLabel(scavengeButtonRect, label, "action:scavenge", { disabled });
}

function drawControlIconLabel(rect, label, iconId, {
  disabled = false,
  secondaryLabel = null,
  font = PIXEL_FONT_DIALOGUE_8
} = {}) {
  const iconX = rect.x + 5;
  const iconY = rect.y + Math.floor((rect.h - GAME_ICON_SIZE) / 2);
  drawGameIcon(iconId, iconX, iconY, { alpha: disabled ? 0.4 : 1 });
  const textLeft = iconX + GAME_ICON_SIZE + 4;
  const textWidth = rect.x + rect.w - textLeft - 4;
  const secondaryWidth = secondaryLabel
    ? measurePixelTextWidth(secondaryLabel, PIXEL_FONT_SMALL_8) + 4
    : 0;
  const labelWidth = textWidth - secondaryWidth;
  const textLayout = controlTextLayout({
    label,
    maxWidth: labelWidth,
    measurePrimary: (text) => measurePixelTextWidth(text, font),
    measureCompact: (text) => measurePixelTextWidth(text, PIXEL_FONT_SMALL_8)
  });
  const labelFont = textLayout.fontRole === "compact" ? PIXEL_FONT_SMALL_8 : font;
  const lineStep = 9;
  const firstLineY = controlTextY(rect) - Math.floor((textLayout.lines.length - 1) * lineStep / 2);
  for (let index = 0; index < textLayout.lines.length; index++) {
    drawPixelText(
      textLayout.lines[index],
      textLeft + labelWidth / 2,
      firstLineY + index * lineStep,
      { font: labelFont, align: "center" }
    );
  }
  if (secondaryLabel) {
    drawPixelText(secondaryLabel, rect.x + rect.w - 3, rect.y + 2, {
      font: PIXEL_FONT_SMALL_8,
      align: "right"
    });
  }
}

function drawPiratePaperControl(rect, { disabled = false, hovered = false, active = false } = {}) {
  ctx.fillStyle = disabled
    ? PIRATE_MENU_PAPER_INSET_ALT
    : hovered
      ? PIRATE_MENU_PAPER_SELECTED
      : PIRATE_MENU_PAPER_BUTTON;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = disabled
    ? PIRATE_MENU_INK_MUTED
    : active
      ? PIRATE_MENU_CHART_LINE
      : hovered
        ? PIRATE_MENU_INK
        : PIRATE_MENU_INK_MUTED;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = disabled ? PIRATE_MENU_INK_MUTED : PIRATE_MENU_INK;
}

function drawPortWaitControls() {
  portWaitButtonRect = null;
  if (!portWaitState || gameOverReason) return;
  const city = cityByTileId.get(portWaitState.cityTileId);
  const status = `WAITING SAFELY IN ${city ? cityLabelText(city).toUpperCase() : "PORT"}`;
  const statusW = Math.min(SCREEN_W - 12, measurePixelTextWidth(status, PIXEL_FONT_SMALL_8) + 12);
  const statusX = Math.floor((SCREEN_W - statusW) / 2);
  const buttonW = Math.min(PORT_WAIT_BUTTON_W, SCREEN_W - 12);
  portWaitButtonRect = {
    x: Math.floor((SCREEN_W - buttonW) / 2),
    y: SCREEN_H - INTERACTION_BUTTON_H - 5,
    w: buttonW,
    h: INTERACTION_BUTTON_H
  };
  ctx.fillStyle = "rgba(25, 31, 36, 0.9)";
  ctx.fillRect(statusX, portWaitButtonRect.y - 17, statusW, 13);
  ctx.strokeStyle = "#8ac0b4";
  ctx.strokeRect(statusX + 0.5, portWaitButtonRect.y - 16.5, statusW - 1, 12);
  ctx.fillStyle = "#d6f2e8";
  drawPixelText(fitPixelText(status, PIXEL_FONT_SMALL_8, statusW - 8), SCREEN_W / 2, portWaitButtonRect.y - 14, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });

  const hovered = pointInRect(optionsMenu.hoverPoint, portWaitButtonRect);
  drawPiratePaperControl(portWaitButtonRect, { hovered, active: true });
  drawControlIconLabel(portWaitButtonRect, "RETURN TO PORT", "action:dock");
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
  const width = Math.min(190, measurePixelTextWidth(text, PIXEL_FONT_SMALL_8) + 12);
  const x = Math.round((SCREEN_W - width) / 2);
  const y = MOUNTAIN_DISCOVERY_PANEL_Y + MOUNTAIN_DISCOVERY_PANEL_H + 3;
  ctx.fillStyle = damageActive ? "rgba(93, 42, 43, 0.94)" : "rgba(38, 47, 58, 0.9)";
  ctx.fillRect(x, y, width, 13);
  ctx.strokeStyle = damageActive ? "#f68181" : "#8ac0b4";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 12);
  ctx.fillStyle = damageActive ? "#ffd2c6" : "#d6f2e8";
  drawPixelText(text, x + width / 2, y + 3, { font: PIXEL_FONT_SMALL_8, align: "center" });
}

function drawSurvivalMeters() {
  if (!gameState || !ship || gameOverReason) return;
  const status = survivalStatus(gameState);
  const hullFraction = ship.maxHitPoints > 0 ? ship.hitPoints / ship.maxHitPoints : 0;
  const hullColor = hullFraction <= 0.25
    ? "#f68181"
    : hullFraction <= 0.5
      ? "#f9c22b"
      : "#91db69";
  const x = SURVIVAL_PANEL_X;
  const y = SURVIVAL_PANEL_Y;
  drawPirateHudPanel({ x, y, w: SURVIVAL_PANEL_W, h: SURVIVAL_PANEL_H });
  ctx.fillStyle = PIRATE_MENU_INK;
  drawSurvivalPanelTitle(x, y);
  drawSurvivalMeterRow(
    "HULL",
    `${Math.max(0, Math.ceil(ship.hitPoints))}/${Math.ceil(ship.maxHitPoints)}`,
    hullFraction,
    hullColor,
    x + 5,
    y + 13
  );
  drawSurvivalMeterRow(
    "WTR",
    `${Math.ceil(status.freshWaterDays)}D`,
    status.freshWaterFraction,
    status.freshWaterFraction <= 0.16 ? "#f68181" : "#5bb7d6",
    x + 5,
    y + 23
  );
  drawSurvivalMeterRow(
    "FOOD",
    `${Math.floor(status.foodDays)}D`,
    status.foodFraction,
    status.foodDays <= 3 ? "#f68181" : "#d6b66b",
    x + 5,
    y + 33
  );
}

function drawSurvivalPanelTitle(x, y) {
  const title = shipLocalDateLabel(weatherClockMinutes, graph.lonDeg[ship.tileId]);
  const titleX = x + 5;
  const right = x + SURVIVAL_PANEL_W - 5;
  const availablePurseWidth = right - (titleX + measurePixelTextWidth(title, PIXEL_FONT_SMALL_8)) - 4;
  const amount = formatCompactNumber(gameState.doubloons);
  const purse = `DB ${amount}`;
  if (measurePixelTextWidth(purse, PIXEL_FONT_SMALL_8) > availablePurseWidth) {
    throw new Error(`Doubloon HUD value does not fit ship status title row: ${purse}`);
  }
  drawPixelText(title, titleX, y + 3, { font: PIXEL_FONT_SMALL_8 });
  drawPixelText(purse, right, y + 3, { font: PIXEL_FONT_SMALL_8, align: "right" });
}

function drawSurvivalMeterRow(label, value, fraction, fill, x, y) {
  const barX = x + 25;
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(label, barX - 4, y, {
    font: PIXEL_FONT_SMALL_8,
    align: "right"
  });
  const valueRight = SURVIVAL_PANEL_X + SURVIVAL_PANEL_W - 5;
  const valueLeft = valueRight - measurePixelTextWidth(value, PIXEL_FONT_SMALL_8);
  const barW = Math.max(8, Math.min(SURVIVAL_BAR_W, valueLeft - barX - 4));
  ctx.fillStyle = PIRATE_MENU_PAPER_INSET_ALT;
  ctx.fillRect(barX, y + 4, barW, SURVIVAL_BAR_H);
  ctx.fillStyle = fill;
  ctx.fillRect(barX, y + 4, Math.max(0, Math.round(barW * clamp(fraction, 0, 1))), SURVIVAL_BAR_H);
  ctx.strokeStyle = PIRATE_MENU_INK_MUTED;
  ctx.strokeRect(barX + 0.5, y + 3.5, barW - 1, SURVIVAL_BAR_H);
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(value, valueRight, y - 1, {
    font: PIXEL_FONT_SMALL_8,
    align: "right"
  });
}

function drawSurvivalNotice(nowMs) {
  if (!survivalNotice || nowMs >= survivalNotice.expiresAtMs) return;
  const width = Math.min(240, measurePixelTextWidth(survivalNotice.text, PIXEL_FONT_SMALL_8) + 12);
  const x = Math.round((SCREEN_W - width) / 2);
  const combatLayout = combatNoticeLayout(nowMs);
  const fishY = fishCatchNoticeY(nowMs);
  const y = Math.max(
    MOUNTAIN_DISCOVERY_PANEL_Y + MOUNTAIN_DISCOVERY_PANEL_H + 48,
    combatLayout ? combatLayout.y + combatLayout.h + 2 : 0,
    fishY === null ? 0 : fishY + 15
  );
  const warn = survivalNotice.tone === "warn";
  ctx.fillStyle = warn ? "rgba(80, 61, 42, 0.94)" : "rgba(31, 67, 70, 0.92)";
  ctx.fillRect(x, y, width, 13);
  ctx.strokeStyle = warn ? "#e3a857" : "#8ac0b4";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 12);
  ctx.fillStyle = warn ? "#ffe6a6" : "#d6f2e8";
  drawPixelText(fitPixelText(survivalNotice.text, PIXEL_FONT_SMALL_8, width - 10), x + width / 2, y + 3, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });
}

function drawCombatNotice(nowMs) {
  const layout = combatNoticeLayout(nowMs);
  if (!layout) return;
  ctx.fillStyle = "rgba(49, 54, 56, 0.94)";
  ctx.fillRect(layout.x, layout.y, layout.w, layout.h);
  ctx.strokeStyle = "#f9c22b";
  ctx.strokeRect(layout.x + 0.5, layout.y + 0.5, layout.w - 1, layout.h - 1);
  ctx.fillStyle = "#fbff86";
  for (let index = 0; index < layout.lines.length; index++) {
    drawPixelText(layout.lines[index], layout.x + layout.w / 2, layout.y + 3 + index * 9, {
      font: PIXEL_FONT_SMALL_8,
      align: "center"
    });
  }
}

function drawFishCatchNotice(nowMs) {
  if (!fishCatchNotice || nowMs >= fishCatchNotice.expiresAtMs) return;
  const width = Math.min(240, measurePixelTextWidth(fishCatchNotice.text, PIXEL_FONT_SMALL_8) + 12);
  const x = Math.round((SCREEN_W - width) / 2);
  const y = fishCatchNoticeY(nowMs);
  if (y === null) return;
  const warn = fishCatchNotice.tone === "warn";
  ctx.fillStyle = warn ? "rgba(80, 61, 42, 0.94)" : "rgba(31, 67, 70, 0.92)";
  ctx.fillRect(x, y, width, 13);
  ctx.strokeStyle = warn ? "#e3a857" : "#8ac0b4";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 12);
  ctx.fillStyle = warn ? "#ffe6a6" : "#d6f2e8";
  drawPixelText(fitPixelText(fishCatchNotice.text, PIXEL_FONT_SMALL_8, width - 10), x + width / 2, y + 3, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });
}

function combatNoticeLayout(nowMs) {
  if (!combatNotice || nowMs >= combatNotice.expiresAtMs) return null;
  const maxWidth = Math.min(360, SCREEN_W - 12);
  const lines = wrapPixelText(combatNotice.text, PIXEL_FONT_SMALL_8, maxWidth - 10, 3);
  const textWidth = Math.max(...lines.map((line) => measurePixelTextWidth(line, PIXEL_FONT_SMALL_8)));
  const w = Math.min(maxWidth, textWidth + 12);
  const h = 4 + lines.length * 9;
  return {
    x: Math.round((SCREEN_W - w) / 2),
    y: MOUNTAIN_DISCOVERY_PANEL_Y + MOUNTAIN_DISCOVERY_PANEL_H + 18,
    w,
    h,
    lines
  };
}

function fishCatchNoticeY(nowMs) {
  if (!fishCatchNotice || nowMs >= fishCatchNotice.expiresAtMs) return null;
  const baseY = MOUNTAIN_DISCOVERY_PANEL_Y + MOUNTAIN_DISCOVERY_PANEL_H + 33;
  const combatLayout = combatNoticeLayout(nowMs);
  return combatLayout ? Math.max(baseY, combatLayout.y + combatLayout.h + 2) : baseY;
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

  drawPiratePaperModal(panel, 0.82);

  if (SCREEN_W < 400) {
    drawCompactPlayerIntroModal(panel, character, modal, nowMs);
    return;
  }

  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  drawPixelText("CAPTAIN'S PAPERS", SCREEN_W / 2, panel.y + 10, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(
    fitPixelText(character.name.toUpperCase(), PIXEL_FONT_SMALL_8, panel.w - 32),
    SCREEN_W / 2,
    panel.y + 25,
    { font: PIXEL_FONT_SMALL_8, align: "center" }
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
  if (factionHasFlag(character.nationalityId)) {
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
  }

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
    ctx.fillStyle = PIRATE_MENU_INK_MUTED;
    drawPixelText(rows[i][0], detailX, y, { font: PIXEL_FONT_SMALL_8 });
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText(fitPixelText(rows[i][1], PIXEL_FONT_SMALL_8, detailW), detailX, y + 9, {
      font: PIXEL_FONT_SMALL_8
    });
  }

  const button = modal.buttonRect;
  drawPiratePaperInset(button, modal.hovered);
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText("BEGIN VOYAGE", button.x + button.w / 2, controlTextY(button), {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center"
  });
}

function drawCompactPlayerIntroModal(panel, character, modal, nowMs) {
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  drawPixelText("CAPTAIN'S PAPERS", SCREEN_W / 2, panel.y + 10, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(
    fitPixelText(character.name.toUpperCase(), PIXEL_FONT_SMALL_8, panel.w - 32),
    SCREEN_W / 2,
    panel.y + 25,
    { font: PIXEL_FONT_SMALL_8, align: "center" }
  );

  const portraitX = panel.x + 18;
  const portraitY = panel.y + 43;
  ctx.fillStyle = "#191f24";
  ctx.fillRect(portraitX - 3, portraitY - 3, DIALOGUE_PORTRAIT_SIZE + 6, DIALOGUE_PORTRAIT_SIZE + 6);
  ctx.strokeStyle = "#8ac0b4";
  ctx.strokeRect(portraitX - 2.5, portraitY - 2.5, DIALOGUE_PORTRAIT_SIZE + 5, DIALOGUE_PORTRAIT_SIZE + 5);
  drawDialoguePortrait(character, null, portraitX, portraitY);

  const flagX = portraitX + DIALOGUE_PORTRAIT_SIZE + 18;
  const flagY = portraitY + 12;
  const hasFlag = factionHasFlag(character.nationalityId);
  if (hasFlag) {
    ctx.fillStyle = "#4c3e24";
    ctx.fillRect(flagX - 2, flagY - 2, 2, DIALOGUE_FLAG_H + 8);
    drawWavingFactionFlag(
      character.nationalityId,
      flagX,
      flagY,
      DIALOGUE_FLAG_W,
      DIALOGUE_FLAG_H,
      flagWavePhase(nowMs, character.homePortTileId)
    );
  }
  const nationalityLabelY = hasFlag ? flagY + 29 : flagY;
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  drawPixelText("NATIONALITY", flagX, nationalityLabelY, { font: PIXEL_FONT_SMALL_8 });
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(
    fitPixelText(character.nationalityAdjective, PIXEL_FONT_SMALL_8, panel.w - 121),
    flagX,
    nationalityLabelY + 9,
    { font: PIXEL_FONT_SMALL_8 }
  );

  const rows = [
    ["HOME PORT", `${character.homePortName}, ${character.homePortRealmName || character.homePortCountry}`],
    ["BORN", `${character.birthDateLabel}  AGE ${character.age}`],
    ["SEX", character.sex.toUpperCase()],
    ["VESSEL", shipLabelForSlug(ship?.typeSlug || character.starterShipSlug)]
  ];
  const detailX = panel.x + 18;
  const detailW = panel.w - 36;
  rows.forEach((row, index) => {
    const y = panel.y + 122 + index * 31;
    ctx.fillStyle = PIRATE_MENU_INK_MUTED;
    drawPixelText(row[0], detailX, y, { font: PIXEL_FONT_SMALL_8 });
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText(fitPixelText(row[1], PIXEL_FONT_SMALL_8, detailW), detailX, y + 10, {
      font: PIXEL_FONT_SMALL_8
    });
  });

  const button = modal.buttonRect;
  drawPiratePaperInset(button, modal.hovered);
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText("BEGIN VOYAGE", button.x + button.w / 2, controlTextY(button), {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center"
  });
}

function drawCaptainAlertModal() {
  const modal = captainAlertModal;
  if (!modal) return;
  if (modal.kind === "sailing-help") {
    drawSailingHelpModal(modal);
    return;
  }
  const panel = {
    x: CAPTAIN_ALERT_PANEL_X,
    y: CAPTAIN_ALERT_PANEL_Y,
    w: CAPTAIN_ALERT_PANEL_W,
    h: CAPTAIN_ALERT_PANEL_H
  };

  drawPiratePaperModal(panel, 0.72);

  const portraitX = panel.x + 14;
  const portraitY = panel.y + 18;
  ctx.fillStyle = "#191f24";
  ctx.fillRect(portraitX - 3, portraitY - 3, DIALOGUE_PORTRAIT_SIZE + 6, DIALOGUE_PORTRAIT_SIZE + 6);
  ctx.strokeStyle = "#8ac0b4";
  ctx.strokeRect(portraitX - 2.5, portraitY - 2.5, DIALOGUE_PORTRAIT_SIZE + 5, DIALOGUE_PORTRAIT_SIZE + 5);
  drawDialoguePortrait(modal.character, modal.expressionId, portraitX, portraitY);

  const textX = panel.x + 93;
  const textW = panel.w - 110;
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  drawPixelText(fitPixelText((modal.character?.name || "Captain").toUpperCase(), PIXEL_FONT_SMALL_8, textW), textX, panel.y + 15, {
    font: PIXEL_FONT_SMALL_8
  });
  ctx.fillStyle = PIRATE_MENU_INK;
  let y = panel.y + 31;
  for (const line of wrapPixelText(modal.message.toUpperCase(), PIXEL_FONT_SMALL_8, textW, 4)) {
    drawPixelText(line, textX, y, { font: PIXEL_FONT_SMALL_8 });
    y += 10;
  }

  const button = modal.buttonRect;
  drawPiratePaperInset(button, modal.hovered);
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText("CONTINUE", button.x + button.w / 2, controlTextY(button), {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center"
  });
}

function drawSailingHelpModal(modal) {
  const panel = sailingHelpPanelRect();
  const page = modal.pages[modal.page];
  modal.buttonRect = sailingHelpButtonRect();

  drawPiratePaperModal(panel, 0.78);

  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText("SAILING BASICS", panel.x + 12, panel.y + 12, { font: PIXEL_FONT_DIALOGUE_8 });
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  drawPixelText(`${modal.page + 1}/${modal.pages.length}`, panel.x + panel.w - 12, panel.y + 13, {
    font: PIXEL_FONT_SMALL_8,
    align: "right"
  });
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  drawPixelText(page.title, panel.x + 12, panel.y + 29, { font: PIXEL_FONT_SMALL_8 });

  const diagram = {
    x: panel.x + 12,
    y: panel.y + 39,
    w: panel.w - 24,
    h: 70
  };
  drawSailingHelpDiagram(page.diagram, diagram, modal.inputMode);

  const bodyX = panel.x + 14;
  const bodyY = diagram.y + diagram.h + 9;
  const bodyW = panel.w - 28;
  const lineHeight = 10;
  const maxLines = Math.max(1, Math.floor((modal.buttonRect.y - bodyY - 5) / lineHeight));
  ctx.fillStyle = PIRATE_MENU_INK;
  const body = page.body.toUpperCase();
  const lines = wrapPixelText(body, PIXEL_FONT_SMALL_8, bodyW, maxLines);
  for (let index = 0; index < lines.length; index++) {
    drawPixelText(lines[index], bodyX, bodyY + index * lineHeight, { font: PIXEL_FONT_SMALL_8 });
  }

  const button = modal.buttonRect;
  drawPiratePaperInset(button, modal.hovered);
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(modal.page === modal.pages.length - 1 ? "TAKE THE HELM" : "NEXT", button.x + button.w / 2, controlTextY(button), {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center"
  });
}

function drawSailingHelpDiagram(kind, rect, inputMode) {
  drawTutorialTerrainField(rect, kind);
  ctx.strokeStyle = PIRATE_MENU_INK_MUTED;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  if (kind === "steer") drawSailingSteeringDiagram(rect, inputMode);
  else if (kind === "tack") drawSailingTackingDiagram(rect);
  else if (kind === "haul") drawSailingHaulingDiagram(rect);
  else throw new Error(`Unknown sailing tutorial diagram: ${kind}`);
}

function drawTutorialTerrainField(rect, diagram) {
  const inner = { x: rect.x + 1, y: rect.y + 1, w: rect.w - 2, h: rect.h - 2 };
  const rowCount = Math.ceil(inner.h / 18) + 1;
  const columnCount = Math.ceil(inner.w / 24) + 1;
  const cells = [];
  const cellByGridPosition = new Map();

  for (let rowIndex = -1; rowIndex <= rowCount; rowIndex++) {
    const y = inner.y + rowIndex * 18 + 9;
    for (let columnIndex = -1; columnIndex <= columnCount; columnIndex++) {
      const x = inner.x + columnIndex * 24 + (rowIndex & 1 ? 12 : 0) + 10;
      const id = 900000 + (rowIndex + 2) * 128 + columnIndex + 2;
      const terrainRow = tutorialTerrainRow(x, y, diagram, inner);
      const cell = {
        id,
        rowIndex,
        columnIndex,
        x,
        y,
        terrainRow,
        level: tutorialTerrainLevel(terrainRow)
      };
      cells.push(cell);
      cellByGridPosition.set(`${rowIndex},${columnIndex}`, cell);
    }
  }

  const faceCalls = [];
  for (const cell of cells) {
    addTutorialTerrainFace(faceCalls, cell, cellByGridPosition.get(`${cell.rowIndex},${cell.columnIndex + 1}`));
    const lowerColumns = (cell.rowIndex & 1) === 0
      ? [cell.columnIndex - 1, cell.columnIndex]
      : [cell.columnIndex, cell.columnIndex + 1];
    for (const lowerColumn of lowerColumns) {
      addTutorialTerrainFace(faceCalls, cell, cellByGridPosition.get(`${cell.rowIndex + 1},${lowerColumn}`));
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();
  ctx.fillStyle = terrainColorForTile({ t: "water", waterDepthBand: 2, latitudeDeg: 35 }, 899999);
  ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  const tutorialChart = { tileById: new Map() };
  drawTerrainConnectorFaces(faceCalls, tutorialChart, { waveClockMs: lastFrameMs });
  for (const cell of cells) {
    ctx.drawImage(
      terrainImageForTile(cell.terrainRow, cell.id),
      cell.x - TILE_ART_HALF,
      cell.y - TILE_ART_HALF
    );
  }
  ctx.restore();
}

function tutorialTerrainRow(x, y, diagram, rect) {
  const kind = sailingTutorialTerrainKind(
    diagram,
    (x - rect.x) / rect.w,
    (y - rect.y) / rect.h
  );
  if (kind === "land") return { t: "land", e: 0, h: 0, latitudeDeg: 35 };
  if (kind === "coastal-water") return { t: "beach", e: -0.1, h: 0, latitudeDeg: 35 };
  if (kind === "deep-water") return { t: "water", e: -0.2, h: 0, waterDepthBand: 2, latitudeDeg: 35 };
  throw new Error(`Unknown sailing tutorial terrain kind: ${kind}`);
}

function tutorialTerrainLevel(row) {
  if (row.t === "water") return -2;
  if (row.t === "beach") return -1;
  if (row.t === "land") return 0;
  throw new Error(`Unknown tutorial terrain: ${row.t}`);
}

function addTutorialTerrainFace(faceCalls, a, b) {
  if (!b) return;
  faceCalls.push(makeFaceCall({
    a: a.id,
    b: b.id,
    ax: a.x,
    ay: a.y,
    aSortY: a.y,
    bx: b.x,
    by: b.y,
    bSortY: b.y,
    row: a.terrainRow,
    nrow: b.terrainRow,
    level: a.level,
    nlevel: b.level
  }));
}

function drawSailingSteeringDiagram(rect, inputMode) {
  const cx = Math.round(rect.x + rect.w * 0.52);
  const cy = Math.round(rect.y + rect.h * 0.56);
  const targetX = Math.round(rect.x + rect.w * 0.75);
  const targetY = Math.round(rect.y + rect.h * 0.24);
  drawTutorialShip(cx, cy, { x: targetX - cx, y: targetY - cy });
  drawTutorialArrow(cx + 7, cy - 7, targetX, targetY, "#f9c22b");
  const modeLabel = inputMode === "keyboard"
    ? "PRESS + HOLD"
    : inputMode === "controller"
      ? "TILT + HOLD"
      : inputMode === "touch"
      ? "TOUCH + HOLD"
        : "CLICK + HOLD";
  drawTutorialLabel(modeLabel, rect.x + 7, rect.y + 6);
  drawTutorialLabel("TURN THE BOW", rect.x + 7, rect.y + rect.h - 14);
  ctx.fillStyle = "#f9c22b";
  ctx.fillRect(targetX - 2, targetY - 2, 5, 5);
}

function drawSailingTackingDiagram(rect) {
  const windX = rect.x + 27;
  drawTutorialArrow(windX, rect.y + 13, windX, rect.y + 54, "#8ac0b4");
  drawTutorialLabel("WIND", rect.x + 7, rect.y + 6);

  const shipX = Math.round(rect.x + rect.w * 0.56);
  const shipY = rect.y + rect.h - 11;
  drawShipWindV({
    centerX: shipX,
    centerY: shipY,
    flowDirectionRad: -Math.PI / 2,
    deadZoneHalfAngleRad: ship.stats.upwindStallAngleRad,
    strength: 0.9,
    warning: 1,
    nowMs: lastFrameMs
  });
  drawTutorialLabel("NO-GO", shipX - 15, rect.y + 5);

  const tackPoints = [
    { x: shipX, y: shipY },
    { x: shipX - 43, y: shipY - 18 },
    { x: shipX + 42, y: shipY - 36 },
    { x: shipX + 7, y: rect.y + 7 }
  ];
  for (let index = 1; index < tackPoints.length; index++) {
    const from = tackPoints[index - 1];
    const to = tackPoints[index];
    drawPixelLine(from.x, from.y, to.x, to.y, "#f9c22b");
  }
  drawTutorialShip(shipX, shipY, {
    x: tackPoints[1].x - shipX,
    y: tackPoints[1].y - shipY
  });
  drawTutorialLabel("TACK", rect.x + rect.w - 39, rect.y + rect.h - 14);
}

function drawSailingHaulingDiagram(rect) {
  const shipX = rect.x + Math.round(rect.w * 0.4);
  const shipY = rect.y + Math.round(rect.h * 0.56);
  const targetX = rect.x + Math.round(rect.w * 0.78);
  drawTutorialShip(shipX, shipY, { x: 1, y: 0 });
  drawShipWindV({
    centerX: shipX,
    centerY: shipY,
    flowDirectionRad: Math.PI,
    deadZoneHalfAngleRad: ship.stats.upwindStallAngleRad,
    strength: 0.9,
    warning: 1,
    nowMs: lastFrameMs
  });
  drawTutorialArrow(shipX + 20, shipY - 17, shipX - 25, shipY - 17, "#9ee2d3");
  drawTutorialArrow(shipX + 7, shipY, targetX, shipY, "#f9c22b");
  drawTutorialLabel("WIND", shipX + 22, shipY - 25);
  drawTutorialLabel("HAUL", rect.x + Math.round(rect.w * 0.59), shipY - 14);
  drawTutorialLabel("OPEN WATER", rect.x + rect.w - 86, rect.y + 6);
}

function drawTutorialShip(x, y, heading) {
  if (!shipImage) throw new Error("Sailing tutorial requires loaded player ship art");
  const length = Math.hypot(heading.x, heading.y);
  if (!(length > 0)) throw new Error("Sailing tutorial ship requires a heading");
  const frame = headingFrameForScreenHeading({ x: heading.x / length, y: heading.y / length });
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawLakeBattleSpriteFrame(
    shipImage,
    frame,
    x - Math.floor(SHIP_SHEET_FRAME_SIZE / 2),
    y - Math.floor(SHIP_SHEET_FRAME_SIZE / 2)
  );
  ctx.restore();
}

function drawTutorialLabel(text, x, y) {
  const width = measurePixelTextWidth(text, PIXEL_FONT_SMALL_8) + 6;
  ctx.fillStyle = "rgba(234, 216, 178, 0.9)";
  ctx.fillRect(Math.round(x), Math.round(y), width, 11);
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(text, Math.round(x) + 3, Math.round(y) + 2, { font: PIXEL_FONT_SMALL_8 });
}

function drawTutorialArrow(fromX, fromY, toX, toY, color) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const wing = 5;
  const startX = Math.round(fromX);
  const startY = Math.round(fromY);
  const endX = Math.round(toX);
  const endY = Math.round(toY);
  const wingAX = Math.round(toX - Math.cos(angle - Math.PI / 4) * wing);
  const wingAY = Math.round(toY - Math.sin(angle - Math.PI / 4) * wing);
  const wingBX = Math.round(toX - Math.cos(angle + Math.PI / 4) * wing);
  const wingBY = Math.round(toY - Math.sin(angle + Math.PI / 4) * wing);
  drawPixelLine(startX, startY, endX, endY, color);
  drawPixelLine(endX, endY, wingAX, wingAY, color);
  drawPixelLine(endX, endY, wingBX, wingBY, color);
}

function drawGameOverOverlay(nowMs) {
  const state = gameOverState;
  if (!state) return;
  if (state.outcomeType === "victory") {
    drawVictoryStatsScreen(state, gameOverElapsedMs(nowMs));
    return;
  }
  const transitionDuration = gameOverTransitionDurationMs();
  const transitionElapsed = gameOverElapsedMs(nowMs);
  if (transitionElapsed < transitionDuration) {
    const shade = smoothstep(0, transitionDuration, transitionElapsed) * 0.16;
    ctx.fillStyle = `rgba(13, 14, 17, ${shade})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    return;
  }
  const elapsed = transitionElapsed - transitionDuration;
  const fade = smoothstep(GAME_OVER_MEMORIAL_MS, GAME_OVER_MEMORIAL_MS + GAME_OVER_FADE_MS, elapsed);

  if (fade < 1) drawGameOverMemorial(state, fade);

  ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  if (fade >= 1) drawGameOverStatsScreen(state);
}

function drawVictoryStatsScreen(state, elapsedMs) {
  drawPiratePaperPanel({ x: 0, y: 0, w: SCREEN_W, h: SCREEN_H });
  const victory = state.victory;
  if (!victory) throw new Error("Victory screen requires a campaign victory summary");
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(victory.title, SCREEN_W / 2, 14, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center"
  });
  ctx.fillStyle = PIRATE_MENU_CHART_LINE;
  drawPixelText(gameState.memory.campaignGoal.type === CAMPAIGN_GOAL_EXPLORER ? "EXPLORER'S VICTORY" : "A DEBT REPAID", SCREEN_W / 2, 29, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });
  const legacyLines = wrapPixelText(victory.legacy.toUpperCase(), PIXEL_FONT_SMALL_8, SCREEN_W - 48, 5);
  ctx.fillStyle = PIRATE_MENU_INK;
  legacyLines.forEach((line, index) => {
    drawPixelText(line, SCREEN_W / 2, 46 + index * 10, {
      font: PIXEL_FONT_SMALL_8,
      align: "center"
    });
  });

  const rows = [
    ["FINAL VESSEL", state.vessel],
    ["DAYS AT SEA", String(state.stats.daysAtSea)],
    ["DISCOVERIES", String(state.stats.discoveries)],
    ["PORTS VISITED", String(state.stats.visitedPorts)],
    ["QUESTS COMPLETED", String(state.stats.completedQuests)],
    ["WORLD MAPPED", `${state.stats.mappedPercent.toFixed(2)}%`],
    ["DOUBLOONS EARNED", formatDoubloons(state.stats.doubloonsEarned)],
    ["FINAL DOUBLOONS", formatDoubloons(state.stats.endingDoubloons)]
  ];
  const startY = 105;
  rows.forEach(([label, value], index) => {
    const y = startY + index * 13;
    ctx.fillStyle = PIRATE_MENU_INK_MUTED;
    drawPixelText(label, 48, y, { font: PIXEL_FONT_SMALL_8 });
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText(fitPixelText(value, PIXEL_FONT_SMALL_8, 210), SCREEN_W - 48, y, {
      font: PIXEL_FONT_SMALL_8,
      align: "right"
    });
  });
  if (elapsedMs >= 900) {
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText("PRESS ANY KEY TO RETURN TO START MENU", SCREEN_W / 2, SCREEN_H - 16, {
      font: PIXEL_FONT_SMALL_8,
      align: "center"
    });
  }
}

function drawGameOverMemorial(state, fade) {
  const panel = {
    x: GAME_OVER_PANEL_X,
    y: GAME_OVER_PANEL_Y,
    w: GAME_OVER_PANEL_W,
    h: GAME_OVER_PANEL_H
  };
  drawPiratePaperModal(panel, 0.78);

  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText("LOST AT SEA", SCREEN_W / 2, panel.y + 11, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });

  const portraitX = panel.x + 18;
  const portraitY = panel.y + 40;
  ctx.fillStyle = "#111418";
  ctx.fillRect(portraitX - 3, portraitY - 3, DIALOGUE_PORTRAIT_SIZE + 6, DIALOGUE_PORTRAIT_SIZE + 6);
  ctx.strokeStyle = "#7f8890";
  ctx.strokeRect(portraitX - 2.5, portraitY - 2.5, DIALOGUE_PORTRAIT_SIZE + 5, DIALOGUE_PORTRAIT_SIZE + 5);
  drawDialoguePortrait(state.character, "sad", portraitX, portraitY, { grayscale: true });

  const textX = panel.x + 104;
  const textW = panel.w - 122;
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText(
    fitPixelText((state.character?.name || "The captain").toUpperCase(), PIXEL_FONT_SMALL_8, textW),
    textX,
    panel.y + 42,
    { font: PIXEL_FONT_SMALL_8 }
  );
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  drawPixelText("WAS NEVER SEEN AGAIN.", textX, panel.y + 55, { font: PIXEL_FONT_SMALL_8 });

  const rows = [
    ["BORN", state.character?.birthDateLabel || "--"],
    ["DIED", state.deathDateLabel],
    ["HOME", state.character ? `${state.character.homePortName}, ${state.character.homePortRealmName}` : "--"],
    ["CAUSE", state.reason]
  ];
  for (let i = 0; i < rows.length; i++) {
    const y = panel.y + 76 + i * 21;
    ctx.fillStyle = PIRATE_MENU_INK_MUTED;
    drawPixelText(rows[i][0], textX, y, { font: PIXEL_FONT_SMALL_8 });
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText(fitPixelText(rows[i][1], PIXEL_FONT_SMALL_8, textW), textX, y + 9, {
      font: PIXEL_FONT_SMALL_8
    });
  }

  if (fade > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${fade * 0.35})`;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  }
}

function drawGameOverStatsScreen(state) {
  drawPiratePaperPanel({ x: 0, y: 0, w: SCREEN_W, h: SCREEN_H });
  const name = state.character?.name || "The captain";
  const epitaph = `${name} WAS NEVER SEEN AGAIN.`.toUpperCase();
  const layout = gameOverStatsLayout({
    screenWidth: SCREEN_W,
    screenHeight: SCREEN_H,
    epitaph,
    cause: state.reason.toUpperCase(),
    rows: gameOverStatRows(state),
    measureText: (text) => measurePixelTextWidth(text, PIXEL_FONT_SMALL_8)
  });
  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText("VOYAGE ENDED", SCREEN_W / 2, 22, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  layout.epitaphLines.forEach((line, index) => {
    drawPixelText(line, SCREEN_W / 2, layout.epitaphY + index * 10, {
      font: PIXEL_FONT_SMALL_8,
      align: "center"
    });
  });
  ctx.fillStyle = PIRATE_MENU_INK;
  layout.causeLines.forEach((line, index) => {
    drawPixelText(line, SCREEN_W / 2, layout.causeY + index * 10, {
      font: PIXEL_FONT_SMALL_8,
      align: "center"
    });
  });

  for (const row of layout.rows) {
    ctx.fillStyle = PIRATE_MENU_INK_MUTED;
    drawPixelText(row.label, row.labelX, row.labelY, { font: PIXEL_FONT_SMALL_8 });
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText(row.value, row.valueX, row.valueY, {
      font: PIXEL_FONT_SMALL_8,
      align: "right"
    });
  }

  ctx.fillStyle = PIRATE_MENU_INK;
  drawPixelText("PRESS ANY KEY TO RETURN TO START MENU", SCREEN_W / 2, layout.promptY, {
    font: PIXEL_FONT_SMALL_8,
    align: "center"
  });
}

function gameOverStatRows(state) {
  const stats = state.stats;
  return [
    ["BORN", state.character?.birthDateLabel || "--"],
    ["DIED", state.deathDateLabel],
    ["DAYS AT SEA", String(stats.daysAtSea)],
    ["LAST POSITION", formatLatLon(stats.latitude, stats.longitude)],
    ["DISCOVERIES", String(stats.discoveries)],
    ["PORTS VISITED", String(stats.visitedPorts)],
    ["QUESTS COMPLETED", String(stats.completedQuests)],
    ["DOUBLOONS EARNED", formatDoubloons(stats.doubloonsEarned)],
    ["LETTERS", String(stats.lettersOfMarque)],
    ["CARGO", `${stats.cargo}/${stats.cargoCapacity}`],
    ["DOUBLOONS", String(stats.doubloons)]
  ];
}

function formatLatLon(lat, lon) {
  return `${formatCoordinate(lat, "N", "S")} ${formatCoordinate(lon, "E", "W")}`;
}

function formatCoordinate(value, positiveSuffix, negativeSuffix) {
  const suffix = value < 0 ? negativeSuffix : positiveSuffix;
  return `${Math.abs(value).toFixed(1)}${suffix}`;
}

function drawDialogueOverlay(nowMs) {
  const subject = currentDialogueSubject();
  const view = currentDialogueView();
  if (view.presentation?.kind === "shipyard" || view.presentation?.kind === "ship-capture") {
    drawVesselDecisionDialogueOverlay(view);
    return;
  }
  const dialogueFont = PIXEL_FONT_DIALOGUE_8;
  const dialogueLineHeight = 12;
  const portFaction = dialogueState.kind === "port" ? factionById(subject.factionId) : null;
  const portGreeting = dialogueState.kind === "port" && dialogueState.nodeId === "greeting";
  const panelX = 6;
  const panelW = SCREEN_W - 12;
  const textXOffset = 12;
  const optionW = panelW - textXOffset - 12;
  const factionBlockW = Math.min(DIALOGUE_FACTION_BLOCK_W, Math.max(88, Math.floor(panelW * 0.4)));
  const factionBlockX = panelX + panelW - factionBlockW - 8;
  const bodyTextW = portFaction && !portGreeting
    ? factionBlockX - (panelX + textXOffset) - 8
    : optionW;
  const textYOffset = portGreeting ? 52 : 25;
  const optionHeight = dialogueOptionsHeight(view, dialogueFont, optionW);
  const maximumPanelHeight = SCREEN_H - 13;
  const feedbackReserve = view.feedback ? dialogueLineHeight * 2 : 0;
  const bodyLineLimit = Math.max(1, Math.floor(
    (maximumPanelHeight - textYOffset - optionHeight - feedbackReserve - 14) / dialogueLineHeight
  ));
  let bodyLines = wrapPixelText(view.text, dialogueFont, bodyTextW, bodyLineLimit);
  let feedbackLines = view.feedback
    ? wrapPixelText(view.feedback, dialogueFont, bodyTextW, 2)
    : [];
  const bodyEndOffset = textYOffset + (bodyLines.length + feedbackLines.length) * dialogueLineHeight;
  const optionYOffset = portGreeting ? bodyEndOffset + 5 : Math.max(64, bodyEndOffset + 5);
  const contentHeight = optionYOffset + view.options.length * optionHeight + 9;
  const geometry = dialoguePanelGeometry({
    screenWidth: SCREEN_W,
    screenHeight: SCREEN_H,
    contentHeight
  });
  const panel = geometry.panel;
  const optionBottom = panel.y + panel.h - 9;
  const safeOptions = dialogueOptionLayout({
    desiredY: panel.y + optionYOffset,
    bottom: optionBottom,
    optionHeight,
    optionCount: view.options.length
  });
  const textLineCapacity = Math.max(
    0,
    Math.floor((safeOptions.y - 5 - (panel.y + textYOffset)) / dialogueLineHeight)
  );
  if (bodyLines.length + feedbackLines.length > textLineCapacity) {
    const feedbackLimit = Math.min(feedbackLines.length, Math.max(0, textLineCapacity - 1));
    const bodyLimit = Math.max(0, textLineCapacity - feedbackLimit);
    bodyLines = bodyLimit > 0 ? wrapPixelText(view.text, dialogueFont, bodyTextW, bodyLimit) : [];
    feedbackLines = feedbackLimit > 0
      ? wrapPixelText(view.feedback, dialogueFont, bodyTextW, feedbackLimit)
      : [];
  }

  drawDialoguePortrait(
    subject.character,
    view.expressionId,
    geometry.portrait.x,
    geometry.portrait.y
  );

  drawPiratePaperPanel(panel);
  ctx.strokeStyle = PIRATE_MENU_INK;
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1);
  ctx.strokeStyle = PIRATE_MENU_CHART_LINE;
  ctx.strokeRect(panel.x + 3.5, panel.y + 3.5, panel.w - 7, panel.h - 7);

  ctx.fillStyle = PIRATE_MENU_INK;
  const speakerW = portFaction ? factionBlockX - panel.x - 16 : panel.w - 18;
  const speakerLines = portGreeting && SCREEN_H > SCREEN_W
    ? wrapPixelText(view.speaker, dialogueFont, speakerW, 2)
    : [fitPixelText(view.speaker, dialogueFont, speakerW)];
  speakerLines.forEach((line, index) => {
    drawPixelText(fitPixelText(line, dialogueFont, speakerW), panel.x + 8, panel.y + 8 + index * dialogueLineHeight, {
      font: dialogueFont
    });
  });

  if (portFaction) drawDialogueFactionFlag(portFaction, panel, nowMs, subject, factionBlockW);

  const textX = panel.x + 12;
  let y = panel.y + textYOffset;
  ctx.fillStyle = PIRATE_MENU_INK;
  for (const line of bodyLines) {
    drawPixelText(line, textX, y, { font: dialogueFont });
    y += dialogueLineHeight;
  }
  if (view.feedback) {
    ctx.fillStyle = PIRATE_MENU_SUCCESS;
    for (const line of feedbackLines) {
      drawPixelText(line, textX, y, { font: dialogueFont });
      y += dialogueLineHeight;
    }
  }

  const optionX = textX;
  drawDialogueOptions(view, optionX, safeOptions.y, optionW, optionBottom, dialogueFont);
}

function drawVesselDecisionDialogueOverlay(dialogueView) {
  const presentation = dialogueView.presentation;
  const shipyard = presentation.kind === "shipyard";
  const listing = shipyard ? presentation.listing : null;
  const candidateSlug = shipyard ? listing.shipSlug : presentation.candidateShipSlug;
  const vessel = createShipyardShipView(candidateSlug);
  const comparison = shipyard
    ? null
    : createShipComparisonView(presentation.currentShipSlug, candidateSlug);
  ensureShipyardSideViewLoaded(candidateSlug);
  const panel = { x: 6, y: 6, w: SCREEN_W - 12, h: SCREEN_H - 12 };
  const compact = SCREEN_H > SCREEN_W;
  const optionWidth = panel.w - 18;
  const optionHeight = dialogueOptionsHeight(dialogueView, PIXEL_FONT_DIALOGUE_8, optionWidth);
  const optionY = panel.y + panel.h - dialogueView.options.length * optionHeight - 7;

  drawPiratePaperModal(panel, 0.9);

  drawOptionsText(shipyard ? "SHIPYARD / NEW VESSEL" : "SURRENDERED PRIZE", panel.x + panel.w / 2, panel.y + 9, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center",
    color: PIRATE_MENU_INK_MUTED
  });
  drawOptionsText(fitPixelText(vessel.label.toUpperCase(), PIXEL_FONT_DIALOGUE_8, panel.w - 76), panel.x + panel.w / 2, panel.y + 22, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center",
    color: PIRATE_MENU_INK
  });

  const artX = compact
    ? panel.x + Math.floor((panel.w - SHIP_INFO_SIDE_VIEW_W) / 2)
    : panel.x + 10;
  const artY = compact ? panel.y + 40 : panel.y + 38;
  ctx.fillStyle = "#323353";
  ctx.fillRect(artX, artY, SHIP_INFO_SIDE_VIEW_W, SHIP_INFO_SIDE_VIEW_H);
  ctx.strokeStyle = "#7f708a";
  ctx.strokeRect(artX + 0.5, artY + 0.5, SHIP_INFO_SIDE_VIEW_W - 1, SHIP_INFO_SIDE_VIEW_H - 1);
  const sideView = shipInfoImages.get(vessel.slug);
  if (sideView) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sideView, artX, artY);
  } else {
    drawOptionsText("LOADING SHIP...", artX + SHIP_INFO_SIDE_VIEW_W / 2, artY + 48, {
      align: "center",
      color: "#9babb2"
    });
  }

  if (compact) {
    if (shipyard) drawCompactShipyardStats(panel, vessel, listing, artY);
    else drawCompactShipCaptureStats(panel, comparison, presentation, artY);
  } else if (shipyard) {
    drawLandscapeShipyardStats(panel, vessel, listing);
  } else {
    drawLandscapeShipCaptureStats(panel, comparison, presentation);
  }
  drawVesselDecisionStatus(dialogueView, panel, optionY);

  drawDialogueOptions(
    dialogueView,
    panel.x + 9,
    optionY,
    optionWidth,
    panel.y + panel.h - 6,
    PIXEL_FONT_DIALOGUE_8
  );
}

function drawLandscapeShipyardStats(panel, vessel, listing) {
  const statsX = panel.x + 214;
  const valueX = panel.x + panel.w - 12;
  drawShipInfoValueRow("HULL", `${vessel.hull}`, statsX, valueX, panel.y + 40);
  drawShipInfoValueRow(
    `CREW / ${vessel.armamentLabel}`,
    `${vessel.crewCapacity} / ${vessel.armamentSummary}`,
    statsX,
    valueX,
    panel.y + 52
  );
  drawShipInfoValueRow("CARGO HOLD", `${vessel.cargoCapacity}`, statsX, valueX, panel.y + 64);
  drawShipInfoValueRow("PROPULSION", vessel.propulsionSummary, statsX, valueX, panel.y + 76);
  drawShipInfoRating("SPEED", vessel.ratings.speed, statsX, panel.y + 92);
  drawShipInfoRating("ACCEL", vessel.ratings.acceleration, statsX, panel.y + 104);
  drawShipInfoRating("TURNING", vessel.ratings.turning, statsX, panel.y + 116);
  drawShipInfoRating("WINDWARD", vessel.ratings.windward, statsX, panel.y + 128);
  drawShipInfoRating("SEAWORTHY", vessel.seaworthiness, statsX, panel.y + 140);
  drawOptionsText(`${listing.price} DOUBLOONS`, panel.x + 12, panel.y + 149, {
    font: PIXEL_FONT_DIALOGUE_8,
    color: PIRATE_MENU_INK
  });
  drawOptionsText(`PURSE ${gameState.doubloons}`, panel.x + 12, panel.y + 163, {
    font: PIXEL_FONT_DIALOGUE_8,
    color: gameState.doubloons >= listing.price ? "#91db69" : "#f68181"
  });
}

function drawCompactShipyardStats(panel, vessel, listing, artY) {
  drawOptionsText(`${listing.price} DOUBLOONS`, panel.x + panel.w / 2, artY + SHIP_INFO_SIDE_VIEW_H + 8, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center",
    color: PIRATE_MENU_INK
  });
  drawOptionsText(`PURSE ${gameState.doubloons}`, panel.x + panel.w / 2, artY + SHIP_INFO_SIDE_VIEW_H + 22, {
    font: PIXEL_FONT_DIALOGUE_8,
    align: "center",
    color: gameState.doubloons >= listing.price ? "#91db69" : "#f68181"
  });
  const statsX = panel.x + 12;
  const valueX = panel.x + panel.w - 12;
  let y = artY + SHIP_INFO_SIDE_VIEW_H + 43;
  drawShipInfoValueRow("HULL", `${vessel.hull}`, statsX, valueX, y);
  drawShipInfoValueRow(
    `CREW / ${vessel.armamentLabel}`,
    `${vessel.crewCapacity} / ${vessel.armamentSummary}`,
    statsX,
    valueX,
    y + 12
  );
  drawShipInfoValueRow("CARGO HOLD", `${vessel.cargoCapacity}`, statsX, valueX, y + 24);
  drawShipInfoValueRow("PROPULSION", vessel.propulsionSummary, statsX, valueX, y + 36);
  y += 56;
  drawShipInfoRating("SPEED", vessel.ratings.speed, statsX, y);
  drawShipInfoRating("ACCEL", vessel.ratings.acceleration, statsX, y + 12);
  drawShipInfoRating("TURNING", vessel.ratings.turning, statsX, y + 24);
  drawShipInfoRating("WINDWARD", vessel.ratings.windward, statsX, y + 36);
  drawShipInfoRating("SEAWORTHY", vessel.seaworthiness, statsX, y + 48);
}

function drawLandscapeShipCaptureStats(panel, comparison, presentation) {
  drawShipCaptureComparison(
    comparison,
    presentation,
    panel.x + 214,
    panel.x + panel.w - 12,
    panel.y + 40
  );
}

function drawCompactShipCaptureStats(panel, comparison, presentation, artY) {
  drawShipCaptureComparison(
    comparison,
    presentation,
    panel.x + 12,
    panel.x + panel.w - 12,
    artY + SHIP_INFO_SIDE_VIEW_H + 9
  );
}

function drawShipCaptureComparison(comparison, presentation, x, valueX, y) {
  const candidateX = valueX - 72;
  drawOptionsText("PRIZE", candidateX, y, {
    font: PIXEL_FONT_SMALL_8,
    align: "right",
    color: PIRATE_MENU_INK
  });
  drawOptionsText("CURRENT", valueX, y, {
    font: PIXEL_FONT_SMALL_8,
    align: "right",
    color: PIRATE_MENU_INK_MUTED
  });
  y += 12;

  const hullMetric = comparison.metrics.find((metric) => metric.id === "hull");
  if (!hullMetric) throw new Error("Ship comparison is missing hull metrics");
  drawShipComparisonRow(
    "HULL",
    `${presentation.candidateHitPoints}/${presentation.candidateMaxHitPoints}`,
    `${presentation.currentHitPoints}/${presentation.currentMaxHitPoints}`,
    hullMetric.difference,
    x,
    candidateX,
    valueX,
    y
  );
  y += 12;

  const armamentDifference = comparison.candidate.maxCannons - comparison.current.maxCannons;
  drawShipComparisonRow(
    "ARMAMENT",
    `${comparison.candidate.armamentLabel} ${comparison.candidate.armamentSummary}`,
    `${comparison.current.armamentLabel} ${comparison.current.armamentSummary}`,
    armamentDifference,
    x,
    candidateX,
    valueX,
    y
  );
  y += 12;

  for (const metric of comparison.metrics.filter((entry) => entry.id !== "hull")) {
    drawShipComparisonRow(
      metric.label,
      String(metric.candidate),
      String(metric.current),
      metric.difference,
      x,
      candidateX,
      valueX,
      y
    );
    y += 12;
  }
}

function drawShipComparisonRow(label, candidate, current, difference, x, candidateX, currentX, y) {
  drawOptionsText(label, x, y, {
    font: PIXEL_FONT_SMALL_8,
    color: PIRATE_MENU_INK
  });
  const candidateText = difference === 0
    ? candidate
    : `${candidate} ${difference > 0 ? "+" : ""}${difference}`;
  drawOptionsText(fitPixelText(candidateText, PIXEL_FONT_SMALL_8, 88), candidateX, y, {
    font: PIXEL_FONT_SMALL_8,
    align: "right",
    color: shipComparisonDifferenceColor(difference)
  });
  drawOptionsText(fitPixelText(current, PIXEL_FONT_SMALL_8, 65), currentX, y, {
    font: PIXEL_FONT_SMALL_8,
    align: "right",
    color: PIRATE_MENU_INK_MUTED
  });
}

function shipComparisonDifferenceColor(difference) {
  if (difference > 0) return PIRATE_MENU_SUCCESS;
  if (difference < 0) return PIRATE_MENU_DANGER;
  return PIRATE_MENU_INK_MUTED;
}

function drawVesselDecisionStatus(dialogueView, panel, optionY) {
  const status = dialogueView.feedback || dialogueView.text;
  const lines = wrapPixelText(status.toUpperCase(), PIXEL_FONT_SMALL_8, panel.w - 20, 2);
  const startY = optionY - lines.length * 10 - 2;
  lines.forEach((line, index) => {
    drawOptionsText(line, panel.x + 10, startY + index * 10, {
      font: PIXEL_FONT_SMALL_8,
      color: dialogueView.feedback ? PIRATE_MENU_SUCCESS : PIRATE_MENU_INK_MUTED
    });
  });
}

function ensureShipyardSideViewLoaded(slug) {
  if (shipInfoImages.has(slug) || shipInfoImagePromises.has(slug)) return;
  void loadShipInfoImage(slug).then(() => {
    dirty = true;
  }).catch((error) => {
    console.error(new Error(`Failed to load shipyard side view for ${shipLabelForSlug(slug)}`, { cause: error }));
    dirty = true;
  });
}

function drawDialogueFactionFlag(faction, panel, nowMs, city, factionBlockW) {
  const flagX = panel.x + panel.w - DIALOGUE_FLAG_W - 10;
  const flagY = panel.y + 8;
  const hasFlag = factionHasFlag(faction.id);
  if (hasFlag) {
    ctx.fillStyle = "#4c3e24";
    ctx.fillRect(flagX - 1, flagY - 1, 1, DIALOGUE_FLAG_H + 2);
    drawWavingFactionFlag(
      faction.id,
      flagX,
      flagY,
      DIALOGUE_FLAG_W,
      DIALOGUE_FLAG_H,
      flagWavePhase(nowMs, city.tileId)
    );
  }
  const label = fitPixelText(faction.name.toUpperCase(), PIXEL_FONT_SMALL_8, factionBlockW);
  ctx.fillStyle = PIRATE_MENU_INK_MUTED;
  drawPixelText(label, panel.x + panel.w - 10, hasFlag ? flagY + DIALOGUE_FLAG_H + 3 : flagY, {
    font: PIXEL_FONT_SMALL_8,
    align: "right"
  });
  if (city.isFactionCapital) {
    ctx.fillStyle = PIRATE_MENU_INK;
    drawPixelText("CAPITAL", panel.x + panel.w - 10, flagY + DIALOGUE_FLAG_H + 13, {
      font: PIXEL_FONT_SMALL_8,
      align: "right"
    });
  }
}

function drawDialoguePortrait(character, expressionId, x, y, options = {}) {
  if (!character) return;
  const expression = characterExpression(character, expressionId || "neutral");
  const image = dialoguePortraitImage(character, expression);
  if (!image) return;
  const source = options.grayscale ? grayscalePortraitCanvas(image) : image;
  ctx.drawImage(source, x, y);
}

function grayscalePortraitCanvas(source) {
  const cached = grayscalePortraitCanvasCache.get(source);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const gctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!gctx) throw new Error("Could not create grayscale portrait canvas");
  gctx.imageSmoothingEnabled = false;
  gctx.drawImage(source, 0, 0);
  const imageData = gctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const memorial = Math.round(gray * 0.74 + 28);
    data[i] = memorial;
    data[i + 1] = memorial;
    data[i + 2] = memorial;
  }
  gctx.putImageData(imageData, 0, 0);
  grayscalePortraitCanvasCache.set(source, canvas);
  return canvas;
}

function drawDialogueOptions(view, x, y, width, bottom, font = PIXEL_FONT_SMALL_8) {
  dialogueLayout.optionRects = [];
  dialogueLayout.previousRect = null;
  dialogueLayout.nextRect = null;
  const optionHeight = dialogueOptionsHeight(view, font, width);
  const layout = dialogueOptionLayout({
    desiredY: y,
    bottom,
    optionHeight,
    optionCount: view.options.length
  });
  y = layout.y;
  const maxVisible = layout.visibleCount;
  const needsScroll = layout.needsScroll;
  const optionWindow = dialogueOptionWindow({
    optionCount: view.options.length,
    visibleCount: maxVisible,
    selectedIndex: dialogueState.selectedIndex,
    scrollOffset: dialogueLayout.scrollOffset
  });
  dialogueState.selectedIndex = optionWindow.selectedIndex;
  dialogueLayout.scrollOffset = optionWindow.scrollOffset;
  const navigation = needsScroll
    ? dialogueOptionNavigationLayout({
      x,
      y,
      width,
      visibleCount: maxVisible,
      optionHeight,
      buttonWidth: UI_PAGER_BUTTON_W,
      buttonHeight: UI_PAGER_BUTTON_H
    })
    : null;
  const optionWidth = navigation?.optionWidth || width;
  const visibleOptions = view.options.slice(optionWindow.start, optionWindow.end);
  for (let localIndex = 0; localIndex < visibleOptions.length; localIndex++) {
    const index = optionWindow.start + localIndex;
    const option = visibleOptions[localIndex];
    const rect = {
      x,
      y: y + localIndex * optionHeight,
      w: optionWidth,
      h: optionHeight - 2
    };
    dialogueLayout.optionRects.push({ index, rect });
    const selected = index === dialogueState.selectedIndex;
    drawPiratePaperInset(rect, selected && !option.disabled);
    if (selected) {
      ctx.fillStyle = option.disabled ? PIRATE_MENU_INK_MUTED : PIRATE_MENU_CHART_LINE;
      ctx.fillRect(rect.x + 2, rect.y + 3, 2, Math.max(2, rect.h - 6));
    }
    drawGameIcon(
      dialogueOptionIconId(option),
      rect.x + 6,
      rect.y + Math.floor((rect.h - GAME_ICON_SIZE) / 2),
      { alpha: option.disabled ? 0.38 : 1 }
    );
    ctx.fillStyle = option.disabled ? PIRATE_MENU_INK_MUTED : PIRATE_MENU_INK;
    const textLayout = dialogueOptionTextMetrics(option, font, rect.w, view.optionHeight || DIALOGUE_OPTION_H);
    const multiLine = textLayout.labelLines.length > 1 || textLayout.detailLines.length > 0;
    const labelY = multiLine ? rect.y + 3 : controlTextY(rect);
    for (let lineIndex = 0; lineIndex < textLayout.labelLines.length; lineIndex++) {
      drawPixelText(
        textLayout.labelLines[lineIndex],
        rect.x + GAME_ICON_SIZE + 10,
        labelY + lineIndex * 12,
        { font }
      );
    }
    if (textLayout.detailLines.length > 0) {
      ctx.fillStyle = option.disabled ? PIRATE_MENU_INK_MUTED : PIRATE_MENU_CHART_LINE;
      const detailY = rect.y + 4 + textLayout.labelLines.length * 12;
      for (let lineIndex = 0; lineIndex < textLayout.detailLines.length; lineIndex++) {
        drawPixelText(
          textLayout.detailLines[lineIndex],
          rect.x + GAME_ICON_SIZE + 10,
          detailY + lineIndex * 10,
          { font: PIXEL_FONT_SMALL_8 }
        );
      }
    }
  }

  if (navigation) {
    dialogueLayout.previousRect = navigation.previousRect;
    dialogueLayout.nextRect = navigation.nextRect;
    drawOptionsArrowButton(
      dialogueLayout.previousRect,
      navigation.direction === "horizontal" ? "<" : "^",
      pointInRect(optionsMenu.hoverPoint, dialogueLayout.previousRect)
    );
    drawOptionsArrowButton(
      dialogueLayout.nextRect,
      navigation.direction === "horizontal" ? ">" : "v",
      pointInRect(optionsMenu.hoverPoint, dialogueLayout.nextRect)
    );
    if (navigation.direction === "vertical") {
      drawOptionsText(
        `${dialogueState.selectedIndex + 1}/${view.options.length}`,
        dialogueLayout.previousRect.x + UI_PAGER_BUTTON_W / 2,
        y + Math.floor((maxVisible * optionHeight - 8) / 2),
        { align: "center", color: PIRATE_MENU_INK_MUTED }
      );
    }
  }
}

function dialogueOptionsHeight(view, font, width) {
  const minimumHeight = view.optionHeight || DIALOGUE_OPTION_H;
  const conservativeWidth = Math.max(40, width - UI_PAGER_BUTTON_W - 5);
  return view.options.reduce((height, option) => Math.max(
    height,
    dialogueOptionTextMetrics(option, font, conservativeWidth, minimumHeight).height
  ), minimumHeight);
}

function dialogueOptionTextMetrics(option, font, width, minimumHeight) {
  const iconReserve = GAME_ICON_SIZE + 13;
  return dialogueOptionTextLayout({
    label: option.label,
    detail: option.detail || "",
    labelWidth: Math.max(1, width - iconReserve),
    detailWidth: Math.max(1, width - iconReserve),
    measureLabel: (text) => measurePixelTextWidth(text, font),
    measureDetail: (text) => measurePixelTextWidth(text, PIXEL_FONT_SMALL_8),
    minimumHeight
  });
}

function wrapPixelText(text, font, maxWidth, maxLines) {
  return wrapMeasuredText(text, maxWidth, maxLines, (entry) => measurePixelTextWidth(entry, font));
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
    const sourceUrl = `${expression.src}?v=${CHARACTER_PORTRAIT_ASSET_VERSION}`;
    const promise = loadAssetImage(sourceUrl, `portrait ${character.id}.${expression.id}`)
      .then((sourceImage) => {
        portraitCanvasCache.set(key, sourceImage);
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
    Math.max(measurePixelTextWidth(line1, PIXEL_FONT_DIALOGUE_8), measurePixelTextWidth(line2, PIXEL_FONT_DIALOGUE_8)) + 8
  );
  ctx.fillStyle = "rgba(15, 18, 14, 0.62)";
  ctx.fillRect(4, SCREEN_H - 24, width, 20);
  ctx.fillStyle = "#d7d9bf";
  drawPixelText(line1, 8, SCREEN_H - 16, { font: PIXEL_FONT_DIALOGUE_8 });
  drawPixelText(line2, 8, SCREEN_H - 6, { font: PIXEL_FONT_DIALOGUE_8 });

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

function playerRainfallStrength() {
  if (!ship) return 0;
  const flags = weatherFlagsForTile(ship.tileId);
  if ((flags & TILE_DAY_SNOW_FALL) !== 0) return 0;
  let strength = (flags & TILE_DAY_RAIN) !== 0 ? 0.35 : 0;
  const storm = playerStormIntensity();
  if (storm >= STORM_SCREEN_RAIN_ENTER_INTENSITY) {
    const stormRain = 0.35 + 0.65 * clamp(
      (storm - STORM_SCREEN_RAIN_ENTER_INTENSITY) / (1 - STORM_SCREEN_RAIN_ENTER_INTENSITY),
      0,
      1
    );
    strength = Math.max(strength, stormRain);
  }
  return strength;
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
    return shadeHex(terrainSpriteColor("earth_rocky"), -12);
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
  const mountains = candidates.filter((candidate) => candidate.level >= TERRAIN_MOUNTAIN_LEVEL);
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
  return terrainRowsNeedBeach(call.row, call.nrow);
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

  if (t === "water") return waterSpriteForTile(id, row.waterDepthBand);
  if (t === "lake" || t === "beach") return `water_shallow_0${waterTextureVariantFor(id)}`;
  if (isMountainPeakTile(id)) return snowyMountainVariant(id);
  if (t === "mountain") return mountainVariant(id);
  if (t.includes("ice_cap")) return "snow_01";
  if (t === "ice") return "snow_01";
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

function waterSpriteForTile(id, explicitBand = null) {
  const textureVariant = waterTextureVariantFor(id);
  const band = Number.isInteger(explicitBand)
    ? explicitBand
    : waterDepthBands?.[id] ?? (WATER_DEPTH_GRADATION_COUNT + 1);
  if (band >= 1 && band <= WATER_DEPTH_GRADATION_COUNT) {
    return `water_depth_0${band}_0${textureVariant}`;
  }
  return `water_deep_01_0${textureVariant}`;
}

function waterTextureVariantFor(id) {
  return (hashInt(id) & 1) + 1;
}

function riverHighlightFrameFor(id) {
  const staggerMs = hashInt(id) % RIVER_HIGHLIGHT_FRAME_MS;
  return (Math.floor((waterAnimationClockMs + staggerMs) / RIVER_HIGHLIGHT_FRAME_MS) % 2) + 1;
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
  drawPixelText("Loading Marque & Reprisal...", 8, 14, { font: PIXEL_FONT_SMALL_8 });
}

function drawFatalError(err, heading = "Prototype failed to start") {
  ctx.fillStyle = "#1d1513";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#f0d2be";
  const lines = String(err?.message || err).match(/.{1,70}/g) || ["Unknown error"];
  drawPixelText(heading, 8, 14, { font: PIXEL_FONT_SMALL_8 });
  for (let i = 0; i < lines.length; i++) drawPixelText(lines[i], 8, 28 + i * 10, { font: PIXEL_FONT_SMALL_8 });
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
