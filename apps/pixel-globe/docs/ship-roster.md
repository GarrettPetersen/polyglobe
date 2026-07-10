# Pixel Globe Ship Roster

The Unity asset pack labels the vessels generically, so this roster assigns game-facing names from the baked silhouettes. These are practical identifications, not museum-catalog claims. The strongest calls are the junks, dhows/feluccas, xebec, galleon, frigate, and pirate brigantine. The most uncertain calls are some stylized generic European merchant/naval ships.

Generated fleet sprites live in `apps/pixel-globe/public/assets/vehicles/unity-ships/` and use filenames like `{filename slug}-16-headings.png`, with matching `-light`, `-shade`, `-shadow`, `-preview`, and `-lighting-preview` sheets.

The fleet bake preserves source-relative ship sizes with a compressed readability curve, so boats remain smaller than large ocean-going ships without disappearing at 36px.

Use `?ship={slug}` in the Pixel Globe URL to start with any ship in this roster.

| Game name | Filename slug | Source asset label | Identification | Confidence | Notes |
|---|---|---|---|---|---|
| Fishing Lugger | `fishing-lugger` | Boat 1 | small lugger / fishing boat | Medium | Small single-mast coastal working boat. |
| Coastal Sloop | `coastal-sloop` | Boat 2 | coastal sloop / cutter | Medium | Small fore-and-aft coastal craft. |
| Small Cog | `small-cog` | Boat 3 | small cog / roundship | Medium | Broad little hull with a simple square-sail profile. |
| Dhow | `dhow` | Boat 4 | dhow / felucca | High | Lateen sail and narrow hull read strongly as an Indian Ocean or Red Sea craft. |
| Sampan | `sampan` | Chinese Boat | small junk / sampan | High | Small Chinese-rigged vessel; good for river/coastal Asian traffic. |
| Large Junk | `large-junk` | Chinese Ship Large | large junk | High | Multiple battened sails. |
| Pirate Brig | `pirate-brig` | Pirate Ship Large 1 | pirate brig / snow | Medium | Black-sailed multi-mast raider; brig is the cleanest game label. |
| Pirate Frigate | `pirate-frigate` | Pirate Ship Large 2 | pirate frigate / raider | Medium | Longer, heavier black-sailed raider silhouette. |
| Galleon | `galleon` | Ship Large 1 | galleon | High | Tall stern and large square-rigged profile. |
| Frigate | `frigate` | Ship Large 2 | frigate / man-of-war | High | Long square-rigged warship silhouette. |
| Fluyt | `fluyt` | Ship Large 3 | fluyt / merchantman | Medium | Bulky merchant hull, useful as a cargo specialist. |
| Carrack | `carrack` | Ship Large 4 | carrack / nao | Medium | Large early ocean-going merchant/explorer profile. |
| Ship of the Line | `ship-of-the-line` | Ship Large 5 | ship-of-the-line / heavy frigate | Medium | Largest heavy square-rigger in the pack. |
| Medium Junk | `medium-junk` | Chinese Ship Medium | junk | High | Medium battened-sail Chinese vessel. |
| Pirate Brigantine | `pirate-brigantine` | Pirate Ship Medium | pirate brigantine / brig | High | Compact black-sailed raider. |
| Xebec | `xebec` | Ship Medium 1 | xebec | High | Long, low Mediterranean lateen-rigged profile. |
| Caravel | `caravel` | Ship Medium 2 | caravel / caravel redonda | Medium | Small explorer/trader silhouette. |
| Small Carrack | `small-carrack` | Ship Medium 3 | cog / small carrack | Medium | Roundship profile, larger than a cog but less imposing than the carrack. |
| Ketch | `ketch` | Ship Medium 4 | ketch / small merchant sloop | Low | Stylized enough that this is a functional label more than a firm identification. |
| Brigantine | `brigantine` | Ship Medium 5 | brigantine / brig | Medium | Medium square/fore-and-aft trader or light naval vessel. |
| Corvette | `corvette` | Ship Medium 6 | corvette / small frigate | Medium | Small naval square-rigger. |
| Small Junk | `small-junk` | Chinese Ship Small | junk | High | Small battened-sail Chinese vessel. |
| Pirate Sloop | `pirate-sloop` | Pirate Ship Small | pirate sloop / cutter | Medium | Small black-sailed raider. |
| Lateen Xebec | `lateen-xebec` | Ship Small 1 | xebec / small lateen trader | Medium | Small lateen-rigged Mediterranean-style craft. |
| Felucca | `felucca` | Ship Small 2 | dhow / felucca | High | Small single-lateen craft. |
| Cutter | `cutter` | Ship Small 3 | sloop / cutter | High | Small fore-and-aft European craft. |
| Lateen Dhow | `lateen-dhow` | Ship Small 4 | dhow / lateen boat | High | Curved lateen silhouette; good Indian Ocean/Arabian Sea craft. |
| Small Caravel | `small-caravel` | Ship Small 5 | caravel-ish small explorer | Medium | Explorer-sized European sail plan. |
| Square-Sail Trader | `square-sail-trader` | Ship Small 6 | small cog / square-sail trader | Medium | Simple small trader with square-sail read. |
| Dhow-Felucca | `dhow-felucca` | Ship Small 7 | felucca / dhow | High | Another small lateen craft; distinct source model from Felucca. |

## Ship Stats

The source of truth for gameplay tuning is `apps/pixel-globe/src/shipStats.js`. Acceleration and top speed are globe-radian units used by the sailing simulation. Top speed is tuned as a waterline-length and rig-efficiency value, so long warships can outrun smaller craft in steady wind even though they accelerate and turn slowly. Upwind stall is the angle off the wind where the ship starts moving again; below it, the ship stalls. Cannons are total mounted cannons, split across left and right broadsides at runtime.

| Ship | Slug | Cannons | Accel | Top Speed | Upwind Stall | Turn Rate | HP | Cargo |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Fishing Lugger | `fishing-lugger` | 0 | 0.021 | 0.028 | 48deg | 2.90 | 35 | 18 |
| Coastal Sloop | `coastal-sloop` | 2 | 0.025 | 0.034 | 37deg | 3.20 | 45 | 20 |
| Small Cog | `small-cog` | 2 | 0.016 | 0.026 | 58deg | 2.00 | 70 | 70 |
| Dhow | `dhow` | 4 | 0.022 | 0.033 | 42deg | 2.80 | 55 | 45 |
| Sampan | `sampan` | 0 | 0.026 | 0.026 | 45deg | 3.40 | 30 | 25 |
| Large Junk | `large-junk` | 24 | 0.015 | 0.038 | 50deg | 1.75 | 220 | 360 |
| Pirate Brig | `pirate-brig` | 18 | 0.020 | 0.041 | 42deg | 2.35 | 190 | 130 |
| Pirate Frigate | `pirate-frigate` | 36 | 0.017 | 0.046 | 45deg | 1.95 | 300 | 190 |
| Galleon | `galleon` | 32 | 0.013 | 0.037 | 55deg | 1.55 | 360 | 420 |
| Frigate | `frigate` | 40 | 0.018 | 0.047 | 43deg | 2.05 | 320 | 180 |
| Fluyt | `fluyt` | 12 | 0.012 | 0.036 | 58deg | 1.45 | 260 | 520 |
| Carrack | `carrack` | 26 | 0.012 | 0.034 | 60deg | 1.35 | 340 | 480 |
| Ship of the Line | `ship-of-the-line` | 74 | 0.010 | 0.045 | 58deg | 1.15 | 620 | 260 |
| Medium Junk | `medium-junk` | 12 | 0.018 | 0.036 | 48deg | 2.10 | 135 | 170 |
| Pirate Brigantine | `pirate-brigantine` | 12 | 0.022 | 0.041 | 38deg | 2.65 | 135 | 80 |
| Xebec | `xebec` | 16 | 0.024 | 0.043 | 34deg | 2.80 | 130 | 85 |
| Caravel | `caravel` | 8 | 0.019 | 0.036 | 44deg | 2.35 | 110 | 120 |
| Small Carrack | `small-carrack` | 10 | 0.015 | 0.033 | 54deg | 1.90 | 150 | 210 |
| Ketch | `ketch` | 4 | 0.023 | 0.035 | 36deg | 2.75 | 80 | 75 |
| Brigantine | `brigantine` | 14 | 0.021 | 0.040 | 40deg | 2.45 | 155 | 115 |
| Corvette | `corvette` | 18 | 0.020 | 0.042 | 42deg | 2.35 | 190 | 90 |
| Small Junk | `small-junk` | 4 | 0.023 | 0.032 | 43deg | 2.70 | 75 | 80 |
| Pirate Sloop | `pirate-sloop` | 6 | 0.026 | 0.035 | 34deg | 3.05 | 75 | 35 |
| Lateen Xebec | `lateen-xebec` | 6 | 0.027 | 0.036 | 32deg | 3.00 | 70 | 40 |
| Felucca | `felucca` | 0 | 0.029 | 0.031 | 30deg | 3.35 | 35 | 20 |
| Cutter | `cutter` | 4 | 0.028 | 0.035 | 32deg | 3.25 | 60 | 30 |
| Lateen Dhow | `lateen-dhow` | 2 | 0.027 | 0.032 | 34deg | 3.00 | 45 | 35 |
| Small Caravel | `small-caravel` | 4 | 0.023 | 0.035 | 40deg | 2.60 | 80 | 80 |
| Square-Sail Trader | `square-sail-trader` | 2 | 0.020 | 0.034 | 52deg | 2.30 | 65 | 95 |
| Dhow-Felucca | `dhow-felucca` | 0 | 0.030 | 0.032 | 30deg | 3.40 | 35 | 18 |

Skipped source assets:

| Source asset label | Reason |
|---|---|
| Viking Ship 1-4 | Wrong era for the current sailing roster. |
| Water | Environment prop, not a ship. |
