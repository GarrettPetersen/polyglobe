# Railways Economy System (Host-Authoritative)

This document defines the railway-game economy model for `apps/railways`.

## Core Model

- Economy runs on the **authoritative host server** (listen-server host in multiplayer, local server in single player).
- Clients do not roll economy RNG. They receive:
  - command acknowledgements,
  - economy events,
  - periodic snapshots.
- Climate/terrain remain deterministic and local; server sync focuses on gameplay outcomes.

## City-Centric Flow

The game does not hardcode every city as producer/consumer of every good.
Instead:

1. We place world **production nodes** and **demand nodes** by commodity.
2. A spawn cycle chooses origin/destination cities probabilistically:
   - weighted by node proximity,
   - weighted by city population,
   - and adjusted by era behavior.
3. Result is a shipment order:
   - one good,
   - one origin city,
   - one destination city.

This keeps the model globally coherent while still producing varied local routes.

## Player Start + Currency

- Game start year is **1825**.
- Currency is **Pound Sterling (£)**.
- Each player starts with **£1000**.
- Each player picks a starting city and a player color.
- In single player, additional players are server-hosted bots.

## Time-Varying Nodes

Nodes include `startYear` and optional `endYear`, so commodity geography changes over time.

Examples currently encoded:

- Wool in Scotland (+ later Australia).
- Cotton in the US South, with Egyptian cotton activated from 1860.
- Opium production in Bengal/Anatolia; China demand node.
- Cod near Newfoundland, salmon in the Pacific Northwest, whale oil in open-ocean zones.
- Corn, potatoes, iron, coal, timber in historically plausible regions.

### Afghanistan poppy note

For 1825-1914, major globally integrated opium flows were strongly tied to British India and Ottoman/Persian production with Chinese demand. Afghanistan is modeled as a **late, lower-weight** source (from 1880) rather than the primary early source.

## Demand Placement Logic

For a spawned good:

- If a demand node exists and is active, destination selection is weighted near that node.
- If there is no explicit demand node, demand is weighted by:
  - city population,
  - **inverse production propensity** (cities unlikely to produce are more likely to demand).
- Early game (roughly pre-1840) adds a near-route bias so supply-demand pairs are often closer, helping early profitability.

## Shipments

A shipment is one economic unit with:

- good id
- origin city
- destination city
- base value
- created timestamp
- status (`pending`, `delivered`)

Mail and passengers use the same system with destination-specific city demands weighted heavily by destination population.

## City Experience and Industrialization

Cities gain XP when shipments complete.

- XP thresholds raise city level.
- At sufficient level, host can build production buildings:
  - `sawmill`
  - `textile_mill`
  - `opium_factory`
  - `fish_cannery`
  - `refinery`

Buildings add recursive economy behavior:

- input-goods demand into that city
- output-goods shipments out to demand elsewhere

This is the core transition from extractive trade to industrial networks.

## Revenue Distribution

On delivery:

- server validates shipment destination,
- shipment is marked delivered,
- payout is split across listed carrier players,
- city XP progression is updated,
- events/snapshots are broadcast.

## Determinism Handshake Requirements

Session joins are accepted only when these match host values:

- `gameVersion`
- `rulesetVersion`
- `climateBakeId`
- `terrainBakeId`
- `worldSeed`

## Current Implementation Status

Implemented now:

- host-authoritative RNG and spawn cycles
- player state with starting funds, city picks, and colors
- host-side bot-player slots (for single player setup)
- node-weighted commodity spawning
- inverse-production fallback demand logic
- time-varying node activation
- mail/passenger spawns
- city XP/level progression
- production building command and recipe-driven spawns
- delivery resolution command and payout events
- track construction queue with per-hex build times and costs

Planned next:

- explicit cargo path reservation over rail/ship graph
- per-player company ledgers and cash balances
- command-level anti-abuse checks against actual route segments
- balancing tools for spawn rates/value curves
