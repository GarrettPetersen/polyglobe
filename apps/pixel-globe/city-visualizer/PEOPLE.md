# City people boundary

The city people catalog is deliberately split into three identities:

- `archetypeId` identifies an authored animation silhouette and its source file.
- `appearanceId` identifies one production palette variant of that silhouette.
- `populationProfileId` identifies the weighted ambient and garrison pools available to a location.

The visualizer creates deterministic scene-only IDs such as
`london|united kingdom:street-person:1`. These make rendering stable but are not
saved people and must never become recruit identity.

When recruitment is implemented, each generated or authored recruit receives a
canonical `personId`. A separate `warriorProfileId` should own base attack,
defense, HP, attack type, and the level progression that changes those values.
Sailing abilities and other recruit traits should be independent trait or skill
IDs. Neither combat statistics nor recruitment state belongs in the appearance
or location catalogs.
