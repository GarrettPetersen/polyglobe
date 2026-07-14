# Marque & Reprisal Ship Roster

The Unity asset pack labels the vessels generically, so this roster assigns 16th-century game-facing names from the baked silhouettes. Internal filename slugs remain tied to the source assets and are not historical classifications. These are practical visual interpretations, not museum-catalog claims.

Generated fleet sprites live in `apps/pixel-globe/public/assets/vehicles/unity-ships/` and use filenames like `{filename slug}-16-headings.png`, with matching `-light`, `-shade`, `-shadow`, `-preview`, and `-lighting-preview` sheets.

Large side-view sprites for the ship information screen live in `apps/pixel-globe/public/assets/vehicles/unity-ships/side-views/`. They preserve the same source-relative fleet scale and are quantized to the Resurrect 64 palette. Regenerate all roster side views with `npm run render:unity-ship-side-views` from `apps/pixel-globe/`.

High-resolution review rasters live in `apps/pixel-globe/docs/ship-reference/high-res/`. Regenerate them with `PIXEL_GLOBE_SHIP_FRAME_SIZE=160 PIXEL_GLOBE_SHIP_RENDER_SIZE=320 PIXEL_GLOBE_SHIP_SHADOW_FRAME_SIZE=320 PIXEL_GLOBE_SHIP_PREVIEW_SCALE=1 node tools/render-sail-ship-sprites.mjs --unity-fleet-reference` from `apps/pixel-globe/`.

The fleet bake preserves source-relative ship sizes with a compressed readability curve, so boats remain smaller than large ocean-going ships without disappearing in the 47px production frames. Standalone historical models use explicit shared-scale values: the long Mediterranean galley is largest by rendered length, while the broad East Asian warships remain substantial without filling the frame. Mediterranean galley oars remain proportionally longer than the shorter East Asian oars.

For development, `?ship={slug}` starts with any roster ship. In normal gameplay the Viking Longship is available only after its Hafnarfjordur reconstruction quest.

| Game name | Filename slug | Source asset label | Identification | Confidence | Notes |
|---|---|---|---|---|---|
| Fishing Barque | `fishing-lugger` | Boat 1 | small fishing barque | Medium | Small single-mast coastal working boat. |
| Small Dhow | `small-dhow` | Boat 2 | small dhow / coastal lateen boat | Medium | Small open hull with a triangular lateen-like sail reads closer to a dhow than a European sloop. |
| Small Cog | `small-cog` | Boat 3 | small cog / roundship | Medium | Broad little hull with a simple square-sail profile. |
| Dhow | `dhow` | Dhow by gogiart | ocean-going lateen-rigged dhow | High | Purpose-built Indian Ocean dhow model replacing the generic Unity lateen boat. |
| Sampan | `sampan` | Chinese Boat | small junk / sampan | High | Small Chinese-rigged vessel; good for river/coastal Asian traffic. |
| Large Junk | `large-junk` | Chinese Ship Large | large junk | High | Multiple battened sails. |
| Heavy Caravel | `pirate-brig` | Pirate Ship Large 1 | armed caravel / raider | Medium | Black-sailed multi-mast hull interpreted as a heavily armed caravel; pirate markings are a faction treatment. |
| Armed Galleon | `pirate-frigate` | Pirate Ship Large 2 | early galleon / raider | Medium | Longer, heavier black-sailed hull interpreted as an armed early galleon; pirate markings are a faction treatment. |
| Galleon | `galleon` | Sailing ship by cyc3w | three-masted galleon / armed merchant | Medium | Detailed mixed square-and-lateen rig replacing the generic Unity galleon. |
| Great Galleon | `frigate` | Ship Large 2 | great galleon | Medium | Long square-rigged silhouette interpreted as a large early galleon. |
| Urca | `fluyt` | Ship Large 3 | urca / merchant roundship | Medium | Bulky merchant hull interpreted as a capacious Iberian urca. |
| Carrack | `carrack` | Ship Large 4 | carrack / nao | Medium | Large early ocean-going merchant/explorer profile. |
| Great Carrack | `ship-of-the-line` | Ship Large 5 | great carrack / great ship | Medium | Largest heavy square-rigger, interpreted as an exceptional royal great ship. |
| Medium Junk | `medium-junk` | Chinese Ship Medium | junk | High | Medium battened-sail Chinese vessel. |
| Light Brigantine | `pirate-brigantine` | Pirate Ship Medium | Mediterranean brigantine | Medium | Compact black-sailed hull interpreted in the older Mediterranean sense; pirate markings are a faction treatment. |
| Xebec | `xebec` | Ship Medium 1 | xebec | High | Long, low Mediterranean lateen-rigged profile. |
| Caravel | `caravel` | Ship Medium 2 | caravel / caravel redonda | Medium | Small explorer/trader silhouette. |
| Square-Rigged Caravel | `square-rigged-caravel` | Ship Medium 4 | square-rigged caravel / small trader | Medium | Single square sail and compact explorer-trader hull read closer to a small caravel than a ketch. |
| Brigantine | `brigantine` | Ship Medium 5 | Mediterranean brigantine | Medium | Light trader or raider interpreted in the older Mediterranean sense. |
| Armed Caravel | `corvette` | Ship Medium 6 | armed caravel | Medium | Small naval silhouette interpreted as a caravel fitted for war. |
| Small Junk | `small-junk` | Chinese Ship Small | junk | High | Small battened-sail Chinese vessel. |
| Small Pinnace | `pirate-sloop` | Pirate Ship Small | pinnace | Medium | Small black-sailed hull interpreted as a light pinnace; pirate markings are a faction treatment. |
| Felucca | `felucca` | Ship Small 2 | dhow / felucca | High | Small single-lateen craft. |
| Coastal Pinnace | `cutter` | Ship Small 3 | small pinnace | Medium | Small European fore-and-aft silhouette used as a coastal pinnace. |
| Lateen Barque | `ketch` | Ship Small 5 | two-masted lateen barque | Medium | Two triangular sails interpreted as a small Mediterranean lateen trader. |
| Turtle Ship | `joseon-turtle-ship` | Geobukseon (Turtle Ship) | early Joseon armored oar-and-sail warship | High | Joseon-specific cannon warship with procedurally baked working oars. |
| Panokseon | `joseon-panokseon` | Panok ship (Panokseon) | Joseon decked oar-and-sail warship lineage | Medium | Available from 1522 as a representative of earlier Joseon decked oar-and-sail predecessors; the mature named type is documented later. The source model's static paddles are replaced with procedurally baked working oars. |
| Atakebune | `japanese-atakebune` | Atakebune Japanese Medieval Warship | Japanese coastal fortress warship | High | Japan-specific warship. The source model's static oar mesh is removed and replaced with procedurally baked working oars. |
| Spanish Nao | `spanish-nao` | Nao Victoria Galleon Ship | early-16th-century Spanish nao / small carrack | High | Spain-specific exploration hull based on Nao Victoria. Its unusually dark source textures receive a deterministic Resurrect palette lift during baking. |
| Portuguese Carrack | `portuguese-carrack` | Portuguese Carrack | early-16th-century Portuguese carrack | High | Portugal-specific armed ocean-going merchant retaining its cream-and-red sail treatment. |
| Viking Longship | `viking-longship` | Viking Ship 1 | Norse-style clinker-built longship reconstruction | High | Special quest ship. Its bright striped sail is retained and its animated oars are procedurally baked. |

## Ship Stats

The source of truth for gameplay tuning is `apps/pixel-globe/src/shipStats.js`. Acceleration and top speed are globe-radian units used by the sailing simulation. Top speed is tuned as a waterline-length and rig-efficiency value, so long warships can outrun smaller craft in steady wind even though they accelerate and turn slowly. Upwind stall is the angle off the wind where the ship starts moving again; below it, the ship stalls. Cannons are total mounted cannons, split across left and right broadsides at runtime.

| Ship | Slug | Cannons | Accel | Top Speed | Upwind Stall | Turn Rate | HP | Cargo |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Fishing Barque | `fishing-lugger` | 0 | 0.021 | 0.028 | 48deg | 2.90 | 35 | 18 |
| Small Dhow | `small-dhow` | 0 | 0.027 | 0.032 | 34deg | 3.20 | 38 | 28 |
| Small Cog | `small-cog` | 2 | 0.016 | 0.026 | 58deg | 2.00 | 70 | 70 |
| Dhow | `dhow` | 4 | 0.022 | 0.033 | 42deg | 2.80 | 55 | 45 |
| Sampan | `sampan` | 0 | 0.026 | 0.026 | 45deg | 3.40 | 30 | 25 |
| Large Junk | `large-junk` | 24 | 0.015 | 0.038 | 50deg | 1.75 | 220 | 360 |
| Heavy Caravel | `pirate-brig` | 18 | 0.020 | 0.041 | 42deg | 2.35 | 190 | 130 |
| Armed Galleon | `pirate-frigate` | 36 | 0.017 | 0.046 | 45deg | 1.95 | 300 | 190 |
| Galleon | `galleon` | 32 | 0.013 | 0.037 | 55deg | 1.55 | 360 | 420 |
| Great Galleon | `frigate` | 40 | 0.018 | 0.047 | 43deg | 2.05 | 320 | 180 |
| Urca | `fluyt` | 12 | 0.012 | 0.036 | 58deg | 1.45 | 260 | 520 |
| Carrack | `carrack` | 26 | 0.012 | 0.034 | 60deg | 1.35 | 340 | 480 |
| Great Carrack | `ship-of-the-line` | 50 | 0.010 | 0.045 | 58deg | 1.15 | 620 | 260 |
| Medium Junk | `medium-junk` | 12 | 0.018 | 0.036 | 48deg | 2.10 | 135 | 170 |
| Light Brigantine | `pirate-brigantine` | 12 | 0.022 | 0.041 | 38deg | 2.65 | 135 | 80 |
| Xebec | `xebec` | 16 | 0.024 | 0.043 | 34deg | 2.80 | 130 | 85 |
| Caravel | `caravel` | 8 | 0.019 | 0.036 | 44deg | 2.35 | 110 | 120 |
| Square-Rigged Caravel | `square-rigged-caravel` | 4 | 0.020 | 0.034 | 52deg | 2.30 | 90 | 100 |
| Brigantine | `brigantine` | 14 | 0.021 | 0.040 | 40deg | 2.45 | 155 | 115 |
| Armed Caravel | `corvette` | 18 | 0.020 | 0.042 | 42deg | 2.35 | 190 | 90 |
| Small Junk | `small-junk` | 4 | 0.023 | 0.032 | 43deg | 2.70 | 75 | 80 |
| Small Pinnace | `pirate-sloop` | 6 | 0.026 | 0.035 | 34deg | 3.05 | 75 | 35 |
| Felucca | `felucca` | 0 | 0.029 | 0.031 | 30deg | 3.35 | 35 | 20 |
| Coastal Pinnace | `cutter` | 4 | 0.028 | 0.035 | 32deg | 3.25 | 60 | 30 |
| Lateen Barque | `ketch` | 4 | 0.024 | 0.035 | 34deg | 2.85 | 75 | 60 |
| Turtle Ship | `joseon-turtle-ship` | 30 | 0.019 | 0.036 | 50deg | 2.10 | 32 | 110 |
| Panokseon | `joseon-panokseon` | 20 | 0.020 | 0.035 | 52deg | 2.20 | 28 | 150 |
| Atakebune | `japanese-atakebune` | 6 | 0.015 | 0.032 | 54deg | 1.70 | 38 | 170 |
| Spanish Nao | `spanish-nao` | 8 | 0.017 | 0.034 | 54deg | 1.90 | 13 | 180 |
| Portuguese Carrack | `portuguese-carrack` | 22 | 0.013 | 0.036 | 58deg | 1.45 | 31 | 440 |
| Viking Longship | `viking-longship` | 0 (arrows) | 0.030 | 0.043 | 55deg | 2.75 | 18 | 90 |

Skipped source assets:

| Source asset label | Reason |
|---|---|
| Viking Ship 2-4 | Alternate sail-color variants of the special quest longship. |
| Water | Environment prop, not a ship. |
| Boat 4 | Superseded by the credited purpose-built Dhow model. |
| Ship Large 1 | Superseded by the credited cyc3w Sailing ship model. |
| Ship Medium 3 | Redundant with the stronger Carrack and Spanish Nao models. |
| Ship Small 1 | Redundant with the more distinctive Xebec. |
| Ship Small 4 | Redundant with the credited purpose-built Dhow model. |
| Ship Small 6 | Redundant with the Small Cog and Caravel. |
| Ship Small 7 | Redundant with the Felucca and credited purpose-built Dhow models. |
