const INTERIOR_TRIANGLE_SAMPLES = Object.freeze([
  Object.freeze([1 / 3, 1 / 3, 1 / 3]),
  Object.freeze([0.6, 0.2, 0.2]),
  Object.freeze([0.2, 0.6, 0.2]),
  Object.freeze([0.2, 0.2, 0.6])
]);

function flattenedTriangleTextureColor(textureSampler, uvs) {
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const [weightA, weightB, weightC] of INTERIOR_TRIANGLE_SAMPLES) {
    const u = uvs[0].x * weightA + uvs[1].x * weightB + uvs[2].x * weightC;
    const v = uvs[0].y * weightA + uvs[1].y * weightB + uvs[2].y * weightC;
    const color = textureSampler.sample(u, v);
    if (!color || ![color.r, color.g, color.b].every(Number.isFinite)) {
      throw new Error("Ship texture flattening sampled a malformed RGB color");
    }
    red += color.r;
    green += color.g;
    blue += color.b;
  }
  return {
    r: Math.round(red / INTERIOR_TRIANGLE_SAMPLES.length),
    g: Math.round(green / INTERIOR_TRIANGLE_SAMPLES.length),
    b: Math.round(blue / INTERIOR_TRIANGLE_SAMPLES.length)
  };
}

export function flattenShipTriangleTextures(triangles, fallbackTextureSampler = null) {
  if (!Array.isArray(triangles) || triangles.length === 0) {
    throw new Error("Ship texture flattening requires triangles");
  }
  return triangles.map((triangle) => {
    const textureSampler = triangle.textureSampler || fallbackTextureSampler;
    if (!textureSampler || !triangle.uvs) return triangle;
    if (typeof textureSampler.sample !== "function" || triangle.uvs.length !== 3) {
      throw new Error("Ship texture flattening requires a sampler and three UV coordinates");
    }
    return {
      ...triangle,
      color: flattenedTriangleTextureColor(textureSampler, triangle.uvs),
      textureSampler: null,
      uvs: null
    };
  });
}
