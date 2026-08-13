const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CONNECTED_POLL_MS,
  DISCONNECTED_POLL_MS,
  createSteamInputPump
} = require("./steamInputPump.cjs");

function fakeClock() {
  let nextId = 1;
  let now = 0;
  const jobs = new Map();
  return {
    advance(milliseconds) {
      const end = now + milliseconds;
      while (true) {
        const due = [...jobs.entries()]
          .filter(([, job]) => job.time <= end)
          .sort((left, right) => left[1].time - right[1].time || left[0] - right[0])[0];
        if (!due) break;
        const [id, job] = due;
        jobs.delete(id);
        now = job.time;
        job.callback();
      }
      now = end;
    },
    cancel(id) {
      jobs.delete(id);
    },
    pendingCount: () => jobs.size,
    schedule(callback, delay) {
      const id = nextId;
      nextId += 1;
      jobs.set(id, { callback, time: now + delay });
      return id;
    }
  };
}

function controllerFrame(button = 0) {
  return {
    connected: true,
    id: "Steam Input Test",
    index: 0,
    inputType: "XboxOneController",
    axes: [0, 0, 0, 0],
    buttons: [button, 0, 0, 0]
  };
}

test("Steam Input checks infrequently and sends no IPC while no controller exists", () => {
  const clock = fakeClock();
  let snapshots = 0;
  const published = [];
  const pump = createSteamInputPump({
    snapshot: () => {
      snapshots += 1;
      return null;
    },
    publish: (frame) => published.push(frame),
    schedule: clock.schedule,
    cancel: clock.cancel
  });
  pump.start();
  clock.advance(DISCONNECTED_POLL_MS * 4 - 1);
  assert.equal(snapshots, 4);
  assert.deepEqual(published, []);
  assert.equal(clock.pendingCount(), 1);
  pump.stop();
  assert.equal(clock.pendingCount(), 0);
});

test("Steam Input polls a connected controller responsively without duplicate frames", () => {
  const clock = fakeClock();
  let button = 0;
  let snapshots = 0;
  const published = [];
  const pump = createSteamInputPump({
    snapshot: () => {
      snapshots += 1;
      return controllerFrame(button);
    },
    publish: (frame) => published.push(frame),
    schedule: clock.schedule,
    cancel: clock.cancel
  });
  pump.start();
  clock.advance(CONNECTED_POLL_MS * 3);
  assert.equal(snapshots, 4);
  assert.equal(published.length, 1);
  button = 1;
  clock.advance(CONNECTED_POLL_MS);
  assert.equal(published.length, 2);
  assert.equal(published[1].buttons[0], 1);
});

test("Steam Input publishes a disconnect once and immediately samples action-set changes", () => {
  const clock = fakeClock();
  let frame = controllerFrame();
  let snapshots = 0;
  const published = [];
  const pump = createSteamInputPump({
    snapshot: () => {
      snapshots += 1;
      return frame;
    },
    publish: (value) => published.push(value),
    schedule: clock.schedule,
    cancel: clock.cancel
  });
  pump.start();
  clock.advance(0);
  frame = null;
  clock.advance(CONNECTED_POLL_MS);
  clock.advance(DISCONNECTED_POLL_MS * 2);
  assert.deepEqual(published, [controllerFrame(), null]);
  const beforeRequest = snapshots;
  pump.requestPoll();
  assert.equal(clock.pendingCount(), 1);
  clock.advance(0);
  assert.equal(snapshots, beforeRequest + 1);
});
