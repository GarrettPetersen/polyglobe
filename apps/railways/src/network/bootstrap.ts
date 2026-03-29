import { connectRailwaysServer } from "./client.js";
import {
  RAILWAYS_PROTOCOL_VERSION,
  configFromUrl,
  type ClientHello,
  type RailwaysAuthoritativeState,
  type RailwaysCommand,
  type ServerToClientMessage,
} from "./protocol.js";

declare global {
  interface Window {
    __railwaysNetSendCommand?: (command: RailwaysCommand) => void;
    __railwaysNetRequestSnapshot?: () => void;
    __railwaysNetDisconnect?: () => void;
    __railwaysNetState?: {
      connected: boolean;
      sessionId: string | null;
      clientId: string | null;
      role: "host" | "client" | null;
      lastSnapshot: RailwaysAuthoritativeState | null;
      lastMessage?: ServerToClientMessage;
    };
    __railwaysSessionSetup?: {
      mode: "single" | "multi-host" | "multi-join";
      totalPlayers: number;
      botPlayers: number;
      botAuthority: "server";
      startCityId: string;
      colorHex: string;
    };
  }
}

export function bootstrapRailwaysNetworkingFromUrl(url: URL): void {
  const mode = (url.searchParams.get("net") ?? "off").toLowerCase();
  if (mode === "off") {
    console.log("[railways-net] networking disabled (?net=host|join)");
    return;
  }
  const role = mode === "host" ? "host" : "client";
  const wsUrl =
    url.searchParams.get("server") ??
    (location.protocol === "https:" ? "wss://localhost:4422" : "ws://localhost:4422");
  const playerName = url.searchParams.get("player") ?? (role === "host" ? "Host" : "Player");
  const hello: ClientHello = {
    type: "hello",
    protocolVersion: RAILWAYS_PROTOCOL_VERSION,
    role,
    playerName,
    requestedBotPlayers:
      role === "host" ? Math.max(0, window.__railwaysSessionSetup?.botPlayers ?? 0) : 0,
    config: configFromUrl(url),
  };
  const netState = {
    connected: false,
    sessionId: null as string | null,
    clientId: null as string | null,
    role: null as "host" | "client" | null,
    lastSnapshot: null as RailwaysAuthoritativeState | null,
    lastMessage: undefined as ServerToClientMessage | undefined,
  };
  window.__railwaysNetState = netState;

  const client = connectRailwaysServer(wsUrl, hello, {
    onOpen: () => {
      netState.connected = true;
      console.log("[railways-net] connected", { wsUrl, role, playerName });
    },
    onHelloAck: (msg) => {
      netState.sessionId = msg.sessionId;
      netState.clientId = msg.yourClientId;
      netState.role = msg.role;
      netState.lastMessage = msg;
      console.log("[railways-net] handshake accepted", msg);
    },
    onHelloReject: (msg) => {
      netState.lastMessage = msg;
      console.error("[railways-net] handshake rejected", msg);
    },
    onSnapshot: (msg) => {
      netState.lastSnapshot = msg.state;
      netState.lastMessage = msg;
    },
    onMessage: (msg) => {
      netState.lastMessage = msg;
      if (msg.type === "playerJoined" || msg.type === "playerLeft") {
        console.log("[railways-net] roster", msg);
      }
    },
    onClose: (code, reason) => {
      netState.connected = false;
      console.log("[railways-net] disconnected", { code, reason });
    },
  });

  window.__railwaysNetSendCommand = (command) => {
    client.sendCommand(command);
  };
  window.__railwaysNetRequestSnapshot = () => {
    client.requestSnapshot();
  };
  window.__railwaysNetDisconnect = () => {
    client.close();
  };
}
