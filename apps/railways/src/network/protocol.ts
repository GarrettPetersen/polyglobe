export const RAILWAYS_PROTOCOL_VERSION = "1";
export const RAILWAYS_GAME_VERSION = "0.1.0-dev";
export const RAILWAYS_RULESET_VERSION = "railways-rules-v1";
export const DEFAULT_WORLD_SEED = "railways-1825";

export interface SessionDeterminismConfig {
  gameVersion: string;
  rulesetVersion: string;
  climateBakeId: string;
  terrainBakeId: string;
  worldSeed: string;
}

export type ClientRole = "host" | "client";

export interface ClientHello {
  type: "hello";
  protocolVersion: string;
  role: ClientRole;
  playerName: string;
  requestedBotPlayers?: number;
  config: SessionDeterminismConfig;
}

export interface ServerHelloAck {
  type: "helloAck";
  sessionId: string;
  yourClientId: string;
  role: ClientRole;
  serverTimeMs: number;
  simDateTimeUtc: string;
  simSpeed: number;
  paused: boolean;
  config: SessionDeterminismConfig;
}

export interface ServerHelloReject {
  type: "helloReject";
  reason: string;
  expectedConfig?: SessionDeterminismConfig;
}

export interface BuildTrackCommand {
  kind: "buildTrack";
  fromTileId: number;
  toTileId: number;
}

export interface QueueTrackBuildCommand {
  kind: "queueTrackBuild";
  pathTileIds: number[];
  estimatedStepCosts?: number[];
  terrainFlagsByStep?: Array<{
    hilly?: boolean;
    river?: boolean;
    mountain?: boolean;
  }>;
}

export interface SetTrainRouteCommand {
  kind: "setTrainRoute";
  trainId: string;
  stopTileIds: number[];
}

export type RouteMode = "rail" | "water";
export type VehicleKind =
  | "locomotive_front"
  | "passenger_carriage"
  | "wagon"
  | "sail_ship";

export interface CreateRouteCommand {
  kind: "createRoute";
  mode: RouteMode;
  tileIds: number[];
  isLoop: boolean;
  name?: string;
}

export interface PurchaseVehicleCommand {
  kind: "purchaseVehicle";
  vehicleKind: VehicleKind;
  quantity?: number;
}

export interface AssignVehiclesToRouteCommand {
  kind: "assignVehiclesToRoute";
  routeId: string;
  vehicleIds: string[];
}

export interface AdvanceTimeCommand {
  kind: "setSimSpeed";
  simSpeed: number;
  paused: boolean;
}

export type RailwaysCommand =
  | BuildTrackCommand
  | QueueTrackBuildCommand
  | SetTrainRouteCommand
  | AdvanceTimeCommand
  | ChooseStartingCityCommand
  | BuildProductionBuildingCommand
  | ResolveShipmentDeliveryCommand
  | CreateRouteCommand
  | PurchaseVehicleCommand
  | AssignVehiclesToRouteCommand;

export type GoodId =
  | "wool"
  | "cotton"
  | "opium"
  | "cod"
  | "salmon"
  | "whale_oil"
  | "corn"
  | "potatoes"
  | "iron"
  | "coal"
  | "timber"
  | "lumber"
  | "textiles"
  | "refined_oil"
  | "canned_fish"
  | "mail"
  | "passengers";

export type ProductionBuildingType =
  | "sawmill"
  | "textile_mill"
  | "opium_factory"
  | "fish_cannery"
  | "refinery";

export interface BuildProductionBuildingCommand {
  kind: "buildProductionBuilding";
  cityId: string;
  buildingType: ProductionBuildingType;
}

export interface ChooseStartingCityCommand {
  kind: "chooseStartingCity";
  cityId: string;
  colorHex: string;
}

export interface ResolveShipmentDeliveryCommand {
  kind: "resolveShipmentDelivery";
  shipmentId: string;
  deliveredAtCityId: string;
  carrierClientIds: string[];
}

export interface SimClockState {
  dateTimeUtc: string;
  simSpeed: number;
  paused: boolean;
}

export interface TrackSegmentState {
  fromTileId: number;
  toTileId: number;
  ownerClientId: string;
  ownerColorHex: string;
  status: "building" | "active";
  buildStartedAtMs: number;
  buildCompleteAtMs: number;
  buildCostPounds: number;
}

export interface RailwaysPlayerState {
  clientId: string;
  playerName: string;
  role: ClientRole;
  colorHex: string;
  startCityId: string | null;
  fundsPounds: number;
}

export interface TrainRouteState {
  trainId: string;
  stopTileIds: number[];
}

export interface PlayerRouteState {
  routeId: string;
  ownerClientId: string;
  mode: RouteMode;
  name: string;
  tileIds: number[];
  isLoop: boolean;
  vehicleIds: string[];
}

export interface PlayerVehicleState {
  vehicleId: string;
  ownerClientId: string;
  kind: VehicleKind;
  purchasedAtMs: number;
  assignedRouteId: string | null;
  currentTileId?: number;
  nextTileId?: number;
  direction?: 1 | -1;
  lastMoveAtMs?: number;
  nextMoveAtMs?: number;
}

export interface CitySummary {
  cityId: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  population: number;
}

export interface CityEconomyState {
  cityId: string;
  xp: number;
  level: number;
  buildings: ProductionBuildingType[];
}

export interface ShipmentState {
  shipmentId: string;
  goodId: GoodId;
  originCityId: string;
  destinationCityId: string;
  units: number;
  baseValue: number;
  createdAtMs: number;
  sourceNodeId?: string;
  demandNodeId?: string;
  status: "pending" | "in_transit" | "delivered";
  originTileId?: number;
  destinationTileId?: number;
  currentTileId?: number;
  plannedTilePath?: number[];
  plannedPathCursor?: number;
  onboardVehicleId?: string | null;
  journeyVehicleIds?: string[];
  journeyRailEdgeKeys?: string[];
}

export interface EconomyState {
  cities: CitySummary[];
  cityProgress: CityEconomyState[];
  shipments: ShipmentState[];
}

export interface RailwaysAuthoritativeState {
  stateVersion: number;
  clock: SimClockState;
  players: RailwaysPlayerState[];
  tracks: TrackSegmentState[];
  routes: TrainRouteState[];
  playerRoutes: PlayerRouteState[];
  playerVehicles: PlayerVehicleState[];
  economy: EconomyState;
}

export interface ClientCommandEnvelope {
  type: "command";
  clientCommandId: string;
  issuedAtMs: number;
  command: RailwaysCommand;
}

export interface ServerCommandAccepted {
  type: "commandAccepted";
  clientCommandId: string;
  sequence: number;
  acceptedAtMs: number;
}

export interface ServerCommandRejected {
  type: "commandRejected";
  clientCommandId: string;
  reason: string;
}

export interface ServerPlayerJoined {
  type: "playerJoined";
  clientId: string;
  playerName: string;
  role: ClientRole;
}

export interface ServerPlayerLeft {
  type: "playerLeft";
  clientId: string;
}

export interface ClientPing {
  type: "ping";
  sentAtMs: number;
}

export interface ServerPong {
  type: "pong";
  echoedSentAtMs: number;
  serverTimeMs: number;
}

export interface ClientRequestSnapshot {
  type: "requestSnapshot";
}

export interface ServerSnapshot {
  type: "snapshot";
  reason: "initial" | "join" | "command" | "periodic";
  sequence: number;
  state: RailwaysAuthoritativeState;
}

export interface ServerCommandApplied {
  type: "commandApplied";
  sequence: number;
  byClientId: string;
  command: RailwaysCommand;
  stateVersion: number;
  appliedAtMs: number;
}

export type EconomyEvent =
  | {
      kind: "shipmentSpawned";
      shipment: ShipmentState;
    }
  | {
      kind: "shipmentDelivered";
      shipmentId: string;
      payoutByClient: Array<{ clientId: string; payout: number }>;
    }
  | {
      kind: "cityLeveled";
      cityId: string;
      level: number;
    }
  | {
      kind: "buildingConstructed";
      cityId: string;
      buildingType: ProductionBuildingType;
    };

export interface ServerEconomyEvent {
  type: "economyEvent";
  sequence: number;
  event: EconomyEvent;
}

export type ClientToServerMessage =
  | ClientHello
  | ClientCommandEnvelope
  | ClientPing
  | ClientRequestSnapshot;

export type ServerToClientMessage =
  | ServerHelloAck
  | ServerHelloReject
  | ServerCommandAccepted
  | ServerCommandRejected
  | ServerPlayerJoined
  | ServerPlayerLeft
  | ServerPong
  | ServerSnapshot
  | ServerCommandApplied
  | ServerEconomyEvent;

export function configFromUrl(url: URL): SessionDeterminismConfig {
  return {
    gameVersion: url.searchParams.get("gameVersion") ?? RAILWAYS_GAME_VERSION,
    rulesetVersion: url.searchParams.get("rulesetVersion") ?? RAILWAYS_RULESET_VERSION,
    climateBakeId: url.searchParams.get("climateBake") ?? "discrete-weather-bake-7",
    terrainBakeId: url.searchParams.get("terrainBake") ?? "earth-globe-cache-7",
    worldSeed: url.searchParams.get("worldSeed") ?? DEFAULT_WORLD_SEED,
  };
}

export function isConfigEqual(
  a: SessionDeterminismConfig,
  b: SessionDeterminismConfig,
): boolean {
  return (
    a.gameVersion === b.gameVersion &&
    a.rulesetVersion === b.rulesetVersion &&
    a.climateBakeId === b.climateBakeId &&
    a.terrainBakeId === b.terrainBakeId &&
    a.worldSeed === b.worldSeed
  );
}
