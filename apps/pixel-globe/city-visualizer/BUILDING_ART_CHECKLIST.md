# Port building art checklist

This checklist tracks the building art needed for the first complete set of port
visual styles. It counts an independently placeable scene sprite as one piece.
Repeated market stalls count once, while the three touching fortification layers
count separately because the visualizer positions and draws them independently.

## Current count

- **8 functional building families**: Home A, Home B, inn, item store/smith,
  market, shipyard, religious landmark, and fortifications.
- **10 authored pieces per regional kit**: two homes, five other buildings, and
  three fortification sections.
- **6 initial regional kits = 60 normal-state coverage slots.**
- **47 slots are resolved** by authored art, a documented shared sprite/palette
  swap, or a deliberate omission. **13 normal-state slots still need art.**
- Bombardment is a **single procedural rendering system**, not another 60
  hand-drawn slots. Door, fire, smoke, gate-opening, and exceptional collapsed
  states are not included in the building count.

Shared art may satisfy more than one slot. In particular, the generic Christian
church is intended for any Christian port rather than being redrawn for every
region.

| Initial kit | Resolved | Still to draw |
| --- | ---: | ---: |
| Northern European | 10 | 0 |
| Mediterranean | 10 | 0 |
| Middle Eastern | 9 | 1 |
| Primitive / village | 10 | 0 |
| Chinese / Korean | 3 | 7 |
| Japanese | 5 | 5 |
| **Total** | **47** | **13** |

Checklist labels are intentional:

- **AUTHORED** means unique source art exists and is wired into the visualizer.
- **SHARED** means the slot is complete with an existing global sprite or a
  documented runtime palette swap.
- **OMIT** means we have decided not to draw or display that building for this
  kit. It still counts as resolved world-coverage behavior.
- **DRAW** is one of the 17 pieces still required for the initial 60-slot pass.
- **LATER** is outside the initial 60 and does not count toward the 17.

## What needs drawing now

1. **Middle Eastern Home B** — one alternate flat-roofed home. This completes
   the Middle Eastern kit.
2. **Chinese / Korean kit — 7 pieces:** Home B, inn, smith, temple or shrine,
   far wall, gatehouse, and near wall.
3. **Japanese kit — 5 pieces:** Home B, Buddhist temple or Shinto shrine, far
   wall, gatehouse, and near wall.

That is the complete **13-piece current art queue**. The Chinese/Korean and
Japanese market stalls and shipyards are already covered by the shared global
sprites.

The market stall and shipyard are also global functional sprites. Their rough
timber construction is culturally neutral at this scale: the market is a simple
wooden stall with an awning, while the shipyard is an arrangement of posts,
timbers, and boatbuilding equipment beside the water. Regional identity comes
from the buildings, skyline landmark, terrain, props, and fortifications around
them rather than from redrawing these two structures.

Scene placement is modular: any complete building sprite can occupy any normal
building slot. The gatehouse is the exception; its three-piece composition stays
fixed at the end of the street because the partial building implies the city
continues beyond the visible scene.

The environment kit also includes **11 authored individual trees with matching
shadows**: black pine, cedar, cypress, Douglas fir, fir, palm, juniper, larch,
Scots pine, spruce, and yew. The visualizer selects these sparsely from regional,
latitude, and nearby-terrain rules. Individual trees mix near-foreground props
with smaller specimens behind the quay buildings; only the continuous forest
mass belongs at the horizon distance. Some river scenes also place a regional
tree on the left foreground bank, but only when the production terrain scan
finds forest, jungle, conifer, or broadleaf tree-cover tiles on that side.

## Piece contract for every regional kit

1. Home A
2. Home B
3. Inn
4. Item store / smith
5. Market stall
6. Shipyard
7. Religious or skyline landmark
8. Far castle wall
9. Gatehouse / gate
10. Near castle wall

The three fortification pieces must retain compatible joins and matching
silhouettes across regions. Unfortified cities simply omit all three.

## Reusable regional palette swaps

These runtime swaps are part of the art contract. If a source sprite is
replaced, preserve its listed source colors or update both the mapping in
`cityRegionalPalette.js` and its tests. All target colors are from Resurrect 64.

### Mediterranean fortifications

The Northern European Far Castle, Gate, and Near Castle geometry is reused with
this four-color limestone ramp:

| Northern source | Mediterranean target |
| --- | --- |
| `#3e3546` | `#625565` |
| `#625565` | `#966c6c` |
| `#7f708a` | `#ab947a` |
| `#9babb2` | `#c7dcd0` |

The current Far Castle export also contains `#655565`, a near-duplicate of
`#625565`; the runtime normalizes it to the same `#966c6c` target.

### Mediterranean Christian church roof

Only the two red roof colors change. Walls, masonry, openings, and the cross
remain untouched:

| Shared church source | Mediterranean target |
| --- | --- |
| `#6e2727` | `#9e4539` |
| `#b33831` | `#cd683d` |

Reserve the brighter `#e6904e` for small edge highlights; broad sunlit roof
planes use `#cd683d`.

## Northern European

- [x] Home A — **AUTHORED**
- [x] Home B — **AUTHORED**
- [x] Inn — **AUTHORED**
- [x] Item store / smith — **AUTHORED**
- [x] Market stall — **AUTHORED**, also the global shared market
- [x] Shipyard — **AUTHORED**, also the global shared shipyard
- [x] Generic Christian stone church — **AUTHORED**, shared by Christian ports
- [x] Far castle wall — **AUTHORED**
- [x] Gatehouse / gate — **AUTHORED**
- [x] Near castle wall — **AUTHORED**

## Mediterranean

- [x] Home A — **AUTHORED**
- [x] Home B — **AUTHORED**
- [x] Inn — **AUTHORED**
- [x] Item store / smith — **AUTHORED**
- [x] Market stall — **SHARED**, global timber market stall
- [x] Shipyard — **SHARED**, global timber shipyard
- [x] Religious landmark — **SHARED**, generic Christian stone church with the
  documented terracotta roof swap
- [x] Far castle wall — **SHARED**, Northern geometry with the limestone palette swap
- [x] Gatehouse / gate — **SHARED**, Northern geometry with the limestone palette swap
- [x] Near castle wall — **SHARED**, Northern geometry with the limestone palette swap

## Middle Eastern

- [x] Home A — **AUTHORED**
- [ ] Home B — **DRAW**; Home A is temporarily reused in this slot
- [x] Inn — **AUTHORED**
- [x] Item store / smith — **AUTHORED**
- [x] Market stall — **SHARED**, global timber market stall
- [x] Shipyard — **SHARED**, global timber shipyard
- [x] Mosque — **AUTHORED** for Islamic ports; Christian ports use the shared church
- [x] Far castle wall — **AUTHORED**
- [x] Gatehouse / gate — **AUTHORED**
- [x] Near castle wall — **AUTHORED**

## Primitive / village

This is implemented as the `earthen-village` scene style. Every catalog entry
whose settlement type is `village` uses repeated copies of the two huts plus a
restrained pair of global market stalls. They deliberately have no inn, smith,
religious landmark, or fortification; a visible shipyard is
reserved for larger villages and can later be overridden in city JSON. The
background-city flag defaults off but remains explicit city data for exceptional
larger settlements.

- [x] Home A — **AUTHORED**, small earthen hut
- [x] Home B — **AUTHORED**, large earthen hut
- [x] Inn — **OMIT**; use another hut as non-interactive scene mass
- [x] Item store / smith — **OMIT**; use another hut as non-interactive scene mass
- [x] Market stall — **SHARED**, restrained use of the global timber market stall
- [x] Shipyard / boatbuilding beach — **SHARED CONDITIONALLY** for larger villages
- [x] Religious landmark — **OMIT** from the generic sparse-village profile
- [x] Far defensive wall — **OMIT** from the generic sparse-village profile
- [x] Gate — **OMIT** from the generic sparse-village profile
- [x] Near defensive wall — **OMIT** from the generic sparse-village profile

Swahili Coast ports are a deliberate hybrid rather than sparse villages. Their
housing pool provisionally uses the earthen huts, while service buildings,
mosques, and fortifications use the Middle Eastern visual language. This
reflects the documented mixture of earthen and coral-stone construction and
African, Arab, Persian, and Indian influence at Kilwa, while keeping the three
concepts independently overridable per city. See the
[Met overview of Kilwa and Songo Mnara](https://www.metmuseum.org/ru/perspectives/kilwa-kisiwani-songo-mnara)
and [UNESCO site history](https://whc.unesco.org/en/list/144).

## Chinese / Korean

Use one shared initial kit for Chinese and Korean ports. Both traditions support
the same broad timber-frame, stone-base, and tiled-roof language at this scale.
Later Korean alternates should emphasize lower roof profiles, mud walls, and
thatch without blocking the first world-coverage pass.

- [x] Home A — **AUTHORED**, shared by Ming Chinese and Joseon Korean cities
- [ ] Home B — **DRAW**
- [ ] Inn — **DRAW**
- [ ] Item store / smith — **DRAW**
- [x] Market stall — **SHARED**, global timber market stall
- [x] Shipyard — **SHARED**, global timber shipyard
- [ ] Temple or shrine — **DRAW**; Christian ports use the shared church
- [ ] Far castle wall — **DRAW**
- [ ] Gatehouse / gate — **DRAW**
- [ ] Near castle wall — **DRAW**

## Japanese

Keep Japan separate from the Chinese/Korean kit. Its stronger dark-timber and
white-plaster contrast, roof massing, deep eaves, and layered wooden
fortifications need distinct silhouettes rather than a palette swap.

- [x] Home A — **AUTHORED**
- [ ] Home B — **DRAW**
- [x] Inn — **AUTHORED**
- [x] Item store / smith — **AUTHORED**
- [x] Market stall — **SHARED**, global timber market stall
- [x] Shipyard — **SHARED**, global timber shipyard
- [ ] Buddhist temple or Shinto shrine — **DRAW**; Christian ports use the shared church
- [ ] Far castle wall — **DRAW**
- [ ] Gatehouse / gate — **DRAW**
- [ ] Near castle wall — **DRAW**

## Art we have explicitly decided not to draw

These decisions are part of the checklist, not missing work:

- [x] Regional market-stall variants — **OMIT**; keep the global timber stall.
- [x] Regional shipyard variants — **OMIT**; keep the global timber shipyard.
- [x] A separate Mediterranean church — **OMIT**; use the generic Christian
  church with the documented terracotta roof swap.
- [x] Separate Mediterranean fortification silhouettes — **OMIT**; use the
  Northern geometry with the documented limestone palette swap.
- [x] Generic sparse-village inns, smiths, religious landmarks, and
  fortifications — **OMIT**; the sparse scene is huts, market stalls, and an
  optional shipyard. Historically important exceptions belong in per-city JSON
  or a later regional kit, not in every village.
- [x] Sixty hand-drawn bombarded building variants — **OMIT**; build one
  procedural damage system that works on every completed sprite.
- [x] Separate background-city building sprites — **OMIT**; the skyline reuses
  scaled regional homes, inns, smiths, and religious landmarks.

## Required animation, weather, and damage systems

These are reusable systems or additional states, not additional building
families.

- [x] Three authored parallax cloud layers drift with the shared city wind
- [x] Shared wind direction and speed drive clouds, chimney smoke, and flags
- [ ] Weather-state cloud coverage controls for clear, fair, overcast, and storm
- [ ] Inn open-door state
- [ ] Inn occupied/fire animation
- [ ] Near gate frame that allows NPCs to walk through the opening
- [x] Manual bombarded art for every building — **OMIT** in favor of the
  procedural system below
- [ ] Deterministic procedural bombardment seeded by city, building slot, and
  bombardment event
- [ ] Select impact points only on substantial opaque wall or roof regions
- [ ] Protect foundations, required doors, and walkable gate openings from
  nonsensical cuts
- [ ] Remove irregular pixel clusters rather than smooth circles
- [ ] Darken the surviving one- or two-pixel impact rim with Resurrect 64 char
  colors
- [ ] Draw existing fire and smoke assets behind openings so they show through
  the removed pixels
- [ ] Add restrained procedural rubble at the base of damaged buildings
- [ ] Support stable damage severity levels without rerolling the pattern on
  scene reload
- [ ] Verify pixel-perfect damage results across every completed building sprite
- **LATER:** optionally hand-author rare fully collapsed states for major landmarks
- [ ] Recheck chimney locations and smoke intensity after each regional replacement
- [ ] Recheck castle and foreground shadows after each regional replacement

The procedural background city reuses scaled Home A, Home B, inn, and smith
sprites. It does not require separate building drawings, but every regional kit
must remain readable at half scale and below.

## Required city data and game integration

These tasks are outside the 60-piece art count:

- [x] Generate a JSON record for every water-accessible city currently in the
  game
- [x] Derive baseline population/settlement scale, region, river or ocean
  approach, dock type, nearby terrain, mountain visibility, religion,
  landmarks, fortification estimate, architecture, services, and background
  city state from production game data
- [x] Support explicit architecture, service, background-city, and developed-
  opposite-bank values in city scene data
- [ ] Audit every generated city scene and add explicit per-city overrides where
  the geographic or cultural default is wrong
- [ ] Historically review fortifications, important religious landmarks,
  developed opposite banks, and major service omissions for the game's era
- [ ] Define dated/stateful overrides so colonies and other cities can grow,
  acquire buildings, change control, or retain bombardment damage during play
- [ ] Wire building hover/click targets to the existing port modals and replace
  the present city menu with the visual scene
- [ ] Build the city-storming encounter on the same walkable dock-road-gate lane
  after the visualizer is integrated

## Later regional splits

The initial six kits can be divided when broader world coverage needs stronger
local identity. Each new kit adds up to ten coverage slots, although the generic
church and other shared landmarks can be reused.

- **LATER — South Asian:** likely needs a distinct urban kit rather than being
  treated as Middle Eastern.
- **LATER — Southeast Asian:** likely needs a distinct urban kit.
- **LATER — Mesoamerican:** the generic hut scene covers sparse villages only;
  major cities need monumental masonry and their own landmarks.
- **LATER — Andean:** the generic hut scene covers sparse villages only; major
  cities need masonry and their own landmarks.
- **LATER — Sub-Saharan African:** retain the sparse hut profile where it fits,
  but add specific urban traditions rather than treating the continent as one
  visual culture.
- **LATER — Native North American:** add local village forms where the current
  earthen huts do not fit.
- **LATER — Polynesian / Pacific:** the sparse scene logic exists, but the
  earthen hut art should eventually be replaced with a locally appropriate kit.
- **LATER — Korean:** split it from the Chinese kit when the shared timber-and-
  tile kit no longer reads correctly; emphasize lower roof profiles, mud walls,
  and thatch.
