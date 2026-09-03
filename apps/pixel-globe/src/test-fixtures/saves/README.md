# Save compatibility fixtures

The dense files are frozen synthetic snapshots of released save-schema shapes.
`local-save-v1-game-state-v37.json` is an older, narrower synthetic schema fixture:
it deliberately uses stand-in port tiles 4242 and 5151, so it tests core schema
migration with an explicit identity resolver but is not a browser-runtime fixture.

- Never edit an existing fixture to make a migration test pass.
- Add a new fixture before increasing any persisted schema version.
- Update migration code until every fixture loads through `migrateSavedVoyageCore`.
- Keep player identity, money, campaign progress, navigation, hull condition, and clock data intact during migration.

The fixtures deliberately remain ordinary JSON so they exercise the same serialization boundary as browser storage.

Starting with game-state version 94, `npm run freeze:save-schema` also writes one
`dense-local-save-...json` fixture. It contains every registered persisted political
and conquest event kind and canonical port-keyed memory. The compatibility suite
loads every fixture through local storage, core migration, and world identity
reconciliation. The deployment smoke additionally adapts every dense fixture at
the browser-test boundary, then continues each one through the
production browser bootstrap, runtime chart assembly, first gameplay render, and
persistence rewrite.

Dense fixtures frozen through version 97 used the sentinel player name “Dense
Save Captain,” whose surname is intentionally absent from the historical English
name catalog and which has no portrait source. The browser harness replaces only
that exact sentinel identity with the generator's current valid “Jane Smith”
player-captain identity and its authored portrait source. Frozen files remain
immutable; new dense fixtures are generated with the valid identity directly.
