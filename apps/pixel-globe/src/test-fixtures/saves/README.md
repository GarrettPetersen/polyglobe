# Save compatibility fixtures

These files represent save data already written by a released or playtest build.

- Never edit an existing fixture to make a migration test pass.
- Add a new fixture before increasing any persisted schema version.
- Update migration code until every fixture loads through `migrateSavedVoyageCore`.
- Keep player identity, money, campaign progress, navigation, hull condition, and clock data intact during migration.

The fixtures deliberately remain ordinary JSON so they exercise the same serialization boundary as browser storage.
