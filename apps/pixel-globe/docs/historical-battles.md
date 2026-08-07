# Historical Battles

Historical battles use a deterministic flat-map simulation that is separate from the voyage world. The first scenario is Lepanto (7 October 1571), with 314 Holy League vessels and 272 Ottoman vessels in the expanded order of battle.

## Architecture

- The simulation advances at a fixed 20 Hz. Rendering may run at any frame rate without changing the result.
- Player input is quantized into compact, tick-stamped commands. A later multiplayer transport can exchange these commands instead of synchronizing canvas or world state.
- Ships remain individual combatants but belong to authored squadrons. A squadron follows its current leader until enemies are close enough to break formation.
- A rebuilt spatial grid handles target acquisition and local separation. No ship performs an all-fleet distance scan.
- The flat map owns collision and authored geography. It has no globe projection, voyage simulation, economy, weather bake, whales, carts, or distant NPC routes.
- Rendering should consume local visibility snapshots and cull the rest of the fleet. The simulation never treats screen coordinates as authoritative.

## Lepanto Order Of Battle

The battle line uses the commonly cited 206 Holy League galleys plus six Venetian galleasses against 216 Ottoman galleys and 56 galliots. The Holy League also fields Cesare d'Avalos's independent squadron of 24 Spanish galleons and two Venetian carracks, plus 76 light auxiliaries and dispatch vessels: 50 Spanish, 20 Venetian, and six Papal fustas. The divisions and commanders follow the historical left, center, right, reserve, galleass vanguard, sailing squadron, and auxiliary arrangement. Fustas provide the dedicated light-galley silhouette for both League auxiliaries and Ottoman galliots.

Useful references:

- [Spanish Army Museum: Battle of Lepanto](https://ejercito.defensa.gob.es/museo/en/HECHOS_HISTORICOS/HECHOS_HISTORICOS/10.07_octubre._LA_BATALLA_DE_LEPANTO.html)
- [Royal Museums Greenwich: The Battle of Lepanto](https://www.rmg.co.uk/collections/objects/rmgc-object-11753)
- [Order-of-battle roster study](https://hrcak.srce.hr/en/clanak/112674)

Run `npm run benchmark:lepanto` to simulate up to three minutes of the 586-ship engagement without rendering.
