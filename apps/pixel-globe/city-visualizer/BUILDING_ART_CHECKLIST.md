# Port building art checklist

This checklist tracks the building art needed for the first complete set of port
visual styles. It counts an independently placeable scene sprite as one piece.
Repeated market stalls count once, while the three touching fortification layers
count separately because the visualizer positions and draws them independently.

## Count

- **8 functional building families**: Home A, Home B, inn, item store/smith,
  market, shipyard, religious landmark, and fortifications.
- **10 authored pieces per regional kit**: two homes, five other buildings, and
  three fortification sections.
- **6 initial regional kits = 60 normal-state coverage slots.**
- **29 slots are already drawn or supplied by documented shared sprites and regional palette swaps**
  across the regional kits, leaving **31
  normal-state slots** to complete.
- Bombardment is a **single procedural rendering system**, not another 60
  hand-drawn slots. Door, fire, smoke, gate-opening, and exceptional collapsed
  states are not included in the building count.

Shared art may satisfy more than one slot. In particular, the generic Christian
church is intended for any Christian port rather than being redrawn for every
region.

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

- [x] Home A
- [x] Home B
- [x] Inn
- [x] Item store / smith
- [x] Market stall
- [x] Shipyard
- [x] Generic Christian stone church
- [x] Far castle wall
- [x] Gatehouse / gate
- [x] Near castle wall

## Mediterranean

- [x] Home A
- [x] Home B
- [x] Inn
- [x] Item store / smith
- [x] Market stall — reuse the global timber market stall
- [x] Shipyard — reuse the global timber shipyard
- [x] Religious landmark — reuse the generic Christian stone church
- [x] Far castle wall — reuse Northern geometry with the limestone palette swap
- [x] Gatehouse / gate — reuse Northern geometry with the limestone palette swap
- [x] Near castle wall — reuse Northern geometry with the limestone palette swap

## Middle Eastern

- [ ] Home A
- [ ] Home B
- [x] Inn
- [ ] Item store / smith
- [x] Market stall — reuse the global timber market stall
- [x] Shipyard — reuse the global timber shipyard
- [ ] Mosque — reuse the generic church in Christian ports
- [ ] Far castle wall
- [ ] Gatehouse / gate
- [ ] Near castle wall

## Primitive / village

- [ ] Home A
- [ ] Home B
- [ ] Inn or communal house
- [ ] Item store / craft workshop
- [x] Market stall — reuse the global timber market stall
- [x] Shipyard / boatbuilding beach — reuse the global timber shipyard
- [ ] Sacred or communal landmark — reuse the generic church for Christian colonies
- [ ] Far palisade / defensive wall
- [ ] Gate
- [ ] Near palisade / defensive wall

## Chinese / Korean

Use one shared initial kit for Chinese and Korean ports. Both traditions support
the same broad timber-frame, stone-base, and tiled-roof language at this scale.
Later Korean alternates should emphasize lower roof profiles, mud walls, and
thatch without blocking the first world-coverage pass.

- [ ] Home A
- [ ] Home B
- [ ] Inn
- [ ] Item store / smith
- [x] Market stall — reuse the global timber market stall
- [x] Shipyard — reuse the global timber shipyard
- [ ] Temple or shrine — reuse the generic church in Christian ports
- [ ] Far castle wall
- [ ] Gatehouse / gate
- [ ] Near castle wall

## Japanese

Keep Japan separate from the Chinese/Korean kit. Its stronger dark-timber and
white-plaster contrast, roof massing, deep eaves, and layered wooden
fortifications need distinct silhouettes rather than a palette swap.

- [ ] Home A
- [ ] Home B
- [ ] Inn
- [ ] Item store / smith
- [x] Market stall — reuse the global timber market stall
- [x] Shipyard — reuse the global timber shipyard
- [ ] Buddhist temple or Shinto shrine — reuse the generic church in Christian ports
- [ ] Far castle wall
- [ ] Gatehouse / gate
- [ ] Near castle wall

## Required animation, weather, and damage systems

These are reusable systems or additional states, not additional building
families.

- [ ] Parallax cloud layers driven by variable weather, with clear, fair,
  overcast, and storm coverage
- [ ] Inn open-door state
- [ ] Inn occupied/fire animation
- [ ] Near gate frame that allows NPCs to walk through the opening
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
- [ ] Optionally hand-author rare fully collapsed states for major landmarks
- [ ] Recheck chimney locations and smoke intensity after each regional replacement
- [ ] Recheck castle and foreground shadows after each regional replacement

The procedural background city reuses scaled Home A, Home B, inn, and smith
sprites. It does not require separate building drawings, but every regional kit
must remain readable at half scale and below.

## Later regional splits

The initial six kits can be divided when broader world coverage needs stronger
local identity. Each new kit adds up to ten coverage slots, although the generic
church and other shared landmarks can be reused.

- [ ] South Asian
- [ ] Southeast Asian
- [ ] Mesoamerican
- [ ] Andean
- [ ] Sub-Saharan African
- [ ] Native North American
- [ ] Polynesian / Pacific village
- [ ] Promote the Chinese/Korean kit into a separate Korean kit when the shared
  version no longer reads correctly
