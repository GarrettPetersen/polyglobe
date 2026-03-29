import { bootstrapRailwaysNetworkingFromUrl } from "./src/network/bootstrap";
import { startRailwaysGameRuntime } from "./src/game/runtime";

type SessionMode = "single" | "multi-host" | "multi-join";

declare global {
  interface Window {
    __railwaysSessionSetup?: {
      mode: SessionMode;
      totalPlayers: number;
      botPlayers: number;
      botAuthority: "server";
      startCityId: string;
      colorHex: string;
    };
  }
}

function ensureBaseRailwaysUrlState(): void {
  const url = new URL(window.location.href);
  let changed = false;
  if (!url.searchParams.has("app")) {
    url.searchParams.set("app", "railways");
    changed = true;
  }
  if (!url.searchParams.has("startDate") && !url.searchParams.has("startDateTime")) {
    url.searchParams.set("startDate", "1825-01-01T00:00:00");
    changed = true;
  }
  if (changed) {
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

function injectMenuCss(): void {
  const style = document.createElement("style");
  style.textContent = `
    #railwaysMenuOverlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px) saturate(1.15);
      -webkit-backdrop-filter: blur(10px) saturate(1.15);
      background: radial-gradient(circle at 50% 35%, rgba(16, 24, 42, 0.4), rgba(6, 10, 16, 0.72));
      transition: opacity 240ms ease;
      opacity: 1;
    }
    #railwaysMenuOverlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    #railwaysMenuPanel {
      width: min(680px, 92vw);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(10, 16, 24, 0.78);
      color: #eef4ff;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
      padding: 18px 20px;
      font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    #railwaysMenuPanel h1 {
      margin: 0 0 4px 0;
      font-size: 28px;
      font-weight: 700;
    }
    #railwaysMenuPanel .sub {
      margin: 0 0 14px 0;
      opacity: 0.86;
    }
    #railwaysMenuPanel .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    #railwaysMenuPanel .mode {
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 10px;
      padding: 10px;
      cursor: pointer;
      user-select: none;
      background: rgba(255, 255, 255, 0.03);
    }
    #railwaysMenuPanel .mode.active {
      border-color: rgba(126, 188, 255, 0.9);
      background: rgba(126, 188, 255, 0.14);
    }
    #railwaysMenuPanel .row {
      display: grid;
      grid-template-columns: 170px 1fr;
      gap: 10px;
      align-items: center;
      margin-bottom: 8px;
    }
    #railwaysMenuPanel input, #railwaysMenuPanel select, #railwaysMenuPanel button {
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(8, 14, 22, 0.86);
      color: #eef4ff;
      font: inherit;
      padding: 8px 10px;
    }
    #railwaysMenuPanel button.primary {
      background: linear-gradient(180deg, #3691ff, #2266d1);
      border-color: rgba(159, 209, 255, 0.66);
      font-weight: 700;
      cursor: pointer;
    }
    #railwaysMenuPanel .note {
      margin-top: 10px;
      opacity: 0.78;
      font-size: 12px;
    }
    #railwaysMenuPanel .status {
      margin-top: 8px;
      min-height: 18px;
      color: #b9d8ff;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
}

function buildMenu(worldLoadPromise: Promise<unknown>): void {
  injectMenuCss();
  const overlay = document.createElement("div");
  overlay.id = "railwaysMenuOverlay";
  overlay.innerHTML = `
    <div id="railwaysMenuPanel">
      <h1>Railways of the Polyglobe</h1>
      <p class="sub">1825 to 1914 railway sandbox</p>
      <div class="grid">
        <div class="mode active" data-mode="single"><strong>Single Player</strong><div>Host + bot players</div></div>
        <div class="mode" data-mode="multi-host"><strong>Multiplayer Host</strong><div>Host a private match</div></div>
        <div class="mode" data-mode="multi-join"><strong>Multiplayer Join</strong><div>Join an existing host</div></div>
      </div>
      <div class="row">
        <label for="rwPlayerName">Player Name</label>
        <input id="rwPlayerName" value="Host" />
      </div>
      <div class="row" id="rwPlayersRow">
        <label for="rwTotalPlayers">Total Players</label>
        <select id="rwTotalPlayers">
          <option value="1">1 (you only)</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4" selected>4</option>
          <option value="5">5</option>
          <option value="6">6</option>
        </select>
      </div>
      <div class="row">
        <label for="rwStartCity">Starting City</label>
        <select id="rwStartCity">
          <option value="london|united kingdom" selected>London</option>
          <option value="new york|united states">New York</option>
          <option value="paris|france">Paris</option>
          <option value="berlin|germany">Berlin</option>
          <option value="mumbai|india">Bombay / Mumbai</option>
          <option value="cairo|egypt">Cairo</option>
          <option value="tokyo|japan">Tokyo</option>
          <option value="buenos aires|argentina">Buenos Aires</option>
        </select>
      </div>
      <div class="row">
        <label for="rwColor">Player Color</label>
        <input id="rwColor" type="color" value="#f94144" />
      </div>
      <div class="row" id="rwServerRow" style="display:none">
        <label for="rwServerUrl">Server URL</label>
        <input id="rwServerUrl" value="ws://localhost:4422" />
      </div>
      <div class="row">
        <span></span>
        <button id="rwStartBtn" class="primary">Start Game</button>
      </div>
      <div class="status" id="rwStatus">Loading world in background...</div>
      <div class="note">Bots run on the authoritative host server for deterministic outcomes.</div>
    </div>
  `;
  document.body.appendChild(overlay);

  let mode: SessionMode = "single";
  let worldLoaded = false;
  const statusEl = overlay.querySelector("#rwStatus") as HTMLDivElement;
  const playerNameInput = overlay.querySelector("#rwPlayerName") as HTMLInputElement;
  const totalPlayersSelect = overlay.querySelector("#rwTotalPlayers") as HTMLSelectElement;
  const startCitySelect = overlay.querySelector("#rwStartCity") as HTMLSelectElement;
  const colorInput = overlay.querySelector("#rwColor") as HTMLInputElement;
  const serverUrlInput = overlay.querySelector("#rwServerUrl") as HTMLInputElement;
  const serverRow = overlay.querySelector("#rwServerRow") as HTMLDivElement;
  const playersRow = overlay.querySelector("#rwPlayersRow") as HTMLDivElement;
  const startBtn = overlay.querySelector("#rwStartBtn") as HTMLButtonElement;
  const modeButtons = [...overlay.querySelectorAll(".mode")] as HTMLDivElement[];

  void worldLoadPromise.then(
    () => {
      worldLoaded = true;
      statusEl.textContent = "World ready.";
    },
    (err) => {
      statusEl.textContent = `World load failed: ${String(err)}`;
    },
  );

  function applyModeUi(): void {
    for (const b of modeButtons) {
      b.classList.toggle("active", b.dataset.mode === mode);
    }
    playersRow.style.display = mode === "single" ? "" : "none";
    serverRow.style.display = mode === "multi-join" ? "" : "none";
    if (mode === "multi-join") playerNameInput.value ||= "Player";
    else playerNameInput.value ||= "Host";
  }

  for (const b of modeButtons) {
    b.addEventListener("click", () => {
      mode = (b.dataset.mode as SessionMode) ?? "single";
      applyModeUi();
    });
  }
  applyModeUi();

  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    statusEl.textContent = worldLoaded
      ? "Starting session..."
      : "Finalizing world load, please wait...";
    try {
      await worldLoadPromise;
      const url = new URL(window.location.href);
      const playerName = (playerNameInput.value || "Player").trim();
      const totalPlayers = Number.parseInt(totalPlayersSelect.value, 10) || 1;
      const botPlayers = Math.max(0, totalPlayers - 1);
      window.__railwaysSessionSetup = {
        mode,
        totalPlayers,
        botPlayers,
        botAuthority: "server",
        startCityId: startCitySelect.value,
        colorHex: colorInput.value,
      };

      if (mode === "single" || mode === "multi-host") {
        url.searchParams.set("net", "host");
      } else {
        url.searchParams.set("net", "join");
      }
      url.searchParams.set("player", playerName || (mode === "multi-join" ? "Player" : "Host"));
      if (mode === "multi-join") {
        url.searchParams.set("server", serverUrlInput.value.trim() || "ws://localhost:4422");
      } else {
        url.searchParams.delete("server");
      }
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      bootstrapRailwaysNetworkingFromUrl(new URL(window.location.href));
      startRailwaysGameRuntime({
        startCityId: startCitySelect.value,
        colorHex: colorInput.value,
      });
      overlay.classList.add("hidden");
      window.setTimeout(() => overlay.remove(), 260);
    } catch (err) {
      statusEl.textContent = `Unable to start: ${String(err)}`;
      startBtn.disabled = false;
    }
  });
}

ensureBaseRailwaysUrlState();
const worldLoadPromise = import("../../examples/globe-demo/main.ts");
buildMenu(worldLoadPromise);
