export function createCaptureControls({ shell, scenario, recorder, onRecordingStarted }) {
  if (!(shell instanceof HTMLElement)) throw new Error("Capture controls need a shell element");
  if (!scenario?.title) throw new Error("Capture controls need a scenario");
  if (!recorder) throw new Error("Capture controls need a recorder");
  if (typeof onRecordingStarted !== "function") throw new Error("Capture controls need a start callback");

  const root = document.createElement("section");
  root.className = "capture-controls";
  root.innerHTML = `
    <div class="capture-card">
      <strong>${escapeHtml(scenario.title)}</strong>
      <span class="capture-status">READY</span>
      <button type="button" class="capture-primary">RECORD TAKE</button>
      <small>Share this tab and enable tab audio. Recording stops after 10 minutes.</small>
    </div>
  `;
  const status = requiredElement(root, ".capture-status");
  const button = requiredElement(root, ".capture-primary");
  let timer = null;

  const renderState = (snapshot) => {
    clearInterval(timer);
    timer = null;
    root.dataset.state = snapshot.state;
    if (snapshot.state === "ready") {
      status.textContent = "READY";
      button.textContent = "RECORD TAKE";
      button.disabled = false;
    } else if (snapshot.state === "requesting") {
      status.textContent = "CHOOSE THIS TAB + AUDIO";
      button.textContent = "WAITING...";
      button.disabled = true;
    } else if (snapshot.state === "recording") {
      status.textContent = elapsedLabel(snapshot.elapsedMs);
      button.textContent = "STOP + SAVE";
      button.disabled = false;
      timer = setInterval(() => {
        status.textContent = elapsedLabel(recorder.snapshot().elapsedMs);
      }, 250);
    } else if (snapshot.state === "stopping") {
      status.textContent = "SAVING TAKE...";
      button.textContent = "STOPPING...";
      button.disabled = true;
    } else if (snapshot.state === "complete") {
      status.textContent = "TAKE SAVED";
      button.textContent = "RELOAD FOR ANOTHER TAKE";
      button.disabled = false;
    } else {
      throw new Error(`Unknown capture control state: ${snapshot.state}`);
    }
  };

  recorder.onStateChange = renderState;
  button.addEventListener("click", async () => {
    try {
      if (recorder.state === "ready") {
        await recorder.start();
        onRecordingStarted();
      } else if (recorder.state === "recording") {
        await recorder.stop("manual");
      } else if (recorder.state === "complete") {
        window.location.reload();
      }
    } catch (error) {
      console.error("[capture] could not record take", error);
      status.textContent = error.message.toUpperCase();
      button.textContent = "TRY AGAIN";
      button.disabled = false;
    }
  });
  shell.append(root);
  renderState(recorder.snapshot());
  return root;
}

function elapsedLabel(elapsedMs) {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `REC ${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function requiredElement(root, selector) {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Capture control is missing ${selector}`);
  return element;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
