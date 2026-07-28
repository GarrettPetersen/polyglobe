export const DISTANT_WORLD_WORK_KIND = Object.freeze({
  ECONOMY: "economy",
  CARTS: "carts",
  HIDEOUTS: "hideouts",
  MAINTENANCE: "maintenance",
  SHIPS: "ships",
  RESCHEDULE: "reschedule"
});

export function createDistantWorldWorkPlan(
  event,
  { shipBatchSize = 8, cartBatchSize = 12 } = {}
) {
  validateEvent(event);
  validateBatchSize(shipBatchSize, "ship");
  validateBatchSize(cartBatchSize, "cart");
  const work = [];
  if (event.economy) work.push(Object.freeze({ kind: DISTANT_WORLD_WORK_KIND.ECONOMY }));
  appendBatches(work, DISTANT_WORLD_WORK_KIND.CARTS, "cartIds", event.cartIds, cartBatchSize);
  if (event.maintenance) {
    work.push(Object.freeze({ kind: DISTANT_WORLD_WORK_KIND.HIDEOUTS }));
    work.push(Object.freeze({ kind: DISTANT_WORLD_WORK_KIND.MAINTENANCE }));
  }
  appendBatches(work, DISTANT_WORLD_WORK_KIND.SHIPS, "shipIds", event.shipIds, shipBatchSize);
  work.push(Object.freeze({ kind: DISTANT_WORLD_WORK_KIND.RESCHEDULE }));
  return Object.freeze(work);
}

function appendBatches(work, kind, property, ids, batchSize) {
  for (let index = 0; index < ids.length; index += batchSize) {
    work.push(Object.freeze({
      kind,
      [property]: Object.freeze(ids.slice(index, index + batchSize))
    }));
  }
}

function validateEvent(event) {
  if (!event || typeof event !== "object" ||
      typeof event.economy !== "boolean" ||
      typeof event.maintenance !== "boolean" ||
      !Array.isArray(event.shipIds) ||
      !Array.isArray(event.cartIds)) {
    throw new Error("Distant-world work plan requires a due event");
  }
}

function validateBatchSize(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Distant-world ${label} batch size must be a positive integer`);
  }
}
