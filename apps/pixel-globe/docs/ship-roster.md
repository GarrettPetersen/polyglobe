# Pixel Globe Ship Roster

The Unity asset pack labels the vessels generically, so this roster assigns game-facing names from the baked silhouettes. These are practical identifications, not museum-catalog claims. The strongest calls are the junks, dhows/feluccas, xebec, galleon, frigate, and pirate brigantine. The most uncertain calls are some stylized generic European merchant/naval ships.

Generated fleet sprites live in `apps/pixel-globe/public/assets/vehicles/unity-ships/` and use filenames like `{filename slug}-16-headings.png`, with matching `-light`, `-shade`, `-shadow`, `-preview`, and `-lighting-preview` sheets.

The fleet bake preserves source-relative ship sizes with a compressed readability curve, so boats remain smaller than large ocean-going ships without disappearing at 36px.

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

Skipped source assets:

| Source asset label | Reason |
|---|---|
| Viking Ship 1-4 | Wrong era for the current sailing roster. |
| Water | Environment prop, not a ship. |
