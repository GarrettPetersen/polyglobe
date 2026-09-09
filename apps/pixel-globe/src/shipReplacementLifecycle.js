// Only loading may yield. After rechecking ownership of the request, mutation,
// publication and persistence run in one turn so no half-installed hull escapes.
export async function runShipReplacement({ isCurrent, load, commit, publish, present, save }) {
  for (const operation of [isCurrent, load, commit, publish, present, save]) {
    if (typeof operation !== "function") throw new Error("Incomplete ship replacement lifecycle");
  }
  if (!isCurrent()) return { status: "cancelled" };
  const assets = await load();
  if (!isCurrent()) return { status: "cancelled" };
  const outcome = synchronousStep("commit", commit);
  synchronousStep("publish", () => publish(assets));
  synchronousStep("present", () => present(outcome));
  synchronousStep("save", save);
  return { status: "completed" };
}

function synchronousStep(name, operation) {
  const result = operation();
  if (result && typeof result.then === "function") {
    throw new Error(`Ship replacement ${name} must be synchronous`);
  }
  return result;
}
