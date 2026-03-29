import type {
  ClientHello,
  ClientToServerMessage,
  RailwaysCommand,
  ServerHelloAck,
  ServerHelloReject,
  ServerSnapshot,
  ServerToClientMessage,
} from "./protocol.js";

export interface RailwaysNetworkClient {
  sendCommand: (command: RailwaysCommand) => void;
  requestSnapshot: () => void;
  close: () => void;
}

export interface RailwaysNetworkCallbacks {
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onHelloAck?: (msg: ServerHelloAck) => void;
  onHelloReject?: (msg: ServerHelloReject) => void;
  onSnapshot?: (msg: ServerSnapshot) => void;
  onMessage?: (msg: ServerToClientMessage) => void;
}

function safeParseServerMessage(raw: string): ServerToClientMessage | null {
  try {
    return JSON.parse(raw) as ServerToClientMessage;
  } catch {
    return null;
  }
}

export function connectRailwaysServer(
  wsUrl: string,
  hello: ClientHello,
  callbacks: RailwaysNetworkCallbacks = {},
): RailwaysNetworkClient {
  const socket = new WebSocket(wsUrl);
  let commandSeq = 0;
  let pingInterval: number | null = null;

  socket.addEventListener("open", () => {
    const first: ClientToServerMessage = hello;
    socket.send(JSON.stringify(first));
    pingInterval = window.setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const pingMsg: ClientToServerMessage = {
        type: "ping",
        sentAtMs: Date.now(),
      };
      socket.send(JSON.stringify(pingMsg));
    }, 4000);
    callbacks.onOpen?.();
  });

  socket.addEventListener("message", (event) => {
    const msg = safeParseServerMessage(String(event.data));
    if (!msg) return;
    if (msg.type === "helloAck") callbacks.onHelloAck?.(msg);
    else if (msg.type === "helloReject") callbacks.onHelloReject?.(msg);
    else if (msg.type === "snapshot") callbacks.onSnapshot?.(msg);
    callbacks.onMessage?.(msg);
  });

  socket.addEventListener("close", (event) => {
    if (pingInterval != null) {
      window.clearInterval(pingInterval);
      pingInterval = null;
    }
    callbacks.onClose?.(event.code, event.reason);
  });

  return {
    sendCommand(command: RailwaysCommand): void {
      if (socket.readyState !== WebSocket.OPEN) return;
      commandSeq++;
      const msg: ClientToServerMessage = {
        type: "command",
        clientCommandId: `c-${Date.now()}-${commandSeq}`,
        issuedAtMs: Date.now(),
        command,
      };
      socket.send(JSON.stringify(msg));
    },
    requestSnapshot(): void {
      if (socket.readyState !== WebSocket.OPEN) return;
      const msg: ClientToServerMessage = {
        type: "requestSnapshot",
      };
      socket.send(JSON.stringify(msg));
    },
    close(): void {
      socket.close(1000, "client_shutdown");
    },
  };
}
