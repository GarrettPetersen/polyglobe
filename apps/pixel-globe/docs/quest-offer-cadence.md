# Quest offer cadence

New work must have an explicit chance and a repeat interval. Accepted work,
required story steps, deliveries and rewards bypass new-offer cadence. Reloads
and repeated visits must not grant another roll in the same offer window.

`src/questOfferPolicies.js` owns the numeric policies. Ordinary port jobs retain
persisted per-city roll windows; new pirate, loan and investment opportunities use
voyage-seeded, issuer-specific windows. `arrivalOfferCadence.js` additionally limits
unsolicited pitches across ports, recording them in the saved decision journal.

| Family | New offer opportunity | Repeat restriction |
| --- | --- | --- |
| Cargo delivery | 32% weekly; first teaching delivery guaranteed | One roll per city/week |
| Passenger (including Hajj and regional diplomatic variants) | 12% weekly | One roll per city/week; active passenger slot |
| Envoy | 8% weekly | One roll per capital/week; separate envoy slot |
| Religious passengers | 45% candidate selection within passenger generation | Weekly offers, declined-period history, unique story progress |
| Capture warrant | 35% monthly baseline; historical targets have priority modifiers | Monthly offers; refused petitions have 30-day cooldown |
| Wokou hunt | 28% monthly | Monthly roll and active commission |
| Chef | 8% every 21 days | One campaign per voyage |
| Colonization | 12% every 14 days | Roll history and per-colony expedition/progress state |
| Ginger / matchlocks / longship | 35% weekly / 35% weekly / 20% monthly | Unique campaign completion and offer history |
| Pirate suppression | 20% monthly | 60 days after accepting; target within 1,500 sailing km |
| Pirate haven work | 50% monthly, split between revenge and nighttime pickup | 60 days per kind after accepting; one haven job active |
| Sovereign loan | 20% monthly | 180 days across **all** borrowers, including declined offers |
| Shipyard investment | 25% monthly | 60 days after opening a yard; one project at a time |
| Castaway / captive | 1/750 per eligible shore departure / 1/3 per eligible pirate defeat | 30 days after an offer, plus one active rescue of each kind |
| Tea race | Guaranteed during eligible spring season | One race per calendar year, tracked by annual quest ID |
| Papal commissions | Political matter generated every 300–480 days | Persisted next-action clock and one pending matter |
| Electoral missions | Guaranteed when an eligible election creates a mission | One election identity; declined offers suppressed for the weekly window |
| Authored campaigns (Exeter, naturalist, Hospitaller, conquistador) | Guaranteed at their designated trigger | Persistent story/offer-seen state; unaccepted arrival pitches separated by 60 days |
| Main quest and authored historical follow-ups | Selected campaign or unique historical event | Unique stage/event identity; never spawn another copy |

Pirate, loan and new-investment arrival pitches also share a 14-day pause. This
prevents visiting several ports from producing a barrage. Important first story
introductions and existing obligations do not use that shared pause.

When adding a quest family, declare its cadence, use a persisted roll/event
identity or the common offer-window function, and test repeated visits, reloads,
decline/accept boundaries and enabled-action eligibility. Do not throttle reward
collection or hide an already accepted quest behind a fresh probability roll.
