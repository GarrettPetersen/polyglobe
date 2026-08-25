export const CHART_INTEGRITY_SEVERE_CONFIRMATION_MS = 10_000;
export const CHART_INTEGRITY_ACTIVE_REPAIR_CONFIRMATION_MS = 20_000;
export const CHART_INTEGRITY_CATASTROPHIC_CONFIRMATION_MS = 3_000;
export const CHART_INTEGRITY_CATASTROPHIC_REPAIR_CONFIRMATION_MS = 10_000;

const SEVERE = Object.freeze({
  rotationDeg: 8,
  rmsDistortionPx: 12,
  maxDistortionPx: 26,
  terrainTearPx: 18,
  waterTearPx: 80,
  viewportEdgeGapPx: 8,
  viewportInteriorGapPx: 80
});
const CATASTROPHIC = Object.freeze({
  rotationDeg: 14,
  rmsDistortionPx: 24,
  maxDistortionPx: 45,
  terrainTearPx: 32,
  waterTearPx: 160,
  viewportEdgeGapPx: 24,
  viewportInteriorGapPx: 120
});

export function createChartIntegrityTelemetryMonitor() {
  return {
    lastSampleAtMs: null,
    unhealthySinceMs: null,
    reportedSeverity: "none",
    worstFault: null,
    samplesObserved: 0,
    severeSamples: 0,
    catastrophicSamples: 0,
    incidentsDetected: 0,
    maximumAbsoluteTiltDeg: 0,
    maximumTerrainTearPx: 0,
    maximumWaterTearPx: 0,
    maximumViewportEdgeGapPx: 0,
    maximumViewportInteriorGapPx: 0
  };
}

export function observeChartIntegrityTelemetry(monitor, sample) {
  validateMonitor(monitor);
  const normalized = normalizeSample(sample);
  if (monitor.lastSampleAtMs !== null && normalized.nowMs < monitor.lastSampleAtMs) {
    throw new Error(
      `Chart integrity telemetry time moved backwards: ${normalized.nowMs} < ${monitor.lastSampleAtMs}`
    );
  }
  monitor.lastSampleAtMs = normalized.nowMs;
  monitor.samplesObserved++;
  monitor.maximumAbsoluteTiltDeg = Math.max(
    monitor.maximumAbsoluteTiltDeg,
    Math.abs(normalized.drift.rotationDeg)
  );
  monitor.maximumTerrainTearPx = Math.max(
    monitor.maximumTerrainTearPx,
    normalized.terrainTear.extraPx
  );
  monitor.maximumWaterTearPx = Math.max(
    monitor.maximumWaterTearPx,
    normalized.waterTear.extraPx
  );
  monitor.maximumViewportEdgeGapPx = Math.max(
    monitor.maximumViewportEdgeGapPx,
    normalized.coverage.edge.maximumGapPx
  );
  monitor.maximumViewportInteriorGapPx = Math.max(
    monitor.maximumViewportInteriorGapPx,
    normalized.coverage.interior.maximumNearestTileDistancePx
  );

  const fault = dominantChartIntegrityFault(normalized);
  if (fault.severity === "none") {
    monitor.unhealthySinceMs = null;
    monitor.reportedSeverity = "none";
    monitor.worstFault = null;
    return null;
  }

  if (fault.severity === "catastrophic") monitor.catastrophicSamples++;
  else monitor.severeSamples++;
  monitor.unhealthySinceMs ??= normalized.nowMs;
  if (monitor.worstFault === null || fault.score > monitor.worstFault.score) {
    monitor.worstFault = fault;
  }
  const activeRepair = !["none", "pending"].includes(normalized.repairKind);
  const confirmationMs = activeRepair
    ? fault.severity === "catastrophic"
      ? CHART_INTEGRITY_CATASTROPHIC_REPAIR_CONFIRMATION_MS
      : CHART_INTEGRITY_ACTIVE_REPAIR_CONFIRMATION_MS
    : fault.severity === "catastrophic"
      ? CHART_INTEGRITY_CATASTROPHIC_CONFIRMATION_MS
      : CHART_INTEGRITY_SEVERE_CONFIRMATION_MS;
  const durationMs = normalized.nowMs - monitor.unhealthySinceMs;
  if (durationMs < confirmationMs || severityRank(fault.severity) <= severityRank(monitor.reportedSeverity)) {
    return null;
  }

  monitor.reportedSeverity = fault.severity;
  monitor.incidentsDetected++;
  return Object.freeze({
    ...normalized,
    category: fault.category,
    severity: fault.severity,
    score: fault.score,
    durationMs,
    worstCategory: monitor.worstFault.category,
    worstScore: monitor.worstFault.score
  });
}

export function chartIntegrityTelemetryStats(monitor) {
  validateMonitor(monitor);
  return Object.freeze({
    samplesObserved: monitor.samplesObserved,
    severeSamples: monitor.severeSamples,
    catastrophicSamples: monitor.catastrophicSamples,
    incidentsDetected: monitor.incidentsDetected,
    maximumAbsoluteTiltDeg: round(monitor.maximumAbsoluteTiltDeg),
    maximumTerrainTearPx: round(monitor.maximumTerrainTearPx),
    maximumWaterTearPx: round(monitor.maximumWaterTearPx),
    maximumViewportEdgeGapPx: round(monitor.maximumViewportEdgeGapPx),
    maximumViewportInteriorGapPx: round(monitor.maximumViewportInteriorGapPx)
  });
}

export function chartIntegrityIncidentError(incident) {
  if (!incident || incident.severity === "none") {
    throw new Error("Chart integrity incident error requires a reported incident");
  }
  const tear = incident.terrainTear;
  const coverage = incident.coverage;
  const error = new Error([
    `${incident.severity} ${incident.category} persisted ${Math.round(incident.durationMs)}ms`,
    `tilt ${incident.drift.rotationDeg.toFixed(2)}deg`,
    `rms ${incident.drift.rmsDistortionPx.toFixed(2)}px`,
    `max ${incident.drift.maxDistortionPx.toFixed(2)}px`,
    `tear ${tear.signedExtraPx.toFixed(2)}px ${tear.surface || "none"} ` +
      `[${tear.tileIds.join(":") || "none"}]`,
    `water tear ${incident.waterTear.signedExtraPx.toFixed(2)}px ` +
      `[${incident.waterTear.tileIds.join(":") || "none"}]`,
    `edge ${coverage.edge.maximumGapPx.toFixed(2)}px ${coverage.edge.edge || "none"}`,
    `void ${coverage.interior.maximumNearestTileDistancePx.toFixed(2)}px`,
    `repair ${incident.repairKind}`
  ].join("; "));
  Object.defineProperty(error, "name", {
    configurable: true,
    value: `ChartIntegrity${pascalCase(incident.category)}`
  });
  return error;
}

function dominantChartIntegrityFault(sample) {
  const candidates = [
    metricFault("tilt", Math.abs(sample.drift.rotationDeg), "rotationDeg"),
    metricFault("rms-distortion", sample.drift.rmsDistortionPx, "rmsDistortionPx"),
    metricFault("maximum-distortion", sample.drift.maxDistortionPx, "maxDistortionPx"),
    metricFault(terrainTearCategory(sample.terrainTear), sample.terrainTear.extraPx, "terrainTearPx"),
    metricFault(terrainTearCategory(sample.waterTear), sample.waterTear.extraPx, "waterTearPx"),
    metricFault("viewport-edge-gap", sample.coverage.edge.maximumGapPx, "viewportEdgeGapPx"),
    metricFault(
      "viewport-interior-void",
      sample.coverage.interior.maximumNearestTileDistancePx,
      "viewportInteriorGapPx"
    )
  ];
  return candidates.reduce((worst, candidate) => (
    severityRank(candidate.severity) > severityRank(worst.severity) ||
    (candidate.severity === worst.severity && candidate.score > worst.score)
      ? candidate
      : worst
  ), Object.freeze({ category: "none", severity: "none", score: 0 }));
}

function metricFault(category, value, thresholdKey) {
  const severity = value >= CATASTROPHIC[thresholdKey]
    ? "catastrophic"
    : value >= SEVERE[thresholdKey]
      ? "severe"
      : "none";
  return Object.freeze({
    category,
    severity,
    score: value / SEVERE[thresholdKey]
  });
}

function terrainTearCategory(tear) {
  const spacing = tear.signedExtraPx < 0 ? "compression" : "separation";
  return `${tear.surface || "terrain"}-${spacing}`;
}

function normalizeSample(sample) {
  if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
    throw new Error("Chart integrity telemetry requires a sample");
  }
  const drift = sample.drift;
  const terrainTear = sample.terrainTear;
  const waterTear = sample.waterTear;
  const coverage = sample.coverage;
  requireFinite(sample.nowMs, "sample time");
  for (const [label, value] of Object.entries({
    rotation: drift?.rotationDeg,
    rmsDistortion: drift?.rmsDistortionPx,
    maximumDistortion: drift?.maxDistortionPx,
    terrainTear: terrainTear?.extraPx,
    signedTerrainTear: terrainTear?.signedExtraPx,
    waterTear: waterTear?.extraPx,
    signedWaterTear: waterTear?.signedExtraPx,
    viewportEdgeGap: coverage?.edge?.maximumGapPx,
    viewportInteriorGap: coverage?.interior?.maximumNearestTileDistancePx
  })) requireFinite(value, label);
  if (!Array.isArray(terrainTear.tileIds) || terrainTear.tileIds.some((id) => !Number.isInteger(id))) {
    throw new Error("Chart integrity telemetry requires terrain tear tile ids");
  }
  if (!Array.isArray(waterTear.tileIds) || waterTear.tileIds.some((id) => !Number.isInteger(id))) {
    throw new Error("Chart integrity telemetry requires water tear tile ids");
  }
  if (typeof sample.repairKind !== "string" || sample.repairKind.length === 0) {
    throw new Error("Chart integrity telemetry requires a repair kind");
  }
  return Object.freeze({
    nowMs: sample.nowMs,
    drift: Object.freeze({
      rotationDeg: drift.rotationDeg,
      rmsDistortionPx: drift.rmsDistortionPx,
      maxDistortionPx: drift.maxDistortionPx
    }),
    terrainTear: Object.freeze({
      extraPx: terrainTear.extraPx,
      signedExtraPx: terrainTear.signedExtraPx,
      tileIds: Object.freeze(terrainTear.tileIds.slice()),
      surface: terrainTear.surface || null,
      screenX: finiteOrNull(terrainTear.screenX),
      screenY: finiteOrNull(terrainTear.screenY)
    }),
    waterTear: Object.freeze({
      extraPx: waterTear.extraPx,
      signedExtraPx: waterTear.signedExtraPx,
      tileIds: Object.freeze(waterTear.tileIds.slice()),
      surface: "water",
      screenX: finiteOrNull(waterTear.screenX),
      screenY: finiteOrNull(waterTear.screenY)
    }),
    coverage: Object.freeze({
      edge: Object.freeze({
        maximumGapPx: coverage.edge.maximumGapPx,
        edge: coverage.edge.edge || null
      }),
      interior: Object.freeze({
        maximumNearestTileDistancePx: coverage.interior.maximumNearestTileDistancePx,
        screenX: finiteOrNull(coverage.interior.screenX),
        screenY: finiteOrNull(coverage.interior.screenY)
      }),
      viewportTileCount: Number.isInteger(coverage.viewportTileCount)
        ? coverage.viewportTileCount
        : 0
    }),
    repairKind: sample.repairKind
  });
}

function validateMonitor(monitor) {
  if (!monitor || typeof monitor !== "object" || Array.isArray(monitor) ||
      !Number.isInteger(monitor.samplesObserved) || monitor.samplesObserved < 0) {
    throw new Error("Invalid chart integrity telemetry monitor");
  }
}

function severityRank(severity) {
  if (severity === "none") return 0;
  if (severity === "severe") return 1;
  if (severity === "catastrophic") return 2;
  throw new Error(`Unknown chart integrity severity: ${severity}`);
}

function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new Error(`Chart integrity telemetry has invalid ${label}: ${value}`);
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function pascalCase(value) {
  return value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

function round(value) {
  return Math.round(value * 100) / 100;
}
