# Marque & Reprisal Ship Roster

The Unity asset pack labels the vessels generically, so this roster assigns 16th-century game-facing names from the baked silhouettes. Internal filename slugs remain tied to the source assets and are not historical classifications. These are practical visual interpretations, not museum-catalog claims.

Generated fleet sprites live in `apps/pixel-globe/public/assets/vehicles/unity-ships/` and use filenames like `{filename slug}-32-headings.png`, with matching `-light`, `-shade`, `-shadow`, `-preview`, and `-lighting-preview` sheets.

Large side-view sprites for the ship information screen live in `apps/pixel-globe/public/assets/vehicles/unity-ships/side-views/`. They preserve the same source-relative fleet scale and are quantized to the Resurrect 64 palette. Regenerate all roster side views with `npm run render:unity-ship-side-views` from `apps/pixel-globe/`.

High-resolution review rasters live in `apps/pixel-globe/docs/ship-reference/high-res/`. Regenerate them with `PIXEL_GLOBE_SHIP_FRAME_SIZE=160 PIXEL_GLOBE_SHIP_RENDER_SIZE=320 PIXEL_GLOBE_SHIP_SHADOW_FRAME_SIZE=320 PIXEL_GLOBE_SHIP_PREVIEW_SCALE=1 node tools/render-sail-ship-sprites.mjs --unity-fleet-reference` from `apps/pixel-globe/`.

The fleet bake preserves source-relative ship sizes with a compressed readability curve, so boats remain smaller than large ocean-going ships without disappearing in the 47px production frames. Standalone historical models use explicit shared-scale values: the long Mediterranean galley is largest by rendered length, while the broad East Asian warships remain substantial without filling the frame. Mediterranean galley oars remain proportionally longer than the shorter East Asian oars.

For development, `?startShip={slug}` starts a new voyage with any roster ship. The separate `ship` query parameter only mirrors the current vessel for debugging and does not affect a new voyage. In normal gameplay the Viking Longship is available only after its Hafnarfjordur reconstruction quest.

| Game name | Filename slug | Source asset label | Identification | Confidence | Notes |
|---|---|---|---|---|---|
| Fishing Barque | `fishing-lugger` | Boat 1 | small fishing barque | Medium | Small single-mast coastal working boat. |
| Small Cog | `small-cog` | Boat 3 | small cog / roundship | Medium | Broad little hull with a simple square-sail profile. Its tuned scale keeps it above open boats but below the small-junk and medium-ship tier. |
| Dhow | `dhow` | Dhow by gogiart | small coastal dhow / fishing craft | High | Purpose-built one-person coastal dhow used as a light fishing and trading craft. |
| Sampan | `sampan` | Chinese Boat | small junk / sampan | High | Small Chinese-rigged vessel; good for river/coastal Asian traffic. |
| Large Junk | `large-junk` | Chinese Ship Large | large junk | High | Multiple battened sails. |
| Heavy Caravel | `pirate-brig` | Pirate Ship Large 1 | armed caravel / raider | Medium | Black-sailed multi-mast hull interpreted as a heavily armed caravel; the source model's pirate colors are retained. |
| Galleon | `galleon` | Sailing ship by cyc3w | three-masted galleon / armed merchant | Medium | Detailed mixed square-and-lateen rig replacing the generic Unity galleon. Its unusually dark texture receives a uniform brightness adjustment during baking. |
| Urca | `fluyt` | Ship Large 3 | urca / merchant roundship | Medium | Bulky merchant hull interpreted as a capacious Iberian urca. |
| Carrack | `carrack` | Ship Large 4 | carrack / nao | Medium | Large early ocean-going merchant/explorer profile. |
| Great Carrack | `ship-of-the-line` | Ship Large 5 | great carrack / great ship | Medium | Largest heavy square-rigger, interpreted as an exceptional royal great ship. |
| Medium Junk | `medium-junk` | Chinese Ship Medium | junk | High | Medium battened-sail Chinese vessel. |
| Xebec | `xebec` | Ship Medium 1 | xebec | High | Long, low Mediterranean lateen-rigged profile. |
| Caravel | `caravel` | Ship Medium 2 | caravel / caravel redonda | Medium | Small explorer/trader silhouette. |
| Square-Rigged Caravel | `square-rigged-caravel` | Ship Medium 4 | square-rigged caravel / small trader | Medium | Single square sail and compact explorer-trader hull read closer to a small caravel than a ketch. |
| Brigantine | `brigantine` | Ship Medium 5 | Mediterranean brigantine | Medium | Light trader or raider interpreted in the older Mediterranean sense. |
| Small Junk | `small-junk` | Chinese Ship Small | junk | High | Small battened-sail Chinese vessel. |
| Felucca | `felucca` | Ship Small 2 | dhow / felucca | High | Small single-lateen craft, scaled with the other low-capacity coastal starters. |
| Coastal Pinnace | `cutter` | Ship Small 3 | small pinnace | Medium | Small European fore-and-aft silhouette used as a coastal pinnace, between the starter boats and compact cargo upgrades. |
| Lateen Barque | `ketch` | Ship Small 5 | two-masted lateen barque | Medium | Two triangular sails interpreted as a small Mediterranean lateen trader. |
| Turtle Ship | `joseon-turtle-ship` | Geobukseon (Turtle Ship) | early Joseon armored oar-and-sail warship | High | Joseon-specific cannon warship with procedurally baked working oars. |
| Panokseon | `joseon-panokseon` | Panok ship (Panokseon) | Joseon decked oar-and-sail warship lineage | Medium | Available from 1522 as a representative of earlier Joseon decked oar-and-sail predecessors; the mature named type is documented later. The source model's static paddles are replaced with procedurally baked working oars. |
| Atakebune | `japanese-atakebune` | Atakebune Japanese Medieval Warship | Japanese coastal fortress warship | High | Japan-specific warship. The source model's static oar mesh is removed and replaced with procedurally baked working oars. |
| Spanish Nao | `spanish-nao` | Nao Victoria Galleon Ship | early-16th-century Spanish nao / small carrack | High | Spain-specific exploration hull based on Nao Victoria. Its unusually dark texture receives a uniform brightness adjustment during baking. |
| Portuguese Carrack | `portuguese-carrack` | Portuguese Carrack | early-16th-century Portuguese carrack | High | Portugal-specific armed ocean-going merchant retaining its cream-and-red sail treatment. |
| Nusantaran Outrigger | `nusantaran-outrigger` | Low Poly Borobudur Ship of Sriwijaya | ocean-going double-outrigger trading vessel | High | An older Borobudur reconstruction used as a representative descendant of the Nusantaran outrigger tradition in 1522. |
| Kelulus | `kelulus` | Procedural Kelulus | Malay oar-and-sail vessel | Medium | Original low-poly reconstruction based on period silhouettes: a narrow double-ended hull, canted tanja sail, shelter, and animated oars. |
| Penjajap | `penjajap` | Procedural Penjajap | light Malay coastal raider | Medium | Original one-masted reconstruction with a lean shallow hull and four thick representative oar pairs for pixel clarity. |
| Lancaran | `lancaran` | Procedural Lancaran | Malay fleet warship | Medium | Original two-masted reconstruction with fighting platforms and five representative oar pairs. |
| Royal Lancaran | `royal-lancaran` | Procedural Royal Lancaran | large Malay command warship | Medium | Original three-masted flagship reconstruction with dyed sails, gilt rails, a royal pavilion, and six representative oar pairs. |
| Ottoman Coastal Trader | `ottoman-coastal-trader` | Ottoman Coastal Trade Tall Ship 3D Model | armed Ottoman coastal merchant | Medium | Ottoman-specific regional merchant; the source does not establish a narrower historical class. |
| Viking Longship | `viking-longship` | Viking Ship 1 | Norse-style clinker-built longship reconstruction | High | Special quest ship. Its bright striped sail is retained and its animated oars are procedurally baked. |

## Ship Stats

The source of truth for gameplay tuning is `apps/pixel-globe/src/shipStats.js`. Acceleration and top speed are globe-radian units used by the sailing simulation. Top speed is tuned as a waterline-length and rig-efficiency value, so long warships can outrun smaller craft in steady wind even though they accelerate and turn slowly. Upwind stall is the angle off the wind where the ship starts moving again; below it, the ship stalls. Cannons are total mounted cannons, split across left and right broadsides at runtime.

The Turtle Ship has 40% intrinsic combat armor. Each projectile or ramming impact has a 40% chance to glance off without hull damage; a penetrating hit deals its normal damage.

| Ship | Slug | Cannons | Accel | Top Speed | Upwind Stall | Turn Rate | HP | Cargo |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Fishing Barque | `fishing-lugger` | 0 | 0.021 | 0.028 | 48deg | 2.90 | 35 | 18 |
| Small Cog | `small-cog` | 2 | 0.016 | 0.026 | 58deg | 2.00 | 70 | 70 |
| Dhow | `dhow` | 0 | 0.030 | 0.029 | 38deg | 3.50 | 12 | 10 |
| Sampan | `sampan` | 0 | 0.026 | 0.026 | 45deg | 3.40 | 30 | 25 |
| Large Junk | `large-junk` | 24 | 0.015 | 0.038 | 50deg | 1.75 | 220 | 360 |
| Heavy Caravel | `pirate-brig` | 18 | 0.020 | 0.041 | 42deg | 2.35 | 190 | 130 |
| Galleon | `galleon` | 32 | 0.013 | 0.037 | 55deg | 1.55 | 360 | 420 |
| Urca | `fluyt` | 12 | 0.012 | 0.036 | 58deg | 1.45 | 260 | 520 |
| Carrack | `carrack` | 26 | 0.012 | 0.034 | 60deg | 1.35 | 340 | 480 |
| Great Carrack | `ship-of-the-line` | 50 | 0.010 | 0.045 | 58deg | 1.15 | 620 | 260 |
| Medium Junk | `medium-junk` | 12 | 0.018 | 0.036 | 48deg | 2.10 | 135 | 170 |
| Xebec | `xebec` | 16 | 0.024 | 0.043 | 34deg | 2.80 | 130 | 85 |
| Caravel | `caravel` | 8 | 0.019 | 0.036 | 44deg | 2.35 | 110 | 120 |
| Square-Rigged Caravel | `square-rigged-caravel` | 4 | 0.020 | 0.034 | 52deg | 2.30 | 90 | 100 |
| Brigantine | `brigantine` | 14 | 0.021 | 0.040 | 40deg | 2.45 | 155 | 115 |
| Small Junk | `small-junk` | 4 | 0.023 | 0.032 | 43deg | 2.70 | 75 | 80 |
| Felucca | `felucca` | 0 | 0.029 | 0.031 | 30deg | 3.35 | 35 | 20 |
| Coastal Pinnace | `cutter` | 4 | 0.028 | 0.035 | 32deg | 3.25 | 60 | 30 |
| Lateen Barque | `ketch` | 4 | 0.024 | 0.035 | 34deg | 2.85 | 75 | 60 |
| Turtle Ship | `joseon-turtle-ship` | 30 | 0.017 | 0.034 | 50deg | 1.85 | 45 | 90 |
| Panokseon | `joseon-panokseon` | 20 | 0.020 | 0.035 | 52deg | 2.20 | 28 | 150 |
| Atakebune | `japanese-atakebune` | 6 | 0.015 | 0.032 | 54deg | 1.70 | 38 | 170 |
| Spanish Nao | `spanish-nao` | 8 | 0.017 | 0.034 | 54deg | 1.90 | 13 | 180 |
| Portuguese Carrack | `portuguese-carrack` | 22 | 0.013 | 0.036 | 58deg | 1.45 | 31 | 440 |
| Nusantaran Outrigger | `nusantaran-outrigger` | 0 (arrows) | 0.022 | 0.035 | 48deg | 2.50 | 10 | 130 |
| Kelulus | `kelulus` | 0 (arrows) | 0.027 | 0.039 | 46deg | 2.90 | 10 | 65 |
| Penjajap | `penjajap` | 2 | 0.028 | 0.042 | 44deg | 3.05 | 12 | 45 |
| Lancaran | `lancaran` | 6 | 0.024 | 0.041 | 48deg | 2.60 | 20 | 95 |
| Royal Lancaran | `royal-lancaran` | 10 | 0.019 | 0.040 | 50deg | 2.20 | 31 | 160 |
| Ottoman Coastal Trader | `ottoman-coastal-trader` | 8 | 0.017 | 0.035 | 55deg | 1.90 | 17 | 240 |
| Viking Longship | `viking-longship` | 0 (arrows) | 0.030 | 0.043 | 55deg | 2.75 | 18 | 90 |

Skipped source assets:

| Source asset label | Reason |
|---|---|
| Viking Ship 2-4 | Alternate sail-color variants of the special quest longship. |
| Water | Environment prop, not a ship. |
| Boat 4 | Superseded by the credited purpose-built Dhow model. |
| Boat 2 | Superseded by the credited one-person Dhow model. |
| Pirate Ship Large 2 | Redundant with the more detailed credited Galleon model. |
| Ship Large 2 | Redundant with the more detailed credited Galleon model. |
| Pirate Ship Medium | Redundant with the Brigantine and Xebec. |
| Ship Medium 6 | Redundant with the more distinctive Heavy Caravel. |
| Pirate Ship Small | Redundant with the cleaner Coastal Pinnace. |
| Ship Large 1 | Superseded by the credited cyc3w Sailing ship model. |
| Ship Medium 3 | Redundant with the stronger Carrack and Spanish Nao models. |
| Ship Small 1 | Redundant with the more distinctive Xebec. |
| Ship Small 4 | Redundant with the credited purpose-built Dhow model. |
| Ship Small 6 | Redundant with the Small Cog and Caravel. |
| Ship Small 7 | Redundant with the Felucca and credited purpose-built Dhow models. |
