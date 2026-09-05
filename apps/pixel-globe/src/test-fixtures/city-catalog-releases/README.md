# Frozen sailing endpoint releases

These fixtures record canonical city IDs and spatial references written by
released catalog versions. Never edit an existing version to match new geography.
`npm run catalog:update` verifies every historical reference and creates a new
fixture only after a version bump and valid migrations.

Initial fixtures were extracted from the released sailing bakes at:

- v1: `d609bad2^`, 306 endpoints.
- v2: `44cf1f86^`, 309 endpoints.
- v3: `d63a61a3^`, 309 endpoints.
- v4: `54bc2d1f`, 311 endpoints, independently resolved against live placement.

Older bakes stored names and tiles. Their canonical IDs were resolved from the
corresponding city scene catalog and the unchanged authored colony registry;
every name/country mapping was required to be unique. These names are absent
from the fixtures and never serve as runtime identity. Multiple observations
of the same port and colony site share the same canonical ID and tile.

The existing subdivision-seven migration fixtures remain responsible for the
earlier world topology. A later catalog release must satisfy both histories.
