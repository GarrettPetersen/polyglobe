export function createDistantWorldEventQueue() {
  let schedule = null;
  let awaitingReschedule = false;

  function reset(rawSchedule) {
    schedule = validateSchedule(rawSchedule);
    awaitingReschedule = false;
    return nextMinute();
  }

  function advance(clockMinute) {
    if (!schedule) throw new Error("Distant-world event queue is not initialized");
    if (awaitingReschedule) {
      throw new Error("Distant-world event queue must be rescheduled after reporting due events");
    }
    if (!Number.isFinite(clockMinute)) {
      throw new Error(`Invalid distant-world clock minute: ${clockMinute}`);
    }
    const shipIds = dueIds(schedule.ships, clockMinute);
    const cartIds = dueIds(schedule.carts, clockMinute);
    const economy = schedule.economyMinute <= clockMinute;
    const maintenance = schedule.maintenanceMinute <= clockMinute;
    const due = economy || maintenance || shipIds.length > 0 || cartIds.length > 0;
    if (due) awaitingReschedule = true;
    return Object.freeze({
      due,
      economy,
      maintenance,
      shipIds: Object.freeze(shipIds),
      cartIds: Object.freeze(cartIds),
      nextMinute: due ? null : nextMinute()
    });
  }

  function nextMinute() {
    if (!schedule) return null;
    return Math.min(
      schedule.economyMinute,
      schedule.maintenanceMinute,
      firstMinute(schedule.ships),
      firstMinute(schedule.carts)
    );
  }

  return Object.freeze({ reset, advance, nextMinute });
}

function validateSchedule(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Distant-world event schedule must be an object");
  }
  return Object.freeze({
    economyMinute: validateMinute(raw.economyMinute, "economy"),
    maintenanceMinute: validateMinute(raw.maintenanceMinute, "maintenance"),
    ships: validateEvents(raw.ships, "ship"),
    carts: validateEvents(raw.carts, "cart")
  });
}

function validateEvents(events, label) {
  if (!Array.isArray(events)) throw new Error(`Distant-world ${label} events must be an array`);
  const ids = new Set();
  return Object.freeze(events.map((event) => {
    if (!event || typeof event.id !== "string" || event.id.length === 0 || ids.has(event.id)) {
      throw new Error(`Invalid distant-world ${label} event id: ${event?.id}`);
    }
    ids.add(event.id);
    return Object.freeze({
      id: event.id,
      minute: validateMinute(event.minute, `${label} ${event.id}`)
    });
  }).sort((a, b) => a.minute - b.minute || a.id.localeCompare(b.id)));
}

function validateMinute(minute, label) {
  if (!Number.isFinite(minute) || minute < 0) {
    throw new Error(`Invalid distant-world ${label} minute: ${minute}`);
  }
  return minute;
}

function dueIds(events, clockMinute) {
  const ids = [];
  for (const event of events) {
    if (event.minute > clockMinute) break;
    ids.push(event.id);
  }
  return ids;
}

function firstMinute(events) {
  return events.length > 0 ? events[0].minute : Infinity;
}
