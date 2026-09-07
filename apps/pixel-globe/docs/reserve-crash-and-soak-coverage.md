# Reserve lifecycle regression and soak coverage

The reported `capital-reserve:inca:0:sortie:1` crash is a fleet lifecycle error,
not a passenger or crew-name error. A worker snapshot could abolish a reserve
slot while carrying its old ship. The reconciler called this demobilization but
actually erased the reserve metadata and made the ship an ordinary, replaceable
warship. Its next arrival then invoked the regional destination picker. The
Andean reserve has only one eligible coastal home, Chan Chan (later Trujillo),
so it has no ordinary two-port patrol circuit.

Reserve orders deliberately support that geography. An abolished reserve must
retire its ships, not create autonomous patrols. Both live ownership changes and
worker snapshot application now follow that rule. Valid protected sorties retain
their existing slot protection. NPC snapshot v6 also repairs the specific v5
save artifact: detached generated reserve sorties and their impossible replacement
orders. Old generated IDs are interpreted only at this migration boundary, because
the old bug erased the identifying reserve metadata. Duplicate saved ship IDs
still fail validation. The frozen v5 Inca fixture was generated with the pre-fix
implementation, rather than by a mock destination picker.

The previous worker soak hard-coded neutral relations and open sovereign trade
access. Its merchant captures and resale did not mobilize, recall, or abolish
national reserves. Existing reserve tests asserted the erroneous detachment and
stopped before the next arrival. More hours of the same activity were not adequate
coverage of this transition.

Every playtest/soak cycle now runs `tools/playtest/reserve-campaign.mjs`:

- Inca, Portuguese, Ottoman, and Ming reserve mobilization and abolition, with
  and without a preserved visible ship.
- Advancement past the old arrival, save/load, and a production worker advance.
- Actual capital capture, naval rebasing, recapture, and recall for those realms.
- Mature historical worlds, including the Mughal succession and a world twelve
  years after the opening date, followed by production worker updates.

The continuing worker campaign now reads real diplomacy and sovereign access,
advances politics on its six-hour clock, synchronizes territorial transitions,
and uses the actual initial port catalog rather than every city-scene asset.
Future colonies and Exeter's unfinished canal are therefore not silently active.
Reports separately count reserve scenarios, capital losses, mature worlds, and
political events. Ordinary domain travel remains a materialization seam; this is
not a claim that every player activity or political combination is covered.

The same feedback also adds thirty-day standing explanations to politics. These
persist the most recent actual change per faction, including its cause, before
and after values, and time. Older saves start with no retrospective explanation.
Production call-site checks require an explicit cause. Independent capture
commissions now require a foothold within 2,500 sailing kilometres unless they
have a historical or reconquest priority. Explicitly declining a warrant clears
it and permits ordinary inn work again. Already accepted commissions are retained;
Chillicothe remains reachable through the Scioto, Ohio, and Mississippi.
