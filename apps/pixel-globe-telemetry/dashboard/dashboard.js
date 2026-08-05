const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});
const state = {
  days: 30,
  loading: false
};

document.querySelectorAll("[data-days]").forEach((button) => {
  button.addEventListener("click", () => {
    state.days = Number(button.dataset.days);
    document.querySelectorAll("[data-days]").forEach((entry) => {
      entry.classList.toggle("selected", entry === button);
    });
    loadDashboard();
  });
});

document.querySelector("#refresh").addEventListener("click", () => loadDashboard());
loadDashboard();

async function loadDashboard() {
  if (state.loading) return;
  state.loading = true;
  setStatus(`Reading the last ${state.days === 1 ? "24 hours" : `${state.days} days`}...`);
  try {
    const response = await fetch(`/api/dashboard?days=${state.days}`);
    if (!response.ok) throw new Error(`Dashboard request failed (${response.status})`);
    const data = await response.json();
    renderDashboard(data);
    setStatus(`Showing ${data.windowDays === 1 ? "24 hours" : `${data.windowDays} days`} of consenting telemetry`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.loading = false;
  }
}

function renderDashboard(data) {
  setText("metric-players", compact(data.totals.players));
  setText("metric-sessions", compact(data.totals.sessions));
  setText("metric-hours", `${numberFormat.format(data.totals.activeHours)}h`);
  setText("metric-session-length", `${numberFormat.format(data.totals.averageSessionMinutes)}m`);
  setText("metric-voyage-starts", compact(data.totals.voyageStarts));
  setText("metric-voyages", compact(data.totals.voyages));
  setText("metric-crashes", numberFormat.format(data.totals.crashesPerThousandSessions));
  setText("updated", `Updated ${formatDateTime(data.generatedAt)}`);
  renderActivity(data.daily);
  renderRetention(data.retention);
  renderFeatures(data.features);
  renderOutcomes(data.outcomes);
  renderStarts(data.starts);
  renderChannels(data.channels);
  renderEnvironments(data.environments);
  renderCrashes(data.crashes, data.totals.crashes);
}

function renderStarts(rows) {
  const target = document.querySelector("#starts-body");
  target.replaceChildren();
  if (rows.length === 0) return tableEmpty(target, 6, "No voyage starts recorded yet.");
  for (const row of rows) {
    const supplies = `${numberFormat.format(row.averageFoodDays)}d food / ` +
      `${numberFormat.format(row.averageWaterDays)}d water`;
    const captain = `${titleCase(row.captainSex)}, ${numberFormat.format(row.averageAge)} / ` +
      `${titleCase(row.religion)} / ${titleCase(row.captainSkills)}`;
    const loadout = `${titleCase(row.loadout)}: ${numberFormat.format(row.averageCrew)} crew, ` +
      `${numberFormat.format(row.averageCannons)} guns, ${numberFormat.format(row.averageCargo)} hold, ` +
      `${supplies}, ${numberFormat.format(row.averageDoubloons)} db`;
    target.append(tableRow([
      titleCase(row.mainQuest),
      `${row.homePort} / ${titleCase(row.faction)}`,
      titleCase(row.ship),
      captain,
      loadout,
      compact(row.starts)
    ]));
  }
}

function renderActivity(rows) {
  const target = document.querySelector("#activity-chart");
  target.replaceChildren();
  if (rows.length === 0) return target.append(emptyState("No activity in this period."));
  const sessionMax = Math.max(...rows.map((row) => row.sessions), 1);
  const hoursMax = Math.max(...rows.map((row) => row.activeHours), 1);
  for (const row of rows) {
    const day = element("div", "activity-day");
    day.title = `${formatDay(row.day)}: ${numberFormat.format(row.sessions)} sessions, ` +
      `${numberFormat.format(row.activeHours)} active hours, ${numberFormat.format(row.crashes)} crashes`;
    const sessionBar = element("i", "session-bar");
    sessionBar.style.height = `${Math.max(1, (row.sessions / sessionMax) * 100)}%`;
    const hourBar = element("i", "hour-bar");
    hourBar.style.height = `${Math.max(1, (row.activeHours / hoursMax) * 100)}%`;
    const time = document.createElement("time");
    time.dateTime = row.day;
    time.textContent = shortDay(row.day);
    day.append(sessionBar, hourBar, time);
    target.append(day);
  }
}

function renderRetention(rows) {
  const target = document.querySelector("#retention-chart");
  target.replaceChildren();
  if (rows.length === 0) return target.append(emptyState("No return sessions yet."));
  const combined = new Map();
  for (const row of rows) combined.set(row.window, (combined.get(row.window) || 0) + row.sessions);
  const order = ["first", "same-day", "next-day", "2-7-days", "8+-days"];
  const total = [...combined.values()].reduce((sum, value) => sum + value, 0);
  for (const name of order) {
    const value = combined.get(name) || 0;
    target.append(barRow(retentionLabel(name), total > 0 ? (value / total) * 100 : 0, compact(value)));
  }
}

function renderFeatures(rows) {
  const target = document.querySelector("#feature-chart");
  target.replaceChildren();
  if (!rows.some((row) => row.voyages > 0)) {
    return target.append(emptyState("No ended voyages in this period."));
  }
  for (const row of [...rows].sort((left, right) => right.percent - left.percent)) {
    target.append(barRow(titleCase(row.id), row.percent, `${numberFormat.format(row.percent)}%`));
  }
}

function renderOutcomes(rows) {
  const target = document.querySelector("#outcomes-body");
  target.replaceChildren();
  if (rows.length === 0) return tableEmpty(target, 5, "No ended voyages.");
  for (const row of rows) {
    target.append(tableRow([
      titleCase(row.mainQuest),
      titleCase(row.outcome),
      compact(row.voyages),
      duration(row.averageActiveSeconds),
      `${numberFormat.format(row.averageMappedPercent)}%`
    ]));
  }
}

function renderChannels(rows) {
  const target = document.querySelector("#channels-body");
  target.replaceChildren();
  if (rows.length === 0) return tableEmpty(target, 3, "No session channels.");
  for (const row of rows) {
    target.append(tableRow([titleCase(row.channel), compact(row.players), compact(row.sessions)]));
  }
}

function renderEnvironments(rows) {
  const target = document.querySelector("#environments-body");
  target.replaceChildren();
  if (rows.length === 0) return tableEmpty(target, 3, "No build data.");
  for (const row of rows.slice(0, 16)) {
    target.append(tableRow([
      `${titleCase(row.platform)} / ${row.locale}`,
      row.revision.slice(0, 10),
      compact(row.sessions)
    ]));
  }
}

function renderCrashes(rows, totalCrashes) {
  const target = document.querySelector("#crash-list");
  target.replaceChildren();
  setText("crash-summary", `${compact(totalCrashes)} reports`);
  if (rows.length === 0) return target.append(emptyState("No crashes reported in this period."));
  for (const row of rows) {
    const card = element("article", "crash-card");
    const copy = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = `${row.errorName}: ${row.message || "(no message)"}`;
    const detail = document.createElement("p");
    detail.textContent = `${row.channel} / ${row.platform} / ${row.screen} / ${row.revision.slice(0, 10)} ` +
      `| ${row.affectedInstallations} installation${row.affectedInstallations === 1 ? "" : "s"} ` +
      `| last ${formatDateTime(row.lastSeen)}`;
    copy.append(heading, detail);
    const count = element("strong", "crash-count");
    count.textContent = compact(row.reports);
    count.title = `${row.reports} reports`;
    card.append(copy, count);
    target.append(card);
  }
}

function barRow(label, percent, value) {
  const row = element("div", "bar-row");
  const name = document.createElement("span");
  name.textContent = label;
  const track = element("span", "bar-track");
  const fill = element("i", "bar-fill");
  fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  track.append(fill);
  const amount = document.createElement("strong");
  amount.textContent = value;
  row.append(name, track, amount);
  return row;
}

function tableRow(values) {
  const row = document.createElement("tr");
  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }
  return row;
}

function tableEmpty(target, colspan, message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = colspan;
  cell.textContent = message;
  row.append(cell);
  target.append(row);
}

function emptyState(message) {
  const node = element("p", "empty-state");
  node.textContent = message;
  return node;
}

function setStatus(message, isError = false) {
  const target = document.querySelector("#status");
  target.textContent = message;
  target.style.color = isError ? "var(--rust)" : "";
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function element(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function compact(value) {
  return compactFormat.format(Number(value) || 0);
}

function duration(seconds) {
  const minutes = Math.round(Number(seconds) / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatDay(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

function shortDay(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC"
  });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function retentionLabel(value) {
  return {
    first: "First session",
    "same-day": "Same day",
    "next-day": "Next day",
    "2-7-days": "2-7 days",
    "8+-days": "8+ days"
  }[value] || value;
}

function titleCase(value) {
  return String(value)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
