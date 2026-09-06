import assert from "node:assert/strict";

/** Seeded, coverage-biased state-machine exploration. Adapters own real domain
 * transitions; the runner never repairs state or suppresses failed invariants. */
export function randomForSeed(seed) {
  assert.ok(Number.isSafeInteger(seed), "Seed must be an integer");
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let word = Math.imul(value ^ value >>> 15, 1 | value);
    word ^= word + Math.imul(word ^ word >>> 7, 61 | word);
    return ((word ^ word >>> 14) >>> 0) / 4294967296;
  };
}

function available(adapter, state) {
  const actions = adapter.actions(state);
  assert.ok(Array.isArray(actions) && actions.length, "Journey has no available action");
  const ids = new Set();
  for (const action of actions) {
    assert.ok(typeof action.id === "string" && action.id, "Action needs a stable ID");
    assert.ok(!ids.has(action.id), `Duplicate action ID: ${action.id}`);
    ids.add(action.id);
  }
  return actions;
}

export function runJourney(adapter, { seed, steps, initial = adapter.initial(seed), trace: replayTrace } = {}) {
  assert.ok(Number.isSafeInteger(steps) && steps > 0, "Steps must be a positive integer");
  const random = randomForSeed(seed);
  const trace = [];
  const coverage = new Map();
  const states = new Set();
  let state;
  let stalledSteps = 0;
  let repeatedStates = 0;
  try {
    state = adapter.restore(structuredClone(initial));
    adapter.check(state);
    for (let step = 0; step < (replayTrace?.length ?? steps); step++) {
      const actions = available(adapter, state);
      let action;
      if (replayTrace) {
        action = actions.find(({ id }) => id === replayTrace[step]);
        assert.ok(action, `Replay action unavailable at ${step}: ${replayTrace[step]}`);
      } else {
        const scores = actions.map((entry) => 1 / (1 + (coverage.get(entry.coverage ?? entry.id) ?? 0)));
        let draw = random() * scores.reduce((sum, value) => sum + value, 0);
        action = actions.at(-1);
        for (let i = 0; i < actions.length; i++) {
          draw -= scores[i];
          if (draw <= 0) { action = actions[i]; break; }
        }
      }
      trace.push(action.id);
      const before = adapter.key(state);
      state = adapter.execute(state, action);
      adapter.check(state);
      const after = adapter.key(state);
      stalledSteps = after === before ? stalledSteps + 1 : 0;
      assert.ok(stalledSteps < 32, `Journey made no progress for 32 actions: ${action.id}`);
      repeatedStates = states.has(after) ? repeatedStates + 1 : 0;
      assert.ok(repeatedStates < 128, "Journey revisited old states for 128 actions without finding a new state");
      states.add(after);
      const key = action.coverage ?? action.id;
      coverage.set(key, (coverage.get(key) ?? 0) + 1);
    }
    return { seed, steps: trace.length, states: states.size,
      coverage: Object.fromEntries([...coverage].sort()), trace,
      final: adapter.snapshot(state), boundaries: adapter.boundaries?.(state) ?? [] };
  } catch (cause) {
    const error = new Error(`Playtest failed (seed ${seed}, step ${trace.length}): ${cause.message}`, { cause });
    error.artifact = { version: 1, seed, initial, trace, failure: cause.message,
      failureId: `${cause.code ?? cause.name}:${cause.message.split("\n")[0]}` };
    throw error;
  }
}

/** Remove chunks only when the same invariant still fails. An illegal replay is
 * not a reproduction. A hard attempt budget bounds expensive minimization. */
export function minimizeFailure(adapter, artifact, maxAttempts = 64) {
  let trace = artifact.trace.slice();
  let attempts = 0;
  for (let size = Math.floor(trace.length / 2); size >= 1; size = Math.floor(size / 2)) {
    for (let start = 0; start + size <= trace.length && attempts < maxAttempts;) {
      const candidate = trace.toSpliced(start, size);
      attempts++;
      let reproduces = false;
      try { runJourney(adapter, { ...artifact, steps: 1, trace: candidate }); }
      catch (error) { reproduces = error.artifact?.failureId === artifact.failureId; }
      if (reproduces) trace = candidate;
      else start += size;
    }
  }
  return { ...artifact, trace, minimizationAttempts: attempts };
}
