export function exploreReachableActionGraph({
  initialState,
  scenarioId = "action-graph",
  stateKey,
  view,
  actions,
  transition,
  includeAction = () => true,
  followAction = () => true,
  validateView = () => {},
  validateState = () => {},
  validateExcludedAction = () => {},
  requireComplete = false,
  maxDepth,
  maxStates
}) {
  for (const [label, callback] of Object.entries({
    stateKey,
    view,
    actions,
    transition,
    includeAction,
    followAction,
    validateView,
    validateState,
    validateExcludedAction
  })) {
    if (typeof callback !== "function") {
      throw new TypeError(`Reachability explorer requires ${label}`);
    }
  }
  if (!Number.isInteger(maxDepth) || maxDepth < 0) {
    throw new RangeError(`Reachability explorer requires a non-negative maxDepth: ${maxDepth}`);
  }
  if (!Number.isInteger(maxStates) || maxStates < 1) {
    throw new RangeError(`Reachability explorer requires a positive maxStates: ${maxStates}`);
  }

  const queue = [{ state: initialState, depth: 0, trace: [] }];
  const boundaries = [];
  let activeTrace = [];
  let phase = "initial state";
  const visitedKeys = new Set();
  const reachedActionKinds = new Set();
  const reachedViewKinds = new Set();
  let transitionCount = 0;
  let disabledActionCount = 0;

  try {
    while (queue.length > 0) {
      const current = queue.shift();
      activeTrace = current.trace;
      phase = "state validation";
      validateState(current.state);
      const key = stateKey(current.state);
      if (typeof key !== "string" || key === "") {
        throw new Error("Reachability explorer state keys must be non-empty strings");
      }
      if (visitedKeys.has(key)) continue;
      visitedKeys.add(key);
      if (visitedKeys.size > maxStates) {
        throw new Error(`Reachability explorer exceeded ${maxStates} states at ${key}`);
      }

      phase = "view construction";
      const currentView = view(current.state);
      validateReachableView(currentView, key);
      validateView(currentView, current.state);
      reachedViewKinds.add(currentView.kind || key);

      const offeredActions = actions(currentView, current.state);
      if (!Array.isArray(offeredActions)) {
        throw new Error(`Reachability explorer actions must be an array at ${key}`);
      }
      for (const offered of offeredActions) {
        validateOfferedAction(offered, key);
        activeTrace = [...current.trace, { view: currentView.kind || key, ...offered }];
        if (!includeAction(offered, currentView, current.state)) {
          phase = "excluded action validation";
          validateExcludedAction(current.state, offered, currentView);
          if (offered.disabled === true) disabledActionCount += 1;
          else boundaries.push({ reason: "excluded-enabled-action", trace: activeTrace });
          continue;
        }
        if (current.depth >= maxDepth) {
          boundaries.push({ reason: "depth", trace: activeTrace });
          continue;
        }
        phase = "action execution";
        reachedActionKinds.add(offered.kind);
        const nextState = transition(current.state, offered, currentView);
        transitionCount += 1;
        if (nextState !== null) {
          // Even an already-visited node or a terminal exploration edge must
          // produce a renderable successor. Its data can differ from the first
          // visit despite sharing the same navigation key.
          phase = "successor validation";
          validateState(nextState);
          const nextView = view(nextState);
          validateReachableView(nextView, `${key} -> ${offered.kind}`);
          validateView(nextView, nextState);
          reachedViewKinds.add(nextView.kind || stateKey(nextState));
          if (followAction(offered, currentView, current.state)) {
            queue.push({ state: nextState, depth: current.depth + 1, trace: activeTrace });
          } else {
            boundaries.push({ reason: "followAction", trace: activeTrace });
          }
        }
      }
    }
    if (requireComplete && boundaries.length > 0) {
      const boundary = boundaries[0];
      activeTrace = boundary.trace;
      phase = "coverage";
      throw new Error(`Incomplete action audit: ${boundaries.length} unexplored boundaries (${boundary.reason})`);
    }
  } catch (cause) {
    // This catch belongs to the test runner: retain the failure and add a
    // deterministic shortest route, rather than letting a player discover it.
    throw new Error(
      `Action audit ${scenarioId} failed during ${phase}: ${cause.message}\n` +
      `Replay: ${JSON.stringify(activeTrace)}`,
      { cause }
    );
  }

  return Object.freeze({
    stateCount: visitedKeys.size,
    transitionCount,
    disabledActionCount,
    complete: boundaries.length === 0,
    boundaries: Object.freeze(boundaries),
    stateKeys: Object.freeze([...visitedKeys]),
    actionKinds: Object.freeze([...reachedActionKinds].sort()),
    viewKinds: Object.freeze([...reachedViewKinds].sort())
  });
}

function validateReachableView(view, stateKey) {
  if (!view || typeof view !== "object" || Array.isArray(view)) {
    throw new Error(`Reachability explorer received no view at ${stateKey}`);
  }
}

function validateOfferedAction(offered, stateKey) {
  if (!offered || typeof offered !== "object" || Array.isArray(offered)) {
    throw new Error(`Reachability explorer received an invalid action at ${stateKey}`);
  }
  if (typeof offered.kind !== "string" || offered.kind === "") {
    throw new Error(`Reachability explorer action has no kind at ${stateKey}`);
  }
}
