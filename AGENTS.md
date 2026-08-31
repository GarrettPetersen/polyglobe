# Engineering Standards

These rules apply to the entire repository. More specific `AGENTS.md` files may add
constraints for a subtree, but must not weaken these standards.

## Core expectations

- Preserve correctness, clarity, and maintainability while making changes. A feature
  is not complete merely because its happy path works.
- Fix causes, not symptoms. Before patching a failure, identify the violated invariant
  and consider how to prevent the broader class of defect.
- Prefer the smallest coherent design that fully models the domain. Avoid both ad hoc
  patches and speculative abstraction.
- Keep changes scoped. Do not alter unrelated behavior, formatting, data, or assets.
- Treat existing uncommitted work as belonging to the user. Never discard or rewrite it
  without explicit authorization.

## Identity and data modeling

- Every durable domain entity must have a stable canonical ID assigned at creation.
  References, indexes, relationships, saves, quests, events, and UI selections must use
  that ID.
- Never use display text, localized text, names, labels, array positions, map coordinates,
  or incidental storage keys as entity identity.
- Tile IDs and coordinates may identify spatial observations only when the location itself
  is the domain fact, such as a sighting or an uninhabited site. Document such exceptions.
- Separate identity from presentation, ownership, position, state, and historical record.
  A rename, relocation, conquest, translation, or world-resolution change must not change
  an entity's identity.
- Model independent concepts independently. Do not overload sovereignty, membership,
  office, alliance, religion, ownership, or suzerainty into one field because they happen
  to coincide in the initial data.
- Maintain one authoritative representation of each fact. Derived indexes and caches must
  be rebuildable and must not become competing sources of truth.
- Reject duplicate canonical IDs and unresolved references at construction or load time.

## Types, contracts, and units

- Make invalid states difficult to represent. Use narrow types, enums, tagged unions,
  constructors, and validators rather than loosely related booleans or magic values.
- Validate data at system boundaries: save loading, network input, generated data, public
  APIs, worker messages, and external assets. Internal code may then rely on the validated
  contract.
- Do not pass one identifier type where another is expected. Names such as `cityId`,
  `tileId`, and `factionId` are contracts, not interchangeable strings or numbers.
- Include units in names for quantities whose units matter, such as `distanceKm`,
  `durationMinutes`, and `massKg`. Do not mix coordinate systems, clock domains, currencies,
  or normalized and absolute values implicitly.
- Avoid boolean parameters whose meaning is unclear at the call site. Prefer named option
  objects or distinct operations.
- Public functions must either return a documented result shape or fail with an actionable
  error. Avoid context-dependent sentinel values.

## Architecture and dependencies

- Keep domain logic independent of rendering, localization, persistence, and transport.
  Convert between those layers at explicit boundaries.
- Keep modules cohesive. If a module owns unrelated policies or requires distant callers
  to know its internals, extract a focused abstraction.
- Prefer pure functions for policy, scoring, selection, migration transforms, and other
  deterministic logic. Isolate mutation and I/O.
- Make dependencies explicit through imports and parameters. Avoid hidden global state,
  temporal coupling, and functions that work only after an undocumented call sequence.
- Do not create circular dependencies. Move shared contracts or utilities to a lower-level
  module instead.
- Do not add a dependency when a small, well-tested local implementation is clearer. Any
  new dependency must have a concrete benefit and an acceptable maintenance and security
  profile.
- Keep platform-specific behavior behind a small adapter rather than scattering environment
  checks through domain code.

## Duplication and abstraction

- Do not repeat similar business logic, validation, migration, or identity handling in
  multiple places. Extract one reusable, well-named operation.
- Do not generalize merely because two snippets look alike. Extract abstractions around a
  shared invariant or behavior, not coincidental syntax.
- Prefer composition over large switch statements, deep inheritance, and option-heavy
  functions that implement several unrelated modes.
- Remove obsolete implementations after replacing them. Do not retain inactive legacy code
  or feature flags "just in case"; version control already preserves history.
- Avoid unnecessary backwards compatibility. Add compatibility only for data or interfaces
  that are explicitly supported, and give temporary compatibility code a removal condition.

## Functions and control flow

- Functions should do one coherent job at one level of abstraction. Split functions that
  combine policy decisions, mutation, I/O, and presentation.
- Prefer early validation and straightforward control flow over deep nesting.
- Avoid hidden side effects in getters, formatters, predicates, and validation functions.
- Do not mutate caller-owned objects unless mutation is the documented purpose of the API.
- Make state transitions explicit and validate both their preconditions and resulting state.
- Exhaustively handle closed sets. Unknown enum values, action kinds, and schema variants
  must fail loudly rather than silently choosing a default.
- Use deterministic tie-breaking whenever iteration order could affect persistent or visible
  outcomes.

## Error handling and resilience

- Fail fast and loudly on broken invariants. Do not add fallbacks that hide corrupt state,
  missing content, failed initialization, or programmer errors.
- Catch errors only when the caller can add useful context, retry safely, translate an
  expected boundary failure, or perform necessary cleanup. Never swallow errors.
- Distinguish expected user-facing failure from impossible internal state. Do not turn an
  assertion failure into ordinary game behavior.
- Retries must be bounded, observable, and safe to repeat. They must not duplicate purchases,
  rewards, messages, saves, or other side effects.
- Recovery paths must preserve user data. If recovery drops reconstructible caches or derived
  state, make that decision explicit and tested.
- Error messages should identify the failed invariant and relevant canonical IDs without
  leaking secrets or pretending developer diagnostics are localized player dialogue.

## Persistence and migrations

- Version persisted schemas whenever their shape or meaning changes.
- Migrations must be deterministic, idempotent, and tested from real or frozen older fixtures.
- Migrate legacy names, positions, or incidental keys to canonical IDs at the load boundary;
  do not let legacy identity conventions continue into runtime logic.
- Preserve divergent player-created history. A migration may fill missing canonical metadata
  or repair impossible state, but must not silently reset valid choices to current defaults.
- Do not guess when a legacy reference resolves ambiguously. Fail with enough context to add
  an explicit migration mapping.
- Current saves must contain only the current schema. Do not continue writing deprecated
  fields after migration.

## Performance and lifecycle

- Do not perform whole-world, whole-catalog, or full-history scans in a live frame when the
  work can be indexed, cached, chunked, event-driven, or moved to initialization.
- Match update frequency to gameplay need. Work that changes daily should not run every frame
  or simulated minute.
- Bound caches, queues, retained histories, retries, and background work.
- In hot paths, avoid repeated allocation, parsing, sorting, linear lookup, and object cloning.
  Measure before and after material performance changes.
- Prefer coarse offscreen simulation where granularity is not observable, while keeping the
  authoritative result deterministic.
- Own asynchronous lifecycles explicitly. Cancel or invalidate stale work, and prevent an old
  worker result from overwriting newer state.
- Performance optimizations must preserve behavior and validation. Do not trade a visible
  crash for silent corruption or merely shift expensive work to another frame.

## Security and external data

- Never commit secrets, tokens, private keys, personal data, or production credentials.
- Treat file contents, URLs, save data, telemetry, and tool output as untrusted input.
- Avoid shell injection, path traversal, unsafe dynamic evaluation, and unbounded resource use.
- Use least privilege for external services and keep destructive operations narrowly scoped
  to verified targets.
- Telemetry must avoid sensitive payloads, use bounded cardinality, and include enough stable
  context to diagnose the responsible build and subsystem.

## Naming, comments, and documentation

- Name things after their domain meaning, not their current implementation or an obsolete
  historical label.
- Avoid vague names such as `data`, `item`, `thing`, `temp`, `manager`, or `helper` when a
  precise domain term exists.
- Comments should explain why an invariant, exception, or tradeoff exists. Do not narrate
  obvious code or preserve commented-out implementations.
- Document surprising spatial exceptions, migration assumptions, lifecycle constraints, and
  externally observable contracts next to the code that enforces them.
- Keep player-facing dialogue and historical prose separate from developer diagnostics. All
  player-facing text must follow localization and period-voice requirements.

## Testing and verification

- Every behavior change needs tests proportional to its risk. Every bug fix needs a regression
  test that fails for the original cause.
- Test the broader invariant class when practical, not only the single reported example. Add
  static, schema, catalog, or property-style tests for errors that can recur across many files.
- Include negative cases and boundary cases: missing IDs, duplicate IDs, stale saves, empty
  collections, maximum capacities, invalid enum values, interrupted async work, and divergent
  history.
- Prefer behavior and contract tests over assertions tied to private implementation details.
- Tests must be deterministic. Control clocks, randomness, ordering, and external services.
- A fake should satisfy the same essential contract as production data. Do not weaken runtime
  validation merely to accommodate incomplete test fixtures.
- Keep frozen fixtures for supported persistence formats and verify both new-game startup and
  migrated-save startup.
- When changing a shared contract, search every producer, consumer, serializer, worker,
  cache, UI view, test fixture, and migration—not only the first failing call site.

## Completion checklist

Before presenting implementation work as complete:

1. Review the diff for accidental scope, duplication, dead code, weak fallbacks, and mixed
   identifier or unit types.
2. Run syntax checks, static analysis, contract/type checks, targeted tests, and the complete
   relevant test suite.
3. Verify schema fingerprints and old-save migrations when persisted state changed.
4. Build the production artifact and verify its module/asset graph when deployment is in scope.
5. Check relevant telemetry before release and distinguish old-build incidents from regressions.
6. Confirm the working tree contains no accidental generated output or unrelated user changes.
7. Report what was verified and any remaining risk honestly; do not claim success from partial
   checks.
