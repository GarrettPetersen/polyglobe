const STRONG_GREEN_MIN = 150;
const STRONG_GREEN_MARGIN = 60;
const FRINGE_GREEN_MIN = 48;
const FRINGE_GREEN_RED_MARGIN = 18;
const FRINGE_GREEN_BLUE_MARGIN = 8;
const MAX_FRINGE_DEPTH = 2;

export function removePortraitChromaFringe(imageData, width, height) {
  const data = imageData?.data;
  if (!data || data.length !== width * height * 4) {
    throw new Error("Portrait chroma cleanup requires matching RGBA image dimensions");
  }

  const pixelCount = width * height;
  const remove = new Uint8Array(pixelCount);
  const depth = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueLength = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (!isStrongChromaGreen(data[offset], data[offset + 1], data[offset + 2])) continue;
    remove[pixel] = 1;
    queue[queueLength] = pixel;
    queueLength += 1;
  }

  for (let cursor = 0; cursor < queueLength; cursor += 1) {
    const pixel = queue[cursor];
    if (depth[pixel] >= MAX_FRINGE_DEPTH) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nextX = x + dx;
        const nextY = y + dy;
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
        const next = nextY * width + nextX;
        if (remove[next]) continue;
        const offset = next * 4;
        if (!isChromaFringe(data[offset], data[offset + 1], data[offset + 2])) continue;
        remove[next] = 1;
        depth[next] = depth[pixel] + 1;
        queue[queueLength] = next;
        queueLength += 1;
      }
    }
  }

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (remove[pixel]) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    } else if (data[offset + 3] > 0) {
      data[offset + 3] = 255;
    }
  }
  return queueLength;
}

function isStrongChromaGreen(red, green, blue) {
  return green >= STRONG_GREEN_MIN
    && green - red >= STRONG_GREEN_MARGIN
    && green - blue >= STRONG_GREEN_MARGIN;
}

function isChromaFringe(red, green, blue) {
  return green >= FRINGE_GREEN_MIN
    && green - red >= FRINGE_GREEN_RED_MARGIN
    && green - blue >= FRINGE_GREEN_BLUE_MARGIN;
}
