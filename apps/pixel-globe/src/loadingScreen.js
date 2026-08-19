import { loadingScreenRenderSize } from "./loadingScreenMotion.js";
import { canvasDisplayLayout } from "./displayScaling.js";
import { gameStorage } from "./gameStorage.js";
import {
  currentSteamInterfaceLanguage,
  INTERFACE_LANGUAGE_STORAGE_KEY,
  initialInterfaceLanguage,
  loadingCapsuleTitleAtlasFile
} from "./loadingScreenLocale.js";

const MINIMUM_DISPLAY_MS = 1100;
const EXIT_DURATION_MS = 420;
const MAXIMUM_WORKER_ATTEMPTS = 2;

export function startCapsuleLoadingScreen() {
  const root = requiredElement("loading-screen", HTMLElement);
  let displayCanvas = requiredElement("loading-art", HTMLCanvasElement);
  const status = requiredElement("loading-status-text", HTMLElement);
  const statusLabel = status.querySelector("span");
  if (!(statusLabel instanceof HTMLElement) || statusLabel.textContent?.trim() === "") {
    throw new Error("Capsule loading screen requires visible status text");
  }
  const shell = root.closest(".shell");
  if (!(shell instanceof HTMLElement)) {
    throw new Error("Capsule loading screen must be inside the game shell");
  }
  if (typeof displayCanvas.transferControlToOffscreen !== "function") {
    throw new Error("Capsule loading screen requires OffscreenCanvas support");
  }

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const language = initialInterfaceLanguage(
    new URLSearchParams(window.location.search).get("lang"),
    gameStorage.getItem(INTERFACE_LANGUAGE_STORAGE_KEY),
    currentSteamInterfaceLanguage()
  );
  const titleAtlasFile = loadingCapsuleTitleAtlasFile(language);
  const startedAtMs = performance.now();
  let worker = null;
  let workerAttempt = 0;
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
  document.documentElement.lang = language;
  root.hidden = false;
  root.dataset.state = "loading";

  const resizeObserver = new ResizeObserver(syncDisplayCanvasSize);
  resizeObserver.observe(root);
  window.visualViewport?.addEventListener("resize", syncDisplayCanvasSize);
  startWorkerAttempt();

  return Object.freeze({ ready, finish, fail });

  function handleWorkerMessage(event) {
    if (event.currentTarget !== worker) return;
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
      recoverWorkerOrFail(error);
      return;
    }
    fail(new Error(`Capsule loading worker sent an unknown message: ${message.type}`));
  }

  function handleWorkerError(event) {
    if (event.currentTarget !== worker) return;
    event.preventDefault?.();
    const error = new Error(event.message || "Capsule loading worker crashed");
    recoverWorkerOrFail(error);
  }

  function startWorkerAttempt() {
    workerAttempt++;
    try {
      const nextWorker = new Worker(new URL("./loadingScreenWorker.js", import.meta.url), {
        type: "module"
      });
      worker = nextWorker;
      nextWorker.addEventListener("message", handleWorkerMessage);
      nextWorker.addEventListener("error", handleWorkerError);
      const initialSize = currentRenderSize(root, displayCanvas);
      const offscreenCanvas = displayCanvas.transferControlToOffscreen();
      nextWorker.postMessage({
        type: "start",
        canvas: offscreenCanvas,
        width: initialSize.width,
        height: initialSize.height,
        reducedMotion,
        statusText: statusLabel.textContent.trim(),
        titleAtlasFile
      }, [offscreenCanvas]);
    } catch (error) {
      recoverWorkerOrFail(normalizedError(error, "Capsule loading worker could not start"));
    }
  }

  function recoverWorkerOrFail(error) {
    if (lifecycle === "running") {
      console.warn("[pixel-globe] capsule loading animation stopped after initialization", error);
      worker?.terminate();
      worker = null;
      return;
    }
    if (lifecycle !== "loading" || workerAttempt >= MAXIMUM_WORKER_ATTEMPTS) {
      fail(error);
      return;
    }
    console.warn(
      `[pixel-globe] capsule loading worker attempt ${workerAttempt} failed; retrying`,
      error
    );
    worker?.terminate();
    const replacement = displayCanvas.cloneNode(false);
    if (!(replacement instanceof HTMLCanvasElement)) {
      fail(new Error("Capsule loading canvas could not be replaced after a worker failure"));
      return;
    }
    displayCanvas.replaceWith(replacement);
    displayCanvas = replacement;
    startWorkerAttempt();
  }

  function syncDisplayCanvasSize() {
    if (lifecycle === "finished" || lifecycle === "failed") return;
    const size = currentRenderSize(root, displayCanvas);
    worker?.postMessage({ type: "resize", width: size.width, height: size.height });
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
    worker?.terminate();
    root.dataset.state = "failed";
    status.textContent = `COULD NOT CHART THE WORLD — ${errorMessage(error)}`;
    shell.setAttribute("aria-busy", "false");
  }

  function dispose() {
    lifecycle = "finished";
    cancelScheduledWork();
    resizeObserver.disconnect();
    window.visualViewport?.removeEventListener("resize", syncDisplayCanvasSize);
    worker?.terminate();
    root.hidden = true;
  }

  function cancelScheduledWork() {
    if (exitTimerId !== null) clearTimeout(exitTimerId);
    if (hideTimerId !== null) clearTimeout(hideTimerId);
    exitTimerId = null;
    hideTimerId = null;
  }
}

function currentRenderSize(root, displayCanvas = null) {
  const viewportWidth = root.clientWidth || window.innerWidth;
  const viewportHeight = root.clientHeight || window.innerHeight;
  const renderSize = loadingScreenRenderSize(viewportWidth, viewportHeight);
  if (displayCanvas) {
    const layout = canvasDisplayLayout({
      viewportWidth,
      viewportHeight,
      canvasWidth: renderSize.width,
      canvasHeight: renderSize.height
    });
    displayCanvas.style.left = `${layout.left}px`;
    displayCanvas.style.top = `${layout.top}px`;
    displayCanvas.style.width = `${layout.width}px`;
    displayCanvas.style.height = `${layout.height}px`;
  }
  return renderSize;
}

function requiredElement(id, constructor) {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) throw new Error(`Missing required loading screen element: #${id}`);
  return element;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function normalizedError(error, fallbackMessage) {
  return error instanceof Error ? error : new Error(error ? String(error) : fallbackMessage);
}
