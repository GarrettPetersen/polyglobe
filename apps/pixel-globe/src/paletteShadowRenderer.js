const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform sampler2D u_scene;
uniform sampler2D u_mask;
uniform sampler2D u_lut;
uniform float u_strength;
uniform vec2 u_lutSize;
varying vec2 v_texCoord;

void main() {
  vec4 scene = texture2D(u_scene, v_texCoord);
  float maskAlpha = texture2D(u_mask, v_texCoord).a;
  float stage = floor(maskAlpha * u_strength * 16.0 + 0.5);
  if (stage < 0.5 || scene.a <= 0.0) {
    gl_FragColor = scene;
    return;
  }

  vec3 quantized = floor(scene.rgb * 31.0 + 0.5);
  float lutX = quantized.g * 32.0 + quantized.b;
  float lutY = stage * 32.0 + quantized.r;
  vec2 lutUv = (vec2(lutX, lutY) + 0.5) / u_lutSize;
  gl_FragColor = vec4(texture2D(u_lut, lutUv).rgb, scene.a);
}
`;

export function createPaletteShadowRenderer({
  width,
  height,
  lut,
  strength,
  createCanvas = () => document.createElement("canvas")
}) {
  validateDimensions(width, height);
  validateLut(lut);
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new Error(`Palette shadow strength must be between zero and one: ${strength}`);
  }

  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    stencil: false
  });
  if (!gl) return null;

  const program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
  const positionBuffer = createQuadBuffer(gl, [
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]);
  const textureBuffer = createQuadBuffer(gl, [
    0, 0, 1, 0, 0, 1,
    0, 1, 1, 0, 1, 1
  ]);
  const positionLocation = requiredAttribute(gl, program, "a_position");
  const textureLocation = requiredAttribute(gl, program, "a_texCoord");
  const sceneTexture = createTexture(gl, 0);
  const maskTexture = createTexture(gl, 1);
  const lutTexture = createTexture(gl, 2);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, lutTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    lut.width,
    lut.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    lut.data
  );

  gl.useProgram(program);
  gl.uniform1i(requiredUniform(gl, program, "u_scene"), 0);
  gl.uniform1i(requiredUniform(gl, program, "u_mask"), 1);
  gl.uniform1i(requiredUniform(gl, program, "u_lut"), 2);
  gl.uniform1f(requiredUniform(gl, program, "u_strength"), strength);
  gl.uniform2f(requiredUniform(gl, program, "u_lutSize"), lut.width, lut.height);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  let renderWidth = width;
  let renderHeight = height;
  return Object.freeze({
    canvas,
    resize(nextWidth, nextHeight) {
      validateDimensions(nextWidth, nextHeight);
      if (nextWidth === renderWidth && nextHeight === renderHeight) return;
      renderWidth = nextWidth;
      renderHeight = nextHeight;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    },
    render(sceneCanvas, maskCanvas) {
      if (!sceneCanvas || !maskCanvas) {
        throw new Error("Palette shadow renderer requires scene and mask canvases");
      }
      gl.viewport(0, 0, renderWidth, renderHeight);
      gl.useProgram(program);
      bindAttribute(gl, positionLocation, positionBuffer);
      bindAttribute(gl, textureLocation, textureBuffer);
      uploadCanvasTexture(gl, sceneTexture, 0, sceneCanvas);
      uploadCanvasTexture(gl, maskTexture, 1, maskCanvas);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return canvas;
    }
  });
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create palette shadow WebGL program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Could not link palette shadow shader: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create palette shadow shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Could not compile palette shadow shader: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function createQuadBuffer(gl, values) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Could not create palette shadow quad buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
  return buffer;
}

function createTexture(gl, unit) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Could not create palette shadow texture");
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function uploadCanvasTexture(gl, texture, unit, source) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

function bindAttribute(gl, location, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}

function requiredAttribute(gl, program, name) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) throw new Error(`Palette shadow shader is missing attribute: ${name}`);
  return location;
}

function requiredUniform(gl, program, name) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`Palette shadow shader is missing uniform: ${name}`);
  return location;
}

function validateDimensions(width, height) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid palette shadow dimensions: ${width}x${height}`);
  }
}

function validateLut(lut) {
  if (
    !Number.isInteger(lut?.width) ||
    !Number.isInteger(lut?.height) ||
    !(lut?.data instanceof Uint8Array) ||
    lut.data.length !== lut.width * lut.height * 4
  ) {
    throw new Error("Palette shadow renderer requires a complete RGBA lookup texture");
  }
}
