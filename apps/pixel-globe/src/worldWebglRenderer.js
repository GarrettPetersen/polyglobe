const SCENE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
in vec4 a_color;
in vec2 a_effect;

uniform vec2 u_resolution;

out vec2 v_texCoord;
out vec4 v_color;
out vec2 v_effect;

void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_texCoord = a_texCoord;
  v_color = a_color;
  v_effect = a_effect;
}
`;

const SCENE_FRAGMENT_SHADER = `#version 300 es
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
    float wave = sin((gl_FragCoord.y + u_time * 0.012) * 1.57079632679);
    uv.x += wave * v_effect.x / max(1.0, u_textureSize.x);
  }
  vec4 source = texture(u_source, uv);
  if (source.a <= v_effect.y) discard;
  outColor = source * v_color;
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
const DEFAULT_ATLAS_SIZE = 4096;
const DEFAULT_CHUNK_CACHE_LIMIT = 24;

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
    if (!Number.isInteger(width) || width <= 0 ||
        !Number.isInteger(height) || height <= 0) {
      throw new Error(`Invalid atlas allocation: ${width}x${height}`);
    }
    if (width + this.padding * 2 > this.width ||
        height + this.padding * 2 > this.height) {
      throw new Error(`Atlas allocation exceeds page dimensions: ${width}x${height}`);
    }
    if (this.x + width + this.padding > this.width) {
      this.x = this.padding;
      this.y += this.rowHeight + this.padding;
      this.rowHeight = 0;
    }
    if (this.y + height + this.padding > this.height) {
      throw new Error(`Texture atlas is full while allocating ${width}x${height}`);
    }
    const rect = Object.freeze({ x: this.x, y: this.y, width, height });
    this.x += width + this.padding;
    this.rowHeight = Math.max(this.rowHeight, height);
    return rect;
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

export function quadVertices({
  sourceRect,
  textureWidth,
  textureHeight,
  destinationRect,
  color = [1, 1, 1, 1],
  refractionPx = 0,
  alphaThreshold = 0
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
  const u0 = sourceRect.x / textureWidth;
  const v0 = sourceRect.y / textureHeight;
  const u1 = (sourceRect.x + sourceRect.width) / textureWidth;
  const v1 = (sourceRect.y + sourceRect.height) / textureHeight;
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
    preserveDrawingBuffer: true,
    stencil: false
  });
  if (!gl) throw new Error("Marque & Reprisal requires WebGL2 for world rendering");
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!precision || precision.precision < 16) {
    throw new Error("WebGL2 fragment precision is insufficient for exact palette lighting");
  }

  const sceneProgram = createProgram(gl, SCENE_VERTEX_SHADER, SCENE_FRAGMENT_SHADER);
  const sceneLocations = {
    position: requiredAttribute(gl, sceneProgram, "a_position"),
    texCoord: requiredAttribute(gl, sceneProgram, "a_texCoord"),
    color: requiredAttribute(gl, sceneProgram, "a_color"),
    effect: requiredAttribute(gl, sceneProgram, "a_effect"),
    resolution: requiredUniform(gl, sceneProgram, "u_resolution"),
    source: requiredUniform(gl, sceneProgram, "u_source"),
    time: requiredUniform(gl, sceneProgram, "u_time"),
    textureSize: requiredUniform(gl, sceneProgram, "u_textureSize")
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
  const presentVertexBuffer = requiredBuffer(gl, "world presentation vertex buffer");
  const sceneVertexArray = gl.createVertexArray();
  const presentVertexArray = gl.createVertexArray();
  if (!sceneVertexArray || !presentVertexArray) {
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
  const atlasTexture = createNearestTexture(gl);
  gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
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
  const atlasAllocator = new TextureAtlasAllocator(atlasSize, atlasSize);
  const atlasEntries = new WeakMap();
  const atlasBatch = [];
  const chunkTextures = new Map();
  const chunkLru = new LruChunkKeys(chunkCacheLimit);
  const sceneTexture = createNearestTexture(gl);
  const sceneFramebuffer = gl.createFramebuffer();
  if (!sceneFramebuffer) throw new Error("Could not allocate world scene framebuffer");

  let sceneWidth = 0;
  let sceneHeight = 0;
  let paletteKey = null;
  let frameTimeMs = 0;
  let frameGrade = false;
  let atlasSourceCount = 0;
  let drawCalls = 0;
  let uploadedChunks = 0;

  configureSceneAttributes();
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
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      sceneTexture,
      0
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`World scene framebuffer is incomplete: ${status}`);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function beginFrame({ width, height, clearColor, paletteVariant = null, timeMs = 0 }) {
    resize(width, height);
    validateColor(clearColor, "World renderer clear color");
    if (!Number.isFinite(timeMs)) throw new Error(`Invalid world renderer time: ${timeMs}`);
    atlasBatch.length = 0;
    drawCalls = 0;
    uploadedChunks = 0;
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
    flushAtlasBatch();
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
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
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
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
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

  function drawAtlasSprite({
    source,
    sourceRect = null,
    destinationRect,
    alpha = 1,
    tint = [1, 1, 1],
    refractionPx = 0,
    alphaThreshold = 0
  }) {
    const entry = registerAtlasSource(source);
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
    atlasBatch.push(quadVertices({
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
      alphaThreshold
    }));
  }

  function flushAtlasBatch() {
    if (atlasBatch.length === 0) return;
    const totalLength = atlasBatch.reduce((sum, vertices) => sum + vertices.length, 0);
    const vertices = new Float32Array(totalLength);
    let offset = 0;
    for (const part of atlasBatch) {
      vertices.set(part, offset);
      offset += part.length;
    }
    atlasBatch.length = 0;
    drawVertices(atlasTexture, atlasSize, atlasSize, vertices);
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
    gl.uniform2f(sceneLocations.textureSize, textureWidth, textureHeight);
    gl.uniform1f(sceneLocations.time, frameTimeMs);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / FLOATS_PER_VERTEX);
    drawCalls++;
  }

  function endFrame() {
    flushAtlasBatch();
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
    endFrame,
    stats: () => Object.freeze({
      residentChunks: chunkTextures.size,
      atlasSources: atlasSourceCount,
      drawCalls,
      uploadedChunks
    })
  });
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
