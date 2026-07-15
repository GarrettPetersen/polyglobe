export function cityCrackSegments(seed, width, height) {
  if (!Number.isInteger(seed)) throw new Error(`City crack seed must be an integer: ${seed}`);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16) {
    throw new Error(`City crack canvas must be at least 16x16: ${width}x${height}`);
  }

  const hash = hashInt(seed ^ 0x43524143);
  const direction = (hash & 1) === 0 ? -1 : 1;
  const start = {
    x: clamp(Math.floor(width * 0.43) + signedJitter(hash >>> 2, 3), 4, width - 5),
    y: clamp(Math.floor(height * 0.22) + signedJitter(hash >>> 6, 2), 3, height - 13)
  };
  const joint = {
    x: clamp(start.x + direction * 2, 3, width - 4),
    y: start.y + 4
  };
  const lowerJoint = {
    x: clamp(joint.x - direction, 3, width - 4),
    y: joint.y + 4
  };
  const end = {
    x: clamp(lowerJoint.x + direction * 3, 3, width - 4),
    y: Math.min(height - 4, lowerJoint.y + 5)
  };
  const branch = {
    x: clamp(joint.x - direction * 4, 3, width - 4),
    y: joint.y + 3
  };
  const secondStart = {
    x: clamp(Math.floor(width * 0.69) + signedJitter(hash >>> 10, 2), 4, width - 5),
    y: clamp(Math.floor(height * 0.42) + signedJitter(hash >>> 14, 2), 4, height - 9)
  };
  const secondJoint = {
    x: clamp(secondStart.x - direction * 2, 3, width - 4),
    y: secondStart.y + 3
  };

  return [
    segment(start, joint),
    segment(joint, lowerJoint),
    segment(lowerJoint, end),
    segment(joint, branch),
    segment(branch, { x: clamp(branch.x + direction, 3, width - 4), y: branch.y + 3 }),
    segment(secondStart, secondJoint),
    segment(secondJoint, {
      x: clamp(secondJoint.x + direction * 3, 3, width - 4),
      y: Math.min(height - 4, secondJoint.y + 4)
    })
  ];
}

function segment(a, b) {
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
}

function signedJitter(value, radius) {
  return value % (radius * 2 + 1) - radius;
}

function hashInt(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
