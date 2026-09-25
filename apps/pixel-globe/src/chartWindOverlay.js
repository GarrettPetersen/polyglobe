export const CHART_WIND_TARGET_COUNT = 20;
export const CHART_WIND_MAX_COUNT = 36;

const AVERAGE_OFFSETS = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: -0.28, y: 0 }),
  Object.freeze({ x: 0.28, y: 0 }),
  Object.freeze({ x: 0, y: -0.28 }),
  Object.freeze({ x: 0, y: 0.28 })
]);

export function chartWindGridSize(width, height, targetCount = CHART_WIND_TARGET_COUNT) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Wind overlay requires a positive map: ${width}x${height}`);
  }
  if (!Number.isInteger(targetCount) || targetCount < 4) {
    throw new Error(`Wind overlay target count must be an integer of at least 4: ${targetCount}`);
  }
  const aspect = width / height;
  let rows = Math.max(2, Math.round(Math.sqrt(targetCount / aspect)));
  let columns = Math.max(2, Math.round(targetCount / rows));
  while (columns * rows > CHART_WIND_MAX_COUNT && (columns > 2 || rows > 2)) {
    if (columns >= rows && columns > 2) columns -= 1;
    else rows -= 1;
  }
  return Object.freeze({ columns, rows });
}

export function chartWindArrows({ width, height, sampleWind }) {
  if (typeof sampleWind !== "function") throw new Error("Wind overlay requires a sample function");
  const grid = chartWindGridSize(width, height);
  const cellWidth = width / grid.columns;
  const cellHeight = height / grid.rows;
  const arrows = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const centerX = (column + 0.5) * cellWidth;
      const centerY = (row + 0.5) * cellHeight;
      const samples = AVERAGE_OFFSETS.map((offset) => {
        const sampleX = centerX + offset.x * cellWidth;
        const sampleY = centerY + offset.y * cellHeight;
        if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) {
          throw new Error(`Wind sample left the chart: ${sampleX},${sampleY}`);
        }
        return sampleWind(sampleX, sampleY);
      });
      const average = averageWindSamples(samples);
      arrows.push(Object.freeze({
        x: centerX,
        y: centerY,
        ...chartWindArrowScreen(average.directionRad, average.strength)
      }));
    }
  }
  return Object.freeze(arrows);
}

export function averageWindSamples(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Wind average requires at least one sample");
  }
  let east = 0;
  let north = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample?.directionRad) || !Number.isFinite(sample?.strength)) {
      throw new Error("Wind sample direction and strength must be finite");
    }
    east += Math.cos(sample.directionRad) * sample.strength;
    north += Math.sin(sample.directionRad) * sample.strength;
  }
  east /= samples.length;
  north /= samples.length;
  return {
    directionRad: Math.atan2(north, east),
    strength: Math.hypot(east, north)
  };
}

export function chartWindArrowScreen(directionRad, strength) {
  if (!Number.isFinite(directionRad) || !Number.isFinite(strength)) {
    throw new Error("Wind arrow requires a finite direction and strength");
  }
  const flowRad = directionRad + Math.PI;
  const clampedStrength = Math.max(0, Math.min(1, strength));
  return {
    dx: Math.cos(flowRad),
    dy: -Math.sin(flowRad),
    length: 11 + Math.round(clampedStrength * 8),
    alpha: 0.62 + clampedStrength * 0.22
  };
}

export function chartWindToggleRect({
  mapX,
  mapY,
  mapWidth,
  mapHeight,
  labelWidth,
  obstacleRect = null
}) {
  if (![mapX, mapY, mapWidth, mapHeight, labelWidth].every(Number.isFinite)) {
    throw new Error("Wind toggle placement requires finite dimensions");
  }
  if (mapWidth <= 0 || mapHeight <= 0 || labelWidth < 0) {
    throw new Error("Wind toggle placement requires a positive map and a non-negative label");
  }
  const width = Math.min(Math.max(18, mapWidth - 6), Math.max(18, Math.ceil(labelWidth) + 8));
  const height = 12;
  const rect = {
    x: mapX + mapWidth - width - 3,
    y: mapY + mapHeight - height - 3,
    w: width,
    h: height
  };
  if (!obstacleRect || !rectsOverlap(rect, obstacleRect)) return rect;
  return {
    ...rect,
    y: Math.max(mapY + 3, obstacleRect.y - height - 2)
  };
}

function rectsOverlap(left, right) {
  return left.x < right.x + right.w &&
    right.x < left.x + left.w &&
    left.y < right.y + right.h &&
    right.y < left.y + left.h;
}
