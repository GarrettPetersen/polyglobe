# Persisted game-state schema snapshots

Each version has a persisted-shape fingerprint and canonical states for every main
quest. The canonical states become automatic migration fixtures after the next
`GAME_STATE_VERSION` is released.

- Never edit or replace an existing snapshot.
- Persisted shape changes require incrementing `GAME_STATE_VERSION`.
- Add a migration from the previous version.
- Run `npm run freeze:save-schema` to create the new version's snapshot.
- The compatibility suite must migrate every earlier canonical state while
  preserving player identity, money, ship, campaign, and voyage seed.

The generator refuses to overwrite an existing version, preventing an accidental
schema change from being blessed without a version increment.
