// Mutations may nest, but may not yield: an async continuation needs a fresh
// boundary because a worker commit may have arrived in the meantime.
export function createWorldMutationBoundary(beforeMutation) {
  if (typeof beforeMutation !== "function") throw new Error("World mutation requires a preparation operation");
  let depth = 0;
  return function mutateWorld(operation) {
    if (typeof operation !== "function" || operation.constructor.name === "AsyncFunction") {
      throw new Error("World mutation requires a synchronous operation");
    }
    if (depth === 0) beforeMutation();
    depth++;
    try {
      const result = operation();
      if (result && typeof result.then === "function") throw new Error("World mutation must not yield");
      return result;
    } finally {
      depth--;
    }
  };
}

export function dispatchActionEffects(effects, handlers) {
  if (!Array.isArray(effects)) throw new Error("Action effects must be an array");
  // Validate the entire batch before executing any effect.
  for (const effect of effects) {
    if (!effect || !Object.hasOwn(handlers, effect.type) || typeof handlers[effect.type] !== "function") {
      throw new Error(`Unhandled action effect: ${effect?.type}`);
    }
  }
  for (const effect of effects) handlers[effect.type](effect.value);
}
