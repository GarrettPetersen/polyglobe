export function pixelTextOrigin({ x, y, width, align = "left" }) {
  for (const [label, value] of Object.entries({ x, y, width })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid pixel text ${label}: ${value}`);
  }
  if (!new Set(["left", "center", "right"]).has(align)) {
    throw new Error(`Invalid pixel text alignment: ${align}`);
  }

  const alignedX = align === "center"
    ? x - width / 2
    : align === "right"
      ? x - width
      : x;
  return {
    x: Math.round(alignedX),
    y: Math.round(y)
  };
}

export function snapPointToTransformedPixelGrid(point, transform) {
  const values = {
    x: point?.x,
    y: point?.y,
    a: transform?.a,
    b: transform?.b,
    c: transform?.c,
    d: transform?.d,
    e: transform?.e,
    f: transform?.f
  };
  for (const [label, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) throw new Error(`Invalid transformed pixel ${label}: ${value}`);
  }

  const determinant = values.a * values.d - values.b * values.c;
  if (Math.abs(determinant) < 1e-9) throw new Error("Cannot snap text through a singular canvas transform");
  const canvasX = values.a * values.x + values.c * values.y + values.e;
  const canvasY = values.b * values.x + values.d * values.y + values.f;
  const snappedX = Math.round(canvasX);
  const snappedY = Math.round(canvasY);
  const translatedX = snappedX - values.e;
  const translatedY = snappedY - values.f;
  return {
    x: (values.d * translatedX - values.c * translatedY) / determinant,
    y: (-values.b * translatedX + values.a * translatedY) / determinant
  };
}
