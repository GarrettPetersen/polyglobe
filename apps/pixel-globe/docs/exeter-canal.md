# Exeter canal

At Topsham's inn, speak with Exeter's canal commissioner. Accept the commission
and deliver 30 timber, 12 iron and 20 grain, in as many deliveries as necessary.
Surplus cargo stays aboard. Full delivery starts construction on the actual game
clock. The lower cut opens after 30 days, the upper cut after 60, and the locks
and quay open Exeter to shipping after 90. The quest journal records outstanding
materials or remaining construction time; ordinary fetch reminders and cargo
warnings include the canal order.

This is a player-funded alternate-history project. The historical canal opened
in 1566, initially serving barges; later enlargements accommodated larger ships.
The game deliberately permits ordinary shipping on completion rather than
modeling the successive historical enlargements.
[Exeter canal history](https://friendsofexetershipcanal.co.uk/the-canal/history-of-the-canal/)

The subdivision-eight map uses a schematic two-segment west-bank bypass.
Its tile chain is geometry, not city identity, and is checked against the
canonical Exeter and Topsham placements. Completed cuts use the ordinary river
rendering and navigation masks. The final stage commissions the port, rather
than adding an artificial extra river segment.

Exeter remains an inland economic city before completion. Its maritime entry is
baked as a future `project` endpoint, with post-canal sailing distances and a
river city scene. The live sailing port list, tile index, arrival directions,
shipyards and NPC route catalog exclude it until completion. Opening adds a
shipyard and maritime market links without replacing existing stocks, specie,
industries or sovereignty. An in-flight worker generation is invalidated before
live infrastructure changes.

Game-state v105 persists acceptance and the construction start minute; partial
deliveries use the shared cargo-delivery ledger. Progress derives from saved game
time. Earlier saves start with no canal. Restoration applies canal geometry and
port membership before restoring derived economies, NPC routes and player ship
position. Loading an earlier voyage reinstates the original navigation masks.
Port-catalog v9 retains the v6-and-earlier Exeter-to-Topsham repair while keeping
new Exeter references distinct.

Verification includes all offered quest actions and their icons/staff roles,
partial and unavailable deliveries, day boundaries, real-map connectivity,
complete port-catalog validation at every stage, idempotent activation, market
preservation, frozen save migrations and browser scene/save/load round trips at
stages 0, 1, 2, 3 and back to 0. The browser check saves ships inside the new cuts,
opens Exeter's market, and runs in the regular save/restore smoke suite.
