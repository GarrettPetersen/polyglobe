const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});
const state = {
  days: 30,
  loading: false,
  playtimeResizeObserver: null
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
  renderPlaytime(data.playtime);
  renderRetention(data.retention);
  renderFeatures(data.features);
  renderOutcomes(data.outcomes);
  renderStarts(data.starts);
  renderChannels(data.channels);
  renderEnvironments(data.environments);
  renderPerformanceIssues(
    data.performanceIssues || [],
    data.freezeIssues || [],
    data.fixedPerformanceIssues || [],
    data.fixedFreezeIssues || [],
    data.performanceCursor
  );
  renderMapIntegrityIssues(data.mapIntegrityIssues || []);
  renderCrashes(data.crashes, data.fixedCrashes, data.crashCursor);
}

function renderPlaytime(playtime) {
  const target = document.querySelector("#playtime-chart");
  const note = document.querySelector("#playtime-note");
  state.playtimeResizeObserver?.disconnect();
  target.replaceChildren();
  if (!playtime || playtime.sessions === 0 || playtime.buckets.length === 0) {
    setText("playtime-summary", "Mean - / Median -");
    note.textContent = playtime?.measuredSince
      ? `Accurate session-local timing begins ${formatDateTime(playtime.measuredSince)}.`
      : "";
    return target.append(emptyState("No session playtime in this period."));
  }

  setText(
    "playtime-summary",
    `Mean ${preciseDuration(playtime.meanSeconds)} / Median ${preciseDuration(playtime.medianSeconds)}`
  );
  const canvas = document.createElement("canvas");
  const marbleWeight = Math.max(1, Math.ceil(playtime.sessions / 360));
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `Session playtime distribution for ${playtime.sessions} sessions. ` +
      `Mean ${preciseDuration(playtime.meanSeconds)}; median ${preciseDuration(playtime.medianSeconds)}.`
  );
  target.append(canvas);
  const measuredSince = `Accurate session-local timing from ${formatDateTime(playtime.measuredSince)}. `;
  note.textContent = measuredSince + (marbleWeight === 1
    ? `${compact(playtime.sessions)} sessions. Each marble is one session; the time scale is compressed.`
    : `${compact(playtime.sessions)} sessions. Each marble represents about ${marbleWeight} sessions; ` +
      "the time scale is compressed.");

  const draw = () => drawPlaytimeChart(canvas, playtime, marbleWeight);
  state.playtimeResizeObserver = new ResizeObserver(draw);
  state.playtimeResizeObserver.observe(target);
  requestAnimationFrame(draw);
}

function drawPlaytimeChart(canvas, playtime, marbleWeight) {
  const width = Math.floor(canvas.parentElement?.clientWidth || 0);
  if (width < 1) return;
  const height = 270;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const context = canvas.getContext("2d");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const styles = getComputedStyle(document.documentElement);
  const colors = {
    ink: styles.getPropertyValue("--ink").trim(),
    muted: styles.getPropertyValue("--ink-muted").trim(),
    rule: styles.getPropertyValue("--rule").trim(),
    paper: styles.getPropertyValue("--paper-light").trim(),
    sea: styles.getPropertyValue("--sea").trim(),
    seaLight: styles.getPropertyValue("--sea-light").trim(),
    gold: styles.getPropertyValue("--gold").trim(),
    rust: styles.getPropertyValue("--rust").trim(),
    green: styles.getPropertyValue("--green").trim()
  };
  const left = width < 520 ? 34 : 46;
  const right = width < 520 ? 14 : 24;
  const top = 42;
  const baseline = height - 31;
  const plotWidth = Math.max(1, width - left - right);
  const maxSeconds = Math.max(
    60,
    playtime.maxSeconds,
    ...playtime.buckets.map((bucket) => bucket.averageSeconds)
  );
  const scaleX = (seconds) => {
    const ratio = Math.log1p(Math.max(0, seconds) / 30) / Math.log1p(maxSeconds / 30);
    return left + ratio * plotWidth;
  };

  drawPlaytimeAxis(context, { left, right, top, baseline, width, maxSeconds, scaleX, colors });
  const meanX = scaleX(playtime.meanSeconds);
  const medianX = scaleX(playtime.medianSeconds);
  const labelsOverlap = Math.abs(meanX - medianX) < 125;
  drawPlaytimeReference(context, {
    x: medianX,
    top,
    baseline,
    labelY: labelsOverlap ? 20 : 10,
    label: `Median ${preciseDuration(playtime.medianSeconds)}`,
    color: colors.sea,
    paper: colors.paper,
    width
  });
  drawPlaytimeReference(context, {
    x: meanX,
    top,
    baseline,
    labelY: 10,
    label: `Mean ${preciseDuration(playtime.meanSeconds)}`,
    color: colors.rust,
    paper: colors.paper,
    width
  });

  const spacing = width < 520 ? 6 : 7;
  const radius = spacing * 0.38;
  const maxRows = Math.max(1, Math.floor((baseline - top - 8) / spacing));
  const maxColumn = Math.max(0, Math.floor(plotWidth / spacing));
  const occupiedRows = new Map();
  const marbles = expandedMarbles(playtime.buckets, marbleWeight)
    .sort((leftEntry, rightEntry) => leftEntry.seconds - rightEntry.seconds);
  const marbleColors = [colors.sea, colors.gold, colors.green, colors.seaLight];
  for (let index = 0; index < marbles.length; index += 1) {
    const marble = marbles[index];
    const baseColumn = Math.round((scaleX(marble.seconds) - left) / spacing);
    const column = availableMarbleColumn(baseColumn, maxColumn, maxRows, occupiedRows);
    const row = occupiedRows.get(column) || 0;
    occupiedRows.set(column, row + 1);
    const x = left + column * spacing;
    const y = baseline - radius - 2 - row * spacing;
    drawMarble(context, x, y, radius, marbleColors[index % marbleColors.length], colors.ink);
  }
}

function drawPlaytimeAxis(context, { left, right, top, baseline, width, maxSeconds, scaleX, colors }) {
  context.save();
  context.font = '10px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
  context.textBaseline = "top";
  context.strokeStyle = colors.rule;
  context.fillStyle = colors.muted;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(left, baseline + 0.5);
  context.lineTo(width - right, baseline + 0.5);
  context.stroke();

  const candidates = [0, 60, 300, 900, 3600, 14400, 43200, 86400, 172800, 604800];
  const ticks = candidates.filter((seconds) => seconds <= maxSeconds);
  if (ticks.at(-1) !== maxSeconds) ticks.push(maxSeconds);
  let previousLabelRight = -Infinity;
  for (let index = 0; index < ticks.length; index += 1) {
    const seconds = ticks[index];
    const x = scaleX(seconds);
    const label = axisDuration(seconds);
    const labelWidth = context.measureText(label).width;
    const labelLeft = Math.max(left - labelWidth / 2, Math.min(x - labelWidth / 2, width - right - labelWidth));
    const isLast = index === ticks.length - 1;
    if (!isLast && labelLeft < previousLabelRight + 10) continue;
    context.strokeStyle = index === 0 ? colors.rule : `${colors.rule}55`;
    context.beginPath();
    context.moveTo(Math.round(x) + 0.5, top);
    context.lineTo(Math.round(x) + 0.5, baseline + 4);
    context.stroke();
    context.fillText(label, labelLeft, baseline + 10);
    previousLabelRight = labelLeft + labelWidth;
  }
  context.restore();
}

function drawPlaytimeReference(context, { x, top, baseline, labelY, label, color, paper, width }) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.setLineDash([5, 4]);
  context.beginPath();
  context.moveTo(Math.round(x), top - 5);
  context.lineTo(Math.round(x), baseline);
  context.stroke();
  context.setLineDash([]);
  context.font = 'bold 10px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
  const labelWidth = context.measureText(label).width;
  const labelX = Math.max(4, Math.min(x - labelWidth / 2, width - labelWidth - 4));
  context.fillStyle = paper;
  context.fillRect(labelX - 3, labelY - 2, labelWidth + 6, 14);
  context.fillStyle = color;
  context.fillText(label, labelX, labelY);
  context.restore();
}

function expandedMarbles(buckets, marbleWeight) {
  const marbles = [];
  for (const bucket of buckets) {
    const count = Math.max(1, Math.round(bucket.sessions / marbleWeight));
    for (let index = 0; index < count; index += 1) {
      marbles.push({ seconds: bucket.averageSeconds });
    }
  }
  return marbles;
}

function availableMarbleColumn(baseColumn, maxColumn, maxRows, occupiedRows) {
  for (let distance = 0; distance <= maxColumn; distance += 1) {
    const candidates = distance === 0
      ? [baseColumn]
      : [baseColumn + distance, baseColumn - distance];
    for (const column of candidates) {
      if (column < 0 || column > maxColumn) continue;
      if ((occupiedRows.get(column) || 0) < maxRows) return column;
    }
  }
  throw new Error("Session playtime chart has no room for another marble");
}

function drawMarble(context, x, y, radius, fill, outline) {
  context.save();
  context.fillStyle = fill;
  context.strokeStyle = outline;
  context.lineWidth = 0.75;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(255, 255, 255, 0.48)";
  context.beginPath();
  context.arc(x - radius * 0.3, y - radius * 0.3, Math.max(0.7, radius * 0.22), 0, Math.PI * 2);
  context.fill();
  context.restore();
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

function renderPerformanceIssues(rows, freezeRows, fixedRows, fixedFreezeRows, cursor) {
  const target = document.querySelector("#performance-list");
  const fixedSection = document.querySelector("#fixed-performance");
  const fixedTarget = document.querySelector("#fixed-performance-list");
  target.replaceChildren();
  fixedTarget.replaceChildren();
  const incidentCount = cursor?.activeReports ?? [...rows, ...freezeRows]
    .reduce((sum, row) => sum + row.reports, 0);
  setText(
    "performance-summary",
    cursor?.allFixedAt
      ? `${compact(incidentCount)} reports since last fix pass`
      : incidentCount === 0
        ? "No frame-health reports"
        : `${compact(incidentCount)} performance reports`
  );
  if (rows.length === 0 && freezeRows.length === 0) {
    target.append(emptyState(cursor?.allFixedAt
      ? `No performance incidents reported since ${formatDateTime(cursor.allFixedAt)}.`
      : "No persistent low frame rate or foreground freeze reported in this period."));
  } else {
    renderPerformanceCards(target, rows, freezeRows);
  }
  const showHistory = Boolean(cursor?.allFixedAt) &&
    (fixedRows.length > 0 || fixedFreezeRows.length > 0 || cursor.historicalReports > 0);
  fixedSection.hidden = !showHistory;
  fixedSection.open = false;
  if (!showHistory) return;
  setText(
    "fixed-performance-summary",
    `${compact(cursor.historicalReports)} earlier reports through ` +
      `${formatDateTime(cursor.allFixedAt)} (collapsed)`
  );
  if (fixedRows.length === 0 && fixedFreezeRows.length === 0) {
    fixedTarget.append(emptyState("No earlier performance groups in this reporting window."));
  } else {
    renderPerformanceCards(fixedTarget, fixedRows, fixedFreezeRows);
  }
}

function renderPerformanceCards(target, rows, freezeRows) {
  for (const row of freezeRows) target.append(freezeIssueCard(row));
  for (const row of rows) {
    const card = element("article", "performance-card");
    const heading = document.createElement("h3");
    heading.textContent = `${numberFormat.format(row.averageFps)} FPS in ` +
      `${titleCase(row.screen)} (${titleCase(row.dominantStage)})`;
    const context = document.createElement("p");
    context.textContent = `${row.channel} / ${row.platform} / ${row.revision.slice(0, 10)} | ` +
      `${titleCase(row.mainQuest)} / ${titleCase(row.ship)} | ` +
      `p95 frame ${numberFormat.format(row.averageP95FrameMs)} ms, ` +
      `CPU ${numberFormat.format(row.averageP95CpuMs)} ms, ` +
      `${numberFormat.format(row.averageLongFramePercent)}% long frames | ` +
      `${row.affectedInstallations} installation${row.affectedInstallations === 1 ? "" : "s"} | ` +
      `last ${formatDateTime(row.lastSeen)}`;
    const profile = document.createElement("p");
    profile.className = "performance-profile";
    profile.textContent = `Stages ${row.stageSummary} | Scene ${row.sceneSummary}`;
    const count = element("strong", "performance-count");
    count.textContent = compact(row.reports);
    count.title = `${row.reports} reports`;
    const copy = document.createElement("div");
    copy.append(heading, context, profile);
    card.append(copy, count);
    target.append(card);
  }
}

function freezeIssueCard(row) {
  const card = element("article", "performance-card");
  const heading = document.createElement("h3");
  heading.textContent = `${preciseDuration(row.averageGapMs / 1000)} freeze in ` +
    `${titleCase(row.screen)} (${titleCase(row.cause)})`;
  const context = document.createElement("p");
  context.textContent = `${row.channel} / ${row.platform} / ${row.revision.slice(0, 10)} | ` +
    `${titleCase(row.mainQuest)} / ${titleCase(row.ship)} | ` +
    `CPU ${numberFormat.format(row.averageCpuMs)} ms, ` +
    `scheduler delay ${numberFormat.format(row.averageSchedulerDelayMs)} ms | ` +
    `${row.affectedInstallations} installation${row.affectedInstallations === 1 ? "" : "s"} | ` +
    `last ${formatDateTime(row.lastSeen)}`;
  const profile = document.createElement("p");
  profile.className = "performance-profile";
  profile.textContent = `Recent work ${titleCase(row.recentWork)} ` +
    `(${numberFormat.format(row.averageRecentWorkMs)} ms) | Scene ${row.sceneSummary}`;
  const count = element("strong", "performance-count");
  count.textContent = compact(row.reports);
  count.title = `${row.reports} reports`;
  const copy = document.createElement("div");
  copy.append(heading, context, profile);
  card.append(copy, count);
  return card;
}

function renderCrashes(rows, fixedRows, cursor) {
  const target = document.querySelector("#crash-list");
  const fixedSection = document.querySelector("#fixed-crashes");
  const fixedTarget = document.querySelector("#fixed-crash-list");
  target.replaceChildren();
  fixedTarget.replaceChildren();
  setText("crash-summary", cursor?.allFixedAt
    ? `${compact(cursor.activeReports)} reports since last fix pass`
    : `${compact(cursor?.activeReports || 0)} reports`);
  if (rows.length === 0) {
    target.append(emptyState(cursor?.allFixedAt
      ? `No crashes reported since ${formatDateTime(cursor.allFixedAt)}.`
      : "No crashes reported in this period."));
  } else {
    renderCrashCards(target, rows, false);
  }
  const showHistory = Boolean(cursor?.allFixedAt) &&
    (fixedRows.length > 0 || cursor.historicalReports > 0);
  fixedSection.hidden = !showHistory;
  fixedSection.open = false;
  if (!showHistory) return;
  setText(
    "fixed-crash-summary",
    `${compact(cursor.historicalReports)} earlier reports through ` +
      `${formatDateTime(cursor.allFixedAt)} (collapsed)`
  );
  if (fixedRows.length === 0) {
    fixedTarget.append(emptyState("No earlier crash groups in this reporting window."));
  } else {
    renderCrashCards(fixedTarget, fixedRows, true);
  }
}

function renderMapIntegrityIssues(rows) {
  const target = document.querySelector("#map-integrity-list");
  target.replaceChildren();
  const reportCount = rows.reduce((sum, row) => sum + row.reports, 0);
  setText(
    "map-integrity-summary",
    reportCount === 0 ? "No map faults" : `${compact(reportCount)} diagnostic reports`
  );
  if (rows.length === 0) {
    target.append(emptyState("No persistent distortion or chart-integrity failure in this period."));
    return;
  }
  for (const row of rows) {
    const card = element("article", "crash-card map-integrity-card");
    const copy = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = `${titleCase(row.diagnosticName)}: ${row.message || "(no message)"}`;
    const detail = document.createElement("p");
    detail.textContent = `${row.channel} / ${row.platform} / ${row.screen} / ` +
      `${row.revision.slice(0, 10)} | ${row.affectedInstallations} installation` +
      `${row.affectedInstallations === 1 ? "" : "s"} | last ${formatDateTime(row.lastSeen)}`;
    copy.append(heading, detail);
    const count = element("strong", "crash-count");
    count.textContent = compact(row.reports);
    count.title = `${row.reports} reports`;
    card.append(copy, count);
    target.append(card);
  }
}

function renderCrashCards(target, rows, fixed) {
  for (const row of rows) {
    const card = element("article", `crash-card${fixed ? " fixed" : ""}`);
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
  cell.className = "empty-table-cell";
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

function preciseDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value < 60) return `${Math.round(value)}s`;
  const minutes = value / 60;
  if (minutes < 10) return `${numberFormat.format(minutes)}m`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function axisDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value === 0) return "0";
  if (value < 60) return `${Math.round(value)}s`;
  if (value < 3600) return `${Math.round(value / 60)}m`;
  if (value < 86400) return `${numberFormat.format(value / 3600)}h`;
  return `${numberFormat.format(value / 86400)}d`;
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
