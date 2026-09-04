export function exploreReachableActionGraph({
  initialState,
  stateKey,
  view,
  actions,
  transition,
  includeAction = () => true,
  validateView = () => {},
  maxDepth,
  maxStates
}) {
  for (const [label, callback] of Object.entries({
    stateKey,
    view,
    actions,
    transition,
    includeAction,
    validateView
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

  const queue = [{ state: initialState, depth: 0 }];
  const visitedKeys = new Set();
  const reachedActionKinds = new Set();
  const reachedViewKinds = new Set();
  let transitionCount = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    const key = stateKey(current.state);
    if (typeof key !== "string" || key === "") {
      throw new Error("Reachability explorer state keys must be non-empty strings");
    }
    if (visitedKeys.has(key)) continue;
    visitedKeys.add(key);
    if (visitedKeys.size > maxStates) {
      throw new Error(`Reachability explorer exceeded ${maxStates} states at ${key}`);
    }

    const currentView = view(current.state);
    validateReachableView(currentView, key);
    validateView(currentView, current.state);
    reachedViewKinds.add(currentView.kind || key);
    if (current.depth >= maxDepth) continue;

    const offeredActions = actions(currentView, current.state);
    if (!Array.isArray(offeredActions)) {
      throw new Error(`Reachability explorer actions must be an array at ${key}`);
    }
    for (const offered of offeredActions) {
      validateOfferedAction(offered, key);
      if (!includeAction(offered, currentView, current.state)) continue;
      reachedActionKinds.add(offered.kind);
      const nextState = transition(current.state, offered, currentView);
      transitionCount += 1;
      if (nextState !== null) queue.push({ state: nextState, depth: current.depth + 1 });
    }
  }

  return Object.freeze({
    stateCount: visitedKeys.size,
    transitionCount,
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
