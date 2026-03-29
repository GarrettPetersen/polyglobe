# Railways Networking Scaffold

This app now includes a basic authoritative client/server framework with deterministic-handshake checks.

## Modes

- `?net=off` (default): no network connection.
- `?net=host`: connect as host (authoritative session owner).
- `?net=join`: connect as client to an existing host.

## URL Params

- `server`: websocket URL (default `ws://localhost:4422`)
- `player`: player display name
- `gameVersion`
- `rulesetVersion`
- `climateBake`
- `terrainBake`
- `worldSeed`

All determinism params are validated by the server during handshake.

## Framework Features Included

- Authoritative server-owned simulation clock and state versioning.
- Typed command pipeline (`buildTrack`, `setTrainRoute`, `setSimSpeed`) with validation.
- Server command ack/reject plus command-applied broadcast.
- Full-state snapshots (`initial`, `join`, `command`, `periodic`).
- Heartbeat ping/pong and manual snapshot request path.

## Dev Commands

- `npm run railways:server` - run websocket server only
- `npm run railways:dev:host` - run server + client dev server
- `npm run railways:dev:join` - run client dev server for joining

## Browser Console Helpers

- `window.__railwaysNetSendCommand({...})`
- `window.__railwaysNetRequestSnapshot()`
- `window.__railwaysNetDisconnect()`
- `window.__railwaysNetState` (live connection/session/snapshot info)

Example command:

```js
window.__railwaysNetSendCommand({
  kind: "buildTrack",
  fromTileId: 123,
  toTileId: 456,
});
```
