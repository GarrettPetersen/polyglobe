import { UNDERWATER_REFRACTION_SHADER_TIME_COEFFICIENT } from "./underwaterRefraction.js";
import { SHIP_SURFACE_LIGHTING_BLEND } from "./shipLighting.js";

if (SHIP_SURFACE_LIGHTING_BLEND !== "soft-light") {
  throw new Error(`World renderer cannot apply ship-lighting blend: ${SHIP_SURFACE_LIGHTING_BLEND}`);
}

const SCENE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
in vec4 a_color;
in vec2 a_effect;

uniform vec2 u_resolution;
uniform vec2 u_translation;

out vec2 v_texCoord;
out vec4 v_color;
out vec2 v_effect;

void main() {
  vec2 clip = ((a_position + u_translation) / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_texCoord = a_texCoord;
  v_color = a_color;
  v_effect = a_effect;
}
`;

export const WORLD_SCENE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_source;
uniform float u_time;
uniform vec2 u_textureSize;

in vec2 v_texCoord;
in vec4 v_color;
in vec2 v_effect;
out vec4 outColor;

void main() {
  vec2 uv = v_texCoord;
  if (v_effect.x != 0.0) {
    float sourcePixelY = floor(v_texCoord.y * u_textureSize.y);
    float wave = sin((sourcePixelY + u_time * ${UNDERWATER_REFRACTION_SHADER_TIME_COEFFICIENT.toFixed(12)}) * 1.57079632679);
    uv.x += wave * v_effect.x / max(1.0, u_textureSize.x);
  }
  vec4 source = texture(u_source, uv);
  if (source.a <= v_effect.y) discard;
  outColor = source * v_color;
}
`;

const BIT_MASK_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_maskTexCoord;
in vec2 a_alphaTexCoord;

uniform vec2 u_resolution;

out vec2 v_maskTexCoord;
out vec2 v_alphaTexCoord;

void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_maskTexCoord = a_maskTexCoord;
  v_alphaTexCoord = a_alphaTexCoord;
}
`;

export const BIT_MASK_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_maskSource;
uniform sampler2D u_alphaSource;
uniform int u_channel;
uniform float u_bitValue;
uniform vec4 u_color;

in vec2 v_maskTexCoord;
in vec2 v_alphaTexCoord;
out vec4 outColor;

vec3 softLight(vec3 base, vec3 blend) {
  vec3 low = base - (1.0 - 2.0 * blend) * base * (1.0 - base);
  vec3 curve = mix(
    ((16.0 * base - 12.0) * base + 4.0) * base,
    sqrt(base),
    step(vec3(0.25), base)
  );
  vec3 high = base + (2.0 * blend - 1.0) * (curve - base);
  return mix(low, high, step(vec3(0.5), blend));
}

void main() {
  vec4 packed = texture(u_maskSource, v_maskTexCoord);
  float channel = u_channel == 0 ? packed.r : packed.g;
  float byteValue = floor(channel * 255.0 + 0.5);
  float enabled = mod(floor(byteValue / u_bitValue), 2.0);
  vec4 base = texture(u_alphaSource, v_alphaTexCoord);
  if (enabled < 0.5 || base.a < 0.5) discard;
  outColor = vec4(mix(base.rgb, softLight(base.rgb, u_color.rgb), u_color.a), base.a);
}
`;

const PRESENT_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const PRESENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_scene;
uniform sampler2D u_palette;
uniform bool u_grade;

in vec2 v_texCoord;
out vec4 outColor;

vec3 paletteGrade(vec3 source) {
  vec3 bins = floor(source * 31.875);
  float index = bins.r * 1024.0 + bins.g * 32.0 + bins.b;
  float paletteX = mod(index, 1024.0);
  float paletteY = floor(index / 1024.0);
  return texture(
    u_palette,
    vec2((paletteX + 0.5) / 1024.0, (paletteY + 0.5) / 32.0)
  ).rgb;
}

void main() {
  vec4 source = texture(u_scene, v_texCoord);
  if (u_grade) source.rgb = paletteGrade(source.rgb);
  outColor = source;
}
`;

const FLOATS_PER_VERTEX = 10;
const BIT_MASK_FLOATS_PER_VERTEX = 6;
const VERTICES_PER_QUAD = 6;
const FLOATS_PER_QUAD = FLOATS_PER_VERTEX * VERTICES_PER_QUAD;
const INITIAL_ATLAS_QUAD_CAPACITY = 1024;
const DEFAULT_ATLAS_SIZE = 4096;
const DEFAULT_CHUNK_CACHE_LIMIT = 24;
const DEFAULT_PERSISTENT_BATCH_CACHE_LIMIT = 96;

export class TextureAtlasAllocator {
  constructor(width, height, padding = 1) {
    if (!Number.isInteger(width) || width <= 0 ||
        !Number.isInteger(height) || height <= 0) {
      throw new Error(`Invalid texture atlas dimensions: ${width}x${height}`);
    }
    if (!Number.isInteger(padding) || padding < 0) {
      throw new Error(`Invalid texture atlas padding: ${padding}`);
    }
    this.width = width;
    this.height = height;
    this.padding = padding;
    this.x = padding;
    this.y = padding;
    this.rowHeight = 0;
  }

  allocate(width, height) {
    const rect = this.tryAllocate(width, height);
    if (!rect) {
      throw new Error(`Texture atlas is full while allocating ${width}x${height}`);
    }
    return rect;
  }

  tryAllocate(width, height) {
    if (!Number.isInteger(width) || width <= 0 ||
        !Number.isInteger(height) || height <= 0) {
      throw new Error(`Invalid atlas allocation: ${width}x${height}`);
    }
    if (width + this.padding * 2 > this.width ||
        height + this.padding * 2 > this.height) {
      throw new Error(`Atlas allocation exceeds page dimensions: ${width}x${height}`);
    }
    let x = this.x;
    let y = this.y;
    let rowHeight = this.rowHeight;
    if (x + width + this.padding > this.width) {
      x = this.padding;
      y += rowHeight + this.padding;
      rowHeight = 0;
    }
    if (y + height + this.padding > this.height) return null;
    const rect = Object.freeze({ x, y, width, height });
    this.x = x + width + this.padding;
    this.y = y;
    this.rowHeight = Math.max(rowHeight, height);
    return rect;
  }
}

export class PagedTextureAtlasAllocator {
  constructor(width, height, padding = 1) {
    this.width = width;
    this.height = height;
    this.padding = padding;
    this.pages = [new TextureAtlasAllocator(width, height, padding)];
  }

  allocate(width, height) {
    let pageIndex = this.pages.length - 1;
    let rect = this.pages[pageIndex].tryAllocate(width, height);
    if (!rect) {
      pageIndex = this.pages.length;
      const page = new TextureAtlasAllocator(this.width, this.height, this.padding);
      this.pages.push(page);
      rect = page.allocate(width, height);
    }
    return Object.freeze({ pageIndex, ...rect });
  }

  get pageCount() {
    return this.pages.length;
  }
}

export class LruChunkKeys {
  constructor(limit = DEFAULT_CHUNK_CACHE_LIMIT) {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error(`Invalid chunk cache limit: ${limit}`);
    }
    this.limit = limit;
    this.keys = [];
  }

  touch(key) {
    const index = this.keys.indexOf(key);
    if (index >= 0) this.keys.splice(index, 1);
    this.keys.push(key);
    return this.keys.length > this.limit ? this.keys.shift() : null;
  }
}

export function orderedAtlasPageRuns(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("Ordered atlas page runs require an array");
  }
  const runs = [];
  for (const entry of entries) {
    if (!entry || !Number.isInteger(entry.pageIndex) || entry.pageIndex < 0) {
      throw new Error(`Invalid ordered atlas page index: ${entry?.pageIndex}`);
    }
    const previous = runs.at(-1);
    if (previous?.pageIndex === entry.pageIndex) {
      previous.entries.push(entry);
    } else {
      runs.push({ pageIndex: entry.pageIndex, entries: [entry] });
    }
  }
  return runs;
}

export function quadVertices({
  sourceRect,
  textureWidth,
  textureHeight,
  destinationRect,
  color = [1, 1, 1, 1],
  refractionPx = 0,
  alphaThreshold = 0,
  flipX = false
}) {
  validateRect(sourceRect, "source");
  validateRect(destinationRect, "destination");
  if (!Number.isFinite(textureWidth) || textureWidth <= 0 ||
      !Number.isFinite(textureHeight) || textureHeight <= 0) {
    throw new Error(`Invalid quad texture dimensions: ${textureWidth}x${textureHeight}`);
  }
  if (!Array.isArray(color) || color.length !== 4 ||
      color.some((value) => !Number.isFinite(value))) {
    throw new Error("Quad color must contain four finite channels");
  }
  if (!Number.isFinite(refractionPx) || !Number.isFinite(alphaThreshold)) {
    throw new Error("Quad effects must be finite");
  }

  const x0 = destinationRect.x;
  const y0 = destinationRect.y;
  const x1 = x0 + destinationRect.width;
  const y1 = y0 + destinationRect.height;
  let u0 = sourceRect.x / textureWidth;
  const v0 = sourceRect.y / textureHeight;
  let u1 = (sourceRect.x + sourceRect.width) / textureWidth;
  const v1 = (sourceRect.y + sourceRect.height) / textureHeight;
  if (flipX) [u0, u1] = [u1, u0];
  const points = [
    [x0, y0, u0, v0],
    [x1, y0, u1, v0],
    [x0, y1, u0, v1],
    [x0, y1, u0, v1],
    [x1, y0, u1, v0],
    [x1, y1, u1, v1]
  ];
  return new Float32Array(points.flatMap(([x, y, u, v]) => [
    x, y, u, v,
    color[0], color[1], color[2], color[3],
    refractionPx, alphaThreshold
  ]));
}

export function bitMaskQuadVertices({
  maskSourceRect,
  maskTextureWidth,
  maskTextureHeight,
  alphaSourceRect,
  alphaTextureWidth,
  alphaTextureHeight,
  destinationRect
}) {
  validateRect(maskSourceRect, "bit-mask source");
  validateRect(alphaSourceRect, "bit-mask alpha source");
  validateRect(destinationRect, "bit-mask destination");
  for (const [label, value] of Object.entries({
    maskTextureWidth,
    maskTextureHeight,
    alphaTextureWidth,
    alphaTextureHeight
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid ${label}: ${value}`);
    }
  }
  const x0 = destinationRect.x;
  const y0 = destinationRect.y;
  const x1 = x0 + destinationRect.width;
  const y1 = y0 + destinationRect.height;
  const mu0 = maskSourceRect.x / maskTextureWidth;
  const mv0 = maskSourceRect.y / maskTextureHeight;
  const mu1 = (maskSourceRect.x + maskSourceRect.width) / maskTextureWidth;
  const mv1 = (maskSourceRect.y + maskSourceRect.height) / maskTextureHeight;
  const au0 = alphaSourceRect.x / alphaTextureWidth;
  const av0 = alphaSourceRect.y / alphaTextureHeight;
  const au1 = (alphaSourceRect.x + alphaSourceRect.width) / alphaTextureWidth;
  const av1 = (alphaSourceRect.y + alphaSourceRect.height) / alphaTextureHeight;
  return new Float32Array([
    x0, y0, mu0, mv0, au0, av0,
    x1, y0, mu1, mv0, au1, av0,
    x0, y1, mu0, mv1, au0, av1,
    x0, y1, mu0, mv1, au0, av1,
    x1, y0, mu1, mv0, au1, av0,
    x1, y1, mu1, mv1, au1, av1
  ]);
}

export function allocateWorldSceneTexture(gl, {
  texture,
  framebuffer,
  width,
  height,
  preferredFormat = "rgba8"
}) {
  if (!gl || typeof gl.texImage2D !== "function" ||
      typeof gl.checkFramebufferStatus !== "function") {
    throw new Error("World scene texture allocation requires WebGL2");
  }
  if (!texture || !framebuffer) {
    throw new Error("World scene texture allocation requires a texture and framebuffer");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid world scene texture dimensions: ${width}x${height}`);
  }
  const formats = [
    {
      id: "rgba8",
      internalFormat: gl.RGBA8,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE
    },
    {
      id: "rgb8",
      internalFormat: gl.RGB8,
      format: gl.RGB,
      type: gl.UNSIGNED_BYTE
    },
    {
      id: "rgba",
      internalFormat: gl.RGBA,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE
    },
    {
      id: "rgb565",
      internalFormat: gl.RGB565,
      format: gl.RGB,
      type: gl.UNSIGNED_SHORT_5_6_5
    }
  ];
  if (!formats.some((candidate) => candidate.id === preferredFormat)) {
    throw new Error(`Unknown preferred world scene texture format: ${preferredFormat}`);
  }
  formats.sort((a, b) => Number(b.id === preferredFormat) - Number(a.id === preferredFormat));
  const failures = [];
  for (const candidate of formats) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      candidate.internalFormat,
      width,
      height,
      0,
      candidate.format,
      candidate.type,
      null
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status === gl.FRAMEBUFFER_COMPLETE) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return candidate.id;
    }
    failures.push(`${candidate.id}:${status}`);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  throw new Error(`World scene framebuffer is incomplete: ${failures.join(", ")}`);
}

export function createWorldWebGL2Renderer({
  atlasSize = DEFAULT_ATLAS_SIZE,
  chunkCacheLimit = DEFAULT_CHUNK_CACHE_LIMIT
} = {}) {
  if (typeof document === "undefined") {
    throw new Error("World WebGL2 renderer requires a browser document");
  }
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false
  });
  if (!gl) throw new Error("Marque & Reprisal requires WebGL2 for world rendering");
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!precision || precision.precision < 16) {
    throw new Error("WebGL2 fragment precision is insufficient for exact palette lighting");
  }

  const sceneProgram = createProgram(gl, SCENE_VERTEX_SHADER, WORLD_SCENE_FRAGMENT_SHADER);
  const sceneLocations = {
    position: requiredAttribute(gl, sceneProgram, "a_position"),
    texCoord: requiredAttribute(gl, sceneProgram, "a_texCoord"),
    color: requiredAttribute(gl, sceneProgram, "a_color"),
    effect: requiredAttribute(gl, sceneProgram, "a_effect"),
    resolution: requiredUniform(gl, sceneProgram, "u_resolution"),
    translation: requiredUniform(gl, sceneProgram, "u_translation"),
    source: requiredUniform(gl, sceneProgram, "u_source"),
    time: requiredUniform(gl, sceneProgram, "u_time"),
    textureSize: requiredUniform(gl, sceneProgram, "u_textureSize")
  };
  const bitMaskProgram = createProgram(gl, BIT_MASK_VERTEX_SHADER, BIT_MASK_FRAGMENT_SHADER);
  const bitMaskLocations = {
    position: requiredAttribute(gl, bitMaskProgram, "a_position"),
    maskTexCoord: requiredAttribute(gl, bitMaskProgram, "a_maskTexCoord"),
    alphaTexCoord: requiredAttribute(gl, bitMaskProgram, "a_alphaTexCoord"),
    resolution: requiredUniform(gl, bitMaskProgram, "u_resolution"),
    maskSource: requiredUniform(gl, bitMaskProgram, "u_maskSource"),
    alphaSource: requiredUniform(gl, bitMaskProgram, "u_alphaSource"),
    channel: requiredUniform(gl, bitMaskProgram, "u_channel"),
    bitValue: requiredUniform(gl, bitMaskProgram, "u_bitValue"),
    color: requiredUniform(gl, bitMaskProgram, "u_color")
  };
  const presentProgram = createProgram(gl, PRESENT_VERTEX_SHADER, PRESENT_FRAGMENT_SHADER);
  const presentLocations = {
    position: requiredAttribute(gl, presentProgram, "a_position"),
    texCoord: requiredAttribute(gl, presentProgram, "a_texCoord"),
    scene: requiredUniform(gl, presentProgram, "u_scene"),
    palette: requiredUniform(gl, presentProgram, "u_palette"),
    grade: requiredUniform(gl, presentProgram, "u_grade")
  };
  const sceneVertexBuffer = requiredBuffer(gl, "world scene vertex buffer");
  const bitMaskVertexBuffer = requiredBuffer(gl, "world bit-mask vertex buffer");
  const presentVertexBuffer = requiredBuffer(gl, "world presentation vertex buffer");
  const sceneVertexArray = gl.createVertexArray();
  const bitMaskVertexArray = gl.createVertexArray();
  const presentVertexArray = gl.createVertexArray();
  if (!sceneVertexArray || !bitMaskVertexArray || !presentVertexArray) {
    throw new Error("Could not allocate world vertex arrays");
  }
  gl.bindVertexArray(presentVertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, presentVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0, 0,
     1, -1, 1, 0,
    -1,  1, 0, 1,
     1,  1, 1, 1
  ]), gl.STATIC_DRAW);

  const paletteTexture = createNearestTexture(gl);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255])
  );
  const atlasAllocator = new PagedTextureAtlasAllocator(atlasSize, atlasSize);
  const atlasPages = [];
  const atlasEntries = new WeakMap();
  let activeAtlasPageIndex = null;
  let atlasVertices = new Float32Array(FLOATS_PER_QUAD * INITIAL_ATLAS_QUAD_CAPACITY);
  let atlasFloatCount = 0;
  const chunkTextures = new Map();
  const chunkLru = new LruChunkKeys(chunkCacheLimit);
  const persistentBatches = new Map();
  const persistentBatchLru = new LruChunkKeys(DEFAULT_PERSISTENT_BATCH_CACHE_LIMIT);
  const sceneTexture = createNearestTexture(gl);
  const sceneFramebuffer = gl.createFramebuffer();
  if (!sceneFramebuffer) throw new Error("Could not allocate world scene framebuffer");

  let sceneWidth = 0;
  let sceneHeight = 0;
  let sceneTextureFormat = "rgba8";
  let paletteKey = null;
  let frameTimeMs = 0;
  let frameGrade = false;
  let atlasSourceCount = 0;
  let drawCalls = 0;
  let uploadedChunks = 0;
  let replacedChunkTextures = 0;
  let updatedChunkTextures = 0;
  let sceneVertexCapacityBytes = 0;
  let persistentBatchRebuilds = 0;
  let persistentBatchDraws = 0;
  const solidPixelSource = createSolidPixelSource();
  configureSceneAttributes();
  configureBitMaskAttributes();
  configurePresentationAttributes();
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  if (gl.UNPACK_COLORSPACE_CONVERSION_WEBGL !== undefined) {
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  }

  function configureSceneAttributes() {
    gl.bindVertexArray(sceneVertexArray);
    gl.useProgram(sceneProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneVertexBuffer);
    const stride = FLOATS_PER_VERTEX * 4;
    configureAttribute(gl, sceneLocations.position, 2, stride, 0);
    configureAttribute(gl, sceneLocations.texCoord, 2, stride, 2 * 4);
    configureAttribute(gl, sceneLocations.color, 4, stride, 4 * 4);
    configureAttribute(gl, sceneLocations.effect, 2, stride, 8 * 4);
    gl.uniform1i(sceneLocations.source, 0);
  }

  function configurePresentationAttributes() {
    gl.bindVertexArray(presentVertexArray);
    gl.useProgram(presentProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, presentVertexBuffer);
    configureAttribute(gl, presentLocations.position, 2, 4 * 4, 0);
    configureAttribute(gl, presentLocations.texCoord, 2, 4 * 4, 2 * 4);
    gl.uniform1i(presentLocations.scene, 0);
    gl.uniform1i(presentLocations.palette, 1);
  }

  function configureBitMaskAttributes() {
    gl.bindVertexArray(bitMaskVertexArray);
    gl.useProgram(bitMaskProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, bitMaskVertexBuffer);
    const stride = BIT_MASK_FLOATS_PER_VERTEX * 4;
    configureAttribute(gl, bitMaskLocations.position, 2, stride, 0);
    configureAttribute(gl, bitMaskLocations.maskTexCoord, 2, stride, 2 * 4);
    configureAttribute(gl, bitMaskLocations.alphaTexCoord, 2, stride, 4 * 4);
    gl.uniform1i(bitMaskLocations.maskSource, 0);
    gl.uniform1i(bitMaskLocations.alphaSource, 1);
  }

  function resize(width, height) {
    if (!Number.isInteger(width) || width <= 0 ||
        !Number.isInteger(height) || height <= 0) {
      throw new Error(`Invalid world renderer viewport: ${width}x${height}`);
    }
    if (sceneWidth === width && sceneHeight === height) return;
    sceneWidth = width;
    sceneHeight = height;
    canvas.width = width;
    canvas.height = height;
    gl.activeTexture(gl.TEXTURE0);
    const allocatedFormat = allocateWorldSceneTexture(gl, {
      texture: sceneTexture,
      framebuffer: sceneFramebuffer,
      width,
      height,
      preferredFormat: sceneTextureFormat
    });
    if (allocatedFormat !== sceneTextureFormat) {
      console.warn(
        `World renderer switched scene texture from ${sceneTextureFormat} to ${allocatedFormat}`
      );
      sceneTextureFormat = allocatedFormat;
    }
  }

  function beginFrame({ width, height, clearColor, paletteVariant = null, timeMs = 0 }) {
    resize(width, height);
    validateColor(clearColor, "World renderer clear color");
    if (!Number.isFinite(timeMs)) throw new Error(`Invalid world renderer time: ${timeMs}`);
    atlasFloatCount = 0;
    drawCalls = 0;
    uploadedChunks = 0;
    replacedChunkTextures = 0;
    updatedChunkTextures = 0;
    persistentBatchRebuilds = 0;
    persistentBatchDraws = 0;
    frameTimeMs = timeMs;
    frameGrade = Boolean(paletteVariant);
    updatePaletteTexture(paletteVariant);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFramebuffer);
    gl.viewport(0, 0, width, height);
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function updatePaletteTexture(variant) {
    if (!variant) return;
    if (!variant.key || !(variant.pixels instanceof Uint8ClampedArray)) {
      throw new Error("World renderer requires a cached palette variant");
    }
    if (paletteKey === variant.key) return;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      variant.width,
      variant.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      variant.pixels
    );
    paletteKey = variant.key;
  }

  function drawChunk({
    key,
    source,
    revision = 0,
    sourceRect = null,
    destinationRect,
    alpha = 1
  }) {
    flushBatches();
    if (typeof key !== "string" || key.length === 0) {
      throw new Error("World chunk requires a cache key");
    }
    validateCanvasSource(source, `world chunk ${key}`);
    validateUnitInterval(alpha, "world chunk alpha");
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    const texture = residentChunkTexture(key, source, revision, width, height);
    drawTextureQuad(
      texture,
      width,
      height,
      sourceRect || { x: 0, y: 0, width, height },
      destinationRect,
      alpha
    );
  }

  function residentChunkTexture(key, source, revision, width, height) {
    let entry = chunkTextures.get(key);
    const needsUpload = !entry || entry.source !== source ||
      entry.revision !== revision || entry.width !== width || entry.height !== height;
    if (!entry) {
      entry = {
        texture: createNearestTexture(gl),
        source: null,
        revision: null,
        width: 0,
        height: 0
      };
      chunkTextures.set(key, entry);
    }
    if (needsUpload) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      if (entry.width === width && entry.height === height) {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          source
        );
        updatedChunkTextures++;
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        replacedChunkTextures++;
      }
      entry.source = source;
      entry.revision = revision;
      entry.width = width;
      entry.height = height;
      uploadedChunks++;
    }
    const evictedKey = chunkLru.touch(key);
    if (evictedKey !== null) {
      const evicted = chunkTextures.get(evictedKey);
      if (!evicted) throw new Error(`World chunk cache lost its LRU entry: ${evictedKey}`);
      gl.deleteTexture(evicted.texture);
      chunkTextures.delete(evictedKey);
    }
    return entry.texture;
  }

  function registerAtlasSource(source) {
    validateCanvasSource(source, "world atlas source");
    const existing = atlasEntries.get(source);
    if (existing) return existing;
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    const rect = atlasAllocator.allocate(width, height);
    const page = atlasPage(rect.pageIndex);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, page.texture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      rect.x,
      rect.y,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source
    );
    const entry = Object.freeze({
      ...rect,
      textureWidth: atlasSize,
      textureHeight: atlasSize
    });
    atlasEntries.set(source, entry);
    atlasSourceCount++;
    return entry;
  }

  function atlasPage(pageIndex) {
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex > atlasPages.length) {
      throw new Error(`Invalid world atlas page: ${pageIndex}`);
    }
    if (pageIndex < atlasPages.length) return atlasPages[pageIndex];
    gl.activeTexture(gl.TEXTURE0);
    const texture = createNearestTexture(gl);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      atlasSize,
      atlasSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    const page = Object.freeze({ texture });
    atlasPages.push(page);
    return page;
  }

  function activateAtlasPage(pageIndex) {
    if (activeAtlasPageIndex === pageIndex) return;
    flushAtlasBatch();
    atlasPage(pageIndex);
    activeAtlasPageIndex = pageIndex;
  }

  function drawAtlasSprite({
    source,
    sourceRect = null,
    destinationRect,
    alpha = 1,
    tint = [1, 1, 1],
    refractionPx = 0,
    alphaThreshold = 0,
    flipX = false
  }) {
    const entry = registerAtlasSource(source);
    activateAtlasPage(entry.pageIndex);
    const local = sourceRect || { x: 0, y: 0, width: entry.width, height: entry.height };
    validateRect(local, "atlas source");
    if (local.x + local.width > entry.width || local.y + local.height > entry.height) {
      throw new Error("Atlas source rectangle exceeds its registered image");
    }
    validateUnitInterval(alpha, "atlas sprite alpha");
    if (!Array.isArray(tint) || tint.length !== 3 ||
        tint.some((channel) => !Number.isFinite(channel))) {
      throw new Error("Atlas sprite tint requires three finite channels");
    }
    validateRect(destinationRect, "atlas destination");
    if (!Number.isFinite(refractionPx) || !Number.isFinite(alphaThreshold)) {
      throw new Error("Atlas sprite effects must be finite");
    }
    appendAtlasQuad({
      sourceRect: {
        x: entry.x + local.x,
        y: entry.y + local.y,
        width: local.width,
        height: local.height
      },
      textureWidth: atlasSize,
      textureHeight: atlasSize,
      destinationRect,
      color: [tint[0], tint[1], tint[2], alpha],
      refractionPx,
      alphaThreshold,
      flipX
    });
  }

  function drawPersistentAtlasSprites({
    key,
    revision,
    createSprites,
    offset = { x: 0, y: 0 }
  }) {
    flushBatches();
    if (typeof key !== "string" || key.length === 0) {
      throw new Error("Persistent atlas batch requires a cache key");
    }
    if ((typeof revision !== "string" && typeof revision !== "number") ||
        (typeof revision === "number" && !Number.isFinite(revision))) {
      throw new Error(`Persistent atlas batch ${key} requires a stable revision`);
    }
    if (typeof createSprites !== "function") {
      throw new Error(`Persistent atlas batch ${key} requires a sprite factory`);
    }
    if (!offset || !Number.isFinite(offset.x) || !Number.isFinite(offset.y)) {
      throw new Error(`Persistent atlas batch ${key} requires a finite offset`);
    }

    let batch = persistentBatches.get(key);
    if (!batch || batch.revision !== revision) {
      if (batch) deletePersistentBatch(batch);
      batch = createPersistentBatch(key, revision, createSprites());
      persistentBatches.set(key, batch);
      persistentBatchRebuilds++;
    }
    const evictedKey = persistentBatchLru.touch(key);
    if (evictedKey !== null) {
      const evicted = persistentBatches.get(evictedKey);
      if (!evicted) {
        throw new Error(`Persistent atlas cache lost its LRU entry: ${evictedKey}`);
      }
      deletePersistentBatch(evicted);
      persistentBatches.delete(evictedKey);
    }

    for (const group of batch.groups) {
      drawPersistentGroup(group, offset);
      persistentBatchDraws++;
    }
    activeAtlasPageIndex = null;
  }

  function createPersistentBatch(key, revision, sprites) {
    if (!Array.isArray(sprites)) {
      throw new Error(`Persistent atlas batch ${key} factory did not return an array`);
    }
    const spriteVertices = sprites.map((sprite) => {
      if (!sprite || !sprite.source) {
        throw new Error(`Persistent atlas batch ${key} contains a malformed sprite`);
      }
      const entry = registerAtlasSource(sprite.source);
      const local = sprite.sourceRect || {
        x: 0,
        y: 0,
        width: entry.width,
        height: entry.height
      };
      validateRect(local, "persistent atlas source");
      if (local.x + local.width > entry.width || local.y + local.height > entry.height) {
        throw new Error(`Persistent atlas batch ${key} source rectangle exceeds its image`);
      }
      validateRect(sprite.destinationRect, "persistent atlas destination");
      const alpha = sprite.alpha ?? 1;
      const tint = sprite.tint ?? [1, 1, 1];
      const refractionPx = sprite.refractionPx ?? 0;
      const alphaThreshold = sprite.alphaThreshold ?? 0;
      validateUnitInterval(alpha, "persistent atlas alpha");
      if (!Array.isArray(tint) || tint.length !== 3 ||
          tint.some((channel) => !Number.isFinite(channel))) {
        throw new Error(`Persistent atlas batch ${key} tint requires three finite channels`);
      }
      if (!Number.isFinite(refractionPx) || !Number.isFinite(alphaThreshold)) {
        throw new Error(`Persistent atlas batch ${key} effects must be finite`);
      }
      return {
        pageIndex: entry.pageIndex,
        vertices: quadVertices({
          sourceRect: {
            x: entry.x + local.x,
            y: entry.y + local.y,
            width: local.width,
            height: local.height
          },
          textureWidth: atlasSize,
          textureHeight: atlasSize,
          destinationRect: sprite.destinationRect,
          color: [tint[0], tint[1], tint[2], alpha],
          refractionPx,
          alphaThreshold,
          flipX: Boolean(sprite.flipX)
        })
      };
    });

    // Texture changes require separate draws, but merging non-adjacent page
    // entries would reorder overlapping sprites and break painter ordering.
    const groups = orderedAtlasPageRuns(spriteVertices).map(({ pageIndex, entries }) => {
      const vertexLength = entries.reduce((total, entry) => total + entry.vertices.length, 0);
      const vertices = new Float32Array(vertexLength);
      let vertexOffset = 0;
      for (const entry of entries) {
        vertices.set(entry.vertices, vertexOffset);
        vertexOffset += entry.vertices.length;
      }
      const buffer = requiredBuffer(gl, `persistent atlas batch ${key}`);
      const vertexArray = gl.createVertexArray();
      if (!vertexArray) throw new Error(`Could not allocate persistent atlas batch ${key}`);
      gl.bindVertexArray(vertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      const stride = FLOATS_PER_VERTEX * 4;
      configureAttribute(gl, sceneLocations.position, 2, stride, 0);
      configureAttribute(gl, sceneLocations.texCoord, 2, stride, 2 * 4);
      configureAttribute(gl, sceneLocations.color, 4, stride, 4 * 4);
      configureAttribute(gl, sceneLocations.effect, 2, stride, 8 * 4);
      return Object.freeze({
        pageIndex,
        buffer,
        vertexArray,
        vertexCount: vertices.length / FLOATS_PER_VERTEX
      });
    });
    return { key, revision, groups };
  }

  function drawPersistentGroup(group, offset) {
    gl.useProgram(sceneProgram);
    gl.bindVertexArray(group.vertexArray);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasPage(group.pageIndex).texture);
    gl.uniform2f(sceneLocations.resolution, sceneWidth, sceneHeight);
    gl.uniform2f(sceneLocations.translation, offset.x, offset.y);
    gl.uniform2f(sceneLocations.textureSize, atlasSize, atlasSize);
    gl.uniform1f(sceneLocations.time, frameTimeMs);
    gl.drawArrays(gl.TRIANGLES, 0, group.vertexCount);
    drawCalls++;
  }

  function deletePersistentBatch(batch) {
    for (const group of batch.groups) {
      gl.deleteVertexArray(group.vertexArray);
      gl.deleteBuffer(group.buffer);
    }
  }

  function drawSolidRect({ destinationRect, color }) {
    validateRect(destinationRect, "solid destination");
    if (!Array.isArray(color) || color.length !== 4) {
      throw new Error("World solid color requires four channels");
    }
    for (const channel of color) validateUnitInterval(channel, "world solid color channel");
    const entry = registerAtlasSource(solidPixelSource);
    activateAtlasPage(entry.pageIndex);
    appendAtlasQuad({
      sourceRect: entry,
      textureWidth: atlasSize,
      textureHeight: atlasSize,
      destinationRect,
      color,
      refractionPx: 0,
      alphaThreshold: 0,
      flipX: false
    });
  }

  function drawBitMaskSprite({
    maskSource,
    maskSourceRect,
    alphaSource,
    alphaSourceRect,
    destinationRect,
    bitIndex,
    color
  }) {
    flushBatches();
    if (!Number.isInteger(bitIndex) || bitIndex < 0 || bitIndex >= 16) {
      throw new Error(`World bit-mask index must be between 0 and 15: ${bitIndex}`);
    }
    if (!Array.isArray(color) || color.length !== 4) {
      throw new Error("World bit-mask color requires four channels");
    }
    for (const channel of color) validateUnitInterval(channel, "world bit-mask color channel");
    const maskEntry = registerAtlasSource(maskSource);
    const alphaEntry = registerAtlasSource(alphaSource);
    validateRect(maskSourceRect, "bit-mask source");
    validateRect(alphaSourceRect, "bit-mask alpha source");
    if (maskSourceRect.x + maskSourceRect.width > maskEntry.width ||
        maskSourceRect.y + maskSourceRect.height > maskEntry.height) {
      throw new Error("World bit-mask source rectangle exceeds its image");
    }
    if (alphaSourceRect.x + alphaSourceRect.width > alphaEntry.width ||
        alphaSourceRect.y + alphaSourceRect.height > alphaEntry.height) {
      throw new Error("World bit-mask alpha rectangle exceeds its image");
    }
    const vertices = bitMaskQuadVertices({
      maskSourceRect: {
        x: maskEntry.x + maskSourceRect.x,
        y: maskEntry.y + maskSourceRect.y,
        width: maskSourceRect.width,
        height: maskSourceRect.height
      },
      maskTextureWidth: atlasSize,
      maskTextureHeight: atlasSize,
      alphaSourceRect: {
        x: alphaEntry.x + alphaSourceRect.x,
        y: alphaEntry.y + alphaSourceRect.y,
        width: alphaSourceRect.width,
        height: alphaSourceRect.height
      },
      alphaTextureWidth: atlasSize,
      alphaTextureHeight: atlasSize,
      destinationRect
    });
    gl.useProgram(bitMaskProgram);
    gl.bindVertexArray(bitMaskVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, bitMaskVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasPage(maskEntry.pageIndex).texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasPage(alphaEntry.pageIndex).texture);
    gl.uniform2f(bitMaskLocations.resolution, sceneWidth, sceneHeight);
    gl.uniform1i(bitMaskLocations.channel, bitIndex < 8 ? 0 : 1);
    gl.uniform1f(bitMaskLocations.bitValue, 2 ** (bitIndex & 7));
    gl.uniform4f(bitMaskLocations.color, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / BIT_MASK_FLOATS_PER_VERTEX);
    drawCalls++;
    activeAtlasPageIndex = null;
  }

  function flushBatches() {
    flushAtlasBatch();
  }

  function flushAtlasBatch() {
    if (atlasFloatCount === 0) return;
    if (activeAtlasPageIndex === null) {
      throw new Error("World atlas batch has no active texture page");
    }
    const vertices = atlasVertices.subarray(0, atlasFloatCount);
    atlasFloatCount = 0;
    drawVertices(atlasPage(activeAtlasPageIndex).texture, atlasSize, atlasSize, vertices);
  }

  function appendAtlasQuad({
    sourceRect,
    textureWidth,
    textureHeight,
    destinationRect,
    color,
    refractionPx,
    alphaThreshold,
    flipX
  }) {
    ensureAtlasVertexCapacity(atlasFloatCount + FLOATS_PER_QUAD);
    const x0 = destinationRect.x;
    const y0 = destinationRect.y;
    const x1 = x0 + destinationRect.width;
    const y1 = y0 + destinationRect.height;
    let u0 = sourceRect.x / textureWidth;
    const v0 = sourceRect.y / textureHeight;
    let u1 = (sourceRect.x + sourceRect.width) / textureWidth;
    const v1 = (sourceRect.y + sourceRect.height) / textureHeight;
    if (flipX) [u0, u1] = [u1, u0];
    appendAtlasVertex(x0, y0, u0, v0, color, refractionPx, alphaThreshold);
    appendAtlasVertex(x1, y0, u1, v0, color, refractionPx, alphaThreshold);
    appendAtlasVertex(x0, y1, u0, v1, color, refractionPx, alphaThreshold);
    appendAtlasVertex(x0, y1, u0, v1, color, refractionPx, alphaThreshold);
    appendAtlasVertex(x1, y0, u1, v0, color, refractionPx, alphaThreshold);
    appendAtlasVertex(x1, y1, u1, v1, color, refractionPx, alphaThreshold);
  }

  function ensureAtlasVertexCapacity(requiredLength) {
    if (requiredLength <= atlasVertices.length) return;
    let nextLength = atlasVertices.length;
    while (nextLength < requiredLength) nextLength *= 2;
    const next = new Float32Array(nextLength);
    next.set(atlasVertices.subarray(0, atlasFloatCount));
    atlasVertices = next;
  }

  function appendAtlasVertex(x, y, u, v, color, refractionPx, alphaThreshold) {
    atlasVertices[atlasFloatCount++] = x;
    atlasVertices[atlasFloatCount++] = y;
    atlasVertices[atlasFloatCount++] = u;
    atlasVertices[atlasFloatCount++] = v;
    atlasVertices[atlasFloatCount++] = color[0];
    atlasVertices[atlasFloatCount++] = color[1];
    atlasVertices[atlasFloatCount++] = color[2];
    atlasVertices[atlasFloatCount++] = color[3];
    atlasVertices[atlasFloatCount++] = refractionPx;
    atlasVertices[atlasFloatCount++] = alphaThreshold;
  }

  function drawTextureQuad(texture, textureWidth, textureHeight, sourceRect, destinationRect, alpha) {
    drawVertices(texture, textureWidth, textureHeight, quadVertices({
      sourceRect,
      textureWidth,
      textureHeight,
      destinationRect,
      color: [1, 1, 1, alpha]
    }));
  }

  function drawVertices(texture, textureWidth, textureHeight, vertices) {
    if (!(vertices instanceof Float32Array) ||
        vertices.length % FLOATS_PER_VERTEX !== 0) {
      throw new Error("World renderer received malformed vertices");
    }
    gl.useProgram(sceneProgram);
    gl.bindVertexArray(sceneVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneVertexBuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform2f(sceneLocations.resolution, sceneWidth, sceneHeight);
    gl.uniform2f(sceneLocations.translation, 0, 0);
    gl.uniform2f(sceneLocations.textureSize, textureWidth, textureHeight);
    gl.uniform1f(sceneLocations.time, frameTimeMs);
    const requiredBytes = vertices.byteLength;
    if (requiredBytes > sceneVertexCapacityBytes) {
      sceneVertexCapacityBytes = nextPowerOfTwo(requiredBytes);
      gl.bufferData(gl.ARRAY_BUFFER, sceneVertexCapacityBytes, gl.DYNAMIC_DRAW);
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / FLOATS_PER_VERTEX);
    drawCalls++;
  }

  function endFrame() {
    flushBatches();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, sceneWidth, sceneHeight);
    gl.disable(gl.BLEND);
    gl.useProgram(presentProgram);
    gl.bindVertexArray(presentVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, presentVertexBuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
    gl.uniform1i(presentLocations.grade, frameGrade ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND);
    drawCalls++;
    return canvas;
  }

  return Object.freeze({
    canvas,
    beginFrame,
    drawChunk,
    drawAtlasSprite,
    drawBitMaskSprite,
    drawPersistentAtlasSprites,
    drawSolidRect,
    endFrame,
    stats: () => Object.freeze({
      residentChunks: chunkTextures.size,
      atlasSources: atlasSourceCount,
      atlasPages: atlasAllocator.pageCount,
      drawCalls,
      uploadedChunks,
      replacedChunkTextures,
      updatedChunkTextures,
      sceneVertexCapacityBytes,
      persistentBatches: persistentBatches.size,
      persistentBatchRebuilds,
      persistentBatchDraws
    })
  });
}

function createSolidPixelSource() {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the world renderer solid pixel");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1, 1);
  return canvas;
}

function nextPowerOfTwo(value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Cannot size a GPU buffer for ${value} bytes`);
  }
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

function requiredBuffer(gl, label) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error(`Could not allocate ${label}`);
  return buffer;
}

function configureAttribute(gl, location, size, stride, offset) {
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
}

function createNearestTexture(gl) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Could not allocate world texture");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  if (!program) throw new Error("Could not allocate world shader program");
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Could not link world shader program: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not allocate world shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Could not compile world shader: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function requiredAttribute(gl, program, name) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) throw new Error(`World shader attribute is missing: ${name}`);
  return location;
}

function requiredUniform(gl, program, name) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`World shader uniform is missing: ${name}`);
  return location;
}

function validateRect(rect, label) {
  if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y) ||
      !Number.isFinite(rect.width) || rect.width <= 0 ||
      !Number.isFinite(rect.height) || rect.height <= 0) {
    throw new Error(`Invalid ${label} rectangle`);
  }
}

function validateCanvasSource(source, label) {
  const width = source?.width || source?.naturalWidth;
  const height = source?.height || source?.naturalHeight;
  if (!Number.isFinite(width) || width <= 0 ||
      !Number.isFinite(height) || height <= 0) {
    throw new Error(`${label} has invalid dimensions`);
  }
}

function validateColor(color, label) {
  if (!Array.isArray(color) || color.length !== 4 ||
      color.some((channel) => !Number.isFinite(channel))) {
    throw new Error(`${label} requires four finite channels`);
  }
}

function validateUnitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between zero and one: ${value}`);
  }
}
