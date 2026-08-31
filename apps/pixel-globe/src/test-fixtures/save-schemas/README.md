# Persisted game-state schema snapshots

Each version has a persisted-shape fingerprint, canonical states for every main
quest, and—starting with version 94—a dense serialized local save containing every
registered durable event kind. The fixtures become automatic migration tests after
the next `GAME_STATE_VERSION` is released.

- Never edit or replace an existing snapshot.
- Persisted shape changes require incrementing `GAME_STATE_VERSION`.
- Add a migration from the previous version.
- Run `npm run freeze:save-schema` to create the new version's snapshot.
- The compatibility suite must migrate every earlier canonical state while
  preserving player identity, money, ship, campaign, and voyage seed.
- Never add a durable event kind without adding it to its exported kind registry;
  the dense-save coverage test will then require a serialized example.

The generator refuses to overwrite an existing version, preventing an accidental
schema change from being blessed without a version increment.
