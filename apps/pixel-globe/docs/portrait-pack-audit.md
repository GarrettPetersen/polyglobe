# Portrait Pack Audit

The CaptainSkolot bundle was reviewed visually for portraits that fit the game's 1522 setting. Store category names are not treated as sufficient evidence: individual sprites are admitted only when their clothing, equipment, and presentation do not read as obviously modern or fantastic.

## In Production

- Existing medieval and maritime packs: villagers, peasants, blacksmiths, knights, nobles, pirates, Vikings, and the Ultimate Medieval Village set.
- Women Black Hair Portrait: expressive East Asian noble/civilian.
- Merchant Portrait: expressive European and Mediterranean factor/civilian.
- Warrior with Beard: expressive European and Mediterranean captain/warrior.
- Curated fantasy-pack portraits: bald monk, armored soldier, mercenary warrior, young warrior, and old scholar. Only these mundane figures are copied into the build.

## Excluded

- Modern soldiers, women soldiers, mafia, cowboys, and astronauts: visibly anachronistic.
- Orcs, elves, dragons, animals, snowmen, and most magic heroes: visibly fantastic.
- Christmas portraits: seasonal modern styling.
- Game Boy portraits: incompatible monochrome art direction.
- Women Master Chef portraits: modern anime styling and conspicuous fantasy hair colors.

The source archives and `.aseprite` files are intentionally not shipped. The public build contains only selected native 64x64 PNG frames.

## September 2026 review and save migration

The complete 308-source catalogue was reviewed as contact sheets. Twenty-eight
sources are now retired: Viking male 3 (the reported gray-haired figure with animal
ears), Viking male 5 (animal-head hood), the flower-hatted Women Peasant expression
set, and 25 entries in the generic Women Portrait grid. The latter contain elf ears,
visible magic, fedora-like hats, picture hats, or conspicuously later frilled maid
and high-collared fashion costumes. Five mundane figures in that grid remain.
These are visual art-direction judgments; a small sprite cannot establish a precise
garment date. Reference comparisons include the Met's [1930s fedora-form hat](https://www.metmuseum.org/art/collection/search/156538)
and [1898–1903 straw, silk and feather hat](https://www.metmuseum.org/art/collection/search/84650).
The existing pirate silhouettes and the historical enthusiast's costume remain.

`src/retiredCharacterPortraits.js` records each excluded canonical source ID, its
specific reason, and a same-sex replacement. The generator excludes those sources,
and runtime catalogue validation rejects their reintroduction. Original purchased
source packs stay available for authoring; excluded frames never enter the shipped
portrait atlas. The game now has 280 approved sources.

Save loading replaces the appearance, including every expression/atlas reference,
without regenerating the person. IDs, names, culture, religion, age, birthday,
abilities and relationship/quest history remain intact. The replacement's age range
controls future character generation; it must not rejuvenate an existing person on
subsequent loads. Unknown source IDs and missing replacement targets still fail
explicitly. Frozen v22 source fixtures test all 28 retirements, nested/shared
character references and repeated save/load cycles. Keep the retirement mappings
while those saved source IDs are supported.
