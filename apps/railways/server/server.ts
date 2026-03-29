import { WebSocketServer, type WebSocket } from "ws";
import {
  RAILWAYS_PROTOCOL_VERSION,
  isConfigEqual,
  type ClientHello,
  type ClientToServerMessage,
  type ClientRole,
  type ServerToClientMessage,
  type SessionDeterminismConfig,
} from "../src/network/protocol.js";
import { RailwaysSessionState } from "./session.js";

interface ConnectedClient {
  id: string;
  socket: WebSocket;
  playerName: string;
  role: ClientRole;
}

const port = Number.parseInt(process.env.RAILWAYS_SERVER_PORT ?? "4422", 10);
const sessionId = `s-${Date.now().toString(36)}`;
const wss = new WebSocketServer({ port });
const clients = new Map<WebSocket, ConnectedClient>();
let hostSocket: WebSocket | null = null;
let session: RailwaysSessionState | null = null;
let serverCommandSeq = 0;
let lastPeriodicSnapshotAtMs = 0;
const PERIODIC_SNAPSHOT_INTERVAL_MS = 2000;

function send(ws: WebSocket, msg: ServerToClientMessage): void {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function broadcast(msg: ServerToClientMessage, exclude?: WebSocket): void {
  for (const [socket] of clients) {
    if (socket === exclude) continue;
    send(socket, msg);
  }
}

function rejectHello(
  ws: WebSocket,
  reason: string,
  expectedConfig?: SessionDeterminismConfig,
): void {
  send(ws, { type: "helloReject", reason, expectedConfig });
  ws.close(1008, reason);
}

function isClientHello(msg: ClientToServerMessage): msg is ClientHello {
  return msg.type === "hello";
}

function safeParse(raw: string): ClientToServerMessage | null {
  try {
    return JSON.parse(raw) as ClientToServerMessage;
  } catch {
    return null;
  }
}

function sendSnapshot(
  reason: "initial" | "join" | "command" | "periodic",
  target?: WebSocket,
): void {
  if (!session) return;
  serverCommandSeq++;
  const msg: ServerToClientMessage = {
    type: "snapshot",
    reason,
    sequence: serverCommandSeq,
    state: session.state,
  };
  if (target) send(target, msg);
  else broadcast(msg);
}

function flushEconomyEvents(): void {
  if (!session) return;
  const events = session.drainEconomyEvents();
  for (const event of events) {
    serverCommandSeq++;
    broadcast({
      type: "economyEvent",
      sequence: serverCommandSeq,
      event,
    });
  }
}

wss.on("connection", (ws) => {
  let handshook = false;
  const helloTimeout = setTimeout(() => {
    if (!handshook) rejectHello(ws, "hello_timeout");
  }, 7000);

  ws.on("message", (data) => {
    const msg = safeParse(String(data));
    if (!msg) {
      ws.close(1003, "invalid_json");
      return;
    }
    if (!handshook) {
      if (!isClientHello(msg)) {
        rejectHello(ws, "first_message_must_be_hello");
        return;
      }
      const hello = msg;
      if (hello.protocolVersion !== RAILWAYS_PROTOCOL_VERSION) {
        rejectHello(ws, "protocol_version_mismatch");
        return;
      }
      if (hello.role === "host") {
        if (hostSocket && hostSocket !== ws) {
          rejectHello(ws, "host_already_connected", session?.config);
          return;
        }
        hostSocket = ws;
        session = new RailwaysSessionState(sessionId, hello.config);
        session.addBotPlayers(hello.requestedBotPlayers ?? 0);
      } else {
        if (!hostSocket || !session) {
          rejectHello(ws, "no_host_online");
          return;
        }
        if (!isConfigEqual(hello.config, session.config)) {
          rejectHello(ws, "determinism_config_mismatch", session.config);
          return;
        }
      }

      handshook = true;
      clearTimeout(helloTimeout);
      const clientId = `c-${Math.random().toString(36).slice(2, 10)}`;
      const client: ConnectedClient = {
        id: clientId,
        socket: ws,
        playerName: hello.playerName,
        role: hello.role,
      };
      clients.set(ws, client);
      session!.addPlayer(clientId, hello.playerName, hello.role);
      const clock = session!.getClock();
      send(ws, {
        type: "helloAck",
        sessionId,
        yourClientId: clientId,
        role: hello.role,
        serverTimeMs: Date.now(),
        simDateTimeUtc: clock.dateTimeUtc,
        simSpeed: clock.simSpeed,
        paused: clock.paused,
        config: session!.config,
      });
      broadcast(
        {
          type: "playerJoined",
          clientId,
          playerName: hello.playerName,
          role: hello.role,
        },
        ws,
      );
      sendSnapshot(hello.role === "host" ? "initial" : "join", ws);
      return;
    }

    const client = clients.get(ws);
    if (!client) return;
    if (msg.type === "ping") {
      send(ws, {
        type: "pong",
        echoedSentAtMs: msg.sentAtMs,
        serverTimeMs: Date.now(),
      });
      return;
    }
    if (msg.type === "requestSnapshot") {
      sendSnapshot("periodic", ws);
      return;
    }
    if (msg.type === "command") {
      if (!session) {
        send(ws, {
          type: "commandRejected",
          clientCommandId: msg.clientCommandId,
          reason: "session_not_ready",
        });
        return;
      }
      const apply = session.applyCommand(
        { clientId: client.id, role: client.role },
        msg.command,
      );
      if (!apply.ok) {
        send(ws, {
          type: "commandRejected",
          clientCommandId: msg.clientCommandId,
          reason: apply.reason ?? "command_rejected",
        });
        return;
      }
      serverCommandSeq++;
      send(ws, {
        type: "commandAccepted",
        clientCommandId: msg.clientCommandId,
        sequence: serverCommandSeq,
        acceptedAtMs: Date.now(),
      });
      broadcast({
        type: "commandApplied",
        sequence: serverCommandSeq,
        byClientId: client.id,
        command: msg.command,
        stateVersion: session.state.stateVersion,
        appliedAtMs: Date.now(),
      });
      sendSnapshot("command");
      flushEconomyEvents();
      return;
    }
  });

  ws.on("close", () => {
    clearTimeout(helloTimeout);
    const client = clients.get(ws);
    if (!client) return;
    clients.delete(ws);
    session?.removePlayer(client.id);
    if (hostSocket === ws) {
      hostSocket = null;
      session = null;
      for (const [socket] of clients) {
        socket.close(1012, "host_left");
      }
      clients.clear();
      return;
    }
    broadcast({ type: "playerLeft", clientId: client.id });
  });
});

setInterval(() => {
  if (!session) return;
  const now = Date.now();
  session.tick(now);
  flushEconomyEvents();
  if (now - lastPeriodicSnapshotAtMs < PERIODIC_SNAPSHOT_INTERVAL_MS) return;
  lastPeriodicSnapshotAtMs = now;
  sendSnapshot("periodic");
}, 250);

console.log(`[railways-server] listening on ws://localhost:${port}`);
