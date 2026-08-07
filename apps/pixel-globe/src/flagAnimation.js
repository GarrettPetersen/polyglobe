export const FLAG_WAVE_FRAME_COUNT = 12;
export const FLAG_WIND_DIRECTION_COUNT = 8;
export const FLAG_SLACK_MAX_STRENGTH = 0.18;

export function flagWaveFrameIndex(phaseRad) {
  if (!Number.isFinite(phaseRad)) throw new Error(`Invalid flag wave phase: ${phaseRad}`);
  const cycle = ((phaseRad / (Math.PI * 2)) % 1 + 1) % 1;
  return Math.floor(cycle * FLAG_WAVE_FRAME_COUNT) % FLAG_WAVE_FRAME_COUNT;
}

export function flagWaveColumnOffsets(width, phaseRad, amplitudePx = 1) {
  if (!Number.isInteger(width) || width < 1) throw new Error(`Invalid flag width: ${width}`);
  if (!Number.isFinite(phaseRad)) throw new Error(`Invalid flag wave phase: ${phaseRad}`);
  if (!Number.isFinite(amplitudePx) || amplitudePx < 0) {
    throw new Error(`Invalid flag wave amplitude: ${amplitudePx}`);
  }

  return Array.from({ length: width }, (_, column) => {
    if (column === 0 || amplitudePx === 0) return 0;
    const columnPhase = column * Math.PI / width;
    const attachment = Math.min(1, column / Math.max(5, width * 0.45));
    return Math.round(Math.sin(phaseRad + columnPhase) * amplitudePx * 0.7 * attachment);
  });
}

export function flagSlackColumnLayout(width, height) {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new Error(`Invalid slack flag dimensions: ${width}x${height}`);
  }
  const fabricWidth = Math.min(width, Math.max(2, Math.round(width * 0.34)));
  const drop = Math.max(2, Math.round(height * 0.82));
  const columns = Array.from({ length: fabricWidth }, (_, column) => {
    const progress = fabricWidth <= 1 ? 0 : column / (fabricWidth - 1);
    const eased = progress * progress * (3 - 2 * progress);
    return Object.freeze({
      sourceStart: column / fabricWidth,
      sourceEnd: (column + 1) / fabricWidth,
      x: column,
      y: Math.round(drop * eased)
    });
  });
  return Object.freeze({
    fabricWidth,
    drop,
    columns: Object.freeze(columns)
  });
}

export function flagWindPose(flowDirectionRad, windStrength) {
  if (!Number.isFinite(flowDirectionRad)) {
    throw new Error(`Invalid flag wind direction: ${flowDirectionRad}`);
  }
  if (!Number.isFinite(windStrength) || windStrength < 0) {
    throw new Error(`Invalid flag wind strength: ${windStrength}`);
  }
  if (windStrength <= FLAG_SLACK_MAX_STRENGTH) {
    return Object.freeze({ slack: true, directionIndex: 0, angleRad: 0 });
  }
  const stepRad = Math.PI * 2 / FLAG_WIND_DIRECTION_COUNT;
  const normalized = ((flowDirectionRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const directionIndex = Math.round(normalized / stepRad) % FLAG_WIND_DIRECTION_COUNT;
  return Object.freeze({
    slack: false,
    directionIndex,
    angleRad: directionIndex * stepRad
  });
}

export function flagExteriorOutlineMask(rgbaPixels, width, height) {
  if (!(rgbaPixels instanceof Uint8ClampedArray) || rgbaPixels.length !== width * height * 4) {
    throw new Error(`Invalid flag RGBA buffer: ${rgbaPixels?.length}/${width}x${height}`);
  }
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new Error(`Invalid flag outline dimensions: ${width}x${height}`);
  }
  const outline = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (rgbaPixels[index * 4 + 3] !== 0) continue;
      for (let dy = -1; dy <= 1 && outline[index] === 0; dy++) {
        const sampleY = y + dy;
        if (sampleY < 0 || sampleY >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const sampleX = x + dx;
          if (sampleX < 0 || sampleX >= width) continue;
          if (rgbaPixels[(sampleY * width + sampleX) * 4 + 3] !== 0) {
            outline[index] = 255;
            break;
          }
        }
      }
    }
  }
  return outline;
}
