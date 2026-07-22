import { loadingScreenRenderSize } from "./loadingScreenMotion.js";

const MINIMUM_DISPLAY_MS = 1100;
const EXIT_DURATION_MS = 420;

export function startCapsuleLoadingScreen() {
  const root = requiredElement("loading-screen", HTMLElement);
  const displayCanvas = requiredElement("loading-art", HTMLCanvasElement);
  const status = requiredElement("loading-status-text", HTMLElement);
  const shell = root.closest(".shell");
  if (!(shell instanceof HTMLElement)) {
    throw new Error("Capsule loading screen must be inside the game shell");
  }
  if (typeof displayCanvas.transferControlToOffscreen !== "function") {
    throw new Error("Capsule loading screen requires OffscreenCanvas support");
  }

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const startedAtMs = performance.now();
  const offscreenCanvas = displayCanvas.transferControlToOffscreen();
  const worker = new Worker(new URL("./loadingScreenWorker.js", import.meta.url), { type: "module" });
  let exitTimerId = null;
  let hideTimerId = null;
  let lifecycle = "loading";
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  shell.setAttribute("aria-busy", "true");
  root.hidden = false;
  root.dataset.state = "loading";

  worker.addEventListener("message", handleWorkerMessage);
  worker.addEventListener("error", handleWorkerError);
  const resizeObserver = new ResizeObserver(syncDisplayCanvasSize);
  resizeObserver.observe(root);
  window.visualViewport?.addEventListener("resize", syncDisplayCanvasSize);

  const initialSize = currentRenderSize(root);
  worker.postMessage({
    type: "start",
    canvas: offscreenCanvas,
    width: initialSize.width,
    height: initialSize.height,
    reducedMotion
  }, [offscreenCanvas]);

  return Object.freeze({ ready, finish, fail });

  function handleWorkerMessage(event) {
    const message = event.data;
    if (!message || typeof message.type !== "string") {
      fail(new Error("Capsule loading worker sent a malformed message"));
      return;
    }
    if (message.type === "ready") {
      if (lifecycle !== "loading") return;
      lifecycle = "running";
      root.dataset.state = "running";
      resolveReady();
      return;
    }
    if (message.type === "error") {
      const error = new Error(message.message || "Capsule loading worker failed");
      fail(error);
      return;
    }
    fail(new Error(`Capsule loading worker sent an unknown message: ${message.type}`));
  }

  function handleWorkerError(event) {
    const error = new Error(event.message || "Capsule loading worker crashed");
    fail(error);
  }

  function syncDisplayCanvasSize() {
    if (lifecycle === "finished" || lifecycle === "failed") return;
    const size = currentRenderSize(root);
    worker.postMessage({ type: "resize", width: size.width, height: size.height });
  }

  function finish() {
    if (lifecycle !== "running") {
      throw new Error(`Cannot finish capsule loading screen while it is ${lifecycle}`);
    }
    lifecycle = "finishing";
    const minimumMs = reducedMotion ? 0 : MINIMUM_DISPLAY_MS;
    const waitMs = Math.max(0, minimumMs - (performance.now() - startedAtMs));
    exitTimerId = window.setTimeout(() => {
      root.dataset.state = "leaving";
      shell.removeAttribute("aria-busy");
      hideTimerId = window.setTimeout(dispose, reducedMotion ? 0 : EXIT_DURATION_MS);
    }, waitMs);
  }

  function fail(error) {
    if (lifecycle === "finished" || lifecycle === "failed") return;
    lifecycle = "failed";
    rejectReady(error);
    cancelScheduledWork();
    resizeObserver.disconnect();
    window.visualViewport?.removeEventListener("resize", syncDisplayCanvasSize);
    worker.terminate();
    root.dataset.state = "failed";
    status.textContent = `COULD NOT CHART THE WORLD — ${errorMessage(error)}`;
    shell.setAttribute("aria-busy", "false");
  }

  function dispose() {
    lifecycle = "finished";
    cancelScheduledWork();
    resizeObserver.disconnect();
    window.visualViewport?.removeEventListener("resize", syncDisplayCanvasSize);
    worker.terminate();
    root.hidden = true;
  }

  function cancelScheduledWork() {
    if (exitTimerId !== null) clearTimeout(exitTimerId);
    if (hideTimerId !== null) clearTimeout(hideTimerId);
    exitTimerId = null;
    hideTimerId = null;
  }
}

function currentRenderSize(root) {
  return loadingScreenRenderSize(
    root.clientWidth || window.innerWidth,
    root.clientHeight || window.innerHeight
  );
}

function requiredElement(id, constructor) {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) throw new Error(`Missing required loading screen element: #${id}`);
  return element;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
